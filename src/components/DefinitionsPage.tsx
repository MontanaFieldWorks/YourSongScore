import React, { useEffect, useRef } from "react";
import { 
  ArrowLeft, BookOpen, Sparkles, Sliders, Mic, Layers, Info, 
  HelpCircle, Eye, EyeOff, CheckCircle2, Award, Zap, HelpCircle as HelpIcon, Music, Flame,
  Mountain, Drum, MicVocal, Music4, AudioLines, Orbit, Waves
} from "lucide-react";

interface DefinitionsPageProps {
  onBack: () => void;
  initialSelectedTerm?: string;
  onNavigateToRabbitHole?: () => void;
}

export default function DefinitionsPage({ onBack, initialSelectedTerm, onNavigateToRabbitHole }: DefinitionsPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the highlighted term if provided
    if (initialSelectedTerm) {
      const element = document.getElementById(`def-${initialSelectedTerm.toLowerCase().replace(/\s+/g, "-")}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Add a temporary animation flash
        element.classList.add("ring-2", "ring-blue-500", "scale-[1.01]");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-blue-500", "scale-[1.01]");
        }, 3000);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [initialSelectedTerm]);

  // Metric Categories list for jump buttons
  const categories = [
    { id: "score-taxonomy", name: "A&R Rating Taxonomy", icon: Award, color: "text-blue-400 animate-pulse" },
    { id: "artistic-essay", name: "Artistic vs Pop formulas", icon: Sparkles, color: "text-pink-400" },
    { id: "core-metrics", name: "Core KPI Indices", icon: Award, color: "text-amber-400" },
    { id: "genre-signatures", name: "Genre Signatures & Icons", icon: Music, color: "text-emerald-400" },
    { id: "mix-balance", name: "Mix & Frequency Terms", icon: Sliders, color: "text-blue-400" },
    { id: "performance-vocals", name: "Vocal & backing performance", icon: Mic, color: "text-purple-400" },
    { id: "songwriting-theory", name: "Lyrical & Theory glossary", icon: Layers, color: "text-cyan-400 animate-pulse" }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex flex-col gap-8 font-sans animate-fadeIn max-w-5xl mx-auto" ref={containerRef}>
      
      {/* 1. Header Navigation and Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-neutral-900/80 hover:bg-white/5 border border-white/5 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg"
            title="Return to song audit view"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400 font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Studio Master Dictionary & Glossary</span>
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              Architectural Definitions
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

      {/* 2. Interactive Navigation Jumper Deck */}
      <div className="bg-[#0A0B0E] border border-white/5 rounded-2xl p-4 flex flex-wrap gap-2 items-center justify-center">
        <span className="text-xs text-slate-500 font-mono uppercase tracking-wider mr-2 hidden lg:inline">Jump to:</span>
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => scrollToSection(cat.id)}
              className="px-3.5 py-1.5 bg-[#020203] hover:bg-white/5 border border-white/5 hover:border-white/15 rounded-xl text-xs text-slate-300 font-medium transition-all flex items-center gap-2 cursor-pointer"
            >
              <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2.5 A&R RATING TAXONOMY SECTOR */}
      <div id="score-taxonomy" className="scroll-mt-6 bg-[#0E1015] border-2 border-blue-500/20 rounded-3xl p-6 shadow-[0_0_30px_rgba(59,130,246,0.06)] relative overflow-hidden">
        <div className="absolute -top-12 -right-12 p-8 opacity-5 pointer-events-none">
          <Award className="w-48 h-48 text-blue-500" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/25 rounded-2xl text-blue-400">
            <Award className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest">Industry Curation Metric</span>
            <h2 className="text-xl font-black text-white tracking-tight">
              The A&R Score Assessment Taxonomy
            </h2>
          </div>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          Our rating tiers strictly translate acoustic analysis and song composition values into classical standard label A&R signing categories. Every KPI index represents the level of industrial Polish, alignment coherence, and playlisting survivability your track displays.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-[#131722] border-l-4 border-emerald-500 p-4 rounded-r-xl rounded-l-md">
            <div className="flex items-center justify-between mb-1.5 font-mono">
              <span className="text-xs font-black text-emerald-400 uppercase">90–100</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Elite</span>
            </div>
            <h4 className="text-sm font-bold text-white">Masterful</h4>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
              Flawless stereo phase coherence, premium transient snap, and complete playlisting readiness. Eligible for immediate editorial curation and aggressive DSP campaign mapping.
            </p>
          </div>

          <div className="bg-[#131722] border-l-4 border-blue-500 p-4 rounded-r-xl rounded-l-md">
            <div className="flex items-center justify-between mb-1.5 font-mono">
              <span className="text-xs font-black text-blue-400 uppercase">80–89</span>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Signed</span>
            </div>
            <h4 className="text-sm font-bold text-white">Great</h4>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
              Professional, highly competitive performance with exceptional balance. Minor transient masking or sibilance spikes that can be fully corrected in a basic final remaster.
            </p>
          </div>

          <div className="bg-[#131722] border-l-4 border-purple-500 p-4 rounded-r-xl rounded-l-md">
            <div className="flex items-center justify-between mb-1.5 font-mono">
              <span className="text-xs font-black text-purple-400 uppercase">70–79</span>
              <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Demo</span>
            </div>
            <h4 className="text-sm font-bold text-white">Strong</h4>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
              Solid songwriting composition and clear structural intent. Suffers from minor frequency congestion, slight vocal tracking offsets, or unpolished stereo balance.
            </p>
          </div>

          <div className="bg-[#131722] border-l-4 border-amber-500 p-4 rounded-r-xl rounded-l-md">
            <div className="flex items-center justify-between mb-1.5 font-mono">
              <span className="text-xs font-black text-amber-500 uppercase">60–69</span>
              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Rough</span>
            </div>
            <h4 className="text-sm font-bold text-white">Proficient</h4>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
              Honorable demo skeleton. Needs structural vocal tuning corrections, low-end cleanup, or arrangement shifts due to early listener attrition skip risks.
            </p>
          </div>

          <div className="bg-[#131722] border-l-4 border-rose-500 p-4 rounded-r-xl rounded-l-md">
            <div className="flex items-center justify-between mb-1.5 font-mono">
              <span className="text-xs font-black text-rose-400 uppercase">0–59</span>
              <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Draft</span>
            </div>
            <h4 className="text-sm font-bold text-white">Developing</h4>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
              Initial songwriting or workspace acoustic sketch. Has noticeable dynamic clipping, major chord/harmonic theory dissonance, or severe tracking mud that demands a complete DAW re-track.
            </p>
          </div>
        </div>
      </div>

      {/* 3. CORE EXPLANATORY SECTION: Artistic Integrity vs. Pop Formulas (KASHMIR CASE STUDY) */}
      <div id="artistic-essay" className="scroll-mt-6 bg-black border-2 border-pink-500/20 rounded-3xl p-6 shadow-[0_0_30px_rgba(236,72,153,0.06)] relative overflow-hidden">
        <div className="absolute -top-12 -right-12 p-8 opacity-5 pointer-events-none">
          <Sparkles className="w-48 h-48 text-pink-500 animate-pulse" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-pink-500/10 border border-pink-500/25 rounded-2xl text-pink-400">
            <Award className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-pink-400 uppercase tracking-widest">A&amp;R Strategic Insight</span>
            <h2 className="text-xl font-black text-white tracking-tight">
              Artistic Integrity vs. Pop Formulas
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-slate-300 text-sm leading-relaxed">
          <p>
            Standard music evaluation dashboards are fundamentally biased toward modern <span className="font-semibold text-slate-100">pop radio formatting</span> rules. These formulaic metrics enforce instant gratification—such as placing the primary hook in the first 30 seconds, maintaining a brief track length of under 3 minutes, compressing dynamic peaks, and using predictable <a onClick={() => scrollToSection("def-chord-dynamics")} className="text-pink-400 underline hover:text-pink-300 cursor-pointer">chord progressions</a> for instant familiarity.
          </p>

          <div className="my-3 p-5 bg-nested-neutral bg-[#030304] border border-white/5 rounded-2xl">
            <span className="text-[10px] font-mono text-pink-400 uppercase font-bold block mb-2 tracking-wider">The Kashmir Benchmark (100/100)</span>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "Consider Led Zeppelin's legendary 8-minute masterpiece, <strong>Kashmir</strong>. By standard pop metrics, it would score horribly: there is no vocal block or catchy hook in the first 30 seconds, it's over twice the size of standard streaming slots, it loops a hypnotic Eastern string-guitar polyrhythm (drums in 4/4 while instruments play in 3/4), and lacks a basic chorus-verse hierarchy. Yet, it gets an absolute <strong>100/100 classic rating</strong> in our Artistic Analysis engine because it possesses masterful sonic atmosphere, exquisite harmonic suspense, and ultimate palette synergy."
            </p>
          </div>

          <h3 className="text-white font-bold text-base mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Which specialized metrics tell you a song is phenomenal, regardless of pop grids?</span>
          </h3>
          <p>
            If you are constructing a complex piece of musical art outside the traditional commercial box, you can safely ignore the structural pacing rules of <a onClick={() => scrollToSection("def-composition-flow")} className="text-amber-400 underline hover:text-amber-300 cursor-pointer">Composition Flow</a> and focus on these specialized, formula-agnostic parameters:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-[#020203] p-4 rounded-xl border border-white/5">
              <span className="font-bold text-slate-200 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                <a onClick={() => scrollToSection("def-atmospheric-depth")} className="hover:underline cursor-pointer">Atmospheric Depth</a>
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Verifies if the arrangement creates rich, immersive, three-dimensional acoustic environments (utilizing lush room spaces, texture layers, and sensory-rich reverbs) that captivate a human listener’s emotional imagination.
              </p>
            </div>
            <div className="bg-[#020203] p-4 rounded-xl border border-white/5">
              <span className="font-bold text-slate-200 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
                <a onClick={() => scrollToSection("def-harmonic-intrigue")} className="hover:underline cursor-pointer">Harmonic Intrigue</a>
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Rewards chord movements that defy loops. Evaluates voice-leading beauty, suspensions, creative key modulations, modal shifts, and harmonic mystery which provide deep structural rewards.
              </p>
            </div>
            <div className="bg-[#020203] p-4 rounded-xl border border-white/5">
              <span className="font-bold text-slate-200 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
                <a onClick={() => scrollToSection("def-palette-synergy")} className="hover:underline cursor-pointer">Palette Synergy</a>
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Measures whether the core instrumentation choices—how you blend contrasting elements like strings, rock tracks, and custom synths—generate a cohesive, stunning background texturization without crowded frequencies.
              </p>
            </div>
            <div className="bg-[#020203] p-4 rounded-xl border border-white/5">
              <span className="font-bold text-slate-200 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                <a onClick={() => scrollToSection("def-poetic-substance")} className="hover:underline cursor-pointer">Poetic Substance</a>
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Audits lyric density and metaphorical brilliance. Evaluates whether your words escape basic rhyme tropes to tell multi-sensory, authentic narratives that bear repeated analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN KPI INDEX DEFINITIONS */}
      <div id="core-metrics" className="scroll-mt-6 flex flex-col gap-4">
        <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Core KPI Metric Indices</span>
        </h2>
        
        <p className="text-xs text-slate-400">
          These elements form the foundational pillars of our studio review system. Click individual terms or elements anywhere in the app to reference this glossary.
        </p>

        <div className="grid grid-cols-1 gap-4">
          
          {/* DEFINITION: Algotorial Quality */}
          <div id="def-algotorial-quality" className="bg-[#020203] border border-blue-500/20 rounded-2xl p-5 shadow-inner transition-all duration-300 text-left relative overflow-hidden">
            <div className="absolute top-4 right-4 px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest">
              A&amp;R Concept
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Algotorial Curation / Pipeline</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              A modern hybrid music curation process (combining <strong>Algorithmic</strong> &amp; <strong>Editorial</strong> curation methods) utilized by streaming networks like Spotify. While human editorial discretion plays a massive role in major flagship playlists, Spotify's editors rely heavily on the Algotorial system. Songs are tested in small algorithmic "sandbox" environments (like Release Radar or Discover Weekly) where their mathematical performance data dictates whether they scale up to larger, curated editorial brackets (Aguiar et al., 2021).
            </p>
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              In this system, machines analyze loudness benchmarks, transient dynamic impact, vocal clarity indexes, and genre spectral signatures to establish audio compatibility and route pre-qualified uploads to human playlist editors.
            </p>
          </div>

          {/* DEFINITION: Artistic Analysis */}
          <div id="def-artistic-analysis" className="bg-[#020203] border border-pink-500/30 rounded-2xl p-5 shadow-2xl relative transition-all duration-300 text-left">
            <div className="absolute top-4 right-4 px-2 py-0.5 bg-pink-500/10 border border-pink-500/30 rounded text-[9px] font-mono font-bold text-pink-400 uppercase tracking-widest">
              Core Metric
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              <span>Artistic Analysis</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Designed explicitly to audit non-formulaic, complex masterpieces. This metric evaluates the track completely independent of streaming algorithms or standard radio runtimes. It prioritizes <a onClick={() => scrollToSection("def-atmospheric-depth")} className="text-pink-400 underline hover:text-pink-300 cursor-pointer">Atmospheric Depth</a>, sophisticated <a onClick={() => scrollToSection("def-harmonic-intrigue")} className="text-pink-400 underline hover:text-pink-300 cursor-pointer">Harmonic Intrigue</a>, unique audio instrument orchestration (<a onClick={() => scrollToSection("def-palette-synergy")} className="text-pink-400 underline hover:text-pink-300 cursor-pointer">Palette Synergy</a>), and deep, clicheless lyrical songwriting (<a onClick={() => scrollToSection("def-poetic-substance")} className="text-pink-500 underline hover:text-pink-300 cursor-pointer">Poetic Substance</a>). Use this index to confirm your song's legacy potential as timeless art.
            </p>
          </div>

          {/* DEFINITION: Composition Flow */}
          <div id="def-composition-flow" className="bg-[#020203] border border-amber-400/30 rounded-2xl p-5 shadow-inner transition-all duration-300 text-left">
            <div className="absolute top-4 right-4 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest">
              Core Metric
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Composition Flow</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Assesses the traditional structural build, sectional dynamic contrast, vocal delivery timing, and hook performance layout of your song. Standard pop structures benefit from clean energy handoffs between sections (such as building up energy during the pre-chorus to let the chorus explode, or pacing double tracks to increase traction). High Composition Flow indicates that songwriting choices are highly streamlined for instant commercial alignment.
            </p>
          </div>

          {/* DEFINITION: Production Index */}
          <div id="def-production-index" className="bg-[#020203] border border-white/10 rounded-2xl p-5 shadow-inner transition-all duration-300 text-left">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Production Index</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Measures our engineering panel's rating of background creative direction, instrument choices, synthesizers design, and aesthetic genre targeting. It examines whether your background instrument layers or virtual tracking space support the melodic ideas, checking for <a onClick={() => scrollToSection("def-palette-cohesion")} className="text-blue-400 underline hover:text-blue-300 cursor-pointer">Palette Cohesion</a> and correct acoustic size matching.
            </p>
          </div>

          {/* DEFINITION: Commercial Readiness */}
          <div id="def-commercial-readiness" className="bg-[#020203] border border-white/10 rounded-2xl p-5 shadow-inner transition-all duration-300 text-left">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <span>Commercial Readiness</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Audits delivery decibel criteria to verify that standard digital music curation networks can place your track on premium playlists immediately. It looks closely at <a onClick={() => scrollToSection("def-lufs-loudness")} className="text-blue-400 underline hover:text-blue-300 cursor-pointer">LUFS Loudness</a> compliance, average high frequency density, and overall sonic pacing to ensure the song translates competitively.
            </p>
          </div>

          {/* DEFINITION: Mix Balance Quality */}
          <div id="def-mix-balance-quality" className="bg-[#020203] border border-white/10 rounded-2xl p-5 shadow-inner transition-all duration-300 text-left">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span>Mix Balance Quality</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              The pure decibel-and-frequency math audit of your stereo audio bounce. This indexes volume balance, stereo width panning, and EQ cuts/boosts which eliminate overlapping frequencies. It targets mud build-up, vocal de-essing, low-end boominess, and side-channel space management.
            </p>
          </div>

          {/* DEFINITION: Vocal Tracking */}
          <div id="def-vocal-tracking" className="bg-[#020203] border border-white/10 rounded-2xl p-5 shadow-inner transition-all duration-300 text-left">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span>Vocal Tracking</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Detailed tracking analysis checking whether vocal takes are crisp, upfront, dynamically consistent, and in perfect key alignment. It tracks vocal performance, volume consistency, and depth spacing.
            </p>
          </div>

          {/* DEFINITION: Instrumental Staging */}
          <div id="def-instrumental-staging" className="bg-[#020203] border border-white/10 rounded-2xl p-5 shadow-inner transition-all duration-300 text-left">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Instrumental Staging</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Evaluates the timing execution, punch, and stereo field placement of your underlying background accompaniment. Checks for tight synchronization on the timeline grid and clean transient hits.
            </p>
          </div>

        </div>
      </div>

      {/* 5. MIX & FREQUENCY TECHNICAL TERMINOLOGY */}
      <div id="mix-balance" className="scroll-mt-6 flex flex-col gap-4">
        <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
          <Sliders className="w-4 h-4 text-blue-500" />
          <span>Mix &amp; Acoustic Frequency Terms</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div id="def-mud-prevention" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Mud Prevention (150Hz–250Hz)</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              When too many instruments (guitars, piano notes, low vocals) overlap in this low-mid frequency zone, they mask each other, leading to a "cloudy" or "muddy" track where details are lost. Mud Prevention measures how cleanly you have EQ-scooped background channels to give lead elements transparent dynamic focus.
            </p>
          </div>

          <div id="def-sibilance-shaving" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Sibilance Shaving (4kHz-8kHz)</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Consonant sounds in human voices ('S', 'T', 'CH') emit aggressive high frequencies that trigger painful spikes when played loudly. This metric evaluates de-esser calibration to keep vocal clarity silky-smooth and modern without headphone listening fatigue.
            </p>
          </div>

          <div id="def-low-end-division" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Low-End Division</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Ensures separate slots for your bass synthesizer/guitar (sub-harmonics below 60Hz) and your kick drum transient punch (60Hz-120Hz). Dynamic side-chain compression or notches must be used so they do not collide or trigger master limiting distortion.
            </p>
          </div>

          <div id="def-midrange-spacing" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Midrange Spacing (1kHz-3kHz)</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The human ear is highly sensitive to this frequency band. Guitars, synthesis organs, and keyboard elements must be panned to side stereo slots or pulled down in level, leaving the center open for vocal phrasing projection.
            </p>
          </div>

          <div id="def-lufs-loudness" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">LUFS Loudness (Loudness Units Full Scale)</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The standard system measuring human perception of average volume level. Digital streaming systems like Spotify normalize audio to -14 LUFS, but professional releases usually master to a loud -9.0 to -7.0 LUFS to retain rich upfront punch.
            </p>
          </div>

          <div id="def-lufs-paradox" className="bg-[#020203] border border-[#14b8a6]/20 p-5 rounded-2xl text-left shadow-[0_0_15px_rgba(20,184,166,0.05)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
              <span className="text-4xl">⚡</span>
            </div>
            <h4 className="text-sm font-bold text-[#14b8a6] flex items-center gap-1.5">
              <span>The Loudness vs. Quality Paradox</span>
              <span className="px-1.5 py-0.5 text-[8px] bg-[#14b8a6]/10 text-[#14b8a6] border border-[#14b8a6]/20 rounded uppercase tracking-widest font-mono">Expert</span>
            </h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              An audio engineering principle regarding modern digital distribution. Many independent creators aggressively push volume to extremes (e.g., -6.0 or -5.0 LUFS) believing that louder is always superior. However, music streaming systems like Spotify, Apple Music, and YouTube apply automated <strong>Loudness Normalization</strong>.
            </p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              When a track exceeds active targets (usually -14.0 LUFS), their algorithms turn down its average volume. If your master is squashed using aggressive brickwall limiters to achieve ultra-loud targets, it completely sacrifices transient snap, punch, and space. Once brought down to -14.0 LUFS by normalizers, the crushed song will sound small, flat, and lifeless compared to a highly dynamic, well-balanced master engineered to a pristine commercial sweep of -9.0 to -7.0 LUFS.
            </p>
          </div>

          <div id="def-spectral-match" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Spectral Match</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              A detailed scan comparing your complete frequency distribution against modern hit standard sound blueprints in your genre, spotting dynamic valleys or excessive bumps immediately.
            </p>
          </div>

          <div id="def-palette-cohesion" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Palette Cohesion</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The artistic blend of synths, instruments, and samples to sound like they belong in the exact same physical space, achieved by matching reverbs, delays, and acoustic space sizing.
            </p>
          </div>

          <div id="def-space-density" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Space &amp; Density</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The use of negative space in your arrangement. Leaving gaps where secondary synths drop out allows critical components to breathe, giving the chorus explosive impact.
            </p>
          </div>

        </div>
      </div>

      {/* 6. VOCAL & PERFORMANCE DICTIONARY */}
      <div id="performance-vocals" className="scroll-mt-6 flex flex-col gap-4">
        <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
          <Mic className="w-4 h-4 text-purple-500" />
          <span>Vocal &amp; Backing Staging Terms</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div id="def-pitch-accuracy" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Pitch Accuracy</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Ensuring the vocalist hits correct target note centers securely. In professional tracking, vocal lines should maintain steady pitch curves, correcting minor slides with transparent tools (like Melodyne or Autotune).
            </p>
          </div>

          <div id="def-dynamic-delivery" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Dynamic Delivery</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The consistency of vocal volume and phrasing warmth. Utilizing serial compression (fast compressor catching peaks, slow compressor smooths volume) keeps phrases front-facing on the soundstage.
            </p>
          </div>

          <div id="def-vocal-layer-fit" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Vocal Layer Fit</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              How well vocal doubles, harmonies, and background ad-libs wrap around the lead track, achieved with side panning (panning doubles 100% left and right) and rolling off low frequencies to stay out of the center's way.
            </p>
          </div>

          <div id="def-timeline-grid-cohesion" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Timeline Grid Cohesion</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              How perfectly backing grooves, instrument transients, and drum patterns lock on the timeline grid. Slight timing delays weaken the pocket groove and can be solved with microscopic quantization or manual alignment.
            </p>
          </div>

          <div id="def-transient-punch" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Transient Punch</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The "crack" of a drum head or pluck of a guitar string. Aggressive, fast compression destroys these initial peaks; adjusting compressor attack times (above 15ms) lets transients cut through your master speaker mix cleanly.
            </p>
          </div>

          <div id="def-melodic-staging" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Melodic Staging</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Structuring the stereo placement of instrument arrays. Panning guitars or keyboards left and right leaves the center lane completely empty for the kick drum, bass line, and vocals.
            </p>
          </div>

        </div>
      </div>

      {/* 7. SONGWRITING & MUSIC THEORY DICTIONARY */}
      <div id="songwriting-theory" className="scroll-mt-6 flex flex-col gap-4">
        <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-[#22d3ee] flex items-center gap-2 border-b border-white/10 pb-2">
          <Layers className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Lyrical &amp; Music Theory Analytical Glossary</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div id="def-meaning-clarity" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Meaning Clarity</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Evaluates the clarity of the song's key storytelling narrative or emotional mood, confirming that the songwriting triggers instant empathy and conceptual understanding on the listener's very first play.
            </p>
          </div>

          <div id="def-cliche-avoidance" className="bg-[#020203] border border-white/5 p-5 rounded-xl text-left">
            <h4 className="text-sm font-bold text-white">Cliché Avoidance</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Measures whether your rhymes and metaphors escape common pop-radio lyrics tropes (like rhyming 'fire' and 'desire'). Focuses on sensor-rich descriptions and unexpected phrasing which highlight authentic artistry.
            </p>
          </div>

          <div id="def-chord-dynamics" className="bg-[#020203] border border-white/5 p-5 rounded-xl text-left">
            <h4 className="text-sm font-bold text-white">Chord Dynamics</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The creative movement and resolution within your chord progressions. Uses concepts like vocal voice leading, suspended tension chords, and passing minors to guide key musical transits smoothly.
            </p>
          </div>

          <div id="def-harmonic-variety" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">Harmonic Variety</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The range of scale degrees and note variations utilized in the lead vocal melody and harmony against the background progression, avoiding repetitive single-note fatigue.
            </p>
          </div>

          <div id="def-seo-uniqueness" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">SEO Uniqueness</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Determines if your song title has high-level search competition on search engines and major DSPs. Highly unique titles gain top spot listing potential immediately without fighting heavy general word traffic.
            </p>
          </div>

          <div id="def-seo-discoverability" className="bg-[#020203] border border-white/5 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-white">SEO Discoverability</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Index rating of metadata, title structures, and lyric indexing potential. This measures Google crawlers' ability to accurately index and retrieve your song when curating listener searches occur.
            </p>
          </div>

        </div>
      </div>

      {/* 8. GENRE SIGNATURES & VISUAL DIRECTORY */}
      <div id="genre-signatures" className="scroll-mt-6 flex flex-col gap-4">
        <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-[#10b981] flex items-center gap-2 border-b border-white/10 pb-2">
          <Music className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>A&amp;R Genre Signatures &amp; Visual Icon Directory</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
          YourSongScore dynamically matches your audio's core signature style against these leading genre templates. Below are the visual icons mapped to each genre in the profile directory:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-[#13151D] border border-white/10 hover:border-[#fbbf24]/30 p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-neutral-950/80 rounded-lg border border-white/5 text-amber-500 shadow-inner">
                  <Mountain className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white">Rock / Metal / Indie</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Centered on high transient snare snap, raw electric guitar string separation, high driving rhythm headroom, and natural live-room dynamic ranges.
              </p>
            </div>
            <span className="text-[9px] mt-3 font-mono text-slate-500 uppercase font-semibold">Icon component: &lt;Mountain /&gt;</span>
          </div>

          <div className="bg-[#13151D] border border-white/10 hover:border-[#14b8a6]/30 p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-neutral-950/80 rounded-lg border border-white/5 text-teal-400 shadow-inner">
                  <Sliders className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white">Electronic / EDM</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Highlights side-chain vocal compressor ducking, deep sub-bass transient energy cuts, and precise stereo field synthetic soundstage widening.
              </p>
            </div>
            <span className="text-[9px] mt-3 font-mono text-slate-500 uppercase font-semibold">Icon component: &lt;Sliders /&gt;</span>
          </div>

          <div className="bg-[#13151D] border border-white/10 hover:border-[#3b82f6]/30 p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-neutral-950/80 rounded-lg border border-white/5 text-blue-400 shadow-inner">
                  <Drum className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white">Hip-Hop / Rap / R&amp;B</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Anchored purely on dominant boom-bap kick transient punchiness, precise sub-harmonic 808 division, and front-of-house level vocal tracking pockets.
              </p>
            </div>
            <span className="text-[9px] mt-3 font-mono text-slate-500 uppercase font-semibold">Icon component: &lt;Drum /&gt;</span>
          </div>

          <div className="bg-[#13151D] border border-white/10 hover:border-[#ec4899]/30 p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-neutral-950/80 rounded-lg border border-white/5 text-pink-400 shadow-inner">
                  <MicVocal className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white">Pop / Vocal-Centric</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Requires pristine vocal compression consistency, heavy center track presence, high-frequency air sibilance containment, and immediate hook engagement power.
              </p>
            </div>
            <span className="text-[9px] mt-3 font-mono text-slate-500 uppercase font-semibold">Icon component: &lt;MicVocal /&gt;</span>
          </div>

          <div className="bg-[#13151D] border border-white/10 hover:border-[#a855f7]/30 p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-neutral-950/80 rounded-lg border border-white/5 text-purple-400 shadow-inner">
                  <Music4 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white">Classical / Cinematic</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Evaluated on three-dimensional backing orchestral width, micro-dynamics preservation, and authentic acoustics bypass of modern limiters.
              </p>
            </div>
            <span className="text-[9px] mt-3 font-mono text-slate-500 uppercase font-semibold">Icon component: &lt;Music4 /&gt;</span>
          </div>

          <div className="bg-[#13151D] border border-white/10 hover:border-[#10b981]/30 p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-neutral-950/80 rounded-lg border border-white/5 text-emerald-400 shadow-inner">
                  <AudioLines className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white">Jazz / Soul / Blues</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Honors live stage spatial dynamics, warm midrange instrumentation panning, organic vocal warmth, and detailed instrumental harmonic variety.
              </p>
            </div>
            <span className="text-[9px] mt-3 font-mono text-slate-500 uppercase font-semibold">Icon component: &lt;AudioLines /&gt;</span>
          </div>

          <div className="bg-[#13151D] border border-white/10 hover:border-[#eab308]/30 p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-neutral-950/80 rounded-lg border border-white/5 text-yellow-500 shadow-inner">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white">Country / Folk</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Requires intense storytelling poetic substance, bright acoustic guitar transient picking clarity, and highly organic sibilance controls.
              </p>
            </div>
            <span className="text-[9px] mt-3 font-mono text-slate-500 uppercase font-semibold">Icon component: &lt;Sparkles /&gt;</span>
          </div>

          <div className="bg-[#13151D] border border-white/10 hover:border-[#818cf8]/30 p-5 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-neutral-950/80 rounded-lg border border-white/5 text-indigo-400 shadow-inner">
                  <Orbit className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-white">Ambient / Experimental</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Evaluates lush soundstage atmospheres, infinite trailing tail reverbs, polymetric drone synthesizers, and massive stereo landscape movement.
              </p>
            </div>
            <span className="text-[9px] mt-3 font-mono text-slate-500 uppercase font-semibold">Icon component: &lt;Orbit /&gt;</span>
          </div>

        </div>
      </div>

      {/* 9. FORMULA-AGNOSTIC SPECIALIZED METRICS GLOSSARY (Subscores under Artistic Analysis) */}
      <div id="specialized-art-metrics" className="scroll-mt-6 flex flex-col gap-4">
        <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-pink-400 flex items-center gap-2 border-b border-white/10 pb-2">
          <Sparkles className="w-4 h-4 text-pink-400" />
          <span>Artistic Analysis Specialized Metrics</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="def-atmospheric-depth" className="bg-[#020203] border border-pink-500/10 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-pink-400">Atmospheric Depth</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Rather than standard, dry vocal chains designed for pop radio, epic tracks establish deep, immersive sound stages. This evaluates track texture layers, custom analog synthesizer warmth, spacious custom reverbs, and background acoustic environments that paint vivid human imagination scapes.
            </p>
          </div>

          <div id="def-harmonic-intrigue" className="bg-[#020203] border border-pink-500/10 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-pink-400">Harmonic Intrigue</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              While pop formats require repeating four-chord loops, authentic masterpieces utilize complex harmonic layers. This evaluates non-diatonic chords, open tunings (such as DADGAD), polymetric drift, suspensions, chromatic lines, and key signatures that keep the tracking intellectually stimulating.
            </p>
          </div>

          <div id="def-palette-synergy" className="bg-[#020203] border border-pink-500/10 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-pink-400">Palette Synergy</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Examines how perfectly contrasting instrumental elements—like heavy rock sections married to symphonic movements, woodwinds combined with digital waves—are glued together in the same sonic field. They must sound like a singular artistic statement rather than separate files piled into a DAW.
            </p>
          </div>

          <div id="def-poetic-substance" className="bg-[#020203] border border-pink-500/10 p-5 rounded-2xl text-left">
            <h4 className="text-sm font-bold text-pink-400">Poetic Substance</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Audits the artistic depth and metaphorical standard of lead lyrics. Instead of explicit, literal relationship complaints common to pop, epic masters use sensor-rich descriptions, poetic mythology, and complex psychological imagery to leave long-lasting human resonance.
            </p>
          </div>
        </div>
      </div>

      {/* Footer return link */}
      <div className="mt-4 border-t border-white/5 pt-6 text-center">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 animate-pulse" />
          <span>Return To Song Audit Workspace</span>
        </button>
      </div>

    </div>
  );
}
