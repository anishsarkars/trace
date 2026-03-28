"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Zap, Target, Star, Infinity } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export function Pricing() {
  const { user } = useUser();

  const tiers = [
    {
      name: "Lite",
      price: "0",
      features: ["5 Traces / monthly", "Basic DOM analysis", "Standard AI Specs"],
      cta: "Try Free",
      href: "#",
      icon: Zap,
    },
    {
      name: "Lifetime Pro",
      price: "699",
      currency: "₹",
      features: [
        "100 Traces / monthly", 
        "Layer 2 Measurement API", 
        "Lifetime Access", 
        "NVIDIA Llama-4 Access",
        "Priority Support"
      ],
      cta: "Get Lifetime Access",
      highlighted: true,
      href: `https://checkout.dodopayments.com/buy/pdt_0NbU9HgFG4Hf560jKEqUQ?quantity=1${user ? `&metadata[userId]=${user.id}` : ""}`,
      icon: Target,
    },
    {
      name: "Studio",
      price: "49",
      features: ["Advanced v4 Engine", "Multi-Source Extraction", "Team Workspaces", "Priority AI Context"],
      cta: "Contact Sales",
      href: "#",
      icon: Star,
    },
  ];

  return (
    <section id="pricing" className="relative w-full py-24 px-6 bg-white overflow-hidden flex flex-col items-center gap-24 border-t border-black/[0.03]">
      {/* Subtle background text */}
      <h1 className="absolute top-0 left-1/2 -translate-x-1/2 text-[120px] font-medium font-barlow text-black/[0.02] uppercase tracking-[-0.05em] select-none pointer-events-none">
        Lifetime <span className="font-instrument italic">Access</span>
      </h1>

      {/* Header */}
      <div className="flex flex-col items-center gap-10 text-center relative z-10">
        <div className="liquid-glass border border-black/[0.03] rounded-full px-4 py-1 text-[10px] font-bold text-black/40 font-body uppercase tracking-[0.3em] inline-block">
          One-Time Payment
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-6xl font-heading italic text-black tracking-[-0.04em] leading-[1.1]"
        >
          Own the engine <br />
          <span className="text-black/30">forever.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-xs sm:text-sm font-medium font-body text-black/50 uppercase tracking-[0.2em]"
        >
          Special Limited Lifetime Offer for Early Adopters.
        </motion.p>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full px-4 relative z-10">
        {tiers.map((tier, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className={`liquid-glass rounded-[40px] p-12 flex flex-col gap-16 transition-all duration-300 relative border border-black/[0.04] ${tier.highlighted ? 'scale-105 bg-white shadow-2xl shadow-black/10' : 'bg-transparent hover:scale-[1.02] hover:bg-zinc-50/50 hover:shadow-xl'}`}
          >
            <div className="flex flex-col gap-6">
              <div className={`p-3 rounded-2xl w-fit ${tier.highlighted ? 'bg-black text-white' : 'bg-black/5 text-black'}`}>
                <tier.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-heading italic text-black/40 tracking-widest">{tier.name}</h3>
                <div className="flex items-baseline gap-1 text-black">
                  <span className="text-4xl font-heading italic">{tier.currency || "$"}</span>
                  <span className="text-7xl font-heading italic tracking-tighter leading-none">{tier.price}</span>
                  {!tier.highlighted && <span className="text-xs font-body font-light opacity-30 lowercase ml-2 pr-2">per mo</span>}
                  {tier.highlighted && <span className="text-xs font-bold font-body text-black/40 uppercase ml-2 pr-2 tracking-widest">Lifetime</span>}
                </div>
              </div>
            </div>

            <ul className="flex flex-col gap-5 flex-1 overflow-hidden">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-xs font-body font-light text-black/60 tracking-wider">
                  <div className="h-1 w-1 rounded-full bg-black/20 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <a 
              href={tier.href}
              className={`w-full py-5 rounded-full flex items-center justify-center gap-3 text-xs font-bold font-body uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-xl ${tier.highlighted ? 'bg-black text-white' : 'bg-zinc-900 text-white'}`}
            >
              {tier.cta}
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
