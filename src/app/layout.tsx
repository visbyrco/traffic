import type { Metadata } from "next";
import { Barlow_Condensed, JetBrains_Mono, Noto_Sans_HK } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Noto_Sans_HK({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
});

const gmono = JetBrains_Mono({
  weight: ["400", "500", "700"],
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
    <html lang="en" className={`${display.variable} ${body.variable} ${gmono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
