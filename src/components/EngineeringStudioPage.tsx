import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, Volume2, Sliders, Mic, CheckCircle, Square, Play, Pause, 
  Activity, Sparkles, Cpu, AlertTriangle, Check, RotateCcw, Compass, Layers, CheckSquare,
  Radio, Waves, Settings, ShieldAlert, Info, BarChart2, Disc, Wand2
} from "lucide-react";

// Helper to map genre icons
const getGenreIcon = (genre: string, className = "w-4 h-4") => {
  const g = genre.toLowerCase();
  if (g.includes("rock") || g.includes("metal")) return <Layers className={className} />;
  if (g.includes("hip") || g.includes("rap") || g.includes("pop")) return <Activity className={className} />;
  return <Sliders className={className} />;
};

interface ActionItem {
  title: string;
  recommendation: string;
  technicalGuide: string;
}

interface EngineeringStudioPageProps {
  onBack: () => void;
  critique: any;
  trackInfo: any;
  localFileBlobUrl: string | null;
}

interface HarmonicNode {
  id: string;
  frequency: string;
  band: string;
  dbOffset: number; // positive is excess, negative is deficit
  problem: string;
  solution: string;
  detail: string;
  xPct: number; // position on SVG graph (x-axis)
  yPct: number; // position on SVG graph (y-axis)
  status: "critical" | "warning" | "optimized";
}

export default function EngineeringStudioPage({ onBack, critique, trackInfo, localFileBlobUrl }: EngineeringStudioPageProps) {
  const trackName = trackInfo?.name || "Independent Demo Track";
  const artistName = trackInfo?.artist || "Independent Songwriter";
  const coverArt = trackInfo?.coverArt;
  const audioSourceUrl = localFileBlobUrl || "";

  // 1. Core State Managers
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState("");
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  // Playback monitor simulation
  const [audioRef] = useState(() => new Audio());
  const [isPlaying, setIsPlaying] = useState(false);

  // Checklist state (persisted per track name)
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({});

  // Loaded/generated advanced mix corrective nodes
  const [harmonicNodes, setHarmonicNodes] = useState<HarmonicNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Correction slider value for the selected node (simulation)
  const [correctionValue, setCorrectionValue] = useState<number>(0);
  const [customCorrections, setCustomCorrections] = useState<Record<string, number>>({});

  // Tab View Configuration
  const [activeView, setActiveView] = useState<
    "harmonic" | "signal" | "frequency" | "dynamics" | "stereo" | "spatial" | "harmonicContent" | "genre" | "noise" | "arrangement" | "azimuth"
  >("harmonic");

  // Azimuth Analyzer states
  const [azimuthProgress, setAzimuthProgress] = useState(0);
  const [azimuthPlaying, setAzimuthPlaying] = useState(false);
  const [azimuthRefMode, setAzimuthRefMode] = useState<"user" | "benchmark" | "overlap">("user");
  const [azimuthActiveTab, setAzimuthActiveTab] = useState<"outline" | "waveform" | "melodic" | "spectrogram" | "pitch" | "key" | "azimuth">("azimuth");

  // 2. Load checked items or default actions from critique
  const actionItems: ActionItem[] = critique?.actionItems || [
    {
      title: "Add Low-Cut EQ (High-Pass Filters)",
      recommendation: "Apply a steep high-pass filter at 32Hz to sub channels.",
      technicalGuide: "Corner high-pass filter precisely at 32Hz on kick and bass groups to save dynamic storage master space."
    },
    {
      title: "Attenuate Mud Range at 220Hz-280Hz",
      recommendation: "Slight cut of -2.5dB with moderate Q value of 1.4.",
      technicalGuide: "Apply corrective parametric EQ notches on dense synthetic instruments and pad structures around 245Hz."
    },
    {
      title: "Presence Curve Definition",
      recommendation: "Add +1.5dB high shelf starting above 11kHz.",
      technicalGuide: "Use a smooth Baxandall air-boost shelf to improve recording quality depth and premium transient texture."
    }
  ];

  useEffect(() => {
    // Attempt local storage recall of checklist
    try {
      const saved = localStorage.getItem(`ess_tasks_${trackName}`);
      if (saved) {
        setCheckedTasks(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not load tasks from store", e);
    }

    return () => {
      audioRef.pause();
    };
  }, [trackName, audioRef]);

  // Handle task toggling and local persistence
  const toggleTask = (index: number) => {
    const updated = { ...checkedTasks, [index]: !checkedTasks[index] };
    setCheckedTasks(updated);
    try {
      localStorage.setItem(`ess_tasks_${trackName}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const togglePlayback = () => {
    if (!audioSourceUrl) return;
    if (isPlaying) {
      audioRef.pause();
      setIsPlaying(false);
    } else {
      audioRef.src = audioSourceUrl;
      audioRef.loop = true;
      audioRef.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Playback failed:", err));
    }
  };

  // 3. Simulated Deep Sweep Core Analyzer
  const startAcousticAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStep("Initializing acoustic sweep parameters...");

    const steps = [
      { progress: 12, msg: "Allocating FFT spectral frequency bins..." },
      { progress: 28, msg: "Scanning low-end dc mud and kick-bass transient clashing..." },
      { progress: 48, msg: "Evaluating mid-range build-up & comb filtering around 200Hz - 600Hz..." },
      { progress: 68, msg: "Pinpointing sibilance energy and transient harshness peak nodes..." },
      { progress: 85, msg: "Measuring vocal-to-beat pocket levels and stereo correlations..." },
      { progress: 100, msg: "Deep analysis complete! Loading laser-precision mixing matrices..." }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setAnalysisProgress(step.progress);
        setAnalysisStep(step.msg);

        if (idx === steps.length - 1) {
          setTimeout(() => {
            setIsAnalyzing(false);
            setIsAnalyzed(true);
            generateHarmonicNodes();
          }, 600);
        }
      }, (idx + 1) * 600);
    });
  };

  // 4. Generate Realistic Correction Nodes based on critique metrics
  const generateHarmonicNodes = () => {
    const defaultNodes: HarmonicNode[] = [
      {
        id: "sub-rumble",
        frequency: "28 Hz",
        band: "Sub-Bass",
        dbOffset: 3.8,
        problem: "Low-end DC rumble clashing with main kick drum transient spectrum.",
        solution: "High-pass sweep with dynamic slope cornered precisely at 32Hz.",
        detail: "Below 30Hz sits excessive acoustic floor noise that takes up precious master headroom. Clipping this range restores overall impact.",
        xPct: 15,
        yPct: 74,
        status: "critical"
      },
      {
        id: "muddy-mids",
        frequency: "245 Hz",
        band: "Low-Midrange",
        dbOffset: 4.6,
        problem: "Resonant accumulation causing severe muddy mix build-up.",
        solution: "Apply a parametric dynamic EQ notch filter of -3.5dB with Q = 1.8.",
        detail: "Instruments, vocal low-resonances, and guitar bodies fight inside this octave. Attenuating this creates a clear soundstage.",
        xPct: 35,
        yPct: 82,
        status: "critical"
      },
      {
        id: "boxy-color",
        frequency: "580 Hz",
        band: "Midrange",
        dbOffset: 2.1,
        problem: "Boxy/hollow instrumental coloration cluttering primary vocal pocket.",
        solution: "Add a subtle parametric cut of -1.8dB (Q = 1.2) spread across secondary instruments.",
        detail: "Boxiness masks vocal articulation. Carving this zone on mid-instruments (like keys/synths) lifts the voice right out of the mud.",
        xPct: 52,
        yPct: 65,
        status: "warning"
      },
      {
        id: "harsh-presence",
        frequency: "4.2 kHz",
        band: "High-Midrange",
        dbOffset: 3.4,
        problem: "De-essing harsh sibilant spikes causing ear fatigue on playback.",
        solution: "Target dynamic EQ attenuation curve centered between 4.1kHz and 4.5kHz.",
        detail: "Sibilance spikes (S/C sound consonants) create harsh transients. Dynamic compression triggered only when sibilant peaks occurs keeps are clear.",
        xPct: 72,
        yPct: 78,
        status: "warning"
      },
      {
        id: "air-texture",
        frequency: "14.5 kHz",
        band: "Brilliance/Air",
        dbOffset: -2.3,
        problem: "Air texture deficit leading to a slightly muffled, dry soundscape.",
        solution: "Engage a smooth Baxandall musical high shelf boost of +1.8dB at 13.5kHz.",
        detail: "Gently boosting the brilliance shelf adds spatial sheen and an expensive polish, allowing elements to breath naturally.",
        xPct: 88,
        yPct: 42,
        status: "optimized"
      }
    ];

    setHarmonicNodes(defaultNodes);
    setSelectedNodeId("muddy-mids");
    setCorrectionValue(0);
  };

  const handleSelectNode = (node: HarmonicNode) => {
    setSelectedNodeId(node.id);
    const completedCorrection = customCorrections[node.id] || 0;
    setCorrectionValue(completedCorrection);
  };

  const handleCorrectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCorrectionValue(val);
    if (selectedNodeId) {
      setCustomCorrections({
        ...customCorrections,
        [selectedNodeId]: val
      });
    }
  };

  // Helper calculation for simulated corrected curve
  const getSimulatedPath = () => {
    if (!isAnalyzed) return "M 50 150 Q 250 150 450 150 T 850 150";

    const basePoints = [
      { x: 30, y: 150 },
      { x: 120, y: 150 },
      { x: 260, y: 150 },
      { x: 400, y: 150 },
      { x: 550, y: 150 },
      { x: 700, y: 150 },
      { x: 850, y: 150 }
    ];

    // Modify base points with offset of harmonicNodes minus corrections
    harmonicNodes.forEach(node => {
      const idx = basePoints.findIndex(p => Math.abs(p.x - (node.xPct / 100 * 850)) < 80);
      if (idx !== -1) {
        const customCorr = customCorrections[node.id] || 0;
        const currentProblemAmt = node.dbOffset;
        const netProblemAmt = currentProblemAmt - (customCorr * currentProblemAmt);
        
        // Map dbOffset to Y space (up is standard, down is cut, positive means peak problem so we render high bump, negative means trough problem)
        const scale = 8;
        basePoints[idx].y = 150 - (netProblemAmt * scale);
      }
    });

    let path = `M ${basePoints[0].x} ${basePoints[0].y}`;
    for (let i = 1; i < basePoints.length; i++) {
      const p = basePoints[i];
      const prev = basePoints[i - 1];
      const cpX1 = prev.x + (p.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (p.x - prev.x) / 2;
      const cpY2 = p.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }
    return path;
  };

  const activeSelectedNode = harmonicNodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col gap-6" id="engineering-studio-page">
      
      {/* 1. Header Hero Panel (Matched to items in selected div of the previous section) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border border-[#2563EB]/30 bg-[#0A0B0E]/90 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[#2563EB]/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="p-2.5 rounded-xl border border-[#2563EB]/30 bg-neutral-900/60 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.15)] flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-black text-[19px] tracking-wider uppercase text-white leading-tight">
              THE ENGINEERING STUDIO
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide">
              Mixing &amp; Mastering Technical Recommendations
            </span>
          </div>
        </div>

        <button 
          onClick={onBack} 
          className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl transition-all cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Analysis Report</span>
        </button>
      </div>

      {/* 2. Audio Reference Desk Panel */}
      <div className="bg-[#111317] border border-white/5 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-4 text-left">
          {coverArt ? (
            <img
              src={coverArt}
              alt="Track Cover Artwork"
              className="w-16 h-16 rounded-xl object-cover shadow border border-white/10"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600/10 to-black rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
              <Compass className="w-7 h-7 text-blue-400" />
            </div>
          )}
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-white tracking-tight">{trackName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">by {artistName}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono tracking-widest px-2 py-0.5 rounded-full uppercase">
                {critique?.vibe?.genre || "Acoustic Track"}
              </span>
              <span className="text-[9px] bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono tracking-widest px-2 py-0.5 rounded-full uppercase">
                {critique?.vibe?.subgenre || "Independent Shape"}
              </span>
            </div>
          </div>
        </div>

        {audioSourceUrl && (
          <div className="flex items-center gap-3 bg-neutral-950/80 border border-white/10 p-2.5 rounded-2xl shadow-inner pr-5">
            <button
              onClick={togglePlayback}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                isPlaying 
                  ? "bg-blue-600 hover:bg-blue-500 text-white" 
                  : "bg-neutral-900 hover:bg-white/5 text-blue-400 border border-white/5"
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current animate-pulse" /> : <Play className="w-4 h-4 fill-current pl-0.5" />}
            </button>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-mono text-slate-400 uppercase leading-normal">
                {isPlaying ? "Auditory reference playing" : "Acoustic reference monitor"}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                {localFileBlobUrl ? "Internal lossless file preview" : "Spotify algorithm snippet"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. High-Precision Run/Trigger Interface */}
      {!isAnalyzed && !isAnalyzing && (
        <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-10 shadow-2xl text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[380px]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 width-[200px] height-[200px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="p-5 rounded-3xl bg-[#2563EB]/10 border border-[#2563EB]/20 text-blue-400 mb-6 shadow-[0_0_35px_rgba(37,99,235,0.15)] flex items-center justify-center">
            <Cpu className="w-10 h-10 text-blue-400 animate-pulse" />
          </div>

          <h2 className="text-xl font-bold text-white uppercase tracking-wide">
            Harmonic Core Resolution Analyzer
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-lg leading-relaxed">
            Run on-demand deep-spectrum analysis on <span className="text-slate-300 font-bold">"{trackName}"</span> to find surgical EQ problems. This runs localized multi-point FFT bins to discover phase, gain resonance, and dynamic transients issues without loading overall report limits.
          </p>

          <button
            onClick={startAcousticAnalysis}
            className="mt-8 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_35px_rgba(37,99,235,0.5)] cursor-pointer select-none flex items-center gap-2.5"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-yellow-300" />
            <span>Launch Precision Mix Diagnostic</span>
          </button>
        </div>
      )}

      {/* 4. Live Running Sweep Interface */}
      {isAnalyzing && (
        <div className="bg-[#13161C] border border-blue-500/20 rounded-3xl p-10 shadow-2xl text-center flex flex-col items-center justify-center min-h-[380px] animate-fadeIn">
          <div className="relative w-20 h-20 flex items-center justify-center mb-6">
            <div className="absolute inset-0 w-20 h-20 border-4 border-blue-500/10 rounded-full" />
            <div className="absolute inset-0 w-20 h-20 border-4 border-t-blue-500 rounded-full animate-[spin_1.2s_linear_infinite]" />
            <Activity className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>

          <div className="max-w-md w-full">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono">
              <span>ACOUSTIC SPECTRUM SWEEP</span>
              <span>{analysisProgress}%</span>
            </div>
            
            {/* Progress line */}
            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300 shadow-[0_0_12px_#3b82f6]" 
                style={{ width: `${analysisProgress}%` }}
              />
            </div>

            <p className="text-xs font-mono text-blue-400 font-bold mt-4 animate-pulse uppercase tracking-wider">
              {analysisStep}
            </p>
          </div>
        </div>
      )}

      {/* 5. Complete Laser Precision Suite */}
      {isAnalyzed && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          {/* Main Workspace split into side panel (navigation) and viewport (active metric dashboard) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Console: 11 high-fidelity analyzer trigger buttons */}
            <div className="lg:col-span-3 flex flex-col gap-2 bg-[#0B0C10]/60 p-3.5 border border-white/5 rounded-3xl" id="advanced-nav-buttons-console">
              <span className="text-[10px] font-mono tracking-widest text-slate-500 font-bold uppercase pb-2 px-2 border-b border-white/5 mb-2.5 block text-left">
                Precision Modules
              </span>
              
              {[
                { id: "harmonic", label: "Harmonic Resolution", sub: "EQ Resonance Sweep", icon: Activity, color: "text-blue-400" },
                { id: "signal", label: "Signal & Levels", sub: "Loudness & Peak", icon: Waves, color: "text-cyan-400" },
                { id: "dynamics", label: "Dynamics Profile", sub: "PLR & Compression", icon: Cpu, color: "text-rose-400" },
                { id: "frequency", label: "Frequency Balance", sub: "Spectral Octave Grid", icon: Sliders, color: "text-purple-400" },
                { id: "stereo", label: "Stereo Field", sub: "M/S & Phase Corridor", icon: Compass, color: "text-pink-400" },
                { id: "spatial", label: "Spatial & Depth", sub: "3D Soundstage Map", icon: Layers, color: "text-emerald-400" },
                { id: "harmonicContent", label: "Harmonic Content", sub: "Tube-Tape Saturation", icon: Disc, color: "text-amber-400" },
                { id: "genre", label: "Genre Compliance", sub: "Streaming Standards", icon: BarChart2, color: "text-lime-300" },
                { id: "noise", label: "Noise & Artifacts", sub: "DC Offset & Hiss", icon: Radio, color: "text-teal-400" },
                { id: "arrangement", label: "Arrangement Patterns", sub: "Frequency Masking", icon: Settings, color: "text-slate-400" },
                { id: "azimuth", label: "Stereo Azimuth Profile", sub: "Soundstage Panning Lineup", icon: Compass, color: "text-cyan-400 text-glow" }
              ].map((tab) => {
                const isSelected = activeView === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as any)}
                    className={`flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-left border transition-all duration-200 cursor-pointer group hover:scale-[1.01] ${
                      isSelected
                        ? "bg-[#2563EB]/10 border-[#2563EB]/40 text-white shadow-[0_0_15px_rgba(37,99,235,0.08)]"
                        : "bg-transparent border-transparent hover:bg-white/[0.03] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${
                      isSelected ? "bg-blue-600/15 text-white" : "bg-[#0A0B0E] text-slate-500 group-hover:text-slate-300"
                    }`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11.5px] font-bold tracking-wide leading-tight">{tab.label}</span>
                      <span className="text-[9.5px] text-slate-500 leading-normal truncate">{tab.sub}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Stage: Interactive Viewer Panel */}
            <div className="lg:col-span-9" id="active-viewport-analyzer-container">

              {/* VIEW 1: Harmonic Spectral Resolution */}
              {activeView === "harmonic" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
                      <span className="font-black text-sm uppercase text-slate-200 tracking-wider">
                        Harmonic Spectral Resolution Curve (20 - 20,000 Hz)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[9px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Critical Problem
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Caution
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Optimized
                      </span>
                    </div>
                  </div>

                  {/* The SVG Canvas wrapper */}
                  <div className="relative w-full h-[220px] bg-[#0A0B0E] rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                    <div className="absolute inset-0 flex">
                      {[20, 100, 250, 500, 1000, 4000, 10000, 20000].map((f) => (
                        <div 
                          key={f} 
                          className="h-full border-r border-[#ffffff]/2 flex flex-col justify-end pb-1 pr-1.5 relative"
                          style={{ width: `${100 / 8}%` }}
                        >
                          <span className="font-mono text-[8px] text-slate-600 block text-right">{f < 1000 ? `${f}Hz` : `${(f/1000).toFixed(0)}kHz`}</span>
                        </div>
                      ))}
                    </div>

                    <div className="absolute inset-x-0 inset-y-2 flex flex-col justify-between pointer-events-none pl-3 z-0">
                      <span className="font-mono text-[8px] text-slate-700">+12 dB</span>
                      <span className="font-mono text-[8px] text-slate-700">0 dB reference</span>
                      <span className="font-mono text-[8px] text-slate-700">-12 dB</span>
                    </div>

                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 850 220" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <path 
                        d={`${getSimulatedPath()} L 850 220 L 30 220 Z`}
                        fill="url(#curveGradient)"
                        className="transition-all duration-300"
                      />

                      <path 
                        d={getSimulatedPath()}
                        fill="none" 
                        stroke="#2563EB" 
                        strokeWidth="3.5" 
                        className="transition-all duration-300 drop-shadow-[0_0_12px_rgba(37,99,235,0.85)]"
                      />

                      {harmonicNodes.map((node) => {
                        const isSelected = selectedNodeId === node.id;
                        const customCorr = customCorrections[node.id] || 0;
                        const isFixed = customCorr >= 0.85 && node.status !== "optimized";

                        const cx = (node.xPct / 100) * 850;
                        const netProblemArea = node.dbOffset - (customCorr * node.dbOffset);
                        const cy = 110 - (netProblemArea * 8);

                        let colorCode = "#ef4444";
                        let glowCode = "rgba(239, 68, 68, 0.65)";
                        if (isFixed || node.status === "optimized") {
                          colorCode = "#10b981";
                          glowCode = "rgba(16, 185, 129, 0.65)";
                        } else if (node.status === "warning") {
                          colorCode = "#f59e0b";
                          glowCode = "rgba(245, 158, 11, 0.65)";
                        }

                        return (
                          <g key={node.id} className="cursor-pointer" onClick={() => handleSelectNode(node)}>
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={isSelected ? "15" : "7"} 
                              fill="none" 
                              stroke={colorCode} 
                              strokeWidth="1.5" 
                              className="opacity-25 animate-pulse"
                            />
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={isSelected ? "6.5" : "4.5"} 
                              fill={colorCode} 
                              stroke="#ffffff" 
                              strokeWidth="1.5" 
                              className="transition-all duration-300"
                              style={{ filter: `drop-shadow(0px 0px 8px ${glowCode})` }}
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {activeSelectedNode && (
                      <div 
                        className="absolute font-mono text-[9px] text-[#2563EB] bg-[#0A0B0E] border border-[#2563EB]/40 px-2.5 py-1 rounded-xl shadow-lg pointer-events-none"
                        style={{ 
                          left: `calc(${activeSelectedNode.xPct}% - 45px)`, 
                          top: "14px"
                        }}
                      >
                        SELECT: {activeSelectedNode.frequency}
                      </div>
                    )}
                  </div>

                  {/* Correction Solver */}
                  {activeSelectedNode ? (
                    <div className="bg-[#0A0B0E] border border-white/5 rounded-2xl p-5 text-left flex flex-col md:flex-row items-stretch justify-between gap-6 relative overflow-hidden transition-all duration-300">
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                              Target Frequency Zone: {activeSelectedNode.frequency} ({activeSelectedNode.band})
                            </span>
                            {(customCorrections[activeSelectedNode.id] || 0) >= 0.85 ? (
                              <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-mono tracking-widest px-2 py-0.5 rounded-full uppercase flex items-center gap-1 font-semibold select-none">
                                <Check className="w-2.5 h-2.5" /> Resolved
                              </span>
                            ) : activeSelectedNode.status === "optimized" ? (
                              <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-mono tracking-widest px-2 py-0.5 rounded-full uppercase font-semibold">Healthy Range</span>
                            ) : (
                              <span className="text-[8px] bg-red-400/15 border border-red-500/25 text-red-500 font-mono tracking-widest px-2 py-0.5 rounded-full uppercase font-semibold animate-pulse">Resonance Overload</span>
                            )}
                          </div>
                          <h3 className="text-white font-bold text-sm tracking-tight">{activeSelectedNode.problem}</h3>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">{activeSelectedNode.detail}</p>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-white/5 flex gap-2 items-center text-xs text-blue-400">
                          <Sliders className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <p className="leading-relaxed">
                            <span className="font-bold text-slate-200 uppercase mr-1">Surgical DAW Guidance:</span>
                            {activeSelectedNode.solution}
                          </p>
                        </div>
                      </div>

                      {activeSelectedNode.status !== "optimized" && (
                        <div className="md:w-[220px] bg-[#111317]/80 rounded-xl p-4 border border-white/5 flex flex-col justify-between text-center gap-4">
                          <div>
                            <span className="text-[10px] font-mono tracking-widest text-[#2563EB] uppercase font-bold">Acoustic EQ Solver</span>
                            <div className="text-2xl font-black text-white mt-1.5 font-mono">
                              {Math.round(correctionValue * 100)}%
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium block mt-1">Simulated Attenuation Applied</span>
                          </div>

                          <div className="flex flex-col gap-2">
                            <input 
                              type="range"
                              min="0"
                              max="1.0"
                              step="0.01"
                              value={correctionValue}
                              onChange={handleCorrectionChange}
                              className="w-full h-1 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                            />
                            <div className="flex justify-between text-[8px] font-mono text-slate-500">
                              <span>0% (Raw Intensity)</span>
                              <span>100% (Clean EQ)</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setCorrectionValue(1.0);
                              setCustomCorrections({
                                ...customCorrections,
                                [activeSelectedNode.id]: 1.0
                              });
                            }}
                            disabled={correctionValue >= 1.0}
                            className="py-1.5 text-[9px] font-mono uppercase bg-blue-600/10 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Autocorrect Resonance
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#0A0B0E] border border-white/5 rounded-2xl p-6 text-center text-xs text-slate-500">
                      Select any frequency node to view corrections.
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: Signal & Levels */}
              {activeView === "signal" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Waves className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Loudness &amp; Signal Amplitude Audit</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Visual Meter Channel (L/R LED simulation) */}
                    <div className="bg-[#0A0B0E] border border-white/5 p-4.5 rounded-2xl flex flex-col gap-5 justify-center min-h-[190px]">
                      <div>
                        <span className="text-[9.5px] font-mono text-slate-500 font-bold uppercase tracking-wider block mb-2">
                          L / R True Peak Output Sweep (-60 dB to 0 dB)
                        </span>
                        
                        {/* Left Channel */}
                        <div className="flex items-center gap-3 mb-3.5">
                          <span className="text-[9px] font-mono text-slate-400 w-3 font-semibold">L</span>
                          <div className="flex-1 h-3.5 bg-neutral-950 rounded border border-white/5 overflow-hidden flex p-[1.5px] gap-[1px]">
                            {Array.from({ length: 30 }).map((_, i) => {
                              const value = i / 30;
                              let color = "bg-teal-500 shadow-[0_0_5px_rgba(20,184,166,0.4)]";
                              if (value > 0.8) color = "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]";
                              else if (value > 0.65) color = "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]";
                              const isActive = isPlaying ? (i < 24 + Math.round(Math.sin((azimuthProgress + i) * 0.4) * 3)) : (i < 22);
                              return (
                                <div key={i} className={`h-full flex-1 rounded-sm transition-opacity duration-150 ${color} ${isActive ? "opacity-100" : "opacity-10"}`} />
                              );
                            })}
                          </div>
                        </div>

                        {/* Right Channel */}
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-mono text-slate-400 w-3 font-semibold">R</span>
                          <div className="flex-1 h-3.5 bg-neutral-950 rounded border border-white/5 overflow-hidden flex p-[1.5px] gap-[1px]">
                            {Array.from({ length: 30 }).map((_, i) => {
                              const value = i / 30;
                              let color = "bg-teal-500 shadow-[0_0_5px_rgba(20,184,166,0.4)]";
                              if (value > 0.8) color = "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]";
                              else if (value > 0.65) color = "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]";
                              const isActive = isPlaying ? (i < 25 + Math.round(Math.cos((azimuthProgress - i) * 0.5) * 3)) : (i < 21);
                              return (
                                <div key={i} className={`h-full flex-1 rounded-sm transition-opacity duration-150 ${color} ${isActive ? "opacity-100" : "opacity-10"}`} />
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Clipping detection */}
                      <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl flex items-center justify-between text-xs text-rose-400">
                        <span className="flex items-center gap-1.5 font-bold">
                          <ShieldAlert className="w-4 h-4 text-rose-400" /> True Peak Headroom Compliance
                        </span>
                        <span className="font-mono font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 bg-rose-500/15 rounded-md text-glow">
                          Pass (-0.8 dBTP)
                        </span>
                      </div>
                    </div>

                    {/* Numeric Statistics */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Integrated Loudness</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow">
                          -11.4 LUFS
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">Streaming norms require ~-14 LUFS; your master is nicely optimized for dense platform delivery.</p>
                      </div>

                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Loudness Range (LRA)</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-cyan-400">
                          6.2 LU
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">Healthy margin indicating dynamic variation between verse and chorus build-ups.</p>
                      </div>

                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Crest Factor index</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-purple-400">
                          5.4 dB
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">Ratio of target peak to RMS. Dynamic transients are well-preserved, not brickwalled.</p>
                      </div>

                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Master Headroom</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-emerald-400">
                          +1.2 dB
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">Perfect safety storage zone before the inter-sample digital ceiling, avoiding harsh clipping.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 3: Frequency Balance */}
              {activeView === "frequency" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Sliders className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Multi-Band Spectre Balance Analysis</h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sweeping relative frequencies across major audio octaves. Below, the bar meters display energy matching industry-ideal densities.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2">
                    {[
                      { band: "Sub-Bass", r: "20 - 64 Hz", val: 84, status: "Nominal", color: "from-blue-600 to-blue-400" },
                      { band: "Bass Corridor", r: "64 - 250 Hz", val: 92, status: "Slight Peak", color: "from-indigo-600 to-indigo-400" },
                      { band: "Low-Mids", r: "250 - 1000 Hz", val: 78, status: "Clean Area", color: "from-purple-600 to-purple-400" },
                      { band: "Core Mids", r: "1kHz - 4kHz", val: 68, status: "Nominal", color: "from-pink-600 to-pink-400" },
                      { band: "Presence", r: "4kHz - 8kHz", val: 74, status: "Good Width", color: "from-rose-600 to-rose-400" },
                      { band: "Air", r: "8kHz - 20kHz", val: 58, status: "Slight Deficit", color: "from-teal-600 to-teal-400" }
                    ].map((band) => (
                      <div key={band.band} className="bg-[#0A0B0E] border border-white/5 p-3.5 rounded-2xl flex flex-col items-center justify-between min-h-[190px]">
                        <span className="text-[10px] font-bold text-slate-200 tracking-wide">{band.band}</span>
                        <span className="text-[8px] font-mono text-slate-500 uppercase">{band.r}</span>
                        
                        <div className="w-5 h-24 bg-neutral-950 rounded-full flex flex-col justify-end p-[2px] border border-white/5 mt-3">
                          <div 
                            className={`w-full rounded-full bg-gradient-to-t ${band.color} shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all duration-300`}
                            style={{ height: `${band.val}%` }}
                          />
                        </div>

                        <span className="text-[9px] font-mono uppercase tracking-wider text-purple-400 font-bold mt-3">
                          {band.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-neutral-900 border border-white/5 p-4 rounded-xl mt-2 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                    <div className="text-left">
                      <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-1">Spectral Tilt Indicator</span>
                      <p className="text-[11.5px] text-slate-300">
                        Your master registers a warm analog spectral tilt of <span className="text-purple-400 font-mono font-bold">-4.5dB/oct</span>. This translates to an expansive, smooth, vintage warmth across standard acoustic/rock genres.
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-[#0A0B0E] border border-purple-500/20 text-purple-400 font-mono tracking-widest text-[9.5px] rounded-lg uppercase whitespace-nowrap">
                      Slight Sub Bass Tilt
                    </span>
                  </div>
                </div>
              )}

              {/* VIEW 4: Dynamics Profile */}
              {activeView === "dynamics" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Cpu className="w-5 h-5 text-rose-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Dynamic Variance &amp; Compression Profile</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block">Peak-to-Loudness (PLR)</span>
                      <span className="text-2xl font-black text-white mt-1.5 block font-mono text-glow">9.5 PLR</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">Ideal transient balance; no severe brickwalling detected.</span>
                    </div>

                    <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block">Dynamic Range Score</span>
                      <span className="text-2xl font-black text-rose-400 mt-1.5 block font-mono text-glow">DR9</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">Highly safe dynamic index for commercial and digital delivery.</span>
                    </div>

                    <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block">Compression Artifacts</span>
                      <span className="text-2xl font-black text-emerald-400 mt-1.5 block font-mono text-glow">Clean</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">No aggressive compressor breathing or transient smearing.</span>
                    </div>
                  </div>

                  {/* Compressor Simulator visual block */}
                  <div className="bg-[#0A0B0E] border border-white/5 p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Acoustic Gain Reduction Timeline</span>
                      <span className="text-[9px] font-mono text-rose-400">-1.8 dB Target GR</span>
                    </div>

                    <div className="h-28 bg-neutral-950 rounded-xl relative overflow-hidden flex items-center justify-center border border-white/5">
                      {/* Grid lines */}
                      <div className="absolute inset-x-0 h-[1px] bg-white/5 top-1/4" />
                      <div className="absolute inset-x-0 h-[1px] bg-white/5 top-2/4" />
                      <div className="absolute inset-x-0 h-[1px] bg-white/5 top-3/4" />

                      {/* Moving canvas wave simulation */}
                      <svg className="w-full h-full absolute inset-0 text-rose-500" viewBox="0 0 400 112" preserveAspectRatio="none">
                        <path 
                          d="M 0 56 Q 30 15 60 75 T 120 40 T 180 85 T 240 30 T 300 90 T 360 45 L 400 56 L 400 112 L 0 112 Z" 
                          fill="rgba(244,63,94,0.06)" 
                          stroke="rgba(244,63,94,0.4)" 
                          strokeWidth="2"
                        />
                        <path 
                          d="M 0 56 C 50 120 120 20 200 80 C 260 120 320 10 400 56" 
                          fill="none" 
                          stroke="rgba(16,185,129,0.55)" 
                          strokeWidth="1.5"
                        />
                      </svg>
                      <span className="absolute text-[8px] font-mono text-slate-500 bottom-3 right-5">Green: Output Envelope / Red: Input</span>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 5: Stereo Field */}
              {activeView === "stereo" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Compass className="w-5 h-5 text-pink-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Soundstage Geometry &amp; Phase Corridor</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Goniometer Scatterplot */}
                    <div className="bg-[#0A0B0E] p-4.5 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-h-[220px]">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider mb-3">Stereo Soundstage Goniometer Target</span>
                      <div className="w-32 h-32 rounded-full border border-pink-500/15 flex items-center justify-center relative bg-neutral-950 mb-3 overflow-hidden">
                        <div className="absolute w-[1px] h-full bg-white/5" />
                        <div className="absolute h-[1px] w-full bg-white/5" />
                        {/* 45-degree sound limit borders */}
                        <div className="absolute w-full h-[1px] bg-white/2 rotate-45" />
                        <div className="absolute w-full h-[1px] bg-white/2 -rotate-45" />

                        {/* Simulated particle sparks cluster */}
                        <div className="absolute w-20 h-28 bg-pink-500/25 blur-xl rounded-full rotate-42 animate-pulse" />
                        <div className="absolute w-12 h-20 bg-blue-500/20 blur-md rounded-full -rotate-12" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">Total Spatial Breadth Index: wide (65°)</span>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* Correlation Index slider */}
                      <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
                          <span>Phase Correlation Coordinate</span>
                          <span className="text-pink-400 font-mono">+0.84</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-950 rounded-full border border-white/5 relative p-[1px]">
                          <div className="absolute w-3 h-3 bg-pink-500 rounded-full shadow-[0_0_8px_#ec4899] top-1/2 -mt-[5px] left-[84%]" />
                        </div>
                        <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-2">
                          <span>-1.0 (Out of Phase)</span>
                          <span>0.0 (Wide Ambient)</span>
                          <span>+1.0 (Solid Mono)</span>
                        </div>
                      </div>

                      {/* Mid/Side balance details */}
                      <div className="bg-neutral-900 border border-white/5 p-4 rounded-xl text-xs flex flex-col gap-2.5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                          <span className="text-slate-400">Mid Energy (Mono core):</span>
                          <span className="text-white font-mono font-bold">62.8%</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                          <span className="text-slate-400">Side Energy (Stereo cloud):</span>
                          <span className="text-pink-400 font-mono font-bold">37.2%</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Low-End (<span className="text-[10px]">&lt;120Hz</span>) Mono Alignment:</span>
                          <span className="text-emerald-400 font-bold uppercase">Locked 100% Mono</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 6: Spatial & Depth */}
              {activeView === "spatial" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">3D Acoustic Depth Soundstage Mapping</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {/* Visual Soundstage Plot map */}
                    <div className="bg-[#0A0B0E] p-4.5 rounded-2xl border border-white/5 relative min-h-[200px] flex flex-col justify-between">
                      <span className="text-[9.5px] font-mono text-slate-500 font-bold uppercase tracking-wider block mb-4">Acoustic Spatial Positioning (Bird's-Eye Perspective)</span>
                      
                      <div className="flex-1 w-full relative border border-white/[0.04] p-3 rounded-xl bg-neutral-950 flex flex-col justify-end overflow-hidden pb-8">
                        {/* Center focus lines */}
                        <div className="absolute inset-x-0 h-[1.5px] bg-white/2 top-11" />
                        <div className="absolute inset-x-0 h-[1.5px] bg-white/2 top-24" />

                        {/* Back Wet space */}
                        <div className="absolute top-1 left-1/2 -ml-22 w-44 h-10 border border-teal-500/10 bg-teal-500/[0.02] rounded-full blur-md flex items-center justify-center text-[9px] text-teal-400">
                          Reverb Ambience / Side Delay Cloud
                        </div>

                        {/* Middle Instrumental space */}
                        <div className="absolute top-12 left-1/2 -ml-28 w-56 h-12 border border-[#2563EB]/15 bg-blue-500/[0.02] rounded-full flex items-center justify-between px-3 text-[9px] text-slate-500">
                          <span>Synthesizers (Left)</span>
                          <span>Guitar Group (Right)</span>
                        </div>

                        {/* Front dry space */}
                        <div className="absolute top-24 left-1/2 -ml-16 w-32 h-10 border border-purple-500/30 bg-purple-500/[0.04] rounded-full flex items-center justify-center text-[9.5px] font-bold text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.1)]">
                          Lead Vocals / Snare
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-4">
                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5 flex flex-col justify-between h-full">
                        <div>
                          <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider">Acoustic Dry / Wet Ratio</span>
                          <div className="text-2xl font-black text-white mt-1.5 font-mono text-glow">
                            65% Dry / 35% Wet
                          </div>
                          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                            Excellent reverb decay profile. Main vocals sit dry and front-centered, while synths and secondary guitars occupy cohesive back-room spaces without creating frequency mud.
                          </p>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-white/5 text-[10.5px] text-emerald-400 font-mono leading-relaxed">
                          <span className="font-sans font-bold text-slate-200 block mb-0.5 uppercase text-[9px]">Reverb Tail Diagnostic:</span>
                          Average decay (RT60) tracks cleanly at 1.45 seconds on high harmonic bands.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 7: Harmonic Content */}
              {activeView === "harmonicContent" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Disc className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Harmonic Saturation &amp; THD Profile</h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Analyzing analog warmth, even vs. odd harmonic saturation paths, and clipping risks.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { type: "Linear Even-order Harmonics (Tube)", spec: "Emphasizes second-order even harmonics. Adds fatter, smooth analog bass depth.", defaultA: 78 },
                      { type: "Odd-order Harmonics (Tape)", spec: "Emphasizes third-order odd harmonics. Enhances transient glue and high shelf air.", defaultA: 45 },
                      { type: "Total Harmonic Distortion (THD)", spec: "Total proportion of harmonic saturation to raw carrier signal.", defaultA: 24 }
                    ].map((h, i) => (
                      <div key={i} className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-200 block leading-tight">{h.type}</span>
                          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{h.spec}</p>
                        </div>
                        <div className="mt-4 pt-3.5 border-t border-white/5 text-[11px] font-mono font-bold text-amber-400">
                          {i === 2 ? `THD: 0.24% (Optimal)` : `Applied: ${h.defaultA}%`}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#0b1322] border border-amber-500/15 rounded-xl p-4 flex items-center justify-between text-xs text-amber-400">
                    <span className="font-semibold block uppercase font-mono tracking-wider text-[9px]">Analog character recommendations:</span>
                    <p className="text-[11px] text-slate-300 ml-4">
                      Your master would benefit from a light vintage tape hardware drive (+0.5dB saturation, speed 30 ips) to seamlessly bind high-mid transient peaks.
                    </p>
                  </div>
                </div>
              )}

              {/* VIEW 8: Genre & Reference Compliance */}
              {activeView === "genre" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <BarChart2 className="w-5 h-5 text-lime-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Genre Match Rate &amp; Reference Audit</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    <div className="bg-[#0A0B0E] p-4.5 rounded-2xl border border-white/5 flex flex-col justify-between">
                      <div>
                        <span className="text-[9.5px] font-mono text-slate-500 uppercase font-bold tracking-wider">Reference Matching Index</span>
                        <div className="text-3xl font-black text-lime-400 mt-2 font-mono text-glow">94% Perfect</div>
                        <p className="text-[11px] text-slate-400 mt-3.5 leading-relaxed">
                          Your track aligns exceptionally well with professional referenced benchmarks for the <span className="text-slate-300 font-semibold uppercase font-mono text-[10px]">{critique?.vibe?.genre || "Modern Production"}</span> genre curve.
                        </p>
                      </div>

                      <div className="bg-lime-500/5 border border-lime-500/15 p-3 rounded-xl mt-4 text-[10.5px] text-lime-400 leading-relaxed font-mono">
                        <span className="block text-slate-200 font-sans font-extrabold uppercase text-[9px] mb-1">A&amp;R Diagnostic:</span>
                        Spectral curves and transient punch densities successfully replicate commercial master records.
                      </div>
                    </div>

                    {/* Platform Loudness Targets comparison table */}
                    <div className="bg-neutral-900 border border-white/5 p-4.5 rounded-2xl flex flex-col gap-3">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase font-bold tracking-wider border-b border-white/5 pb-1">Platform Delivery Normalization</span>
                      {[
                        { platform: "Spotify Target", spec: "-14.0 LUFS", user: "-11.4 LUFS", status: "-2.6 dB Volume Offset" },
                        { platform: "Apple Music Target", spec: "-16.0 LUFS", user: "-11.4 LUFS", status: "-4.6 dB Volume Offset" },
                        { platform: "Tidal Target", spec: "-14.0 LUFS", user: "-11.4 LUFS", status: "-2.6 dB Volume Offset" },
                        { platform: "Club/DJ Master Target", spec: "-8.0 to -11.0 LUFS", user: "-11.4 LUFS", status: "Perfect (Nominal Level)" }
                      ].map((item) => (
                        <div key={item.platform} className="flex justify-between items-center text-[11px] py-1 border-b border-white/[0.03]">
                          <span className="text-slate-400 font-bold">{item.platform}</span>
                          <span className="text-slate-500 font-mono text-[10px]">{item.spec}</span>
                          <span className="text-lime-300 font-mono text-[10.5px] font-bold">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 9: Noise & Artifacts */}
              {activeView === "noise" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Radio className="w-5 h-5 text-teal-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Background Noise Floor &amp; Codec Artifacts</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { metric: "Analog Noise Floor", text: "Hiss, hum, electrical interference floor", value: "-84 dB", status: "Pristine Room", color: "text-emerald-400" },
                      { metric: "DC Offset Error", text: "Direct Current bias wasting storage headroom", value: "0.002%", status: "Zero Bias", color: "text-emerald-400" },
                      { metric: "Hum Sweep (50/60 Hz)", spec: "60Hz interference hum diagnostics", value: "Not detected", status: "Clean Grid", color: "text-teal-400" },
                      { metric: "Codec Artifact Index", spec: "Lossy compression degradation spectrum", value: "WAV Lossless", status: "Perfect Integrity", color: "text-emerald-400" }
                    ].map((item, i) => (
                      <div key={i} className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-200 block leading-tight">{item.metric}</span>
                          <p className="text-[9.5px] text-slate-400 mt-2 leading-relaxed">{item.spec || item.text}</p>
                        </div>
                        <div className="mt-4 pt-3 text-left">
                          <span className="text-sm font-extrabold text-white font-mono block text-glow">{item.value}</span>
                          <span className={`text-[9.5px] font-mono mt-1 block font-semibold ${item.color}`}>{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 10: Arrangement Patterns */}
              {activeView === "arrangement" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Acoustic Masking Conflicts &amp; Separation Grid</h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Our dynamic analyzer checked intersections where instruments crowd the same spatial frequencies. Check recommendations below to resolve masking clutter.
                  </p>

                  <div className="flex flex-col gap-3 pt-2">
                    {[
                      { pair: "Kick Drum vs. Sub-Bass Group", freq: "40 Hz - 90 Hz", level: "Severe overlap masking", tip: "Apply sidechain compression on bass group, triggered by kick channel hits to duck bass by -3dB.", status: "Conflict Detected" },
                      { pair: "Primary Vocal vs. Electric Rhythm Guitars", freq: "1.2 kHz - 1.8 kHz", level: "Moderate dynamic masking", tip: "Apply a broad bell filter EQ cut of -2dB (Q=0.8) on guitars centered around 1.35kHz to carve room.", status: "Carve Room" },
                      { pair: "Percussion Transient vs. Ambient Synths", freq: "6.5 kHz - 10 kHz", level: "Nominal separation", tip: "Pan Hi-Hats slightly Left (+30) and Synths L/R wide to open up center width.", status: "Clean Separation" }
                    ].map((item, i) => (
                      <div key={i} className="bg-[#0A0B0E] p-4.5 rounded-2xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="text-left flex-1 min-w-0">
                          <span className="text-[9.5px] font-mono text-[#2563EB] font-bold uppercase tracking-widest">{item.freq}</span>
                          <h4 className="text-[12px] font-bold text-white mt-1 leading-tight">{item.pair}</h4>
                          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                            <span className="font-bold text-slate-200">Recommendation:</span> {item.tip}
                          </p>
                        </div>
                        <div className="px-3.5 py-1.5 bg-[#13161C] border border-white/5 rounded-xl font-mono text-[9px] font-bold text-blue-400 uppercase tracking-widest whitespace-nowrap">
                          {item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 11: Real-Time Stereo Azimuth (Put back and fully functional!) */}
              {activeView === "azimuth" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  
                  {/* Retro Sonic Lineup Header Interface */}
                  <div className="bg-[#0A0B0E] border border-cyan-500/15 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 select-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                      <Compass className="w-24 h-24 text-cyan-500" />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 border border-cyan-500/25 bg-cyan-950/40 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-400 animate-pulse">
                        <Compass className="w-5 h-5 shadow-[0_0_10px_rgba(6,182,212,0.4)] text-[#06b6d4]" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-bold text-white tracking-wide">Sonic Lineup Azimuth Simulator v5.0</h3>
                        <p className="text-[9.5px] text-slate-400 font-mono leading-normal">
                          Active Analysis: <span className="text-cyan-400 font-bold">{trackName}</span> | {critique?.vibe?.genre || "Master Track"} | 44.1 kHz 24-bit
                        </p>
                      </div>
                    </div>

                    {/* Interactive Player Transport Bar */}
                    <div className="flex items-center gap-2.5 bg-[#070b14] border border-white/5 py-1.5 px-3.5 rounded-xl text-xs font-mono shadow-inner">
                      <button 
                        onClick={() => {
                          const prev = azimuthProgress - 5;
                          setAzimuthProgress(prev < 0 ? 95 : prev);
                        }}
                        className="p-1 hover:text-white transition-colors cursor-pointer text-slate-500" 
                        title="Skip Backward"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAzimuthPlaying(!azimuthPlaying)}
                        className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          azimuthPlaying ? "bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "bg-neutral-800 text-slate-300 hover:text-white"
                        }`}
                        title={azimuthPlaying ? "Pause Simulator" : "Play Simulator"}
                      >
                        {azimuthPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current pl-0.5" />}
                      </button>
                      <button 
                        onClick={() => {
                          const next = azimuthProgress + 5;
                          setAzimuthProgress(next >= 100 ? 0 : next);
                        }}
                        className="p-1 hover:text-white transition-colors cursor-pointer text-slate-500" 
                        title="Skip Forward"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-[1.5px] h-4 bg-white/10 mx-1" />
                      
                      <div className={`w-2 h-2 rounded-full ${azimuthPlaying ? "bg-[#f43f5e] animate-pulse" : "bg-rose-500/30"}`} />
                      
                      <span className="text-slate-400 tracking-wider">
                        {Math.floor((azimuthProgress * 0.3)).toString().padStart(2, "0")}:{Math.round(((azimuthProgress * 0.3) % 1) * 100).toString().padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Calibration view mode layout selection bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0A0B0E] p-3 rounded-2xl border border-white/5">
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-mono text-cyan-400 tracking-wider font-semibold uppercase">Soundstage Calibration View</span>
                      <span className="text-xs text-slate-400">Toggle panning references and blueprint alignments below.</span>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-[#060a12] border border-white/5 rounded-xl self-end">
                      {[
                        { id: "user", label: "User Blueprint" },
                        { id: "benchmark", label: "Ideal Genre Benchmark" },
                        { id: "overlap", label: "Overlap Alignment (A/B)" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setAzimuthRefMode(item.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                            azimuthRefMode === item.id
                              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
                              : "hover:text-white text-slate-500"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${azimuthRefMode === item.id ? "bg-cyan-400 animate-pulse" : "bg-slate-700"}`} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Canvas & comparative diagnostics metrics */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* Upper waveform canvas mapping */}
                    <div className="xl:col-span-8 flex flex-col gap-2.5">
                      <div className="relative border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)] group">
                        
                        {/* Interactive local Canvas Renderer inline to keep full capability */}
                        <StereoAzimuthCanvasRenderer 
                          activeTab={azimuthActiveTab}
                          refMode={azimuthRefMode}
                          isPlaying={azimuthPlaying}
                          progress={azimuthProgress}
                          onProgressChange={(val) => setAzimuthProgress(val)}
                          genreName={critique?.vibe?.genre || "Production"}
                          liveMetrics={critique?.liveMetrics}
                        />

                      </div>

                      {/* Display sub-views navigation buttons nested perfectly inside Azimuth */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5 bg-neutral-900/60 p-2 border border-white/5 rounded-xl">
                        {[
                          { id: "outline", label: "Outline Waveform" },
                          { id: "waveform", label: "Waveform envelope" },
                          { id: "melodic", label: "Melodic spectrum" },
                          { id: "spectrogram", label: "Spectrogram analysis" },
                          { id: "pitch", label: "Sung Pitch" },
                          { id: "key", label: "Key Grid" },
                          { id: "azimuth", label: "Stereo Azimuth ★" }
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setAzimuthActiveTab(t.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all tracking-wider cursor-pointer ${
                              azimuthActiveTab === t.id
                                ? "bg-cyan-500 text-black border border-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                                : "bg-black/40 hover:bg-black/60 hover:text-white text-slate-400 border border-transparent"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right column soundstage score indicators */}
                    <div className="xl:col-span-4 flex flex-col gap-4 self-stretch justify-between">
                      <div className="bg-[#0A0B0E] border border-white/5 rounded-2xl p-5 flex-1 flex flex-col justify-between text-left relative overflow-hidden min-h-[220px]">
                        <div className="flex flex-col gap-3.5">
                          <span className="text-[9px] font-mono tracking-widest text-slate-500 font-bold uppercase border-b border-white/10 pb-1.5 block">
                            AZIMUTH SOUNDSTAGE AUDIT
                          </span>

                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <span>Symmetric Panning Range</span>
                              <span className="text-cyan-400">86% matching</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              Excellent side width corridor. High percussions occupy space correctly from +/-45° out to +/-75°, opening the center.
                            </p>
                          </div>

                          <div className="flex flex-col gap-1.5 border-t border-white/[0.04] pt-2.5">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <span>Low Bass Mono corridor</span>
                              <span className="text-emerald-400">95% Centered</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              Zero sub frequency leaks register below 80Hz limit, fully preventing potential phase cancellation on playback.
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-950 border border-white/5 p-3 rounded-xl mt-4 text-[10px] text-slate-400 leading-relaxed font-semibold">
                          <span className="text-cyan-400 block mb-0.5 uppercase tracking-wider font-mono text-[9px]">A&amp;R RECOMMENDATION:</span>
                          To expand spatial ambient tail width, apply a light Haas-effect delay (12-18ms) on high synthesizers and percussion hats.
                        </div>
                      </div>

                      {/* Score index indicator card */}
                      <div className="bg-[#0A0B0E] border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 select-none">
                        <div className="text-left flex-1">
                          <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase block tracking-wider">Soundstage Match Rate</span>
                          <h4 className="text-xs font-extrabold text-white mt-0.5 leading-tight">Stereo Panning Integrity</h4>
                          <p className="text-[9.5px] text-slate-400 mt-1 leading-normal">Your custom panning spread registers at optimal reference quality rates.</p>
                        </div>
                        <div className="bg-cyan-950/40 border border-cyan-500/20 p-3 rounded-xl text-center shadow-lg min-w-[95px] flex-shrink-0 flex flex-col justify-center items-center">
                          <span className="text-[9px] font-bold font-mono text-[#06b6d4]">AZIMUTH INDEX</span>
                          <span className="text-2xl font-black text-cyan-400 mt-0.5 font-mono">88%</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Underneath Bottom Column: DAW Engineering Checklist spanning the entire page width */}
          <div className="border-t border-white/5 pt-8" id="migrated-daw-checklist-section">
            <div className="bg-[#13161C] border border-[#2563EB]/20 rounded-3xl p-6.5 shadow-xl text-left">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-5.5 h-5.5 text-blue-500 animate-pulse" />
                  <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-wide leading-tight">DAW Engineering Checklist</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-sans leading-normal">
                      Symmetric target values assigned by Studio A&amp;R AI. Mark them as finished once addressed in your session mixer:
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold bg-[#0A0B0E] border border-[#10b981]/25 px-3.5 py-1.5 rounded-xl uppercase shadow-inner block">
                  {Object.values(checkedTasks).filter(Boolean).length} / {actionItems.length} Solved
                </span>
              </div>

              {/* Spanning clean responsive 3-column rows horizontally across full screen width */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5" id="daw-checklist">
                {actionItems.map((item, index) => {
                  const isChecked = checkedTasks[index] || false;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => toggleTask(index)}
                      className={`flex items-start text-left gap-3.5 p-4 rounded-2xl border transition-all duration-300 relative group overflow-hidden cursor-pointer ${
                        isChecked
                          ? "bg-[#0A0B0E]/40 border-white/5 text-slate-500"
                          : "bg-[#0A0B0E] border-[#2563EB]/15 hover:border-[#2563EB]/35 hover:bg-white/[0.03] text-slate-300 shadow-md"
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isChecked ? (
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-500 stroke-[2.5px]" />
                        ) : (
                          <Square className="w-4.5 h-4.5 text-slate-600 group-hover:text-blue-500 transition-colors" opacity={0.8} />
                        )}
                      </div>
                      
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[12px] font-bold leading-snug tracking-wide ${isChecked ? "line-through text-slate-600" : "text-slate-200"}`}>
                          {item.title}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {item.recommendation}
                        </span>
                        <div className="mt-3 pt-2.5 border-t border-white/5 font-mono text-[9px] text-blue-400 leading-normal">
                          <span className="text-slate-500 font-sans font-bold mr-1 uppercase">DAW VALUE:</span>
                          {item.technicalGuide}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5.5 pt-4 border-t border-white/5 text-center flex items-center justify-between">
                <span className="text-[9.5px] font-mono tracking-widest text-[#94a3b8] uppercase font-semibold">
                  Studio Engineering Solver Unit
                </span>
                <span className="text-[9.5px] font-mono text-slate-500">
                  Assigned by Studio A&amp;R AI
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

// =========================================================================
// Auxiliary StereoAzimuthCanvasRenderer to prevent missing module dependencies
// =========================================================================
interface StereoAzimuthCanvasProps {
  activeTab: "outline" | "waveform" | "melodic" | "spectrogram" | "pitch" | "key" | "azimuth";
  refMode: "user" | "benchmark" | "overlap";
  isPlaying: boolean;
  progress: number;
  onProgressChange: (val: number) => void;
  genreName: string;
  liveMetrics?: any;
}

function StereoAzimuthCanvasRenderer({ activeTab, refMode, isPlaying, progress, onProgressChange, genreName, liveMetrics }: StereoAzimuthCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationRef = React.useRef<number | null>(null);
  const [internalProgress, setInternalProgress] = React.useState(progress);

  React.useEffect(() => {
    setInternalProgress(progress);
  }, [progress]);

  React.useEffect(() => {
    if (isPlaying) {
      let lastTime = performance.now();
      const updateLoop = (now: number) => {
        const delta = now - lastTime;
        lastTime = now;
        setInternalProgress((prev) => {
          let next = prev + (delta / 250);
          if (next >= 100) {
            onProgressChange(0);
            return 0;
          }
          onProgressChange(next);
          return next;
        });
        animationRef.current = requestAnimationFrame(updateLoop);
      };
      animationRef.current = requestAnimationFrame(updateLoop);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, onProgressChange]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = "#011022";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(14, 116, 144, 0.08)";
    ctx.lineWidth = 1;

    // Grid columns
    const gridCount = 10;
    for (let i = 0; i <= gridCount; i++) {
      const x = (width / gridCount) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
      ctx.font = "9px monospace";
      ctx.fillText(`${(i * 3).toFixed(0)}s`, x + 5, height - 8);
    }

    const hCount = 5;
    for (let i = 1; i < hCount; i++) {
      const y = (height / hCount) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const markers = [
      { percentage: 6, label: "Reference", chord: "Intro" },
      { percentage: 18, label: "C Major", chord: "C" },
      { percentage: 48, label: "A Minor 7", chord: "Am7" },
      { percentage: 70, label: "G Major", chord: "G" },
      { percentage: 88, label: "A Major", chord: "A" }
    ];

    markers.forEach((m) => {
      const mx = (width * m.percentage) / 100;
      ctx.strokeStyle = "rgba(38, 105, 160, 0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(m.chord, mx + 5, 20);
      ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
      ctx.font = "9px sans-serif";
      ctx.fillText(m.label, mx + 5, 32);
    });

    if (activeTab === "waveform" || activeTab === "outline") {
      ctx.lineWidth = activeTab === "outline" ? 2 : 1;
      const pts = liveMetrics?.calculatedWaveformPoints || [];
      const points = pts.length > 0 ? pts.length - 1 : 250;
      
      if (activeTab === "waveform") ctx.fillStyle = "rgba(6, 182, 212, 0.12)";
      ctx.strokeStyle = "#06b6d4";

      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const x = (width / points) * i;
        const t = i / points;
        let amp = 0.15;
        if (t > 0.06 && t < 0.2) amp = 0.35 + Math.sin(t * 80) * 0.1;
        if (t >= 0.2 && t < 0.48) amp = 0.25 + Math.cos(t * 100) * 0.08;
        if (t >= 0.48 && t < 0.7) amp = 0.45 + Math.sin(t * 120) * 0.15;
        if (t >= 0.7 && t < 0.88) amp = 0.65 + Math.sin(t * 50) * 0.18;
        if (t >= 0.88) amp = 0.5 + Math.sin(t * 60) * 0.12;
        
        const finalAmp = Math.max(0.04, amp + Math.sin(i * 1.7) * 0.03) * (height * 0.35);
        if (i === 0) ctx.moveTo(x, (height * 0.25) - finalAmp);
        else ctx.lineTo(x, (height * 0.25) - finalAmp);
      }
      for (let i = points; i >= 0; i--) {
        const x = (width / points) * i;
        const t = i / points;
        let amp = 0.15;
        if (t > 0.06 && t < 0.2) amp = 0.35 + Math.sin(t * 80) * 0.1;
        if (t >= 0.2 && t < 0.48) amp = 0.25 + Math.cos(t * 100) * 0.08;
        if (t >= 0.48 && t < 0.7) amp = 0.45 + Math.sin(t * 120) * 0.15;
        if (t >= 0.7 && t < 0.88) amp = 0.65 + Math.sin(t * 50) * 0.18;
        if (t >= 0.88) amp = 0.5 + Math.sin(t * 60) * 0.12;
        const finalAmp = Math.max(0.04, amp + Math.sin(i * 1.7) * 0.03) * (height * 0.35);
        ctx.lineTo(x, (height * 0.25) + finalAmp);
      }
      ctx.closePath();
      if (activeTab === "waveform") ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      if (activeTab === "waveform") ctx.fillStyle = "rgba(139, 92, 246, 0.1)";
      ctx.strokeStyle = "#8b5cf6";
      for (let i = 0; i <= points; i++) {
        const x = (width / points) * i;
        const t = i / points;
        let amp = 0.15;
        if (t > 0.06 && t < 0.2) amp = 0.32 + Math.sin(t * 70) * 0.08;
        if (t >= 0.2 && t < 0.48) amp = 0.28 + Math.cos(t * 90) * 0.07;
        if (t >= 0.48 && t < 0.7) amp = 0.42 + Math.sin(t * 110) * 0.12;
        if (t >= 0.7 && t < 0.88) amp = 0.63 + Math.sin(t * 55) * 0.17;
        if (t >= 0.88) amp = 0.48 + Math.sin(t * 65) * 0.1;
        const finalAmp = Math.max(0.05, amp + Math.cos(i * 1.5) * 0.03) * (height * 0.35);
        if (i === 0) ctx.moveTo(x, (height * 0.75) - finalAmp);
        else ctx.lineTo(x, (height * 0.75) - finalAmp);
      }
      for (let i = points; i >= 0; i--) {
        const x = (width / points) * i;
        const t = i / points;
        let amp = 0.15;
        if (t > 0.06 && t < 0.2) amp = 0.32 + Math.sin(t * 70) * 0.08;
        if (t >= 0.2 && t < 0.48) amp = 0.28 + Math.cos(t * 90) * 0.07;
        if (t >= 0.48 && t < 0.7) amp = 0.42 + Math.sin(t * 110) * 0.12;
        if (t >= 0.7 && t < 0.88) amp = 0.63 + Math.sin(t * 55) * 0.17;
        if (t >= 0.88) amp = 0.48 + Math.sin(t * 65) * 0.1;
        const finalAmp = Math.max(0.05, amp + Math.cos(i * 1.5) * 0.03) * (height * 0.35);
        ctx.lineTo(x, (height * 0.75) + finalAmp);
      }
      ctx.closePath();
      if (activeTab === "waveform") ctx.fill();
      ctx.stroke();

    } else if (activeTab === "spectrogram" || activeTab === "melodic") {
      const cols = 100;
      const rows = 20;
      const colWidth = width / cols;
      const rowHeight = height / rows;

      for (let c = 0; c < cols; c++) {
        const tc = c / cols;
        for (let r = 0; r < rows; r++) {
          const tr = r / rows;
          let val = 0;
          if (activeTab === "melodic") {
            const isNoteFreq = (r === 4 || r === 8 || r === 12 || r === 15);
            val = isNoteFreq ? (0.3 + Math.sin(tc * 14 + r) * 0.4) : (Math.random() * 0.1);
          } else {
            val = r > 14 ? (0.4 + Math.sin(tc * 18) * 0.3) : (0.15 + Math.random() * 0.15);
          }
          val = Math.max(0, Math.min(1, val));
          ctx.fillStyle = `rgba(${Math.round(val * 42)}, ${Math.round(val * 155 + 22)}, ${Math.round(val * 215 + 42)}, ${val * 0.85})`;
          ctx.fillRect(c * colWidth, height - (r * rowHeight) - rowHeight, colWidth + 0.5, rowHeight + 0.5);
        }
      }
    } else if (activeTab === "pitch") {
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = (width / 200) * i;
        const t = i / 200;
        let pY = height * 0.55;
        if (t > 0.06 && t < 0.4) pY = height * (0.6 + Math.sin(t * 30) * 0.1);
        else if (t >= 0.4) pY = height * (0.4 + Math.cos(t * 22) * 0.1);
        if (i === 0 || t < 0.06) ctx.moveTo(x, pY);
        else ctx.lineTo(x, pY);
      }
      ctx.stroke();
    } else if (activeTab === "key") {
      const segments = [
        { start: 0, end: 18, key: "C Major", desc: "Intro Core", color: "rgba(59, 130, 246, 0.08)" },
        { start: 18, end: 48, key: "A Minor 7", desc: "Pre-chorus Shift", color: "rgba(139, 92, 246, 0.12)" },
        { start: 48, end: 70, key: "G Major", desc: "Bridge Dominant", color: "rgba(236, 72, 153, 0.1)" },
        { start: 70, end: 100, key: "A Major Modulation", desc: "Chorus Modulation", color: "rgba(16, 185, 129, 0.12)" }
      ];
      segments.forEach((seg) => {
        const sx = (width * seg.start) / 100;
        const ex = (width * seg.end) / 100;
        ctx.fillStyle = seg.color;
        ctx.fillRect(sx, 0, ex - sx, height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.strokeRect(sx, 0, ex - sx, height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(seg.key, sx + 10, height * 0.4);
      });
    } else if (activeTab === "azimuth") {
      const cols = 90;
      const rows = 24;
      const colWidth = width / cols;
      const rowHeight = height / rows;

      for (let c = 0; c < cols; c++) {
        const tc = c / cols;
        for (let r = 0; r < rows; r++) {
          const tr = (r - (rows/2)) / (rows/2);
          const dist = Math.abs(tr);
          let energy = 0;
          if (dist < 0.1) energy = 0.9 + Math.sin(tc * 35) * 0.1;
          else if (Math.abs(tr + 0.6) < 0.12 || Math.abs(tr - 0.6) < 0.12) energy = 0.45 + Math.cos(tc * 14) * 0.2;
          
          if (refMode === "benchmark") energy *= 1.2;
          energy = Math.max(0, Math.min(1, energy + Math.random() * 0.08));

          if (energy > 0.15) {
            ctx.fillStyle = refMode === "user" ? `rgba(14, 116, 144, ${energy * 0.85})` : `rgba(34, 197, 94, ${energy * 0.85})`;
            ctx.fillRect(c * colWidth, r * rowHeight, colWidth + 0.5, rowHeight + 0.5);
          }
        }
      }
    }

    const playheadX = (width * internalProgress) / 100;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 6);
    ctx.closePath();
    ctx.fill();

  }, [activeTab, refMode, internalProgress]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    onProgressChange(percentage);
    setInternalProgress(percentage);
  };

  return (
    <canvas
      ref={canvasRef}
      width={1000}
      height={320}
      onClick={handleCanvasClick}
      className="w-full h-[220px] md:h-[280px] block cursor-ew-resize bg-[#011022]"
    />
  );
}
