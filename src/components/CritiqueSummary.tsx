import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Lightbulb, ArrowRight, X, TrendingUp, CheckCircle2, Activity, Flame, Rabbit, XCircle, Info, Music
} from "lucide-react";
import { getGenreLoudnessBucket, getEchoNestTier, computeEchoNestScorecard, computeCategoryScores } from "./CritiqueDisplay";
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
  const [animatedScores, setAnimatedScores] = useState<number[]>([0, 0, 0, 0]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const animationRefs = useRef<(number | null)[]>([null, null, null, null]);

  useEffect(() => {
    setImageError(false);
  }, [trackInfo?.coverArt]);

  const toggleExplanation = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenExplanations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Safe dynamic fallbacks to match the mockup's "14 CAR" track data
  const title = trackInfo?.name || "14 CAR";
  const artist = trackInfo?.artist || "Independent Artist";

  const genreVal = critique.vibe?.genre || "Rock";
  const subgenreVal = critique.vibe?.subgenre || "Power Pop";

  // Dynamic values for Section 1 (Skip & Playout) - real formula matching CritiqueDisplay.tsx exactly
  const overallProductionVal = critique?.scores?.overallProduction ?? 75;
  const commercialReadinessVal = critique?.scores?.commercialReadiness ?? 75;

  let liveSkipModifier = 0;
  if (critique?.liveMetrics) {
    const { calculatedLufs, calculatedStereoCorrelation } = critique.liveMetrics;
    if (calculatedLufs !== undefined && calculatedLufs < -12.5) {
      liveSkipModifier += Math.round(Math.abs(calculatedLufs + 12.5) * 1.8);
    }
    if (calculatedStereoCorrelation !== undefined) {
      // High-correlation penalty removed and BPM check disabled - see CritiqueDisplay.tsx
      // for full explanation (no evidence found tying either to real skip risk).
      if (calculatedStereoCorrelation < -0.15) {
        liveSkipModifier += 14;
      }
    }
  }

  const baseSkipProb = Math.min(85, Math.max(0, 91 - Math.round((commercialReadinessVal * 0.70) + (overallProductionVal * 0.20)) + liveSkipModifier));
  const skipRate = baseSkipProb;
  const skipRateText = skipRate <= 20 ? "EXCELLENT" : skipRate <= 32 ? "OPTIMAL" : "CRITICAL";

  const completionRate = Math.min(100, Math.max(15, 100 - baseSkipProb));
  const completionRateText = completionRate >= 75 ? "OPTIMIZED" : completionRate >= 60 ? "STANDARD" : "LOW";

  // Dynamic values for Section 2 (Loudness Assessment)
  const lufsRaw = critique.liveMetrics?.calculatedLufs;
  const lraRaw = critique.liveMetrics?.calculatedLra;
  const lufs = lufsRaw !== undefined ? lufsRaw.toFixed(1) : "--";
  const dynamicRange = lraRaw !== undefined ? lraRaw.toFixed(1) : "--";

  const loudnessBucket = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
  const lufsPass = lufsRaw !== undefined && lufsRaw >= loudnessBucket.lufsMin && lufsRaw <= loudnessBucket.lufsMax;
  const lraPass = lraRaw !== undefined && lraRaw >= loudnessBucket.lraMin && (loudnessBucket.lraMax === null || lraRaw <= loudnessBucket.lraMax);
  const lraTargetText = `${loudnessBucket.lraMin}${loudnessBucket.lraMax !== null ? `-${loudnessBucket.lraMax}` : "+"} LU`;
  const lufsArrow = (lufsRaw !== undefined && lufsRaw < loudnessBucket.lufsMin) ? "▼" : "▲";
  const lraArrow = (lraRaw !== undefined && lraRaw < loudnessBucket.lraMin) ? "▼" : "▲";

  const echoNestData = computeEchoNestScorecard(critique);
  const timbralScore = critique.liveMetrics?.calculatedTimbralConsistencyScore;
  const timbralMatch = timbralScore !== undefined ? (timbralScore >= 70 ? 100 : Math.max(0, timbralScore)) : null;
  const echoNestDisplayItems = [
    ...echoNestData,
    ...(timbralScore !== undefined ? [{ label: "Timbre Clarity", value: Math.round(timbralScore), min: 70, max: 100, matchPercent: timbralMatch }] : [])
  ];

  // Dynamic values for Right-Column ring scores
  const categoryScores = computeCategoryScores(critique);
  const scoreStreamingReadiness = categoryScores.streamingReadiness;
  const scoreSonicSoundprint = categoryScores.sonicSoundprint;
  const scoreCompositionalDepth = categoryScores.compositionalDepth;

  // Custom function to get dynamically calculated heights for Section 4 (6-band chart)
  const getBandHeight = (bandEnergy: number | undefined, defaultHeight: number) => {
    if (bandEnergy === undefined) return defaultHeight;
    return Math.min(100, Math.max(15, Math.round(bandEnergy)));
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
      tags: ["Completion Rate", "Algorithmic Alignment", "Commercial Impact"]
    },
    {
      title: "SONIC SOUNDPRINT",
      score: scoreSonicSoundprint,
      desc: "Engineering studio, production quality, and technical diagnostic blueprint of your mix sounds finished and competitive.",
      glowColor: "rgba(52, 211, 153, 0.6)",
      strokeColor: "#34d399",
      trackColor: "rgba(52, 211, 153, 0.1)",
      textColor: "text-emerald-400",
      tags: ["Mix Quality", "Loudness Compliance", "Vocal Performance"]
    },
    {
      title: "STRUCTURAL ENGAGEMENT",
      score: scoreCompositionalDepth,
      desc: "Pacing, dynamic build, and energy trajectory — the retention dynamics that keep listeners and algorithms engaged.",
      glowColor: "rgba(192, 132, 252, 0.6)",
      strokeColor: "#c084fc",
      trackColor: "rgba(192, 132, 252, 0.1)",
      textColor: "text-purple-400",
      tags: ["Arrangement Flow", "Dynamic Modulation", "Climax Trajectory"]
    },
    {
      title: "COMPOSITIONAL DEPTH",
      score: critique?.musicTheory?.score ?? 75,
      desc: "Harmonic craft, lyrical originality, and artistic sophistication — for your own growth as a songwriter, not for algorithmic favor.",
      glowColor: "rgba(245, 158, 11, 0.6)",
      strokeColor: "#f59e0b",
      trackColor: "rgba(245, 158, 11, 0.1)",
      textColor: "text-amber-400",
      tags: ["Music Theory", "Lyrical Impact", "Artistic Impact"],
      notScored: true
    }
  ];

  // Reset reveal state if a new critique is loaded
  useEffect(() => {
    setIsRevealed(false);
    setAnimatedScores([0, 0, 0, 0]);
  }, [critique]);

  useEffect(() => {
    if (!isRevealed) return;

    const duration = 2000;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    categories.forEach((cat, i) => {
      const startDelay = i * 750;
      const timeoutId = setTimeout(() => {
        const startTime = Date.now();
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(1, elapsed / duration);
          const ease = 1 - Math.pow(1 - t, 3);
          const currentValue = Math.round(ease * cat.score);
          setAnimatedScores(prev => {
            const next = [...prev];
            next[i] = currentValue;
            return next;
          });
          if (t < 1) {
            animationRefs.current[i] = requestAnimationFrame(tick);
          }
        };
        tick();
      }, startDelay);
      timeoutIds.push(timeoutId);
    });
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      animationRefs.current.forEach(id => {
        if (id) cancelAnimationFrame(id);
      });
    };
  }, [isRevealed]);

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
              <div className="text-xl md:text-2xl font-sans font-black tracking-wider uppercase text-white">
                ALGORITHMIC PERFORMANCE ANALYSIS SUMMARY
              </div>
              <div className="relative">
                <button 
                  onClick={(e) => toggleExplanation("header", e)}
                  onMouseEnter={() => setOpenExplanations(prev => ({ ...prev, ["header_temp"]: true }))}
                  onMouseLeave={() => setOpenExplanations(prev => ({ ...prev, ["header_temp"]: false }))}
                  className={`p-1 rounded-full transition-all cursor-pointer ${
                    openExplanations["header"] 
                      ? "text-[#93b7ee] bg-[#74a0f9]/15 ring-2 ring-[#74a0f9]/40 shadow-[0_0_10px_rgba(116,160,249,0.3)]" 
                      : "text-[#93b7ee] hover:text-[#b4d0ff] bg-white/5 hover:bg-white/10"
                  }`}
                  title="Toggle system details"
                >
                  <Lightbulb className="w-4 h-4 text-[#a8c8fb] drop-shadow-[0_0_4px_#60a5fa] drop-shadow-[0_0_10px_#60a5fa] drop-shadow-[0_0_18px_#60a5fa]" />
                </button>

                {/* Dynamic Help Description */}
                <AnimatePresence>
                  {(openExplanations["header"] || openExplanations["header_temp"]) && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, x: -5 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-full top-0 ml-2 z-50 w-64 text-[12px] font-['Inter'] text-white leading-relaxed p-3 bg-cyan-950/95 border border-cyan-500/20 rounded-lg shadow-2xl backdrop-blur-sm pointer-events-none"
                    >
                      A quick snapshot of how well your song is set up to succeed with streaming platforms and their recommendation systems.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          {/* METADATA BLOCK: Custom Neon Rabbit & Track Info Grid */}
          <div className="grid grid-cols-1 md:flex md:flex-wrap items-center gap-4 bg-[#07090f]/60 border border-white/5 rounded-2xl p-4 relative z-10 w-[740px] max-w-full" style={{ width: "740px", maxWidth: "100%" }}>
            {/* Neon Rabbit Icon Container */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="w-14 h-14 bg-[#0a0f1d] border border-blue-500/25 rounded-xl flex items-center justify-center relative shadow-[0_0_20px_rgba(59,130,246,0.25)] flex-shrink-0 overflow-hidden">
                {trackInfo?.coverArt && !imageError ? (
                  <img
                    src={trackInfo.coverArt}
                    alt={title}
                    className="w-full h-full object-cover rounded-xl"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <Rabbit className="w-7 h-7 text-blue-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]" />
                )}
              </div>

              <div>
                <span className="text-lg font-black font-sans tracking-tight text-white">{title}</span>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">by {artist}</p>
              </div>
            </div>

            {/* Dynamic Parameter Cards */}
            <div className="flex flex-row flex-nowrap gap-2 flex-grow mt-2 md:mt-0 md:justify-end w-[400px] max-w-full">
              {/* Estimated Key - restored using the validated essentia.js detector. Deliberately
                  shows no per-song confidence/strength figure (validated this session against
                  19 real songs: strength does not reliably separate correct from incorrect
                  results), and no manufactured "alternative key" (that would be derived from
                  music theory, not detected from audio - a mistake caught and corrected during
                  development). A single, honest, unvarying disclaimer covers the known
                  relative-key and modal-ambiguity limitation instead. */}
              {critique.liveMetrics?.calculatedKey && (
                <div className="bg-[#090b11] border border-white/5 rounded-xl px-2.5 py-1.5 flex flex-col justify-center flex-1 min-w-0 group relative">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase truncate flex items-center gap-1">
                    ESTIMATED KEY
                    <Info className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Music className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                    <span className="text-xs font-mono font-black text-white uppercase truncate">{critique.liveMetrics.calculatedKey}</span>
                  </div>
                  <div className="absolute top-full left-0 mt-1.5 w-[240px] p-2.5 rounded-lg bg-neutral-900 border border-white/10 text-[10px] text-slate-400 leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                    Major and relative minor keys share the same pitch collection, and some recordings contain modal or otherwise ambiguous tonal material. This estimate should be treated as an analysis result rather than an absolute determination.
                  </div>
                </div>
              )}

              {/* Key and Tempo cards removed - detection reliability issues confirmed via
                  real-audio testing (see project notes). Underlying detection code in
                  liveAudioAnalyzer.ts is untouched; re-enable here once resolved. */}

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
              <div className="flex items-center justify-between border-b border-white/5 pb-0 relative z-10 flex-shrink-0">
                <span className="font-['Inter'] text-[16px] font-bold tracking-wider text-white uppercase">
                  30s Skip & Completion Rate Simulator
                </span>
                <div className="relative">
                  <button 
                    onClick={(e) => toggleExplanation("skip", e)}
                    onMouseEnter={() => setOpenExplanations(prev => ({ ...prev, ["skip_temp"]: true }))}
                    onMouseLeave={() => setOpenExplanations(prev => ({ ...prev, ["skip_temp"]: false }))}
                    className={`p-1 rounded-full transition-all cursor-pointer ${
                      openExplanations["skip"] 
                        ? "text-cyan-400 bg-cyan-400/10" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-[#a8c8fb] drop-shadow-[0_0_4px_#60a5fa] drop-shadow-[0_0_9px_#60a5fa] drop-shadow-[0_0_16px_#60a5fa]" />
                  </button>

                  {/* Module Help Box */}
                  <AnimatePresence>
                    {(openExplanations["skip"] || openExplanations["skip_temp"]) && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, x: 5 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-full top-0 mr-2 z-50 w-64 text-[12px] font-['Inter'] text-white leading-relaxed p-3 bg-cyan-950/95 border border-cyan-500/20 rounded-lg shadow-2xl backdrop-blur-sm pointer-events-none"
                      >
                        Predicts how likely listeners are to skip your song early versus stick around and let it play through, since streaming platforms actively track this in the first 30 seconds.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-h-0">
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

            <div className="flex-1 max-w-[576px] bg-[#0D0E12] border border-[#1f9dc4]/25 hover:border-[#1f9dc4]/45 rounded-2xl p-4 flex flex-col gap-[6px] relative overflow-hidden shadow-lg transition-all">
              <div className="absolute top-0 left-0 bg-[#1f9dc4] h-[3px] w-full shadow-[0_0_8px_#1f9dc4]" />
              <div className="flex items-center justify-between border-b border-white/5 pb-0 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="font-['Inter'] text-[16px] font-bold tracking-wider text-white uppercase">
                    Genre-Aware Loudness Assessment
                  </span>
                  <span className="border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 px-2 py-0 rounded text-[9px] font-black uppercase font-mono">
                    {genreVal}
                  </span>
                </div>
                <div className="relative">
                  <button 
                    onClick={(e) => toggleExplanation("loudness", e)}
                    onMouseEnter={() => setOpenExplanations(prev => ({ ...prev, ["loudness_temp"]: true }))}
                    onMouseLeave={() => setOpenExplanations(prev => ({ ...prev, ["loudness_temp"]: false }))}
                    className={`p-1 rounded-full transition-all cursor-pointer ${
                      openExplanations["loudness"] 
                        ? "text-emerald-400 bg-emerald-400/10" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-[#a8c8fb] drop-shadow-[0_0_4px_#60a5fa] drop-shadow-[0_0_9px_#60a5fa] drop-shadow-[0_0_16px_#60a5fa]" />
                  </button>

                  {/* Module Help Box */}
                  <AnimatePresence>
                    {(openExplanations["loudness"] || openExplanations["loudness_temp"]) && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, x: 5 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-full top-0 mr-2 z-50 w-64 text-[12px] font-['Inter'] text-white leading-relaxed p-3 bg-emerald-950/95 border border-emerald-500/20 rounded-lg shadow-2xl backdrop-blur-sm pointer-events-none"
                      >
                        Checks whether your track's volume and dynamic range match what's expected for its genre, so it doesn't get turned down or sound weak next to similar songs.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className={`border rounded-xl p-3 text-[11px] font-mono flex flex-col gap-1 shadow-inner ${lufsPass ? "border-emerald-500/20 bg-emerald-500/[0.03] text-emerald-400/90" : "border-amber-500/20 bg-amber-500/[0.03] text-amber-400/90"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-black text-xs flex items-center gap-1 ${lufsPass ? "text-emerald-400" : "text-amber-400"}`}>
                      {lufsPass ? <CheckCircle2 className="w-4 h-4" /> : lufsArrow} {lufsPass ? "PASS" : "Outside"} – LUFS Loudness
                    </span>
                    <span className="font-black text-white text-xs">{lufs}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 uppercase mt-0.5">Target Range: {loudnessBucket.lufsMin} to {loudnessBucket.lufsMax}</span>
                </div>

                <div className={`border rounded-xl p-3 text-[11px] font-mono flex flex-col gap-1 shadow-inner ${lraPass ? "border-emerald-500/20 bg-emerald-500/[0.03] text-emerald-400/90" : "border-amber-500/20 bg-amber-500/[0.03] text-amber-400/90"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-black text-xs flex items-center gap-1 ${lraPass ? "text-emerald-400" : "text-amber-400"}`}>
                      {lraPass ? <CheckCircle2 className="w-4 h-4" /> : lraArrow} {lraPass ? "PASS" : "Outside"} – Dynamic Range
                    </span>
                    <span className="font-black text-white text-xs">{dynamicRange} LU</span>
                  </div>
                  <span className="text-[9px] text-slate-500 uppercase mt-0.5">Target Range: {lraTargetText}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MODULE 3: The Echo Next Score Card */}
          <div className="flex gap-4 items-stretch group/mod">
            <div className="w-8 flex-shrink-0 flex items-start justify-center pt-2 select-none">
              <span className="text-4xl font-extrabold font-sans text-white transition-colors">3</span>
            </div>

            <div className="flex-1 max-w-[576px] bg-[#0D0E12] border border-[#01aba9]/25 hover:border-[#01aba9]/45 rounded-2xl p-4 flex flex-col gap-[6px] relative overflow-hidden shadow-lg transition-all">
              <div className="absolute top-0 left-0 bg-[#01aba9] h-[3px] w-full shadow-[0_0_8px_#01aba9]" />
              <div className="flex items-center justify-between border-b border-white/5 pb-0 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="font-['Inter'] text-[16px] font-bold tracking-wider text-white uppercase">
                    The Echo Next Score Card
                  </span>
                  <span className="border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 px-2 py-0 rounded text-[9px] font-black uppercase font-mono">
                    {genreVal}
                  </span>
                </div>
                <div className="relative">
                  <button 
                    onClick={(e) => toggleExplanation("echonest", e)}
                    onMouseEnter={() => setOpenExplanations(prev => ({ ...prev, ["echonest_temp"]: true }))}
                    onMouseLeave={() => setOpenExplanations(prev => ({ ...prev, ["echonest_temp"]: false }))}
                    className={`p-1 rounded-full transition-all cursor-pointer ${
                      openExplanations["echonest"] 
                        ? "text-cyan-400 bg-cyan-400/10" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-[#a8c8fb] drop-shadow-[0_0_4px_#60a5fa] drop-shadow-[0_0_9px_#60a5fa] drop-shadow-[0_0_16px_#60a5fa]" />
                  </button>

                  {/* Module Help Box */}
                  <AnimatePresence>
                    {(openExplanations["echonest"] || openExplanations["echonest_temp"]) && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, x: 5 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-full top-0 mr-2 z-50 w-64 text-[12px] font-['Inter'] text-white leading-relaxed p-3 bg-cyan-950/95 border border-cyan-500/20 rounded-lg shadow-2xl backdrop-blur-sm pointer-events-none"
                      >
                        Compares your song's core traits (energy, mood, danceability, and more) against what similar successful songs in your genre typically look like.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Scorecard metrics list */}
              <div className="flex flex-col gap-[3px] bg-black/40 border border-white/5 rounded-xl px-3 pt-[3px] pb-1">
                {Array.from({ length: Math.ceil(echoNestDisplayItems.length / 2) }).map((_, rowIdx) => {
                  const itemA = echoNestDisplayItems[rowIdx * 2];
                  const itemB = echoNestDisplayItems[rowIdx * 2 + 1];
                  const isLastRow = rowIdx === Math.ceil(echoNestDisplayItems.length / 2) - 1;
                  const renderItem = (item: typeof itemA) => {
                    if (!item) return <div />;
                    const tier = getEchoNestTier(item);
                    return (
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${tier.dotClass}`} />
                          <span className="font-bold text-slate-300 uppercase">{item.label}</span>
                        </div>
                        <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase border ${tier.badgeClass}`}>
                          {tier.label}
                        </span>
                      </div>
                    );
                  };
                  return (
                    <div key={rowIdx} className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${!isLastRow ? "border-b border-white/5 pb-[3px]" : ""}`}>
                      {renderItem(itemA)}
                      {renderItem(itemB)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MODULE 4: 6-Band Frequency Energy & Headroom */}
          <div className="flex gap-4 items-stretch group/mod">
            <div className="w-8 flex-shrink-0 flex items-start justify-center pt-2 select-none">
              <span className="text-4xl font-extrabold font-sans text-white transition-colors">4</span>
            </div>

            <div className="flex-1 max-w-[576px] bg-[#0D0E12] border border-[#6e97ad]/25 hover:border-[#6e97ad]/45 rounded-2xl p-4 flex flex-col gap-[6px] relative overflow-hidden shadow-lg transition-all">
              <div className="absolute top-0 left-0 bg-[#6e97ad] h-[3px] w-full shadow-[0_0_8px_#6e97ad]" />
              <div className="flex items-center justify-between border-b border-white/5 pb-0 relative z-10">
                <span className="font-['Inter'] text-[16px] font-bold tracking-wider text-white uppercase">
                  6-Band Frequency Energy & Headroom
                </span>
                <div className="relative">
                  <button 
                    onClick={(e) => toggleExplanation("bands", e)}
                    onMouseEnter={() => setOpenExplanations(prev => ({ ...prev, ["bands_temp"]: true }))}
                    onMouseLeave={() => setOpenExplanations(prev => ({ ...prev, ["bands_temp"]: false }))}
                    className={`p-1 rounded-full transition-all cursor-pointer ${
                      openExplanations["bands"] 
                        ? "text-purple-400 bg-purple-400/10" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-[#a8c8fb] drop-shadow-[0_0_4px_#60a5fa] drop-shadow-[0_0_9px_#60a5fa] drop-shadow-[0_0_16px_#60a5fa]" />
                  </button>

                  {/* Module Help Box */}
                  <AnimatePresence>
                    {(openExplanations["bands"] || openExplanations["bands_temp"]) && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, x: 5 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-full top-0 mr-2 z-50 w-64 text-[12px] font-['Inter'] text-white leading-relaxed p-3 bg-purple-950/95 border border-purple-500/20 rounded-lg shadow-2xl backdrop-blur-sm pointer-events-none"
                      >
                        Shows how your song's sound is balanced across the full range of frequencies, from deep bass to bright highs, flagging any areas that are too weak or too overloaded.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 6-Band Graphic Equalizer Visualization */}
              <div className="grid grid-cols-6 gap-2 bg-black/40 border border-white/5 rounded-xl px-3 pt-[6px] pb-[12px] items-end h-40">
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
            onClick={() => {
              if (!isRevealed) {
                setIsRevealed(true);
              } else {
                onViewFullAudit();
              }
            }}
            className="w-full h-full bg-none border-none relative overflow-hidden transition-all duration-500 rounded-3xl p-6 pt-[3px] flex flex-col gap-5 justify-between cursor-pointer group z-10 translate-x-[100px]"
            id="glowing-score-portal"
          >
            {/* Portal Header branding */}
            <div className="text-center relative z-10 flex flex-col items-center justify-center w-full max-w-[435px]">
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
                <span className="font-['Inter'] text-[16px] text-[#60a5fa] uppercase">Click to See the Full Analysis</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#60a5fa] border-[#60a5fa] group-hover:translate-x-1 transition-transform drop-shadow-[0_0_6px_rgba(96,165,250,0.9)] drop-shadow-[0_0_10px_rgba(96,165,250,0.6)]" />
              </div>

              {/* Glowing Ring Score Cards List */}
              <div className="w-[440px] flex flex-col gap-3 relative z-10 mt-[10px] text-left">
                {/* "See your Results" Overlay sitting on top of the 4 categories and circles */}
                <AnimatePresence>
                  {!isRevealed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="absolute inset-0 z-30 rounded-2xl bg-black/80 backdrop-blur-md border border-cyan-500/20 flex flex-col items-center justify-center p-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.85)] cursor-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRevealed(true);
                      }}
                    >
                      <div className="flex flex-col items-center max-w-[320px] mx-auto gap-3.5">
                        <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-500/30 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.25)] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          Analysis Complete
                        </span>
                        
                        <div>
                          <h3 className="font-['Inter'] text-xl font-extrabold text-white tracking-tight">
                            Song Audit Ready
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 font-sans leading-relaxed">
                            Commercial viability and acoustic metrics are calculated.
                          </p>
                        </div>

                        <button
                          type="button"
                          id="see-your-results-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsRevealed(true);
                          }}
                          className="mt-1 group relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-['Inter'] font-bold text-base text-white tracking-wide bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400 shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:shadow-[0_0_40px_rgba(34,211,238,0.8)] border border-cyan-300/40 hover:border-cyan-200 transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                        >
                          <Sparkles className="w-5 h-5 text-cyan-200 group-hover:rotate-12 transition-transform duration-300" />
                          <span>See your Results</span>
                          <ArrowRight className="w-4 h-4 text-cyan-200 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {categories.map((cat, i) => {
                  const radius = 52;
                  const strokeWidth = 5.25;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = isRevealed 
                    ? circumference - (animatedScores[i] / 100) * circumference
                    : circumference;
                  
                  const itemColorConfigs = [
                    {
                      edgeColor: "#60a5fa",
                      trackColor: "rgba(96, 165, 250, 0.2)",
                      glowColor: "rgba(96, 165, 250, 0.9)",
                      textColor: "#60a5fa"
                    },
                    {
                      edgeColor: "#3adcc2",
                      trackColor: "rgba(58, 220, 194, 0.2)",
                      glowColor: "rgba(58, 220, 194, 0.9)",
                      textColor: "#3adcc2"
                    },
                    {
                      edgeColor: "#b14ae6",
                      trackColor: "rgba(177, 74, 230, 0.2)",
                      glowColor: "rgba(177, 74, 230, 0.9)",
                      textColor: "#b14ae6"
                    },
                    {
                      edgeColor: "#f59e0b",
                      trackColor: "rgba(245, 158, 11, 0.2)",
                      glowColor: "rgba(245, 158, 11, 0.9)",
                      textColor: "#f59e0b"
                    }
                  ];
                  const colorConfig = itemColorConfigs[i] || itemColorConfigs[3];

                  return (
                    <div 
                      key={i} 
                      className="bg-black/50 border border-white/5 rounded-2xl flex items-center hover:bg-black/70 transition-colors relative overflow-hidden pl-[1px] pr-3 pb-0 pt-[2.5px] gap-1.5 w-[440px] h-[115px]"
                    >
                      <div 
                        className="absolute top-0 left-0 w-[3px] h-full" 
                        style={{ backgroundColor: colorConfig.edgeColor, boxShadow: `0 0 8px ${colorConfig.edgeColor}` }}
                      />
                      {/* Glowing Progress SVG Circle */}
                      <div className="w-[140px] h-[140px] overflow-visible relative flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90 overflow-visible">
                          {/* Background track circle */}
                          <circle 
                            cx={70} 
                            cy={70} 
                            r={radius} 
                            fill="transparent" 
                            stroke={colorConfig.trackColor} 
                            strokeWidth={strokeWidth} 
                          />
                          {/* Progress ring circle */}
                          <circle 
                            cx={70} 
                            cy={70} 
                            r={radius} 
                            fill="transparent" 
                            stroke="rgba(255, 255, 255, 0.95)" 
                            strokeWidth={strokeWidth} 
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            style={{
                              filter: `drop-shadow(0 0 6px ${colorConfig.glowColor}) drop-shadow(0 0 12px ${colorConfig.glowColor}) drop-shadow(0 0 18px ${colorConfig.glowColor})`
                            }}
                          />
                        </svg>
                        {/* Center number */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          {isRevealed && (
                            <span className="font-['Inter'] text-[40px] font-bold text-white">{animatedScores[i]}</span>
                          )}
                        </div>
                      </div>

                      {/* Metadata, Description and Tag badges */}
                      <div 
                        className="flex-1 min-w-0"
                        style={{
                          width: "272.4px",
                          ...(i === 2 ? { paddingBottom: "9px" } : {})
                        }}
                      >
                        <span 
                          className="text-[10px] font-mono font-bold uppercase"
                          style={{ color: colorConfig.textColor, letterSpacing: "0.05em" }}
                        >
                          {(cat as any).notScored ? "VALUE ADDED" : "CATEGORY"}
                        </span>
                        <div 
                          className="font-['Inter'] text-[19px] pt-0 pb-[9px] font-black text-white mt-0.5 uppercase"
                          style={{ 
                            letterSpacing: "0.0125em",
                            ...(i === 3 ? { fontStyle: "italic" } : {})
                          }}
                        >
                          {cat.title}
                        </div>
                        {(cat as any).notScored && (
                          <p 
                            className="text-[8.5px] font-mono uppercase -mt-2 mb-1.5"
                            style={{ 
                              letterSpacing: "0.0125em",
                              color: "#ffffff"
                            }}
                          >
                            Not part of your overall summary score
                          </p>
                        )}

                        {/* Pill Tags */}
                        <div className="flex flex-nowrap gap-1 mt-[2px]">
                          {cat.tags.map((tag, tIdx) => (
                            <span 
                              key={tIdx} 
                              className="text-[7.5px] leading-[15.25px] px-1.5 py-1 font-mono bg-white/5 border border-white/20 rounded-full text-slate-300 uppercase tracking-tight whitespace-nowrap"
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
