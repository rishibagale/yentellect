/**
 * Yentellect import — POST /api/import/pdf.
 *
 * Accepts multipart/form-data with a PDF file and extracts text,
 * metadata (title, author, page count), and abstract using pdf-parse.
 * Gated by Supabase auth.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload papers." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }

    const blob = file as Blob;
    const fileName = file instanceof File ? file.name : "Uploaded Document";
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamic import of pdf-parse
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const textData = await parser.getText();
    let infoData: any = {};
    try {
      infoData = await parser.getInfo();
    } catch {
      // Info extraction is best-effort
    }
    await parser.destroy();

    const rawTitle = infoData?.info?.Title?.trim();
    const title =
      rawTitle && rawTitle.length > 3 && !rawTitle.toLowerCase().endsWith(".pdf")
        ? rawTitle
        : fileName.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");

    const author = infoData?.info?.Author?.trim();
    const authors = author ? [author] : [];
    const text = textData.text || "";

    // Extract abstract if present
    let abstract: string | null = null;
    const abstractMatch = /(?:abstract|summary)[:\s]+([\s\S]{50,1500}?)(?:\n\s*\n\s*(?:1\.?|I\.?|introduction|keywords)|$)/i.exec(text);
    if (abstractMatch) {
      abstract = abstractMatch[1].replace(/\s+/g, " ").trim();
    }

    return NextResponse.json({
      title,
      authors,
      abstract,
      body: text,
      pageCount: textData.total || 1,
      source: "upload",
    });
  } catch (err) {
    console.error("[import/pdf] failed to parse PDF", err);
    return NextResponse.json({ error: "Could not parse this PDF document." }, { status: 500 });
  }
}

