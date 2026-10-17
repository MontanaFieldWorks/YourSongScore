import React from "react";
import { ArrowLeft, Library } from "lucide-react";

interface StacksPageProps {
  onBack: () => void;
}

export default function StacksPage({ onBack }: StacksPageProps) {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col gap-8 font-sans animate-fadeIn max-w-4xl mx-auto text-left" id="stacks-page-container">
      {/* 1. Header Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-500/5 rounded-full blur-[60px] pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={onBack}
            className="p-3 bg-neutral-900/80 hover:bg-white/5 border border-white/5 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-105"
            title="Return"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#bd93f9] font-bold flex items-center gap-1.5">
              <Library className="w-3.5 h-3.5" />
              <span>the Stacks</span>
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
              The Library Collection
            </h1>
          </div>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(189,147,249,0.30)] hover:scale-102 self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* 2. Unified Content Cards */}
      <div className="flex flex-col gap-6">
        
        {/* The Pink Floyd Paradox */}
        <div className="bg-[#13161C] border border-white/10 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl flex flex-col gap-6">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-4">
            <h2 className="text-2xl font-black text-white tracking-tight font-sans">
              The Pink Floyd Paradox
            </h2>

            <div 
              className="mt-2 flex flex-col gap-4 leading-relaxed whitespace-pre-wrap"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "12pt", color: "#cad5e2" }}
            >
              <p style={{ fontSize: "12px" }}>
                Pink Floyd's Dark Side of the Moon is the third best-selling album of all time at 45 million copies. Yet none of its songs would score above a 60 on YourSongScore's COMMERCIAL IMPACT evaluation. Its most celebrated tracks would barely clear 80 on ARTISTIC IMPACT.
              </p>
              
              <p className="font-bold text-white border-l-2 border-amber-500/50 pl-4 py-1 bg-amber-500/5 rounded-r" style={{ fontSize: "14px" }}>
                This is not a flaw in the scoring system. It is the point.
              </p>

              <p style={{ fontSize: "12px" }}>
                AI's ability to develop works of art and music is built on the combined knowledge, effort, and work of humans. It distills that collective data into underlying mathematical patterns, generating outputs optimized to evoke a powerful, familiar resonance.
              </p>

              <p style={{ fontSize: "12px", lineHeight: "21.75px" }}>
                YourSongScore applies the same mathematical calculations used by an AI engine to create a mainstream hit song — because those are the same calculations used by streaming services to determine whether you have one. The difference between art and product is not captured by an algorithm. YourSongScore measures the algorithm. What you do with that information is the art.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
