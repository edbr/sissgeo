import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SISS-Geo Dashboard",
  description: "Fast, duotone-styled dashboard for SISS-Geo data",
};

export const viewport: Viewport = {
  themeColor: "#F7F3EE", // brand.cream
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Use pt-BR if you prefer Brazilian formatting
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {/* body-bg uses your gradients from globals.css */}
      <body className="body-bg min-h-screen bg-[var(--surface)] text-[var(--ink)]">
        <div className="mx-auto max-w-6xl p-6 md:p-10">{children}</div>
      </body>
    </html>
  );
}
