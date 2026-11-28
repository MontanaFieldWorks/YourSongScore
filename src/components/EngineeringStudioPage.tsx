import React, { useState, useEffect, useRef } from "react";
import FFT from "fft.js";
import { getLegacyMeterDisplayValue, isValidSonicLensSavedMasterEq, buildSonicLensInteractiveEqPreview, summarizeSonicLensMeasuredOverview, describeSonicLensMeasuredBand, SONICLENS_SIX_BAND_EDGES_HZ, SONICLENS_SIX_BAND_NAMES } from "../lib/liveAudioAnalyzer";
import { 
  ArrowLeft, ArrowRight, Volume2, Sliders, Mic, CheckCircle, Square, Play, Pause, 
  Activity, Sparkles, Cpu, AlertTriangle, Check, RotateCcw, Compass, Layers, CheckSquare,
  Radio, Waves, Settings, ShieldAlert, Info, BarChart2, Disc, Wand2,
  AudioLines, Gauge, Speaker, Tags, Antenna, LayoutDashboard, DraftingCompass, Lightbulb
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
  highEnergyRock: { label: "Punk / Metal / Hardcore", lufsMin: -9, lufsMax: -6, lraMin: 4, lraMax: 9 },
  mainstream: { label: "Pop / Rock / Country", lufsMin: -12, lufsMax: -9, lraMin: 6, lraMax: 12 },
  indie: { label: "Indie / Acoustic / Singer-Songwriter", lufsMin: -14, lufsMax: -11, lraMin: 10, lraMax: 15 },
  classical: { label: "Classical / Jazz / Folk / Ambient", lufsMin: -18, lufsMax: -14, lraMin: 15, lraMax: null },
};

function getGenreLoudnessBucket(genre?: string, subgenre?: string): { key: string } & typeof GENRE_LOUDNESS_BUCKETS[string] {
  const genreText = (genre || "").toLowerCase().trim();
  const subgenreText = (subgenre || "").toLowerCase().trim();
  const text = `${genreText} ${subgenreText}`;
  const hasAny = (words: string[]) => words.some(w => text.includes(w));

  if (genreText === "rap / hip-hop" || genreText === "dance / electronic") {
    return { key: "hiphop", ...GENRE_LOUDNESS_BUCKETS.hiphop };
  }
  if (
    genreText === "rock" &&
    hasAny(["punk", "metal", "grunge", "hardcore", "metalcore", "industrial", "nu metal", "nu-metal"])
  ) {
    return { key: "highEnergyRock", ...GENRE_LOUDNESS_BUCKETS.highEnergyRock };
  }
  if (genreText === "classical" || genreText === "jazz" || hasAny(["ambient", "orchestral", "cinematic", "chamber"])) {
    return { key: "classical", ...GENRE_LOUDNESS_BUCKETS.classical };
  }
  if (
    genreText === "folk / singer-songwriter" ||
    hasAny(["indie", "acoustic", "singer-songwriter", "singer songwriter", "americana", "folk", "dream pop", "shoegaze"])
  ) {
    return { key: "indie", ...GENRE_LOUDNESS_BUCKETS.indie };
  }
  if (hasAny(["hip hop", "hip-hop", "trap", "rap", "edm", "electronic", "dubstep", "house", "techno", "drill"])) {
    return { key: "hiphop", ...GENRE_LOUDNESS_BUCKETS.hiphop };
  }
  return { key: "mainstream", ...GENRE_LOUDNESS_BUCKETS.mainstream };
}

interface ActionItem {
  title: string;
  recommendation: string;
  technicalGuide: string;
  technicalGuideBullets?: string[];
}

interface EngineeringStudioPageProps {
  onBack: () => void;
  critique: any;
  trackInfo: any;
  localFileBlobUrl: string | null;
  onNavigateToEngineeringDetails?: () => void;
  onMeasureCachedSpectrum?: () => Promise<string>;
}

// A node's displayed frequency identifies its position on the measured
// spectrum; its qualitative diagnosis remains the original critique guidance.
const harmonicFrequencyHz = (display:string):number => {
  const match=display.match(/(\d+(?:\.\d+)?)\s*(kHz|Hz)/i);
  return match ? Number(match[1]) * (/^khz$/i.test(match[2]) ? 1000 : 1) : NaN;
};

// Numeric sign is the hypothetical gain delta, not measured dBFS/Hz.
const formatSonicLensSignedGain = (value:number):string => {
  const rounded=Math.abs(value)<0.000001 ? 0 : value;
  return `${rounded>=0?"+":""}${rounded.toFixed(1)} dB`;
};

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

        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;

        const colWidth = canvas.width / width;

        const fft = new FFT(fftSize);
        const complexOutput = fft.createComplexArray();

        // Precompute a Hann window to reduce spectral leakage
        const hannWindow = new Float32Array(fftSize);
        for (let n = 0; n < fftSize; n++) {
          hannWindow[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (fftSize - 1)));
        }

        for (let i = 0; i < width; i++) {
          const frameStart = Math.floor((i / width) * (channelData.length - fftSize));
          const frame = channelData.slice(frameStart, frameStart + fftSize);

          const windowedFrame = new Array(fftSize);
          for (let n = 0; n < fftSize; n++) {
            windowedFrame[n] = (frame[n] || 0) * hannWindow[n];
          }

          fft.realTransform(complexOutput, windowedFrame);
          fft.completeSpectrum(complexOutput);

          // Real FFT magnitude in dB for each frequency bin
          const magnitudesDb = new Float32Array(freqBins);
          for (let k = 0; k < freqBins; k++) {
            const re = complexOutput[2 * k];
            const im = complexOutput[2 * k + 1];
            const mag = Math.sqrt(re * re + im * im) / fftSize;
            magnitudesDb[k] = 20 * Math.log10(mag + 1e-9);
          }

          for (let j = 0; j < height; j++) {
            const invJ = height - 1 - j;

            // Log-frequency scale: pixel row j (0=lowest, height-1=highest) maps to a log-scaled bin
            const logMin = Math.log10(2);
            const logMax = Math.log10(freqBins);
            const logPos = logMin + (j / (height - 1)) * (logMax - logMin);
            const binIndex = Math.min(freqBins - 1, Math.max(0, Math.round(Math.pow(10, logPos))));

            const db = magnitudesDb[binIndex];
            const norm = Math.min(1, Math.max(0, (db + 90) / 80));

            // Color gradient: dark navy -> blue -> teal -> green -> yellow -> orange -> red
            let r, g, b;
            if (norm < 0.15) {
              const t = norm / 0.15;
              r = 5; g = Math.round(5 + t * 20); b = Math.round(20 + t * 60);
            } else if (norm < 0.35) {
              const t = (norm - 0.15) / 0.2;
              r = 5; g = Math.round(25 + t * 90); b = Math.round(80 + t * 100);
            } else if (norm < 0.55) {
              const t = (norm - 0.35) / 0.2;
              r = Math.round(5 + t * 20); g = Math.round(115 + t * 100); b = Math.round(180 - t * 100);
            } else if (norm < 0.75) {
              const t = (norm - 0.55) / 0.2;
              r = Math.round(25 + t * 200); g = Math.round(215 + t * 40); b = Math.round(80 - t * 60);
            } else {
              const t = (norm - 0.75) / 0.25;
              r = 255; g = Math.round(255 - t * 155); b = Math.max(0, Math.round(20 - t * 20));
            }

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

function renderChromagramPreview(metrics: any): string | null {
  if (!metrics) return null;

  try {
    const chromaCanvas = document.createElement("canvas");
    chromaCanvas.width = 800;
    chromaCanvas.height = 300;
    const chromaCtx = chromaCanvas.getContext("2d");
    if (chromaCtx) {
      chromaCtx.fillStyle = "#090d16";
      chromaCtx.fillRect(0, 0, 800, 300);

      const chromaData = metrics.timeResolvedChromagram;
      if (chromaData && chromaData.length > 0) {
        const cols = chromaData.length;
        const colWidth = 800 / cols;
        const rows = 12;
        const rowHeight = 300 / rows;

        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const val = chromaData[c][r] || 0;
            let rColor = 0;
            let gColor = 0;
            let bColor = 0;
            if (val < 0.4) {
              const t = val / 0.4;
              rColor = Math.round(10 + t * 32);
              gColor = Math.round(24 + t * 131);
              bColor = Math.round(47 + t * 168);
            } else if (val < 0.8) {
              const t = (val - 0.4) / 0.4;
              rColor = Math.round(42 + t * 213);
              gColor = Math.round(155 + t * 80);
              bColor = Math.round(215 - t * 156);
            } else {
              const t = (val - 0.8) / 0.2;
              rColor = Math.round(255);
              gColor = Math.round(235 + t * 20);
              bColor = Math.round(59 + t * 196);
            }
            const color = `rgba(${rColor}, ${gColor}, ${bColor}, ${0.15 + val * 0.85})`;
            chromaCtx.fillStyle = color;
            chromaCtx.fillRect(c * colWidth, 300 - (r * rowHeight) - rowHeight, colWidth + 0.5, rowHeight + 0.5);
          }
        }
      }
      return chromaCanvas.toDataURL("image/png");
    }
  } catch (err) {
    console.error("Failed to generate chromagram preview:", err);
  }
  return null;
}

function renderRhythmPreview(metrics: any): string | null {
  if (!metrics || !metrics.onsetRhythmTimeline || metrics.onsetRhythmTimeline.length === 0) return null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, 800, 300);

      const timeline = metrics.onsetRhythmTimeline;
      const len = timeline.length;
      const barWidth = 800 / len;

      // Draw rhythm energy bars
      ctx.fillStyle = "#f59e0b"; // bright amber/orange
      for (let i = 0; i < len; i++) {
        const val = timeline[i] || 0;
        const barHeight = val * 300;
        ctx.fillRect(i * barWidth, 300 - barHeight, barWidth, barHeight);
      }

      // Draw beat gridlines if calculatedBpm and calculatedTimeSignature are available
      const bpm = metrics.calculatedBpm;
      const duration = metrics.calculatedDuration;
      const timeSig = metrics.calculatedTimeSignature;
      if (bpm && bpm > 0 && duration && duration > 0 && timeSig && timeSig > 0) {
        const beatInterval = 60 / bpm;
        let beatCount = 0;
        let tBeat = 0;
        while (tBeat < duration) {
          const x = (tBeat / duration) * 800;
          if (x >= 0 && x < 800) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 300);
            
            // Highlight downbeats (first beat of each measure)
            if (beatCount % timeSig === 0) {
              ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            } else {
              ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
            }
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          tBeat += beatInterval;
          beatCount++;
        }
      }

      return canvas.toDataURL("image/png");
    }
  } catch (err) {
    console.error("Failed to generate rhythm preview:", err);
  }
  return null;
}

export default function EngineeringStudioPage({ onBack, critique, trackInfo, localFileBlobUrl, onNavigateToEngineeringDetails, onMeasureCachedSpectrum }: EngineeringStudioPageProps) {
  const trackName = trackInfo?.name || "Independent Demo Track";
  const artistName = trackInfo?.artist || "Independent Songwriter";
  const coverArt = trackInfo?.coverArt;
  const audioSourceUrl = localFileBlobUrl || "";
  const finiteMetric = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined;
  const studioLufs = getLegacyMeterDisplayValue(critique?.liveMetrics, "calculatedLufs");
  const studioLra = getLegacyMeterDisplayValue(critique?.liveMetrics, "calculatedLra");
  const studioPeak = finiteMetric(critique?.liveMetrics?.calculatedTruePeak);
  const studioBass = finiteMetric(critique?.liveMetrics?.calculatedBassEnergy);
  const studioMid = finiteMetric(critique?.liveMetrics?.calculatedMidEnergy);
  const studioHigh = finiteMetric(critique?.liveMetrics?.calculatedHighEnergy);
  const studioPlr = studioPeak !== undefined && studioLufs !== undefined
    ? Math.abs(studioPeak - studioLufs) : undefined;
  const displayMeter = (value: number | undefined, unit: string) =>
    value === undefined ? "Unavailable" : `${value.toFixed(1)} ${unit}`;
  const [cachedSpectrumMeasuring, setCachedSpectrumMeasuring] = useState(false);
  const [cachedSpectrumMessage, setCachedSpectrumMessage] = useState<string | null>(null);
  const cachedSpectrumClickRef = useRef(false);
  const handleCachedSpectrumClick = async () => {
    if (!onMeasureCachedSpectrum || cachedSpectrumClickRef.current) return;
    cachedSpectrumClickRef.current = true;
    setCachedSpectrumMeasuring(true);
    setCachedSpectrumMessage(null);
    try {
      setCachedSpectrumMessage(await onMeasureCachedSpectrum());
    } catch (_error) {
      setCachedSpectrumMessage("Unavailable: cached measurement failed. No score changed.");
    } finally {
      cachedSpectrumClickRef.current = false;
      setCachedSpectrumMeasuring(false);
    }
  };

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
  // Six user-selectable spectral regions; visible panel changes only on click.
  // Default Presence matches the provided Boston screenshot's high-mid focus.
  const [selectedHsrBand, setSelectedHsrBand] = useState(4);

  // Tab View Configuration
  const [activeView, setActiveView] = useState<
    "harmonic" | "signal" | "frequency" | "dynamics" | "stereo" | "spatial" | "harmonicContent" | "genre" | "noise" | "arrangement" | "azimuth"
  >("harmonic");



  // Azimuth Analyzer states
  const [azimuthProgress, setAzimuthProgress] = useState(0);
  const [azimuthPlaying, setAzimuthPlaying] = useState(false);
  const [azimuthRefMode, setAzimuthRefMode] = useState<"user" | "benchmark" | "overlap">("user");
  const [azimuthActiveTab, setAzimuthActiveTab] = useState<"outline" | "waveform" | "melodic" | "spectrogram" | "key" | "azimuth">("azimuth");

  // Never invent checklist actions for an absent report.
  const actionItems: ActionItem[] = Array.isArray(critique?.actionItems) ? critique.actionItems : [];

  const frequencyCorrectionItems = harmonicNodes.map(node => ({
    title: `${node.band}: ${node.frequency}`,
    recommendation: node.problem,
    technicalGuide: node.solution,
    technicalGuideBullets: undefined,
    isFrequencyCorrection: true,
    sourceNodeId: node.id,
  }));
  const combinedChecklistItems = [
    ...actionItems.map(item => ({ ...item, isFrequencyCorrection: false })),
    ...frequencyCorrectionItems,
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
    const bass = studioBass, mid = studioMid, high = studioHigh, lufs = studioLufs;
    if (bass === undefined || mid === undefined || high === undefined || lufs === undefined ||
        [bass, mid, high].some(v => v < 0 || v > 100)) {
      setHarmonicNodes([]);
      return;
    }
    // Existing coarse legacy heuristics only; no keyword-triggered severity.
    const subStatus: HarmonicNode["status"] = bass > 45 ? "critical" : bass < 22 ? "warning" : "optimized";
    const subDbOffset = bass > 45 ? parseFloat((bass * 0.09).toFixed(1))
      : bass < 22 ? parseFloat(((22 - bass) * 0.08 * -1).toFixed(1)) : 1.2;
    const mudSeverity: HarmonicNode["status"] = bass > 38 ? "warning" : "optimized";
    const mudDb = mudSeverity === "warning" ? 2.1 : 0.8;
    const mudFreq = bass > 42 ? "220 Hz" : "265 Hz";
    const boxySeverity: HarmonicNode["status"] = mid > 52 ? "warning" : "optimized";
    const boxyDb = boxySeverity === "warning" ? parseFloat(((mid - 45) * 0.08).toFixed(1)) : 0.6;
    const harshSeverity: HarmonicNode["status"] = high > 38 ? "warning" : "optimized";
    const harshDb = harshSeverity === "warning" ? 2.0 : 0.5;
    const harshFreq = high > 35 ? "3.8 kHz" : "4.4 kHz";
    const bucket = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
    const isOverLimited = lufs > bucket.lufsMax;
    const isUnderLimited = lufs < bucket.lufsMin;
    const airSeverity: HarmonicNode["status"] = isOverLimited || isUnderLimited ? "warning" : "optimized";
    const airDb = isOverLimited ? parseFloat(((lufs - bucket.lufsMax) * 0.4).toFixed(1)) : isUnderLimited ? -1.8 : -0.5;
    const subProblem = `Legacy bass estimate: ${bass}%. ${subStatus === "optimized" ? "No legacy heuristic alert." : "Review the low end by ear; excess or insufficient sub-bass is not established."}`;
    const subSolution = bass > 45 ? "If listening confirms unwanted rumble, audition a 32 Hz high-pass or gentle 2–4 dB low-shelf cut. Compare level-matched."
      : bass < 22 ? "If listening confirms a lack of weight, audition a small low shelf near 50 Hz."
      : "Listen before changing the low end; no correction is established.";
    const mudProblem = `Legacy bass estimate: ${bass}%. ${mudSeverity === "warning" ? "Heuristic low-mid listening check." : "No legacy heuristic alert."} Masking and resonance are not measured here.`;
    const mudSolution = mudSeverity === "warning" ? `If listening confirms congestion, audition a 1.5–2 dB bell cut near ${mudFreq} (Q around 1.4).` : "Preserve intentional warmth; no correction is established.";
    const boxyProblem = `Legacy mid estimate: ${mid}%. ${boxySeverity === "warning" ? "Heuristic midrange listening check." : "No legacy heuristic alert."} Instrument separation is not established.`;
    const boxySolution = boxySeverity === "warning" ? "If listening confirms boxiness, audition a small bell cut near 580 Hz (Q around 1.2)." : "No correction is established; verify by ear.";
    const harshProblem = `Legacy high-frequency estimate: ${high}%. ${harshSeverity === "warning" ? "Heuristic presence-region listening check." : "No legacy heuristic alert."} Sibilance is not established by this ratio.`;
    const harshSolution = harshSeverity === "warning" ? `If listening confirms harshness, audition a gentle cut near ${harshFreq}. Do not de-ess solely from band energy.` : "No correction is established; verify by ear.";
    const airProblem = `Legacy integrated loudness estimate: ${lufs} LUFS; YSS genre target ${bucket.lufsMin} to ${bucket.lufsMax} LUFS. Loudness alone cannot establish limiting or air-band loss.`;
    const airSolution = "Listen for top-end balance and compare level-matched. Audition a small shelf only if needed; loudness does not justify an EQ or limiter change.";
    const derivedNodes: HarmonicNode[] = [
      { id: "sub-rumble", frequency: bass > 45 ? "32 Hz" : bass < 22 ? "40 Hz" : "28 Hz", band: "Sub-Bass", dbOffset: subDbOffset, problem: subProblem, solution: subSolution, detail: subProblem, xPct: 15, yPct: bass > 45 ? 80 : bass < 22 ? 55 : 65, status: subStatus },
      { id: "muddy-mids", frequency: mudFreq, band: "Low-Midrange", dbOffset: mudDb, problem: mudProblem, solution: mudSolution, detail: mudProblem, xPct: 35, yPct: mudSeverity === "warning" ? 72 : 55, status: mudSeverity },
      { id: "boxy-color", frequency: "580 Hz", band: "Midrange", dbOffset: boxyDb, problem: boxyProblem, solution: boxySolution, detail: boxyProblem, xPct: 52, yPct: boxySeverity === "warning" ? 65 : 50, status: boxySeverity },
      { id: "harsh-presence", frequency: harshFreq, band: "High-Midrange", dbOffset: harshDb, problem: harshProblem, solution: harshSolution, detail: harshProblem, xPct: 72, yPct: harshSeverity === "warning" ? 70 : 48, status: harshSeverity },
      { id: "air-texture", frequency: "14.5 kHz", band: "Brilliance/Air", dbOffset: airDb, problem: airProblem, solution: airSolution, detail: airProblem, xPct: 88, yPct: isOverLimited ? 68 : isUnderLimited ? 58 : 42, status: airSeverity }
    ];

    setHarmonicNodes(derivedNodes);
  };

  // Read the real saved 96-band Auralis PCM profile. Never start an analysis,
  // fabricate unmeasured FFT bins, or convert measurements into EQ verdicts.
  const hsrSpectrum = isAnalyzed
    ? buildSonicLensInteractiveEqPreview(critique?.auralisMasterEqProfile, [])
    : null;
  const hsrOverview = summarizeSonicLensMeasuredOverview(critique?.auralisMasterEqProfile);
  const hsrBands = hsrOverview?.bands ?? SONICLENS_SIX_BAND_NAMES.map((name,i)=>({
    name,loHz:SONICLENS_SIX_BAND_EDGES_HZ[i],hiHz:SONICLENS_SIX_BAND_EDGES_HZ[i+1],
    powerSharePct:null,coveragePct:0,status:"UNAVAILABLE" as const,
  }));
  // Restore the genuine logarithmic 20 Hz–20 kHz axis. Its unequal
  // measured-frequency corridor widths drive both the shaded band and button.
  // The source is the validated saved 96-band Auralis FFT path, unchanged.
  const hsrXAxis=(hz:number)=>30+820*Math.log(hz/20)/Math.log(1000);
  // Every area is bounded by actual contiguous populated FFT bins. Null bins
  // stay discontinuous rather than becoming an invented purple fill.
  const hsrFilledSegments=(hsrSpectrum?.rawPath.match(/M[^M]+/g)??[]).flatMap(segment=>{
    const positions=[...segment.matchAll(/[ML]([0-9.]+) ([0-9.]+)/g)];
    if(positions.length<2)return [];
    return [segment+
      " L "+positions[positions.length-1][1]+" 212"+
      " L "+positions[0][1]+" 212 Z"];
  });
  // These are legacy YSS critique narratives, not Auralis judgments. Five
  // existing nodes and their original checklist IDs remain untouched.
  const hsrNodeIds=["sub-rumble",null,"muddy-mids","boxy-color","harsh-presence","air-texture"] as const;
  const selectedHsrNode=harmonicNodes.find(n=>n.id===hsrNodeIds[selectedHsrBand]);
  const selectedHsrRange=hsrBands[selectedHsrBand];
  const hsrMeasuredDescription=describeSonicLensMeasuredBand(hsrOverview,selectedHsrBand);
  const bassText=typeof critique?.mixQuality?.frequencyBalance?.lowEnd==="string"
    ? critique.mixQuality.frequencyBalance.lowEnd.trim() : "";
  const hsrDescription=selectedHsrBand===1
    ? bassText || "Bass-region power is measured above; the spectrum alone does not establish a problem."
    : selectedHsrNode?.problem || "Heuristic guidance unavailable for this frequency region.";
  const hsrRecommendation=selectedHsrBand===1
    ? "Check bass and percussion separation by listening before making any EQ changes."
    : selectedHsrNode?.solution || "";
  const openHsrChecklist=()=>{
    const target=document.getElementById(
      selectedHsrNode?`checklist-item-${selectedHsrNode.id}`:"daw-checklist"
    );
    target?.scrollIntoView({behavior:"smooth",block:"center"});
  };

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


              {/* VIEW 1: Boston-reference Harmonic Spectral Resolution. The
                  screenshot is the visible specification: ONE measured plot,
                  six inside-plot selector cards and ONE selected critique. */}
              {activeView === "harmonic" && (
                <section className="bg-[#121720] border border-[#273459] rounded-3xl p-4 md:p-6 shadow-xl flex flex-col gap-3 text-left"
                  aria-label="Harmonic Spectral Resolution">
                  <header className="flex items-center gap-2.5 border-b border-white/10 pb-4">
                    <Activity className="w-5 h-5 text-blue-400 flex-shrink-0"/>
                    <h2 className="text-[14px] font-extrabold text-slate-100 uppercase leading-snug tracking-wide">
                      Harmonic Spectral Resolution Curve
                      <span className="block">(20 - 20,000 Hz)</span>
                    </h2>
                  </header>
                  <p className="text-[12px] md:text-[13px] leading-relaxed text-slate-300 max-w-4xl">
                    This graph shows how sound energy is distributed across your recording's frequencies, from deep bass on the left to high-frequency detail on the right, as measured by Auralis SonicLens. Each frequency box shows that region's share of measured spectral power; the graph describes the recording, not an EQ setting or a judgment of its quality.
                  </p>

                  {/* The only visible graph: actual saved Auralis power, no
                      slider, second curve, grade targets or simulated FFT. */}
                  <div className="overflow-x-auto rounded-md border border-white/10 bg-[#060a10]">
                    <div className="relative h-[470px] min-w-[880px]">
                      <svg viewBox="0 0 880 470" preserveAspectRatio="none"
                        className="absolute inset-0 h-full w-full"
                        role="img"
                        aria-label="Auralis measured master spectrum, 20 hertz to 20 kilohertz">
                        <defs>
                          <linearGradient id="hsr-boston-purple-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9662d6" stopOpacity="0.60"/>
                            <stop offset="100%" stopColor="#574181" stopOpacity="0.57"/>
                          </linearGradient>
                          <linearGradient id="hsr-boston-white-line" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#ddd5ee"/>
                            <stop offset="55%" stopColor="#b6efdd"/>
                            <stop offset="100%" stopColor="#c3d9ee"/>
                          </linearGradient>
                        </defs>
                        {hsrBands.map((band,i)=>(
                          <g key={band.name}>
                            <rect x={hsrXAxis(band.loHz)} y="16"
                              width={hsrXAxis(band.hiHz)-hsrXAxis(band.loHz)} height="440"
                              fill={i%2===0?"#366479":"#27465a"} fillOpacity="0.30"/>
                            <line x1={hsrXAxis(band.loHz)} x2={hsrXAxis(band.loHz)}
                              y1="16" y2="456" stroke="#030509" strokeWidth="4"/>
                          </g>
                        ))}
                        {[20,50,100,250,500,1000,2000,5000,10000,20000].map(hz=>(
                          <g key={hz}>
                            <line x1={hsrXAxis(hz)} x2={hsrXAxis(hz)}
                              y1="16" y2="457" stroke="#7890ac" opacity="0.14"/>
                            <text x={hsrXAxis(hz)} y="460"
                              textAnchor={hz===20?"start":hz===20000?"end":"middle"}
                              fontSize="10" fill="#8290a5">
                              {hz>=1000?`${hz/1000}k`:`${hz}`}
                            </text>
                          </g>
                        ))}
                        {[30,80,130,180,230,280,330,380,430].map(y=>(
                          <line key={y} x1="30" x2="850" y1={y} y2={y}
                            stroke="#acb7c9" opacity="0.09"/>
                        ))}
                        {hsrSpectrum && (
                          <g>
                            {hsrFilledSegments.map((d,i)=>(
                              <path key={i} d={d} transform="scale(1 2.16)"
                                fill="url(#hsr-boston-purple-fill)" stroke="none"/>
                            ))}
                            <path d={hsrSpectrum.rawPath} transform="scale(1 2.16)"
                              fill="none" stroke="url(#hsr-boston-white-line)"
                              strokeWidth="1.9" strokeLinejoin="round"/>
                          </g>
                        )}
                        {!hsrSpectrum && (
                          <text x="440" y="220" textAnchor="middle" fontSize="15"
                            fill="#cbd5e1">Measured Auralis spectrum unavailable for this report</text>
                        )}
                        <text x="857" y="29" fontSize="10" fill="#c4cad8"
                          textAnchor="start">dBFS/Hz</text>
                      </svg>


                      {/* Each card is bound to the real logarithmic
                          frequency corridor: shorter spans get narrower cards.
                          CSS absolute percentages use the same SVG x mapping. */}
                      <div role="group"
                        aria-label="Select a frequency band to see its analysis and recommendations">
                        {hsrBands.map((band,index)=>(
                          <div key={band.name}
                            className="absolute bottom-7 z-10 min-w-0 px-0.5"
                            style={{
                              left:`${100*hsrXAxis(band.loHz)/880}%`,
                              width:`${100*(hsrXAxis(band.hiHz)-hsrXAxis(band.loHz))/880}%`,
                            }}>
                            <button type="button"
                              onClick={()=>setSelectedHsrBand(index)}
                              aria-pressed={selectedHsrBand===index}
                              className={`w-full min-w-0 h-[124px] rounded-lg px-1 py-2 text-left border
                                flex flex-col gap-1.5 overflow-hidden cursor-pointer
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300
                                ${selectedHsrBand===index
                                  ?"bg-[#080b13]/10 border-[#c3a4ef] ring-1 ring-[#b498e4] shadow-none"
                                  :"bg-[#080b13]/95 border-[#1a2538] hover:border-[#697a9d] shadow-xl"}`}>
                              <span className="text-[11px] leading-tight font-bold text-white break-words">{band.name}</span>
                              <span className="text-[10px] leading-tight font-mono text-slate-200 break-words">
                                {band.loHz}–{band.hiHz} Hz
                              </span>
                              <span className="h-1.5 w-full overflow-hidden rounded-full bg-[#27354e]" aria-hidden="true">
                                <span className="block h-full bg-cyan-400"
                                  style={{width:`${band.powerSharePct ?? 0}%`}}/>
                              </span>
                              <span className="font-semibold text-[11px] leading-tight text-cyan-100 break-words">
                                {band.powerSharePct===null
                                  ? "Unavailable"
                                  : `${band.powerSharePct.toFixed(1)}% of measured power`}
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Only ONE panel, and it is controlled by the six cards. */}
                  <section className="rounded-2xl bg-[#080b11] border border-white/5 p-5 md:p-6"
                    aria-live="polite" aria-label="Selected frequency band analysis">
                    <p className="text-[11px] uppercase tracking-[0.13em] font-bold font-mono text-slate-400">
                      Target Frequency Zone: {selectedHsrNode?.frequency ??
                        `${selectedHsrRange.loHz}–${selectedHsrRange.hiHz} Hz`}
                      {" "}({selectedHsrNode?.band ?? selectedHsrRange.name})
                    </p>
                    <p className="text-cyan-200 text-[12px] font-bold mt-6">Auralis — Measured findings</p>
                    <p className="text-white text-[15px] md:text-[16px] leading-[1.6] mt-2">
                      {hsrMeasuredDescription}
                    </p>
                    <p className="text-slate-400 text-[12px] font-bold mt-5">Legacy heuristic guidance — not measured by Auralis</p>
                    <p className="text-white text-[15px] md:text-[16px] leading-[1.6] font-semibold mt-2">
                      {hsrDescription}
                    </p>
                    {hsrRecommendation && (
                      <p className="text-[14px] leading-relaxed text-slate-200 mt-2">
                        {hsrRecommendation}
                      </p>
                    )}
                    <div className="mt-5 border-t border-white/10 pt-3">
                      <button type="button" onClick={openHsrChecklist}
                        className="text-[12px] text-[#52b4ff] hover:text-[#9cdcff] font-bold uppercase underline underline-offset-2 cursor-pointer">
                        <Sliders className="inline w-4 h-4 mr-1 align-middle"/>
                        View Surgical DAW Guidance in Checklist →
                      </button>
                    </div>
                  </section>

                  {/* Leave the opt-in exact-ID local measurement recoverable
                      ONLY for old reports with no saved Auralis profile. */}
                  {!hsrSpectrum && !!trackInfo?.id && !!onMeasureCachedSpectrum && (
                    <div className="rounded-xl border border-cyan-500/20 p-3 text-xs text-slate-300">
                      <button type="button" onClick={handleCachedSpectrumClick}
                        disabled={cachedSpectrumMeasuring}
                        className="rounded-lg border border-cyan-500/40 px-3 py-2 text-cyan-200 disabled:opacity-50">
                        {cachedSpectrumMeasuring?"Measuring cached spectrum...":"Measure cached spectrum"}
                      </button>
                      {cachedSpectrumMessage && <p role="status" className="mt-2">{cachedSpectrumMessage}</p>}
                    </div>
                  )}
                </section>
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
                          Illustrative sample-peak display (not per-channel true peak)
                        </span>
                        
                        {(() => {
                          const realTruePeak = studioPeak;
                          if (realTruePeak === undefined) return <p className="text-xs text-slate-400">Sample peak unavailable.</p>;
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
                          <ShieldAlert className="w-4 h-4 text-rose-400" /> Legacy sample-peak headroom (approx.)
                        </span>
                        <span className="font-mono font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 bg-rose-500/15 rounded-md text-glow">
                          {studioPeak !== undefined ? studioPeak > -1.0 ? `Review (${studioPeak} dBFS)` : `Below advisory ceiling (${studioPeak} dBFS)` : "Unavailable"}
                        </span>
                      </div>
                    </div>

                    {/* Numeric Statistics */}
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Song Key and Tempo cells removed - detection reliability issues
                          confirmed via real-audio testing (see project notes). Underlying
                          detection code in liveAudioAnalyzer.ts is untouched. */}
                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Integrated Loudness</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow">
                          {displayMeter(studioLufs, "LUFS")}
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">
                          {(() => {
                            const b965 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                            if (studioLufs === undefined) return `Measurement unavailable. YSS target window: ${b965.lufsMin} to ${b965.lufsMax} LUFS.`;
                            if (studioLufs > b965.lufsMax) return "Legacy estimate is above the YSS genre target; loudness alone cannot establish limiting.";
                            if (studioLufs < b965.lufsMin) return "Legacy estimate is below the YSS genre target; compare at matched playback level.";
                            return `Nicely optimized within the ${b965.lufsMin} to ${b965.lufsMax} LUFS target window for ${b965.label}.`;
                          })()}
                        </p>
                      </div>

                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Loudness Range (LRA)</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-cyan-400">
                          {displayMeter(studioLra, "LU")}
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">
                          {(() => {
                            const lraBucket = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                            const lra = studioLra;
                            if (lra === undefined) return `Target window for ${lraBucket.label}: ${lraBucket.lraMin}${lraBucket.lraMax !== null ? `-${lraBucket.lraMax}` : "+"} LU.`;
                            if (lra < lraBucket.lraMin) return `Narrower than the ${lraBucket.lraMin}-${lraBucket.lraMax ?? "+"} LU target for ${lraBucket.label} — mix may feel flat, with verses and choruses too close in perceived volume.`;
                            if (lraBucket.lraMax !== null && lra > lraBucket.lraMax) return `Wider than the ${lraBucket.lraMin}-${lraBucket.lraMax} LU target for ${lraBucket.label} — verify choruses hit hard enough on consumer playback systems.`;
                            return `Healthy dynamic variation, within the ${lraBucket.lraMin}${lraBucket.lraMax !== null ? `-${lraBucket.lraMax}` : "+"} LU target for ${lraBucket.label}.`;
                          })()}
                        </p>
                      </div>

                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Peak-to-loudness proxy (legacy)</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-purple-400">
                          {displayMeter(studioPlr, "dB")}
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">Approximate sample peak minus legacy integrated loudness; not crest factor or proof of compression.</p>
                      </div>

                      <div className="bg-[#0A0B0E] p-4.5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Master Headroom</span>
                        <div className="text-xl font-extrabold text-white mt-1.5 font-mono text-glow text-emerald-400">
                          {displayMeter(studioPeak === undefined ? undefined : -studioPeak, "dB")}
                        </div>
                        <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed">
                          {studioPeak === undefined ? "Measurement unavailable." : "Approximate sample headroom only; intersample clipping is not established."}
                        </p>
                      </div>
                    </div>

                    <div className="bg-neutral-900 border border-white/5 p-4.5 rounded-2xl flex flex-col gap-3 mt-2">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase font-bold tracking-wider border-b border-white/5 pb-1">YSS reference loudness targets (heuristic, not platform measurements)</span>
                      {[
                        { platform: "Spotify Target", spec: `${getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMin} to ${getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMax} LUFS`, user: displayMeter(studioLufs, "LUFS"), status: studioLufs === undefined ? "Unavailable" : `${parseFloat((studioLufs - getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMax).toFixed(1))} dB Offset` },
                        { platform: "Apple Music Target", spec: `${getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMin - 2} LUFS`, user: displayMeter(studioLufs, "LUFS"), status: studioLufs === undefined ? "Unavailable" : `${parseFloat((studioLufs - (getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMin - 2)).toFixed(1))} dB Offset` },
                        { platform: "Tidal Target", spec: `${getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMin} to ${getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMax} LUFS`, user: displayMeter(studioLufs, "LUFS"), status: studioLufs === undefined ? "Unavailable" : `${parseFloat((studioLufs - getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre).lufsMax).toFixed(1))} dB Offset` },
                        { platform: "Club/DJ Master Target", spec: "-8.0 to -11.0 LUFS", user: displayMeter(studioLufs, "LUFS"), status: studioLufs === undefined ? "Unavailable" : studioLufs >= -11 && studioLufs <= -8 ? "Within target" : studioLufs < -11 ? "Below target" : "Above target" }
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
                      <span className="text-2xl font-black text-white mt-1.5 block font-mono text-glow">{displayMeter(studioPlr, "dB")}</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        {studioPlr === undefined ? "Measurement unavailable." : "Legacy peak-to-loudness proxy; does not establish brickwall limiting."}
                      </span>
                    </div>

                    <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block">Legacy loudness range (LRA)</span>
                      <span className="text-2xl font-black text-rose-400 mt-1.5 block font-mono text-glow">{displayMeter(studioLra, "LU")}</span>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        {(() => {
                          const drBucket = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                          const lra = studioLra;
                          if (lra === undefined) return "Measurement unavailable.";
                          if (lra < drBucket.lraMin) return `Below the ${drBucket.lraMin}-${drBucket.lraMax ?? "+"} DR target for ${drBucket.label} - mix may feel over-compressed for this genre.`;
                          if (drBucket.lraMax !== null && lra > drBucket.lraMax) return `Above the ${drBucket.lraMin}-${drBucket.lraMax} DR target for ${drBucket.label} - verify sections still hit hard enough on consumer systems.`;
                          return `Healthy dynamic index within the ${drBucket.lraMin}-${drBucket.lraMax ?? "+"} DR target for ${drBucket.label}.`;
                        })()}
                      </span>
                    </div>

                    <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 text-center">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block">Compression Artifacts</span>
                      <span className="text-2xl font-black text-emerald-400 mt-1.5 block font-mono text-glow">
                        Unavailable
                      </span>
                      <span className="text-[9px] text-slate-400 mt-1 block">Compression artifacts cannot be established from integrated loudness alone.</span>
                    </div>
                  </div>

                  {/* Compressor Simulator visual block */}
                  <div className="bg-[#0A0B0E] border border-white/5 p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Illustrative compressor diagram (not measured)</span>
                      <span className="text-[9px] font-mono text-rose-400">{(() => {
                        const b1135 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                        if (studioLufs === undefined) return "Unavailable";
                        return `${parseFloat((studioLufs - b1135.lufsMax).toFixed(1))} dB vs YSS target; not measured gain reduction`;
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
                    <span className="text-[9.5px] font-mono text-slate-500 uppercase font-bold tracking-wider border-b border-white/5 pb-2">Illustrative timeline loudness estimate</span>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Estimated loudness distribution across the track timeline, derived from waveform envelope analysis.</p>
                    <div className="grid grid-cols-4 gap-2.5 mt-1">
                      {(() => {
                        const points = critique?.liveMetrics?.calculatedWaveformPointsHD ?? critique?.liveMetrics?.calculatedWaveformPoints ?? [];
                        const lufs = studioLufs;
                        if (lufs === undefined || !points.length) return <p className="col-span-4 text-xs text-slate-400">Section estimate unavailable.</p>;
                        const duration = critique?.liveMetrics?.calculatedDuration ?? 0;
                        const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
                        const sections = [
                          { label: "Intro", startPct: 0, endPct: 0.12, slice: points.slice(0, Math.floor(points.length * 0.12)), color: "text-blue-400" },
                          { label: "Verse", startPct: 0.12, endPct: 0.45, slice: points.slice(Math.floor(points.length * 0.12), Math.floor(points.length * 0.45)), color: "text-cyan-400" },
                          { label: "Chorus", startPct: 0.45, endPct: 0.75, slice: points.slice(Math.floor(points.length * 0.45), Math.floor(points.length * 0.75)), color: "text-rose-400" },
                          { label: "Outro", startPct: 0.75, endPct: 1.0, slice: points.slice(Math.floor(points.length * 0.75)), color: "text-slate-400" }
                        ];
                        return sections.map((s) => {
                          if (!s.slice.length) return <div key={s.label} className="text-xs text-slate-400">{s.label}: Unavailable</div>;
                          const avg = s.slice.reduce((a: number, b: number) => a + b, 0) / s.slice.length;
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
                    <p className="text-[9px] text-slate-600 mt-1">* Fixed timeline segments, not detected song sections or measured section LUFS.</p>
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

                  <div className="bg-[#0A0B0E] border border-white/5 rounded-2xl p-4.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase font-bold tracking-wider">Chromagram View</span>
                      <span className="text-[9px] font-mono text-slate-600">Pitch Class Energy Map</span>
                    </div>
                    {critique?.liveMetrics?.timeResolvedChromagram && critique.liveMetrics.timeResolvedChromagram.length > 0 ? (
                      (() => {
                        const url = renderChromagramPreview(critique.liveMetrics);
                        return url ? (
                          <img src={url} alt="Chromagram Preview" className="w-full rounded-xl" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-[160px] flex items-center justify-center text-[10px] text-slate-600 font-mono">Analyze a local file to enable chromagram view.</div>
                        );
                      })()
                    ) : (
                      <div className="h-[160px] flex items-center justify-center text-[10px] text-slate-600 font-mono">Analyze a local file to enable chromagram view.</div>
                    )}
                    <p className="text-[9px] text-slate-600">Horizontal axis: time. Vertical axis: pitch class (C through B). Color intensity: harmonic energy (dark → bright).</p>
                  </div>

                  <div className="bg-[#0A0B0E] border border-white/5 rounded-2xl p-4.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-mono text-slate-500 uppercase font-bold tracking-wider">Rhythm Onset View</span>
                      <span className="text-[9px] font-mono text-slate-600">Onset Strength & Beat Timeline</span>
                    </div>
                    {critique?.liveMetrics?.onsetRhythmTimeline && critique.liveMetrics.onsetRhythmTimeline.length > 0 ? (
                      (() => {
                        const url = renderRhythmPreview(critique.liveMetrics);
                        return url ? (
                          <img src={url} alt="Rhythm Onset Preview" className="w-full rounded-xl" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-[160px] flex items-center justify-center text-[10px] text-slate-600 font-mono">Analyze a local file to enable rhythm view.</div>
                        );
                      })()
                    ) : (
                      <div className="h-[160px] flex items-center justify-center text-[10px] text-slate-600 font-mono">Analyze a local file to enable rhythm view.</div>
                    )}
                    <p className="text-[9px] text-slate-600">Horizontal axis: time. Bar height: rhythmic attack energy. Gridlines: expected beat positions at detected tempo.</p>
                  </div>

                  <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5 text-xs text-slate-400">
                    <p className="font-bold text-slate-200">Spatial and depth measurements unavailable</p>
                    <p className="mt-2">Aggregate band energy cannot establish a goniometer angle, mid/side ratio, instrument placement, dry/wet balance or RT60.</p>
                  </div>
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
                            const lufs = studioLufs;
                            if (lufs === undefined) return "Unavailable";
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
                          Legacy loudness comparison to a YSS genre target, not a measured comparison to a professional reference recording.
                        </p>
                      </div>
                      <div className="bg-lime-500/5 border border-lime-500/15 p-3 rounded-xl mt-4 text-[10.5px] text-lime-400 leading-relaxed font-mono">
                        <span className="block text-slate-200 font-sans font-extrabold uppercase text-[9px] mb-1">A&amp;R Diagnostic:</span>
                        {(() => {
                          const b1339 = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                          if (studioLufs === undefined) return "Measurement unavailable.";
                          if (studioLufs > b1339.lufsMax) return "Legacy loudness estimate above YSS target.";
                          if (studioLufs < b1339.lufsMin) return "Legacy loudness estimate below YSS target.";
                          return "Legacy loudness estimate within YSS target; no spectral quality verdict.";
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

                  <p className="text-xs text-slate-400">Unavailable: noise floor, DC offset, hum and codec artifacts have not been established by the available measurements.</p>
                </div>
              )}

              {/* VIEW 10: Arrangement Patterns */}
              {activeView === "arrangement" && (
                <div className="bg-[#13161C] border border-[#2563EB]/25 rounded-3xl p-6 shadow-xl flex flex-col gap-5 text-left animate-fadeIn">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <LayoutDashboard className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-sm uppercase text-slate-200 tracking-wider">Acoustic Masking Conflicts &amp; Separation Grid</h3>
                  </div>

                  <p className="text-xs text-slate-400">Source-specific masking and separation measurements unavailable. Listen to the relevant stems in your DAW before applying instrument-specific EQ or sidechain changes.</p>
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

                    <div className="xl:col-span-4 bg-[#0A0B0E] border border-white/5 rounded-2xl p-5 text-xs text-slate-400">
                      <p className="font-bold text-slate-200">Soundstage match estimates unavailable</p>
                      <p className="mt-2">Band energy cannot establish instrument panning or a stereo matching percentage. The playback visualization remains available.</p>
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
                  {Object.values(checkedTasks).filter(Boolean).length} / {combinedChecklistItems.length} Solved
                </span>
              </div>

              {/* Spanning clean responsive single-column layout */}
              <div className="flex flex-col gap-4" id="daw-checklist">
                {combinedChecklistItems.map((item, index) => {
                  const isChecked = checkedTasks[index] || false;
                  const isFirstFreq = item.isFrequencyCorrection && (index === 0 || !combinedChecklistItems[index - 1].isFrequencyCorrection);
                  
                  return (
                    <React.Fragment key={index}>
                      {isFirstFreq && (
                        <div className="flex items-center gap-2 mt-2 mb-1 pt-3 border-t border-white/10">
                          <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest">Frequency Corrections</span>
                          <span className="text-[9px] text-slate-500">Derived directly from your track's measured spectrum</span>
                        </div>
                      )}
                      <button
                        id={item.sourceNodeId ? `checklist-item-${item.sourceNodeId}` : undefined}
                        onClick={() => toggleTask(index)}
                        className={`flex items-start text-left gap-3.5 p-4 rounded-2xl border transition-all duration-300 relative group overflow-hidden cursor-pointer ${
                          isChecked
                            ? "bg-[#0A0B0E]/40 border-white/5 text-slate-500"
                            : "bg-[#0A0B0E] border-[#2563EB]/15 hover:border-[#2563EB]/35 hover:bg-white/[0.03] text-slate-300 shadow-md"
                        }`}
                      >
                        <div className="mt-1 flex-shrink-0">
                          {isChecked ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 stroke-[2.5px]" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors" opacity={0.8} />
                          )}
                        </div>
                        
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`text-base md:text-lg font-bold leading-snug tracking-wide ${isChecked ? "line-through text-slate-600" : "text-slate-200"}`}>
                            {item.title}
                          </span>
                          <span 
                            style={{ marginTop: "-1px" }}
                            className="text-sm text-slate-400 leading-relaxed"
                          >
                            {item.recommendation}
                          </span>
                          <div 
                            style={{ marginTop: "0px", paddingTop: "5px" }}
                            className="border-t border-white/5 font-mono text-xs text-blue-400 leading-normal"
                          >
                            <span 
                              style={{ marginBottom: "-3px", marginRight: "0px", fontSize: "11px" }}
                              className="text-slate-500 font-sans font-bold uppercase block"
                            >
                              DAW VALUE:
                            </span>
                            {item.technicalGuideBullets && item.technicalGuideBullets.length > 0 ? (
                              <ul className="list-disc list-inside space-y-1.5 mt-1">
                                {item.technicalGuideBullets.map((bullet, bIdx) => (
                                  <li 
                                    key={bIdx} 
                                    style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#50a2ff" }}
                                    className="leading-relaxed"
                                  >
                                    {bullet}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span 
                                style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#50a2ff" }}
                                className="leading-relaxed"
                              >
                                {item.technicalGuide}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </React.Fragment>
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

    if (activeTab === "waveform" || activeTab === "outline") {
      ctx.lineWidth = activeTab === "outline" ? 2 : 1;
      const pts = liveMetrics?.calculatedWaveformPointsHD ?? liveMetrics?.calculatedWaveformPoints ?? [];
      const points = pts.length > 0 ? pts.length - 1 : 250;
      const maxVal = pts.length > 0 ? Math.max(...pts, 1) : 100;

      const getRealAmp = (i: number): number => {
        if (pts.length === 0) return (height * 0.15);
        const idx = Math.min(pts.length - 1, i);
        return (pts[idx] / maxVal) * (height * 0.4);
      };

      if (activeTab === "waveform") ctx.fillStyle = "rgba(6, 182, 212, 0.12)";
      ctx.strokeStyle = "#06b6d4";

      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const x = (width / points) * i;
        const finalAmp = getRealAmp(i);
        if (i === 0) ctx.moveTo(x, (height * 0.5) - finalAmp);
        else ctx.lineTo(x, (height * 0.5) - finalAmp);
      }
      for (let i = points; i >= 0; i--) {
        const x = (width / points) * i;
        const finalAmp = getRealAmp(i);
        ctx.lineTo(x, (height * 0.5) + finalAmp);
      }
      ctx.closePath();
      if (activeTab === "waveform") ctx.fill();
      ctx.stroke();

    } else if (activeTab === "key") {
      const realKey = liveMetrics?.calculatedKey || "Key Unavailable";
      ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.strokeRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(realKey, width / 2, height / 2);
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
      ctx.fillText("Detected Key (Overall Track)", width / 2, height / 2 + 22);
      ctx.textAlign = "left";
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
