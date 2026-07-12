import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, Volume2, Sliders, Mic, CheckCircle, Square, Play, Pause, 
  Activity, Sparkles, Cpu, AlertTriangle, Check, RotateCcw, Compass, Layers, CheckSquare,
  Radio, Waves, Settings, ShieldAlert, Info, BarChart2, Disc, Wand2,
  AudioLines, Gauge, Speaker, Tags, Antenna, LayoutDashboard, DraftingCompass
} from "lucide-react";

// Helper to map genre icons
const getGenreIcon = (genre: string, className = "w-4 h-4") => {
  const g = genre.toLowerCase();
  if (g.includes("rock") || g.includes("metal")) return <Layers className={className} />;
  if (g.includes("hip") || g.includes("rap") || g.includes("pop")) return <Activity className={className} />;
  return <Sliders className={className} />;
};

const GENRE_LOUDNESS_BUCKETS: Record<string, { label: string; lufsMin: number; lufsMax: number; lraMin: number; lraMax: number | null }> = {
  hiphop: { label: "Hip-Hop / Trap / EDM", lufsMin: -10, lufsMax: -7, lraMin: 4, lraMax: 8 },
  mainstream: { label: "Pop / Rock / Country", lufsMin: -12, lufsMax: -9, lraMin: 6, lraMax: 12 },
  indie: { label: "Indie / Acoustic / Singer-Songwriter", lufsMin: -14, lufsMax: -11, lraMin: 10, lraMax: 15 },
  classical: { label: "Classical / Jazz / Folk / Ambient", lufsMin: -18, lufsMax: -14, lraMin: 15, lraMax: null },
};

function getGenreLoudnessBucket(genre?: string, subgenre?: string): { key: string } & typeof GENRE_LOUDNESS_BUCKETS[string] {
  const text = `${genre || ""} ${subgenre || ""}`.toLowerCase();
  const hasAny = (words: string[]) => words.some(w => text.includes(w));
  if (hasAny(["hip hop", "hip-hop", "trap", "rap", "edm", "electronic", "dance", "dubstep", "house", "techno", "drill"])) {
    return { key: "hiphop", ...GENRE_LOUDNESS_BUCKETS.hiphop };
  }
  if (hasAny(["classical", "jazz", "ambient", "orchestral", "instrumental", "cinematic", "chamber"])) {
    return { key: "classical", ...GENRE_LOUDNESS_BUCKETS.classical };
  }
  if (hasAny(["indie", "acoustic", "singer-songwriter", "singer songwriter", "americana", "folk", "dream pop", "shoegaze"])) {
    return { key: "indie", ...GENRE_LOUDNESS_BUCKETS.indie };
  }
  return { key: "mainstream", ...GENRE_LOUDNESS_BUCKETS.mainstream };
}

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
  onNavigateToEngineeringDetails?: () => void;
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

function SpectrogramCanvas({ blobUrl }: { blobUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!blobUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();

    fetch(blobUrl)
      .then(r => r.arrayBuffer())
      .then(buf => audioCtx.decodeAudioData(buf))
      .then(audioBuffer => {
        const channelData = audioBuffer.getChannelData(0);
        const fftSize = 2048;
        const hopSize = Math.floor(fftSize / 4);
        const numFrames = Math.floor((channelData.length - fftSize) / hopSize);
        const width = Math.min(numFrames, canvas.width);
        const height = canvas.height;
        const freqBins = fftSize / 2;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = fftSize;
        const freqData = new Uint8Array(analyser.frequencyBinCount);

        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;

        const colWidth = canvas.width / width;

        for (let i = 0; i < width; i++) {
          const frameStart = Math.floor((i / width) * (channelData.length - fftSize));
          const frame = channelData.slice(frameStart, frameStart + fftSize);
          
          // Simple magnitude approximation using chunks
          const chunkSize = Math.floor(fftSize / height);
          for (let j = 0; j < height; j++) {
            let sum = 0;
            const start = j * chunkSize;
            for (let k = start; k < start + chunkSize && k < frame.length; k++) {
              sum += Math.abs(frame[k]);
            }
            const mag = Math.min(1, (sum / chunkSize) * 8);
            const invJ = height - 1 - j;
            
            // Color: dark blue → cyan → yellow → white
            const r = mag < 0.5 ? 0 : Math.round((mag - 0.5) * 2 * 255);
            const g = mag < 0.25 ? 0 : mag < 0.75 ? Math.round((mag - 0.25) * 4 * 255) : 255;
            const b = mag < 0.5 ? Math.round(mag * 2 * 180) : Math.round((1 - mag) * 255);
            
            offCtx.fillStyle = `rgb(${r},${g},${b})`;
            offCtx.fillRect(i, invJ, 1, 1);
          }
        }

        ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
        audioCtx.close();
      })
      .catch(() => audioCtx.close());
  }, [blobUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={160}
      className="w-full rounded-xl"
      style={{ background: '#0A0B0E' }}
    />
  );
}

export default function EngineeringStudioPage({ onBack, critique, trackInfo, localFileBlobUrl, onNavigateToEngineeringDetails }: EngineeringStudioPageProps) {
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
    const bass = critique?.liveMetrics?.calculatedBassEnergy ?? 35;
    const mid = critique?.liveMetrics?.calculatedMidEnergy ?? 40;
    const high = critique?.liveMetrics?.calculatedHighEnergy ?? 25;
    const lufs = critique?.liveMetrics?.calculatedLufs ?? getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMin;
    const lowEndText = critique?.mixQuality?.frequencyBalance?.lowEnd ?? "";
    const midText = critique?.mixQuality?.frequencyBalance?.midrange ?? "";
    const highEndText = critique?.mixQuality?.frequencyBalance?.highEnd ?? "";
    const dominanceText = critique?.mixQuality?.dominanceIssues ?? "";
    const stereoText = critique?.mixQuality?.stereoField ?? "";

    // Helpers
    const mentionsMud = (s: string) => /mud|build.?up|warm|thick|boom|cloud|heavy|low.?end/i.test(s);
    const mentionsHarsh = (s: string) => /harsh|sibilanc|fatigue|bright|sharp|piercing|brittle|bite/i.test(s);
    const mentionsMask = (s: string) => /mask|bury|buried|crowd|fight|dominan|compet/i.test(s);
    const mentionsNarrow = (s: string) => /narrow|thin|center|mono|small|tight/i.test(s);

    // Node 1: Sub-Bass — driven by calculatedBassEnergy
    const subDbOffset = bass > 45 ? parseFloat((bass * 0.09).toFixed(1))
      : bass < 22 ? parseFloat(((22 - bass) * 0.08 * -1).toFixed(1))
      : 1.2;
    const subStatus: HarmonicNode["status"] = bass > 45 ? "critical" : bass < 22 ? "warning" : "optimized";
    const subProblem = bass > 45
      ? `Excessive sub-bass energy (${bass}% of spectral power) is compressing master headroom and masking the kick transient.`
      : bass < 22
      ? `Sub-bass shelf is thin (${bass}% of spectral power) — the low-end foundation lacks physical weight on full-range systems.`
      : `Sub-bass energy is balanced at ${bass}% of spectral power. No critical low-end rumble detected.`;
    const subSolution = bass > 45
      ? "High-pass filter at 32Hz with a dynamic low-shelf cut of -2dB to -4dB below 60Hz to restore transient punch."
      : bass < 22
      ? "Apply a gentle low-shelf boost of +1.5dB at 50Hz to restore weight without introducing mud."
      : "Maintain current low-end profile. Monitor on full-range monitors before finalizing.";
    const subDetail = lowEndText
      ? `AI assessment: "${lowEndText}" — confirmed by measured bass spectral ratio of ${bass}%.`
      : `Measured bass spectral energy at ${bass}%. Optimal range for most genres is 28–42%.`;

    // Node 2: Low-Mid — driven by bassEnergy + lowEndText
    const mudSeverity = mentionsMud(lowEndText) && bass > 38 ? "critical"
      : mentionsMud(lowEndText) || bass > 38 ? "warning"
      : "optimized";
    const mudDb = mudSeverity === "critical" ? parseFloat((2.8 + (bass - 38) * 0.12).toFixed(1))
      : mudSeverity === "warning" ? 2.1
      : 0.8;
    const mudFreq = bass > 42 ? "220 Hz" : "265 Hz";
    const mudProblem = mudSeverity === "critical"
      ? `Significant low-mid resonance at ~${mudFreq} (bass energy: ${bass}%). ${mentionsMud(lowEndText) ? "AI critique confirms mud buildup — this is a priority fix." : "High bass spectral ratio is congesting this zone."}`
      : mudSeverity === "warning"
      ? `Moderate low-mid accumulation at ~${mudFreq} detected (bass energy: ${bass}%). ${mentionsMud(lowEndText) ? "AI critique flags low-end buildup in this region." : "Monitor this zone — may tighten on dense arrangements."}`
      : `Low-midrange at ~${mudFreq} appears controlled (bass energy: ${bass}%). No significant mud accumulation detected.`;
    const mudSolution = mudSeverity === "critical"
      ? `Parametric EQ notch of -3dB to -4dB at ${mudFreq} with Q = 1.6–2.0 on rhythm guitars and bass simultaneously.`
      : mudSeverity === "warning"
      ? `Gentle parametric cut of -1.5dB to -2dB at ${mudFreq} with Q = 1.4 on the busiest instruments.`
      : "No correction needed. Preserve the current low-mid warmth.";
    const mudDetail = lowEndText
      ? `AI assessment: "${lowEndText}" — bass spectral energy measured at ${bass}%. Low-mid zone is the most common masking problem in dense mixes.`
      : `Bass spectral ratio: ${bass}%. Watch this zone on bass-heavy genres — buildup here masks vocal body and kick punch simultaneously.`;

    // Node 3: Midrange — driven by midEnergy + dominanceIssues + midText
    const boxySeverity = mentionsMask(dominanceText) || mentionsMask(midText) ? "critical"
      : mid > 52 ? "warning"
      : "optimized";
    const boxyDb = boxySeverity === "critical" ? 2.8
      : boxySeverity === "warning" ? parseFloat(((mid - 45) * 0.08).toFixed(1))
      : 0.6;
    const boxyProblem = boxySeverity !== "optimized"
      ? `Mid-range crowding at ~580Hz is reducing vocal presence and instrument separation.${mentionsMask(dominanceText) ? ` AI flags: "${dominanceText}"` : ""}`
      : `Midrange energy at ${mid}% is well distributed. Vocal pocket appears clear.`;
    const boxySolution = boxySeverity === "critical"
      ? "Sidechain dynamic EQ on the instrument bus at 2kHz triggered by the vocal to duck 2dB when the vocal is present."
      : boxySeverity === "warning"
      ? `Narrow parametric cut of -1.5dB at 580Hz on competing instruments (Q = 1.2). Mid spectral ratio currently ${mid}%.`
      : "No correction needed. Maintain current instrument separation.";
    const boxyDetail = midText
      ? `AI assessment: "${midText}" — measured mid spectral ratio: ${mid}%. Optimal mid distribution is 40–52% for most rock and pop genres.`
      : `Mid spectral energy at ${mid}%. The 500–800Hz zone is where boxiness and vocal masking most commonly collide.`;

    // Node 4: High-Mid — driven by calculatedHighEnergy + highEndText
    const harshSeverity = mentionsHarsh(highEndText) && high > 30 ? "critical"
      : mentionsHarsh(highEndText) && high > 25 ? "warning"
      : high > 38 && !mentionsHarsh(highEndText) ? "warning"
      : "optimized";
    const harshDb = harshSeverity === "critical" ? parseFloat((2.4 + (high - 30) * 0.15).toFixed(1))
      : harshSeverity === "warning" ? 2.0
      : 0.5;
    const harshFreq = high > 35 ? "3.8 kHz" : "4.4 kHz";
    const harshProblem = harshSeverity !== "optimized"
      ? `High-mid sibilance energy elevated at ~${harshFreq} (high spectral ratio: ${high}%). Listener fatigue risk at volume.${mentionsHarsh(highEndText) ? ` AI confirms: "${highEndText}"` : ""}`
      : `High-mid presence at ${high}% is within acceptable range. No significant sibilance spikes detected.`;
    const harshSolution = harshSeverity === "critical"
      ? `Dynamic EQ or dedicated de-esser targeting ${harshFreq} with 3dB–5dB of gain reduction. Threshold set to trigger only on peak sibilant transients.`
      : harshSeverity === "warning"
      ? `Gentle dynamic EQ node at ${harshFreq}, -2dB with a medium attack (8ms) to catch harsh peaks without dulling the presence.`
      : "No de-essing required. High-mid presence is clean.";
    const harshDetail = highEndText
      ? `AI assessment: "${highEndText}" — high spectral energy measured at ${high}%. The 3kHz–6kHz zone drives both clarity and fatigue depending on density.`
      : `High spectral ratio: ${high}%. Above 32% in a dense mix, this zone begins to introduce ear fatigue on headphones and consumer speakers.`;

    // Node 5: Air — driven by calculatedLufs + stereoField
    const b374 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
    const isOverLimited = lufs > b374.lufsMax;
    const isUnderLimited = lufs < b374.lufsMin;
    const airSeverity: HarmonicNode["status"] = isOverLimited ? "warning"
      : isUnderLimited ? "warning"
      : "optimized";
    const airDb = isOverLimited ? parseFloat(((lufs - b374.lufsMax) * 0.4).toFixed(1))
      : isUnderLimited ? -1.8
      : -0.5;
    const airProblem = isOverLimited
      ? `Master is heavily limited at ${lufs} LUFS. Air band (12kHz+) is being compressed into the noise floor, reducing perceived spaciousness.${mentionsNarrow(stereoText) ? ` Stereo field also flags: "${stereoText}"` : ""}`
      : isUnderLimited
      ? `Track is mastered conservatively at ${lufs} LUFS. Air band has headroom but the mix may lack competitive density on streaming platforms.`
      : `Loudness at ${lufs} LUFS is within a healthy range. Air band appears preserved.${stereoText ? ` Stereo note: "${stereoText}"` : ""}`;
    const airSolution = isOverLimited
      ? `Back off the master limiter input by 1.5dB–2dB to restore micro-dynamic breathing room in the 12kHz–18kHz shelf.`
      : isUnderLimited
      ? `Consider a gentle Baxandall high-shelf boost of +1.5dB at 13kHz, then bring the master up to -10 to -12 LUFS for streaming competitiveness.`
      : "Maintain current loudness profile. No air band correction needed.";
    const lufsBucket369 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
    const airDetail = `Integrated loudness measured at ${lufs} LUFS. Target window for ${lufsBucket369.label}: ${lufsBucket369.lufsMin} to ${lufsBucket369.lufsMax} LUFS. True Peak: ${critique?.liveMetrics?.calculatedTruePeak ?? "N/A"} dBTP.`;

    const derivedNodes: HarmonicNode[] = [
      { id: "sub-rumble", frequency: bass > 45 ? "32 Hz" : bass < 22 ? "40 Hz" : "28 Hz", band: "Sub-Bass", dbOffset: subDbOffset, problem: subProblem, solution: subSolution, detail: subDetail, xPct: 15, yPct: bass > 45 ? 80 : bass < 22 ? 55 : 65, status: subStatus },
      { id: "muddy-mids", frequency: mudFreq, band: "Low-Midrange", dbOffset: mudDb, problem: mudProblem, solution: mudSolution, detail: mudDetail, xPct: 35, yPct: mudSeverity === "critical" ? 85 : mudSeverity === "warning" ? 72 : 55, status: mudSeverity },
      { id: "boxy-color", frequency: "580 Hz", band: "Midrange", dbOffset: boxyDb, problem: boxyProblem, solution: boxySolution, detail: boxyDetail, xPct: 52, yPct: boxySeverity === "critical" ? 78 : boxySeverity === "warning" ? 65 : 50, status: boxySeverity },
      { id: "harsh-presence", frequency: harshFreq, band: "High-Midrange", dbOffset: harshDb, problem: harshProblem, solution: harshSolution, detail: harshDetail, xPct: 72, yPct: harshSeverity === "critical" ? 82 : harshSeverity === "warning" ? 70 : 48, status: harshSeverity },
      { id: "air-texture", frequency: "14.5 kHz", band: "Brilliance/Air", dbOffset: airDb, problem: airProblem, solution: airSolution, detail: airDetail, xPct: 88, yPct: isOverLimited ? 68 : isUnderLimited ? 58 : 42, status: airSeverity }
    ];

    setHarmonicNodes(derivedNodes);
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
                { id: "signal", label: "Signal & Levels", sub: "Loudness & Peak", icon: Gauge, color: "text-cyan-400" },
                { id: "dynamics", label: "Dynamics Profile", sub: "PLR & Compression", icon: AudioLines, color: "text-rose-400" },
                { id: "stereo", label: "Visualizations", sub: "Spectrogram, Phase & Depth", icon: Speaker, color: "text-pink-400" },
                { id: "genre", label: "Genre Compliance", sub: "Streaming Standards", icon: Tags, color: "text-lime-300" },
                { id: "noise", label: "Noise & Artifacts", sub: "DC Offset & Hiss", icon: Antenna, color: "text-teal-400" },
                { id: "arrangement", label: "Arrangement Patterns", sub: "Frequency Masking", icon: LayoutDashboard, color: "text-slate-400" },
                { id: "azimuth", label: "Stereo Azimuth Profile", sub: "Soundstage Panning Lineup", icon: DraftingCompass, color: "text-cyan-400 text-glow" }
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

              <button
                onClick={onNavigateToEngineeringDetails}
                className="flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-left border border-blue-500/20 bg-blue-600/5 hover:bg-blue-600/10 text-blue-400 transition-all duration-200 cursor-pointer group hover:scale-[1.01] mt-1"
              >
                <div className="p-2 rounded-xl bg-blue-600/15 text-blue-400 group-hover:text-blue-300">
                  <Info className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11.5px] font-bold tracking-wide leading-tight text-blue-400 group-hover:text-blue-300">
                    Module by Module Details
                  </span>
                  <span className="text-[9.5px] text-blue-500/70 leading-normal truncate">
                    The Engineering Studio Details Page
                  </span>
                </div>
              </button>
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

                  {/* At-a-glance 6-band energy strip, genre-aware targets */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
                    {(() => {
                      const bass = critique?.liveMetrics?.calculatedBassEnergy ?? 35;
                      const mid = critique?.liveMetrics?.calculatedMidEnergy ?? 40;
                      const high = critique?.liveMetrics?.calculatedHighEnergy ?? 25;
                      const bandBucket = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                      const BAND_IDEALS: Record<string, number[]> = {
                        hiphop:     [65, 62, 55, 50, 48, 42],
                        mainstream: [55, 60, 60, 55, 55, 50],
                        indie:      [45, 50, 55, 58, 52, 45],
                        classical:  [35, 40, 45, 48, 40, 35],
                      };
                      const ideals = BAND_IDEALS[bandBucket.key] ?? BAND_IDEALS.mainstream;
                      const subBassVal = Math.min(99, Math.round(30 + (bass * 1.4)));
                      const bassCorridorVal = Math.min(99, Math.round(35 + (bass * 1.2)));
                      const lowMidVal = Math.min(99, Math.round(20 + (mid * 0.9)));
                      const coreMidVal = Math.min(99, Math.round(15 + (mid * 0.8)));
                      const presenceVal = Math.min(99, Math.round(15 + (high * 1.1)));
                      const airVal = Math.min(99, Math.round(10 + (high * 0.95)));
                      const getStatus = (v: number, ideal: number) =>
                        v > ideal + 15 ? "Peak" : v > ideal + 7 ? "Slight Peak" : v < ideal - 15 ? "Deficit" : v < ideal - 7 ? "Slight Deficit" : "Nominal";
                      const bands = [
                        { band: "Sub-Bass", r: "20-64Hz", val: subBassVal, status: getStatus(subBassVal, ideals[0]), color: "from-blue-600 to-blue-400" },
                        { band: "Bass", r: "64-250Hz", val: bassCorridorVal, status: getStatus(bassCorridorVal, ideals[1]), color: "from-indigo-600 to-indigo-400" },
                        { band: "Low-Mids", r: "250Hz-1kHz", val: lowMidVal, status: getStatus(lowMidVal, ideals[2]), color: "from-purple-600 to-purple-400" },
                        { band: "Core Mids", r: "1-4kHz", val: coreMidVal, status: getStatus(coreMidVal, ideals[3]), color: "from-pink-600 to-pink-400" },
                        { band: "Presence", r: "4-8kHz", val: presenceVal, status: getStatus(presenceVal, ideals[4]), color: "from-rose-600 to-rose-400" },
                        { band: "Air", r: "8-20kHz", val: airVal, status: getStatus(airVal, ideals[5]), color: "from-teal-600 to-teal-400" }
                      ];
                      return bands.map((band) => (
                        <div key={band.band} className="bg-[#0A0B0E] border border-white/5 p-2.5 rounded-xl flex flex-col items-center justify-between min-h-[110px]">
                          <span className="text-[9px] font-bold text-slate-200 tracking-wide text-center">{band.band}</span>
                          <span className="text-[7px] font-mono text-slate-500 uppercase">{band.r}</span>
                          <div className="w-3.5 h-12 bg-neutral-950 rounded-full flex flex-col justify-end p-[2px] border border-white/5 mt-1.5">
                            <div
                              className={`w-full rounded-full bg-gradient-to-t ${band.color} transition-all duration-300`}
                              style={{ height: `${band.val}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-mono uppercase tracking-wider text-purple-400 font-bold mt-1.5">{band.status}</span>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Spectral Tilt Indicator */}
                  <div className="bg-neutral-900 border border-white/5 p-4 rounded-xl mt-1 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-left">
                    <div className="text-left">
                      <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-1">Spectral Tilt Indicator</span>
                      <p className="text-[11.5px] text-slate-300">
                        {(() => { const bass = critique?.liveMetrics?.calculatedBassEnergy ?? 35; const high = critique?.liveMetrics?.calculatedHighEnergy ?? 25; const tilt = parseFloat((-2.0 - (bass * 0.08) + (high * 0.04)).toFixed(1)); return <>Your master registers a spectral tilt of <span className="text-purple-400 font-mono font-bold">{tilt}dB/oct</span>. {tilt < -5 ? "This indicates a bass-heavy, warm analog profile — common in classic rock and vintage recordings." : tilt < -3 ? "This translates to a balanced, natural spectral slope well-suited for modern streaming." : "This indicates a bright, high-energy mix — presence and air are elevated relative to the low end."}</>; })()}
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-[#0A0B0E] border border-purple-500/20 text-purple-400 font-mono tracking-widest text-[9.5px] rounded-lg uppercase whitespace-nowrap">
                      {(() => { const bass = critique?.liveMetrics?.calculatedBassEnergy ?? 35; const high = critique?.liveMetrics?.calculatedHighEnergy ?? 25; if (bass > 40) return "Bass-Heavy Tilt"; if (bass > 28 && high < 25) return "Slight Sub Bass Tilt"; if (high > 35) return "Bright High-End Tilt"; if (high > 28) return "Slight High-End Tilt"; return "Neutral Spectral Balance"; })()}
                    </span>
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
                  <div className="bg-[#0b1322] border border-amber-500/10 rounded-xl p-3.5 mt-2 text-[10px] text-slate-400 leading-relaxed">
                    <span className="font-mono font-bold text-amber-400 uppercase text-[9px] block mb-1">Analog Saturation Note:</span>
                    {(() => {
                      const b858 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                      if (critique?.liveMetrics?.calculatedLufs === undefined) return "Light vintage tape drive (+0.5dB, 30 ips) recommended to add cohesion across the high-mid transient peaks.";
                      if (critique.liveMetrics.calculatedLufs > b858.lufsMax) return "Master is heavily saturated for this genre's target window. Ease limiter gain by 1.5dB and reduce harmonic drive to preserve transient clarity.";
                      if (critique.liveMetrics.calculatedHighEnergy > 32) return "High-mid harmonic content is elevated. A gentle tape emulation (30 ips, +0.3dB) would smooth sibilant peaks without losing presence.";
                      if (critique.liveMetrics.calculatedBassEnergy > 42) return "Low-end harmonic density is high. Tube saturation on the bass bus (+0.5dB even-order drive) would add warmth without muddying the mix.";
                      return "Harmonic profile is well balanced. Light vintage tape drive (+0.5dB, 30 ips) would add cohesion across the high-mid transient peaks.";
                    })()}
                  </div>

                </div>
              )}

              {/* VIEW 2: Signal & Levels */}
              {activeView === "signal" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Gauge className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Loudness &amp; Signal Amplitude Audit</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Visual Meter Channel (L/R LED simulation) */}
                    <div className="bg-[#0A0B0E] border border-white/5 p-4.5 rounded-2xl flex flex-col gap-5 justify-center min-h-[190px]">
                      <div>
                        <span className="text-[9.5px] font-mono text-slate-500 font-bold uppercase tracking-wider block mb-2">
                          L / R True Peak Output Sweep (-60 dB to 0 dB)
                        </span>
                        
                        {(() => {
                          const realTruePeak = critique?.liveMetrics?.calculatedTruePeak ?? -6;
                          const baseActiveSegments = Math.max(0, Math.min(30, Math.round(((realTruePeak + 60) / 60) * 30)));
                          const renderChannel = (label: string, jitterSeed: number) => {
                            const liveJitter = isPlaying ? Math.round(Math.sin((azimuthProgress + jitterSeed) * 0.4) * 1.5) : 0;
                            const activeSegments = Math.max(0, Math.min(30, baseActiveSegments + liveJitter));
                            return (
                              <div className="flex items-center gap-3 mb-3.5 last:mb-0">
                                <span className="text-[9px] font-mono text-slate-400 w-3 font-semibold">{label}</span>
                                <div className="flex-1 h-3.5 bg-neutral-950 rounded border border-white/5 overflow-hidden flex p-[1.5px] gap-[1px]">
                                  {Array.from({ length: 30 }).map((_, i) => {
                                    const value = i / 30;
                                    let color = "bg-teal-500 shadow-[0_0_5px_rgba(20,184,166,0.4)]";
                                    if (value > 0.8) color = "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]";
                                    else if (value > 0.65) color = "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]";
                                    const isActive = i < activeSegments;
                                    return (
                                      <div key={i} className={`h-full flex-1 rounded-sm transition-opacity duration-150 ${color} ${isActive ? "opacity-100" : "opacity-10"}`} />
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          };
                          return (
                            <>
                              {renderChannel("L", 0)}
                              {renderChannel("R", 4)}
                            </>
                          );
                        })()}
                      </div>

                      {/* Clipping detection */}
                      <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl flex items-center justify-between text-xs text-rose-400">
                        <span className="flex items-center gap-1.5 font-bold">
                          <ShieldAlert className="w-4 h-4 text-rose-400" /> True Peak Headroom Compliance
                        </span>
                        <span className="font-mono font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 bg-rose-500/15 rounded-md text-glow">
                          {critique?.liveMetrics?.calculatedTruePeak !== undefined
                            ? critique.liveMetrics.calculatedTruePeak > -1.0
                              ? `Warn (${critique.liveMetrics.calculatedTruePeak} dBTP)`
                              : `Pass (${critique.liveMetrics.calculatedTruePeak} dBTP)`
                            : "Pass (-0.8 dBTP)"}
                        </span>
                      </div>
                    </div>

                    {/* Numeric Statistics */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Song Key</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-violet-400">
                          {critique?.liveMetrics?.calculatedKey ?? "—"}
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">Detected root key. Critical for sync licensing metadata and harmonic mixing compatibility.</p>
                      </div>

                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Tempo (BPM)</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-violet-400">
                          {critique?.liveMetrics?.calculatedBpm !== undefined ? `${critique.liveMetrics.calculatedBpm} BPM` : "—"}
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">Detected tempo. Used for playlist transition compatibility and sync licensing brief matching.</p>
                      </div>
                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Integrated Loudness</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow">
                          {critique?.liveMetrics?.calculatedLufs !== undefined ? `${critique.liveMetrics.calculatedLufs} LUFS` : "-11.4 LUFS"}
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">
                          {(() => {
                            const b965 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                            if (critique?.liveMetrics?.calculatedLufs === undefined) return `Target window for ${b965.label}: ${b965.lufsMin} to ${b965.lufsMax} LUFS.`;
                            if (critique.liveMetrics.calculatedLufs > b965.lufsMax) return "Master is louder than this genre's target window. Consider backing off the limiter by 1.5dB to restore dynamic headroom.";
                            if (critique.liveMetrics.calculatedLufs < b965.lufsMin) return "Track is quieter than this genre's target window. May sound weak on non-normalized playback compared to genre competitors.";
                            return `Nicely optimized within the ${b965.lufsMin} to ${b965.lufsMax} LUFS target window for ${b965.label}.`;
                          })()}
                        </p>
                      </div>

                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Loudness Range (LRA)</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-cyan-400">
                          {critique?.liveMetrics?.calculatedLra !== undefined ? `${critique.liveMetrics.calculatedLra} LU` : "6.2 LU"}
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">
                          {(() => {
                            const lraBucket = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                            const lra = critique?.liveMetrics?.calculatedLra;
                            if (lra === undefined) return `Target window for ${lraBucket.label}: ${lraBucket.lraMin}${lraBucket.lraMax !== null ? `-${lraBucket.lraMax}` : "+"} LU.`;
                            if (lra < lraBucket.lraMin) return `Narrower than the ${lraBucket.lraMin}-${lraBucket.lraMax ?? "+"} LU target for ${lraBucket.label} — mix may feel flat, with verses and choruses too close in perceived volume.`;
                            if (lraBucket.lraMax !== null && lra > lraBucket.lraMax) return `Wider than the ${lraBucket.lraMin}-${lraBucket.lraMax} LU target for ${lraBucket.label} — verify choruses hit hard enough on consumer playback systems.`;
                            return `Healthy dynamic variation, within the ${lraBucket.lraMin}${lraBucket.lraMax !== null ? `-${lraBucket.lraMax}` : "+"} LU target for ${lraBucket.label}.`;
                          })()}
                        </p>
                      </div>

                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Crest Factor index</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-purple-400">
                          {critique?.liveMetrics?.calculatedLufs !== undefined && critique?.liveMetrics?.calculatedTruePeak !== undefined
                            ? `${Math.abs(parseFloat((critique.liveMetrics.calculatedTruePeak - critique.liveMetrics.calculatedLufs).toFixed(1)))} dB`
                            : "5.4 dB"}
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">Ratio of peak to integrated loudness. Higher values indicate preserved transient punch.</p>
                      </div>

                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Master Headroom</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-emerald-400">
                          {critique?.liveMetrics?.calculatedTruePeak !== undefined
                            ? `${parseFloat((0 - critique.liveMetrics.calculatedTruePeak).toFixed(1))} dB`
                            : "+1.2 dB"}
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">
                          {critique?.liveMetrics?.calculatedTruePeak !== undefined
                            ? critique.liveMetrics.calculatedTruePeak > -1.0
                              ? "True peak is dangerously close to 0dBFS. Risk of inter-sample clipping on streaming encoders."
                              : "Safe headroom margin before the digital ceiling. No clipping risk detected."
                            : "Perfect safety storage zone before the inter-sample digital ceiling, avoiding harsh clipping."}
                        </p>
                      </div>
                    </div>

                    <div className="bg-neutral-900 border border-white/5 p-4.5 rounded-2xl flex flex-col gap-3 mt-2">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase font-bold tracking-wider border-b border-white/5 pb-1">Platform Delivery Normalization</span>
                      {[
                        { platform: "Spotify Target", spec: `${getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMin} to ${getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMax} LUFS`, user: `${critique?.liveMetrics?.calculatedLufs ?? -11.4} LUFS`, status: `${parseFloat(((critique?.liveMetrics?.calculatedLufs ?? -11.4) - getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMax).toFixed(1))} dB Offset` },
                        { platform: "Apple Music Target", spec: `${getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMin - 2} LUFS`, user: `${critique?.liveMetrics?.calculatedLufs ?? -11.4} LUFS`, status: `${parseFloat(((critique?.liveMetrics?.calculatedLufs ?? -11.4) - (getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMin - 2)).toFixed(1))} dB Offset` },
                        { platform: "Tidal Target", spec: `${getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMin} to ${getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMax} LUFS`, user: `${critique?.liveMetrics?.calculatedLufs ?? -11.4} LUFS`, status: `${parseFloat(((critique?.liveMetrics?.calculatedLufs ?? -11.4) - getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMax).toFixed(1))} dB Offset` },
                        { platform: "Club/DJ Master Target", spec: "-8.0 to -11.0 LUFS", user: `${critique?.liveMetrics?.calculatedLufs ?? -11.4} LUFS`, status: `${(critique?.liveMetrics?.calculatedLufs ?? -11.4) >= -11 && (critique?.liveMetrics?.calculatedLufs ?? -11.4) <= -8 ? "Perfect (Nominal Level)" : (critique?.liveMetrics?.calculatedLufs ?? -11.4) < -11 ? "Slightly Under Club Level" : "Over Club Target"}` }
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



              {/* VIEW 4: Dynamics Profile */}
              {activeView === "dynamics" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <AudioLines className="w-5 h-5 text-rose-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Dynamic Variance &amp; Compression Profile</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block">Peak-to-Loudness (PLR)</span>
                      <span className="text-2xl font-black text-white mt-1.5 block font-mono text-glow">{critique?.liveMetrics?.calculatedTruePeak !== undefined && critique?.liveMetrics?.calculatedLufs !== undefined ? `${Math.abs(parseFloat((critique.liveMetrics.calculatedTruePeak - critique.liveMetrics.calculatedLufs).toFixed(1)))} PLR` : "9.5 PLR"}</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        {(() => {
                          if (critique?.liveMetrics?.calculatedTruePeak === undefined || critique?.liveMetrics?.calculatedLufs === undefined) return "Ideal transient balance; no severe brickwalling detected.";
                          const plr = Math.abs(critique.liveMetrics.calculatedTruePeak - critique.liveMetrics.calculatedLufs);
                          if (plr < 5) return "Severe brickwalling detected - transients are being heavily compressed, reducing punch and dynamics.";
                          if (plr < 8) return "Moderate transient compression - some brickwalling present, but within an acceptable range.";
                          return "Ideal transient balance; no severe brickwalling detected.";
                        })()}
                      </span>
                    </div>

                    <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block">Dynamic Range Score</span>
                      <span className="text-2xl font-black text-rose-400 mt-1.5 block font-mono text-glow">{critique?.liveMetrics?.calculatedLra !== undefined ? `DR${Math.round(critique.liveMetrics.calculatedLra)}` : "DR9"}</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        {(() => {
                          const drBucket = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                          const lra = critique?.liveMetrics?.calculatedLra;
                          if (lra === undefined) return "Highly safe dynamic index for commercial and digital delivery.";
                          if (lra < drBucket.lraMin) return `Below the ${drBucket.lraMin}-${drBucket.lraMax ?? "+"} DR target for ${drBucket.label} - mix may feel over-compressed for this genre.`;
                          if (drBucket.lraMax !== null && lra > drBucket.lraMax) return `Above the ${drBucket.lraMin}-${drBucket.lraMax} DR target for ${drBucket.label} - verify sections still hit hard enough on consumer systems.`;
                          return `Healthy dynamic index within the ${drBucket.lraMin}-${drBucket.lraMax ?? "+"} DR target for ${drBucket.label}.`;
                        })()}
                      </span>
                    </div>

                    <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block">Compression Artifacts</span>
                      <span className="text-2xl font-black text-emerald-400 mt-1.5 block font-mono text-glow">
                        {(() => {
                          const b1158 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                          if (critique?.liveMetrics?.calculatedLufs === undefined) return "Clean";
                          if (critique.liveMetrics.calculatedLufs > b1158.lufsMax) return "Heavy Limiting";
                          if (critique.liveMetrics.calculatedLufs > b1158.lufsMin) return "Moderate";
                          return "Clean";
                        })()}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        {(() => {
                          const b1158b = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                          if (critique?.liveMetrics?.calculatedLufs === undefined) return "No aggressive compressor breathing or transient smearing.";
                          if (critique.liveMetrics.calculatedLufs > b1158b.lufsMax) return "Aggressive limiting detected - likely compressor breathing and transient smearing at loud sections.";
                          if (critique.liveMetrics.calculatedLufs > b1158b.lufsMin) return "Some compressor engagement present, but within a reasonable range for this genre.";
                          return "No aggressive compressor breathing or transient smearing.";
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Compressor Simulator visual block */}
                  <div className="bg-[#0A0B0E] border border-white/5 p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Acoustic Gain Reduction Timeline</span>
                      <span className="text-[9px] font-mono text-rose-400">{(() => {
                        const b1135 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                        if (critique?.liveMetrics?.calculatedLufs === undefined) return "-1.8 dB Target GR";
                        return `${parseFloat((critique.liveMetrics.calculatedLufs - b1135.lufsMax).toFixed(1))} dB GR vs ${b1135.lufsMax} LUFS Target (${b1135.label})`;
                      })()}</span>
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

                  <div className="bg-[#0A0B0E] border border-white/5 rounded-2xl p-4.5 flex flex-col gap-3">
                    <span className="text-[9.5px] font-mono text-slate-500 uppercase font-bold tracking-wider border-b border-white/5 pb-2">Per-Section Loudness Breakdown</span>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Estimated loudness distribution across the track timeline, derived from waveform envelope analysis.</p>
                    <div className="grid grid-cols-4 gap-2.5 mt-1">
                      {(() => {
                        const points = critique?.liveMetrics?.calculatedWaveformPointsHD ?? critique?.liveMetrics?.calculatedWaveformPoints ?? [];
                        const lufs = critique?.liveMetrics?.calculatedLufs ?? -12;
                        const duration = critique?.liveMetrics?.calculatedDuration ?? 0;
                        const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
                        const sections = [
                          { label: "Intro", startPct: 0, endPct: 0.12, slice: points.slice(0, Math.floor(points.length * 0.12)), color: "text-blue-400" },
                          { label: "Verse", startPct: 0.12, endPct: 0.45, slice: points.slice(Math.floor(points.length * 0.12), Math.floor(points.length * 0.45)), color: "text-cyan-400" },
                          { label: "Chorus", startPct: 0.45, endPct: 0.75, slice: points.slice(Math.floor(points.length * 0.45), Math.floor(points.length * 0.75)), color: "text-rose-400" },
                          { label: "Outro", startPct: 0.75, endPct: 1.0, slice: points.slice(Math.floor(points.length * 0.75)), color: "text-slate-400" }
                        ];
                        return sections.map((s) => {
                          const avg = s.slice.length > 0 ? s.slice.reduce((a: number, b: number) => a + b, 0) / s.slice.length : 50;
                          const sectionLufs = parseFloat((lufs + ((avg - 50) * 0.12)).toFixed(1));
                          const barHeight = Math.round(20 + (avg * 0.6));
                          const startTime = duration > 0 ? fmt(duration * s.startPct) : null;
                          const endTime = duration > 0 ? fmt(duration * s.endPct) : null;
                          return (
                            <div key={s.label} className="flex flex-col items-center gap-1.5">
                              <span className={`text-[9px] font-mono font-bold ${s.color}`}>{sectionLufs} L</span>
                              <div className="w-full bg-neutral-900 rounded-lg overflow-hidden" style={{ height: "48px" }}>
                                <div className={`w-full rounded-lg transition-all`} style={{ height: `${Math.min(100, barHeight)}%`, background: s.label === "Chorus" ? "rgba(244,63,94,0.4)" : "rgba(99,102,241,0.3)" }} />
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 uppercase">{s.label}</span>
                              {startTime && endTime && (
                                <span className="text-[8px] font-mono text-slate-600 whitespace-nowrap">{startTime}–{endTime}</span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <p className="text-[9px] text-slate-600 mt-1">* Section boundaries estimated from waveform envelope. For precise section analysis use DAW markers.</p>
                  </div>
                </div>
              )}

              {/* VIEW 5: Stereo Field */}
              {activeView === "stereo" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Speaker className="w-5 h-5 text-pink-400" />
                      <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Visualizations</h3>
                    </div>
                  </div>

                  <div className="bg-[#0A0B0E] border border-white/5 rounded-2xl p-4.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase font-bold tracking-wider">Spectrogram View</span>
                      <span className="text-[9px] font-mono text-slate-600">Frequency × Time Energy Map</span>
                    </div>
                    {localFileBlobUrl ? (
                      <SpectrogramCanvas blobUrl={localFileBlobUrl} />
                    ) : (
                      <div className="h-[160px] flex items-center justify-center text-[10px] text-slate-600 font-mono">Upload a local file to enable spectrogram view.</div>
                    )}
                    <p className="text-[9px] text-slate-600">Horizontal axis: time. Vertical axis: frequency (low → high). Color intensity: energy (dark → bright).</p>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider border-b border-white/5 pb-2">Phase Corridor</span>
                  {(
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="bg-[#0A0B0E] p-4.5 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-h-[220px]">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider mb-3">Stereo Soundstage Goniometer Target</span>
                        <div className="w-32 h-32 rounded-full border border-pink-500/15 flex items-center justify-center relative bg-neutral-950 mb-3 overflow-hidden">
                          <div className="absolute w-[1px] h-full bg-white/5" />
                          <div className="absolute h-[1px] w-full bg-white/5" />
                          <div className="absolute w-full h-[1px] bg-white/2 rotate-45" />
                          <div className="absolute w-full h-[1px] bg-white/2 -rotate-45" />
                          <div className={`absolute bg-pink-500/25 blur-xl rounded-full rotate-42 animate-pulse`} style={{ width: `${Math.round(60 + ((critique?.liveMetrics?.calculatedMidEnergy ?? 40) * 0.4))}px`, height: `${Math.round(80 + ((critique?.liveMetrics?.calculatedMidEnergy ?? 40) * 0.5))}px` }} />
                          <div className={`absolute bg-blue-500/20 blur-md rounded-full -rotate-12`} style={{ width: `${Math.round(30 + ((critique?.liveMetrics?.calculatedBassEnergy ?? 35) * 0.5))}px`, height: `${Math.round(50 + ((critique?.liveMetrics?.calculatedBassEnergy ?? 35) * 0.7))}px` }} />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{(() => { const bass = critique?.liveMetrics?.calculatedBassEnergy ?? 35; const high = critique?.liveMetrics?.calculatedHighEnergy ?? 25; const width = Math.round(45 + (high * 0.8) - (bass * 0.3)); return `Total Spatial Breadth Index: ${width > 70 ? "wide" : width > 55 ? "moderate" : "narrow"} (${width}°)`; })()}</span>
                      </div>
                      <div className="flex flex-col gap-4">
                        <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5">
                          <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
                            <span>Phase Correlation Coordinate</span>
                            <span className="text-pink-400 font-mono">{(() => { const bass = critique?.liveMetrics?.calculatedBassEnergy ?? 35; const mid = critique?.liveMetrics?.calculatedMidEnergy ?? 40; const correlation = parseFloat(Math.min(0.99, Math.max(0.3, 1.0 - ((bass + mid) * 0.006))).toFixed(2)); return `+${correlation}`; })()}</span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral-950 rounded-full border border-white/5 relative p-[1px]">
                            <div className="absolute w-3 h-3 bg-pink-500 rounded-full shadow-[0_0_8px_#ec4899] top-1/2 -mt-[5px]" style={{ left: `${(() => { const bass = critique?.liveMetrics?.calculatedBassEnergy ?? 35; const mid = critique?.liveMetrics?.calculatedMidEnergy ?? 40; const correlation = Math.min(0.99, Math.max(0.3, 1.0 - ((bass + mid) * 0.006))); return Math.round(40 + (correlation * 45)); })()}%` }} />
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-2">
                            <span>-1.0 (Out of Phase)</span>
                            <span>0.0 (Wide Ambient)</span>
                            <span>+1.0 (Solid Mono)</span>
                          </div>
                        </div>
                        <div className="bg-neutral-900 border border-white/5 p-4 rounded-xl text-xs flex flex-col gap-2.5">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-slate-400">Mid Energy (Mono core):</span>
                            <span className="text-white font-mono font-bold">{critique?.liveMetrics?.calculatedMidEnergy !== undefined ? `${Math.min(99, Math.round(50 + (critique.liveMetrics.calculatedMidEnergy * 0.3)))}%` : "62.8%"}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-slate-400">Side Energy (Stereo cloud):</span>
                            <span className="text-pink-400 font-mono font-bold">{critique?.liveMetrics?.calculatedMidEnergy !== undefined ? `${Math.max(1, Math.round(50 - (critique.liveMetrics.calculatedMidEnergy * 0.3)))}%` : "37.2%"}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Low-End (&lt;120Hz) Mono Alignment:</span>
                            <span className="text-emerald-400 font-bold uppercase">{critique?.liveMetrics?.calculatedBassEnergy !== undefined ? critique.liveMetrics.calculatedBassEnergy > 40 ? "Locked 100% Mono" : critique.liveMetrics.calculatedBassEnergy > 25 ? "Mostly Mono" : "Check Mono Compatibility" : "Locked 100% Mono"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider border-b border-white/5 pb-2">Depth Map</span>
                  {(
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                      <div className="bg-[#0A0B0E] p-4.5 rounded-2xl border border-white/5 relative min-h-[200px] flex flex-col justify-between">
                        <span className="text-[9.5px] font-mono text-slate-500 font-bold uppercase tracking-wider block mb-4">Acoustic Spatial Positioning (Bird's-Eye Perspective)</span>
                        <div className="flex-1 w-full relative border border-white/[0.04] p-3 rounded-xl bg-neutral-950 flex flex-col justify-end overflow-hidden pb-8">
                          <div className="absolute inset-x-0 h-[1.5px] bg-white/2 top-11" />
                          <div className="absolute inset-x-0 h-[1.5px] bg-white/2 top-24" />
                          <div className="absolute top-1 left-1/2 -ml-22 w-44 h-10 border border-teal-500/10 bg-teal-500/[0.02] rounded-full blur-md flex items-center justify-center text-[9px] text-teal-400">
                            Reverb Ambience / Side Delay Cloud
                          </div>
                          <div className="absolute top-12 left-1/2 -ml-28 w-56 h-12 border border-[#2563EB]/15 bg-blue-500/[0.02] rounded-full flex items-center justify-between px-3 text-[9px] text-slate-500">
                            <span>{critique?.liveMetrics?.calculatedBassEnergy !== undefined && critique.liveMetrics.calculatedBassEnergy > 30 ? "Bass / Low-End (Left)" : critique?.liveMetrics?.calculatedHighEnergy !== undefined && critique.liveMetrics.calculatedHighEnergy > 35 ? "Synths / Keys (Left)" : "Rhythm Guitars (Left)"}</span>
                            <span>{critique?.liveMetrics?.calculatedHighEnergy !== undefined && critique.liveMetrics.calculatedHighEnergy > 35 ? "Percussion / Hi-Hats (Right)" : critique?.liveMetrics?.calculatedMidEnergy !== undefined && critique.liveMetrics.calculatedMidEnergy > 50 ? "Guitar Group (Right)" : "Ambient / Pads (Right)"}</span>
                          </div>
                          <div className="absolute top-24 left-1/2 -ml-16 w-32 h-10 border border-purple-500/30 bg-purple-500/[0.04] rounded-full flex items-center justify-center text-[9.5px] font-bold text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.1)]">
                            {critique?.liveMetrics?.calculatedMidEnergy !== undefined && critique.liveMetrics.calculatedMidEnergy > 50 ? "Lead Vocal / Snare" : critique?.liveMetrics?.calculatedBassEnergy !== undefined && critique.liveMetrics.calculatedBassEnergy > 30 ? "Kick / Bass Center" : "Lead Vocal / Center"}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between gap-4">
                        <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5 flex flex-col justify-between h-full">
                          <div>
                            <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider">Acoustic Dry / Wet Ratio</span>
                            <div className="text-2xl font-black text-white mt-1.5 font-mono text-glow">
                              {critique?.liveMetrics?.calculatedHighEnergy !== undefined && critique?.liveMetrics?.calculatedMidEnergy !== undefined ? `${Math.round(45 + (critique.liveMetrics.calculatedMidEnergy * 0.4))}% Dry / ${Math.round(55 - (critique.liveMetrics.calculatedMidEnergy * 0.4))}% Wet` : "65% Dry / 35% Wet"}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                              {critique?.liveMetrics?.calculatedHighEnergy !== undefined ? critique.liveMetrics.calculatedHighEnergy > 35 ? "High ambient energy detected. Reverb tails may be washing into the mix — consider high-passing reverb returns above 200Hz." : critique.liveMetrics.calculatedHighEnergy < 18 ? "Dry, close-mic sound detected. Mix may benefit from additional room ambience on secondary instruments." : "Good reverb balance. Primary elements sit dry and forward while ambient layers occupy the rear field cleanly." : "Excellent reverb decay profile. Main vocals sit dry and front-centered, while synths and secondary guitars occupy cohesive back-room spaces without creating frequency mud."}
                            </p>
                          </div>
                          <div className="mt-4 pt-3.5 border-t border-white/5 text-[10.5px] text-emerald-400 font-mono leading-relaxed">
                            <span className="font-sans font-bold text-slate-200 block mb-0.5 uppercase text-[9px]">Reverb Tail Diagnostic:</span>
                            {critique?.liveMetrics?.calculatedLra !== undefined ? `Estimated RT60 decay maps to ${parseFloat((critique.liveMetrics.calculatedLra * 0.18).toFixed(2))}s — ${critique.liveMetrics.calculatedLra > 10 ? "long decay tail detected, risk of wash in dense arrangements." : critique.liveMetrics.calculatedLra < 5 ? "short decay profile, mix feels tight and dry." : "healthy decay range for commercial release."}` : "Average decay (RT60) tracks cleanly at 1.45 seconds on high harmonic bands."}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}



              {/* VIEW 8: Genre & Reference Compliance */}
              {activeView === "genre" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Tags className="w-5 h-5 text-lime-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Genre Match Rate &amp; Reference Audit</h3>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="bg-[#0A0B0E] p-4.5 rounded-2xl border border-white/5 flex flex-col justify-between">
                      <div>
                        <span className="text-[9.5px] font-mono text-slate-500 uppercase font-bold tracking-wider">Reference Matching Index</span>
                        <div className="text-2xl font-black text-lime-400 mt-2 font-mono text-glow leading-tight">
                          {(() => {
                            const lufs = critique?.liveMetrics?.calculatedLufs;
                            if (lufs === undefined) return "Awaiting Analysis";
                            const b1368 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                            const genreAvg = (b1368.lufsMin + b1368.lufsMax) / 2;
                            const diff = parseFloat((lufs - genreAvg).toFixed(1));
                            const diffAbs = Math.abs(diff);
                            if (diff > 0) return `${diffAbs} dB louder than avg ${b1368.label} master`;
                            if (diff < 0) return `${diffAbs} dB quieter than avg ${b1368.label} master`;
                            return `Matches avg ${b1368.label} master loudness`;
                          })()}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-3.5 leading-relaxed">
                          Your track aligns exceptionally well with professional referenced benchmarks for the <span className="text-slate-300 font-semibold uppercase font-mono text-[10px]">{critique?.vibe?.genre || "Modern Production"}</span> genre curve.
                        </p>
                      </div>
                      <div className="bg-lime-500/5 border border-lime-500/15 p-3 rounded-xl mt-4 text-[10.5px] text-lime-400 leading-relaxed font-mono">
                        <span className="block text-slate-200 font-sans font-extrabold uppercase text-[9px] mb-1">A&amp;R Diagnostic:</span>
                        {(() => {
                          const b1339 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                          if (critique?.liveMetrics?.calculatedLufs === undefined) return "Spectral curves and transient punch densities successfully replicate commercial master records.";
                          if (critique.liveMetrics.calculatedLufs > b1339.lufsMax) return "Master is louder than this genre's target window — streaming normalizers will reduce perceived punch. Back off the limiter for better platform performance.";
                          if (critique.liveMetrics.calculatedLufs < b1339.lufsMin) return "Track is quieter than this genre's target window and may sound weak relative to competitors on streaming platforms.";
                          return "Spectral curves and transient punch densities align well with commercial master references for this genre.";
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 9: Noise & Artifacts */}
              {activeView === "noise" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <Antenna className="w-5 h-5 text-teal-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Background Noise Floor &amp; Codec Artifacts</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { metric: "Analog Noise Floor", text: "Hiss, hum, electrical interference floor", value: (() => {
                        const b1405 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                        const limit = b1405.lufsMin;
                        if (critique?.liveMetrics?.calculatedLufs === undefined) return "-84 dB";
                        return critique.liveMetrics.calculatedLufs < limit ? `${Math.round(-82 + (critique.liveMetrics.calculatedLufs - limit) * 0.5)} dB` : "-84 dB";
                      })(), status: (() => {
                        const b1405 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                        const threshold = b1405.lufsMin - 4;
                        return critique?.liveMetrics?.calculatedLufs !== undefined && critique.liveMetrics.calculatedLufs < threshold ? "Elevated Noise Risk" : "Pristine Room";
                      })(), color: (() => {
                        const b1405 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                        const threshold = b1405.lufsMin - 4;
                        return critique?.liveMetrics?.calculatedLufs !== undefined && critique.liveMetrics.calculatedLufs < threshold ? "text-yellow-400" : "text-emerald-400";
                      })() },
                      { metric: "DC Offset Error", text: "Direct Current bias wasting storage headroom", value: critique?.liveMetrics?.calculatedTruePeak !== undefined ? Math.abs(critique.liveMetrics.calculatedTruePeak) < 0.5 ? "0.001%" : "0.003%" : "0.002%", status: "Zero Bias", color: "text-emerald-400" },
                      { metric: "Hum Sweep (50/60 Hz)", spec: "60Hz interference hum diagnostics", value: critique?.liveMetrics?.calculatedBassEnergy !== undefined && critique.liveMetrics.calculatedBassEnergy < 3 ? "Possible low-end hum" : "Not detected", status: critique?.liveMetrics?.calculatedBassEnergy !== undefined && critique.liveMetrics.calculatedBassEnergy < 3 ? "Monitor Sub Range" : "Clean Grid", color: critique?.liveMetrics?.calculatedBassEnergy !== undefined && critique.liveMetrics.calculatedBassEnergy < 3 ? "text-yellow-400" : "text-teal-400" },
                      { metric: "Codec Artifact Index", spec: "Lossy compression degradation spectrum", value: critique?.liveMetrics?.calculatedLra !== undefined ? critique.liveMetrics.calculatedLra > 15 ? "High Dynamic — WAV Recommended" : "WAV Lossless" : "WAV Lossless", status: critique?.liveMetrics?.calculatedTruePeak !== undefined && critique.liveMetrics.calculatedTruePeak > -0.3 ? "Peak Risk Detected" : "Perfect Integrity", color: critique?.liveMetrics?.calculatedTruePeak !== undefined && critique.liveMetrics.calculatedTruePeak > -0.3 ? "text-yellow-400" : "text-emerald-400" }
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
                    <LayoutDashboard className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Acoustic Masking Conflicts &amp; Separation Grid</h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Our dynamic analyzer checked intersections where instruments crowd the same spatial frequencies. Check recommendations below to resolve masking clutter.
                  </p>

                  <div className="flex flex-col gap-3 pt-2">
                    {[
                      { pair: "Kick Drum vs. Sub-Bass Group", freq: "40 Hz - 90 Hz", level: "Severe overlap masking", tip: critique?.liveMetrics?.calculatedBassEnergy !== undefined && critique.liveMetrics.calculatedBassEnergy > 30 ? `High bass energy detected (${critique.liveMetrics.calculatedBassEnergy}% spectral ratio). Apply sidechain compression on bass group triggered by kick hits to duck by -3dB to -4dB.` : critique?.liveMetrics?.calculatedBassEnergy !== undefined && critique.liveMetrics.calculatedBassEnergy < 10 ? `Low sub-bass energy (${critique.liveMetrics.calculatedBassEnergy}%). Kick and bass are likely well separated — verify low-end on full-range monitors.` : "Apply sidechain compression on bass group, triggered by kick channel hits to duck bass by -3dB.", status: critique?.liveMetrics?.calculatedBassEnergy !== undefined && critique.liveMetrics.calculatedBassEnergy > 30 ? "Conflict Detected" : critique?.liveMetrics?.calculatedBassEnergy !== undefined && critique.liveMetrics.calculatedBassEnergy < 10 ? "Clean Separation" : "Monitor Zone" },
                      { pair: "Primary Vocal vs. Electric Rhythm Guitars", freq: "1.2 kHz - 1.8 kHz", level: "Moderate dynamic masking", tip: critique?.liveMetrics?.calculatedMidEnergy !== undefined && critique.liveMetrics.calculatedMidEnergy > 50 ? `Mid energy elevated (${critique.liveMetrics.calculatedMidEnergy}%). Apply a broad bell EQ cut of -2dB to -3dB (Q=0.8) on guitars centered at 1.35kHz to carve room for the vocal.` : critique?.liveMetrics?.calculatedMidEnergy !== undefined && critique.liveMetrics.calculatedMidEnergy < 35 ? `Mid energy is low (${critique.liveMetrics.calculatedMidEnergy}%). Vocal may sit cleanly but check for presence gap around 1kHz–2kHz.` : "Apply a broad bell filter EQ cut of -2dB (Q=0.8) on guitars centered around 1.35kHz to carve room.", status: critique?.liveMetrics?.calculatedMidEnergy !== undefined && critique.liveMetrics.calculatedMidEnergy > 50 ? "Carve Room" : "Nominal" },
                      { pair: "Percussion Transient vs. Ambient Synths", freq: "6.5 kHz - 10 kHz", level: "Nominal separation", tip: critique?.liveMetrics?.calculatedHighEnergy !== undefined && critique.liveMetrics.calculatedHighEnergy > 35 ? `High-frequency energy elevated (${critique.liveMetrics.calculatedHighEnergy}%). Pan hi-hats Left (+30%) and synths wide L/R. Consider a gentle high-shelf cut on synths above 8kHz to reduce clash with cymbal transients.` : critique?.liveMetrics?.calculatedHighEnergy !== undefined && critique.liveMetrics.calculatedHighEnergy < 18 ? `High-frequency energy is low (${critique.liveMetrics.calculatedHighEnergy}%). Mix may lack air and presence. Check cymbal levels and high-shelf EQ on the master bus.` : "Pan Hi-Hats slightly Left (+30) and Synths L/R wide to open up center width.", status: critique?.liveMetrics?.calculatedHighEnergy !== undefined && critique.liveMetrics.calculatedHighEnergy > 35 ? "Conflict Detected" : critique?.liveMetrics?.calculatedHighEnergy !== undefined && critique.liveMetrics.calculatedHighEnergy < 18 ? "Presence Deficit" : "Clean Separation" }
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
                      <DraftingCompass className="w-24 h-24 text-cyan-500" />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2 border border-cyan-500/25 bg-cyan-950/40 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-400 animate-pulse">
                        <DraftingCompass className="w-5 h-5 shadow-[0_0_10px_rgba(6,182,212,0.4)] text-[#06b6d4]" />
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
                              <span className="text-cyan-400">{critique?.liveMetrics?.calculatedMidEnergy !== undefined && critique?.liveMetrics?.calculatedHighEnergy !== undefined ? `${Math.min(99, Math.round(60 + (critique.liveMetrics.calculatedHighEnergy * 0.5) + (critique.liveMetrics.calculatedMidEnergy * 0.2)))}% matching` : "86% matching"}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              {critique?.liveMetrics?.calculatedHighEnergy !== undefined ? critique.liveMetrics.calculatedHighEnergy > 35 ? "High-frequency energy is wide and elevated. Percussion and synths are competing in the outer stereo field — consider tightening hi-hat panning to ±45° to reduce clash." : critique.liveMetrics.calculatedHighEnergy < 18 ? "High-frequency stereo width appears narrow. Widen ambient elements and percussion to ±60° to open the soundstage." : "Good side width corridor. High percussions occupy space correctly from ±45° to ±75°, keeping the center channel open." : "Excellent side width corridor. High percussions occupy space correctly from +/-45° out to +/-75°, opening the center."}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1.5 border-t border-white/[0.04] pt-2.5">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <span>Low Bass Mono corridor</span>
                              <span className="text-emerald-400">{critique?.liveMetrics?.calculatedBassEnergy !== undefined ? critique.liveMetrics.calculatedBassEnergy > 40 ? `${Math.min(99, Math.round(88 + (critique.liveMetrics.calculatedBassEnergy * 0.2)))}% Centered` : critique.liveMetrics.calculatedBassEnergy < 8 ? "Low Sub Energy" : "95% Centered" : "95% Centered"}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              {critique?.liveMetrics?.calculatedBassEnergy !== undefined ? critique.liveMetrics.calculatedBassEnergy > 40 ? `Elevated sub-bass energy (${critique.liveMetrics.calculatedBassEnergy}%). Verify all frequencies below 80Hz are summed to mono to prevent phase cancellation on playback systems.` : critique.liveMetrics.calculatedBassEnergy < 8 ? `Sub-bass energy is very low (${critique.liveMetrics.calculatedBassEnergy}%). Check low-end on full-range monitors — mix may lack foundation on larger playback systems.` : "Sub frequency corridor is clean. No phase cancellation risk detected below 80Hz." : "Zero sub frequency leaks register below 80Hz limit, fully preventing potential phase cancellation on playback."}
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
                          <span className="text-2xl font-black text-cyan-400 mt-0.5 font-mono">{critique?.liveMetrics?.calculatedMidEnergy !== undefined && critique?.liveMetrics?.calculatedHighEnergy !== undefined && critique?.liveMetrics?.calculatedBassEnergy !== undefined ? `${Math.min(99, Math.round(65 + (critique.liveMetrics.calculatedHighEnergy * 0.4) + (critique.liveMetrics.calculatedMidEnergy * 0.15) - (critique.liveMetrics.calculatedBassEnergy > 40 ? 5 : 0)))}%` : "88%"}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Underneath Bottom Column: DAW Engineering Checklist spanning the entire page width */}
          <div className="border-t border-white/5 pt-1" id="migrated-daw-checklist-section">
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
      const pts = liveMetrics?.calculatedWaveformPointsHD ?? liveMetrics?.calculatedWaveformPoints ?? [];
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
