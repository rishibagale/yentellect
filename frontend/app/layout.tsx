import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yentellect — Cognitive Development Platform",
  description: "Train your thinking, not just your knowledge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        {children}
      </body>
    </html>
  );
}