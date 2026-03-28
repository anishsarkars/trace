"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Layers } from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

export function Navbar() {
  const { isLoaded, isSignedIn } = useUser();

  const navLinks = [
    { name: "About", href: "#about" },
    { name: "Works", href: "#works" },
    { name: "Services", href: "#services" },
    { name: "Testimonial", href: "#testimonials" },
  ];

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-fit px-4 py-2.5 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[16px] shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] flex items-center gap-12 pointer-events-auto transition-all duration-500 hover:bg-white/20 hover:border-white/40 group">
      {/* Left: Logo (Minimal) */}
      <div className="flex items-center gap-2.5 pl-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 border border-white/20 shadow-xl transition-all group-hover:bg-white group-hover:scale-110 duration-500">
          <Layers className="h-4 w-4 text-white group-hover:text-black transition-colors duration-500" />
        </div>
        <span className="text-sm font-heading font-bold text-white tracking-widest uppercase hidden lg:block">
          Trace
        </span>
      </div>

      {/* Center: Menu */}
      <div className="hidden md:flex items-center gap-10">
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="text-[12px] font-medium font-barlow text-white/50 hover:text-white transition-all uppercase tracking-widest hover:tracking-[0.2em] relative"
          >
            {link.name}
          </a>
        ))}
      </div>

      {/* Right: CTA / Account (Short) */}
      <div className="flex items-center gap-4 pr-1">
        {!isSignedIn ? (
          <SignInButton mode="modal">
            <button className="h-10 flex items-center gap-2 bg-white text-black pl-5 pr-1.5 rounded-full text-[10px] font-bold font-barlow tracking-wider hover:bg-[#eee] transition-all group/btn active:scale-95 shadow-xl shadow-black/10">
              BOOK A FREE MEETING
              <div className="h-7 w-7 flex items-center justify-center bg-black/5 rounded-full transition-transform group-hover/btn:rotate-45 group-hover/btn:bg-black/10">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </button>
          </SignInButton>
        ) : (
          <div className="flex items-center gap-3">
             <div className="h-4 w-[1px] bg-white/10" />
             <div className="relative group/user">
               <div className="absolute -inset-1 bg-white rounded-full blur opacity-0 group-hover/user:opacity-20 transition duration-500"></div>
               <UserButton 
                 appearance={{
                   elements: {
                     userButtonAvatarBox: "h-8 w-8 ring-1 ring-white/20 group-hover/user:ring-white/60 transition-all shadow-2xl"
                   }
                 }}
               />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
