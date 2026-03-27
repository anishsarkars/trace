"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Hls from "hls.js";

export function HowItWorks() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const hlsUrl = "https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8";
    if (videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = hlsUrl;
      }
    }
  }, []);

  const steps = [
    { key: "Crawl", title: "Crawl & Capture", desc: "High-fidelity DOM & Screenshot extraction via Firecrawl v2." },
    { key: "Measure", title: "Layout Measurement", desc: "Precise coordinate and CSS measurement via Playwright engine." },
    { key: "Normalize", title: "Component Mapping", desc: "Normalizing raw signals into semantic UI blocks and grid patterns." },
    { key: "Compile", title: "Design Compiler", desc: "Synthesizing all data into a 95%+ accurate AI build specification." },
  ];

  return (
    <section id="about" className="relative w-full py-24 px-6 bg-white overflow-hidden flex flex-col items-center">
      {/* Background HLS Video (Ultra Subtle) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover opacity-[0.03] saturate-0"
        />
        <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-white to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col gap-24">
        {/* Header */}
        <div className="flex flex-col items-center gap-6 text-center">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="liquid-glass border border-black/[0.03] rounded-full px-4 py-1 text-[10px] font-bold text-black/40 font-body uppercase tracking-[0.3em] inline-block"
          >
            Trace Reconstruction Pipeline
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl font-heading italic text-black tracking-[-0.04em] leading-[0.85]"
          >
            Intelligence in <br />
            <span className="text-black/30">every layer.</span>
          </motion.h2>
        </div>

        {/* Process List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          {steps.map((step, idx) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold font-body text-black/30 tracking-widest">
                  0{idx + 1}
                </span>
                <div className="h-[1px] flex-1 bg-black/[0.03]" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-medium font-barlow uppercase tracking-tighter text-black">
                  {step.title}
                </h3>
                <p className="text-xs font-light font-body text-black/40 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
