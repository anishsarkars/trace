"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Laptop } from "lucide-react";
import { TracingUI } from "./TracingUI";

export function TraceHero() {
  return (
    <section className="relative min-h-[120vh] w-full flex flex-col items-center justify-start pt-40 pb-32 overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full object-cover pointer-events-none"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260228_065522_522e2295-ba22-457e-8fdb-fbcd68109c73.mp4"
            type="video/mp4"
          />
        </video>
        {/* Discrete Overlay for Text Legibility */}
        <div className="absolute inset-0 bg-black/5" />
      </div>

      {/* Transparent Minimal Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between w-[90%] max-w-5xl px-4 py-3 bg-white/20 backdrop-blur-xl border border-white/20 rounded-[16px] shadow-sm" suppressHydrationWarning>
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold font-barlow tracking-tight uppercase text-white drop-shadow-sm">Trace</span>
        </div>

        {/* Center: Menu */}
        <div className="hidden md:flex items-center gap-8">
          {['About', 'Works', 'Services'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-[14px] font-medium font-barlow text-white/70 hover:text-white transition-colors uppercase tracking-wider drop-shadow-sm">
              {item}
            </a>
          ))}
        </div>

        {/* Right: CTA */}
        <button className="flex items-center gap-2 rounded-full bg-white px-4 md:px-6 py-2 text-xs font-bold text-black transition-all hover:bg-zinc-100 group shadow-sm shrink-0" suppressHydrationWarning>
          <span className="font-barlow uppercase hidden sm:inline">Book A Meeting</span>
          <span className="font-barlow uppercase sm:hidden">Book</span>
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:rotate-45" />
        </button>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 text-center px-6 mt-5">
        <div className="flex flex-col items-center gap-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <span className="text-white/90 text-3xl sm:text-6xl font-medium font-barlow tracking-[-2px] sm:tracking-[-4px] uppercase leading-tight drop-shadow-lg">
              Turn any website into
            </span>
            <span className="text-[42px] sm:text-[72px] text-white/80 font-instrument italic leading-none mt-2 drop-shadow-md">
              a working UI.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl text-[10px] sm:text-xs font-medium font-barlow text-white/60 leading-relaxed uppercase tracking-[0.3em] drop-shadow-sm"
          >
            Paste any website → get a production-ready UI prompt instantly.
          </motion.p>
        </div>

        {/* Tracing UI (The Input Section) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full flex justify-center"
        >
          <TracingUI />
        </motion.div>
      </div>
    </section>
  );
}
