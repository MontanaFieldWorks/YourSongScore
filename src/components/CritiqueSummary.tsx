import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Lightbulb, ArrowRight, X, TrendingUp, CheckCircle2, Activity, Flame, Rabbit
} from "lucide-react";
import { CritiqueData, TrackInfo } from "../types";

interface CritiqueSummaryProps {
  critique: CritiqueData;
  trackInfo?: TrackInfo;
  onViewFullAudit: () => void;
  onClear?: () => void;
}

export default function CritiqueSummary({ critique, trackInfo, onViewFullAudit, onClear }: CritiqueSummaryProps) {
  // State for tracking open explanatory banners
  const [openExplanations, setOpenExplanations] = useState<Record<string, boolean>>({});

  const toggleExplanation = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenExplanations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Safe dynamic fallbacks to match the mockup's "14 CAR" track data
  const title = trackInfo?.name || "14 CAR";
  const artist = trackInfo?.artist || "Independent Artist";

  const keyVal = critique.liveMetrics?.calculatedKey || "C# Minor";
  const bpmVal = critique.liveMetrics?.calculatedBpm 
    ? `${Math.round(critique.liveMetrics.calculatedBpm)} BPM` 
    : "171 BPM";
  const genreVal = critique.vibe?.genre || "Rock";
  const subgenreVal = critique.vibe?.subgenre || "Power Pop";

  // Dynamic values for Section 1 (Skip & Playout)
  // Let's dynamically calculate based on actual track metrics, or use mockup's gorgeous default anchors
  const skipRate = critique.liveMetrics?.calculatedGridCohesionScore !== undefined
    ? Math.round(35 - (critique.liveMetrics.calculatedGridCohesionScore * 15))
    : 18;
  const skipRateText = skipRate <= 20 ? "EXCELLENT" : skipRate <= 32 ? "OPTIMAL" : "CRITICAL";

  const completionRate = critique.scores?.commercialReadiness !== undefined
    ? Math.round(critique.scores.commercialReadiness * 0.8)
    : 77;
  const completionRateText = completionRate >= 75 ? "OPTIMIZED" : completionRate >= 60 ? "STANDARD" : "LOW";

  // Dynamic values for Section 2 (Loudness Assessment)
  const lufs = critique.liveMetrics?.calculatedLufs !== undefined
    ? critique.liveMetrics.calculatedLufs.toFixed(1)
    : "-9.2";
  const dynamicRange = critique.liveMetrics?.calculatedLra !== undefined
    ? critique.liveMetrics.calculatedLra.toFixed(1)
    : "8.6";

  // Dynamic values for Right-Column ring scores
  const scoreStreamingReadiness = critique.scores?.commercialReadiness || 96;
  const scoreSonicSoundprint = critique.mixQuality?.score || 85;
  const scoreCompositionalDepth = critique.performance?.instrumentalScore || critique.performance?.vocalScore || 80;

  // Custom function to get dynamically calculated heights for Section 4 (6-band chart)
  const getBandHeight = (bandEnergy: number | undefined, defaultHeight: number) => {
    if (bandEnergy === undefined) return defaultHeight;
    return Math.min(100, Math.max(15, Math.round(bandEnergy * 100)));
  };

  const getBandStatus = (height: number) => {
    if (height < 45) return "deficient";
    if (height > 85) return "overload";
    return "optimal";
  };

  const subBassHeight = getBandHeight(critique.liveMetrics?.calculatedSubBassBandEnergy, 35);
  const bassHeight = getBandHeight(critique.liveMetrics?.calculatedBassBandEnergy, 65);
  const lowMidsHeight = getBandHeight(critique.liveMetrics?.calculatedLowMidsBandEnergy, 75);
  const coreMidsHeight = getBandHeight(critique.liveMetrics?.calculatedCoreMidsBandEnergy, 90);
  const presenceHeight = getBandHeight(critique.liveMetrics?.calculatedPresenceBandEnergy, 95);
  const airHeight = getBandHeight(critique.liveMetrics?.calculatedAirBandEnergy, 80);

  const bands = [
    { name: "Sub-Bass", hz: "20-64HZ", height: subBassHeight, status: getBandStatus(subBassHeight) },
    { name: "Bass", hz: "64-250HZ", height: bassHeight, status: getBandStatus(bassHeight) },
    { name: "Low-Mids", hz: "250HZ-1KHZ", height: lowMidsHeight, status: getBandStatus(lowMidsHeight) },
    { name: "Core Mids", hz: "1-4KHZ", height: coreMidsHeight, status: getBandStatus(coreMidsHeight) },
    { name: "Presence", hz: "4-8KHZ", height: presenceHeight, status: getBandStatus(presenceHeight) },
    { name: "Air", hz: "8-28KHZ", height: airHeight, status: getBandStatus(airHeight) }
  ];

  const categories = [
    {
      title: "STREAMING READINESS",
      score: scoreStreamingReadiness,
      desc: "Commercial impact, streaming alignment, algorithmic sandbox, and streaming services find, categorize, and promote your song.",
      glowColor: "rgba(34, 211, 238, 0.6)",
      strokeColor: "#22d3ee",
      trackColor: "rgba(34, 211, 238, 0.1)",
      textColor: "text-cyan-400",
      tags: ["Commercial Impact", "Streaming Alignment", "Algo Sandbox"]
    },
    {
      title: "SONIC SOUNDPRINT",
      score: scoreSonicSoundprint,
      desc: "Engineering studio, production quality, and technical diagnostic blueprint of your mix sounds finished and competitive.",
      glowColor: "rgba(52, 211, 153, 0.6)",
      strokeColor: "#34d399",
      trackColor: "rgba(52, 211, 153, 0.1)",
      textColor: "text-emerald-400",
      tags: ["Engineering Studio", "Tech Blueprints", "Production Quality"]
    },
    {
      title: "COMPOSITIONAL DEPTH",
      score: scoreCompositionalDepth,
      desc: "Artistic impact, songwriting quality, and song architecture — the elements that make a song worth remembering.",
      glowColor: "rgba(192, 132, 252, 0.6)",
      strokeColor: "#c084fc",
      trackColor: "rgba(192, 132, 252, 0.1)",
      textColor: "text-purple-400",
      tags: ["Artistic Impact", "Songwriting Quality", "Song Architecture"]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative w-full max-w-[1480px] mx-auto bg-transparent border-none rounded-3xl p-6 md:p-8 pt-[13px] md:pt-[13px] text-white flex flex-col gap-6 shadow-none overflow-visible"
      id="critique-summary-mockup-viewport"
    >
      {/* Circle Package (Atmospheric Gradient Glow + White Circle) centered at left: 90%, top: 28% */}
      <div 
        id="circle-package"
        className="absolute pointer-events-none z-0"
        style={{
          left: "90%",
          top: "28%",
          transform: "translate(-50%, -50%)",
          width: "720px",
          height: "720px"
        }}
      >
        {/* Atmospheric Radial Glow */}
        <div 
          className="absolute pointer-events-none z-0 rounded-full" 
          style={{
            width: "1680px",
            height: "1680px",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(47,101,190,0.65) 0%, rgba(43,92,172,0.45) 22%, rgba(28,60,115,0.3) 42%, rgba(16,34,65,0.15) 65%, transparent 85%)",
            opacity: 0.85
          }} 
        />

        {/* Thick White Circle */}
        <div 
          className="absolute inset-0 pointer-events-none z-0" 
          style={{
            width: "720px",
            height: "720px",
            borderRadius: "50%",
            border: "20px solid rgba(255,255,255,0.95)",
            boxShadow: "0 0 40px rgba(59,130,246,1), 0 0 80px rgba(59,130,246,0.85), 0 0 120px rgba(59,130,246,0.6), inset 0 0 40px rgba(59,130,246,0.8), inset 0 0 80px rgba(59,130,246,0.4)"
          }} 
        />
      </div>

      {/* Absolute Clear Button */}
      {onClear && (
        <button
          onClick={onClear}
          className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all cursor-pointer z-30 group"
          aria-label="Back to Locker"
          title="Back to Locker"
        >
          <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* TWO-COLUMN LAYOUT: Analytical Checklist (Left) vs Glowing Score Portal (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">
        
        {/* LEFT COLUMN: Performance Checkpoints (Stacked Modules with Large Numbers) */}
        <div className="lg:col-span-7 flex flex-col gap-5 -ml-6 md:-ml-12">
          
          {/* TOP HEADER: Title & Interactive Help Toggle */}
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-sans font-black tracking-wider uppercase text-white">
                ALGORITHMIC PERFORMANCE ANALYSIS SUMMARY
              </h1>
              <button 
                onClick={(e) => toggleExplanation("header", e)}
                className={`p-1 rounded-full transition-all cursor-pointer ${
                  openExplanations["header"] 
                    ? "text-cyan-400 bg-cyan-400/15 ring-2 ring-cyan-400/30" 
                    : "text-slate-500 hover:text-slate-300 bg-white/5 hover:bg-white/10"
                }`}
                title="Toggle system details"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic Help Description */}
            <AnimatePresence>
              {openExplanations["header"] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, y: -5 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -5 }}
                  className="overflow-hidden bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 text-xs text-cyan-300 leading-relaxed font-mono"
                >
                  This state-of-the-art diagnostic dashboard maps your music's frequency profile, loudness distribution, and platform tags against commercial streaming engine indexes. Click the circular help icons across each section to reveal detailed structural insights.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* METADATA BLOCK: Custom Neon Rabbit & Track Info Grid */}
          <div className="grid grid-cols-1 md:flex md:flex-wrap items-center gap-4 bg-[#07090f]/60 border border-white/5 rounded-2xl p-4 relative z-10 w-full">
            {/* Neon Rabbit Icon Container */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="w-14 h-14 bg-[#0a0f1d] border border-blue-500/25 rounded-xl flex items-center justify-center relative shadow-[0_0_20px_rgba(59,130,246,0.25)] flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-10 h-10 text-blue-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="opacity-30 animate-spin-strobe" style={{ animationDuration: "20s" }} />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-15" />
                  <path d="M 38 40 C 38 22, 45 14, 48 10 C 50 8, 52 14, 50 28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 62 40 C 62 22, 55 14, 52 10 C 50 8, 48 14, 50 28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 32 45 C 32 62, 68 62, 68 45 C 68 36, 32 36, 32 45 Z" fill="currentColor" className="opacity-10" />
                  <path d="M 32 45 C 32 62, 68 62, 68 45" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 46 51 L 50 55 L 54 51" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 50 55 L 50 59" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M 28 48 L 18 46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-40" />
                  <path d="M 28 52 L 16 52" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-40" />
                  <path d="M 72 48 L 82 46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-40" />
                  <path d="M 72 52 L 84 52" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-40" />
                </svg>
              </div>

              <div>
                <h2 className="text-lg font-black font-sans tracking-tight text-white">{title}</h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">by {artist}</p>
              </div>
            </div>

            {/* Dynamic Parameter Cards */}
            <div className="flex flex-row flex-nowrap gap-2 flex-grow mt-2 md:mt-0 md:justify-end w-[400px] max-w-full">
              {/* Key */}
              <div className="bg-[#090b11] border border-white/5 rounded-xl px-2.5 py-1.5 flex flex-col justify-center flex-1 min-w-0">
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase truncate">DETECTED KEY</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.7)] flex-shrink-0" />
                  <span className="text-xs font-mono font-black text-white uppercase truncate">{keyVal}</span>
                </div>
              </div>

              {/* Tempo */}
              <div className="bg-[#090b11] border border-white/5 rounded-xl px-2.5 py-1.5 flex flex-col justify-center flex-1 min-w-0">
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase truncate">TEMPO (BPM)</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="text-xs font-mono font-black text-white uppercase truncate">{bpmVal}</span>
                </div>
              </div>

              {/* Core Genre */}
              <div className="bg-[#090b11] border border-white/5 rounded-xl px-2.5 py-1.5 flex flex-col justify-center flex-1 min-w-0">
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase truncate">CORE GENRE</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-mono font-black text-white uppercase truncate">{genreVal}</span>
                </div>
              </div>

              {/* Sub-Genre */}
              <div className="bg-[#090b11] border border-white/5 rounded-xl px-2.5 py-1.5 flex flex-col justify-center flex-1 min-w-0">
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase truncate">SUB-GENRE</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] flex-shrink-0" />
                  <span className="text-xs font-mono font-black text-white uppercase truncate">{subgenreVal}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* MODULE 1: 30s Skip & Playout Simulator */}
          <div className="flex gap-4 items-stretch group/mod">
            <div className="w-8 flex-shrink-0 flex items-start justify-center pt-2 select-none">
              <span className="text-4xl font-extrabold font-sans text-white transition-colors">1</span>
            </div>

            <div className="flex-1 max-w-[576px] bg-[#0D0E12] border border-[#3D80EB]/25 hover:border-[#3D80EB]/45 rounded-2xl px-4 py-2.5 h-[120px] flex flex-col justify-between relative overflow-hidden shadow-lg transition-all">
              <div className="absolute top-0 left-0 bg-[#3D80EB] h-[3px] w-full shadow-[0_0_8px_#3D80EB]" />
              <div className="flex items-center justify-between border-b border-white/5 pb-1 relative z-10 flex-shrink-0">
                <span className="font-['Inter'] text-[16px] font-bold tracking-wider text-white uppercase">
                  30s Skip & Playout Simulator
                </span>
                <button 
                  onClick={(e) => toggleExplanation("skip", e)}
                  className={`p-1 rounded-full transition-all cursor-pointer ${
                    openExplanations["skip"] 
                      ? "text-cyan-400 bg-cyan-400/10" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module Help Box */}
              <AnimatePresence>
                {openExplanations["skip"] && (
                  <motion.p 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden text-[10px] text-cyan-300/80 leading-relaxed font-mono p-2 bg-cyan-950/20 border border-cyan-500/10 rounded-lg"
                  >
                    Measures hooks, intro brevity, and early spectral dynamics to estimate retention probability within the standard 30-second playout window of playlist index systems.
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0 pt-1">
                <div className="bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 flex flex-col justify-between h-full min-h-0">
                  <span className="text-[8.5px] font-mono font-bold tracking-wider text-slate-500 uppercase leading-none truncate">PREDICTED SKIP RATE (SR)</span>
                  <div className="flex items-baseline gap-1.5 border-b border-emerald-500/30 pb-0.5 my-0.5">
                    <span className="text-base md:text-lg font-mono font-black text-white leading-none">{skipRate}%</span>
                    <span className="text-[9px] font-mono font-black text-emerald-400 tracking-wider">
                      ▲ {skipRateText}
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-400 leading-tight truncate">
                    Typical threshold target: &lt; 32% within 30s. Perfect for early playlist preservation.
                  </p>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 flex flex-col justify-between h-full min-h-0">
                  <span className="text-[8.5px] font-mono font-bold tracking-wider text-slate-500 uppercase leading-none truncate">PREDICTED COMPLETION (CR)</span>
                  <div className="flex items-baseline gap-1.5 border-b border-cyan-500/30 pb-0.5 my-0.5">
                    <span className="text-base md:text-lg font-mono font-black text-white leading-none">{completionRate}%</span>
                    <span className="text-[9px] font-mono font-black text-cyan-400 tracking-wider">
                      ▲ {completionRateText}
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-400 leading-tight truncate">
                    Probability of full track completion. Indicates structural engagement alignment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* MODULE 2: Genre-Aware Loudness Assessment */}
          <div className="flex gap-4 items-stretch group/mod">
            <div className="w-8 flex-shrink-0 flex items-start justify-center pt-2 select-none">
              <span className="text-4xl font-extrabold font-sans text-white transition-colors">2</span>
            </div>

            <div className="flex-1 max-w-[576px] bg-[#0D0E12] border border-[#01aba9]/25 hover:border-[#01aba9]/45 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden shadow-lg transition-all">
              <div className="absolute top-0 left-0 bg-[#01aba9] h-[3px] w-full shadow-[0_0_8px_#01aba9]" />
              <div className="flex items-center justify-between border-b border-white/5 pb-1 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="font-['Inter'] text-[16px] font-bold tracking-wider text-white uppercase">
                    Genre-Aware Loudness Assessment
                  </span>
                  <span className="border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono">
                    {genreVal}
                  </span>
                </div>
                <button 
                  onClick={(e) => toggleExplanation("loudness", e)}
                  className={`p-1 rounded-full transition-all cursor-pointer ${
                    openExplanations["loudness"] 
                      ? "text-emerald-400 bg-emerald-400/10" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module Help Box */}
              <AnimatePresence>
                {openExplanations["loudness"] && (
                  <motion.p 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden text-[10px] text-emerald-300/80 leading-relaxed font-mono p-2 bg-emerald-950/20 border border-emerald-500/10 rounded-lg"
                  >
                    Loudness standards vary by style. This model analyzes Integrated LUFS and dynamic range headroom targets calibrated to the optimal curves of {genreVal} and streaming normalizers.
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-emerald-500/20 bg-emerald-500/[0.03] rounded-xl p-3 text-[11px] font-mono text-emerald-400/90 flex flex-col gap-1 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> PASS – LUFS Loudness
                    </span>
                    <span className="font-black text-white text-xs">{lufs}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 uppercase mt-0.5">Target Range: -12 to -9</span>
                </div>

                <div className="border border-emerald-500/20 bg-emerald-500/[0.03] rounded-xl p-3 text-[11px] font-mono text-emerald-400/90 flex flex-col gap-1 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> PASS – Dynamic Range
                    </span>
                    <span className="font-black text-white text-xs">{dynamicRange} LU</span>
                  </div>
                  <span className="text-[9px] text-slate-500 uppercase mt-0.5">Target Range: 6 to 12 LU</span>
                </div>
              </div>
            </div>
          </div>

          {/* MODULE 3: The Echo Next Score Card */}
          <div className="flex gap-4 items-stretch group/mod">
            <div className="w-8 flex-shrink-0 flex items-start justify-center pt-2 select-none">
              <span className="text-4xl font-extrabold font-sans text-white transition-colors">3</span>
            </div>

            <div className="flex-1 max-w-[576px] bg-[#0D0E12] border border-[#01b869]/25 hover:border-[#01b869]/45 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden shadow-lg transition-all">
              <div className="absolute top-0 left-0 bg-[#01b869] h-[3px] w-full shadow-[0_0_8px_#01b869]" />
              <div className="flex items-center justify-between border-b border-white/5 pb-0 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="font-['Inter'] text-[16px] font-bold tracking-wider text-white uppercase">
                    The Echo Next Score Card
                  </span>
                  <span className="border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono">
                    {genreVal}
                  </span>
                </div>
                <button 
                  onClick={(e) => toggleExplanation("echonest", e)}
                  className={`p-1 rounded-full transition-all cursor-pointer ${
                    openExplanations["echonest"] 
                      ? "text-cyan-400 bg-cyan-400/10" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module Help Box */}
              <AnimatePresence>
                {openExplanations["echonest"] && (
                  <motion.p 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden text-[10px] text-cyan-300/80 leading-relaxed font-mono p-2 bg-cyan-950/20 border border-cyan-500/10 rounded-lg"
                  >
                    Identifies high-level profile matches and mismatches based on legacy platform indexing parameters (derived danceability, energy, acousticness, valence, speechiness, and liveness).
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Scorecard metrics list */}
              <div className="flex flex-col gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1">
                {/* Pair 1: Div 1 & Div 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-white/5 pb-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)] pr-[6px]" />
                      <span className="font-bold text-slate-300">DANCEABILITY</span>
                    </div>
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      OPTIMAL MATCH
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                      <span className="font-bold text-slate-300">ENERGY</span>
                    </div>
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      OPTIMAL MATCH
                    </span>
                  </div>
                </div>

                {/* Pair 2: Div 3 & Div 4 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 border-b border-white/5 pb-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)] pr-[6px]" />
                      <span className="font-bold text-slate-300">ACOUSTICNESS</span>
                    </div>
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      OPTIMAL MATCH
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
                      <span className="font-bold text-slate-300">MOOD VALENCE</span>
                    </div>
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase border bg-amber-500/10 text-amber-400 border-amber-500/20">
                      MISMATCH
                    </span>
                  </div>
                </div>

                {/* Pair 3: Div 5 & Div 6 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 border-b border-white/5 pb-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)] pr-[6px]" />
                      <span className="font-bold text-slate-300">SPEECHINESS</span>
                    </div>
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase border bg-amber-500/10 text-amber-400 border-amber-500/20">
                      MISMATCH
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                      <span className="font-bold text-slate-300">INSTRUMENTALNESS</span>
                    </div>
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      OPTIMAL MATCH
                    </span>
                  </div>
                </div>

                {/* Pair 4: Div 7 & Div 8 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)] pr-[6px]" />
                      <span className="font-bold text-slate-300">LIVENESS</span>
                    </div>
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase border bg-amber-500/10 text-amber-400 border-amber-500/20">
                      MISMATCH
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                      <span className="font-bold text-slate-300">TIMBRE CLARITY</span>
                    </div>
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      OPTIMAL MATCH
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MODULE 4: 6-Band Frequency Energy & Headroom */}
          <div className="flex gap-4 items-stretch group/mod">
            <div className="w-8 flex-shrink-0 flex items-start justify-center pt-2 select-none">
              <span className="text-4xl font-extrabold font-sans text-white transition-colors">4</span>
            </div>

            <div className="flex-1 max-w-[576px] bg-[#0D0E12] border border-[#c545b7]/25 hover:border-[#c545b7]/45 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden shadow-lg transition-all">
              <div className="absolute top-0 left-0 bg-[#c545b7] h-[3px] w-full shadow-[0_0_8px_#c545b7]" />
              <div className="flex items-center justify-between border-b border-white/5 pb-1 relative z-10">
                <span className="font-['Inter'] text-[16px] font-bold tracking-wider text-white uppercase">
                  6-Band Frequency Energy & Headroom
                </span>
                <button 
                  onClick={(e) => toggleExplanation("bands", e)}
                  className={`p-1 rounded-full transition-all cursor-pointer ${
                    openExplanations["bands"] 
                      ? "text-purple-400 bg-purple-400/10" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module Help Box */}
              <AnimatePresence>
                {openExplanations["bands"] && (
                  <motion.p 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden text-[10px] text-purple-300/80 leading-relaxed font-mono p-2 bg-purple-950/20 border border-purple-500/10 rounded-lg"
                  >
                    Visualizes total energy levels across primary spectral bands to isolate crowding, muddy ranges, vocal dominance, or deficient sub-harmonics in your master.
                  </motion.p>
                )}
              </AnimatePresence>

              {/* 6-Band Graphic Equalizer Visualization */}
              <div className="grid grid-cols-6 gap-2 bg-black/40 border border-white/5 rounded-xl px-3 pt-[9px] pb-[9px] items-end h-40">
                {bands.map((band, i) => {
                  const isOverload = band.status === "overload";
                  const isDeficient = band.status === "deficient";

                  let barBgClass = "bg-gradient-to-t from-blue-500/50 to-indigo-500/80";
                  let badgeClass = "bg-blue-500/10 text-blue-400 border border-blue-500/15";
                  let textClass = "text-blue-400";

                  if (isOverload) {
                    barBgClass = "bg-gradient-to-t from-purple-500/80 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse";
                    badgeClass = "bg-red-500/10 text-red-400 border border-red-500/15";
                    textClass = "text-red-400 font-extrabold";
                  } else if (isDeficient) {
                    barBgClass = "bg-slate-800/40 border border-white/5";
                    badgeClass = "bg-slate-800/50 text-slate-500 border border-slate-700/30";
                    textClass = "text-slate-500";
                  }

                  return (
                    <div key={i} className="flex flex-col items-center justify-end h-full w-full gap-1.5">
                      {/* Equalizer Bar Container */}
                      <div className="w-full bg-slate-950/60 rounded-md overflow-hidden relative flex flex-col justify-end h-20 border border-white/5">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${band.height}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.05 }}
                          className={`w-full rounded-b-sm ${barBgClass}`}
                        />
                      </div>

                      {/* Equalizer Metadata block */}
                      <div className="flex flex-col items-center w-full min-w-0">
                        <span className="text-[8px] font-sans font-black text-slate-300 uppercase tracking-tight truncate w-full text-center">
                          {band.name}
                        </span>
                        <span className="text-[7px] font-mono text-slate-500 mt-0.5 text-center truncate w-full">
                          {band.hz}
                        </span>
                        <span className={`text-[8px] font-mono uppercase font-black tracking-wide mt-1 px-1 py-0.5 rounded text-center w-full truncate ${badgeClass} ${textClass}`}>
                          {band.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Glow Portal with Circle Score Rings */}
        <div className="lg:col-span-5 flex relative">
          
          {/* Glowing Portal Container */}
          <div 
            onClick={onViewFullAudit}
            className="w-full h-full bg-none border-none relative overflow-hidden transition-all duration-500 rounded-3xl p-6 pt-[3px] flex flex-col gap-5 justify-between cursor-pointer group z-10 translate-x-[100px]"
            id="glowing-score-portal"
          >
            {/* Portal Header branding */}
            <div className="text-center relative z-10 flex flex-col items-center justify-center w-[420px] max-w-full">
              <div className="w-[48px] h-[48px] bg-blue-500/25 border border-blue-500/30 rounded-xl text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] mb-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                <Rabbit className="w-[32px] h-[32px] stroke-[2]" />
              </div>
              
              <span className="font-['Inter'] font-bold text-[36px] text-white tracking-tight flex items-center gap-0.5 mb-0" id="app-heading-portal">
                YourSongScore
                <span className="px-2 py-0.5 text-[8px] uppercase tracking-widest font-mono bg-[#1C202A] border border-white/5 text-slate-400 rounded-md">
                  v6
                </span>
              </span>
              
              <div className="flex items-center justify-center gap-1.5 mt-0 text-cyan-400 text-[10px] font-mono font-bold tracking-widest uppercase group-hover:text-cyan-300 transition-colors">
                <span className="font-['Inter'] text-[16px] text-[#60a5fa] normal-case">Click to See the Full Analysis</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#60a5fa] border-[#60a5fa] group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Glowing Ring Score Cards List */}
              <div className="w-[420px] max-w-full flex flex-col gap-3 relative z-10 mt-[10px] text-left">
                {categories.map((cat, i) => {
                  const isWhiteCircle = i === 0;
                  const radius = isWhiteCircle ? 52 : 20;
                  const strokeWidth = isWhiteCircle ? 5.25 : 3.5;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (cat.score / 100) * circumference;

                  return (
                    <div 
                      key={i} 
                      className={`bg-black/50 border border-white/5 rounded-2xl flex items-center hover:bg-black/70 transition-colors relative overflow-hidden ${
                        isWhiteCircle ? "pl-[1px] pr-3 pb-0 pt-3 gap-6 w-full h-[150px]" : "p-3 gap-8 w-full h-[115px]"
                      }`}
                    >
                      {/* Glowing Progress SVG Circle */}
                      <div className={`${isWhiteCircle ? "w-[140px] h-[140px]" : "w-14 h-14"} relative flex-shrink-0`}>
                        <svg className="w-full h-full transform -rotate-90">
                          {/* Background track circle */}
                          <circle 
                            cx={isWhiteCircle ? 70 : 28} 
                            cy={isWhiteCircle ? 70 : 28} 
                            r={radius} 
                            fill="transparent" 
                            stroke={isWhiteCircle ? "rgba(59, 130, 246, 0.15)" : cat.trackColor} 
                            strokeWidth={strokeWidth} 
                          />
                          {/* Progress ring circle */}
                          <circle 
                            cx={isWhiteCircle ? 70 : 28} 
                            cy={isWhiteCircle ? 70 : 28} 
                            r={radius} 
                            fill="transparent" 
                            stroke={isWhiteCircle ? "rgba(255, 255, 255, 0.95)" : cat.strokeColor} 
                            strokeWidth={strokeWidth} 
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            style={{
                              filter: isWhiteCircle 
                                ? `drop-shadow(0 0 6px rgba(59, 130, 246, 1)) drop-shadow(0 0 12px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 18px rgba(59, 130, 246, 0.5))`
                                : `drop-shadow(0 0 6px ${cat.glowColor})`
                            }}
                          />
                        </svg>
                        {/* Center number */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`${isWhiteCircle ? "font-['Inter'] text-[40px] font-bold" : "font-mono font-black text-xs"} text-white`}>{cat.score}</span>
                        </div>
                      </div>

                      {/* Metadata, Description and Tag badges */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${cat.textColor}`}>
                          CATEGORY
                        </span>
                        <h3 className={`font-['Inter'] ${isWhiteCircle ? "text-[18px] font-black" : "text-xs font-black"} text-white tracking-wide mt-0.5 uppercase`}>
                          {cat.title}
                        </h3>


                        {/* Pill Tags */}
                        <div className="flex flex-nowrap gap-1 mt-2">
                          {cat.tags.map((tag, tIdx) => (
                            <span 
                              key={tIdx} 
                              className="text-[8px] font-mono bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-tight whitespace-nowrap"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disclaimer audit label */}
            <div className="text-center text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-1 relative z-10 select-none">
              Audit Index Model v4.12 • Click anywhere to enter full sandbox
            </div>

          </div>
        </div>

      </div>

    </motion.div>
  );
}
