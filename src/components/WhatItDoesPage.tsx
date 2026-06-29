import React from "react";
import { 
  ArrowLeft, BookOpen, Clock, Code, ShieldCheck, HelpCircle,
  Rabbit, Activity, Compass, Music, FileMusic, AudioLines, Headphones,
  Layers, Radio, Wrench, LineChart, BarChart3, Sparkles,
  ChevronDown, ChevronUp, ChevronsUp, Volume2, ChevronsRight, Cog
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function GlowingLoader({ color = "#3b82f6", glowColor = "rgba(59, 130, 246, 0.4)", className = "" }: { color?: string; glowColor?: string; className?: string }) {
  const size = 14;
  const strokeWidth = 2.2;
  const radius = (size - strokeWidth) / 2; // 5.9

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* Background Radial Glow */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: 0.8,
          width: 28,
          height: 28,
          filter: "blur(1px)",
        }}
      />
      <div style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {/* Glow circle overlay */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="fill-none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              filter: `blur(0.8px) drop-shadow(0 0 3px ${glowColor})`,
              opacity: 0.95,
            }}
          />
          {/* Sharp White Core circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="fill-none"
            stroke="#ffffff"
            strokeWidth={strokeWidth / 2}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

interface WhatItDoesPageProps {
  onBack: () => void;
  onNavigateToRabbitHole?: () => void;
  onNavigateToEngineeringDetails?: () => void;
}

export default function WhatItDoesPage({ onBack, onNavigateToRabbitHole, onNavigateToEngineeringDetails }: WhatItDoesPageProps) {
  const [isCommercialImpactOpen, setIsCommercialImpactOpen] = React.useState(false);
  const [isAlgorithmicAlignmentOpen, setIsAlgorithmicAlignmentOpen] = React.useState(false);
  const [isAlgorithmicSandboxOpen, setIsAlgorithmicSandboxOpen] = React.useState(false);
  const [isEngineeringStudioOpen, setIsEngineeringStudioOpen] = React.useState(false);
  const [isProductionQualityOpen, setIsProductionQualityOpen] = React.useState(false);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col gap-8 font-sans animate-fadeIn max-w-5xl mx-auto" id="what-it-does-yoursongscore-page">
      
      {/* 1. Header Navigation and Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0b0e] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={onBack}
            className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-105"
            title="Return to song audit view"
          >
            <ArrowLeft className="w-5 h-5 animate-pulse" />
          </button>
          
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#a855f7] font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Score Mechanics &amp; App Engine Directory</span>
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              What YourSongScore Does
            </h1>
          </div>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.30)] hover:scale-102 self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Song Audit</span>
        </button>
      </div>

      {/* 2. Core Diagnostic Cards Section */}
      <div className="flex flex-col gap-6 text-left">
        <div>
          <span className="text-[10px] font-mono uppercase bg-[#16203a] border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full w-fit tracking-widest font-bold">
            18 Dynamic Measurements across 7 Core Metrics in 3 Critical Categories
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-2.5">
            A Monster Diagnostic Engine: The Three Assessment Categories
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Understanding the math and methodology behind the three major assessment categories that empower better music performance - on streaming services, and through your speakers.
          </p>
        </div>

        {/* Diagnostic Score Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Streaming Readiness */}
          <div className="flex flex-col gap-6">
            {/* Mainstream Card */}
            <div className="bg-[#0A0B0E] border border-blue-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div>
                <h3 className="text-xl font-extrabold text-white">Streaming Readiness</h3>
                <p className="text-xs font-mono text-blue-400/90 tracking-wider uppercase mt-1">Algorithmic Readiness Index</p>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Measures the potential of your track successfully surviving the split-second decisions made by the modern digital gatekeepers of music streaming services (like Spotify and Apple Music) that determine whether your song gets promoted to their editorial playlists.
                  <span className="block mt-2 pl-4">• Core Objective: To ensure the track isn’t skipped, filtered out, or buried by automated playlist recommendation systems.</span>
                  <span className="block mt-2 italic text-slate-500">Great songs don’t always fit the “algo,” while bad songs that do can still get past this gatekeeper.</span>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-400 hover:underline font-semibold block mt-3">See the associated metrics below</a>
                </p>
              </div>
            </div>

            {/* Streaming Readiness Metrics Card */}
            <div className="bg-[#0A0B0E] border border-blue-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div>
                <h3 className="text-[16px] font-bold text-blue-400 mb-4">Streaming Readiness Metrics</h3>
                
                <div className="flex flex-col gap-1.5 text-left">
                  <div 
                    id="commercial-impact-toggle-btn"
                    onClick={() => setIsCommercialImpactOpen(!isCommercialImpactOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsCommercialImpactOpen(!isCommercialImpactOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isCommercialImpactOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                      isCommercialImpactOpen 
                        ? "border-blue-500/60 bg-blue-500/[0.12] shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                        : "border-blue-500/30 bg-blue-500/[0.07] hover:border-blue-500/50 hover:bg-blue-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Rabbit className="w-4 h-4 text-blue-400 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-200 tracking-wider">COMMERCIAL IMPACT</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isCommercialImpactOpen ? "rotate-180 text-blue-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Deconstructs the overall commercial readiness and potential of the track by scoring its dynamic characteristics against high-performing commercial hits. <span className="text-[10px] text-blue-400 font-semibold block mt-1 hover:underline">Click to {isCommercialImpactOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isCommercialImpactOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-blue-500/15 bg-blue-950/20 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-xs shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-blue-500/5 rounded-full blur-[20px] pointer-events-none" />
                          
                          {/* Section 1: MIX/MASTER INTEGRITY */}
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#3b82f6" glowColor="rgba(59, 130, 246, 0.4)" className="text-blue-500 shrink-0" />
                              <h5 className="text-[10.5px] font-mono tracking-wider font-extrabold text-blue-400 uppercase">
                                MIX/MASTER INTEGRITY
                              </h5>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-[1.375] font-sans">
                              Determines how successfully a song's master format matches modern, highly competitive digital distribution standards.
                            </p>
                            
                            <div className="flex flex-col gap-2.5 pl-[6px] w-[220px] self-center mt-1">
                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">LUFS Loudness</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Measures integrated loudness over time to ensure the track avoids aggressive volume attenuation by automatic platform limiters.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Spectral Match</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Compares the track's frequency distribution to mainstream hits to ensure a balanced, commercially viable audio spectrum.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Engagement Power</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Predicts how reliably a song will maintain listener focus over its duration based on dynamic variety and section transitions.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Section 2: PRODUCTION INDEX */}
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#3b82f6" glowColor="rgba(59, 130, 246, 0.4)" className="text-blue-500 shrink-0" />
                              <h5 className="text-[10.5px] font-mono tracking-wider font-extrabold text-blue-400 uppercase">
                                PRODUCTION INDEX
                              </h5>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-[1.375] font-sans">
                              Evaluates the physical alignment, tracking quality, and engineering polish applied to the final mix and master.
                            </p>
                            
                            <div className="flex flex-col gap-2.5 pl-[6px] w-[220px] self-center mt-1">
                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Palette Cohesion</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Rates how effectively the selected sound elements, instruments, and samples complement each other within the overall frequency space.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Aesthetic Design</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Assesses the distinctiveness, genre authenticity, and stylistic clarity of the track's sonic footprint.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Space & Density</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Analyzes the arrangement's breathing room to prevent instrument overcrowding and avoid listener ear fatigue.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Collapse button inside the dropdown container at the bottom */}
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-2 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCommercialImpactOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("commercial-impact-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-[10px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
                              title="Collapse details"
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                              <span>Collapse Details</span>
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div 
                    id="streaming-algorithmic-alignment-toggle-btn"
                    onClick={() => setIsAlgorithmicAlignmentOpen(!isAlgorithmicAlignmentOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsAlgorithmicAlignmentOpen(!isAlgorithmicAlignmentOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isAlgorithmicAlignmentOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                      isAlgorithmicAlignmentOpen 
                        ? "border-emerald-500/60 bg-emerald-500/[0.12] shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                        : "border-emerald-500/30 bg-emerald-500/[0.07] hover:border-emerald-500/50 hover:bg-emerald-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-200 tracking-wider">STREAMING ALGORITHMIC ALIGNMENT</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isAlgorithmicAlignmentOpen ? "rotate-180 text-emerald-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Models fundamental recommendation attributes (such as Danceability, Energy, Mood Valence, and Acousticness) to predict how auto-curation systems will profile and package the release. <span className="text-[10px] text-emerald-400 font-semibold block mt-1 hover:underline">Click to {isAlgorithmicAlignmentOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isAlgorithmicAlignmentOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-emerald-500/15 bg-emerald-950/20 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-xs shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-emerald-500/5 rounded-full blur-[20px] pointer-events-none" />
                          
                          {/* Section 1: The ECHO NEST SIMULATOR */}
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#10b981" glowColor="rgba(16, 185, 129, 0.4)" className="text-emerald-400 shrink-0" />
                              <h5 className="text-[10.5px] font-mono tracking-wider font-extrabold text-emerald-400 uppercase">
                                The ECHO NEST SIMULATOR
                              </h5>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-[1.375] font-sans">
                              The Echo Nest (now a core part of Spotify's recommendation engine) pioneered computational audio analysis. To determine editorial playlist placement, The Echo Nest’s algorithm uses <span className="text-emerald-400 font-semibold">7 Core Metrics (details here)</span>. YSS’s The Echo Nest Simulator use those same, genre specific indicators to help predict how auto-curation systems will profile and package your release.
                            </p>
                            <p className="text-[11px] text-slate-300 font-bold mt-1">
                              This is the 1st CRITICAL STREAMING GATE …{" "}
                              <span
                                onClick={onNavigateToRabbitHole}
                                className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all"
                              >
                                Read More in the Rabbit Hole
                              </span>
                            </p>
                          </div>

                          {/* Section 2: RECOMMENDER PERFORMANCE PREDICTION */}
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#10b981" glowColor="rgba(16, 185, 129, 0.4)" className="text-emerald-400 shrink-0" />
                              <h5 className="text-[10.5px] font-mono tracking-wider font-extrabold text-emerald-400 uppercase">
                                RECOMMENDER PERFORMANCE PREDICTION
                              </h5>
                            </div>
                            
                            <div className="flex flex-col gap-2.5 pl-[6px] w-[220px] self-center mt-1">
                              <div className="flex gap-2">
                                <span className="text-emerald-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">NLP semantic Clustered Neighborhood "Artist Universe"</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Vectorizes thematic, musical, and semantic details to map the track's exact position among similar current recording artists.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-emerald-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Discovery Feeder Distribution Probabilities Algorithms</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Simulates prediction scores to estimate how frequently the track will be automatically recommended in automated queues and radio sessions.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-emerald-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Collaborative Filtering Prevention Checklist</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Audits the checklist of vital elements required in the first 30 seconds of a track to minimize early skip rates and avoid recommendation penalties.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Collapse button inside the dropdown container at the bottom */}
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-2 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsAlgorithmicAlignmentOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("streaming-algorithmic-alignment-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 text-[10px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full"
                              title="Collapse details"
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                              <span>Collapse Details</span>
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div 
                    id="algorithmic-sandbox-toggle-btn"
                    onClick={() => setIsAlgorithmicSandboxOpen(!isAlgorithmicSandboxOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsAlgorithmicSandboxOpen(!isAlgorithmicSandboxOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isAlgorithmicSandboxOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${
                      isAlgorithmicSandboxOpen 
                        ? "border-amber-500/60 bg-amber-500/[0.12] shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
                        : "border-amber-500/30 bg-amber-500/[0.07] hover:border-amber-500/50 hover:bg-amber-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-200 tracking-wider">ALGORITHMIC SANDBOX</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isAlgorithmicSandboxOpen ? "rotate-180 text-amber-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Provides a simulated digital environment to test and visualize how the track behaves inside recommendation-engine systems. <span className="text-[10px] text-amber-400 font-semibold block mt-1 hover:underline">Click to {isAlgorithmicSandboxOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isAlgorithmicSandboxOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-amber-500/15 bg-amber-950/20 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-xs shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-amber-500/5 rounded-full blur-[20px] pointer-events-none" />
                          
                          {/* Section 1: ALGOTORIAL PLAYLIST SANDBOX */}
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#f59e0b" glowColor="rgba(245, 158, 11, 0.4)" className="text-amber-500 shrink-0" />
                              <h5 className="text-[10.5px] font-mono tracking-wider font-extrabold text-amber-400 uppercase">
                                Algotorial Playlist Sandbox
                              </h5>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-[1.375] font-sans">
                              Hosts a variety of algorithmic model simulations to predict how the song fits into contextual music feeds.
                            </p>
                            
                            <div className="flex flex-col gap-2.5 pl-[6px] w-[220px] self-center mt-1">
                              <div className="flex gap-2">
                                <span className="text-amber-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Cosine Similarity Mapping</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Measures the mathematical similarity vector between the track and curated hit playlists to forecast target audience fits.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-amber-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Circumplex Mood Space Plotter</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Plots the track's valence and energy values onto a standard visual coordinate wheel representing human emotional responsiveness.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-amber-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Transition Lab</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Evaluates immediate volume, tempo, and key shifts to simulate the crossfade transition quality when this track follows others in a queue.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-amber-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">30s Skip & Playout Simulator The 30-Second Rule Gatekeeper</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Models user skip behaviors based on arrangement markers to pinpoint potential arrangement drops that cause early skips.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Collapse button inside the dropdown container at the bottom */}
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-2 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsAlgorithmicSandboxOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("algorithmic-sandbox-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 text-[10px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-full"
                              title="Collapse details"
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                              <span>Collapse Details</span>
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: The Sonic Soundprint */}
          <div className="flex flex-col gap-6">
            {/* Artistic Card */}
            <div className="bg-[#0A0B0E] border border-purple-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div>
                <h3 className="text-xl font-extrabold text-white">The Sonic Soundprint</h3>
                <p className="text-xs font-mono text-purple-400/90 tracking-wider uppercase mt-1">TECHNICAL ARCHITECTURE</p>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Analyzes the song purely from an audio perspective and assesses how cleanly the individual stems and mixing decisions form a professional sonic field, reporting whether the song’s mix meets the established sonic standards of your genre. Includes recommendations for corrections.
                  <span className="block mt-2 pl-4">• Core Objective: To diagnose flaws inside the DAW project that prevent a home mix from sounding competitive on club systems or high-end monitors.</span>
                  <span className="block mt-2 italic text-slate-500">Even if your mix is good, not great, streaming services' algorithms might "pass" on it.</span>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-purple-400 hover:underline font-semibold block mt-3">See the associated metrics below</a>
                </p>
              </div>
            </div>

            {/* Sonic Soundprint Metrics Card */}
            <div className="bg-[#0A0B0E] border border-purple-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div>
                <h3 className="text-[16px] font-bold text-purple-400 mb-4">Sonic Soundprint Metrics</h3>
                
                <div className="flex flex-col gap-4 text-left">
                  <div 
                    id="engineering-studio-toggle-btn"
                    onClick={() => setIsEngineeringStudioOpen(!isEngineeringStudioOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsEngineeringStudioOpen(!isEngineeringStudioOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isEngineeringStudioOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                      isEngineeringStudioOpen 
                        ? "border-purple-500/60 bg-purple-500/[0.12] shadow-[0_0_15px_rgba(168,85,247,0.15)]" 
                        : "border-purple-500/30 bg-purple-500/[0.07] hover:border-purple-500/50 hover:bg-purple-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-200 tracking-wider">THE ENGINEERING STUDIO</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isEngineeringStudioOpen ? "rotate-180 text-purple-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <h3 className="text-xs font-bold text-purple-400 mb-1 leading-snug">Mixing & Mastering Technical Recommendation</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      A powerhouse engineering and production mix/master diagnostic suite guides with nine diagnostic modules.  Analyzes a broad array of measurements that guide step-by-step mix correction blueprints. <span className="text-[10px] text-purple-400 font-semibold block mt-1 hover:underline">Click to {isEngineeringStudioOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isEngineeringStudioOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-purple-500/15 bg-purple-950/20 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-xs shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-purple-500/5 rounded-full blur-[20px] pointer-events-none" />
                          
                          <div className="flex flex-col gap-1 relative z-10">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                if (onNavigateToEngineeringDetails) {
                                  onNavigateToEngineeringDetails();
                                }
                              }} 
                              className="text-white font-bold hover:underline text-left bg-transparent border-none p-0 cursor-pointer outline-none focus:underline flex items-center gap-1.5"
                            >
                              <ChevronsRight className="w-4 h-4 text-purple-400 shrink-0" />
                              <span>see The Engineering Studio Details Page for Module by Module Details</span>
                            </button>
                          </div>

                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#a855f7" glowColor="rgba(168, 85, 247, 0.4)" className="text-purple-500 shrink-0" />
                              <h5 className="text-[10.5px] font-mono tracking-wider font-extrabold text-purple-400 uppercase">
                                MIXING & MASTERING TECHNICAL ANALYSIS
                              </h5>
                            </div>
                            
                            <div className="flex flex-col gap-2.5 pl-[6px] mt-1.5">
                              <div className="flex gap-2">
                                <span className="text-purple-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Harmonic Resolution</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    A high-resolution spectral monitoring utility that sweeps the frequency spectrum from 20 Hz to 20 kHz to map harmonic overloads.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-purple-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Signal &amp; Levels</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    This module conducts an essential amplitude analysis to measure overall signal energy, dynamic variance, and headroom.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-purple-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Dynamics Profile</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    An analytical sweep examining transient spikes, compression boundaries, and macro vs. micro changes over time.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-purple-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Frequency Balance</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    A six-band spectral energy sweep mapping acoustic density from sub-bass foundations up through high-frequency presence.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-purple-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Stereo Field</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    This module combines stereo width analysis with front-to-back spatial depth mapping into a single two-tab view.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-purple-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Genre Compliance</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    This module compares your track's loudness and frequency signature against standard target profiles for global streaming networks.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-purple-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Noise &amp; Artifacts</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    An auditing module designed to detect system noise, low-level electrical hum, files glitches, and digital conversion offsets.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-purple-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Arrangement Patterns</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    A multi-track simulator running on arrangement files to locate clashing tracks and crowded acoustic neighborhoods.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-purple-400 font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Stereo Azimuth Profile</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    An advanced stereophonic compass mapping active panning distribution and center-channel energy weighting.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Collapse button inside the dropdown container at the bottom */}
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-2 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsEngineeringStudioOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("engineering-studio-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 text-[10px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full"
                              title="Collapse details"
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                              <span>Collapse Details</span>
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div 
                    id="production-quality-toggle-btn"
                    onClick={() => setIsProductionQualityOpen(!isProductionQualityOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsProductionQualityOpen(!isProductionQualityOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isProductionQualityOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-[#46F4CD]/50 ${
                      isProductionQualityOpen 
                        ? "border-[#46F4CD]/60 bg-[#46F4CD]/[0.12] shadow-[0_0_15px_rgba(70,244,205,0.15)]" 
                        : "border-[#46F4CD]/30 bg-[#46F4CD]/[0.07] hover:border-[#46F4CD]/50 hover:bg-[#46F4CD]/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Cog className="w-4 h-4 text-[#46F4CD] shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
                        <h4 className="text-xs font-bold text-slate-200 tracking-wider">PRODUCTION QUALITY</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isProductionQualityOpen ? "rotate-180 text-[#46F4CD]" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <h3 className="text-xs font-bold text-[#46F4CD] mb-1 leading-snug">Production & Arrangement Diagnostic</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      A diagnostic of whether your track sounds finished - evaluating the production decisions that separate a competitive release from a home recording. <span className="text-[10px] text-[#46F4CD] font-semibold block mt-1 hover:underline">Click to {isProductionQualityOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isProductionQualityOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-[#46F4CD]/15 bg-neutral-900/40 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-xs shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-[#46F4CD]/5 rounded-full blur-[20px] pointer-events-none" />
                          
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                              <GlowingLoader color="#46F4CD" glowColor="rgba(70, 244, 205, 0.4)" className="text-[#46F4CD] shrink-0" />
                              <h5 className="text-[10.5px] font-mono tracking-wider font-extrabold text-[#46F4CD] uppercase">
                                PRODUCTION QUALITY DIAGNOSTICS
                              </h5>
                            </div>
                            
                            <p className="text-[11px] text-slate-200 leading-[1.4] mt-2 font-medium">
                              Streaming algorithms don't hear your mix — but your listeners do. Poor production drives early skips, and early skips tank your algorithmic reach.
                            </p>

                            <div className="p-3 bg-[#0A0B0E]/60 border border-white/5 rounded-lg my-1.5">
                              <p className="text-[10px] text-slate-400 leading-relaxed italic">
                                <strong className="text-[#46F4CD] not-italic font-bold">NOTE:</strong> Some of these metrics share data with other YSS modules. PRODUCTION QUALITY combines them here with a single focus: not whether your mix is technically correct, but whether it sounds like a finished, competitive record.
                              </p>
                            </div>
                            
                            <div className="flex flex-col gap-3.5 pl-[6px] mt-1.5">
                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Arrangement Density</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    How effectively your song layers instruments and elements across its runtime to maintain listener engagement without sounding cluttered or thin.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Sonic Texture &amp; Sound Design</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Whether your instrument tones, synth choices, and sound selection have character and intentionality, or sound generic and unprocessed.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Low-End Power</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    The physical punch and definition of your bass and kick relationship — whether your track hits with authority on speakers and headphones alike.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Width &amp; Dimension</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    How far your mix extends across the stereo field and front-to-back depth, creating the sense of space that separates professional productions from flat recordings.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Vocal Production</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    The quality of the vocal chain, treatment, and placement — including doubles, effects, and whether the voice commands attention or gets lost in the mix.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[10px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-200 leading-[1.375]">Energy Management</span>
                                  <span className="text-[10.5px] text-slate-400 leading-[1.375] mt-0.5">
                                    Whether your track's dynamic arc builds, breathes, and releases across its runtime, or stays flat and fatiguing from start to finish.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Collapse button inside the dropdown container at the bottom */}
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-2 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsProductionQualityOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("production-quality-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#46F4CD]/10 hover:bg-[#46F4CD]/20 border border-[#46F4CD]/20 hover:border-[#46F4CD]/40 text-[#46F4CD] hover:text-white text-[10px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#46F4CD]/50 w-full"
                              title="Collapse details"
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                              <span>Collapse Details</span>
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="border border-cyan-500/30 bg-cyan-500/[0.07] p-3.5 rounded-xl">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AudioLines className="w-4 h-4 text-cyan-400 shrink-0" />
                      <h4 className="text-xs font-bold text-slate-200">THE STEREO AZIMUTH PROFILER</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Visualizes time-domain stereo panning spreads, phase relationships, and left/right power distribution of the song's audio spectrum.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Compositional Depth */}
          <div className="flex flex-col gap-6">
            {/* Songwriting Card */}
            <div className="bg-[#0A0B0E] border border-emerald-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div>
                <h3 className="text-xl font-extrabold text-white">Compositional Depth</h3>
                <p className="text-xs font-mono text-emerald-400/90 tracking-wider uppercase mt-1">THE SONGWRITING CORE</p>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Bypasses the production value and mixing polish to critique the actual songwriting, lyrical themes, and musical theory that create human connection. Your song is being measured against the benchmark parameters common among successful songs in your genre.
                  <span className="block mt-2 pl-4">• Core Objective: To analyze if the song has the fundamental structural components necessary to transcend being "well-produced noise."</span>
                  <span className="block mt-2 italic text-slate-500">A three-chord song won’t score high on these measurements. But that doesn’t mean it’s not good.</span>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-emerald-400 hover:underline font-semibold block mt-3">See the associated metrics below</a>
                </p>
              </div>
            </div>

            {/* Compositional Depth Metrics Card */}
            <div className="bg-[#0A0B0E] border border-emerald-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div>
                <h3 className="text-[16px] font-bold text-emerald-400 mb-4">Composition Metrics</h3>
                
                <div className="flex flex-col gap-4 text-left">
                  <div className="border border-pink-500/30 bg-pink-500/[0.07] p-3.5 rounded-xl">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Headphones className="w-4 h-4 text-pink-400 shrink-0" />
                      <h4 className="text-xs font-bold text-slate-200">ARTISTIC DEPTH AND IMPACT</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Analyzes how powerfully the creative perspective of the song resonates with discerning, active listeners.
                    </p>
                  </div>
                  
                  <div className="border border-emerald-500/30 bg-emerald-500/[0.07] p-3.5 rounded-xl">
                    <div className="flex items-center gap-2 mb-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                      <h4 className="text-xs font-bold text-slate-200">ARTISTIC &amp; LYRICAL FOUNDATION</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Provides baseline metrics evaluating the physical, literary, and musical foundation of the song's writing, scoring expressive theme clarity and chord dynamics.
                    </p>
                  </div>

                  <div className="border border-cyan-500/30 bg-cyan-500/[0.07] p-3.5 rounded-xl">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Code className="w-4 h-4 text-cyan-400 shrink-0" />
                      <h4 className="text-xs font-bold text-slate-200">SONG WRITING STRENGTH &amp; QUALITY</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Analyzes hook effectiveness, structural layouts, and composition flow (songwriting blueprint &amp; dynamic arc) to ensure core memorable quality.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. The Interactive Feature Directory Dashboard */}
      <div className="flex flex-col gap-6 text-left border-t border-white/5 pt-10">
        <div>
          <span className="text-[10px] font-mono uppercase bg-[#18112d] border border-purple-500/10 text-purple-400 px-3 py-1 rounded-full w-fit tracking-widest font-bold">
            THE APPLICATION FEATURE MAP
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-2.5">
            Every Other Feature of the App Explained
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            An overview of the diagnostic panels, audio analyzers, metadata writers, and real-time simulations executing under the hood.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Feature 1: Metadata / Writer Panel */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex-shrink-0 h-fit">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">Metadata &amp; Writer Panel</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Estimates the core genre, lists recommended secondary subgenres, calculates target searchability ratings of your title, and identifies copyright risk vectors to ensure your metadata resists commercial search index collisions.
              </p>
            </div>
          </div>

          {/* Feature 2: Playout / Algorical Simulators */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex-shrink-0 h-fit">
              <Radio className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">Algorical / Playout Simulators</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Simulates real streaming conditions with interactive testing layouts. Includes sequential Playlist Coherence (Handoff Test), Russell's Affective Valence Coordinates (Similarity Constellation Mapping), and critical 30-Second Skip Risk Behavior curves.
              </p>
            </div>
          </div>

          {/* Feature 3: Mixing Desk / Spectral Analysis */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex-shrink-0 h-fit">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">Mixing Desk &amp; Spectral Balance</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scans your audio's transient spectrum across four critical frequency brackets (Low Mud, Low-Mid Boxiness, High-Mid Harshness, High Air). Generates DAW adjustment checklists outlining step-by-step EQ gains, Q-widths, and compression targets for your vocal/harmonic tracks.
              </p>
            </div>
          </div>

          {/* Feature 4: Performance Meter (Vocal & Instrument) */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex-shrink-0 h-fit">
              <LineChart className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">Performance Meter (Vocal &amp; Instrument)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rates the execution of the song's key performers. Deeply inspects backline articulation, bassline tracking, instrument separation, vocal pitch delivery, vocal chain treatment, breath management, and ensemble handoff tightness.
              </p>
            </div>
          </div>

          {/* Feature 5: Composition Flow */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl flex-shrink-0 h-fit">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">Composition Flow</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Examines structural timing: the pacing of sectional transitions, tension-release arcs, hook placements, repetitive choruses, and melodic contours. It makes sure that independent of recording quality, the underlying song blueprint captures the listener's focus.
              </p>
            </div>
          </div>

          {/* Feature 6: 3x Analysis (High Stability Mode) */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl flex-shrink-0 h-fit">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">3x Analysis Mode (High Stability Engine)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Toggles a multi-pass audit script that processes your audio critique three times simultaneously. It evaluates convergent mathematical averages of all scores to bypass artificial intelligence generation variance and deliver reliable metrics.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Spotify Stream Limitations Explanation Section */}
      <div 
        id="spotify-preview-limitations-explanation"
        className="mt-4 p-6 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 hover:border-amber-500/25 rounded-3xl text-left transition-all duration-300 ring-1 ring-amber-500/10"
      >
        <div className="flex gap-4">
          <HelpCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-amber-500 font-bold block">
              Aesthetic Fidelity &amp; Stream Range note
            </span>
            <span className="text-sm font-extrabold text-slate-200">
              Why MP3/WAV Upload is Required for True Full-Length Audits
            </span>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Spotify restricts developer-registered applications to fetching a <span className="text-amber-400 font-semibold font-mono">30-second high-quality preview stream</span>. While this is sufficient for our listener AI to analyze tone balance signatures, sub-bass weights, and vocal clarity within that segment, it is unable to sweep the complete composition.
            </p>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Because of this limitation, the AI cannot audit your entire structural pacing, energetic build-ups, dynamic drop off progression, or mathematically locate exactly when your <span className="text-white font-medium">main chorus/hook occurs</span> if it resides outside of that initial 30-second window.
            </p>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              For a granular, unbounded, and fully technical A&amp;R master audit across your track's full timeline, <span className="text-blue-400 font-semibold">uploading your complete master MP3 or WAV file</span> remains the gold standard.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Bottom Launch CTA Card */}
      <div className="bg-[#0A0B0E] border border-white/5 p-8 rounded-3xl relative overflow-hidden flex flex-col gap-4 text-center mt-4 select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-col items-center gap-1.5 z-10">
          <span className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl inline-block mb-1 shadow-inner">
            <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight">Run Your Real-Time Session</h2>
          <p className="text-xs text-slate-400 max-w-lg leading-relaxed mt-1 mx-auto">
            Ready to test your track against standard commercial and artistic thresholds?
          </p>
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 mt-4 cursor-pointer hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:scale-102"
          >
            <span>LAUNCH DESIGN ENGINE</span>
          </button>
        </div>
      </div>

    </div>
  );
}
