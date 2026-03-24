import { TraceHero } from "@/components/TraceHero";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <TraceHero />
      <HowItWorks />
      <Pricing />
      <Footer />
    </main>
  );
}
