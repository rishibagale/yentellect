import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/utils/supabase/provider";
import { AuthGuard } from "@/components/AuthGuard";

/* Fonts: JetBrains Mono = chrome voice; Source Serif 4 = document body
   voice (pairs with KaTeX's Computer Modern). Space Grotesk removed:
   no display role in a workbench (C6). */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: true,
  weight: ["400", "500", "600"],
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  preload: true,
  weight: ["400", "500", "600"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Research Workbench",
  description:
    "A research workbench: import papers, apply lenses, keep the connections that matter.",
};

/* Body scrolls normally: document-flow routes (/history, /profile,
   /settings, /session) need the document scroller, and the workbench
   shell self-clips (Shell.tsx h-screen overflow-hidden). Supabase +
   auth guard docked. */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${sourceSerif.variable} ${inter.variable}`}
    >
      <body className="bg-[var(--bg-0)] text-[var(--text)] antialiased">
        <SupabaseProvider>
          <AuthGuard>{children}</AuthGuard>
        </SupabaseProvider>
      </body>
    </html>
  );
}
