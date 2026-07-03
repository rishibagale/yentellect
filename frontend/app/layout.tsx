import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/utils/supabase/provider";
import { AuthGuard } from "@/components/AuthGuard";

/* ============================================================
   🔤 FONTS — Space Grotesk (display), Inter (sans), JetBrains Mono (mono)
   ============================================================ */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});

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
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || "https://yentellect.onrender.com"} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || "https://yentellect.onrender.com"} />
      </head>
      <body className="min-h-screen bg-[#080B11] text-[#F0F4FF] antialiased font-sans">
        <SupabaseProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </SupabaseProvider>
      </body>
    </html>
  );
}