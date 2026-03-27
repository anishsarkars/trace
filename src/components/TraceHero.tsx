"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Laptop } from "lucide-react";
import { TracingUI } from "./TracingUI";

export function TraceHero() {
  return (
    <section className="relative min-h-[125vh] w-full flex flex-col items-center justify-start pt-40 pb-32 overflow-hidden">
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



      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-6 mt-5">
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

      {/* Cloud Transition Layer - Low Profile */}
      <div className="absolute bottom-0 left-0 right-0 h-[120px] z-[5] pointer-events-none overflow-hidden">
        {/* Main cloud fade */}
        <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-white via-white/40 to-transparent" />

        {/* Floating subtle clouds at the very base */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i % 2 === 0 ? -100 : 100 }}
            animate={{
              opacity: [0, 0.3, 0],
              x: i % 2 === 0 ? [null, 150] : [null, -150],
              y: [0, -10, 0]
            }}
            transition={{
              duration: 12 + i * 4,
              repeat: Infinity,
              ease: "linear",
              delay: i * 2
            }}
            className="absolute -bottom-10"
            style={{
              left: `${10 + i * 35}%`,
              width: `${300 + i * 150}px`,
              height: `${100 + i * 50}px`,
              background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)',
              filter: 'blur(40px)',
            }}
          />
        ))}
      </div>
    </section>
  );
}
