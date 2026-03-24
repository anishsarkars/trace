"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Check, Copy, ExternalLink, Blocks, Layout, Sparkles, AlertCircle, Wand2, Shield, Zap } from "lucide-react";
import { useUser, SignInButton } from "@clerk/nextjs";

export function TracingUI() {
  const { isSignedIn, user: clerkUser } = useUser();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "capturing" | "normalizing" | "structuring" | "refining" | "compiling" | "completed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [resultPrompt, setResultPrompt] = useState("");
  const [userData, setUserData] = useState<{ plan: string, credits: number, maxCredits: number } | null>(null);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      if (data.success) setUserData(data);
    } catch (e) {}
  };

  useEffect(() => {
    if (isSignedIn) fetchUser();
  }, [isSignedIn]);

  const steps = [
    { key: "capturing", label: "1. Crawl (DOM + CSS + Screenshot)", icon: Layout },
    { key: "normalizing", label: "2. Normalize (Clean + Group + Map)", icon: Blocks },
    { key: "structuring", label: "3. Structure (JSON Schema)", icon: Wand2 },
    { key: "refining", label: "4. AI Refine (Strict Refinement)", icon: Sparkles },
    { key: "compiling", label: "5. Compile (Final Prompt)", icon: Blocks },
  ];

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/payment/create", { method: "POST" });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTrace = async () => {
    if (!url) return;
    if (!isSignedIn) return;
    
    setStatus("capturing");
    try {
      const response = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[API Error Response]:", errorText);
        setErrorMessage(response.status === 401 ? "Unauthorized. Please sign in." : "Server error or Database connection failure.");
        setStatus("error");
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        setStatus("normalizing");
        await new Promise(r => setTimeout(r, 800));
        setStatus("structuring");
        await new Promise(r => setTimeout(r, 1000));
        setStatus("refining");
        await new Promise(r => setTimeout(r, 1200));
        setStatus("compiling");
        
        setResultPrompt(result.prompt);
        fetchUser(); // Refresh credits
        
        await new Promise(r => setTimeout(r, 800));
        setStatus("completed");
      } else {
        setErrorMessage(result.error || "Analysis failed.");
        setStatus("error");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Network error.");
      setStatus("error");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(resultPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 px-6 relative z-10">
      {/* Credit Status Bar */}
      {isSignedIn && userData && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-2"
        >
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${userData.plan === 'pro' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-black/5 text-black/40'}`}>
              {userData.plan} plan
            </span>
            <span className="text-[10px] font-bold text-black/20 uppercase tracking-[0.2em]">
              {userData.credits} / {userData.maxCredits} traces available
            </span>
          </div>
          {userData.plan === 'free' && (
            <button 
              onClick={handleUpgrade}
              className="text-[10px] font-bold text-black hover:text-accent transition-colors uppercase tracking-[0.2em] flex items-center gap-1 group"
            >
              Upgrade to Pro <Zap className="h-3 w-3 fill-accent text-accent transition-transform group-hover:scale-125" />
            </button>
          )}
        </motion.div>
      )}

      <div className={`relative overflow-hidden rounded-2xl border ${status === 'error' ? 'border-red-500/50' : 'border-black/5'} bg-white p-1 px-1 sm:px-2 focus-within:ring-2 focus-within:ring-accent/50 transition-all shadow-[0_0_40px_rgba(255,255,255,0.4)]`}>
        <div className="flex items-center gap-1 sm:gap-3">
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 shrink-0">
            <Search className="h-5 w-5" />
          </div>
          <input 
            type="text" 
            placeholder="Search URL..." 
            className="flex-1 bg-transparent py-4 pl-3 sm:pl-0 text-sm font-medium text-black outline-none placeholder:text-zinc-400 min-w-0"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTrace()}
            suppressHydrationWarning
          />
          {!isSignedIn ? (
            <SignInButton mode="modal">
              <button 
                className="rounded-xl bg-black px-4 sm:px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 shadow-lg whitespace-nowrap"
                suppressHydrationWarning
              >
                Sign In to Trace
              </button>
            </SignInButton>
          ) : (
            <button 
              onClick={handleTrace}
              disabled={status !== "idle" && status !== "completed" && status !== "error"}
              className="rounded-xl bg-black px-4 sm:px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 shadow-lg whitespace-nowrap"
              suppressHydrationWarning
            >
              {status === "idle" || status === "completed" || status === "error" ? "Trace" : "..."}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === "error" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-600 text-xs shadow-sm"
          >
            <AlertCircle className="h-5 w-5" />
            <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{errorMessage}</span>
            <button onClick={() => setStatus("idle")} className="ml-auto underline font-medium">Dismiss</button>
          </motion.div>
        )}

        {status !== "idle" && status !== "completed" && status !== "error" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-3"
          >
            {steps.map((step, idx) => {
              const order = ["capturing", "normalizing", "structuring", "refining", "compiling", "completed"];
              const currentStepIdx = order.indexOf(status as any);
              const isActive = status === step.key;
              const isDone = currentStepIdx > idx;
              
              return (
                <div key={step.key} className={`flex items-center justify-between rounded-xl border p-4 transition-all ${isActive ? 'bg-white border-accent/20 shadow-md scale-102' : isDone ? 'bg-white/80 border-transparent opacity-100' : 'bg-white/50 border-transparent opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDone ? 'bg-green-500/10 text-green-600' : isActive ? 'bg-accent/10 text-accent' : 'bg-black/5 text-zinc-400'}`}>
                      {isDone ? <Check className="h-4 w-4" /> : isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <step.icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-sm font-bold font-barlow uppercase tracking-tight ${isActive ? 'text-black' : 'text-zinc-600'}`}>{step.label}</span>
                  </div>
                  {isActive && <span className="text-xs font-mono text-accent animate-pulse font-bold">AGENT ACTIVE</span>}
                </div>
              );
            })}
          </motion.div>
        )}

        {status === "completed" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-4 rounded-3xl border border-black/5 bg-white p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h3 className="text-xl font-bold font-barlow uppercase text-black">Trace Build Complete</h3>
              </div>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-bold transition-all hover:bg-zinc-200 text-zinc-600"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy Prompt"}
              </button>
            </div>
            
            <div className="h-64 overflow-y-auto rounded-2xl bg-zinc-50 p-6 font-mono text-xs leading-relaxed text-zinc-700 border border-black/[0.03]">
              <pre className="whitespace-pre-wrap">{resultPrompt}</pre>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4">
              <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800 shadow-xl group">
                Export to IDE
                <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
              <button onClick={() => setStatus("idle")} className="flex items-center justify-center rounded-2xl border border-black/10 bg-white px-8 py-4 text-sm font-bold transition-all hover:bg-zinc-50 text-black">
                New Trace
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
