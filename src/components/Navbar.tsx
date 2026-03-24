"use client";

import { motion } from "framer-motion";
import { Github, Laptop } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
          <Laptop className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tighter">Trace</span>
      </div>
      
      <div className="flex items-center gap-6">
        <a href="#features" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">Features</a>
        <a href="#docs" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">Docs</a>
        <a 
          href="https://github.com" 
          target="_blank" 
          className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-white/10"
        >
          <Github className="h-4 w-4" />
          <span>Star on GitHub</span>
        </a>
      </div>
    </nav>
  );
}
