import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, Target, ArrowRight, Radio, Activity, Layers, X
} from "lucide-react";
import { CritiqueData, TrackInfo } from "../types";
import EnergySimulator from "./EnergySimulator";
import MoodPlotterDisplay from "./MoodPlotterDisplay";

interface CritiqueSummaryProps {
  critique: CritiqueData;
  trackInfo?: TrackInfo;
  onViewFullAudit: () => void;
  onClear?: () => void;
}

function formatCamelCase(str: string): string {
  if (!str) return "";
  let spaced = str.replace(/([a-z])([A-Z])/g, "$1 $2");
  spaced = spaced.replace(/[_-]/g, " ");
  return spaced
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function findAllSubMetrics(obj: any, parentKey: string = ""): { label: string; score: number; text: string }[] {
  if (!obj || typeof obj !== "object") return [];

  const hasScore = typeof obj.score === "number";
  const hasCommentary = typeof obj.commentary === "string";
  const hasFeedback = typeof obj.feedback === "string";

  if (hasScore && (hasCommentary || hasFeedback)) {
    const text = (obj.commentary || obj.feedback || "") as string;
    const firstPeriodIndex = text.indexOf(".");
    const sentence = firstPeriodIndex !== -1 ? text.slice(0, firstPeriodIndex + 1).trim() : text.trim();

    return [{
      label: formatCamelCase(parentKey || "Sub Metric"),
      score: obj.score,
      text: sentence
    }];
  }

  const results: { label: string; score: number; text: string }[] = [];
  if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...findAllSubMetrics(item, parentKey));
    }
  } else {
    for (const key of Object.keys(obj)) {
      results.push(...findAllSubMetrics(obj[key], key));
    }
  }

  return results;
}

export default function CritiqueSummary({ critique, trackInfo, onViewFullAudit, onClear }: CritiqueSummaryProps) {
  const [activeView, setActiveView] = useState<"energy" | "mood">("energy");

  // Compute the headline Total Index using the identical formula in Dashboard.tsx
  const totalIndex = Math.round(
    ((critique.scores?.commercialReadiness ?? 75) +
     (critique.scores?.overallProduction ?? 75) +
     (critique.mixQuality?.score ?? 75) +
     (critique.performance?.vocalScore ?? 75) +
     (critique.lyricalImpact?.score ?? 75) +
     (critique.musicTheory?.score ?? 75) +
     (critique.titleSearchability?.score ?? 75)) / 7
  );

  // Grouped category averages
  const streamingReadiness = Math.round(((critique.scores?.commercialReadiness ?? 75) + (critique.titleSearchability?.score ?? 75)) / 2);
  const sonicSoundprint = Math.round(((critique.mixQuality?.score ?? 75) + (critique.performance?.vocalScore ?? 75)) / 2);
  const compositionalDepth = Math.round(((critique.lyricalImpact?.score ?? 75) + (critique.musicTheory?.score ?? 75)) / 2);

  // Verdict line logic with robust fallbacks
  const genre = critique.vibe?.genre;
  const subgenre = critique.vibe?.subgenre;
  const hasGenre = genre && genre.toLowerCase() !== "not specified" && genre.toLowerCase() !== "unknown" && genre.trim() !== "";
  const hasSubgenre = subgenre && subgenre.toLowerCase() !== "not specified" && subgenre.toLowerCase() !== "unknown" && subgenre.trim() !== "";

  let verdict = "";
  if (hasGenre && hasSubgenre) {
    verdict = `${genre} / ${subgenre}`;
  } else if (hasGenre) {
    verdict = genre;
  } else {
    if (totalIndex >= 90) {
      verdict = "Release-Ready Master";
    } else if (totalIndex >= 80) {
      verdict = "Radio-Ready Production";
    } else if (totalIndex >= 70) {
      verdict = "Solid Foundation & Arrangement";
    } else {
      verdict = "Promising Early Draft";
    }
  }

  // Scan subMetricsCall1, subMetricsCall2, subMetricsCall3 to find highest and lowest scoring sub-metrics
  const subMetrics1 = findAllSubMetrics(critique.subMetricsCall1);
  const subMetrics2 = findAllSubMetrics(critique.subMetricsCall2);
  const subMetrics3 = findAllSubMetrics(critique.subMetricsCall3);
  const allSubMetrics = [...subMetrics1, ...subMetrics2, ...subMetrics3];

  const validSubMetrics = allSubMetrics.filter(
    item => item && typeof item.score === "number" && item.score >= 0 && item.score <= 100 && item.text && item.text.trim() !== ""
  );

  let strongestAsset: { label: string; score: number; text: string } | null = null;
  let biggestOpportunity: { label: string; score: number; text: string } | null = null;

  if (validSubMetrics.length > 0) {
    strongestAsset = validSubMetrics.reduce((prev, current) => (current.score > prev.score ? current : prev), validSubMetrics[0]);
    biggestOpportunity = validSubMetrics.reduce((prev, current) => (current.score < prev.score ? current : prev), validSubMetrics[0]);
  }

  // Hardcoded visual mockup data for visualization
  const energyHeights = ["h-[30%]", "h-[70%]", "h-[45%]", "h-[85%]", "h-[55%]", "h-[75%]"];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative w-full max-w-xl mx-auto bg-[#090b0e] border border-white/5 rounded-2xl p-5 sm:p-6 text-white flex flex-col gap-5 shadow-2xl"
      id="critique-summary-card"
    >
      {onClear && (
        <button
          onClick={onClear}
          className="absolute top-4 right-4 text-[#90a1b9] hover:text-white p-1 rounded-full hover:bg-white/5 transition-all cursor-pointer"
          aria-label="Dismiss summary"
          title="Back to Locker"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* 1. Centered Header Block */}
      <div className="text-center" id="summary-header">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#90a1b9] block mb-1">
          Total Index
        </span>
        <h1 className="text-6xl font-black font-mono tracking-tight text-white mb-1.5 filter drop-shadow-[0_0_15px_rgba(70,244,205,0.15)]">
          {totalIndex}
        </h1>
        <p className="text-sm font-semibold text-[#46F4CD] tracking-wide">
          {verdict}
        </p>
      </div>

      {/* 2. Row of 3 Equal-Width Metrics Cards */}
      <div className="grid grid-cols-3 gap-3" id="summary-metric-cards">
        {/* Streaming Readiness */}
        <div className="bg-[#13161C] border border-white/5 rounded-xl p-3 flex flex-col items-center text-center justify-center transition-all hover:border-white/10">
          <Radio className="w-5 h-5 text-[#46F4CD] mb-2" />
          <span className="text-2xl font-black font-mono text-white">{streamingReadiness}</span>
          <span className="text-[10px] text-[#90a1b9] font-medium tracking-wide mt-1 leading-tight">
            Streaming Readiness
          </span>
        </div>

        {/* Sonic Soundprint */}
        <div className="bg-[#13161C] border border-white/5 rounded-xl p-3 flex flex-col items-center text-center justify-center transition-all hover:border-white/10">
          <Activity className="w-5 h-5 text-[#1ed760] mb-2" />
          <span className="text-2xl font-black font-mono text-white">{sonicSoundprint}</span>
          <span className="text-[10px] text-[#90a1b9] font-medium tracking-wide mt-1 leading-tight">
            Sonic Soundprint
          </span>
        </div>

        {/* Compositional Depth */}
        <div className="bg-[#13161C] border border-white/5 rounded-xl p-3 flex flex-col items-center text-center justify-center transition-all hover:border-white/10">
          <Layers className="w-5 h-5 text-[#90a1b9] mb-2" />
          <span className="text-2xl font-black font-mono text-white">{compositionalDepth}</span>
          <span className="text-[10px] text-[#90a1b9] font-medium tracking-wide mt-1 leading-tight">
            Compositional Depth
          </span>
        </div>
      </div>

      {/* 3. Row of 2 Equal-Width Asset/Opportunity Cards */}
      <div className="grid grid-cols-2 gap-3" id="summary-qualitative-cards">
        {/* Strongest Asset */}
        <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5 flex flex-col gap-1.5 justify-between min-h-[110px]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[9px] tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Strongest Asset</span>
            </div>
            {strongestAsset && (
              <span className="text-[10px] font-bold text-emerald-300 font-mono">
                {strongestAsset.label} ({strongestAsset.score})
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#90a1b9] leading-relaxed">
            {strongestAsset ? strongestAsset.text : "Not enough data available yet."}
          </p>
        </div>

        {/* Biggest Opportunity */}
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3.5 flex flex-col gap-1.5 justify-between min-h-[110px]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[9px] tracking-wider">
              <Target className="w-3.5 h-3.5" />
              <span>Biggest Opportunity</span>
            </div>
            {biggestOpportunity && (
              <span className="text-[10px] font-bold text-amber-300 font-mono">
                {biggestOpportunity.label} ({biggestOpportunity.score})
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#90a1b9] leading-relaxed">
            {biggestOpportunity ? biggestOpportunity.text : "Not enough data available yet."}
          </p>
        </div>
      </div>

      {/* 4. Bordered Panel (Energy/Mood Band Visualization) */}
      <div className="bg-[#0A0B0E] border border-white/5 rounded-xl p-3.5 flex flex-col gap-3" id="summary-visualizer-panel">
        {/* Toggle Pill Button Bar */}
        <div className="flex justify-center">
          <div className="bg-black/40 border border-white/5 p-0.5 rounded-full flex gap-1">
            <button 
              onClick={() => setActiveView("energy")}
              className={`${
                activeView === "energy" 
                  ? "bg-[#13161C] border border-white/10 text-white shadow-sm" 
                  : "text-[#90a1b9] border-transparent"
              } font-bold uppercase text-[9px] tracking-wider px-3.5 py-1 rounded-full transition-all cursor-pointer`}
            >
              Energy
            </button>
            <button 
              onClick={() => setActiveView("mood")}
              className={`${
                activeView === "mood" 
                  ? "bg-[#13161C] border border-white/10 text-white shadow-sm" 
                  : "text-[#90a1b9] border-transparent"
              } font-bold uppercase text-[9px] tracking-wider px-3.5 py-1 rounded-full transition-all cursor-pointer`}
            >
              Mood
            </button>
          </div>
        </div>

        {/* Conditional Component Render Area - Fixed Height Wrapper */}
        <div className="w-full min-h-[390px] flex flex-col justify-start">
          {activeView === "energy" ? (
            <EnergySimulator
              realBandEnergies={[
                critique.liveMetrics?.calculatedSubBassBandEnergy ?? 50,
                critique.liveMetrics?.calculatedBassBandEnergy ?? 50,
                critique.liveMetrics?.calculatedLowMidsBandEnergy ?? 50,
                critique.liveMetrics?.calculatedCoreMidsBandEnergy ?? 50,
                critique.liveMetrics?.calculatedPresenceBandEnergy ?? 50,
                critique.liveMetrics?.calculatedAirBandEnergy ?? 50,
              ]}
              realLufs={critique.liveMetrics?.calculatedLufs ?? -14}
              realTruePeak={critique.liveMetrics?.calculatedTruePeak ?? -1}
              autoPlay={true}
            />
          ) : (
            <MoodPlotterDisplay
              valence={critique.userValence ?? 0.5}
              energy={critique.userEnergy ?? 0.5}
            />
          )}
        </div>
      </div>

      {/* 5. See Full Audit Centered Button */}
      <div className="flex justify-center" id="summary-cta-section">
        <button 
          onClick={onViewFullAudit}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#1ed760] hover:bg-[#1DB954] text-black font-bold text-xs tracking-wider uppercase transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-[#1ed760]/10 cursor-pointer"
        >
          <span>See Full Audit</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </motion.div>
  );
}
