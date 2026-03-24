"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";

export function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "0",
      features: ["5 Traces / monthly", "Basic DOM analysis", "Standard AI Specs"],
      cta: "Try Free",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "19",
      features: ["Unlimited Traces", "Layer 2 Measurement API", "Visual Asset Capture", "NVIDIA Llama-4 Access"],
      cta: "Get Pro Access",
      highlighted: true,
    },
    {
      name: "Studio",
      price: "49",
      features: ["Advanced v4 Engine", "Multi-Source Extraction", "Team Workspaces", "Priority AI Context"],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <section id="services" className="relative w-full py-40 px-6 bg-black overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <div className="max-w-6xl mx-auto flex flex-col gap-24 relative z-10">
        <div className="flex flex-col gap-6 text-center lg:text-left">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-[48px] sm:text-[80px] font-medium font-barlow uppercase tracking-tighter text-white leading-none"
          >
            Pricing <span className="font-instrument italic lowercase text-white/60">Tiers</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xs sm:text-sm font-medium font-barlow text-white/40 uppercase tracking-[0.3em]"
          >
            Scale your UI reverse-engineering process.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`flex flex-col gap-12 p-10 rounded-[32px] border transition-all duration-500 relative group overflow-hidden ${tier.highlighted ? 'bg-[#065FD4] border-transparent text-white' : 'bg-zinc-900 border-white/5 text-white hover:bg-zinc-800'}`}
            >
              {tier.highlighted && (
                <div className="absolute top-6 right-8 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                  Recommended
                </div>
              )}
              
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-bold font-barlow uppercase tracking-widest opacity-60">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-medium font-barlow">$</span>
                  <span className="text-7xl font-medium font-barlow tracking-tighter">{tier.price}</span>
                  <span className="text-lg opacity-40 lowercase">/mo</span>
                </div>
              </div>

              <ul className="flex flex-col gap-6 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium font-barlow uppercase tracking-wider opacity-80">
                    <Check className={`h-4 w-4 ${tier.highlighted ? 'text-white' : 'text-[#065FD4]'}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button className={`flex items-center justify-center gap-3 w-full py-5 rounded-2xl text-sm font-bold transition-all ${tier.highlighted ? 'bg-white text-black hover:scale-105 shadow-xl' : 'bg-white/10 hover:bg-white text-white hover:text-black border border-white/10 hover:border-transparent'}`}>
                {tier.cta}
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
