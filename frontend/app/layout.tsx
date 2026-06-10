import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* ============================================================
   🔤 FONTS — Inter (sans) + JetBrains Mono (mono)
   ============================================================ */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: true,
  weight: ["400", "500", "600"],
});

/* ============================================================
   🏷️ METADATA — SEO / Social
   ============================================================ */
export const metadata: Metadata = {
  title: "Yentellect — Train your thinking, not just your knowledge",
  description:
    "Yentellect detects how you think, identifies your weakest cognitive mode, and runs adaptive Socratic sessions that train it. Not a chat wrapper. A thinking gym.",
  keywords: [
    "cognitive training",
    "thinking modes",
    "Socratic learning",
    "brain training",
    "cognitive development",
    "analogical reasoning",
    "divergent thinking",
    "metacognition",
  ],
  authors: [{ name: "Yentellect" }],
  openGraph: {
    title: "Yentellect — Cognitive Development Platform",
    description:
      "Detect your thinking patterns. Train your weakest modes. Think better, not just smarter.",
    type: "website",
    siteName: "Yentellect",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yentellect — Cognitive Development Platform",
    description:
      "Detect your thinking patterns. Train your weakest modes. Think better, not just smarter.",
  },
};

/* ============================================================
   📐 ROOT LAYOUT
   ============================================================ */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Preconnect to API backend */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} />
        {/* DNS prefetch */}
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} />
      </head>
      <body className="min-h-screen bg-surface text-slate-100 antialiased font-sans">
        {/* Grain texture overlay */}
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}