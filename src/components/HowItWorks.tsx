"use client";

import { motion } from "framer-motion";
import { Search, Zap, Code } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: "Input <i class='font-instrument italic font-normal'>URL</i>",
      desc: "Paste any website link. Our agent will crawl and capture its structural signals instantly.",
    },
    {
      icon: Zap,
      title: "Deep <i class='font-instrument italic font-normal'>Capture</i>",
      desc: "We analyze every pixel, font token, and grid pattern using our multi-stage v4 engine.",
    },
    {
      icon: Code,
      title: "Get <i class='font-instrument italic font-normal'>Blueprint</i>",
      desc: "Receive a technical, production-ready specification optimized for your AI IDE of choice.",
    },
  ];

  return (
    <section id="about" className="relative w-full py-32 px-6 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col gap-24">
        <div className="flex flex-col gap-6 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[42px] sm:text-[56px] font-medium font-barlow uppercase tracking-tighter leading-none"
          >
            How it <span className="font-instrument italic lowercase">Works</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="max-w-xl mx-auto text-xs sm:text-sm font-medium font-barlow text-black/50 uppercase tracking-[0.2em] leading-relaxed"
          >
            A technical breakdown of our 3-stage reconstruction engine.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col gap-8 p-8 rounded-3xl border border-black/5 bg-zinc-50/50 hover:bg-white hover:shadow-2xl hover:shadow-black/5 transition-all group"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white group-hover:scale-110 transition-transform shadow-lg">
                <step.icon className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="text-2xl font-medium font-barlow uppercase tracking-tight" dangerouslySetInnerHTML={{ __html: step.title }} />
                <p className="text-sm font-medium font-barlow text-black/40 leading-relaxed uppercase tracking-tight">
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
