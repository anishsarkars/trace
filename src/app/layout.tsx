import type { Metadata } from "next";
import { Inter, Barlow, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "Trace - Ai agent that will build your website in seconds",
  description: "Paste any website → get a production-ready UI prompt instantly.",
};

import { ClerkProvider } from "@clerk/nextjs";
import { Navbar } from "@/components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${barlow.variable} ${instrumentSerif.variable} h-full antialiased`} suppressHydrationWarning>
        <body className="min-h-full flex flex-col font-sans bg-white text-black" suppressHydrationWarning>
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
