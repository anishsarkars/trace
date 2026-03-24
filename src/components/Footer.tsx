"use client";

import { motion } from "framer-motion";
import { Twitter, Github, Linkedin, Facebook } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full py-24 px-6 bg-white overflow-hidden border-t border-black/5">
      <div className="max-w-6xl mx-auto flex flex-col gap-32">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-16">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h1 className="text-[64px] sm:text-[120px] font-medium font-barlow text-black/5 uppercase tracking-tighter leading-none select-none absolute -bottom-10 left-10 pointer-events-none">
                Trace <span className="font-instrument italic italic-accent lowercase">Engine</span>
              </h1>
              <div className="flex items-center gap-2 relative z-10">
                <span className="text-2xl font-bold font-barlow tracking-tight uppercase text-black">Trace</span>
                <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">v4.0</span>
              </div>
            </div>
            <p className="max-w-xs text-xs font-medium font-barlow text-black/50 uppercase tracking-[0.2em] leading-relaxed relative z-10">
              The world's first high-fidelity UI reconstruction engine for deterministic code generation.
            </p>
          </div>

          <div className="flex flex-wrap gap-12 sm:gap-24 relative z-10">
            <div className="flex flex-col gap-6">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-black">Product</h4>
              <ul className="flex flex-col gap-4">
                {['About', 'Services', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href={`#${item.toLowerCase()}`} className="text-sm font-medium font-barlow uppercase tracking-wider text-black/60 hover:text-black transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-6">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-black">Legal</h4>
              <ul className="flex flex-col gap-4">
                {['Privacy', 'Terms', 'Licensing'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm font-medium font-barlow uppercase tracking-wider text-black/60 hover:text-black transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-12 pt-12 border-t border-black/5 relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">
            © {currentYear} Trace Engine. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            {[Twitter, Github, Linkedin, Facebook].map((Icon, idx) => (
              <a key={idx} href="#" className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-zinc-50 text-black/40 hover:bg-black hover:text-white transition-all hover:scale-110 shadow-sm">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
