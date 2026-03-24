"use client";

import { motion } from "framer-motion";
import { Laptop, ArrowUpRight, Zap, Target, Layers } from "lucide-react";
import { SignInButton, Show, UserButton, useUser } from "@clerk/nextjs";

export function Navbar() {
  const { isSignedIn } = useUser();

  const navLinks = [
    { name: "Process", href: "#about" },
    { name: "Pricing", href: "#pricing" },
  ];

  return (
    <nav className="fixed top-4 left-0 right-0 z-[100] flex items-center justify-between px-8 md:px-12 pointer-events-none">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xl shadow-black/10">
          <Layers className="h-6 w-6 text-black" />
        </div>
        <span className="text-2xl font-heading italic text-white tracking-tighter drop-shadow-md hidden sm:block">
          Trace
        </span>
      </div>

      {/* Center: Liquid Glass Pill */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="liquid-glass border border-white/20 rounded-full px-2 py-1.5 flex items-center gap-6 shadow-2xl backdrop-blur-3xl">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="px-4 py-1.5 text-xs font-bold font-body text-white/70 hover:text-white transition-colors uppercase tracking-widest"
            >
              {link.name}
            </a>
          ))}
          
          <div className="h-4 w-[1.5px] bg-white/10" />

          {/* Account Portal */}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full text-[10px] font-bold font-body uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-black/20">
                Account
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="pr-1.5 flex items-center gap-3">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Profile</span>
              <UserButton />
            </div>
          </Show>
        </div>
      </div>

      {/* Right Spacer (for balance) */}
      <div className="hidden md:block w-12" />
    </nav>
  );
}
