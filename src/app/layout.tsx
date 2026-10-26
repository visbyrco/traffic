import type { Metadata } from "next";
import { Geist_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";

const display = Inter_Tight({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

const gmono = Geist_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-gmono",
});

export const metadata: Metadata = {
  title: "Visbyr Traffic — live Hong Kong traffic conditions",
  description:
    "Live Hong Kong traffic: incidents, cross-harbour journey times, CCTV snapshots, detector speeds, parking vacancies, roadworks and bus ETAs. Built on DATA.GOV.HK open datasets.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${gmono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
