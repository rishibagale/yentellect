import { marked } from "marked";
import katex from "katex";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Robust Markdown + KaTeX processor for scientific research papers and notes.
 *
 * 1. Isolates display math ($$...$$) and inline math ($...$) before Markdown
 *    parsing so subscripts (_), wildcards (*), and backslashes (\) are preserved.
 * 2. Parses GitHub Flavored Markdown with headings, tables, blockquotes, and lists.
 * 3. Injects KaTeX rendered equations with overflow scrollbars for complex formulas.
 */
export function renderMarkdownWithKaTeX(source: string): string {
  if (!source) return "";

  const displayMath: string[] = [];
  const inlineMath: string[] = [];

  // 1. Extract Display Math ($$...$$)
  let text = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    const idx = displayMath.length;
    displayMath.push(tex.trim());
    return `\n\n%%MATH_DISPLAY_${idx}%%\n\n`;
  });

  // 2. Extract Inline Math ($...$)
  text = text.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    const idx = inlineMath.length;
    inlineMath.push(tex.trim());
    return `%%MATH_INLINE_${idx}%%`;
  });

  // 3. Render Markdown through marked
  let html = marked.parse(text, {
    gfm: true,
    breaks: true,
  }) as string;

  // 4. Substitute Display Math with rendered KaTeX blocks
  html = html.replace(
    /<p>\s*%%MATH_DISPLAY_(\d+)%%\s*<\/p>|%%MATH_DISPLAY_(\d+)%%/g,
    (_, p1, p2) => {
      const idx = parseInt(p1 ?? p2, 10);
      const tex = displayMath[idx] || "";
      try {
        const rendered = katex.renderToString(tex, {
          displayMode: true,
          throwOnError: false,
        });
        return `<div class="katex-display-block select-all">${rendered}</div>`;
      } catch {
        return `<div class="my-2 p-2 rounded bg-red-950/20 border border-red-500/30 text-red-400 font-mono text-xs overflow-x-auto">${escapeHtml(
          tex
        )}</div>`;
      }
    }
  );

  // 5. Substitute Inline Math with rendered KaTeX
  html = html.replace(/%%MATH_INLINE_(\d+)%%/g, (_, p1) => {
    const idx = parseInt(p1, 10);
    const tex = inlineMath[idx] || "";
    try {
      return katex.renderToString(tex, {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `<code class="font-mono text-xs text-amber-400">${escapeHtml(
        tex
      )}</code>`;
    }
  });

  return html;
}
