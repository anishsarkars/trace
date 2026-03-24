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

import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${barlow.variable} ${instrumentSerif.variable} h-full antialiased`} suppressHydrationWarning>
        <body className="min-h-full flex flex-col font-sans bg-white text-black" suppressHydrationWarning>
          <header className="fixed top-6 right-6 z-[100] flex items-center gap-4">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="bg-black text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all">Sign In</button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton afterSignOutUrl="/" />
            </Show>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
