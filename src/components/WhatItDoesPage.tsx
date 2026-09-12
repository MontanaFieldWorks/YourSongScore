import React from "react";
import { 
  ArrowLeft, BookOpen, Clock, Code, ShieldCheck, HelpCircle,
  Rabbit, Activity, Compass, Music, FileMusic, AudioLines, Headphones,
  Layers, Radio, Wrench, LineChart, BarChart3, Sparkles,
  ChevronDown, ChevronUp, ChevronsUp, Volume2, ChevronsRight, Cog,
  Sliders, Guitar, Mic, Waves, TrendingUp, Music4, Feather, Vault
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
  const [isCompletionRateOpen, setIsCompletionRateOpen] = React.useState(false);
  const [isAlgorithmicAlignmentOpen, setIsAlgorithmicAlignmentOpen] = React.useState(false);
  const [isRecommenderPredictionOpen, setIsRecommenderPredictionOpen] = React.useState(false);
  const [isAlgorithmicSandboxOpen, setIsAlgorithmicSandboxOpen] = React.useState(false);
  const [isEngineeringStudioOpen, setIsEngineeringStudioOpen] = React.useState(false);
  const [isProductionQualityOpen, setIsProductionQualityOpen] = React.useState(false);
  const [isLoudnessComplianceOpen, setIsLoudnessComplianceOpen] = React.useState(false);
  const [isMixBalanceOpen, setIsMixBalanceOpen] = React.useState(false);
  const [isInstrumentalStagingOpen, setIsInstrumentalStagingOpen] = React.useState(false);
  const [isVocalTrackingOpen, setIsVocalTrackingOpen] = React.useState(false);
  const [isArrangementFlowOpen, setIsArrangementFlowOpen] = React.useState(false);
  const [isDynamicModulationOpen, setIsDynamicModulationOpen] = React.useState(false);
  const [isClimaxTrajectoryOpen, setIsClimaxTrajectoryOpen] = React.useState(false);
  const [isArtisticAnalysisOpen, setIsArtisticAnalysisOpen] = React.useState(false);
  const [isLyricalImpactOpen, setIsLyricalImpactOpen] = React.useState(false);
  const [isMusicTheoryOpen, setIsMusicTheoryOpen] = React.useState(false);
  const [isSongwritingQualityOpen, setIsSongwritingQualityOpen] = React.useState(false);
  const [isAcousticTensionOpen, setIsAcousticTensionOpen] = React.useState(false);
  const [isLyricsAnalysisOpen, setIsLyricsAnalysisOpen] = React.useState(false);
  const [isSongStructureOpen, setIsSongStructureOpen] = React.useState(false);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col gap-8 font-sans animate-fadeIn max-w-[1400px] w-full mx-auto" id="what-it-does-yoursongscore-page">
      
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
            <span className="text-[12px] uppercase font-mono tracking-widest text-[#a855f7] font-bold flex items-center gap-1.5">
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
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[13px] uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.30)] hover:scale-102 self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Song Audit</span>
        </button>
      </div>

      {/* 2. Core Diagnostic Cards Section */}
      <div className="flex flex-col gap-6 text-left">
        <div>
          <span className="text-[12px] font-mono uppercase bg-[#16203a] border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full w-fit tracking-widest font-bold">
            Comprehensive Diagnostics Across Four Core Assessment Categories
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-2.5">
            A Monster Diagnostic Engine: The Four Assessment Categories
          </h2>
          <p className="text-[13px] text-slate-400 mt-1">
            Understanding the math and methodology behind the four assessment categories that empower better music performance — on streaming services, through your speakers, and in the writing room.
          </p>
        </div>

        {/* Diagnostic Score Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          
          {/* Column 1: Streaming Readiness */}
          <div className="flex flex-col gap-4">
            {/* Mainstream Card */}
            <div className="bg-[#0A0B0E] border border-blue-500/10 rounded-2xl p-2 flex flex-col justify-between hover:border-blue-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)] h-[426px]">
              <div className="flex flex-col h-full">
                <h3 className="text-xl font-extrabold text-white">Streaming Readiness</h3>
                <p className="text-[13px] font-mono text-blue-400/90 tracking-wider uppercase mt-1">Algorithmic Readiness Index</p>
                <p className="text-[13px] text-slate-400 mt-3 leading-relaxed flex-1 flex flex-col justify-between">
                  <span>
                    Measures the potential of your track successfully surviving the split-second decisions made by the modern digital gatekeepers of music streaming services (like Spotify and Apple Music) that determine whether your song gets promoted to their editorial playlists.
                    <span className="block mt-2 pl-4">• Core Objective: To ensure the track isn’t skipped, filtered out, or buried by automated playlist recommendation systems.</span>
                    <span className="block mt-2 italic text-slate-500">Great songs don’t always fit the “algo,” while bad songs that do can still get past this gatekeeper.</span>
                  </span>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-400 hover:underline font-semibold block mt-3">See the associated metrics below</a>
                </p>
              </div>
            </div>

            {/* Streaming Readiness Metrics Card */}
            <div className="bg-[#0A0B0E] border border-blue-500/10 rounded-2xl p-2 flex flex-col justify-between hover:border-blue-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
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
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">COMMERCIAL IMPACT (30%)</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isCommercialImpactOpen ? "rotate-180 text-blue-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Deconstructs the overall commercial readiness and potential of the track by scoring its dynamic characteristics against high-performing commercial hits. <span className="text-[12px] text-blue-400 font-semibold block mt-1 hover:underline">Click to {isCommercialImpactOpen ? "collapse details" : "expand details"}</span>
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
                        <div className="border border-blue-500/15 bg-blue-950/20 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-blue-500/5 rounded-full blur-[20px] pointer-events-none" />
                          
                          {/* Section 1: ENGAGEMENT POWER */}
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#3b82f6" glowColor="rgba(59, 130, 246, 0.4)" className="text-blue-500 shrink-0" />
                              <h5 className="text-[13px] font-mono tracking-wider font-extrabold text-blue-400 uppercase">
                                ENGAGEMENT POWER
                              </h5>
                            </div>
                            <p className="text-[14px] text-slate-300 leading-[1.375] font-sans">
                              Predicts how reliably a song holds listener attention long enough to survive the critical first-30-second skip window - the single largest input into Commercial Impact.
                            </p>
                            
                            <div className="flex flex-col gap-2.5 pl-[6px] w-[220px] self-center mt-1">
                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Opening Hook Strength</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    Judges whether the hook arrives at a well-timed moment - the single heaviest-weighted factor in this category.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Spectral Match</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    Compares a real, measured 6-band frequency profile against genre-competitive references, distinguishing genuine imbalance from intentional genre tone curves.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Dynamic Variety &amp; Section Transitions</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    Checks for genuine energy shifts and section contrast - honestly scored for driving, consistent-energy genres where that's the intended feel, not a flaw.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Section 2: PRODUCTION INDEX */}
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#3b82f6" glowColor="rgba(59, 130, 246, 0.4)" className="text-blue-500 shrink-0" />
                              <h5 className="text-[13px] font-mono tracking-wider font-extrabold text-blue-400 uppercase">
                                PRODUCTION INDEX
                              </h5>
                            </div>
                            <p className="text-[14px] text-slate-300 leading-[1.375] font-sans">
                              Evaluates whether the production sounds algorithmically and commercially ready - the other real input into Commercial Impact.
                            </p>
                            
                            <div className="flex flex-col gap-2.5 pl-[6px] w-[220px] self-center mt-1">
                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Palette Cohesion</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    Rates timbral consistency using a real measured score, judging whether instrument choices work together.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Aesthetic Design</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    Rewards clean, professional, genre-correct production as the goal in itself - distinctiveness is a bonus, not a requirement to score well.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Space &amp; Density</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    Checks for real crowding, while recognizing dense Wall-of-Sound genres as a legitimate artistic choice, not a flaw.
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
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
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
                    id="completion-rate-toggle-btn"
                    onClick={() => setIsCompletionRateOpen(!isCompletionRateOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsCompletionRateOpen(!isCompletionRateOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isCompletionRateOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                      isCompletionRateOpen 
                        ? "border-blue-500/60 bg-blue-500/[0.12] shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                        : "border-blue-500/30 bg-blue-500/[0.07] hover:border-blue-500/50 hover:bg-blue-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">COMPLETION RATE (40%)</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isCompletionRateOpen ? "rotate-180 text-blue-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Predicts the probability a listener finishes the critical first-30-second window, built from a real, transparent formula rather than a black box. <span className="text-[12px] text-blue-400 font-semibold block mt-1 hover:underline">Click to {isCompletionRateOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isCompletionRateOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-blue-500/15 bg-blue-950/20 rounded-xl p-4 flex flex-col gap-3 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-blue-500/5 rounded-full blur-[20px] pointer-events-none" />
                          <p className="text-[14px] text-slate-300 leading-[1.375] font-sans relative z-10">
                            Starts from an honest 91% baseline (a small amount of real-world skip risk exists for any song), then subtracts a weighted score built from Engagement Power (70%) and Production Index (20%) - the same two real inputs behind Commercial Impact. The result is your predicted Skip Rate; Completion Rate is simply 100% minus that number.
                          </p>
                          <p className="text-[13px] text-slate-400 leading-[1.375] font-sans relative z-10">
                            Because the formula starts at 91 rather than 100, even a flawless song caps out at 99% - never a full 100, since some real-world skip risk always exists.
                          </p>

                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCompletionRateOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("completion-rate-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
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
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                      isAlgorithmicAlignmentOpen 
                        ? "border-blue-500/60 bg-blue-500/[0.12] shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                        : "border-blue-500/30 bg-blue-500/[0.07] hover:border-blue-500/50 hover:bg-blue-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">STREAMING ALGORITHMIC ALIGNMENT (30%)</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isAlgorithmicAlignmentOpen ? "rotate-180 text-blue-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Models fundamental recommendation attributes (such as Danceability, Energy, Mood Valence, and Acousticness) to predict how auto-curation systems will profile and package the release. <span className="text-[12px] text-blue-400 font-semibold block mt-1 hover:underline">Click to {isAlgorithmicAlignmentOpen ? "collapse details" : "expand details"}</span>
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
                        <div className="border border-blue-500/15 bg-blue-950/20 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-blue-500/5 rounded-full blur-[20px] pointer-events-none" />
                          
                          {/* Section 1: The ECHO NEST SIMULATOR */}
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#3b82f6" glowColor="rgba(59, 130, 246, 0.4)" className="text-blue-500 shrink-0" />
                              <h5 className="text-[13px] font-mono tracking-wider font-extrabold text-blue-400 uppercase">
                                The ECHO NEST SIMULATOR
                              </h5>
                            </div>
                            <p className="text-[14px] text-slate-300 leading-[1.375] font-sans">
                              The Echo Nest (now a core part of Spotify's recommendation engine) pioneered computational audio analysis. To determine editorial playlist placement, The Echo Nest’s algorithm uses <span className="text-blue-400 font-semibold">7 Core Metrics (details here)</span>. YSS’s The Echo Nest Simulator use those same, genre specific indicators to help predict how auto-curation systems will profile and package your release.
                            </p>
                            <p className="text-[14px] text-slate-300 font-bold mt-1">
                              This is the 1st CRITICAL STREAMING GATE …{" "}
                              <span
                                onClick={onNavigateToRabbitHole}
                                className="text-blue-400 hover:text-blue-300 underline cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all"
                              >
                                Read More in the Rabbit Hole
                              </span>
                            </p>
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
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
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

                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-1 pb-0.5 pl-1">The Below Data Is Not Used In the Overall Summary Score</p>

                  <div 
                    id="recommender-prediction-toggle-btn"
                    onClick={() => setIsRecommenderPredictionOpen(!isRecommenderPredictionOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsRecommenderPredictionOpen(!isRecommenderPredictionOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isRecommenderPredictionOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                      isRecommenderPredictionOpen 
                        ? "border-violet-500/60 bg-violet-500/[0.12] shadow-[0_0_15px_rgba(139,92,246,0.15)]" 
                        : "border-violet-500/30 bg-violet-500/[0.07] hover:border-violet-500/50 hover:bg-violet-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-violet-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">RECOMMENDER PERFORMANCE PREDICTION</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isRecommenderPredictionOpen ? "rotate-180 text-violet-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Simulates how recommendation and discovery systems might position your track relative to similar artists and playlists. <span className="text-[12px] text-violet-400 font-semibold block mt-1 hover:underline">Click to {isRecommenderPredictionOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isRecommenderPredictionOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-violet-500/15 bg-violet-950/20 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-violet-500/5 rounded-full blur-[20px] pointer-events-none" />

                          <div className="flex flex-col gap-2.5 pl-[6px] w-[220px] self-center mt-1 relative z-10">
                            <div className="flex gap-2">
                              <span className="text-violet-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">NLP semantic Clustered Neighborhood "Artist Universe"</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                  Vectorizes thematic, musical, and semantic details to map the track's exact position among similar current recording artists.
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <span className="text-violet-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Discovery Feeder Distribution Probabilities Algorithms</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                  Simulates prediction scores to estimate how frequently the track will be automatically recommended in automated queues and radio sessions.
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <span className="text-violet-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Collaborative Filtering Prevention Checklist</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                  Audits the checklist of vital elements required in the first 30 seconds of a track to minimize early skip rates and avoid recommendation penalties.
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-center pt-2 border-t border-white/5 mt-2 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsRecommenderPredictionOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("recommender-prediction-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 hover:text-violet-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 w-full"
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
                        <Vault className="w-4 h-4 text-amber-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">ALGORITHMIC SANDBOX</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isAlgorithmicSandboxOpen ? "rotate-180 text-amber-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Provides a simulated digital environment to test and visualize how the track behaves inside recommendation-engine systems. <span className="text-[12px] text-amber-400 font-semibold block mt-1 hover:underline">Click to {isAlgorithmicSandboxOpen ? "collapse details" : "expand details"}</span>
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
                        <div className="border border-amber-500/15 bg-amber-950/20 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-amber-500/5 rounded-full blur-[20px] pointer-events-none" />
                          
                          {/* Section 1: ALGOTORIAL PLAYLIST SANDBOX */}
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#f59e0b" glowColor="rgba(245, 158, 11, 0.4)" className="text-amber-500 shrink-0" />
                              <h5 className="text-[13px] font-mono tracking-wider font-extrabold text-amber-400 uppercase">
                                Algotorial Playlist Sandbox
                              </h5>
                            </div>
                            <p className="text-[14px] text-slate-300 leading-[1.375] font-sans">
                              Hosts a variety of algorithmic model simulations to predict how the song fits into contextual music feeds.
                            </p>
                            
                            <div className="flex flex-col gap-2.5 pl-[6px] w-[220px] self-center mt-1">
                              <div className="flex gap-2">
                                <span className="text-amber-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Cosine Similarity Mapping</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    Measures the mathematical similarity vector between the track and curated hit playlists to forecast target audience fits.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-amber-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Circumplex Mood Space Plotter</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    Plots the track's valence and energy values onto a standard visual coordinate wheel representing human emotional responsiveness.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-amber-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Transition Lab</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    Evaluates immediate volume, tempo, and key shifts to simulate the crossfade transition quality when this track follows others in a queue.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-amber-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">30s Skip & Playout Simulator The 30-Second Rule Gatekeeper</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
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
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-full"
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
          <div className="flex flex-col gap-4">
            {/* Artistic Card */}
            <div className="bg-[#0A0B0E] border border-[#46F4CD]/20 rounded-2xl p-2 flex flex-col justify-between hover:border-[#46F4CD]/35 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)] h-[426px]">
              <div className="flex flex-col h-full">
                <h3 className="text-xl font-extrabold text-white">The Sonic Soundprint</h3>
                <p className="text-[13px] font-mono text-[#46F4CD]/90 tracking-wider uppercase mt-1">TECHNICAL ARCHITECTURE</p>
                <p className="text-[13px] text-slate-400 mt-3 leading-relaxed flex-1 flex flex-col justify-between">
                  <span>
                    Analyzes the song purely from an audio perspective and assesses how cleanly the individual stems and mixing decisions form a professional sonic field, reporting whether the song’s mix meets the established sonic standards of your genre. Includes recommendations for corrections.
                    <span className="block mt-2 pl-4">• Core Objective: To diagnose flaws inside the DAW project that prevent a home mix from sounding competitive on club systems or high-end monitors.</span>
                    <span className="block mt-2 italic text-slate-500">Even if your mix is good, not great, streaming services' algorithms might "pass" on it.</span>
                  </span>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-[#46F4CD] hover:underline font-semibold block mt-3">See the associated metrics below</a>
                </p>
              </div>
            </div>

            {/* Sonic Soundprint Metrics Card */}
            <div className="bg-[#0A0B0E] border border-[#46F4CD]/20 rounded-2xl p-2 flex flex-col justify-between hover:border-[#46F4CD]/35 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div>
                <h3 className="text-[16px] font-bold text-[#46F4CD] mb-4">Sonic Soundprint Metrics</h3>

                <div className="flex flex-col gap-1.5 text-left mb-4">
                  <div 
                    id="mix-balance-toggle-btn"
                    onClick={() => setIsMixBalanceOpen(!isMixBalanceOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsMixBalanceOpen(!isMixBalanceOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isMixBalanceOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-[#46F4CD]/50 ${
                      isMixBalanceOpen 
                        ? "border-[#46F4CD]/60 bg-[#46F4CD]/[0.12] shadow-[0_0_15px_rgba(70,244,205,0.15)]" 
                        : "border-[#46F4CD]/30 bg-[#46F4CD]/[0.07] hover:border-[#46F4CD]/50 hover:bg-[#46F4CD]/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#46F4CD] shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">MIX BALANCE QUALITY (50%)</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isMixBalanceOpen ? "rotate-180 text-[#46F4CD]" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Real, measured checks across five frequency and stereo dimensions - each with a genre-aware gate so intentional artistic choices aren't scored as flaws. <span className="text-[12px] text-[#46F4CD] font-semibold block mt-1 hover:underline">Click to {isMixBalanceOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isMixBalanceOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-[#46F4CD]/15 bg-neutral-900/40 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-[#46F4CD]/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Mud Prevention</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Checks for uncontrolled low-mid buildup, distinguishing genuine masking from intentional genre weight (e.g. dark pop, hip-hop).</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Midrange Spacing</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Audits whether the vocal and lead elements have real room to sit forward without competing instruments crowding them out.</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Low-End Division</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Checks the real relationship between sub-bass and kick drum to confirm they occupy clean, separate zones.</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Sibilance Shaving</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Uses a real measured sibilance score to catch harsh "S" and "T" sounds without penalizing intentionally bright vocal chains.</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Stereo Width</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Uses real measured phase correlation - genuine phase risk is flagged regardless of genre, while a narrow, centered image is judged on artistic intent.</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsMixBalanceOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("mix-balance-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#46F4CD]/10 hover:bg-[#46F4CD]/20 border border-[#46F4CD]/20 hover:border-[#46F4CD]/40 text-[#46F4CD] hover:text-white text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#46F4CD]/50 w-full"
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
                    id="instrumental-staging-toggle-btn"
                    onClick={() => setIsInstrumentalStagingOpen(!isInstrumentalStagingOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsInstrumentalStagingOpen(!isInstrumentalStagingOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isInstrumentalStagingOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-[#46F4CD]/50 ${
                      isInstrumentalStagingOpen 
                        ? "border-[#46F4CD]/60 bg-[#46F4CD]/[0.12] shadow-[0_0_15px_rgba(70,244,205,0.15)]" 
                        : "border-[#46F4CD]/30 bg-[#46F4CD]/[0.07] hover:border-[#46F4CD]/50 hover:bg-[#46F4CD]/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Guitar className="w-4 h-4 text-[#46F4CD] shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">INSTRUMENTAL STAGING (20%)</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isInstrumentalStagingOpen ? "rotate-180 text-[#46F4CD]" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Timing cohesion, transient punch, stereo staging, and warmth - each measured for real, with genre-appropriate exceptions. <span className="text-[12px] text-[#46F4CD] font-semibold block mt-1 hover:underline">Click to {isInstrumentalStagingOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isInstrumentalStagingOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-[#46F4CD]/15 bg-neutral-900/40 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-[#46F4CD]/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Timeline Grid Cohesion</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Measures real timing alignment, distinguishing a deliberate stylistic pocket from genuinely erratic timing.</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Transient Punch</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Measures real drum attack sharpness, recognizing intentionally soft transients in genres like lo-fi and ambient.</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Stereo Instrument Staging</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Despite the name, judges real stereo placement of instruments - a centered arrangement is judged on artistic intent, not penalized by default.</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Instrumental Warmth</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Measures real low-mid to high-frequency balance, recognizing deliberately bright production as a genre choice, not a flaw.</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsInstrumentalStagingOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("instrumental-staging-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#46F4CD]/10 hover:bg-[#46F4CD]/20 border border-[#46F4CD]/20 hover:border-[#46F4CD]/40 text-[#46F4CD] hover:text-white text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#46F4CD]/50 w-full"
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
                    id="vocal-tracking-toggle-btn"
                    onClick={() => setIsVocalTrackingOpen(!isVocalTrackingOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsVocalTrackingOpen(!isVocalTrackingOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isVocalTrackingOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-[#46F4CD]/50 ${
                      isVocalTrackingOpen 
                        ? "border-[#46F4CD]/60 bg-[#46F4CD]/[0.12] shadow-[0_0_15px_rgba(70,244,205,0.15)]" 
                        : "border-[#46F4CD]/30 bg-[#46F4CD]/[0.07] hover:border-[#46F4CD]/50 hover:bg-[#46F4CD]/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-[#46F4CD] shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">VOCAL TRACKING (30%)</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isVocalTrackingOpen ? "rotate-180 text-[#46F4CD]" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Pitch accuracy, dynamic delivery, and layer fit - judged on real register and phrasing expression, not just raw loudness variance. <span className="text-[12px] text-[#46F4CD] font-semibold block mt-1 hover:underline">Click to {isVocalTrackingOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isVocalTrackingOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-[#46F4CD]/15 bg-neutral-900/40 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-[#46F4CD]/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Pitch Accuracy</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Uses detected pitch data as supporting evidence, with real listening judgment as the primary basis for the score.</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Dynamic Delivery</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Checks for genuine register shifts and phrasing variety - a compressed pop vocal isn't penalized just for staying at a consistent volume.</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Vocal Layer Fit</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Audits how well doubles and harmonies balance against the lead vocal in stereo, phase, and volume.</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsVocalTrackingOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("vocal-tracking-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#46F4CD]/10 hover:bg-[#46F4CD]/20 border border-[#46F4CD]/20 hover:border-[#46F4CD]/40 text-[#46F4CD] hover:text-white text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#46F4CD]/50 w-full"
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

                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-1 pb-0.5 pl-1">The Below Data Is Not Used In the Overall Summary Score</p>
                </div>

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
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 ${
                      isEngineeringStudioOpen 
                        ? "border-[#2563EB]/60 bg-[#2563EB]/[0.12] shadow-[0_0_15px_rgba(37,99,235,0.15)]" 
                        : "border-[#2563EB]/30 bg-[#2563EB]/[0.07] hover:border-[#2563EB]/50 hover:bg-[#2563EB]/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">THE ENGINEERING STUDIO</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isEngineeringStudioOpen ? "rotate-180 text-blue-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <h3 className="text-[13px] font-bold text-blue-400 mb-1 leading-snug">Mixing & Mastering Technical Recommendation</h3>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      A powerhouse engineering and production mix/master diagnostic suite guides with nine diagnostic modules.  Analyzes a broad array of measurements that guide step-by-step mix correction blueprints. <span className="text-[12px] text-blue-400 font-semibold block mt-1 hover:underline">Click to {isEngineeringStudioOpen ? "collapse details" : "expand details"}</span>
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
                        <div className="border border-[#2563EB]/15 bg-neutral-900/40 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-[#2563EB]/5 rounded-full blur-[20px] pointer-events-none" />
                          
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
                              <ChevronsRight className="w-4 h-4 text-blue-400 shrink-0" />
                              <span>see The Engineering Studio Details Page for Module by Module Details</span>
                            </button>
                          </div>

                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-0 border-b border-white/5">
                              <GlowingLoader color="#2563EB" glowColor="rgba(37, 99, 235, 0.4)" className="text-blue-500 shrink-0" />
                              <h5 className="text-[13px] font-mono tracking-wider font-extrabold text-blue-400 uppercase">
                                MIXING & MASTERING TECHNICAL ANALYSIS
                              </h5>
                            </div>
                            
                            <div className="flex flex-col gap-2.5 pl-[6px] mt-1.5">
                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Harmonic Resolution</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    A high-resolution spectral monitoring utility that sweeps the frequency spectrum from 20 Hz to 20 kHz to map harmonic overloads.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Signal &amp; Levels</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    This module conducts an essential amplitude analysis to measure overall signal energy, dynamic variance, and headroom.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Dynamics Profile</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    An analytical sweep examining transient spikes, compression boundaries, and macro vs. micro changes over time.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Frequency Balance</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    A six-band spectral energy sweep mapping acoustic density from sub-bass foundations up through high-frequency presence.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Stereo Field</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    This module combines stereo width analysis with front-to-back spatial depth mapping into a single two-tab view.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Genre Compliance</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    This module compares your track's loudness and frequency signature against standard target profiles for global streaming networks.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Noise &amp; Artifacts</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    An auditing module designed to detect system noise, low-level electrical hum, files glitches, and digital conversion offsets.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Arrangement Patterns</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    A multi-track simulator running on arrangement files to locate clashing tracks and crowded acoustic neighborhoods.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Stereo Azimuth Profile</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
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
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-white text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
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
                        <Cog className="w-4 h-4 text-[#46F4CD] shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">PRODUCTION QUALITY</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isProductionQualityOpen ? "rotate-180 text-[#46F4CD]" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <h3 className="text-[13px] font-bold text-[#46F4CD] mb-1 leading-snug">Production & Arrangement Diagnostic</h3>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      A diagnostic of whether your track sounds finished - evaluating the production decisions that separate a competitive release from a home recording. <span className="text-[12px] text-[#46F4CD] font-semibold block mt-1 hover:underline">Click to {isProductionQualityOpen ? "collapse details" : "expand details"}</span>
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
                        <div className="border border-[#46F4CD]/15 bg-neutral-900/40 rounded-xl p-4 flex flex-col gap-4 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-[#46F4CD]/5 rounded-full blur-[20px] pointer-events-none" />
                          
                          <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                              <GlowingLoader color="#46F4CD" glowColor="rgba(70, 244, 205, 0.4)" className="text-[#46F4CD] shrink-0" />
                              <h5 className="text-[13px] font-mono tracking-wider font-extrabold text-[#46F4CD] uppercase">
                                PRODUCTION QUALITY DIAGNOSTICS
                              </h5>
                            </div>
                            
                            <p className="text-[14px] text-slate-200 leading-[1.4] mt-2 font-medium">
                              Streaming algorithms don't hear your mix — but your listeners do. Poor production drives early skips, and early skips tank your algorithmic reach.
                            </p>

                            <div className="p-3 bg-[#0A0B0E]/60 border border-white/5 rounded-lg my-1.5">
                              <p className="text-[12px] text-slate-400 leading-relaxed italic">
                                <strong className="text-[#46F4CD] not-italic font-bold">NOTE:</strong> Some of these metrics share data with other YSS modules. PRODUCTION QUALITY combines them here with a single focus: not whether your mix is technically correct, but whether it sounds like a finished, competitive record.
                              </p>
                            </div>
                            
                            <div className="flex flex-col gap-3.5 pl-[6px] mt-1.5">
                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Arrangement Density</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    How effectively your song layers instruments and elements across its runtime to maintain listener engagement without sounding cluttered or thin.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Sonic Texture &amp; Sound Design</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    Whether your instrument tones, synth choices, and sound selection have character and intentionality, or sound generic and unprocessed.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Low-End Power</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    The physical punch and definition of your bass and kick relationship — whether your track hits with authority on speakers and headphones alike.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Width &amp; Dimension</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    How far your mix extends across the stereo field and front-to-back depth, creating the sense of space that separates professional productions from flat recordings.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Vocal Production</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
                                    The quality of the vocal chain, treatment, and placement — including doubles, effects, and whether the voice commands attention or gets lost in the mix.
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <span className="text-[#46F4CD] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Energy Management</span>
                                  <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">
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
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#46F4CD]/10 hover:bg-[#46F4CD]/20 border border-[#46F4CD]/20 hover:border-[#46F4CD]/40 text-[#46F4CD] hover:text-white text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#46F4CD]/50 w-full"
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
                    id="loudness-compliance-toggle-btn"
                    onClick={() => setIsLoudnessComplianceOpen(!isLoudnessComplianceOpen)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsLoudnessComplianceOpen(!isLoudnessComplianceOpen);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isLoudnessComplianceOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                      isLoudnessComplianceOpen 
                        ? "border-blue-500/60 bg-blue-500/[0.12] shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                        : "border-blue-500/30 bg-blue-500/[0.07] hover:border-blue-500/50 hover:bg-blue-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">LOUDNESS COMPLIANCE</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isLoudnessComplianceOpen ? "rotate-180 text-blue-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Checks real, measured LUFS and LRA against your genre's target window as a pass/fail compliance fact - not a graded score. <span className="text-[12px] text-blue-400 font-semibold block mt-1 hover:underline">Click to {isLoudnessComplianceOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isLoudnessComplianceOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border border-blue-500/15 bg-blue-950/20 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-blue-500/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2">
                              <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Integrated Loudness (LUFS)</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Checks your master's real measured loudness against the target window for your genre.</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-blue-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Loudness Range (LRA)</span>
                                <span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Checks your master's real measured dynamic range against the target window for your genre.</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsLoudnessComplianceOpen(false);
                                setTimeout(() => {
                                  const toggleBtn = document.getElementById("loudness-compliance-toggle-btn");
                                  if (toggleBtn) {
                                    toggleBtn.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    toggleBtn.focus();
                                  }
                                }, 100);
                              }}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full"
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

          {/* Column 3: Structural Engagement */}
          <div className="flex flex-col gap-4">
            {/* Structural Engagement Card */}
            <div className="bg-[#0A0B0E] border border-purple-500/20 rounded-2xl p-2 flex flex-col justify-between hover:border-purple-500/30 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)] h-[426px]">
              <div className="flex flex-col h-full">
                <h3 className="text-xl font-extrabold text-white">Structural Engagement</h3>
                <p className="text-[13px] font-mono text-purple-400/90 tracking-wider uppercase mt-1">RETENTION &amp; DYNAMIC MOMENTUM</p>
                <p className="text-[13px] text-slate-400 mt-3 leading-relaxed flex-1 flex flex-col justify-between">
                  <span>
                    Reflects your song's pacing, dynamic build, and energy trajectory — the retention dynamics that influence whether listeners and streaming algorithms stay engaged past the critical early moments of a track.
                    <span className="block mt-2 pl-4">• Core Objective: To ensure the arrangement sustains forward momentum and delivers satisfying dynamic contrast without losing listeners to mid-track skip fatigue.</span>
                    <span className="block mt-2 italic text-slate-500">A track with great mixing can still tank algorithmically if its pacing stalls or its energy arc never pays off.</span>
                  </span>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-purple-400 hover:underline font-semibold block mt-3">See the associated metrics below</a>
                </p>
              </div>
            </div>

            {/* Structural Engagement Metrics Card */}
            <div className="bg-[#0A0B0E] border border-purple-500/20 rounded-2xl p-2 flex flex-col justify-between hover:border-purple-500/30 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div>
                <h3 className="text-[16px] font-bold text-purple-400 mb-4">Structural Engagement Metrics</h3>
                
                <div className="flex flex-col gap-1.5 text-left">
                  {/* Arrangement Flow (40%) */}
                  <div 
                    id="arrangement-flow-toggle-btn"
                    onClick={() => setIsArrangementFlowOpen(!isArrangementFlowOpen)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsArrangementFlowOpen(!isArrangementFlowOpen); } }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isArrangementFlowOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                      isArrangementFlowOpen ? "border-purple-500/60 bg-purple-500/[0.12] shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "border-purple-500/30 bg-purple-500/[0.07] hover:border-purple-500/50 hover:bg-purple-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Waves className="w-4 h-4 text-purple-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">ARRANGEMENT FLOW (40%)</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isArrangementFlowOpen ? "rotate-180 text-purple-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Assesses whether transitions between sections build tension and release effectively, keeping energy scaling coherent from intro to outro. <span className="text-[12px] text-purple-400 font-semibold block mt-1 hover:underline">Click to {isArrangementFlowOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isArrangementFlowOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="border border-purple-500/15 bg-purple-950/20 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-purple-500/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-purple-400 font-bold uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                              <GlowingLoader color="#a855f7" glowColor="rgba(168, 85, 247, 0.4)" />
                              ARRANGEMENT FLOW &amp; SECTION PACING
                            </span>
                            <span className="text-slate-500 font-mono text-[10px]">WEIGHT: 40%</span>
                          </div>
                          <p className="text-[12px] text-slate-400 italic">
                            Computed from section boundary energy and transition delta measurements — weighted at 40% into Structural Engagement.
                          </p>
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Section Transitions &amp; Pacing</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Assesses whether shifts between verse, chorus, and bridge build tension and release effectively.</span></div></div>
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Dynamic Lift Across Boundaries</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Measures whether energy levels step up convincingly at key structural milestones rather than remaining static.</span></div></div>
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Momentum Continuity</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Checks that transitions keep the arrangement moving forward from intro to outro without jarring energy drops.</span></div></div>
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Pacing Balance</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Confirms that verses, pre-choruses, and hooks maintain a tight, engaging runtime ratio without dragging.</span></div></div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button onClick={(e) => { e.stopPropagation(); setIsArrangementFlowOpen(false); setTimeout(() => { const b = document.getElementById("arrangement-flow-toggle-btn"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "nearest" }); b.focus(); } }, 100); }} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full" title="Collapse details">
                              <ChevronsUp className="w-3.5 h-3.5" /><span>Collapse Details</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Dynamic Modulation (30%) */}
                  <div 
                    id="dynamic-modulation-toggle-btn"
                    onClick={() => setIsDynamicModulationOpen(!isDynamicModulationOpen)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsDynamicModulationOpen(!isDynamicModulationOpen); } }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isDynamicModulationOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                      isDynamicModulationOpen ? "border-purple-500/60 bg-purple-500/[0.12] shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "border-purple-500/30 bg-purple-500/[0.07] hover:border-purple-500/50 hover:bg-purple-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <AudioLines className="w-4 h-4 text-purple-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">DYNAMIC MODULATION (30%)</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isDynamicModulationOpen ? "rotate-180 text-purple-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Measures real loudness contrast between the song's quietest and loudest sustained sections — the difference that keeps a listener locked in. <span className="text-[12px] text-purple-400 font-semibold block mt-1 hover:underline">Click to {isDynamicModulationOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isDynamicModulationOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="border border-purple-500/15 bg-purple-950/20 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-purple-500/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-purple-400 font-bold uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                              <GlowingLoader color="#a855f7" glowColor="rgba(168, 85, 247, 0.4)" />
                              DYNAMIC MODULATION AUDIT
                            </span>
                            <span className="text-slate-500 font-mono text-[10px]">WEIGHT: 30%</span>
                          </div>
                          <p className="text-[12px] text-slate-400 italic">
                            Computed from a windowed RMS energy envelope sampled across the entire track — weighted at 30% into Structural Engagement.
                          </p>
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">RMS Dynamic Envelope</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Measures the real dB difference between quietest 15th percentile and loudest 85th percentile sustained sections.</span></div></div>
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Section-to-Section Relief</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Prevents listener ear fatigue by verifying breakdowns, verses, and drops create perceptible dynamic breathing room.</span></div></div>
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Commercial Sweet Spot Calibration</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Rewards dynamic variety between 3 dB and 10 dB without penalizing intentional genre compression.</span></div></div>
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Energy Crest Contrast</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Evaluates how dramatically choruses and drops punch through relative to surrounding verses.</span></div></div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button onClick={(e) => { e.stopPropagation(); setIsDynamicModulationOpen(false); setTimeout(() => { const b = document.getElementById("dynamic-modulation-toggle-btn"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "nearest" }); b.focus(); } }, 100); }} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full" title="Collapse details">
                              <ChevronsUp className="w-3.5 h-3.5" /><span>Collapse Details</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Climax Trajectory (30%) */}
                  <div 
                    id="climax-trajectory-toggle-btn"
                    onClick={() => setIsClimaxTrajectoryOpen(!isClimaxTrajectoryOpen)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsClimaxTrajectoryOpen(!isClimaxTrajectoryOpen); } }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isClimaxTrajectoryOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                      isClimaxTrajectoryOpen ? "border-purple-500/60 bg-purple-500/[0.12] shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "border-purple-500/30 bg-purple-500/[0.07] hover:border-purple-500/50 hover:bg-purple-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">CLIMAX TRAJECTORY (30%)</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isClimaxTrajectoryOpen ? "rotate-180 text-purple-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Measures whether the song's energy genuinely builds toward a later peak, rather than front-loading its most intense moment early. <span className="text-[12px] text-purple-400 font-semibold block mt-1 hover:underline">Click to {isClimaxTrajectoryOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>

                  <AnimatePresence>
                    {isClimaxTrajectoryOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="border border-purple-500/15 bg-purple-950/20 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-purple-500/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-purple-400 font-bold uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                              <GlowingLoader color="#a855f7" glowColor="rgba(168, 85, 247, 0.4)" />
                              CLIMAX TRAJECTORY AUDIT
                            </span>
                            <span className="text-slate-500 font-mono text-[10px]">WEIGHT: 30%</span>
                          </div>
                          <p className="text-[12px] text-slate-400 italic">
                            Evaluates peak position timing and build magnitude from the actual audio waveform — weighted at 30% into Structural Engagement.
                          </p>
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Peak Timing (55%–90% Ideal Window)</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Rewards songs that place their most intense climax in the second half to provide a clear emotional destination.</span></div></div>
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Build Magnitude &amp; Dynamic Lift</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Confirms measurable decibel lift leading into the climax for a genuine structural and emotional payoff.</span></div></div>
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Late-Track Retention</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Keeps streaming listeners from dropping off before track completion by delivering a high-energy late peak.</span></div></div>
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Narrative Arc Delivery</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Verifies that early sections build anticipation toward a primary hook rather than plateauing with nowhere left to climb.</span></div></div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button onClick={(e) => { e.stopPropagation(); setIsClimaxTrajectoryOpen(false); setTimeout(() => { const b = document.getElementById("climax-trajectory-toggle-btn"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "nearest" }); b.focus(); } }, 100); }} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full" title="Collapse details">
                              <ChevronsUp className="w-3.5 h-3.5" /><span>Collapse Details</span>
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

          {/* Column 4: Compositional Depth */}
          <div className="flex flex-col gap-4">
            {/* Songwriting Card */}
            <div className="bg-[#0A0B0E] border border-amber-500/20 rounded-2xl p-2 flex flex-col justify-between hover:border-amber-500/30 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)] h-[426px]">
              <div className="flex flex-col h-full">
                <h3 className="text-xl font-extrabold text-white italic">Compositional Depth</h3>
                <p className="text-[13px] font-mono text-amber-400/90 tracking-wider uppercase mt-1">not part of summary scores</p>
                <p className="text-[13px] text-slate-400 mt-3 leading-relaxed flex-1 flex flex-col justify-between">
                  <span>
                    Bypasses production polish and commercial mixing to critique the actual songwriting, lyrical themes, and musical theory that forge deep human connection. Evaluates your craft against benchmark songwriting principles.
                    <span className="block mt-2 pl-4">• Core Objective: To provide meaningful artistic diagnostics for your personal growth as a songwriter — without affecting your algorithmic streaming score.</span>
                    <span className="block mt-2 italic text-slate-500">A three-chord song won’t score high on complex harmonic theory, but that doesn’t mean it’s not a great record. This data is purely for creative growth.</span>
                  </span>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-amber-400 hover:underline font-semibold block mt-3">See the associated metrics below</a>
                </p>
              </div>
            </div>

            {/* Compositional Depth Metrics Card */}
            <div className="bg-[#0A0B0E] border border-amber-500/20 rounded-2xl p-2 flex flex-col justify-between hover:border-amber-500/30 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div>
                <h3 className="text-[16px] font-bold text-amber-400 mb-4">Composition Metrics</h3>
                
                <div className="flex flex-col gap-1.5 text-left">
                  <div 
                    id="music-theory-toggle-btn"
                    onClick={() => setIsMusicTheoryOpen(!isMusicTheoryOpen)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsMusicTheoryOpen(!isMusicTheoryOpen); } }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isMusicTheoryOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]/50 ${
                      isMusicTheoryOpen ? "border-[#818cf8]/60 bg-[#818cf8]/[0.12] shadow-[0_0_15px_rgba(129,140,248,0.15)]" : "border-[#818cf8]/30 bg-[#818cf8]/[0.07] hover:border-[#818cf8]/50 hover:bg-[#818cf8]/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Music4 className="w-4 h-4 text-[#818cf8] shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">MUSIC THEORY ANALYSIS</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isMusicTheoryOpen ? "rotate-180 text-[#818cf8]" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Decodes the foundational theory, key changes, structural forms, and meters driving the composition. <span className="text-[12px] text-[#818cf8] font-semibold block mt-1 hover:underline">Click to {isMusicTheoryOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>
                  <AnimatePresence>
                    {isMusicTheoryOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="border border-[#818cf8]/15 bg-[#818cf8]/10 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-[#818cf8]/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2"><span className="text-[#818cf8] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Chord Dynamics</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Inspects how successfully tension and release are crafted through chord progressions and substitutions.</span></div></div>
                            <div className="flex gap-2"><span className="text-[#818cf8] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Harmonic Variety</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Measures harmonic variety and richness across the timeline, without penalizing intentionally simple, constrained melodies.</span></div></div>
                            <div className="flex gap-2"><span className="text-[#818cf8] font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Form &amp; Structure</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Examines the arrangement of verses, choruses, bridges, and pre-choruses for a satisfying structural progression.</span></div></div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button onClick={(e) => { e.stopPropagation(); setIsMusicTheoryOpen(false); setTimeout(() => { const b = document.getElementById("music-theory-toggle-btn"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "nearest" }); b.focus(); } }, 100); }} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#818cf8]/10 hover:bg-[#818cf8]/20 border border-[#818cf8]/20 hover:border-[#818cf8]/40 text-[#818cf8] hover:text-[#a5b4fc] text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#818cf8]/50 w-full" title="Collapse details">
                              <ChevronsUp className="w-3.5 h-3.5" /><span>Collapse Details</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div 
                    id="lyrical-impact-toggle-btn"
                    onClick={() => setIsLyricalImpactOpen(!isLyricalImpactOpen)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsLyricalImpactOpen(!isLyricalImpactOpen); } }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isLyricalImpactOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
                      isLyricalImpactOpen ? "border-cyan-500/60 bg-cyan-500/[0.12] shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "border-cyan-500/30 bg-cyan-500/[0.07] hover:border-cyan-500/50 hover:bg-cyan-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Feather className="w-4 h-4 text-cyan-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">LYRICAL IMPACT</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isLyricalImpactOpen ? "rotate-180 text-cyan-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Scores the expressive and thematic value of the written lyrics on a technical and narrative level. <span className="text-[12px] text-cyan-400 font-semibold block mt-1 hover:underline">Click to {isLyricalImpactOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>
                  <AnimatePresence>
                    {isLyricalImpactOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="border border-cyan-500/15 bg-cyan-950/20 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-cyan-500/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2"><span className="text-cyan-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Meaning Clarity</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Measures whether the lyrics' theme and message come across clearly, even through abstract or metaphorical imagery.</span></div></div>
                            <div className="flex gap-2"><span className="text-cyan-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Cliché Avoidance</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Evaluates whether the phrasing uses original, poetic concepts over tired, predictable rhyming schemes.</span></div></div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button onClick={(e) => { e.stopPropagation(); setIsLyricalImpactOpen(false); setTimeout(() => { const b = document.getElementById("lyrical-impact-toggle-btn"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "nearest" }); b.focus(); } }, 100); }} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 hover:text-cyan-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-full" title="Collapse details">
                              <ChevronsUp className="w-3.5 h-3.5" /><span>Collapse Details</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div 
                    id="artistic-analysis-toggle-btn"
                    onClick={() => setIsArtisticAnalysisOpen(!isArtisticAnalysisOpen)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsArtisticAnalysisOpen(!isArtisticAnalysisOpen); } }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isArtisticAnalysisOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 ${
                      isArtisticAnalysisOpen ? "border-pink-500/60 bg-pink-500/[0.12] shadow-[0_0_15px_rgba(236,72,153,0.15)]" : "border-pink-500/30 bg-pink-500/[0.07] hover:border-pink-500/50 hover:bg-pink-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Music4 className="w-4 h-4 text-pink-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">ARTISTIC ANALYSIS</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isArtisticAnalysisOpen ? "rotate-180 text-pink-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Deconstructs structural arrangement nuances, atmospheric elements, and chord patterns to evaluate artistic merit. <span className="text-[12px] text-pink-400 font-semibold block mt-1 hover:underline">Click to {isArtisticAnalysisOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>
                  <AnimatePresence>
                    {isArtisticAnalysisOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="border border-pink-500/15 bg-pink-950/20 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-pink-500/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2"><span className="text-pink-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Artistic Alignment</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Judges how well the production, delivery, and arrangement reinforce a single, cohesive creative vision.</span></div></div>
                            <div className="flex gap-2"><span className="text-pink-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Harmonic Intrigue</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Scores the creative use of chord progressions and modulations, grounded in real detected chord/key data.</span></div></div>
                            <div className="flex gap-2"><span className="text-pink-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Atmospheric Depth</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Rates the sense of dimension, reverb imaging, and spatial placement within the production.</span></div></div>
                            <div className="flex gap-2"><span className="text-pink-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Palette Synergy</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Checks whether the active instruments align tonally to serve a unified artistic direction.</span></div></div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button onClick={(e) => { e.stopPropagation(); setIsArtisticAnalysisOpen(false); setTimeout(() => { const b = document.getElementById("artistic-analysis-toggle-btn"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "nearest" }); b.focus(); } }, 100); }} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 hover:border-pink-500/40 text-pink-400 hover:text-pink-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 w-full" title="Collapse details">
                              <ChevronsUp className="w-3.5 h-3.5" /><span>Collapse Details</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div 
                    id="songwriting-quality-toggle-btn"
                    onClick={() => setIsSongwritingQualityOpen(!isSongwritingQualityOpen)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsSongwritingQualityOpen(!isSongwritingQualityOpen); } }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isSongwritingQualityOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${
                      isSongwritingQualityOpen ? "border-amber-500/60 bg-amber-500/[0.12] shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "border-amber-500/30 bg-amber-500/[0.07] hover:border-amber-500/50 hover:bg-amber-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-amber-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">SONGWRITING QUALITY</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isSongwritingQualityOpen ? "rotate-180 text-amber-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Analyzes hook effectiveness and structural memorability through melodic contour and syllabic phrasing. <span className="text-[12px] text-amber-400 font-semibold block mt-1 hover:underline">Click to {isSongwritingQualityOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>
                  <AnimatePresence>
                    {isSongwritingQualityOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="border border-amber-500/15 bg-amber-950/20 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-amber-500/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2"><span className="text-amber-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Melodic Hooks - Interval Memory</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Notes whether the melody relies on narrow, stepwise movement or distinct, memorable leaps.</span></div></div>
                            <div className="flex gap-2"><span className="text-amber-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Melodic Hooks - Syllabic Placement</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Tracks how precisely the lyrics' syllables land on the underlying rhythmic pulse.</span></div></div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button onClick={(e) => { e.stopPropagation(); setIsSongwritingQualityOpen(false); setTimeout(() => { const b = document.getElementById("songwriting-quality-toggle-btn"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "nearest" }); b.focus(); } }, 100); }} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-full" title="Collapse details">
                              <ChevronsUp className="w-3.5 h-3.5" /><span>Collapse Details</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div 
                    id="acoustic-tension-toggle-btn"
                    onClick={() => setIsAcousticTensionOpen(!isAcousticTensionOpen)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsAcousticTensionOpen(!isAcousticTensionOpen); } }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isAcousticTensionOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 ${
                      isAcousticTensionOpen ? "border-red-500/60 bg-red-500/[0.12] shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-red-500/30 bg-red-500/[0.07] hover:border-red-500/50 hover:bg-red-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-red-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">DYNAMIC TENSION &amp; RELEASE</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isAcousticTensionOpen ? "rotate-180 text-red-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Captures how the song builds and releases dynamic pressure across its runtime. <span className="text-[12px] text-red-400 font-semibold block mt-1 hover:underline">Click to {isAcousticTensionOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>
                  <AnimatePresence>
                    {isAcousticTensionOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="border border-red-500/15 bg-red-950/20 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-red-500/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2"><span className="text-red-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Tension Buildup</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Checks whether intensity is stacked through layering and texture, not just raw volume changes.</span></div></div>
                            <div className="flex gap-2"><span className="text-red-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Payoff Delivery</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Judges whether the climax genuinely resolves the built-up tension, including a sustained plateau as a legitimate payoff style.</span></div></div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button onClick={(e) => { e.stopPropagation(); setIsAcousticTensionOpen(false); setTimeout(() => { const b = document.getElementById("acoustic-tension-toggle-btn"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "nearest" }); b.focus(); } }, 100); }} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-red-500/50 w-full" title="Collapse details">
                              <ChevronsUp className="w-3.5 h-3.5" /><span>Collapse Details</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div 
                    id="lyrics-analysis-toggle-btn"
                    onClick={() => setIsLyricsAnalysisOpen(!isLyricsAnalysisOpen)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsLyricsAnalysisOpen(!isLyricsAnalysisOpen); } }}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isLyricsAnalysisOpen}
                    className={`border transition-all duration-300 p-3.5 rounded-xl cursor-pointer select-none group/btn outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                      isLyricsAnalysisOpen ? "border-purple-500/60 bg-purple-500/[0.12] shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "border-purple-500/30 bg-purple-500/[0.07] hover:border-purple-500/50 hover:bg-purple-500/[0.10]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <FileMusic className="w-4 h-4 text-purple-400 shrink-0" />
                        <h4 className="text-[13px] font-bold text-slate-200 tracking-wider">LYRICS ANALYSIS</h4>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${isLyricsAnalysisOpen ? "rotate-180 text-purple-400" : "group-hover/btn:text-slate-200"}`} />
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed font-sans">
                      Validates songwriting craft around rhythmic vocal delivery and narrative brevity. <span className="text-[12px] text-purple-400 font-semibold block mt-1 hover:underline">Click to {isLyricsAnalysisOpen ? "collapse details" : "expand details"}</span>
                    </p>
                  </div>
                  <AnimatePresence>
                    {isLyricsAnalysisOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="border border-purple-500/15 bg-purple-950/20 rounded-xl p-4 flex flex-col gap-2.5 text-left font-sans text-[13px] shadow-xl relative my-1">
                          <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-purple-500/5 rounded-full blur-[20px] pointer-events-none" />
                          <div className="flex flex-col gap-2.5 pl-[6px] relative z-10">
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Vocal Pocketing</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Judges how well the vocal delivery locks into the underlying rhythmic groove.</span></div></div>
                            <div className="flex gap-2"><span className="text-purple-400 font-mono text-[12px] select-none shrink-0 mt-0.5">○</span><div className="flex flex-col"><span className="text-[14px] font-bold text-slate-200 leading-[1.375]">Poetic Brevity</span><span className="text-[13px] text-slate-400 leading-[1.375] mt-0.5">Checks whether the lines are concise, direct, and purposeful rather than padded or overwritten.</span></div></div>
                          </div>
                          <div className="flex justify-center pt-2 border-t border-white/5 mt-1 relative z-10">
                            <button onClick={(e) => { e.stopPropagation(); setIsLyricsAnalysisOpen(false); setTimeout(() => { const b = document.getElementById("lyrics-analysis-toggle-btn"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "nearest" }); b.focus(); } }, 100); }} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:text-purple-300 text-[12px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full" title="Collapse details">
                              <ChevronsUp className="w-3.5 h-3.5" /><span>Collapse Details</span>
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

        </div>
      </div>

      {/* 3. The Interactive Feature Directory Dashboard */}
      <div className="flex flex-col gap-6 text-left border-t border-white/5 pt-10">
        <div>
          <span className="text-[12px] font-mono uppercase bg-[#18112d] border border-purple-500/10 text-purple-400 px-3 py-1 rounded-full w-fit tracking-widest font-bold">
            THE APPLICATION FEATURE MAP
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-2.5">
            Every Other Feature of the App Explained
          </h2>
          <p className="text-[13px] text-slate-400 mt-1">
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
              <p className="text-[13px] text-slate-400 leading-relaxed">
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
              <p className="text-[13px] text-slate-400 leading-relaxed">
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
              <p className="text-[13px] text-slate-400 leading-relaxed">
                Scans your audio's real, measured energy across six frequency bands (Sub-Bass, Bass, Low-Mids, Core Mids, Presence, Air) and checks the result against genre-aware expectations - distinguishing a genuine mix problem from an intentional genre tone curve before flagging anything.
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
              <p className="text-[13px] text-slate-400 leading-relaxed">
                Rates the execution of the song's key performers - pitch, timing, transient punch, and stereo placement - each checked against real measurements first, with a genre-aware gate to recognize deliberate artistic choices before scoring one down.
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
              <p className="text-[13px] text-slate-400 leading-relaxed">
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
              <p className="text-[13px] text-slate-400 leading-relaxed">
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
            <span className="font-mono text-[12px] uppercase tracking-widest text-amber-500 font-bold block">
              Aesthetic Fidelity &amp; Stream Range note
            </span>
            <span className="text-sm font-extrabold text-slate-200">
              Why MP3/WAV Upload is Required for True Full-Length Audits
            </span>
            <p className="text-slate-400 text-[13px] mt-1.5 leading-relaxed">
              Spotify restricts developer-registered applications to fetching a <span className="text-amber-400 font-semibold font-mono">30-second high-quality preview stream</span>. While this is sufficient for our listener AI to analyze tone balance signatures, sub-bass weights, and vocal clarity within that segment, it is unable to sweep the complete composition.
            </p>
            <p className="text-slate-400 text-[13px] mt-2 leading-relaxed">
              Because of this limitation, the AI cannot audit your entire structural pacing, energetic build-ups, dynamic drop off progression, or mathematically locate exactly when your <span className="text-white font-medium">main chorus/hook occurs</span> if it resides outside of that initial 30-second window.
            </p>
            <p className="text-slate-400 text-[13px] mt-2 leading-relaxed">
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
          <p className="text-[13px] text-slate-400 max-w-lg leading-relaxed mt-1 mx-auto">
            Ready to test your track against standard commercial and artistic thresholds?
          </p>
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[13px] uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 mt-4 cursor-pointer hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:scale-102"
          >
            <span>LAUNCH DESIGN ENGINE</span>
          </button>
        </div>
      </div>

    </div>
  );
}
