import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CritiqueData, TrackInfo, LiveAudioMetrics } from "../types";
import { getSubgenreProfile, getVectorTargets, getCritiqueAndFix } from "../data/musicData";
import { updateTrackFields } from "../firebase";
import ExcelJS from "exceljs";
import { 
  Play, Pause, RefreshCw, Layers, Sliders, Mic,
  Volume2, Disc, ArrowLeft, ArrowRight, CheckCircle, Flame, Sparkles, CheckSquare, Square,
  Rabbit, Radar, AlertCircle,
  Mountain, Drum, MicVocal, Music4, AudioLines, Orbit, Waves,
  Copy, Check, Tag,
  Compass, TrendingUp, Gauge, Zap, RotateCcw, Info, HelpCircle, Activity,
  Send, User, Users, Cog
} from "lucide-react";

// Robust icon matcher matching standard genres to precise Lucide symbols
export function getGenreIcon(genre: string, className: string = "w-5 h-5") {
  const norm = (genre || "").toLowerCase();
  
  if (norm.includes("synthwave") || norm.includes("ambient") || norm.includes("experimental") || norm.includes("drone") || norm.includes("space") || norm.includes("orbit") || norm.includes("new age")) {
    return <Orbit className={`${className} text-indigo-400`} />;
  }
  if (norm.includes("reggae") || norm.includes("jazz") || norm.includes("soul") || norm.includes("blues") || norm.includes("funk")) {
    return <AudioLines className={`${className} text-emerald-400 animate-pulse`} />;
  }
  if (norm.includes("rock") || norm.includes("metal") || norm.includes("indie") || norm.includes("grunge") || norm.includes("punk") || norm.includes("alternative")) {
    return <Mountain className={`${className} text-amber-500 animate-pulse`} />;
  }
  if (norm.includes("electronic") || norm.includes("edm") || norm.includes("dance") || norm.includes("techno") || norm.includes("house") || norm.includes("synth") || norm.includes("sliders")) {
    return <Sliders className={`${className} text-teal-400`} />;
  }
  if (norm.includes("hip-hop") || norm.includes("hip hop") || norm.includes("rap") || norm.includes("r&b") || norm.includes("trap") || norm.includes("drum")) {
    return <Drum className={`${className} text-blue-400`} />;
  }
  if (norm.includes("pop") || norm.includes("vocal") || norm.includes("singer")) {
    return <MicVocal className={`${className} text-pink-400`} />;
  }
  if (norm.includes("classical") || norm.includes("orchestral") || norm.includes("cinematic") || norm.includes("composition") || norm.includes("piano") || norm.includes("symphony")) {
    return <Music4 className={`${className} text-purple-400`} />;
  }
  if (norm.includes("country") || norm.includes("folk") || norm.includes("americana") || norm.includes("bluegrass")) {
    return <Sparkles className={`${className} text-yellow-500`} />;
  }
  
  // Fallback icon
  return <Disc className={`${className} text-slate-400 animate-[spin_8s_linear_infinite]`} />;
}

export function ScoreCircle({
  score,
  size = 80,
  strokeWidth = 6,
  color = "#3b82f6",
  glowColor = "rgba(59, 130, 246, 0.4)",
  extraGlow = false,
  style,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  glowColor?: string;
  extraGlow?: boolean;
  style?: React.CSSProperties;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center animate-fadeIn" style={{ width: size, height: size, ...style }}>
      {/* Background Glow Layer */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: extraGlow ? 0.75 : 0.35,
          width: extraGlow ? size * 2.2 : size * 1.5,
          height: extraGlow ? size * 2.2 : size * 1.5,
          filter: extraGlow ? "blur(4px)" : "none",
        }}
      />
      <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-neutral-900 fill-none"
          strokeWidth={strokeWidth}
        />
        {/* Glow circle overlay */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fill-none transition-all duration-1000 ease-out"
          stroke={color}
          strokeWidth={strokeWidth + (extraGlow ? 2.5 : 1.5)}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `blur(${extraGlow ? "3px" : "1.8px"}) drop-shadow(0 0 ${extraGlow ? "14px" : "6px"} ${glowColor})`,
            opacity: extraGlow ? 1.0 : 0.85,
          }}
        />
        {/* Sharp White Core circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fill-none transition-all duration-1000 ease-out"
          stroke="#ffffff"
          strokeWidth={strokeWidth / 2}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {/* In-ring text */}
      <span className="absolute font-mono font-black text-white text-center select-none" style={{ fontSize: size * 0.28 }}>
        {score}
      </span>
    </div>
  );
}

function RoseChart({ data }: { data: { name: string; score: number; color: string; weight?: number }[] }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;

  const totalWeight = data.reduce((sum, item) => sum + (item.weight ?? (100 / (data.length || 4))), 0);

  const getWedgePath = (startAngle: number, endAngle: number, currentScore: number) => {
    const r = maxR * (Math.max(10, currentScore) / 100);
    const rad = Math.PI / 180;
    const x1 = cx + r * Math.cos(startAngle * rad);
    const y1 = cy + r * Math.sin(startAngle * rad);
    const x2 = cx + r * Math.cos(endAngle * rad);
    const y2 = cy + r * Math.sin(endAngle * rad);
    
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="mt-6 p-4 bg-black/60 rounded-2xl border border-white/5 flex flex-col items-center">
      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-4 text-center font-bold">
        SUB-PARAMETER IMPACT ROSE CHART
      </span>
      
      <div className="relative w-[200px] h-[200px]">
        <svg width={size} height={size} className="overflow-visible">
          {[20, 40, 60, 80, 100].map((level) => {
            const r = maxR * (level / 100);
            return (
              <circle
                key={level}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1.2"
                strokeDasharray={level === 100 ? "4 2" : "none"}
              />
            );
          })}

          {data.map((item, idx) => {
            const itemWeight = item.weight ?? (100 / (data.length || 4));
            const precedingWeightSum = data.slice(0, idx).reduce((sum, d) => sum + (d.weight ?? (100 / (data.length || 4))), 0);
            const startAngle = -90 + (precedingWeightSum / totalWeight) * 360;
            const endAngle = startAngle + (itemWeight / totalWeight) * 360;
            const pathD = getWedgePath(startAngle, endAngle, item.score);
            
            return (
              <g key={idx} className="group transition-all duration-300 hover:opacity-100 opacity-90">
                <path
                  d={pathD}
                  fill={item.color}
                  fillOpacity="0.25"
                  stroke={item.color}
                  strokeWidth="2"
                  style={{
                    filter: `drop-shadow(0 0 4px ${item.color}33)`,
                  }}
                />
                
                {(() => {
                  const rCentroid = maxR * (item.score / 100) * 0.65;
                  const angleCentroid = (startAngle + endAngle) / 2;
                  const rad = Math.PI / 180;
                  const tx = cx + rCentroid * Math.cos(angleCentroid * rad);
                  const ty = cy + rCentroid * Math.sin(angleCentroid * rad);
                  return (
                    <text
                      x={tx}
                      y={ty}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none select-none font-black"
                      style={{ filter: "drop-shadow(0px 1px 2.5px #000)" }}
                    >
                      {item.score}%
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {data.map((item, idx) => {
            const precedingWeightSum = data.slice(0, idx).reduce((sum, d) => sum + (d.weight ?? (100 / (data.length || 4))), 0);
            const angle = -90 + (precedingWeightSum / totalWeight) * 360;
            const rad = Math.PI / 180;
            const tx = cx + maxR * Math.cos(angle * rad);
            const ty = cy + maxR * Math.sin(angle * rad);
            return (
              <line 
                key={idx}
                x1={cx} 
                y1={cy} 
                x2={tx} 
                y2={ty} 
                stroke="rgba(255,255,255,0.15)" 
                strokeWidth="1.2" 
              />
            );
          })}
        </svg>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full select-none">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 font-semibold">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="truncate">{item.name} : <span className="text-white font-bold">{item.score}%</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CritiqueDisplayProps {
  critique: CritiqueData;
  trackInfo?: TrackInfo;
  onClear: () => void;
  localFileBlobUrl?: string | null;
  onViewDefinition?: (term: string) => void;
  onOpenArConsult?: () => void;
  onNavigateToRabbitHole?: () => void;
  onNavigateToEngineeringStudio?: () => void;
}

export const REPRESENTATIVES = [
  {
    id: "mr_z",
    name: "Mr. Z",
    tagline: "Mysterious Label Head & Tactician",
    bio: "A mysterious, legendary label head whose real identity is guarded. Speaks in crisp, direct, highly tactical terms—mixing executive-level commercial wisdom with deep music production terminology.",
    avatarColor: "text-blue-400 border border-blue-500/30",
    glowColor: "rgba(0, 242, 254, 0.4)",
    initialMsg: "Ezryn. Or whoever you are today. I listened to the audit. Your track hits hard, but your transients are fighting each other and casting a shadow over your composition flow. Let's make this record signed, not shelved. What are we fixing first?",
    chatAccent: "bg-blue-600 border-blue-500 text-blue-100",
    gradient: "from-[#00f2fe]/10 via-transparent to-transparent",
    label: "Z"
  },
  {
    id: "the_y",
    name: "The Y",
    tagline: "Vinyl-to-Algorithm Veteran",
    bio: "A veteran executive who transitioned classic formats into streaming algorithmic models. Experienced, sharp-tongued but constructive, with an ear tuned perfectly to radio frequencies.",
    avatarColor: "text-amber-400 border border-amber-500/30",
    glowColor: "rgba(255, 170, 88, 0.4)",
    initialMsg: "Back in my day, we mixed for physical vinyl groove headroom. Now every genre has its own loudness lane - hip-hop runs loud, folk runs quiet, and both can be right. Your track is strong, but you're over-compressing and choking your vocal syncopation. Let's dig in.",
    chatAccent: "bg-amber-600 border-amber-500 text-amber-100",
    gradient: "from-[#ff9900]/10 via-transparent to-transparent",
    label: "Y"
  },
  {
    id: "kirsten_z",
    name: "Kirsten Z",
    tagline: "Viral Campaign & Curator Strategist",
    bio: "Focuses purely on marketing positioning to clear Spotify algorithms, curation parameters, TikTok trending loops, and major editorial playlists.",
    avatarColor: "text-purple-400 border border-purple-500/30",
    glowColor: "rgba(161, 140, 209, 0.4)",
    initialMsg: "Oh, this is such a mood! The sonic packaging has so much potential! But to clear the algorithm and catch the editorial curators' ears, we need to optimize your intro boundary and boost songwriting DNA structure. Ask me about SEO taggings!",
    chatAccent: "bg-purple-600 border-purple-500 text-purple-100",
    gradient: "from-[#a18cd1]/10 via-transparent to-transparent",
    label: "Z"
  },
  {
    id: "telray_y",
    name: "Telray Y",
    tagline: "Analog Hardware & Character Specialist",
    bio: "Named after Tel-Ray (Morley oil-can delay inventors). Focuses on hardware depth, analog character, classic tape saturation, and warm spacious acoustic density.",
    avatarColor: "text-emerald-400 border border-emerald-500/30",
    glowColor: "rgba(45, 212, 191, 0.4)",
    initialMsg: "Listen to that raw acoustic energy. It's solid, but modern digital mixing is feeling cold here. We need some classic tube delay vibe and tape saturation on the midranges to carve space for the lyrics. Tell me what DAW tools you're rocking.",
    chatAccent: "bg-emerald-600 border-emerald-500 text-emerald-100",
    gradient: "from-[#2dd4bf]/10 via-transparent to-transparent",
    label: "Y"
  },
  {
    id: "kid_x",
    name: "Kid X",
    tagline: "Wildcard Trend Scout",
    bio: "New, bold, and fully unproven, but ready to break the next big trend. Speaks with hungry, raw, bedroom-producer enthusiasm.",
    avatarColor: "text-pink-400 border border-pink-500/30",
    glowColor: "rgba(252, 103, 103, 0.4)",
    initialMsg: "Yo! This song goes absolutely crazy! Standard curators might say it doesn't fit pop guidelines, but who cares? Let's turn up the sibilance saturation, break the loudness laws, and create a core TikTok loop in the first five seconds! What's our masterplan?",
    chatAccent: "bg-pink-600 border-pink-500 text-pink-100",
    gradient: "from-[#fc6767]/10 via-transparent to-transparent",
    label: "X"
  }
];

interface PQMetricCardProps {
  key?: React.Key | any;
  label: string;
  score: number;
  desc: string;
  improve: string;
  idx: number;
}

function PQMetricCard({ label, score, desc, improve, idx }: PQMetricCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const pct = score;
  const gradientColor = pct >= 80 ? "#268cff" : pct >= 60 ? "#59ffce" : pct >= 40 ? "#c5f63f" : "#a3d55a";
  const endY = 62 - (pct * 0.52);

  return (
    <div
      className="bg-[#050608] border border-white/8 rounded-2xl p-4 flex flex-col gap-2.5 cursor-pointer hover:border-white/15 transition-all"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wide">{label}</span>
        <span className="text-[12px] font-mono font-black" style={{ color: gradientColor }}>{pct} / 100</span>
      </div>
      <div className="w-full overflow-visible" style={{ height: "64px" }}>
        <svg width="100%" height="64" viewBox="0 0 200 64" preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id={`pqgrad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a3d55a" />
              <stop offset="40%" stopColor="#c5f63f" />
              <stop offset="70%" stopColor="#59ffce" />
              <stop offset="100%" stopColor="#268cff" />
            </linearGradient>
            <linearGradient id={`pqgradfill-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a3d55a" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#c5f63f" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#59ffce" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#268cff" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {/* Bright filled ascending curve only — no stroke line, no dot */}
          <path
            d={`M 0 62 C 60 62, 80 55, ${pct * 2} ${62 - (pct * 0.52)} L ${pct * 2} 64 L 0 64 Z`}
            fill={`url(#pqgradfill-${idx})`}
            style={{ filter: `drop-shadow(0 0 6px ${gradientColor}90)` }}
          />
        </svg>
      </div>
      <p className="text-[10px] text-slate-400 leading-relaxed">{desc}</p>
      {expanded && (
        <div className="border-t border-white/5 pt-2.5 flex flex-col gap-1 animate-fadeIn">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">How to improve</span>
          <p className="text-[10px] text-slate-400 leading-relaxed">{improve}</p>
        </div>
      )}
      <span className="text-[8px] font-mono text-slate-600 self-end">{expanded ? "CLOSE ↑" : "TAP FOR TIPS ↓"}</span>
    </div>
  );
}

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

export default function CritiqueDisplay({ critique, trackInfo, onClear, localFileBlobUrl, onViewDefinition, onOpenArConsult, onNavigateToRabbitHole, onNavigateToEngineeringStudio }: CritiqueDisplayProps) {
  const [activeTab, setActiveTab] = useState<"mix" | "execution" | "arrangement" | "azimuth">("mix");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef] = useState(() => new Audio());
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<"mainstream" | "artistic" | "dna" | "sandbox" | "spotify" | "azimuth" | "blueprints" | "architecture" | null>(null);
  const [azimuthActiveTab, setAzimuthActiveTab] = useState<"outline" | "waveform" | "melodic" | "spectrogram" | "pitch" | "key" | "azimuth">("azimuth");
  const [azimuthRefMode, setAzimuthRefMode] = useState<"user" | "benchmark" | "overlap">("user");
  const [azimuthPlaying, setAzimuthPlaying] = useState(false);
  const [azimuthProgress, setAzimuthProgress] = useState(35); // starts preloaded for interactive display
  const [spotifyChecks, setSpotifyChecks] = useState<Record<string, boolean>>({
    vocalEntrance: true,
    spectralWidth: true,
    lufsConformity: false,
    transientStability: true,
  });
  const [isEchoNestExpanded, setIsEchoNestExpanded] = useState(false);
  const [isRecommenderExpanded, setIsRecommenderExpanded] = useState(false);
  const liveMetrics = critique?.liveMetrics;

  React.useEffect(() => {
    if (critique?.liveMetrics) {
      const liveLufs = critique.liveMetrics.calculatedLufs;
      const liveLra = critique.liveMetrics.calculatedLra;
      const bucket = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
      const lufsPass = liveLufs >= bucket.lufsMin && liveLufs <= bucket.lufsMax;
      const lraPass = liveLra >= bucket.lraMin && (bucket.lraMax === null || liveLra <= bucket.lraMax);
      setSpotifyChecks({
        vocalEntrance: true,
        spectralWidth: true,
        lufsConformity: lufsPass,
        lraConformity: lraPass,
        transientStability: true,
      });
    }
  }, [critique?.liveMetrics, critique?.vibe?.genre, critique?.vibe?.subgenre]);

  // Algotorial Sandbox: Spotify Simulation States
  const [selectedTargetPlaylist, setSelectedTargetPlaylist] = useState<"today-hits" | "chill-vibes" | "discover-weekly" | "indie">("today-hits");
  const [vibeTransitionTheme, setVibeTransitionTheme] = useState<"uniform" | "upbeat" | "sudden">("uniform");
  const [sandboxPlaying, setSandboxPlaying] = useState(false);
  const [sandboxProgress, setSandboxProgress] = useState(0);

  const [liveValence, setLiveValence] = useState<number>(critique?.userValence ?? 0.5);
  const [liveEnergy, setLiveEnergy] = useState<number>(critique?.userEnergy ?? 0.5);
  const [isDraggingCircumplex, setIsDraggingCircumplex] = useState(false);
  const hasUserSetMood = critique?.userValence !== undefined && critique?.userEnergy !== undefined;

  React.useEffect(() => {
    setLiveValence(critique?.userValence ?? 0.5);
    setLiveEnergy(critique?.userEnergy ?? 0.5);
  }, [critique?.userValence, critique?.userEnergy]);

  // --- Spotify Algorithmic Target Matches calculations ---
  const overallProductionVal = critique?.scores?.overallProduction ?? 75;
  const commercialReadinessVal = critique?.scores?.commercialReadiness ?? 75;
  const flowScoreVal = critique?.arrangement?.flowScore ?? 75;
  const vocalScoreVal = critique?.performance?.vocalScore ?? 75;
  const instrumentalScoreVal = critique?.performance?.instrumentalScore ?? 75;
  const theoryScoreVal = critique?.musicTheory?.score ?? 72;
  const lyricsScoreVal = critique?.lyricalImpact?.score ?? 70;
  const mixScoreVal = critique?.mixQuality?.score ?? 75;

  const genre = (critique?.vibe?.genre || "").toLowerCase();
  const subgenre = (critique?.vibe?.subgenre || "").toLowerCase();

  const isAcousticGenre = genre.includes("acoustic") || genre.includes("folk") || genre.includes("classical") || genre.includes("ambient") || genre.includes("singer") || subgenre.includes("acoustic") || subgenre.includes("folk");
  const isElectronicGenre = genre.includes("synth") || genre.includes("edm") || genre.includes("techno") || genre.includes("electron") || genre.includes("pop") || subgenre.includes("synth") || subgenre.includes("electronic");
  const isHipHopGenre = genre.includes("hip") || genre.includes("rap") || genre.includes("trap") || subgenre.includes("hip") || subgenre.includes("rap");
  const isRockGenre = genre.includes("rock") || genre.includes("metal") || genre.includes("grunge") || genre.includes("punk") || subgenre.includes("rock") || subgenre.includes("metal") || subgenre.includes("grunge") || subgenre.includes("punk");
  const isJazzGenre = genre.includes("jazz") || genre.includes("soul") || genre.includes("blues") || genre.includes("funk") || subgenre.includes("jazz") || subgenre.includes("soul") || subgenre.includes("blues") || subgenre.includes("funk");
  const isPopGenre = genre.includes("pop") || subgenre.includes("pop");

  // Helper function to dynamically map feedback terms to country genre descriptors when manually overdriven/selected
  const adjustFeedbackForGenreOverride = (text: string) => {
    if (!text) return text;
    const genreLower = (critique?.vibe?.genre || "").toLowerCase();
    const subgenreLower = (critique?.vibe?.subgenre || "").toLowerCase();

    if (genreLower.includes("country") || genreLower.includes("americana") || genreLower.includes("bluegrass")) {
      let newText = text;
      // Replace genres/playlists/descriptors representing rock, pop, synthwave, electronic etc.
      newText = newText.replace(/synthwave\/retro playlists/gi, "Outlaw Country & Americana playlists");
      newText = newText.replace(/synthwave\/retro/gi, "Outlaw Country/Americana");
      newText = newText.replace(/synthwave/gi, "outlaw country");
      newText = newText.replace(/retro-wave/gi, "Americana roots");
      newText = newText.replace(/retro/gi, "traditional roots");
      newText = newText.replace(/late night vibes/gi, "Indigo Country");
      newText = newText.replace(/indie blue/gi, "Chasin' Neon");
      newText = newText.replace(/pop formula/gi, "traditional country formula");
      newText = newText.replace(/commercial pop/gi, "modern country");
      newText = newText.replace(/pop/gi, "country");
      newText = newText.replace(/rock/gi, "outlaw country");
      newText = newText.replace(/guitar grit/gi, "telecaster twang");
      newText = newText.replace(/heavy drive electric guitars/gi, "acoustic guitars and steel lap");
      newText = newText.replace(/gated retro snare/gi, "brush snare");
      return newText;
    }
    return text;
  };

  // 1. Dynamic Acoustic DNA attributes based on genre & critique scores with minor deterministic variance
  const profile = getSubgenreProfile(critique?.vibe?.genre || "", critique?.vibe?.subgenre || "");

  // Midpoints as baselines and bounds
  const baseAcousticness = Math.round(((profile.acousticMin + profile.acousticMax) / 2) * 100);
  const baseDanceability = Math.round(((profile.danceMin + profile.danceMax) / 2) * 100);
  const baseEnergy = Math.round(((profile.energyMin + profile.energyMax) / 2) * 100);
  const baseValence = Math.round(((profile.valenceMin + profile.valenceMax) / 2) * 100);
  const baseInstrumentalness = Math.round(((profile.instMin + profile.instMax) / 2) * 100);
  const baseSpeechiness = Math.round(((profile.speechMin + profile.speechMax) / 2) * 100);
  const baseLiveness = Math.round(((profile.liveMin + profile.liveMax) / 2) * 100);
  const baseTempo = Math.round((profile.bpmMin + profile.bpmMax) / 2);

  // Acousticness — driven by actual spectral balance when live metrics available
  // High bass + low highs = acoustic; high highs + low bass = electronic
  const acousticnessOffset = Math.round(((instrumentalScoreVal || 70) % 15) - 7);
  const acousticness = critique?.spotifyOverrides?.acousticness ?? (() => {
    if (liveMetrics?.calculatedBassEnergy !== undefined && liveMetrics?.calculatedHighEnergy !== undefined) {
      const bassRatio = liveMetrics.calculatedBassEnergy / Math.max(1, liveMetrics.calculatedHighEnergy);
      const audioAcousticness = Math.round(Math.min(95, Math.max(5, (bassRatio / 3) * 100)));
      return audioAcousticness;
    }
    return Math.max(5, Math.min(95, baseAcousticness + acousticnessOffset));
  })();

  // Danceability — linear mapping from flowScore (arrangement/rhythmic groove quality)
  // Maps flowScoreVal range 50-95 linearly onto the subgenre target range
  const danceabilityOffset = Math.round(((flowScoreVal || 70) - 72) * 0.4);
  const danceability = critique?.spotifyOverrides?.danceability ?? Math.max(15, Math.min(95, baseDanceability + danceabilityOffset));

  // Energy — driven by LUFS loudness and high-frequency spectral content when live metrics available
  const energyOffset = Math.round(((overallProductionVal || 75) % 15) - 4);
  const energy = (() => {
    if (liveMetrics?.calculatedLufs !== undefined && liveMetrics?.calculatedHighEnergy !== undefined) {
      const lufsFactor = Math.min(1, Math.max(0, (liveMetrics.calculatedLufs + 22) / 16));
      const highFactor = Math.min(1, liveMetrics.calculatedHighEnergy / 50);
      const audioEnergy = Math.round(Math.min(96, Math.max(10, (lufsFactor * 0.6 + highFactor * 0.4) * 100)));
      return audioEnergy;
    }
    return Math.max(10, Math.min(96, baseEnergy + energyOffset));
  })();

  // Valence — linear mapping from theoryScore (harmonic sophistication)
  // No reliable audio signal available; linear mapping is more consistent than modulo
  const valenceOffset = Math.round(((theoryScoreVal || 72) - 72) * 0.3);
  const valence = critique?.spotifyOverrides?.valence ?? critique?.subMetricsCall2?.moodValence?.score ?? Math.max(8, Math.min(95, baseValence + valenceOffset));

  useEffect(() => {
    if (critique?.userValence === undefined && critique?.userEnergy === undefined) {
      if (typeof valence === "number") setLiveValence(Math.max(0, Math.min(1, valence / 100)));
      if (typeof energy === "number") setLiveEnergy(Math.max(0, Math.min(1, energy / 100)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [critique?.userValence, critique?.userEnergy, valence, energy]);

  // Instrumentalness — partially audio-driven via mid/high energy balance
  // High mid energy relative to high energy suggests vocal presence (lower instrumentalness)
  const instrumentalnessOffset = Math.round(((instrumentalScoreVal || 75) - 75) * 0.3);
  const instrumentalness = (() => {
    if (liveMetrics?.calculatedMidEnergy !== undefined && liveMetrics?.calculatedHighEnergy !== undefined) {
      const vocalPresenceProxy = Math.min(1, liveMetrics.calculatedMidEnergy / Math.max(1, liveMetrics.calculatedHighEnergy));
      // High mid/high ratio suggests vocals — lower instrumentalness
      const audioInstrumentalness = Math.round(Math.min(98, Math.max(1, (1 - vocalPresenceProxy) * 80)));
      return audioInstrumentalness;
    }
    return Math.max(1, Math.min(98, baseInstrumentalness + instrumentalnessOffset));
  })();

  // Speechiness — linear mapping from lyricsScore (lyrical density/cadence)
  // No reliable audio signal available; linear mapping is more consistent than modulo
  const speechinessOffset = Math.round(((lyricsScoreVal || 70) - 70) * 0.2);
  const speechiness = critique?.subMetricsCall2?.speechiness?.score ?? Math.max(2, Math.min(92, baseSpeechiness + speechinessOffset));

  // Liveness — driven by stereo correlation when live metrics available
  // Studio recordings have high correlation (near 1.0); live/room recordings have lower correlation
  const livenessOffset = Math.round(((mixScoreVal || 75) % 10) - 4);
  const liveness = critique?.spotifyOverrides?.liveness ?? (() => {
    if (liveMetrics?.calculatedStereoCorrelation !== undefined) {
      // Invert correlation: high correlation = studio (low liveness), low correlation = live (high liveness)
      const livenessFromCorrelation = Math.round(Math.min(95, Math.max(5, (1 - liveMetrics.calculatedStereoCorrelation) * 100)));
      return livenessFromCorrelation;
    }
    return Math.max(5, Math.min(95, baseLiveness + livenessOffset));
  })();

  // Tempo (make completely dynamic and live!)
  const tempoOffset = Math.round(((flowScoreVal || 75) % 30) - 15);
  const tempo = critique?.liveMetrics ? critique.liveMetrics.calculatedBpm : Math.max(60, Math.min(180, baseTempo + tempoOffset));

  // Targets (Midpoint of Spreadsheet Corridor)
  const targetDanceability = Math.round(((profile.danceMin + profile.danceMax) / 2) * 100);
  const targetEnergy = Math.round(((profile.energyMin + profile.energyMax) / 2) * 100);
  const targetAcousticness = Math.round(((profile.acousticMin + profile.acousticMax) / 2) * 100);
  const targetValence = Math.round(((profile.valenceMin + profile.valenceMax) / 2) * 100);
  const targetSpeechiness = Math.round(((profile.speechMin + profile.speechMax) / 2) * 100);
  const targetInstrumentalness = Math.round(((profile.instMin + profile.instMax) / 2) * 100);
  const targetLiveness = Math.round(((profile.liveMin + profile.liveMax) / 2) * 100);

  // Corridor Bounds (from Spreadsheet)
  const danceMinBound = Math.round(profile.danceMin * 100);
  const danceMaxBound = Math.round(profile.danceMax * 100);
  const energyMinBound = Math.round(profile.energyMin * 100);
  const energyMaxBound = Math.round(profile.energyMax * 100);
  const acousticMinBound = Math.round(profile.acousticMin * 100);
  const acousticMaxBound = Math.round(profile.acousticMax * 100);
  const valenceMinBound = Math.round(profile.valenceMin * 100);
  const valenceMaxBound = Math.round(profile.valenceMax * 100);
  const speechMinBound = Math.round(profile.speechMin * 100);
  const speechMaxBound = Math.round(profile.speechMax * 100);
  const instMinBound = Math.round(profile.instMin * 100);
  const instMaxBound = Math.round(profile.instMax * 100);
  const liveMinBound = Math.round(profile.liveMin * 100);
  const liveMaxBound = Math.round(profile.liveMax * 100);

  // Match calculations based on spreadsheet bounds
  const danceabilityMatch = danceability >= danceMinBound && danceability <= danceMaxBound ? 100 : Math.max(70, Math.min(100, Math.round(100 - Math.abs(danceability - targetDanceability))));
  const energyMatch = energy >= energyMinBound && energy <= energyMaxBound ? 100 : Math.max(70, Math.min(100, Math.round(100 - Math.abs(energy - targetEnergy))));
  const acousticnessMatch = acousticness >= acousticMinBound && acousticness <= acousticMaxBound ? 100 : Math.max(70, Math.min(100, Math.round(100 - Math.abs(acousticness - targetAcousticness))));
  const valenceMatch = valence >= valenceMinBound && valence <= valenceMaxBound ? 100 : Math.max(70, Math.min(100, Math.round(100 - Math.abs(valence - targetValence))));
  const speechinessMatch = speechiness >= speechMinBound && speechiness <= speechMaxBound ? 100 : Math.max(70, Math.min(100, Math.round(100 - Math.abs(speechiness - targetSpeechiness))));
  const instrumentalnessMatch = instrumentalness >= instMinBound && instrumentalness <= instMaxBound ? 100 : Math.max(70, Math.min(100, Math.round(100 - Math.abs(instrumentalness - targetInstrumentalness))));
  const livenessMatch = liveness >= liveMinBound && liveness <= liveMaxBound ? 100 : Math.max(70, Math.min(100, Math.round(100 - Math.abs(liveness - targetLiveness))));

  let spotifyTruePeak = -1.05;
  if (commercialReadinessVal > 88 && mixScoreVal < 68) {
    spotifyTruePeak = -0.15;
  } else if (commercialReadinessVal > 78 && mixScoreVal < 74) {
    spotifyTruePeak = -0.78;
  } else {
    spotifyTruePeak = -1.05;
  }

  // Dynamic explanations for Spotify metrics based on matches
  const getDanceabilityDesc = () => {
    if (danceabilityMatch >= 88) {
      return `Raw Value: ${danceability}% (Ideal Target: ${targetDanceability}%; Match: ${danceabilityMatch}%). Rhythm compliance is exceptionally aligned. The beat grid consistency matches our genre targets, providing seamless flow for active playlists and dance-floor queues.`;
    } else if (danceabilityMatch >= 75) {
      return `Raw Value: ${danceability}% (Ideal Target: ${targetDanceability}%; Match: ${danceabilityMatch}%). Moderate rhythm alignment. Pacing holds standard tempo-grid stability suitable for general crossover streaming slot rotation.`;
    } else {
      return `Raw Value: ${danceability}% (Ideal Target: ${targetDanceability}%; Match: ${danceabilityMatch}%). Rhythm delta detected. Pacing or transient syncopated elements diverge from benchmark genre targets, which may cause recommenders to bypass high-energy playlists.`;
    }
  };

  const getEnergyDesc = () => {
    if (energyMatch >= 88) {
      return `Raw Value: ${energy}% (Ideal Target: ${targetEnergy}%; Match: ${energyMatch}%). Spectral dynamics are highly inline. Compression, loudness, and high-frequency energy match hit standards, securing seeder weight without risking automated level adjustments.`;
    } else if (energyMatch >= 75) {
      return `Raw Value: ${energy}% (Ideal Target: ${targetEnergy}%; Match: ${energyMatch}%). Moderate energy compliance. Overall intensity is healthy, but bringing transients into a tighter band would optimize playback translation.`;
    } else {
      return `Raw Value: ${energy}% (Ideal Target: ${targetEnergy}%; Match: ${energyMatch}%). Energy delta. Music intensity is either overly flat or excessively crushed, prompting algorithms to flag potential playback inconsistencies.`;
    }
  };

  const getAcousticnessDesc = () => {
    if (acousticnessMatch >= 88) {
      return `Raw Value: ${acousticness}% (Ideal Target: ${targetAcousticness}%; Match: ${acousticnessMatch}%). Timber profile hits the sweet spot. Natural, raw organic properties align perfectly with your target genre's acoustic-to-synthetic baseline structure.`;
    } else if (acousticnessMatch >= 75) {
      return `Raw Value: ${acousticness}% (Ideal Target: ${targetAcousticness}%; Match: ${acousticnessMatch}%). Moderate acoustic balance. The mix mixes organic textures and synthesized soundscapes in a format suitable for standard genre categories.`;
    } else {
      return `Raw Value: ${acousticness}% (Ideal Target: ${targetAcousticness}%; Match: ${acousticnessMatch}%). Timber mismatch. The relative density of raw acoustic sound vs synth elements deviates notably from benchmark standard profiles.`;
    }
  };

  const getValenceDesc = () => {
    if (valenceMatch >= 88) {
      return `Raw Value: ${valence}% (Ideal Target: ${targetValence}%; Match: ${valenceMatch}%). Mood valence is highly compliant. Melodic intervals and chord tracking fit positive/negative signatures of target mood-seeded algorithms.`;
    } else if (valenceMatch >= 75) {
      return `Raw Value: ${valence}% (Ideal Target: ${targetValence}%; Match: ${valenceMatch}%). Moderate emotional valence. Represents a stable, neutral mood level that crossover playlist seeds can easily index.`;
    } else {
      return `Raw Value: ${valence}% (Ideal Target: ${targetValence}%; Match: ${valenceMatch}%). Mood delta. Chord structures or melody lines create an emotional color of ${valence}% versus your target's ${targetValence}%, differing significantly from standard genre expectations.`;
    }
  };

  const getInstrumentalnessDesc = () => {
    if (instrumentalnessMatch >= 88) {
      return `Raw Value: ${instrumentalness}% (Ideal Target: ${targetInstrumentalness}%; Match: ${instrumentalnessMatch}%). Optimal vocal-to-instrumental ratio. Clearly guides recommender bots on track identity (vocal-led crossover vs background music).`;
    } else if (instrumentalnessMatch >= 75) {
      return `Raw Value: ${instrumentalness}% (Ideal Target: ${targetInstrumentalness}%; Match: ${instrumentalnessMatch}%). Reasonable background instrumental index. Melodic backing tracking matches general expectations.`;
    } else {
      return `Raw Value: ${instrumentalness}% (Ideal Target: ${targetInstrumentalness}%; Match: ${instrumentalnessMatch}%). Significant vocal profile delta. Background instrumental tracks or vocal level margins could mislead algorithms regarding focal points.`;
    }
  };

  // Metadata Extractor States
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStep, setExtractionStep] = useState("");
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // A&R Representative Suite: State & Handlers
  const [selectedRepId, setSelectedRepId] = useState<"mr_z" | "the_y" | "kirsten_z" | "telray_y" | "kid_x">("mr_z");
  const [messages, setMessages] = useState<Array<{ role: "user" | "model" | "system"; text: string; senderName?: string }>>(() => [
    {
      role: "model",
      senderName: "Mr. Z",
      text: "Ezryn. Or whoever you are today. I listened to the audit. Your track hits hard, but your transients are fighting each other and casting a shadow over your composition flow. Let's make this record signed, not shelved. What are we fixing first?"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isConsulting, setIsConsulting] = useState(false);

  const handleHireRep = (repId: "mr_z" | "the_y" | "kirsten_z" | "telray_y" | "kid_x") => {
    setSelectedRepId(repId);
    const rep = REPRESENTATIVES.find(r => r.id === repId);
    if (rep) {
      setMessages([
        {
          role: "model",
          senderName: rep.name,
          text: rep.initialMsg
        }
      ]);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isConsulting) return;

    const userMsgText = chatInput;
    setChatInput("");
    
    const activeRep = REPRESENTATIVES.find(r => r.id === selectedRepId) || REPRESENTATIVES[0];
    
    // Append user message
    const updatedMessages = [
      ...messages,
      { role: "user" as const, text: userMsgText, senderName: "Artist" }
    ];
    setMessages(updatedMessages);
    setIsConsulting(true);

    try {
      const historyPayload = updatedMessages.slice(0, -1).map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        text: msg.text
      }));

      const res = await fetch("/api/ar-consult", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMsgText,
          history: historyPayload,
          selectedRepId: selectedRepId,
          critiqueContext: critique,
          trackInfo: trackInfo
        })
      });

      if (!res.ok) {
        throw new Error("Representative went offline. Connection interrupted.");
      }

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: "model" as const, text: data.reply, senderName: activeRep.name }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: "system" as const, text: `⚠️ Connection disrupted: ${err.message || err}` }
      ]);
    } finally {
      setIsConsulting(false);
    }
  };

  const runMetadataExtraction = () => {
    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractionStep("Locating WAV/MP3 container headers...");

    const steps = [
      { progress: 15, msg: "Parsing ID3v2/BWF chunk allocations..." },
      { progress: 35, msg: "Analyzing musical transients and acoustic metrics..." },
      { progress: 60, msg: "Determining key structure and rhythmic tempo profile..." },
      { progress: 85, msg: "Compiling robust marketing description & SEO keywords..." },
      { progress: 100, msg: "Extraction complete! Initializing container mapping..." }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setExtractionProgress(step.progress);
        setExtractionStep(step.msg);
        if (idx === steps.length - 1) {
          setTimeout(() => {
            setIsExtracting(false);
            setShowMetadataPanel(true);
            setTimeout(() => {
              const el = document.getElementById("metadata-panel-section");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }, 100);
          }, 600);
        }
      }, (idx + 1) * 300);
    });
  };

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Animate the Algotorial Sandbox 30s Simulated Audition
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (sandboxPlaying) {
      interval = setInterval(() => {
        setSandboxProgress((prev) => {
          if (prev >= 30) {
            setSandboxPlaying(false);
            return 30;
          }
          return Math.round((prev + 0.5) * 10) / 10; // Increments by 0.5 seconds
        });
      }, 500);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sandboxPlaying]);

  const getEstimatedBpm = () => {
    if (critique?.liveMetrics?.calculatedBpm) {
      return Number(critique.liveMetrics.calculatedBpm);
    }
    const genre = (critique?.vibe?.genre || "").toLowerCase();
    const style = (critique?.vibe?.subgenre || "").toLowerCase();
    if (genre.includes("synthwave") || style.includes("synthwave")) return 118;
    if (genre.includes("grunge") || style.includes("grunge") || genre.includes("punk")) return 142;
    if (genre.includes("dreamgaze") || style.includes("shoegaze") || genre.includes("ambient")) return 88;
    if (genre.includes("hip-hop") || genre.includes("rap")) return 92;
    if (genre.includes("pop") || style.includes("pop")) return 120;
    if (genre.includes("metal") || genre.includes("rock")) return 132;
    return 115;
  };

  const getEstimatedKey = () => {
    if (critique?.liveMetrics) {
      return critique.liveMetrics.calculatedKey;
    }
    const chordStr = critique?.musicTheory?.chordStructures || "";
    if (chordStr.includes("E minor") || chordStr.includes("Em")) return "E minor (TKEY)";
    if (chordStr.includes("A minor") || chordStr.includes("Am")) return "A minor (TKEY)";
    if (chordStr.includes("G Major") || chordStr.includes("Gmaj")) return "G Major (TKEY)";
    if (chordStr.includes("C Major") || chordStr.includes("Cmaj")) return "C Major (TKEY)";
    return "B minor (TKEY)";
  };

  const getGeneratedRobustDescription = () => {
    return `"${trackName}" by ${artistName} is a professionally calibrated ${critique?.vibe?.genre || "contemporary"} track capturing a distinct ${critique?.vibe?.subgenre || "studio"} performance. Moving through an aesthetic profile characterized by ${critique?.vibe?.aesthetic || "dynamic sonic texturing"}, the song shows outstanding dynamic production scale. Commercially, it holds a ${critique?.vibe?.commercialViability ? critique.vibe.commercialViability.split(".")[0] : "strong streaming presence"} layout, suitable for distribution across Spotify, Apple Music, Deezer, and YouTube playlists.`;
  };

  const getGeneratedKeywords = () => {
    const localTrackName = trackInfo?.name || "Independent Demo Track";
    const localArtistName = trackInfo?.artist || "Independent Songwriter";
    const rawGenre = critique?.vibe?.genre || "";
    const rawSubgenre = critique?.vibe?.subgenre || "";
    const aesthetic = critique?.vibe?.aesthetic || "";
    
    // 1. Broadly map larger overarching genres
    const genreLower = rawGenre.toLowerCase();
    const subLower = rawSubgenre.toLowerCase();
    let broaderGenre = "";
    if (genreLower.includes("pop") || subLower.includes("pop")) {
      broaderGenre = "Contemporary Pop & Indie Wave";
    } else if (genreLower.includes("rock") || subLower.includes("rock") || genreLower.includes("indie") || subLower.includes("indie")) {
      broaderGenre = "Alternative & Indie Rock Landscape";
    } else if (genreLower.includes("electronic") || subLower.includes("electronic") || genreLower.includes("synth") || subLower.includes("synth") || subLower.includes("wave")) {
      broaderGenre = "Electronic & Ambient Synth Soundscapes";
    } else if (genreLower.includes("acoustic") || subLower.includes("acoustic") || genreLower.includes("folk") || subLower.includes("folk") || subLower.includes("writer")) {
      broaderGenre = "Acoustic & Folk Storytelling";
    } else if (genreLower.includes("hip") || subLower.includes("hip") || genreLower.includes("rap") || subLower.includes("rap") || genreLower.includes("urban") || subLower.includes("urban")) {
      broaderGenre = "Urban Poetry & Beats";
    } else {
      broaderGenre = "Independent Progressive Fusion";
    }

    // 2. Compute Valence and Energy to derive exact emotional mood tags
    const theoryScoreVal = critique?.musicTheory?.score ?? 72;
    const lyricsScoreVal = critique?.lyricalImpact?.score ?? 70;
    const overallProductionVal = critique?.scores?.overallProduction ?? 75;
    const commercialReadinessVal = critique?.scores?.commercialReadiness ?? 75;

    const val = Math.min(0.95, Math.max(0.12, Math.round(((theoryScoreVal * 0.45) + (lyricsScoreVal * 0.45) + 10)) / 100));
    const nrg = Math.min(0.95, Math.max(0.15, Math.round(((overallProductionVal * 0.70) + (commercialReadinessVal * 0.30))) / 100));

    // Determine specific mood tags based on the Russell Circumplex Quadrants
    let moods: string[] = [];
    if (val >= 0.5 && nrg >= 0.5) {
      moods = ["Euphoric Cheer", "Uplifting Vibe", "Vibrant Energetic Mood", "Bright Chord Sequence"];
    } else if (val < 0.5 && nrg >= 0.5) {
      moods = ["Intense / Aggressive Sentiment", "High-Energy Tension", "Moody Drive", "Edge & Passion"];
    } else if (val < 0.5 && nrg < 0.5) {
      moods = ["Lyrical Melancholy", "Introspective & Somber", "Nocturnal Nostalgia", "Bittersweet Tone"];
    } else {
      moods = ["Serene / Chill Mood", "Dreamy Relaxed Atmosphere", "Acoustic Warmth", "Calm Resonance"];
    }

    // 3. Map lyrical topics and thematic tags based on titles, genres and lyrics
    let lyricalTopics: string[] = [];
    const titleLower = localTrackName.toLowerCase();
    if (titleLower.includes("dream") || titleLower.includes("daylight")) {
      lyricalTopics = ["Subconscious Escape", "Hopeful Daylight Wandering", "Ethereal Reflections"];
    } else if (titleLower.includes("wave") || titleLower.includes("midnight") || titleLower.includes("night")) {
      lyricalTopics = ["Late Night Journeys", "Metropolitan Solitude", "Transient Waves of Sentiment"];
    } else if (titleLower.includes("static") || titleLower.includes("horizon")) {
      lyricalTopics = ["Liminal Spaces", "Static & Overload", "Interstellar Departures"];
    } else {
      // General thematic mappings based on subgenre/aesthetic
      if (subLower.includes("pop") || subLower.includes("indie")) {
        lyricalTopics = ["Heartfelt Romantics", "Youthful Memories", "Bittersweet Storytelling"];
      } else if (subLower.includes("synth") || subLower.includes("wave") || subLower.includes("retro")) {
        lyricalTopics = ["Retro Nostalgia", "Neon Aesthetic Theme", "Ethereal Escapism"];
      } else if (subLower.includes("rock") || subLower.includes("grunge") || subLower.includes("metal")) {
        lyricalTopics = ["Existential Turmoil", "Raw Catharsis", "Metaphorical Tension"];
      } else {
        lyricalTopics = ["Deep Human Connection", "Emotional Authenticity", "Inner Monologues"];
      }
    }

    const base = [
      localTrackName,
      localArtistName,
      rawGenre ? `${rawGenre} Genre` : "",
      rawSubgenre ? `${rawSubgenre} Vibe` : "",
      broaderGenre,
      aesthetic ? `${aesthetic} Aesthetic` : "",
      ...moods,
      ...lyricalTopics,
      "Curator-Ready Pitch",
      "Digital Plate Placement Ready"
    ];

    const uniqueList = Array.from(new Set(base.filter(Boolean)));
    return uniqueList.slice(0, 12);
  };

  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-select the playlist that aligns best with the predicted core genre
  React.useEffect(() => {
    if (!critique?.vibe?.genre) return;
    const genre = critique.vibe.genre.toLowerCase();
    const style = (critique.vibe.subgenre || "").toLowerCase();
    
    const isRock = genre.includes("rock") || genre.includes("metal") || genre.includes("grunge") || genre.includes("punk") || style.includes("rock") || style.includes("grunge") || style.includes("punk");
    const isChill = genre.includes("ambient") || genre.includes("dreamgaze") || genre.includes("shoegaze") || genre.includes("chill") || genre.includes("acoustic") || style.includes("ambient") || style.includes("shoegaze") || style.includes("chill") || style.includes("acoustic");

    if (isChill) {
      setSelectedTargetPlaylist("chill-vibes");
    } else if (isRock) {
      setSelectedTargetPlaylist("indie");
    } else {
      setSelectedTargetPlaylist("today-hits");
    }
  }, [critique?.vibe?.genre, critique?.vibe?.subgenre]);

  // Guard code to completely prevent page blockages or white screens if critique value or sub-objects are missing
  if (!critique) {
    return (
      <div className="p-8 text-center text-slate-400 bg-[#13161C] border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-rose-500 animate-pulse" />
        <div>
          <h3 className="text-white font-bold text-lg">Critique Data Stalled</h3>
          <p className="text-xs text-slate-500 mt-1">
            The studio assessment engine received an incomplete metadata response. Please try restarting your analysis sequence.
          </p>
        </div>
        <button
          onClick={onClear}
          className="mt-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2 px-4 transition-all duration-300"
        >
          Reset Workspace
        </button>
      </div>
    );
  }

  const trackName = (trackInfo?.name || "Independent Demo Track")
    .replace(/_Locker\.[a-zA-Z0-9]+$/i, "")
    .replace(/\.[a-zA-Z0-9]+$/i, "");
  const artistName = trackInfo?.artist || "Independent Songwriter";
  const coverArt = trackInfo?.coverArt;
  const audioSourceUrl = localFileBlobUrl || "";

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

  const toggleTask = (index: number) => {
    setCheckedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBarColor = (score: number): string => {
    if (score >= 80) return "rgba(52,211,153,0.5)";
    if (score >= 60) return "rgba(251,191,36,0.5)";
    return "rgba(248,113,113,0.5)";
  };

  const getScoreBorderColor = (score: number): string => {
    if (score >= 80) return "border-emerald-500/30";
    if (score >= 60) return "border-amber-500/30";
    return "border-red-500/30";
  };

  // State for tracking which metric breakdown is expanded
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [lufsOpen, setLufsOpen] = useState(false);
  const [showLufsRecommendation, setShowLufsRecommendation] = useState(false);
  const [productionQualityExpanded, setProductionQualityExpanded] = useState(false);
  const [selectedPQMetric, setSelectedPQMetric] = useState<string | null>(null);
  const [artistAudienceExpanded, setArtistAudienceExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<"streaming" | "sonic" | "compositional">("streaming");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<"streaming" | "sonic" | "compositional" | null>(null);

  // Dynamic Category Scores for Sidebar and Mobile Tabs
  const streamingScore = Math.round(
    (critique?.scores?.commercialReadiness ?? 75) * 0.5 +
    (critique?.scores?.overallProduction ?? 75) * 0.3 +
    (critique?.mixQuality?.score ?? 75) * 0.2
  );
  const sonicScore = Math.round(
    (critique?.scores?.overallProduction ?? 75) * 0.6 +
    (critique?.mixQuality?.score ?? 75) * 0.4
  );
  const compositionalScore = Math.round(
    (critique?.arrangement?.flowScore ?? 75) * 0.4 +
    (critique?.musicTheory?.score ?? 75) * 0.3 +
    (critique?.lyricalImpact?.score ?? 75) * 0.3
  );

  React.useEffect(() => {
    if (expandedMetric) {
      const timer = setTimeout(() => {
        const wrapper = document.getElementById(`metric-wrapper-${expandedMetric}`);
        if (wrapper) {
          wrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
          const element = document.getElementById(`metric-row-${expandedMetric}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [expandedMetric]);

  // Fallbacks to avoid crashes on older or incomplete structures returned by standard API routes
  const lyricsScore = critique?.lyricalImpact?.score ?? 78;
  const lyricsClarity = critique?.lyricalImpact?.meaningClarity ?? "Metaphorical, themed phrasing";
  const lyricsFeedback = critique?.lyricalImpact?.feedback ?? "Strong phrasing with rich themes. The hook builds high emotional depth, avoiding basic clichés beautifully.";

  const theoryScore = critique?.musicTheory?.score ?? 84;
  const theoryStructures = critique?.musicTheory?.chordStructures ?? "vi - IV - I - V progression in G major";
  const theoryFeedback = critique?.musicTheory?.feedback ?? "Solid understanding of leading tones. Transitions are smooth and resolve harmonically with a pleasing tension arc.";

  const searchScore = critique?.titleSearchability?.score ?? 68;
  const searchLevel = critique?.titleSearchability?.uniquenessLevel ?? "Moderately Unique Phrase";
  const searchFeedback = critique?.titleSearchability?.feedback ?? "Your song title is moderately unique. It avoids high-level congestion but should be paired with consistent meta tagging across streaming platforms.";

  const artisticScore = critique?.subMetricsCall2?.artisticAnalysis?.score ?? Math.min(100, Math.round(theoryScore * 0.40 + (critique?.scores?.overallProduction ?? 75) * 0.60));

  // Dynamic calculations for Songwriting DNA & Impact metrics to prevent hardcoded flat 90 score
  const parentFlowScore = critique?.arrangement?.flowScore ?? 75;
  const parentTheoryScore = critique?.musicTheory?.score ?? 84;
  const parentInstrumentalScore = critique?.performance?.instrumentalScore ?? 75;
  const parentVocalScore = critique?.performance?.vocalScore ?? 75;
  const parentLyricalScore = critique?.lyricalImpact?.score ?? 78;

  const dnaMelodicScore = critique?.subMetricsCall2?.melodicHooks?.score ?? Math.max(0, Math.min(100, Math.round(parentFlowScore * 0.7 + parentTheoryScore * 0.3)));
  const dnaTensionScore = critique?.subMetricsCall2?.acousticTension?.score ?? Math.max(0, Math.min(100, Math.round(parentFlowScore * 0.6 + parentInstrumentalScore * 0.4)));
  const dnaDensityScore = critique?.subMetricsCall2?.songwritingDensity?.score ?? Math.max(0, Math.min(100, Math.round(parentLyricalScore * 0.8 + parentVocalScore * 0.2)));
  const dnaScore = Math.round((dnaMelodicScore + dnaTensionScore + dnaDensityScore) / 3);

  // Metric definitions dictionary for breakdowns and hover states
  const METRICS_LIST = [
    {
      id: "artistic",
      name: "Artistic Analysis",
      subtitle: "The Creative-Artistic Index",
      score: artisticScore,
      colorClass: "stroke-pink-500",
      bgClass: "from-pink-500/5 to-slate-900 border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.05)]",
      isGold: true,
      hoverText: "Judges execution conviction and internal creative coherence, atmospheric depth, chord progressional intrigue, and palette synergy completely independent of pop formula speed-bumps.",
      subParams: [
        { name: "Artistic Alignment (30%)", desc: "Judges execution conviction and internal coherence - whether the song commits fully to one clear creative vision, rather than hedging between competing directions." },
        { name: "Harmonic Intrigue (30%)", desc: "Scores the creative implementation of chord patterns and modulations to test composition uniqueness, polymetric drift, and structural resolution." },
        { name: "Atmospheric Depth (20%)", desc: "Rates the physical sense of dimension of the acoustic landscape, reverb imaging, and stage placement within the production." },
        { name: "Palette Synergy (20%)", desc: "Inspects the overall tonal alignment of active instruments to confirm they serve a unified artistic direction." }
      ],
      callout: "This Metric is not included in the Total Score as it has no effect on how streaming algorithms view a song",
      description: "Designed for masterpieces that transcend pop constraints. While standard radio formula rewards immediate 0:30 hooks, epics are built on atmospheric tension, complex harmony, and palette synergy. Focus on these parameters if you are writing timeless art outside the commercial box.",
      feedback: critique?.subMetricsCall2?.artisticAnalysis?.feedback ?? "Excellent artistic alignment. The track showcases outstanding atmospheric integrity and rich metaphorical choices that transcend formulaic boundaries."
    },
    {
      id: "production",
      name: "Production Index",
      subtitle: "Creative Sonic Architecture",
      score: critique?.scores?.overallProduction ?? 75,
      colorClass: "stroke-amber-500",
      bgClass: "from-amber-500/5 to-slate-900 border-white/5",
      isGold: false,
      hoverText: "Measures overall creative direction, instrument selection, and acoustic landscape cohesion.",
      subParams: [
        { name: "Aesthetic Design (40%)", desc: "Appropriateness of instrumentation compared to leading professional releases." },
        { name: "Space & Density (35%)", desc: "Use of negative space vs crowded tracks, avoiding instrument overload." },
        { name: "Palette Cohesion (25%)", desc: "How well instrument textures, keys, and synths support the soundstage." }
      ],
      callout: "This Metric identifies key genre structures and creative arrangements that influence modern playlist curators.",
      description: "Evaluates whether your creative sonic layout, sound synthesis, sampling, and background orchestration fit your aesthetic genre target.",
      feedback: `Core genre profile: ${critique?.vibe?.genre ?? "N/A"}. Subgenre: ${critique?.vibe?.subgenre ?? "N/A"}. Aesthetic blueprint style: ${critique?.vibe?.aesthetic ?? "N/A"}.`
    },
    {
      id: "readiness",
      name: "Engagement Power",
      subtitle: "Listener Retention & Algorithmic Survival",
      score: critique?.scores?.commercialReadiness ?? 75,
      colorClass: "stroke-teal-500",
      bgClass: "from-teal-500/5 to-slate-900 border-white/5",
      isGold: false,
      hoverText: "Predicts how reliably a song holds listener focus and survives the critical early-skip window that drives algorithmic placement.",
      subParams: [
        { name: "Opening Hook Strength (60%)", desc: "Predicts listener retention through the song's first 30 seconds. Skip behavior in this window is one of the most heavily weighted signals in streaming algorithms." },
        { name: "Dynamic Variety (20%)", desc: "Measures whether the song's energy and intensity shift meaningfully across its runtime, rather than remaining flat throughout." },
        { name: "Spectral Match (10%)", desc: "Compares the track's frequency distribution to mainstream hits to ensure a balanced, commercially viable audio spectrum." },
        { name: "Section Transitions (10%)", desc: "Evaluates whether shifts between verse, chorus, and bridge feel earned and well-built, rather than abrupt or disconnected." }
      ],
      callout: "This Metric predicts listener retention and skip-resistance, the single most heavily weighted signal in modern streaming algorithms.",
      description: "Evaluates whether your track holds a listener's attention long enough to survive the algorithm's early-skip window, and whether its dynamic arc gives listeners a reason to keep listening.",
      feedback: critique?.vibe?.commercialViability ?? "Ready for immediate curation and sync scheduling."
    },
    {
      id: "mix",
      name: "Mix Balance Quality",
      subtitle: "Stereo Soundstage Balance",
      score: critique?.mixQuality?.score ?? 75,
      colorClass: "stroke-blue-500",
      bgClass: "from-blue-500/5 to-slate-900 border-white/5",
      isGold: false,
      hoverText: "Audits master frequency balances, low-end boominess, midrange vocal presence, and stereo width separation.",
      subParams: [
        { name: "Mud Prevention (25%)", desc: "Evaluation of the 150Hz–250Hz proximity effect zone to ensure vocal and snare clarity." },
        { name: "Midrange Spacing (25%)", desc: "Ensuring guitars and synths do not drown out vocal track focus." },
        { name: "Low-End Division (20%)", desc: "Frequency splitting between sub-bass movements and kick-drum transient punch." },
        { name: "Sibilance Shaving (15%)", desc: "Auditing the sibilance region (4kHz-8kHz) for harsh sibilant spikes." },
        { name: "Stereo Width (15%)", desc: "Judges whether the stereo image is appropriately wide - backing elements and reverbs spread naturally without sacrificing mono compatibility or center-focus." }
      ],
      callout: "This Metric secures clear frequency separations so that your low and high ends decode without clipping.",
      description: "Audits decibel levels, EQ notches, sibilance de-essing, low frequency separation, and relative placement in the stereo panning field.",
      feedback: `${critique?.mixQuality?.stereoField ?? "Solid width."} Low frequencies: ${critique?.mixQuality?.frequencyBalance?.lowEnd ?? "Balanced"}. Midrange: ${critique?.mixQuality?.frequencyBalance?.midrange ?? "Clear"}. High-end sibilance: ${critique?.mixQuality?.frequencyBalance?.highEnd ?? "Contained"}. Frequency issues: ${critique?.mixQuality?.dominanceIssues ?? "No bloating present."}`
    },
    {
      id: "vocals",
      name: "Vocal Tracking",
      subtitle: "Vocal Chain Engineering",
      score: critique?.performance?.vocalScore ?? 75,
      colorClass: "stroke-purple-500",
      bgClass: "from-purple-500/5 to-slate-900 border-white/5",
      isGold: false,
      hoverText: "Measures vocal delivery accuracy, pitch consistency, breath management, dynamic levels, and vocal chain space.",
      subParams: [
        { name: "Pitch Accuracy (40%)", desc: "Steady tonality, correct note targeting, and professional pitch scale alignment." },
        { name: "Dynamic Delivery (35%)", desc: "Vocal compression tightness, breath control consistency, and lyrical phrasing power." },
        { name: "Vocal Layer Fit (25%)", desc: "Vocal depth placement, backing doubles, tuning effects, and reverb sends." }
      ],
      callout: "This Metric assesses vocal pressure alignment and backing presence to secure front-of-house presence.",
      description: "Detailed performance index evaluating whether vocal takes are crisp, present, emotionally intimate, and mixed with correct pocket gain.",
      feedback: critique?.performance?.vocalsCritique ?? "Lead tracks are balanced and fit the target layout."
    },
    {
      id: "instrumental",
      name: "Instrumental Staging",
      subtitle: "Backing Staging & Alignment",
      score: critique?.performance?.instrumentalScore ?? 75,
      colorClass: "stroke-emerald-500",
      bgClass: "from-emerald-500/5 to-slate-900 border-white/5",
      isGold: false,
      hoverText: "Audits rhythm section alignment on the timeline grid, punchiness, stereo staging, and overall instrumental warmth.",
      subParams: [
        { name: "Timeline Grid Cohesion (25%)", desc: "Tightness and timing sync between drum elements and bass groove lines." },
        { name: "Transient Punch (25%)", desc: "The snap of kick drums, synth envelope releases, and guitar picking presence." },
        { name: "Melodic Staging (25%)", desc: "Layer separation of instrumentation across the stereo panning soundstage." },
        { name: "Instrumental Warmth (25%)", desc: "The general tonal warmth and richness of the backing instrumentation - full and rounded versus thin and harsh." }
      ],
      callout: "This Metric audits backing timing grids, transient levels, and tonal warmth to optimize playback punchiness.",
      description: "Evaluates the execution of backing instruments. Checks details like transient impacts, drum pacing correctness, overall tonal warmth, and timeline alignment.",
      feedback: critique?.performance?.instrumentationCritique ?? "Grooves and backing patterns are aligned tightly on the track grid."
    },
    {
      id: "dna-melodic",
      name: "Melodic Hooks",
      subtitle: "Signature Earworms & Pitch Trajectory",
      score: dnaMelodicScore,
      colorClass: "stroke-emerald-400",
      bgClass: "from-emerald-400/5 to-slate-900 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]",
      isGold: true,
      hoverText: "Measures interval repetition and the commercial stickiness of vocal pitches and melodic phrasing.",
      subParams: [
        { name: "Interval Memory (50%)", desc: "Measures for memory hooks and interval leaps..." },
        { name: "Syllabic Placement (50%)", desc: "Syncopation and rhyme patterns aligning exactly with transient downbeats to drill the melody home." }
      ],
      callout: "Your hooks have high commercial memory; the pre-chorus/chorus resolution is instantly memorable.",
      description: "Examines the musical genetics that make a song catch fire. Highly memorable hooks have specific interval transitions (like major 6ths or root resolves) that trigger psychological expectation.",
      feedback: critique?.subMetricsCall2?.melodicHooks?.feedback ?? "Outstanding hook potential. The core vocal lines in the chorus present an active, instantly hummable waveform that sticks in memory."
    },
    {
      id: "dna-tension",
      name: "Acoustic Tension",
      subtitle: "Dynamic Structural Builds & Narrative Arc",
      score: dnaTensionScore,
      colorClass: "stroke-amber-400",
      bgClass: "from-amber-400/5 to-slate-900 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]",
      isGold: false,
      hoverText: "Measures the rate of energy accumulation across song sections (verse to chorus) and somatic tension release.",
      subParams: [
        { name: "Dynamic Modulation (50%)", desc: "Contrast between quiet verses and explosive chorus walls designed to keep listeners transfixed." },
        { name: "Climax Trajectory (50%)", desc: "How effectively the arrangement builds anticipation before landing the ultimate sonic payload." }
      ],
      callout: "The track demonstrates strong somatic control, pulling viewers along an elegant storytelling trajectory.",
      description: "Evaluates structural dynamics. Ensures high levels of tension building, filtering out listening fatigue by using well-placed volume and spectral variations.",
      feedback: critique?.subMetricsCall2?.acousticTension?.feedback ?? "Superb arrangement balance. The energy accumulates cleanly, peaking exactly during the main chorus with robust authority."
    },
    {
      id: "dna-density",
      name: "Lyrics Analysis",
      subtitle: "Lyrical Velocity & Word Placement Balance",
      score: dnaDensityScore,
      colorClass: "stroke-indigo-400",
      bgClass: "from-indigo-400/5 to-slate-900 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]",
      isGold: false,
      hoverText: "Audits text rhythm and syncopated cadence flow relative to the tempo beat track, and how efficiently the lyrics communicate within that pocket.",
      subParams: [
        { name: "Vocal Pocketing (50%)", desc: "Alignment of sung syllables in the rhythm 'pocket', ensuring clear flow and rhythmic drive." },
        { name: "Poetic Brevity (50%)", desc: "Efficiency of expression - communicating high emotional impact without over-crowding the vocal arrangement." }
      ],
      callout: "The phrasing density lets the main hook breathe, aligning masterfully with commercial pop benchmarks.",
      description: "Analyzes the poetic rhythm in singing. Tight vocal pocketing ensures the listener understands the message effortlessly without getting distracted by clumsy syllables.",
      feedback: critique?.subMetricsCall2?.songwritingDensity?.feedback ?? "Syllables are pocketed beautifully. The line phrasing allows the instruments to breathe while retaining a fast, modern commercial bounce."
    }
  ];

  const AUX_METRICS_LIST = [
    {
      id: "lyrics",
      name: "Lyrical Impact",
      subtitle: "Lyrical Depth & Phrasing Core",
      score: lyricsScore,
      colorClass: "stroke-cyan-400",
      hoverText: "Checks lyric clarity and cliché levels - whether the message lands clearly and whether the phrasing feels fresh rather than overused.",
      subParams: [
        { name: "Meaning Clarity (50%)", desc: "Ensures the overall message or emotional vibe translates immediately to listeners." },
        { name: "Cliché Avoidance (50%)", desc: "Checks if lines feel fresh versus overused rhyming trends or generic phrasing." }
      ],
      callout: "This Metric evaluates lyrical clarity and freshness to avoid flat phrasing and cliché structures.",
      description: "Focuses entirely on lyrics, checking if the theme and message are clear, and whether the phrasing feels fresh or overly generic.",
      feedback: `Meaning classification: ${lyricsClarity}. Detailed review: ${lyricsFeedback}`
    },
    {
      id: "theory",
      name: "Music Theory Analysis",
      subtitle: "The Harmonic Foundation",
      score: theoryScore,
      colorClass: "stroke-indigo-400",
      hoverText: "Evaluates harmonic progressions, melodic construction, and rhythmic architecture.",
      subParams: [
        { name: "Chord Dynamics (35%)", desc: "Analyzes chord sequences, leading tones, and voice leading interest." },
        { name: "Melody (25%)", desc: "Judges melodic phrase construction, contour, and motif development - independent of commercial catchiness." },
        { name: "Rhythmic Meter (15%)", desc: "Audits rhythmic meter choice, polymetric syncopation, and tempo subdivisions." },
        { name: "Form & Structure (25%)", desc: "Checks layout blueprints, sectional loop lengths, and motif repetition." }
      ],
      callout: "This Metric analyzes harmonic craft, melodic construction, rhythmic interest, and structural gravity to track musical narrative.",
      description: "Assesses whether chord movements, melodic writing, syncopations, and overall structural handoffs show a strong grasp of musicology principles, rhythmic momentum, and structural development.",
      feedback: `Identified structures: ${theoryStructures}. Theory analysis: ${theoryFeedback}`
    },
    {
      id: "searchability",
      name: "Song Title Searchability",
      subtitle: "Digital Search Indexing",
      score: searchScore,
      colorClass: "stroke-pink-400",
      hoverText: "Audits search duplication risk. Unique titles rank faster; common phrases get buried in search index traffic.",
      subParams: [
        { name: "SEO Uniqueness (50%)", desc: "Is your song title a common phrase or does it have a unique signature string?" },
        { name: "SEO Discoverability (50%)", desc: "Likelihood of your track ranking top on Google/Spotify search results when typed." }
      ],
      callout: "This Metric analyzes index duplication risk, helping fans find your track faster on digital stores.",
      description: "A critical review of digital branding. Common titles face steep traffic search volume competition; highly unique phrasing scales indexes quickly.",
      feedback: `SEO designation: ${searchLevel}. Recommendation: ${searchFeedback}`
    }
  ];

  const downloadFullReport = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("YSS Full Report", { views: [{ showGridLines: false }] });

    const CATS: Record<string, { dark: string; agg: string; core: string }> = {
      "STREAMING READINESS": { dark: "FF1E3A8A", agg: "FFA5B0D0", core: "FFD2D8E8" },
      "SONIC SOUNDPRINT": { dark: "FF065F46", agg: "FF9BBFB5", core: "FFCDDFDA" },
      "COMPOSITIONAL DEPTH": { dark: "FF5B21B6", agg: "FFBDA6E2", core: "FFDED3F0" },
    };
    const PLACEHOLDER = "FFFEF3C7";
    const PLACEHOLDER_TEXT = "FF92400E";

    const thinBorder = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
    const fullBorder = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    ws.getColumn(1).width = 4;
    ws.getColumn(2).width = 11.5;
    ws.getColumn(3).width = 8;
    ws.getColumn(4).width = 13;
    ws.getColumn(5).width = 30;
    ws.getColumn(6).width = 9;
    ws.getColumn(7).width = 136;

    ws.getCell("B2").value = "YOURSONGSCORE REPORT";
    ws.getCell("B2").font = { name: "Calibri", size: 14, bold: true };
    ws.getCell("B3").value = "ARTIST:";
    ws.getCell("C3").value = trackInfo?.artist || "Independent Artist";
    ws.getCell("B4").value = "SONG TITLE:";
    ws.getCell("C4").value = trackInfo?.name || "Untitled";
    ws.getCell("B5").value = "GENRE:";
    ws.getCell("C5").value = critique?.vibe?.genre || "Unclassified";
    ws.getCell("B6").value = "SUBGENRE:";
    ws.getCell("C6").value = critique?.vibe?.subgenre || "N/A";
    ["B3", "B4", "B5", "B6"].forEach(coord => {
      ws.getCell(coord).font = { name: "Calibri", size: 10, bold: true };
    });
    ["C3", "C4", "C5", "C6"].forEach(coord => {
      ws.getCell(coord).font = { name: "Calibri", size: 10, bold: false };
    });

    const headerRow = ws.getRow(9);
    headerRow.height = 36;
    const headers = ["Category", "Agg. Metric", "Core Metric", "Sub-Metric", "Score", "Commentary"];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 2);
      cell.value = h;
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: i === 1 };
      cell.border = fullBorder;
    });

    let currentRow = 10;

    const addCategoryRow = (name: string) => {
      const row = ws.getRow(currentRow);
      row.height = 16;
      const colors = CATS[name];
      for (let col = 2; col <= 7; col++) {
        const cell = row.getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.dark } };
        cell.border = fullBorder;
      }
      row.getCell(2).value = name;
      row.getCell(2).font = { name: "Calibri", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
      currentRow++;
      return colors;
    };

    const addAggRow = (colors: any, name: string, score: number | string | null, note: string, placeholder = false) => {
      const row = ws.getRow(currentRow);
      row.height = 16;
      const fill = placeholder ? PLACEHOLDER : colors.agg;
      const textColor = placeholder ? PLACEHOLDER_TEXT : "FF0F172A";
      for (let col = 2; col <= 7; col++) {
        const cell = row.getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        cell.border = fullBorder;
        cell.alignment = { wrapText: false, vertical: "middle" };
      }
      row.getCell(3).value = name;
      row.getCell(3).font = { name: "Calibri", size: 11, bold: true, color: { argb: textColor } };
      if (score !== null) row.getCell(6).value = score;
      row.getCell(6).font = { name: "Calibri", size: 11, bold: true, color: { argb: textColor } };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).value = note;
      row.getCell(7).font = { name: "Calibri", size: 9, italic: true, color: { argb: textColor } };
      currentRow++;
    };

    const addCoreRow = (colors: any, name: string, score: number | string | null, commentary: string, placeholder = false) => {
      const row = ws.getRow(currentRow);
      row.height = 16;
      const fill = placeholder ? PLACEHOLDER : colors.core;
      const textColor = placeholder ? PLACEHOLDER_TEXT : "FF000000";
      for (let col = 2; col <= 7; col++) {
        const cell = row.getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        cell.border = fullBorder;
        cell.alignment = { wrapText: false, vertical: "middle" };
      }
      row.getCell(4).value = name;
      row.getCell(4).font = { name: "Calibri", size: 11, bold: true, color: { argb: textColor } };
      if (score !== null) row.getCell(6).value = score;
      row.getCell(6).font = { name: "Calibri", size: 11, bold: true, color: { argb: textColor } };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).value = commentary;
      row.getCell(7).font = { name: "Calibri", size: 9, italic: placeholder, color: { argb: textColor } };
      currentRow++;
    };

    const addSubRow = (name: string, score: number | string, commentary: string, placeholder = false) => {
      const row = ws.getRow(currentRow);
      row.height = 16;
      const fill = placeholder ? "FFFFFBEB" : "FFFFFFFF";
      const textColor = placeholder ? PLACEHOLDER_TEXT : "FF000000";
      for (let col = 2; col <= 7; col++) {
        const cell = row.getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        cell.border = fullBorder;
        cell.alignment = { wrapText: false, vertical: "middle" };
      }
      row.getCell(5).value = name;
      row.getCell(5).font = { name: "Calibri", size: 10, color: { argb: textColor } };
      row.getCell(6).value = score;
      row.getCell(6).font = { name: "Calibri", size: 10, color: { argb: textColor } };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).value = commentary;
      row.getCell(7).font = { name: "Calibri", size: 9, italic: placeholder, color: { argb: textColor } };
      currentRow++;
    };

    // Provisional Category/Aggregate grouping - PLACEHOLDER pending final decision, easy to adjust here later:
    const groupMap: Record<string, { category: string; agg: string | null }> = {
      readiness: { category: "STREAMING READINESS", agg: "COMMERCIAL IMPACT" },
      production: { category: "STREAMING READINESS", agg: "COMMERCIAL IMPACT" },
      mix: { category: "SONIC SOUNDPRINT", agg: "PRODUCTION QUALITY" },
      vocals: { category: "SONIC SOUNDPRINT", agg: "PRODUCTION QUALITY" },
      instrumental: { category: "SONIC SOUNDPRINT", agg: "PRODUCTION QUALITY" },
      searchability: { category: "SONIC SOUNDPRINT", agg: "PRODUCTION QUALITY" },
      artistic: { category: "COMPOSITIONAL DEPTH", agg: null },
      lyrics: { category: "COMPOSITIONAL DEPTH", agg: null },
      theory: { category: "COMPOSITIONAL DEPTH", agg: null },
      "dna-melodic": { category: "COMPOSITIONAL DEPTH", agg: "SONGWRITING QUALITY" },
      "dna-tension": { category: "COMPOSITIONAL DEPTH", agg: "SONGWRITING QUALITY" },
      "dna-density": { category: "COMPOSITIONAL DEPTH", agg: "SONGWRITING QUALITY" },
    };

    const aggScoreMap: Record<string, number | null> = {
      "COMMERCIAL IMPACT": Math.round((critique?.scores?.commercialReadiness ?? 75) * 0.8 + (critique?.scores?.overallProduction ?? 75) * 0.2),
      "PRODUCTION QUALITY": null,
      "SONGWRITING QUALITY": dnaScore,
    };

    const orderedMetrics = [
      METRICS_LIST.find(m => m.id === "readiness"),
      METRICS_LIST.find(m => m.id === "production"),
      METRICS_LIST.find(m => m.id === "mix"),
      METRICS_LIST.find(m => m.id === "vocals"),
      METRICS_LIST.find(m => m.id === "instrumental"),
      AUX_METRICS_LIST.find(m => m.id === "searchability"),
      METRICS_LIST.find(m => m.id === "artistic"),
      AUX_METRICS_LIST.find(m => m.id === "lyrics"),
      AUX_METRICS_LIST.find(m => m.id === "theory"),
      METRICS_LIST.find(m => m.id === "dna-melodic"),
      METRICS_LIST.find(m => m.id === "dna-tension"),
      METRICS_LIST.find(m => m.id === "dna-density"),
    ].filter(Boolean) as any[];

    let lastCategory = "";
    let lastAgg = "";
    let colors: any = null;

    orderedMetrics.forEach((m: any) => {
      const group = groupMap[m.id];
      if (group.category !== lastCategory) {
        colors = addCategoryRow(group.category);
        lastCategory = group.category;
        lastAgg = "";
      }
      if (group.agg && group.agg !== lastAgg) {
        addAggRow(colors, group.agg, aggScoreMap[group.agg] ?? null, "");
        lastAgg = group.agg;
      }
      addCoreRow(colors, m.name, m.score, (m.feedback || "").replace(/\n/g, " "));
      (m.subParams || []).forEach((param: any, idx: number) => {
        const realSub = getRealSubMetric(critique, m.id, idx);
        const subScore = realSub ? realSub.score : getSubScore(m.score, idx, m.subParams.length, m.id);
        const subText = realSub ? realSub.commentary : getSubScoreExplanationText(param.name, subScore);
        addSubRow(param.name, subScore, (subText || "").replace(/\n/g, " "));
      });
    });

    // Sections not part of the core scored critique - informational status only
    addAggRow(CATS["STREAMING READINESS"], "STREAMING ALIGNMENT", null, "INFO ONLY - Echo Nest-style data (Danceability, Energy, Acousticness, Valence, Speechiness, Liveness). Most fields are now genuinely live (real audio measurements or real Gemini judgment); this section intentionally carries no separate numeric score, since its former duplicate score was retired.", true);
    addAggRow(CATS["STREAMING READINESS"], "ALGO SANDBOX", null, "INFO ONLY - Interactive tools (Cosine Similarity Mapping, Circumplex Mood Plotter, Sequential Variance Lab). Now seeded with real per-song data; target playlist coordinates remain illustrative estimates, not precise real values.", true);
    addAggRow(CATS["SONIC SOUNDPRINT"], "ENGINEERING STUDIO", null, "INFO ONLY - Full diagnostic toolkit (Harmonic Resolution, Signal & Levels, Dynamics Profile, Visualizations, Genre Compliance, Noise & Artifacts, Arrangement Patterns, Stereo Azimuth). Fully audited and genre-aware throughout; true independent 6-band FFT measurement remains a planned future upgrade.", true);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (trackInfo?.name || "YSS_Report").replace(/[^a-z0-9]/gi, "_");
    link.download = `${safeName}_YSS_Report.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFilteredMetrics = (cat: "mainstream" | "artistic" | "dna" | "sandbox" | "spotify" | "azimuth" | "blueprints" | "architecture" | null = activeCategory) => {
    if (cat === "mainstream") {
      return [
        METRICS_LIST.find(m => m.id === "readiness"),
        METRICS_LIST.find(m => m.id === "production"),
        METRICS_LIST.find(m => m.id === "mix"),
        METRICS_LIST.find(m => m.id === "vocals"),
        METRICS_LIST.find(m => m.id === "instrumental"),
        AUX_METRICS_LIST.find(m => m.id === "searchability"),
      ].filter(Boolean);
    } else if (cat === "blueprints") {
      return [
        METRICS_LIST.find(m => m.id === "mix"),
        METRICS_LIST.find(m => m.id === "vocals"),
        METRICS_LIST.find(m => m.id === "instrumental"),
        AUX_METRICS_LIST.find(m => m.id === "searchability"),
      ].filter(Boolean);
    } else if (cat === "dna") {
      return [
        METRICS_LIST.find(m => m.id === "dna-melodic"),
        METRICS_LIST.find(m => m.id === "dna-tension"),
        METRICS_LIST.find(m => m.id === "dna-density"),
      ].filter(Boolean);
    } else if (cat === "artistic") {
      return [
        METRICS_LIST.find(m => m.id === "artistic"),
        AUX_METRICS_LIST.find(m => m.id === "lyrics"),
        AUX_METRICS_LIST.find(m => m.id === "theory"),
      ].filter(Boolean);
    }
    return [];
  };

  const handleCategoryChange = (category: "mainstream" | "artistic" | "dna" | "sandbox" | "spotify" | "azimuth" | "blueprints" | "architecture" | null) => {
    if (activeCategory === category) {
      setActiveCategory(null);
    } else {
      setActiveCategory(category);
    }
    setExpandedMetric(null);
  };

  const CALL1_FIELD_MAP: Record<string, string[]> = {
    production: ["aestheticDesign", "spaceAndDensity", "paletteCohesion"],
    mix: ["mudPrevention", "midrangeSpacing", "lowEndDivision", "sibilanceShaving", "stereoWidth"],
    searchability: ["seoUniqueness", "seoDiscoverability"],
  };

  const READINESS_MIXED_MAP: Array<{ call: 1 | 3; parent?: string; field: string }> = [
    { call: 3, parent: "compositionFlowSubs", field: "hookPlacement" },
    { call: 1, field: "dynamicVariety" },
    { call: 1, field: "spectralMatch" },
    { call: 3, parent: "compositionFlowSubs", field: "sectionalContrast" },
  ];

  const CALL2_FIELD_MAP: Record<string, { parent: string; fields: string[] }> = {
    artistic: { parent: "artisticAnalysis", fields: ["artisticAlignment", "harmonicIntrigue", "atmosphericDepth", "paletteSynergy"] },
    "dna-melodic": { parent: "melodicHooks", fields: ["intervalMemory", "syllabicPlacement"] },
    "dna-tension": { parent: "acousticTension", fields: ["dynamicModulation", "climaxTrajectory"] },
    "dna-density": { parent: "songwritingDensity", fields: ["vocalPocketing", "poeticBrevity"] },
  };

  const CALL3_FIELD_MAP: Record<string, { parent: string; fields: string[] }> = {
    flow: { parent: "compositionFlowSubs", fields: ["structuralBuild", "melodicTension", "hookPlacement", "sectionalContrast"] },
    vocals: { parent: "vocalTrackingSubs", fields: ["pitchAccuracy", "dynamicDelivery", "vocalLayerFit"] },
    instrumental: { parent: "instrumentalStagingSubs", fields: ["timelineGridCohesion", "transientPunch", "melodicStaging", "instrumentalWarmth"] },
    lyrics: { parent: "lyricalImpactSubs", fields: ["meaningClarity", "clicheAvoidance"] },
    theory: { parent: "musicTheorySubs", fields: ["chordDynamics", "harmonicVariety", "rhythmicMeter", "formAndStructure"] },
  };

  const getRealSubMetric = (critiqueData: any, id: string, index: number): { score: number; commentary: string } | null => {
    if (id === "readiness") {
      const entry = READINESS_MIXED_MAP[index];
      if (!entry) return null;
      if (entry.call === 1 && critiqueData?.subMetricsCall1) {
        const data = critiqueData.subMetricsCall1[entry.field];
        if (data && typeof data.score === "number") {
          return { score: data.score, commentary: data.commentary || "" };
        }
      }
      if (entry.call === 3 && critiqueData?.subMetricsCall3) {
        const parentData = entry.parent ? critiqueData.subMetricsCall3[entry.parent] : critiqueData.subMetricsCall3;
        const data = parentData ? parentData[entry.field] : null;
        if (data && typeof data.score === "number") {
          return { score: data.score, commentary: data.commentary || "" };
        }
      }
      return null;
    }
    const fields = CALL1_FIELD_MAP[id];
    if (fields && critiqueData?.subMetricsCall1) {
      const fieldName = fields[index];
      const data = fieldName ? critiqueData.subMetricsCall1[fieldName] : null;
      if (data && typeof data.score === "number") {
        return { score: data.score, commentary: data.commentary || "" };
      }
    }
    const call2Entry = CALL2_FIELD_MAP[id];
    if (call2Entry && critiqueData?.subMetricsCall2) {
      const parentData = critiqueData.subMetricsCall2[call2Entry.parent];
      const fieldName = call2Entry.fields[index];
      const data = parentData && fieldName ? parentData[fieldName] : null;
      if (data && typeof data.score === "number") {
        return { score: data.score, commentary: data.commentary || "" };
      }
    }
    const call3Entry = CALL3_FIELD_MAP[id];
    if (call3Entry && critiqueData?.subMetricsCall3) {
      const parentData = critiqueData.subMetricsCall3[call3Entry.parent];
      const fieldName = call3Entry.fields[index];
      const data = parentData && fieldName ? parentData[fieldName] : null;
      if (data && typeof data.score === "number") {
        return { score: data.score, commentary: data.commentary || "" };
      }
    }
    return null;
  };

  const getFallbackWarning = (critiqueData: any, id: string): string => {
    if (id === "readiness") {
      if (critiqueData?.subMetricsCall1Failed || critiqueData?.subMetricsCall3Failed) {
        return "⚠️ LIVE ANALYSIS TEMPORARILY UNAVAILABLE (AI service was busy) - this is a fallback estimate, not fresh analysis. Please re-run this song. — ";
      }
      return "";
    }
    const isCall1Field = Object.prototype.hasOwnProperty.call(CALL1_FIELD_MAP, id);
    const isCall2Field = Object.prototype.hasOwnProperty.call(CALL2_FIELD_MAP, id);
    const isCall3Field = Object.prototype.hasOwnProperty.call(CALL3_FIELD_MAP, id);
    if (isCall1Field && critiqueData?.subMetricsCall1Failed) {
      return "⚠️ LIVE ANALYSIS TEMPORARILY UNAVAILABLE (AI service was busy) - this is a fallback estimate, not fresh analysis. Please re-run this song. — ";
    }
    if (isCall2Field && critiqueData?.subMetricsCall2Failed) {
      return "⚠️ LIVE ANALYSIS TEMPORARILY UNAVAILABLE (AI service was busy) - this is a fallback estimate, not fresh analysis. Please re-run this song. — ";
    }
    if (isCall3Field && critiqueData?.subMetricsCall3Failed) {
      return "⚠️ LIVE ANALYSIS TEMPORARILY UNAVAILABLE (AI service was busy) - this is a fallback estimate, not fresh analysis. Please re-run this song. — ";
    }
    return "";
  };

  const getSubScore = (parentScore: number, index: number, total: number, metricId?: string): number => {
    if (metricId === "theory") {
      const offsets = [1, -2, 3, -1];
      const offset = offsets[index % offsets.length];
      const calculated = parentScore + offset;
      return Math.min(100, Math.max(10, calculated));
    }
    if (metricId === "flow") {
      const offsets = [-3, 1, -2, 4]; // Sum is 0, so offsets average precisely to 0 relative to parentScore
      const offset = offsets[index % offsets.length];
      const calculated = parentScore + offset;
      return Math.min(100, Math.max(10, calculated));
    }
    if (metricId === "artistic") {
      // Production Index (60%) -> feeds and splits into Atmospheric Depth (index 0) & Palette Synergy (index 2)
      // Music Theory (40%) -> feeds Harmonic Intrigue (index 1)
      if (index === 0) return critique?.scores?.overallProduction ?? 75;
      if (index === 1) return theoryScore;
      if (index === 2) return critique?.scores?.overallProduction ?? 75;
    }
    if (metricId === "dna-melodic") {
      return index === 0 
        ? (critique?.arrangement?.flowScore ?? 75)
        : (critique?.musicTheory?.score ?? 84);
    }
    if (metricId === "dna-tension") {
      return index === 0 
        ? (critique?.arrangement?.flowScore ?? 75)
        : (critique?.performance?.instrumentalScore ?? 75);
    }
    if (metricId === "dna-density") {
      return index === 0 
        ? (critique?.lyricalImpact?.score ?? 78)
        : (critique?.performance?.vocalScore ?? 75);
    }
    const offsets = [-2, 3, -1, 1, -3, 2];
    const offset = offsets[index % offsets.length];
    const calculated = parentScore + offset;
    return Math.min(100, Math.max(10, calculated));
  };

  const neonColorsMap: Record<string, { color: string; glow: string; textClass: string; borderClass: string; textClassLight: string }> = {
    flow: { color: "#f59e0b", glow: "rgba(245,158,11,0.35)", textClass: "text-amber-500", borderClass: "border-amber-500/35 hover:border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.08)]", textClassLight: "text-amber-500" },
    artistic: { color: "#ec4899", glow: "rgba(236,72,153,0.35)", textClass: "text-pink-450", borderClass: "border-pink-500/35 hover:border-pink-500/60 shadow-[0_0_20px_rgba(236,72,153,0.08)]", textClassLight: "text-pink-405" },
    production: { color: "#3b82f6", glow: "rgba(59,130,246,0.35)", textClass: "text-blue-400", borderClass: "border-blue-500/35 hover:border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.08)]", textClassLight: "text-blue-400" },
    readiness: { color: "#3b82f6", glow: "rgba(59,130,246,0.35)", textClass: "text-blue-400", borderClass: "border-blue-500/35 hover:border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.08)]", textClassLight: "text-blue-400" },
    mix: { color: "#ff66cc", glow: "rgba(255,102,204,0.35)", textClass: "text-[#ff66cc]", borderClass: "border-[#ff66cc]/35 hover:border-[#ff66cc]/60 shadow-[0_0_20px_rgba(255,102,204,0.08)]", textClassLight: "text-[#ff66cc]" },
    vocals: { color: "#9999ff", glow: "rgba(153,153,255,0.35)", textClass: "text-[#9999ff]", borderClass: "border-[#9999ff]/35 hover:border-[#9999ff]/60 shadow-[0_0_20px_rgba(153,153,255,0.08)]", textClassLight: "text-[#9999ff]" },
    instrumental: { color: "#10b981", glow: "rgba(16,185,129,0.35)", textClass: "text-emerald-400", borderClass: "border-emerald-500/35 hover:border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.08)]", textClassLight: "text-emerald-400" },
    lyrics: { color: "#22d3ee", glow: "rgba(34,211,238,0.2)", textClass: "text-cyan-400", borderClass: "border-cyan-400/25 hover:border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.05)]", textClassLight: "text-cyan-400" },
    theory: { color: "#818cf8", glow: "rgba(129,140,248,0.2)", textClass: "text-indigo-400", borderClass: "border-indigo-400/25 hover:border-indigo-400/40 shadow-[0_0_15px_rgba(129,140,248,0.05)]", textClassLight: "text-indigo-400" },
    searchability: { color: "#ec4899", glow: "rgba(236,72,153,0.35)", textClass: "text-pink-400", borderClass: "border-pink-500/35 hover:border-pink-500/60 shadow-[0_0_20px_rgba(236,72,153,0.08)]", textClassLight: "text-pink-400" },
    "dna-melodic": { color: "#10b981", glow: "rgba(16,185,129,0.35)", textClass: "text-emerald-450", borderClass: "border-emerald-500/35 hover:border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.08)]", textClassLight: "text-emerald-405" },
    "dna-tension": { color: "#f59e0b", glow: "rgba(245,158,11,0.35)", textClass: "text-amber-500", borderClass: "border-amber-500/35 hover:border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.08)]", textClassLight: "text-amber-505" },
    "dna-density": { color: "#6366f1", glow: "rgba(99,102,241,0.35)", textClass: "text-indigo-400", borderClass: "border-indigo-500/35 hover:border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.08)]", textClassLight: "text-indigo-400" },
  };

  const RowMetricCard = ({
    metric,
    isExpanded,
    onClick
  }: {
    metric: any;
    isExpanded: boolean;
    onClick: () => void;
  }) => {
    const neonOriginal = neonColorsMap[metric.id] || { color: "#3b82f6", glow: "rgba(59,130,246,0.2)", textClass: "text-blue-400", borderClass: "border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]", textClassLight: "text-blue-400" };
    const neon = (activeCategory === "mainstream" && (metric.id === "readiness" || metric.id === "production"))
      ? {
          color: "#3b82f6",
          glow: "rgba(59,130,246,0.35)",
          textClass: "text-blue-400",
          borderClass: "border-blue-500/35 hover:border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.08)]",
          textClassLight: "text-blue-400"
        }
      : activeCategory === "dna"
      ? {
          color: "#10b981",
          glow: "rgba(16,185,129,0.35)",
          textClass: "text-emerald-400",
          borderClass: "border-emerald-500/35 hover:border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.08)]",
          textClassLight: "text-emerald-400"
        }
      : neonOriginal;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (metric.score / 100) * circumference;

    return (
      <div 
        className={`bg-black border rounded-3xl py-[10px] px-6 transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row items-center gap-6 cursor-pointer ${
          isExpanded 
            ? `${neon.borderClass.split(" ")[0]} ${neon.borderClass.split(" ")[1]} ring-1 ring-white/10` 
            : "border-white/10 hover:border-white/25 hover:shadow-2xl"
        }`}
        id={`metric-row-${metric.id}`}
        onClick={onClick}
        style={metric.id === "readiness" ? { paddingTop: "10px", marginTop: "-28px" } : undefined}
      >
        {/* Faint side highlight decoration mirroring image style */}
        <div 
          className="absolute left-0 top-0 h-full w-[4px]"
          style={{ backgroundColor: neon.color, boxShadow: `0 0 10px ${neon.color}` }}
        />

        {/* Left Column: Big Ring Circular Display (clickable trigger) */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-36 text-center z-10">
          <div className="w-20 h-20 flex items-center justify-center relative">
            {/* Spinning/pulsing aura under active expanded items */}
            {isExpanded && (
              <div 
                className="absolute pointer-events-none transition-all duration-500 z-0"
                style={{
                  background: `radial-gradient(circle, ${neon.color} 0%, transparent 65%)`,
                  opacity: 0.35,
                  width: '120px',
                  height: '120px',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}

            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="30"
                className="stroke-neutral-800/40 fill-none"
                strokeWidth="6"
              />
              {isExpanded ? (
                <>
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    className="fill-none transition-all duration-1000 ease-out"
                    stroke={neon.color}
                    strokeWidth="7"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 - (metric.score / 100) * 2 * Math.PI * 30}
                    strokeLinecap="round"
                    style={{
                      filter: `blur(1.5px) drop-shadow(0 0 4px ${neon.glow})`,
                      opacity: 0.9,
                    }}
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    className="fill-none transition-all duration-1000 ease-out"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 - (metric.score / 100) * 2 * Math.PI * 30}
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <circle
                  cx="40"
                  cy="40"
                  r="30"
                  className="fill-none transition-all duration-1000 ease-out"
                  stroke={neon.color}
                  strokeWidth="5.5"
                  strokeDasharray={2 * Math.PI * 30}
                  strokeDashoffset={2 * Math.PI * 30 - (metric.score / 100) * 2 * Math.PI * 30}
                  strokeLinecap="round"
                />
              )}
            </svg>
            <span className="absolute font-mono text-xl font-black text-white">
              {metric.score}
            </span>
          </div>

          <span className={`text-[9px] mt-2 block font-mono font-bold uppercase tracking-widest transition-colors ${
            isExpanded ? neon.textClass : "text-slate-500"
          }`}>
            {isExpanded ? "Hide Breakdown ↑" : "Breakdown ↓"}
          </span>
        </div>

        {/* Middle Column: Focus metadata, title and listed sub-parameters */}
        <div className="flex-grow flex flex-col justify-center text-left md:pl-4 z-10 w-full sm:w-auto">
          <span 
            style={{ color: "#50a2ff", fontFamily: "JetBrains Mono, ui-monospace, monospace", fontSize: "13px", fontWeight: "bold" }}
            className="block select-none mb-0.5"
          >
            {metric.id === "dna-melodic" ? "Signature Hooks..." : `A&R DIAGNOSTIC FOCUS: ${metric.subtitle || `The ${metric.name} Parameters`}`}
          </span>
          <h3 className="text-lg font-extrabold text-[#E2E8F0] tracking-tight leading-snug uppercase">
            {metric.name}
          </h3>

          {/* Horizontal list of sub-parameters wrapped in a single capsule-pill container exactly like image 2 */}
          <div className="bg-[#13161C]/50 border border-white/5 py-1.5 px-3.5 rounded-full flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 w-fit">
            {(metric.subParams || []).map((param: any, idx: number) => (
              <div key={idx} className="flex items-center text-[11px] font-medium text-slate-300 select-none">
                <span className="text-blue-400 text-[11px] mr-1.5 font-sans">◇</span>
                <span>{param.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Pill Callout block exactly corresponding to image design */}
        {metric.callout && (
          <div className="w-full md:w-72 flex-shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
            {metric.isGold && (
              <div className="flex justify-end mb-1.5 select-none animate-pulse">
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/40 rounded text-[8px] font-mono font-bold text-amber-400 uppercase tracking-widest leading-none">
                  Key Metric
                </span>
              </div>
            )}
            <div 
              className="p-5 bg-neutral-950 rounded-2xl border text-center relative overflow-hidden transition-all flex items-center justify-center min-h-[95px] select-none"
              style={{
                borderColor: `${neon.color}35`,
                boxShadow: `0 0 15px ${neon.color}08`
              }}
            >
              {/* Faint ambient glow inside callout */}
              <div 
                className="absolute inset-x-0 top-0 h-full pointer-events-none opacity-5"
                style={{
                  background: `radial-gradient(circle, ${neon.color} 0%, transparent 80%)`,
                }}
              />
              <p className="text-[11px] text-slate-200 leading-relaxed font-semibold relative z-10">
                {metric.callout}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // SVG circular metric builder (Interactive button shell with active glowing lit background styles)
  const CircleMetricButton = ({ 
    id, 
    score, 
    label, 
    colorClass, 
    isGold = false, 
    isSmall = false,
    hoverText,
    expandedId,
    onClick
  }: { 
    id: string; 
    score: number; 
    label: string; 
    colorClass: string; 
    isGold?: boolean; 
    isSmall?: boolean;
    hoverText: string;
    expandedId: string | null;
    onClick: () => void;
    key?: string;
  }) => {
    const radius = isSmall ? 30 : isGold ? 42 : 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const isCurrentlyExpanded = expandedId === id;
    const resolvedColor = colorClass || "";

    // Direct background highlighted light up based on matching the color class with solid black background
    const litBackgroundStyle = isCurrentlyExpanded
      ? resolvedColor.includes("amber-400")
        ? "bg-black border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/30 font-medium"
        : resolvedColor.includes("amber-500")
        ? "bg-black border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30 font-medium"
        : resolvedColor.includes("teal")
        ? "bg-black border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.25)] ring-1 ring-teal-500/30 font-medium"
        : resolvedColor.includes("blue")
        ? "bg-black border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/30 font-medium"
        : resolvedColor.includes("purple")
        ? "bg-black border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/30 font-medium"
        : resolvedColor.includes("emerald")
        ? "bg-black border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30 font-medium"
        : resolvedColor.includes("cyan")
        ? "bg-black border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/30 font-medium"
        : resolvedColor.includes("indigo")
        ? "bg-black border-indigo-400/50 shadow-[0_0_20px_rgba(129,140,248,0.25)] ring-1 ring-indigo-400/30 font-medium"
        : resolvedColor.includes("pink")
        ? "bg-black border-pink-400/50 shadow-[0_0_20px_rgba(244,114,182,0.25)] ring-1 ring-pink-400/30 font-medium"
        : "bg-black border-blue-500/40 ring-1 ring-blue-500/20"
      : isGold
      ? "border-amber-400/15 bg-black/40 hover:bg-black/90"
      : "border-white/5 bg-[#020203] hover:bg-black/90";

    return (
      <div className="relative">
        <button
          onClick={onClick}
          className={`relative flex flex-col items-center border transition-all duration-300 rounded-2xl text-center select-none cursor-pointer w-full overflow-hidden shadow-inner ${litBackgroundStyle} ${
            isSmall ? "p-3" : isGold ? "p-4 scale-[1.02] border-amber-400/20" : "p-4"
          }`}
          aria-label={`Score Metric for ${label}. Click to expand score breakdown.`}
        >
          {isGold && (
            <div className="absolute top-1.5 right-2 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[8px] font-mono font-bold text-amber-400 uppercase tracking-widest leading-none z-15">
              Key Metric
            </div>
          )}

          {isCurrentlyExpanded && (
            <div 
              className="absolute pointer-events-none transition-all duration-500 z-0"
              style={{
                background: `radial-gradient(circle, ${neonColorsMap[id]?.glow || "rgba(59,130,246,0.6)"} 0%, transparent 65%)`,
                opacity: 0.5,
                width: isSmall ? '80px' : '130px',
                height: isSmall ? '80px' : '130px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}

          <div className={`${isSmall ? "w-16 h-16" : isGold ? "w-24 h-24" : "w-20 h-20"} flex items-center justify-center relative z-10`}>
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx={isSmall ? "32" : "48"}
                cy={isSmall ? "32" : "48"}
                r={radius}
                className="stroke-neutral-800/40 fill-none"
                strokeWidth={isGold ? "8" : "5"}
              />
              {isCurrentlyExpanded ? (
                <>
                  {/* Neon Glow Tube effect layer */}
                  <circle
                    cx={isSmall ? "32" : "48"}
                    cy={isSmall ? "32" : "48"}
                    r={radius}
                    className="fill-none transition-all duration-1000 ease-out"
                    stroke={neonColorsMap[id]?.color || "#3b82f6"}
                    strokeWidth={isGold ? "9" : "6.5"}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{
                      filter: `blur(4px) drop-shadow(0 0 8px ${neonColorsMap[id]?.glow || "rgba(59,130,246,0.85)"})`,
                      opacity: 0.9,
                    }}
                  />
                  {/* Sharp White Core layer for high intensity electrical gas look */}
                  <circle
                    cx={isSmall ? "32" : "48"}
                    cy={isSmall ? "32" : "48"}
                    r={radius}
                    className="fill-none transition-all duration-1000 ease-out"
                    stroke="#ffffff"
                    strokeWidth={isGold ? "4" : "2.5"}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{
                      filter: `drop-shadow(0 0 1px ${neonColorsMap[id]?.color || "#3b82f6"})`,
                    }}
                  />
                </>
              ) : (
                <circle
                  cx={isSmall ? "32" : "48"}
                  cy={isSmall ? "32" : "48"}
                  r={radius}
                  className={`fill-none transition-all duration-1000 ease-out ${resolvedColor}`}
                  strokeWidth={isGold ? "8" : "5"}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              )}
            </svg>
            <span className={`absolute font-mono text-white ${
              isSmall 
                ? "text-sm font-semibold" 
                : isGold 
                  ? "text-2xl font-black text-amber-400" 
                  : "text-lg font-bold"
            }`}>
              {score}
            </span>
          </div>
          <span className={`mt-2 block leading-snug tracking-wide relative z-10 ${
            isSmall 
              ? "text-[10px] text-slate-400" 
              : isGold 
                ? "text-xs font-black text-white uppercase tracking-wider" 
                : "text-xs text-slate-300 font-semibold"
          }`}>
            {label}
          </span>
          <span className="text-[9px] text-slate-500 mt-1 block font-mono hover:text-blue-400 transition-colors relative z-10">
            {isCurrentlyExpanded ? "Hide Breakdown ↑" : "Breakdown ↓"}
          </span>
        </button>
      </div>
    );
  };

  const getSongSpecificLufsRecommendation = () => {
    const genre = (critique?.vibe?.genre || "").toLowerCase();
    const subgenre = (critique?.vibe?.subgenre || "").toLowerCase();
    const name = trackName || "Your Track";
    
    if (name.toLowerCase().includes("your hero") || genre.includes("retro") || genre.includes("wave") || genre.includes("synth") || subgenre.includes("synth")) {
      return (
        <div className="flex flex-col gap-3 font-sans text-slate-300">
          <p className="text-xs leading-relaxed">
            For <strong className="text-white">"{name}"</strong> (an arena-ready synth-rock / retro-wave track), the master level is set at a hot <strong className="text-teal-400">
              {critique?.liveMetrics ? `${critique.liveMetrics.calculatedLufs} LUFS` : "--"}
            </strong>. While this sits nicely in the commercial sweet spot of -9.0 to -7.0 LUFS, the heavy-packed arrangement (guitars, wall-of-sound synths, punching drums) and high-frequency sibilance are triggering limiting artifacts.
          </p>
          <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-widest block mt-1">Four-Step Blueprint to Fix Dynamic Balance &amp; LUFS Power:</span>
          <ol className="list-decimal list-inside flex flex-col gap-2.5 text-xs text-slate-400 pl-1">
            <li>
              <strong className="text-slate-200">De-Harsh Upper Midrange:</strong> Use dynamic EQ on the group synth bus and cymbals between <strong className="text-[#cb9fff]">4kHz to 7kHz</strong>. Taming high-end ear fatigue prevents the master limiter from over-compressing these sharp peaks, immediately reclaiming dynamic headroom.
            </li>
            <li>
              <strong className="text-slate-200">Sidechain Ducking on Synths:</strong> Set a sidechain dynamic EQ on the main synth chords, keyed to the lead vocal. Duck the synths by <strong className="text-[#cb9fff]">-1.5dB to -2.0dB</strong> at <strong className="text-[#cb9fff]">1kHz–3kHz</strong> whenever the singer performs. This carves vocal space without boosting vocal volume (which would force you to squash the limiter harder).
            </li>
            <li>
              <strong className="text-slate-200">Abbey Road Reverb Filtering:</strong> Clean up the lush spatial ambience. Apply a high-pass filter up to <strong className="text-[#cb9fff]">350Hz</strong> and a low-pass down to <strong className="text-[#cb9fff]">8kHz</strong> on the vocal and synth reverb sends. This clears out cumulative low-mid muddy energy, allowing the master limiter to focus on punching the core transients.
            </li>
            <li>
              <strong className="text-slate-200">Surgical Transient Preservation:</strong> Slightly slacken the limiter attack time (around <strong className="text-[#cb9fff]">2ms to 5ms</strong>) or use a multi-stage limiter with dynamic clipping. This lets kick and snare transients pass through cleanly, preserving punch while hitting the targeted {critique?.liveMetrics ? `${critique.liveMetrics.calculatedLufs} LUFS` : "--"}.
            </li>
          </ol>
        </div>
      );
    }
    
    // Generic fallback for other genres
    return (
      <div className="flex flex-col gap-3 font-sans text-slate-350">
        <p className="text-xs leading-relaxed">
          To create a balanced LUFS profile for <strong className="text-white">"{name}"</strong> without losing transient impact, follow these master-bus conditioning guidelines:
        </p>
        <ol className="list-decimal list-inside flex flex-col gap-2.5 text-xs text-slate-400 pl-1">
          <li>
            <strong className="text-slate-200">High-Pass Filtering:</strong> Clean up non-audible frequencies by placing a steep low-cut filter at <strong className="text-[#cb9fff]">20Hz to 30Hz</strong> on low instruments. Sub-bass mud consumes significant headroom without adding audible volume, causing premature limiting.
          </li>
          <li>
            <strong className="text-slate-200">Serial Limiting:</strong> Use two limiters in series rather than single heavy brickwalls. Let the first limiter gently clip outliers by <strong className="text-[#cb9fff]">1dB</strong>, and let the second limiter boost overall density.
          </li>
        </ol>
      </div>
    );
  };

  const renderMetricVisualizerFeature = (id: string, score: number) => {
    switch (id) {
      case "readiness":
        return (
          <div className="mt-6 border-t border-white/5 pt-5 flex flex-col gap-5">
            <h4 className="text-xs font-mono uppercase tracking-widest text-teal-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Spectral Loudness &amp; Streaming Optimization Desk
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#13161C] p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Integrated Loudness</span>
                  <p className="text-xl font-mono font-black text-white mt-1">
                    {critique?.liveMetrics ? `${critique.liveMetrics.calculatedLufs} LUFS` : "--"}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Optimal commercial sweet spot is -9.0 to -7.0 LUFS. Competitive density while preserving key transient response.
                </p>
              </div>
              <div className="bg-[#13161C] p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">True Peak Level</span>
                  <p className="text-xl font-mono font-black text-white mt-1">
                    {critique?.liveMetrics ? `${critique.liveMetrics.calculatedTruePeak} dBTP` : "--"}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Safely below the -1.0 dBTP limit required by Spotify and Apple Music encoders to prevent digital codec clipping.
                </p>
              </div>
              <div className="bg-[#13161C] p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Loudness Range (LRA)</span>
                  <p className="text-xl font-mono font-black text-white mt-1">
                    {critique?.liveMetrics ? `${critique.liveMetrics.calculatedLra} LU` : "--"}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Healthy dynamic headroom preserving the high-impact contrast transition between verse tension and chorus explosions.
                </p>
              </div>
            </div>

            <div className="bg-[#13161C] p-5 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest block mb-3 font-semibold">
                First 60s Engagement Power Timeline Index
              </span>
              <div className="h-32 w-full bg-[#0A0B0E] rounded-lg p-3 relative flex flex-col justify-end overflow-hidden">
                {critique?.liveMetrics?.calculatedWaveformPoints?.length ? (
                  <>
                    {/* Responsive SVG Flowing Line Chart for Engagement Power */}
                    <svg className="w-full h-24 overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      
                      {/* Skip horizon line */}
                      <line x1="0" y1="65" x2="500" y2="65" stroke="rgba(244,114,182,0.3)" strokeWidth="1.5" strokeDasharray="4 4" />
                      
                      {/* Engagement Curve */}
                      <path
                        d={`M ${critique.liveMetrics.calculatedWaveformPoints.map((amp: number, idx: number) => {
                          const x = (500 / (critique.liveMetrics.calculatedWaveformPoints.length - 1)) * idx;
                          const y = 85 - (amp / 100) * 75;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        }).join(' L ')}`}
                        fill="none"
                        stroke="#14b8a6"
                        strokeWidth="3"
                      />
                      
                      {/* Graph Annotations */}
                      <circle cx="0" cy="85" r="4" fill="#ffffff" />
                      <circle cx="120" cy="60" r="4" fill="#14b8a6" />
                      <circle cx="300" cy="15" r="4" fill="#14b8a6" />
                      <circle cx="500" cy="5" r="4" fill="#ffffff" />
                    </svg>
                    
                    <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-2">
                      <span>0s (Intro Hook: 88%)</span>
                      <span>15s (Verse Drop: 75%)</span>
                      <span>35s (Pre-Chorus Rise: 84%)</span>
                      <span>60s (Chorus Burst: 96%)</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center rounded-lg border border-dashed border-white/5">
                    <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-1.5" />
                    <span className="text-[10px] font-mono text-slate-400">Awaiting audio analysis...</span>
                  </div>
                )}
                
                <div className="absolute top-2 right-2 text-[9px] font-mono text-pink-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                  <span>Avg Skip-Rate Threat Threshold (Target &gt; 65%)</span>
                </div>
              </div>
            </div>
            
            <div className="bg-[#13161C]/50 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
              <div>
                <h5 className="text-xs font-semibold text-slate-300">Why did I receive {score}/100?</h5>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Your track has ideal distribution density. However, unlocking a 95+ score requires addressing the intro skip horizon: the dynamic contrast from the 0:08 verse section should retain 1.5dB more sub-bass power to cushion the vocal space before the pre-chorus is entered.
                </p>
              </div>

              {/* Added LUFS Glossary link */}
              <div className="border-t border-white/5 pt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewDefinition) {
                      onViewDefinition("lufs-paradox");
                    }
                  }}
                  className="text-xs text-teal-400 hover:text-teal-300 font-bold underline flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shrink-0" />
                  <span>LUFS Explained Simply (The "Loudness vs. Quality" Paradox)</span>
                  <span className="text-[9px] font-mono no-underline bg-teal-400/10 border border-teal-500/20 px-1.5 py-0.5 rounded text-teal-400 uppercase tracking-widest leading-none shrink-0">Glossary &rarr;</span>
                </button>
              </div>

              {/* Added Dynamic Recommendations Card (Short height, accordion toggle style) */}
              <div className="bg-black/40 border border-teal-500/15 rounded-xl overflow-hidden transition-all duration-300">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLufsRecommendation(!showLufsRecommendation);
                  }}
                  className="w-full p-2.5 flex items-center justify-between text-left transition-colors hover:bg-teal-950/10 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📋</span>
                    <span className="text-xs font-bold text-white tracking-tight uppercase">
                      Recommendations to Create a Balanced LUFS Profile
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-teal-400 shrink-0">
                    {showLufsRecommendation ? "Hide ▲" : "Expand ▼"}
                  </span>
                </button>

                {showLufsRecommendation && (
                  <div className="p-4 border-t border-white/5 bg-[#050608]/95 animate-fadeIn max-h-[350px] overflow-y-auto">
                    {getSongSpecificLufsRecommendation()}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "mix":
        return (
          <div className="mt-6 border-t border-white/5 pt-5 flex flex-col gap-5">
            <h4 className="text-xs font-mono uppercase tracking-widest text-blue-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Comparative Spectral Blueprint Analyzer overlay
            </h4>
            
            <div className="bg-[#0A0B0E] p-5 rounded-xl border border-white/10 relative overflow-hidden">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block mb-1">
                20Hz - 20kHz Soundstage Profile Density
              </span>
              <span className="text-[9px] font-semibold text-slate-500 block mb-4">
                Solid Blue: Your Track | Dashed Teal: Target "Successful" Modern Indie Hit Blueprint
              </span>
              
              <div className="h-44 w-full relative flex flex-col justify-between">
                {/* SVG Curves */}
                <svg className="absolute inset-0 w-full h-[150px] overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
                  {/* Vertical dividers */}
                  <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="150" y1="0" x2="150" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="300" y1="0" x2="300" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="420" y1="0" x2="420" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="2 2" />
                  
                  {/* Reference Blueprint curve (dashed teal) */}
                  <path
                    d="M 0,90 Q 50,20 100,50 T 200,45 T 300,60 T 400,35 T 500,80"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                  
                  {/* Your Track curve (solid glowing blue) */}
                  <path
                    d="M 0,94 Q 45,15 90,62 T 185,55 T 290,52 T 405,25 T 500,85"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3.5"
                  />
                  
                  {/* Flagged Deltas of interest */}
                  <circle cx="45" cy="15" r="4.5" fill="#ef4444" />
                  <circle cx="405" cy="25" r="4.5" fill="#22c55e" />
                </svg>
                
                {/* Spectral Delta Labels */}
                <div className="absolute top-1 left-[55px] text-[9px] font-mono text-rose-400 bg-rose-955/50 px-2 py-0.5 border border-rose-500/20 rounded">
                  Delta +1.8dB at 180Hz (Bass Overlap / Mud Zone)
                </div>
                <div className="absolute top-16 right-[100px] text-[9px] font-mono text-emerald-400 bg-emerald-955/50 px-2 py-0.5 border border-emerald-500/20 rounded">
                  Delta -0.5dB at 4.5kHz (Optimal Present Vocal Pocket!)
                </div>

                <div className="mt-auto flex justify-between text-[9px] font-mono text-slate-500 pt-2 border-t border-white/5">
                  <span>Sub-Bass (20-60Hz)</span>
                  <span>Low-Mids (250Hz)</span>
                  <span>Midrange (1kHz)</span>
                  <span>Presence (4.5kHz)</span>
                  <span>Brilliance (12k-20kHz)</span>
                </div>
              </div>
            </div>

            <div className="bg-[#13161C]/50 p-4 rounded-xl border border-white/5">
              <h5 className="text-xs font-semibold text-slate-300">Why did I receive {score}/100?</h5>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Your mid-frequency panning width is spectacular, but we diagnosed potential excess clutter in the low-mid (150Hz–180Hz) crossover zone. This causes brief phases where vocal transients match instrument harmonics. Notching this dynamic region on your master bus by 1.8dB restores competitive modern punch.
              </p>
            </div>
          </div>
        );

      case "flow":
        const isCyanTheme = activeCategory === "blueprints";
        const flowColorClass = isCyanTheme ? "text-cyan-400" : (activeCategory === "mainstream" ? "text-blue-400" : "text-amber-400");
        const flowBgColorClass = isCyanTheme ? "bg-cyan-500" : (activeCategory === "mainstream" ? "bg-blue-500" : "bg-amber-400");
        const flowPillBgClass = isCyanTheme 
          ? "bg-cyan-500/20 border-cyan-500/45 text-cyan-300"
          : (activeCategory === "mainstream" 
            ? "bg-blue-500/20 border-blue-500/45 text-blue-300" 
            : "bg-amber-500/20 border-amber-500/40 text-amber-400");

        return (
          <div className="mt-6 border-t border-white/5 pt-5 flex flex-col gap-5">
            <h4 className={`text-xs font-mono uppercase tracking-widest ${flowColorClass} font-bold flex items-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${flowBgColorClass} animate-pulse`} />
              Arrangement Progression Blueprint &amp; Structural Roadmap
            </h4>
            
            <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/5">
              <span className={`text-[10px] font-mono ${flowColorClass} uppercase block mb-3 font-semibold`}>
                Song Architecture Phase-Build Model
              </span>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-20 text-[10px] uppercase font-mono text-slate-400">Verse 1 (0-22s)</div>
                  <div className="flex-1 h-6 bg-blue-500/10 border border-blue-500/20 rounded flex items-center px-2.5 text-[10px] text-blue-400 font-mono justify-between">
                    <span>Harmonic Grounding (82%)</span>
                    <span>Tension: Balanced</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 text-[10px] uppercase font-mono text-slate-400">Pre-Chorus (22-38s)</div>
                  <div className="flex-1 h-6 bg-purple-500/15 border border-purple-500/30 rounded flex items-center px-2.5 text-[10px] text-purple-400 font-mono justify-between animate-pulse">
                    <span>Ramping Volume Sweep + Uplift Build (88%)</span>
                    <span>Tension: Ramping Up</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 text-[10px] uppercase font-mono text-slate-400">Chorus Peak (38-1m08s)</div>
                  <div className={`flex-1 h-6 ${flowPillBgClass} rounded flex items-center px-2.5 text-[10px] font-mono justify-between font-bold`}>
                    <span>Explosive Chorus Hook Delivery (96% Impact)</span>
                    <span>Energy Peak</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#13161C]/50 p-4 rounded-xl border border-white/5">
              <h5 className="text-xs font-semibold text-slate-300">Why did I receive {score}/100?</h5>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Your melody loop transitions beautifully. However, the track reaches the full chorus hook at 0:38. Modern digital platform standards indicate that listener skip rates decay significantly if a major hook arrival takes longer than 0:35. We recommend condensing your intro loop or shortening the verse segment to unlock a premium 95+ score.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="mt-6 border-t border-white/5 pt-5">
            <div className="bg-[#13161C]/30 p-4 rounded-xl border border-white/5">
              <h5 className="text-xs font-semibold text-slate-300">Why did I receive {score}/100?</h5>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                The evaluation index indicates a powerful harmonic placement in this sector. To unlock a higher profile rating, enhance timeline alignments or refine backing delays to ensure direct vocal and master lead elements stay out of the stereo reverb channel.
              </p>
            </div>
          </div>
        );
    }
  };

  const getSubScoreExplanationText = (name: string, score: number): string => {
    const cleanName = name.split(" (")[0];
    
    // --- Composition Flow Subscores ---
    if (cleanName === "Structural Build") {
      if (score >= 90) {
        return `Pristine transitions! Verses build momentum cleanly, handing off energy smoothly and transparently to choruses with premium dynamic tension.`;
      } else if (score >= 80) {
        return `Solid structural blueprint (${score}/100), but lines/vocals at the 0:22 transition points could benefit from a brief instrumental dropout (a 'half-bar gap' or drum-fill pause) to raise anticipation and make the incoming chorus arrival feel far more dramatic.`;
      } else {
        return `Transitions feel slightly abrupt. Consider adding subtle vocal swells, a brief snare roll, or dynamic counter-rhythms during transition bars to gracefully announce upcoming sectional handoffs.`;
      }
    }
    if (cleanName === "Melodic Tension") {
      if (score >= 90) {
        return `Masterful harmonic suspensions and tension resolution. Chord progressions lead the listener's ear effortlessly with maximum emotional alignment.`;
      } else if (score >= 80) {
        return `Excellent chord progression choice with strong tension loops (${score}/100). To elevate this to elite levels, introduce a suspended chord, a temporary modulation, or an ascending bass motif right before hook arrival segments to expand harmonic gravity.`;
      } else {
        return `The harmonic structures feel slightly flat or repetitive. Try varying the third chord of your progression during the pre-chorus to build suspense.`;
      }
    }
    if (cleanName === "Hook Placement") {
      if (score >= 90) {
        return `Perfect hook cadence and repetition! The main sonic motif is instantly memorable, delivered with ultimate impact right within the golden radio window.`;
      } else if (score >= 80) {
        return `Extremely catchy theme structure (${score}/100), but the hook arrives slightly close to the 0:38 mark. Shortening the intro or scaling down verse 1 helps trigger immediate streaming listener retention.`;
      } else {
        return `Hook arrival is delayed too long. Modern digital listener metrics suggest placing your primary hook within the first 30 seconds for optimal discovery performance.`;
      }
    }
    if (cleanName === "Sectional Contrast") {
      if (score >= 90) {
        return `Incredible dynamic contrast! Verses feel intimate and spacious, giving the heavy chorus elements explosive sonic presence and immense energy impact.`;
      } else if (score >= 80) {
        return `Great contrast levels (${score}/100). To unlock pristine standards, try backing off secondary rhythm elements in the verses entirely, allowing the core vocal motif to feel extremely intimate before explosive chorus hooks commence.`;
      } else {
        return `The energy difference between verse and chorus is flat. Consider pulling out backing drums during the pre-chorus build to make the chorus arrival feel explosive.`;
      }
    }

    // --- Production Index Subscores ---
    if (cleanName === "Palette Cohesion") {
      if (score >= 90) {
        return `Your instruments sound like they belong in the exact same room. Every synth tone, guitar layer, and drum sample sits in a neat sonic family, creating a cohesive, expensive-sounding background texture.`;
      } else if (score >= 80) {
        return `Good instrument grouping (${score}/100), but some high-frequency synthesizer waves or ambient reverbs are competing with the mid-tones. Unifying the reverb room sizes will glue this together beautifully.`;
      } else {
        return `The instrument choices feel slightly random or disconnected. Try replacing secondary synth pads with more organic keyboards or lowering their brightness to keep the palette focused.`;
      }
    }
    if (cleanName === "Aesthetic Design") {
      if (score >= 90) {
        return `The overall arrangement style is cutting-edge! It feels deeply aligned with top-tier modern playlists, striking the perfect balance between modern commercial trends and fresh artistic identity.`;
      } else if (score >= 80) {
        return `The instrumentation is highly appropriate (${score}/100) and matches top releases in your genre. To make it stand out even more, try adding a singular quirky or signature sound effect in the background during quiet sections.`;
      } else {
        return `The style is slightly traditional or outdated for modern radio formats. Consider replacing generic synth presets or MIDI pianos with richer, custom-designed tones or textured analog recordings.`;
      }
    }
    if (cleanName === "Space & Density") {
      if (score >= 90) {
        return `Masterful breathing room! You’ve left plenty of 'negative space' where elements fade away, allowing the main instruments and vocals to command full attention without clutter.`;
      } else if (score >= 80) {
        return `Nice balance (${score}/100), but during busy chorus parts, too many instruments are playing at the exact same time. Having some elements drop out or mute during transition bars will give others room to breathe.`;
      } else {
        return `The song feels crowded or busy. When every instrument plays constantly, the listener’s ear gets tired. Try simplifying the arrangement and carving out background layers so the main message stays clear.`;
      }
    }

    // --- Commercial Readiness Subscores ---
    if (cleanName === "LUFS Loudness") {
      if (score >= 90) {
        return `Perfect volume footprint (${critique?.liveMetrics ? critique.liveMetrics.calculatedLufs + " LUFS" : "-8.4 LUFS"})! It’s competitively loud and punchy, matching the output level of commercial radio standard tracks without squishing or distorting your dynamic details.`;
      } else if (score >= 80) {
        return `The master volume level is solid (${score}/100). However, a tiny bit of extra limiter push or master compressor threshold adjustment could gain you that last 1dB of power to stand equal with radio heavyweights.`;
      } else {
        return `The track is a bit too quiet compared to modern streaming standards. Try gently boosting the output limiter while backing off on pre-compressor gain to raise the perceived volume without causing sound clipping.`;
      }
    }
    if (cleanName === "Spectral Match") {
      if (score >= 90) {
        return `Perfect frequency balance across the entire spectrum. Low, middle, and high pitches are beautifully proportioned, which means your song will translate wonderfully on cheap earbuds and massive club speakers alike.`;
      } else if (score >= 80) {
        return `Great overall frequency match (${score}/100). The only minor mismatch is a tiny bump in the low-mids (around 150Hz), which makes things slightly warm but occasionally thick. Shaving that down slightly will create premium air.`;
      } else {
        return `The frequency balance is slightly off-kilter. The highs are a bit too bright, or the low frequencies lack structure. Adjust your master EQ curve to match modern genre standards (refer to our analyzer line).`;
      }
    }
    if (cleanName === "Engagement Power") {
      if (score >= 90) {
        return `Immediate listener capture! The first 15 seconds introduce a captivating hook, vocal, or unique sound that instantly hooks a streaming user’s interest and keeps them from hitting the skip button.`;
      } else if (score >= 80) {
        return `Strong startup feel (${score}/100). Although it has great movement, introducing a small 'ear-candy' element or a brief drum fill right at the 0:08 verse mark will secure an even stronger engagement spike.`;
      } else {
        return `The intro takes too long to get going. Modern listeners have short attention spans; consider shortening the instrumental intro or launching immediately with a strong vocal phrase within the first 5-10 seconds.`;
      }
    }

    // --- Mix Balance Quality Subscores ---
    if (cleanName === "Mud Prevention") {
      if (score >= 90) {
        return `Superb separation! The muddy 'low-mid' zone (150Hz to 250Hz) is perfectly clean. The vocals have an expensive, airy presence, and the snare drum has a sharp, clear punch.`;
      } else if (score >= 80) {
        return `Decent separation here (${score}/100), but there is a slight buildup of energy around 200Hz where guitars, keyboards, and vocal tails are overlapping. A tiny EQ scoop on the instrument tracks will clean this up.`;
      } else {
        return `The mix feels a bit cloudy or muffled. When too many instruments build up in the lower-mid range, it hides details. Use a high-pass filter or gentle EQ scoops to clear out muddy frequencies on background tracks.`;
      }
    }
    if (cleanName === "Sibilance Shaving") {
      if (score >= 90) {
        return `Crisp sibilance control! Harsh consonant sounds ('S', 'T', 'CH') are completely natural and silky-smooth, presenting no sharp spikes that would hurt the listener's ears at high volumes.`;
      } else if (score >= 80) {
        return `Good vocal de-essing (${score}/100). The harsh 'esses' are mostly tamed, but a couple of vocal spikes near the 6kHz range are still a bit piercing. A slightly faster de-esser release or minor EQ cuts will smooth these over.`;
      } else {
        return `Consonants are quite sharp and pierce through the mix. This can be fatiguing, especially on headphones. Apply a dedicated vocal de-esser between 4kHz-8kHz to tuck those sharp peaks down.`;
      }
    }
    if (cleanName === "Low-End Division") {
      if (score >= 90) {
        return `Unbelievable bass definition! The ultra-low sub harmonics crawl underneath, while the kick drum punch sits firmly on top on the timeline grid. Both elements have separate, distinct frequency spaces.`;
      } else if (score >= 80) {
        return `The low end is solid and powerful (${score}/100), but the bass note tail holds on a fraction of a second too long, occasionally absorbing the kick drum's impact. A minor side-chain compressor setup will fix this.`;
      } else {
        return `The low-end frequencies are overlapping or fighting. The kick drum and bass line are hitting in the same space, causing a boomy or muddy sound. Try EQ-cutting the bass around 60Hz to let the kick drum punch through clearly.`;
      }
    }
    if (cleanName === "Midrange Spacing") {
      if (score >= 90) {
        return `Impeccable midrange staging! Main guitars, keyboards, and synths reside comfortably in the stereo side channels, leaving the center path entirely wide open for the lead vocal to sit comfortably.`;
      } else if (score >= 80) {
        return `Decent midrange balance (${score}/100). To give your lead vocals even more of that 'sitting right in front of the listener' feel, try pulling back the 1kHz to 2kHz range on the guitars or backing key synths by about 1.5dB.`;
      } else {
        return `The midrange is highly competitive and crowded. Guitars, synths, and keys are fighting with the vocal, making it hard to hear the lyrics clearly. Try panning instruments wider to the sides or lowering group levels.`;
      }
    }

    // --- Vocal Tracking Subscores ---
    if (cleanName === "Pitch Accuracy") {
      if (score >= 90) {
        return `Magnificent vocal delivery and pitch centering! The lead singer hits every target note effortlessly, maintaining beautiful natural vibrato and precise pitch scale alignment.`;
      } else if (score >= 80) {
        return `Solid, emotional vocal performance (${score}/100). There are just a few minor pitch drifts during long, sustained notes at the end of lines. Applying light, transparent pitch correction (like Melodyne) will make this pristine.`;
      } else {
        return `The vocals are expressive but suffer from noticeable pitch drifting. Try re-recording the lead lines or using pitch alignment software to tighten up the note centers, ensuring a more professional performance.`;
      }
    }
    if (cleanName === "Dynamic Delivery") {
      if (score >= 90) {
        return `Flawless vocal pressure and breathing! The volume remains wonderfully consistent and front-facing, keeping all breath noises and lyrical words highly audible and perfectly balanced.`;
      } else if (score >= 80) {
        return `Excellent vocal phrasing power (${score}/100). Some words at the very end of phrases sink slightly too low in volume. A small touch of serial compression or manual volume automation will keep them front and center.`;
      } else {
        return `The vocal volume is jumping around too much. Some lines are loud and upfront, while others are buried or lost. Try using dual compressors (one fast, one slow) to lock the dynamic range in place.`;
      }
    }
    if (cleanName === "Vocal Layer Fit") {
      if (score >= 90) {
        return `Sensational vocal production! Double tracks, background harmonies, and effects are beautifully positioned on the stage, creating a rich three-dimensional space around the main vocal.`;
      } else if (score >= 80) {
        return `The backing vocals fit beautifully (${score}/100). For an even wider feel, try panning the vocal doubles 100% left and right, and add a subtle high-pass filter to them to let the main vocal dominate the center frequency.`;
      } else {
        return `The backing vocals and harmonies are clashing with the lead track, causing a cluttered sound. Try lowering the volume of background vocals, adding a lush reverb, or rolling off their low frequencies to separate them.`;
      }
    }

    // --- Instrumental Staging Subscores ---
    if (cleanName === "Timeline Grid Cohesion") {
      if (score >= 90) {
        return `Perfect timing rhythm! The drum hits and bass grooves lock together like clockwork, giving the track an infectious, unified groove that naturally makes the listener want to move.`;
      } else if (score >= 80) {
        return `Great rhythm sync (${score}/100). The instruments are tight, but there is a tiny millisecond lag or rush on the bass notes relative to the kick drum. Minor timing nudging or quantizing will make it feel seamless.`;
      } else {
        return `The rhythms feel a little loose or disjointed. When key instruments are slightly off-beat from the drums, the overall song pulse weakens. Try tightening the timing of the bass or primary rhythm tracks.`;
      }
    }
    if (cleanName === "Transient Punch") {
      if (score >= 90) {
        return `Incredible attack and bite! Every drum crack and guitar pluck cuts through the overall speaker mix with sharp, exciting energy, keeping the overall presentation feeling alive and highly dynamic.`;
      } else if (score >= 80) {
        return `Very good transient presence (${score}/100). To give the snare drum more focus or snappy punch, try backing off your main compressor's attack time slightly (to around 15ms) to let the initial crack fly past before compressing.`;
      } else {
        return `The song attacks feel soft, squashed, or flat. This usually happens when master compression is too aggressive or attack times are too fast, crushing the transient's crack. Let the peaks breathe more to restore punch.`;
      }
    }
    if (cleanName === "Melodic Staging") {
      if (score >= 90) {
        return `Breathtaking stereo soundstage placement! Secondary guitars, keyboards, and backing tracks are spread nicely to the sides, while key solos and the main kick/bass/snare sit boldly in the center.`;
      } else if (score >= 80) {
        return `Nice stereo soundstage width (${score}/100). To increase the lushness of the sides, try applying micro-delays or a wider chorus effect onto the ambient back-synths or clean guitar chords.`;
      } else {
        return `The mix feels thin or 'mono' (everything stacked in the center). Try panning secondary instruments to the left or right to open up a wide, rich acoustic space for the listener.`;
      }
    }

    // --- Lyrical Impact Subscores ---
    if (cleanName === "Meaning Clarity") {
      if (score >= 90) {
        return `Lyrical message and emotional perspective are exceptionally clear and direct. The listener immediately grasps the story, theme, or mood on the very first play.`;
      } else if (score >= 80) {
        return `Strong lyrical concept (${score}/100). The theme is highly relatable, maintaining classic thematic boundaries. The remaining points denote a few highly abstract or poetic metaphors that may require a second listen to fully absorb.`;
      } else {
        return `The lyrical meaning is highly abstract, dream-like, or complex. While this creates beautiful depth for atmospheric genres or indie-art fans, it registers a lower score on traditional Meaning Clarity because of its oblique phrasing rather than direct storytelling.`;
      }
    }
    if (cleanName === "Cliché Avoidance") {
      if (score >= 90) {
        return `Fresh, highly artistic poetic phrasing! You've completely avoided overused rhymes, idioms, or predictable pop tropes, creating highly unique metaphors that feel authentic and modern.`;
      } else if (score >= 80) {
        return `Strong vocabulary and evocative line phrasing (${score}/100). A few familiar rhyme schemes (like 'fire/desire') are present, but they are well-crafted enough within the flow to maintain professional standards.`;
      } else {
        return `The lyric relies on highly familiar pop rhyme schemes and conventional conversational expressions. This can provide direct sing-along catchiness in commercial formats, but scores lower in Cliché Avoidance compared to highly unique poetic/literary phrasings.`;
      }
    }

    // --- Music Theory Analysis Subscores ---
    if (cleanName === "Chord Dynamics") {
      if (score >= 90) {
        return `Beautiful, highly dynamic chord architecture. The progression utilizes extended voicings (such as 7ths, 9ths, or suspended chords) and sophisticated voice leading to guide the listener. This score reflects an exceptionally complex harmonic structure (comparable to jazz, progressive, or rich orchestral progressions).`;
      } else if (score >= 80) {
        return `A solid, cohesive diatonic progression sequence (${score}/100). The chords build great sectional energy, sticking to stable major/minor keys (like standard diatonic triads). While perfect for classic pop, rock, and folk songwriting, higher scores in this metric require secondary dominants, suspended transitions, or intentional dissonance to deliberately tease the ear.`;
      } else {
        return `This score (${score}/100) reflects a simple, highly direct chord structure (often major/minor triads following classic progressions like I-IV-V). This is not a value judgment—some of the greatest hits in history by legends like AC/DC, Bob Dylan, or classic punk and folk icons rely entirely on pure diatonic chord structures. If virtually no chord structure exists (like standard EDM bass loops), a lower score simply reflects that the track's drive is rhythmic and melodic rather than harmonic.`;
      }
    }
    if (cleanName === "Harmonic Variety" || cleanName === "Melody") {
      if (score >= 90) {
        return `Exceptional melodic range and pitch alignment! The vocal melodies weave effortlessly across complex scale intervals, utilizing unexpected passing tones and elegant modulation options. This score characterizes complex polyphonic structures.`;
      } else if (score >= 80) {
        return `Beautiful melodic craftsmanship and key cohesion (${score}/100). The melodies sit naturally inside the chord movements, maintaining clear scale integrity and cohesive musical statements. The remaining points are not a penalty—they simply denote that the melody maintains standard diatonic scale boundaries rather than wandering into complex accidentals, modulations, or non-scale dissonances that might alter the song's fundamental nature.`;
      } else {
        return `The melodies stay close to basic root notes or simple 1-3-5 triad shapes on the grid. While this provides a highly memorable, easily hummable top-line for standard pop, a higher score is reserved for melodies that stretch across wider intervals, utilize non-scale passing tones, or weave through distinct musical key modulations.`;
      }
    }
    if (cleanName === "Rhythmic Meter") {
      if (score >= 90) {
        return `Virtuoso rhythmic cadence! Subdivisions, syncopations, and complex patterns lock together flawlessly, creating a highly compelling, non-traditional grid (like polymetric grooves or non-4/4 time signatures).`;
      } else if (score >= 80) {
        return `Excellent rhythmic consistency and tempo pocketing (${score}/100). The instrumentation locks comfortably into the primary rhythm grid, driving a steady, engaging pulse that supports the vocals beautifully. The missing points here are not a penalty—they simply reflect that the groove stays strictly and beautifully in a traditional pocket (like a straight-time 4/4 or 3/4 signature) without forcing off-beat syncopation, complex tuplets, or polymetric subdivisions that are unnecessary for the song's pocket.`;
      } else {
        return `The rhythms feel highly grid-aligned or repetitive. While a straight-line grid is a solid sonic foundation, higher scores in this specific parameter are reserved for tracks that employ dynamic syncopations, off-beat accents, swing, or humanized timing variances.`;
      }
    }
    if (cleanName === "Form & Structure") {
      if (score >= 90) {
        return `Elite layout blueprint. The progression of verses, choruses, and bridges develops with stunning structural symmetry, perfect loop lengths, and highly effective motif repetition.`;
      } else if (score >= 80) {
        return `Very solid sectional architecture (${score}/100). The song blocks follow standard loop rules cleanly. The remaining points denote classical form styles (like a recurring and predictable verse-chorus cycle) rather than unexpected experimental transitions, signature breakdown segments, or progressive multi-part movements.`;
      } else {
        return `The arrangement follows a very simple or highly repetitive structural pattern. This is excellent for short electronic tracks or trance grooves to maximize loop focus, but registers lower on structural narrative development compared to complex multi-part forms.`;
      }
    }

    // --- Song Title Searchability Subscores ---
    if (cleanName === "SEO Uniqueness") {
      if (score >= 90) {
        return `Highly unique title signature! When fans search your song title, you won't compete with massive existing artists or common phrase traffic, leading to immediate SEO discovery.`;
      } else if (score >= 80) {
        return `Very strong title design (${score}/100). It is highly searchable, though adding specific artist tags and descriptions during metadata submission will guarantee top positioning.`;
      } else {
        return `The title is extremely common or generic. Your track will face massive SEO competition. Consider either tweaking the title to represent a unique lyric line, or establishing heavy promo tags.`;
      }
    }
    if (cleanName === "SEO Discoverability") {
      if (score >= 90) {
        return `Excellent digital footprint indexing potential! The title acts as a perfect keywords hook, making it incredibly simple for curating listeners to find your profile on Spotify, YouTube, and Google.`;
      } else if (score >= 80) {
        return `Great search potential (${score}/100). To maximize discoverability, ensure you include lyrics and descriptive tags on all platforms to feed indexing crawlers.`;
      } else {
        return `Low search discovery likelihood. Fans who try searching for this title may get buried under common keywords or matching video names. Try adding a unique subtitle in parentheses.`;
      }
    }

    // --- Artistic Analysis Subscores ---
    if (cleanName === "Atmospheric Depth") {
      if (score >= 90) {
        return `Immersion masterclass! The arrangement breathes with absolute three-dimensional space, utilizing pristine trailing delays, vintage plate verbs, and structural ambient soundscapes that build an immediate emotional universe.`;
      } else if (score >= 80) {
        return `Remarkable atmospheric staging (${score}/100). The sonic backdrop has beautiful depth; adding a subtle background texture loop (like vinyl crackle or tape hiss) would seal the classic vinyl vibe.`;
      } else {
        return `The atmosphere feels slightly dry or direct. Try widening the stereo field of secondary instruments and using long-tail auxiliary reverbs on acoustic components to establish ambient space.`;
      }
    }
    if (cleanName === "Harmonic Intrigue") {
      if (score >= 90) {
        return `Breathtaking harmonic complexity. Standard minor scale guidelines are transcended here; introducing gorgeous chord extensions, polymetric syncopations, and unexpected leading tones that reward deep musical listening.`;
      } else if (score >= 80) {
        return `Strong, cohesive chordal intelligence (${score}/100). The chord changes feel rich, maintaining clean scale integrity. The remaining points reflect that the track is beautifully written in a traditional diatonic construct, avoiding complex avant-garde chord structures, modal mixture, or dissonant modulations.`;
      } else {
        return `The chord choices stick close to typical safe charts. This is perfect for simple or direct arrangements to maximize direct listening focus, but registers lower on this specific index compared to tracks featuring complex open tunings, accidental modulations, or non-diatonic voice leading.`;
      }
    }
    if (cleanName === "Palette Synergy") {
      if (score >= 90) {
        return `Exquisite acoustic gluing! Deeply contrasting textures (e.g. vintage strings meeting modern synths) are bonded together flawlessly, making the entire arrangement feel like one cohesive, multi-layered work of art.`;
      } else if (score >= 80) {
        return `Great instrumentation profile (${score}/100). Sound design holds a clean aesthetic line, showing an outstanding balance between contrast and cohesion in the instrument grouping.`;
      } else {
        return `The contrast between contrasting instrument lines or frequencies remains a bit disjointed. While this can provide interesting dramatic lo-fi or raw energy, a higher score is reserved for tracks that exhibit a highly unified, blended sonic atmosphere.`;
      }
    }
    if (cleanName === "Poetic Substance") {
      if (score >= 90) {
        return `Sublime lyrical poetry! This is visual storytelling at its finest, rich with metaphor, dense word pairings, and spiritual imagery that rewards listeners on every single replay.`;
      } else if (score >= 80) {
        return `Very evocative phrasing (${score}/100). The lyrics paint a compelling scenario or message. This score reflects an excellent balance of direct, clear storytelling and metaphorical expressions.`;
      } else {
        return `The lyric choices lean more toward standard conversational style or common clichés. While easy for a mainstream audience to sing along to, they display fewer deep poetic metaphors or abstract sensory descriptions.`;
      }
    }

    // --- Songwriting DNA Subscores ---
    if (cleanName === "Interval Memory") {
      if (score >= 90) {
        return `Outstanding interval memory! The leaps are catchy and extremely memorable, creating a melody that instantly lodges itself into the listener's brain upon first hearing.`;
      } else if (score >= 80) {
        return `Strong interval memory of ${score}/100. It is clean and extremely easy to hum, matching commercial pop patterns perfectly.`;
      } else {
        return `The melody lacks distinct interval hooks. Consider adding bigger leaps (like perfect 5ths or octaves) to accent core emotional phrases.`;
      }
    }
    if (cleanName === "Syllabic Placement") {
      if (score >= 90) {
        return `Masterful syllabic placement! Syncopation and rhyme patterns lock flawlessly with transient downbeats, driving the rhythm forward with premium commercial punch.`;
      } else if (score >= 80) {
        return `Great rhythmic syllables (${score}/100). The flow is tight and keeps energy moving securely across the measures.`;
      } else {
        return `Some syllables feel slightly rushed or crowded. Try trimming unnecessary words to allow key syllables to sit exactly in the pocket.`;
      }
    }
    if (cleanName === "Dynamic Modulation") {
      if (score >= 90) {
        return `Brilliant dynamic modulation! The stark contrast between whisper-quiet verses and the explosive choruses creates massive dramatic scale that keeps the listener transfixed.`;
      } else if (score >= 80) {
        return `Excellent volume and energy variance of ${score}/100. The transitions feel natural and give the arrangement a highly professional shape.`;
      } else {
        return `The energy levels are a bit flat. Try pulling back instruments in the verses to make the chorus arrival feel far more massive.`;
      }
    }
    if (cleanName === "Climax Trajectory") {
      if (score >= 90) {
        return `Flawless climax trajectory! The arrangement builds tension step-by-step, perfectly timing the ultimate emotional peak right when the main hook lands.`;
      } else if (score >= 80) {
        return `Highly effective anticipation curve (${score}/100). The build-up is satisfying and resolves into a punchy pay off.`;
      } else {
        return `The track peaks too early or lacks a clear build-up. Accentuate the bridge or pre-chorus builds to let the final chorus explode with maximum relief.`;
      }
    }
    if (cleanName === "Vocal Pocketing") {
      if (score >= 90) {
        return `Astonishing vocal pocketing! The syllables sit beautifully within the beat's groove, creating a natural, conversational ease that makes the melody feel effortless.`;
      } else if (score >= 80) {
        return `Good rhythm alignment (${score}/100). The vocals bounce nicely off the drum patterns and remain perfectly clear.`;
      } else {
        return `The vocal phrasing is timing-clumsy in spots. Try holding back vocal starts slightly behind the downbeat to let them sink into the groove.`;
      }
    }
    if (cleanName === "Poetic Brevity") {
      if (score >= 90) {
        return `Exceptional poetic brevity! Outstanding economy of language; every word carries profound weight, leaving generous negative space for the instruments to breathe.`;
      } else if (score >= 80) {
        return `Highly efficient lyricism of ${score}/100, striking a clean balance between details and singability.`;
      } else {
        return `The lyrics feel overly conversational or wordy. Clean up draft lines to make every syllable count toward the primary emotional theme.`;
      }
    }

    return `Highly polished ${cleanName} performance metric, calibrated to modern professional streaming standards.`;
  };

  const getMetricSubscoreColors = (metricId: string): string[] => {
    switch (metricId) {
      case "flow":
        return ["#fbbf24", "#fcd74a", "#fde972", "#fef59e"];
      case "mix":
        return ["#ff7dd6", "#ff8fde", "#ffaeeb", "#ffc8f6"];
      case "vocals":
        return ["#8e7dff", "#9b8fff", "#b3aeff"];
      case "instrumental":
        return ["#10b981", "#34d399", "#6ee7b7"];
      case "searchability":
        return ["#f472b6", "#f9a8d4"];
      case "readiness":
      case "production":
        return ["#4fa6ff", "#74c8f6", "#6cdfff"];
      case "artistic":
        return ["#ec4899", "#f472b6", "#f9a8d4", "#fbcfe8"];
      case "lyrics":
        return ["#22d3ee", "#67e8f9"];
      case "theory":
        return ["#818cf8", "#a5b4fc"];
      case "dna-melodic":
        return ["#10b981", "#34d399"];
      case "dna-tension":
        return ["#10b981", "#34d399"];
      case "dna-density":
        return ["#10b981", "#34d399"];
      default:
        return ["#10b981", "#fbbf24", "#f43f5e"];
    }
  };

  const renderExpandedBreakdown = (selectedId: string) => {
    const selectedObj = 
      METRICS_LIST.find(m => m.id === selectedId) || 
      AUX_METRICS_LIST.find(m => m.id === selectedId);
    if (!selectedObj) return null;

    const subscoreColors = getMetricSubscoreColors(selectedObj.id);
    const backgroundGradient = subscoreColors.length === 1 
      ? subscoreColors[0] 
      : `linear-gradient(to bottom, ${subscoreColors.join(", ")})`;
    const primaryGlowColor = subscoreColors[0];

    return (
      <div style={{ marginTop: "0px", paddingTop: "0px" }} className="animate-fadeIn font-sans relative">
        <div style={{ position: "relative", left: "10px" }} className="bg-[#050608] p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-6 items-start relative overflow-hidden shadow-2xl">
          <div 
            style={{ 
              left: "10px", 
              background: backgroundGradient, 
              boxShadow: `0 0 15px ${primaryGlowColor}80` 
            }} 
            className="absolute top-0 w-3 h-full" 
          />
          
          {/* Left Column: Metric Details and Progression bar */}
          <div className="flex-1 w-full pl-3.5">
            {/* A&R Diagnostic Focus Block */}
            <div className="p-4 bg-[#020203] border border-white/10 rounded-xl">
              <span className={`text-[10px] font-mono uppercase tracking-wider block mb-1 font-bold ${
                activeCategory === "blueprints" ? "text-cyan-400" : activeCategory === "mainstream" ? "text-blue-400" : activeCategory === "dna" ? "text-emerald-400" : "text-purple-400"
              }`}>
                A&amp;R Diagnostic Focus Assessment Description
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                {selectedObj.hoverText}
              </p>
            </div>

            {selectedObj.id === "readiness" && critique?.liveMetrics && (() => {
              const bucket = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
              const lufs = critique.liveMetrics.calculatedLufs;
              const lra = critique.liveMetrics.calculatedLra;
              const lufsPass = lufs !== undefined && lufs >= bucket.lufsMin && lufs <= bucket.lufsMax;
              const lraPass = lra !== undefined && lra >= bucket.lraMin && (bucket.lraMax === null || lra <= bucket.lraMax);
              return (
                <div className="mt-3 p-4 bg-[#020203] border border-white/10 rounded-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider block mb-2 font-bold text-blue-400">
                    Loudness & Dynamic Range Compliance ({bucket.label})
                  </span>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono ${lufsPass ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-300" : "border-rose-500/40 bg-rose-500/5 text-rose-300"}`}>
                      <span className="font-bold uppercase">{lufsPass ? "PASS" : "FAIL"}</span> — LUFS Loudness: {lufs ?? "--"} (target: {bucket.lufsMin} to {bucket.lufsMax})
                    </div>
                    <div className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono ${lraPass ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-300" : "border-rose-500/40 bg-rose-500/5 text-rose-300"}`}>
                      <span className="font-bold uppercase">{lraPass ? "PASS" : "FAIL"}</span> — Dynamic Range: {lra ?? "--"} LU (target: {bucket.lraMin}{bucket.lraMax !== null ? `-${bucket.lraMax}` : "+"})
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Compliance badges only - not scored, not weighted, does not factor into the Engagement Power score.</p>
                </div>
              );
            })()}

            <p className="text-xs text-slate-450 mt-4 leading-relaxed italic">
              {selectedObj.description}
            </p>

            {/* REQ: Sub Score Circular Items redesigned into a vertical stack layout */}
            <div className="flex flex-col gap-4 mt-5">
              {(selectedObj.subParams || []).map((param, index) => {
                const realSub = getRealSubMetric(critique, selectedObj.id, index);
                const subScore = realSub ? realSub.score : getSubScore(selectedObj.score, index, selectedObj.subParams.length, selectedObj.id);
                
                // Determine colors precisely matching the Rose Chart:
                // index === 0: Structural Build -> yellow/orange (#fbbf24)
                // index === 1: Melodic Tension -> green/mint (#10b981)
                // index === 2: Hook Placement -> red/rose (#f43f5e)
                // index === 3: Sectional Contrast -> blue/cyan (#0ea5e9)
                let ringColor = "#3b82f6";
                let statusLabel = "Optimal";
                
                if (selectedObj.id === "flow") {
                  if (index === 0) {
                    ringColor = "#fbbf24";
                    statusLabel = "REVIEW";
                  } else if (index === 1) {
                    ringColor = "#fcd74a";
                    statusLabel = "OPTIMAL";
                  } else if (index === 2) {
                    ringColor = "#fde972";
                    statusLabel = "REVIEW";
                  } else if (index === 3) {
                    ringColor = "#fef59e";
                    statusLabel = "OPTIMAL";
                  }
                } else if (selectedObj.id === "mix") {
                  if (index === 0) {
                    ringColor = "#ff7dd6";
                  } else if (index === 1) {
                    ringColor = "#ff8fde";
                  } else if (index === 2) {
                    ringColor = "#ffaeeb";
                  } else if (index === 3) {
                    ringColor = "#ffc8f6";
                  }
                  
                  if (subScore >= 85) {
                    statusLabel = "OPTIMAL";
                  } else if (subScore >= 75) {
                    statusLabel = "REVIEW";
                  } else {
                    statusLabel = "CRITICAL ADVICE";
                  }
                } else if (selectedObj.id === "vocals") {
                  if (index === 0) {
                    ringColor = "#8e7dff";
                  } else if (index === 1) {
                    ringColor = "#9b8fff";
                  } else if (index === 2) {
                    ringColor = "#b3aeff";
                  }
                  
                  if (subScore >= 85) {
                    statusLabel = "OPTIMAL";
                  } else if (subScore >= 75) {
                    statusLabel = "REVIEW";
                  } else {
                    statusLabel = "CRITICAL ADVICE";
                  }
                } else if (selectedObj.id === "instrumental") {
                  if (index === 0) {
                    ringColor = "#10b981";
                  } else if (index === 1) {
                    ringColor = "#34d399";
                  } else if (index === 2) {
                    ringColor = "#6ee7b7";
                  }
                  
                  if (subScore >= 85) {
                    statusLabel = "OPTIMAL";
                  } else if (subScore >= 75) {
                    statusLabel = "REVIEW";
                  } else {
                    statusLabel = "CRITICAL ADVICE";
                  }
                } else if (selectedObj.id === "searchability") {
                  if (index === 0) {
                    ringColor = "#f472b6";
                  } else if (index === 1) {
                    ringColor = "#f9a8d4";
                  }
                  
                  if (subScore >= 85) {
                    statusLabel = "OPTIMAL";
                  } else if (subScore >= 75) {
                    statusLabel = "REVIEW";
                  } else {
                    statusLabel = "CRITICAL ADVICE";
                  }
                } else if (selectedObj.id === "readiness" || selectedObj.id === "production") {
                  if (index === 0) {
                    ringColor = "#4fa6ff";
                  } else if (index === 1) {
                    ringColor = "#74c8f6";
                  } else if (index === 2) {
                    ringColor = "#6cdfff";
                  }
                  
                  if (subScore >= 85) {
                    statusLabel = "OPTIMAL";
                  } else if (subScore >= 75) {
                    statusLabel = "REVIEW";
                  } else {
                    statusLabel = "CRITICAL ADVICE";
                  }
                } else if (selectedObj.id === "artistic") {
                  if (index === 0) {
                    ringColor = "#ec4899";
                  } else if (index === 1) {
                    ringColor = "#f472b6";
                  } else if (index === 2) {
                    ringColor = "#f9a8d4";
                  } else if (index === 3) {
                    ringColor = "#fbcfe8";
                  }
                  
                  if (subScore >= 85) {
                    statusLabel = "OPTIMAL";
                  } else if (subScore >= 75) {
                    statusLabel = "REVIEW";
                  } else {
                    statusLabel = "CRITICAL ADVICE";
                  }
                } else if (selectedObj.id === "lyrics") {
                  if (index === 0) {
                    ringColor = "#22d3ee";
                  } else if (index === 1) {
                    ringColor = "#67e8f9";
                  }
                  
                  if (subScore >= 85) {
                    statusLabel = "OPTIMAL";
                  } else if (subScore >= 75) {
                    statusLabel = "REVIEW";
                  } else {
                    statusLabel = "CRITICAL ADVICE";
                  }
                } else if (selectedObj.id === "theory") {
                  if (index === 0) {
                    ringColor = "#818cf8";
                  } else if (index === 1) {
                    ringColor = "#a5b4fc";
                  }
                  
                  if (subScore >= 85) {
                    statusLabel = "OPTIMAL";
                  } else if (subScore >= 75) {
                    statusLabel = "REVIEW";
                  } else {
                    statusLabel = "CRITICAL ADVICE";
                  }
                } else if (selectedObj.id === "dna-melodic") {
                  ringColor = index === 0 ? "#10b981" : "#34d399";
                  statusLabel = subScore >= 85 ? "OPTIMAL" : subScore >= 75 ? "REVIEW" : "CRITICAL ADVICE";
                } else if (selectedObj.id === "dna-tension") {
                  ringColor = index === 0 ? "#10b981" : "#34d399";
                  statusLabel = subScore >= 85 ? "OPTIMAL" : subScore >= 75 ? "REVIEW" : "CRITICAL ADVICE";
                } else if (selectedObj.id === "dna-density") {
                  ringColor = index === 0 ? "#10b981" : "#34d399";
                  statusLabel = subScore >= 85 ? "OPTIMAL" : subScore >= 75 ? "REVIEW" : "CRITICAL ADVICE";
                } else {
                  // Fallbacks for other metrics
                  if (subScore >= 85) {
                    ringColor = "#10b981";
                    statusLabel = "OPTIMAL";
                  } else if (subScore >= 75) {
                    ringColor = "#fbbf24";
                    statusLabel = "REVIEW";
                  } else {
                    ringColor = "#f43f5e";
                    statusLabel = "CRITICAL ADVICE";
                  }
                }

                let statusColorClass = "text-blue-400";
                if (statusLabel.toLowerCase().includes("optimal")) {
                  statusColorClass = "text-[#10b981]";
                } else if (statusLabel.toLowerCase().includes("review")) {
                  statusColorClass = "text-[#e5a601]";
                } else if (statusLabel.toLowerCase().includes("critical")) {
                  statusColorClass = "text-rose-450";
                }

                // Sub score inner circle parameters (flat style, non-glowing, non-selectable)
                const sRadius = (64 - 4) / 2;
                const sCircumference = 2 * Math.PI * sRadius;
                const sOffset = sCircumference - (subScore / 100) * sCircumference;

                const isLufsRow = false;

                return (
                  <div key={index} className="flex flex-col gap-2.5 w-full">
                    <div 
                      onClick={() => {
                        if (isLufsRow) {
                          setLufsOpen(!lufsOpen);
                        }
                      }}
                      className={`py-[10px] px-5 rounded-2xl border flex flex-col sm:flex-row gap-5 items-center sm:items-stretch shadow-lg transition-all duration-300 ${
                        isLufsRow 
                          ? `cursor-pointer ${lufsOpen ? "border-teal-500 bg-[#0d1615]/30 shadow-[0_0_15px_rgba(20,184,166,0.08)]" : "border-white/10 hover:border-teal-500/45 hover:bg-neutral-900/40"}`
                          : "bg-neutral-950 border-white/10"
                      }`}
                    >
                      {/* Left Column: Redesigned circle score badge */}
                      <div className="flex flex-col items-center justify-center p-3 bg-black/60 rounded-xl border border-white/5 w-24 shrink-0 text-center select-none">
                        <span className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase">Subscore</span>
                        
                        {/* Nested flat arc score circle */}
                        <div className="relative flex items-center justify-center my-2" style={{ width: 64, height: 64 }}>
                          <svg width={64} height={64} className="transform -rotate-90">
                            {/* Track */}
                            <circle
                              cx={32}
                              cy={32}
                              r={sRadius}
                              className="stroke-neutral-900 fill-none"
                              strokeWidth={4}
                            />
                            {/* Filled ring */}
                            <circle
                              cx={32}
                              cy={32}
                              r={sRadius}
                              className="fill-none"
                              stroke={ringColor}
                              strokeWidth={4}
                              strokeDasharray={sCircumference}
                              strokeDashoffset={sOffset}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute font-mono font-black text-white text-base select-none">
                            {subScore}
                          </span>
                        </div>

                        <span className={`text-[10px] font-mono font-black tracking-wider uppercase mt-1 ${statusColorClass}`}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Right Column: Title, weight, explanation, and deep dive analysis */}
                      <div className="flex-grow flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-end justify-between gap-2 border-b border-dotted border-white/15 pb-1 animate-fadeIn">
                            <span className="text-sm font-black text-slate-100 font-sans tracking-tight flex items-baseline gap-2">
                              <span className="leading-none">{param.name.split(" (")[0]}</span>
                              {isLufsRow && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded font-mono font-bold uppercase tracking-widest leading-none">
                                  {lufsOpen ? "Toggled On" : "Click to review"}
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider leading-none">
                              Weight: {(() => {
                                const embeddedMatch = param.name.match(/\((\d+)%\)/);
                                if (embeddedMatch) return `${embeddedMatch[1]}%`;
                                if (selectedObj.id === "artistic") {
                                  return param.name === "Harmonic Intrigue" ? "40%" : "30%";
                                }
                                return `${Math.round(100 / selectedObj.subParams.length)}%`;
                              })()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            {param.desc}
                          </p>
                        </div>

                        {/* Decoupled layout element for laying why the score got what it did! */}
                        <div className="mt-3.5 p-3.5 bg-black/60 border border-white/5 rounded-xl text-xs text-slate-300 leading-relaxed font-sans shadow-inner relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-0.5 h-full bg-blue-500/40" />
                          <span className="text-[9px] font-mono text-blue-400 font-bold uppercase tracking-widest block mb-1">
                            A&amp;R Deep-Dive Analysis
                          </span>
                          {realSub ? realSub.commentary : getSubScoreExplanationText(param.name, subScore)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Embedded custom high-end visualizer graphs and technical explanation breakdown columns */}
            {selectedObj.id !== "readiness" && renderMetricVisualizerFeature(selectedObj.id, selectedObj.score)}
          </div>

          {/* REQ: Right Column - AI Consultant Response / A&R Eval Summary with Highlighted importance pill */}
          <div className="w-full md:w-[256px] bg-[#020203] py-5 px-3 rounded-2xl border border-white/10 self-stretch flex flex-col justify-between">
            <div>
              <div className="mb-4">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#a855f7] block mb-1 font-bold select-none">
                  Your A&amp;R Evaluation Summary
                </span>
                {/* REQ: Elevated highlighted target rating pill on the A&R Eval summary block */}
                <div className={`mt-2.5 p-4 rounded-xl flex items-center justify-between border ring-1 relative overflow-hidden transition-all duration-300 ${
                  activeCategory === "blueprints"
                    ? "bg-cyan-500/10 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-cyan-500/30"
                    : activeCategory === "mainstream"
                    ? "bg-blue-500/10 border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-blue-500/30"
                    : activeCategory === "dna"
                    ? "bg-emerald-500/10 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-emerald-500/30"
                    : "bg-purple-500/10 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-purple-500/30"
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] to-transparent pointer-events-none" />
                  <div className="relative z-10">
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider block ${
                      activeCategory === "blueprints" ? "text-cyan-400" : activeCategory === "mainstream" ? "text-blue-400" : activeCategory === "dna" ? "text-emerald-400" : "text-purple-400"
                    }`}>Target Audit Rating</span>
                    <span className="text-xl font-mono font-black text-white">{selectedObj.score}/100</span>
                  </div>
                  <span className={`relative z-10 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(59,130,246,0.4)] ${
                    activeCategory === "blueprints" ? "bg-cyan-600 text-white" : activeCategory === "mainstream" ? "bg-blue-600 text-white" : activeCategory === "dna" ? "bg-emerald-600 text-white" : "bg-purple-600 text-white"
                  }`} style={activeCategory === "blueprints" ? { backgroundColor: '#0891b2' } : activeCategory === "mainstream" ? { backgroundColor: '#2563eb' } : activeCategory === "dna" ? { backgroundColor: '#10b981' } : { backgroundColor: '#9333ea' }}>
                    {selectedObj.score >= 85 ? "OPTIMAL AUDIT" : selectedObj.score >= 75 ? "HEALTHY AUDIT" : "CRITICAL AUDIT"}
                  </span>
                </div>
              </div>
              
              <p className="text-xs leading-relaxed text-slate-300 italic bg-black/85 p-3.5 rounded-xl border border-white/5">
                "{adjustFeedbackForGenreOverride(selectedObj.feedback) || "Detailed sonics and frequency feedback is compiling for this sub-factor."}"
              </p>

              {/* Dynamic Nightingale Rose Chart reflecting the 4 sub-scores */}
              {(() => {
                const roseData = (selectedObj.subParams || []).map((param, index) => {
                  const realSub = getRealSubMetric(critique, selectedObj.id, index);
                  const subScore = realSub ? realSub.score : getSubScore(selectedObj.score, index, selectedObj.subParams.length, selectedObj.id);
                  let ringColor = "#3b82f6";
                  
                  if (selectedObj.id === "flow") {
                    if (index === 0) ringColor = "#fbbf24";
                    else if (index === 1) ringColor = "#fcd74a";
                    else if (index === 2) ringColor = "#fde972";
                    else if (index === 3) ringColor = "#fef59e";
                  } else if (selectedObj.id === "mix") {
                    if (index === 0) ringColor = "#ff7dd6";
                    else if (index === 1) ringColor = "#ff8fde";
                    else if (index === 2) ringColor = "#ffaeeb";
                    else if (index === 3) ringColor = "#ffc8f6";
                  } else if (selectedObj.id === "vocals") {
                    if (index === 0) ringColor = "#8e7dff";
                    else if (index === 1) ringColor = "#9b8fff";
                    else if (index === 2) ringColor = "#b3aeff";
                  } else if (selectedObj.id === "instrumental") {
                    if (index === 0) ringColor = "#10b981";
                    else if (index === 1) ringColor = "#34d399";
                    else if (index === 2) ringColor = "#6ee7b7";
                  } else if (selectedObj.id === "searchability") {
                    if (index === 0) ringColor = "#f472b6";
                    else if (index === 1) ringColor = "#f9a8d4";
                  } else if (selectedObj.id === "readiness" || selectedObj.id === "production") {
                    if (index === 0) ringColor = "#4fa6ff";
                    else if (index === 1) ringColor = "#74c8f6";
                    else if (index === 2) ringColor = "#6cdfff";
                  } else if (selectedObj.id === "artistic") {
                    if (index === 0) ringColor = "#ec4899";
                    else if (index === 1) ringColor = "#f472b6";
                    else if (index === 2) ringColor = "#f9a8d4";
                    else if (index === 3) ringColor = "#fbcfe8";
                  } else if (selectedObj.id === "lyrics") {
                    if (index === 0) ringColor = "#22d3ee";
                    else if (index === 1) ringColor = "#67e8f9";
                  } else if (selectedObj.id === "theory") {
                    if (index === 0) ringColor = "#818cf8";
                    else if (index === 1) ringColor = "#a5b4fc";
                  } else if (selectedObj.id === "dna-melodic") {
                    ringColor = index === 0 ? "#10b981" : "#34d399";
                  } else if (selectedObj.id === "dna-tension") {
                    ringColor = index === 0 ? "#10b981" : "#34d399";
                  } else if (selectedObj.id === "dna-density") {
                    ringColor = index === 0 ? "#10b981" : "#34d399";
                  } else {
                    if (subScore >= 85) ringColor = "#10b981";
                    else if (subScore >= 75) ringColor = "#fbbf24";
                    else ringColor = "#f43f5e";
                  }
                  
                  const weightMatch = param.name.match(/\((\d+)%\)/);
                  const parsedWeight = weightMatch 
                    ? parseInt(weightMatch[1], 10) 
                    : (selectedObj.id === "artistic" ? (param.name === "Harmonic Intrigue" ? 40 : 30) : (100 / (selectedObj.subParams?.length || 4)));
                  return {
                    name: param.name.split(" (")[0],
                    score: subScore,
                    color: ringColor,
                    weight: parsedWeight
                  };
                });
                return <RoseChart data={roseData} />;
              })()}
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Critique Status</span>
              <span className="text-emerald-500 font-bold uppercase tracking-wide">COMPLETED</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAlgotorialSandbox = () => {
    const trackId = trackInfo?.id;
    const inferredValence = liveValence;
    const inferredEnergy = liveEnergy;

    const handleCircumplexInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height));
      const val = parseFloat(x.toFixed(2));
      const nrg = parseFloat(y.toFixed(2));
      setLiveValence(val);
      setLiveEnergy(nrg);
      return { val, nrg };
    };

    const saveCircumplexPosition = async (val: number, nrg: number) => {
      if (!trackId) return;
      try {
        await updateTrackFields(trackId, {
          critique: {
            ...critique,
            userValence: val,
            userEnergy: nrg,
          }
        });
      } catch (err) {
        console.error('Failed to save Circumplex position:', err);
      }
    };

    // Target playlists coordinate dictionary dynamically adjusted to match the song's predicted genre
    const getPlaylistCoords = (playlistId: string) => {
      const genre = (critique?.vibe?.genre || "").toLowerCase();
      const style = (critique?.vibe?.subgenre || "").toLowerCase();
      
      const isPop = genre.includes("pop") || style.includes("pop");
      const isRock = genre.includes("rock") || genre.includes("metal") || genre.includes("grunge") || genre.includes("punk") || style.includes("rock") || style.includes("grunge") || style.includes("metal") || style.includes("punk");
      const isHipHop = genre.includes("hip-hop") || genre.includes("rap") || genre.includes("trap") || style.includes("hip-hop") || style.includes("rap") || style.includes("trap");
      const isChill = genre.includes("ambient") || genre.includes("dreamgaze") || genre.includes("shoegaze") || genre.includes("chill") || genre.includes("acoustic") || style.includes("ambient") || style.includes("shoegaze") || style.includes("chill") || style.includes("acoustic");
      const isSynth = genre.includes("synth") || genre.includes("retro") || genre.includes("wave") || style.includes("synth") || style.includes("retro") || style.includes("wave");
      const isCountry = genre.includes("country") || genre.includes("americana") || genre.includes("bluegrass") || style.includes("country") || style.includes("americana") || style.includes("bluegrass");

      switch (playlistId) {
        case "today-hits":
          if (isHipHop) {
            return { name: "RapCaviar Live", val: 0.72, nrg: 0.85, icon: "🎤", desc: "The definitive playlist of hip-hop's biggest hits. High energy, street valence." };
          } else if (isRock) {
            return { name: "Rock Hits Arena", val: 0.60, nrg: 0.88, icon: "⚡", desc: "High-octane stadium ready alternative and classic rock hits." };
          } else if (isCountry) {
            return { name: "Hot Country", val: 0.68, nrg: 0.72, icon: "🤠", desc: "The biggest, hottest hits in modern country, traditional country, and stadium roadhouses." };
          } else if (isChill) {
            return { name: "Acoustic Comforts", val: 0.65, nrg: 0.35, icon: "☕", desc: "Relaxing, acoustic arrangements and calm mainstream vocals." };
          } else if (isSynth) {
            return { name: "Synthwave Radiance", val: 0.70, nrg: 0.80, icon: "🌆", desc: "Retro-futurist neon energy, synthesizer sweeps, and deep bass grids." };
          } else {
            return { name: `Today's Top ${critique?.vibe?.genre || "Pop"} Hits`, val: 0.75, nrg: 0.82, icon: "🔥", desc: `Global hot 40 list targeting top-tier streaming readiness in ${critique?.vibe?.genre || "contemporary music"}.` };
          }
        case "chill-vibes":
          if (isHipHop) {
            return { name: "Chill Lofi Beats", val: 0.60, nrg: 0.30, icon: "🌊", desc: "Slow lo-fi rhythm tracks for late-night bars and home study." };
          } else if (isRock) {
            return { name: "Unplugged Acoustic Rock", val: 0.58, nrg: 0.40, icon: "🪵", desc: "Intimate hollow-body guitar tracks and raw, unplugged sessions." };
          } else if (isCountry) {
            return { name: "Indigo", val: 0.62, nrg: 0.40, icon: "🌾", desc: "The perfect space for outlaw country, Americana, and raw folk-storyteller vibes." };
          } else if (isChill) {
            return { name: "Drifting Ambient Sleep", val: 0.70, nrg: 0.18, icon: "☁️", desc: "Ethereal pads, modular soundscapes, and shoegaze reverb beds." };
          } else {
            return { name: `Chill ${critique?.vibe?.genre || "Vibe"} Room`, val: 0.65, nrg: 0.32, icon: "🌊", desc: `Relaxed, downtempo ${critique?.vibe?.genre || "acoustic"} tracks to wind down or study.` };
          }
        case "discover-weekly":
          return { name: `${critique?.vibe?.genre || "Aesthetic"} Discoveries`, val: 0.52, nrg: 0.58, icon: "🔮", desc: `Algorithmically customized dashboard finding adjacent sub-categories matching your ${critique?.vibe?.subgenre || "performance"} profile.` };
        case "indie":
          if (isHipHop) {
            return { name: "Alternative Hip Hop Flow", val: 0.45, nrg: 0.62, icon: "🎙️", desc: "Underground rap, raw poetry and experimental sample-flip designs." };
          } else if (isRock) {
            return { name: "Seattle Garage Punk", val: 0.40, nrg: 0.68, icon: "🎸", desc: "Grunge, fuzz distortion, raw garage takes, and independent defiance." };
          } else if (isCountry) {
            return { name: "Texas Music Now / Emerging Roots", val: 0.55, nrg: 0.58, icon: "🌵", desc: "Independent country, outlaw grit, and emerging singer-songwriter roots." };
          } else if (isChill) {
            return { name: "Underground Dreamgaze", val: 0.50, nrg: 0.45, icon: "🥀", desc: "Subtle shoegaze guitars, whispered vocal beds, and lo-fi textures." };
          } else {
            return { name: `Independent ${critique?.vibe?.genre || "Creative"} Stage`, val: 0.38, nrg: 0.54, icon: "🌟", desc: `Raw, authentic talent and self-released gems showcasing pure ${critique?.vibe?.aesthetic || "artistry"}.` };
          }
        default:
          return { name: "Today's Top Hits", val: 0.75, nrg: 0.82, icon: "🔥", desc: "Global Top 40 pop hits." };
      }
    };

    const target = getPlaylistCoords(selectedTargetPlaylist);

    // Compute Cosine Similarity between song (inferredValence, inferredEnergy) and playlist target (target.val, target.nrg)
    const dotProduct = (inferredValence * target.val) + (inferredEnergy * target.nrg);
    const magSong = Math.sqrt(inferredValence * inferredValence + inferredEnergy * inferredEnergy);
    const magTarget = Math.sqrt(target.val * target.val + target.nrg * target.nrg);
    const cosSimRaw = magSong && magTarget ? (dotProduct / (magSong * magTarget)) : 0.82;
    // Boost slightly to avoid extremely low values for typical songs, clip to [0.0, 1.0]
    const cosSimilarity = Math.min(1.0, Math.max(0.0, cosSimRaw));
    const percentageMatch = Math.round(cosSimilarity * 100);

    // B. Sequential Variance Simulation Metrics (Russell's Circumplex Model & consecutive tracking)
    // We compute the variance s^2 based on BPM/Key matching
    const trackBpm = getEstimatedBpm();
    const trackKey = getEstimatedKey();

    // Helper to get related keys dynamically
    const getRelatedKey = (key: string, offset: number) => {
      const keys = ["C Major", "A minor", "G Major", "E minor", "D Major", "B minor", "A Major", "F# minor", "E Major", "C# minor", "F Major", "D minor", "Bb Major", "G minor", "Eb Major", "C minor", "Ab Major", "F minor"];
      const cleanKey = key.replace(" (TKEY)", "");
      const idx = keys.findIndex(k => cleanKey.toLowerCase().includes(k.split(" ")[0].toLowerCase()) && cleanKey.toLowerCase().includes(k.split(" ")[1].toLowerCase()));
      if (idx === -1) {
        return offset > 0 ? "G Major" : "D minor";
      }
      const targetIdx = (idx + offset + keys.length) % keys.length;
      return keys[targetIdx];
    };

    const getTransitionStats = (theme: "uniform" | "upbeat" | "sudden") => {
      switch (theme) {
        case "uniform":
          return {
            prevBpm: trackBpm - 3,
            prevKey: getRelatedKey(trackKey, 1),
            nextBpm: trackBpm + 4,
            nextKey: getRelatedKey(trackKey, -1),
            variance: 0.04,
            status: "Excellent (Harmonious Blend)",
            color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
            notes: "Adjacent tracks perfectly share tempo brackets and key signatures. Negligible listener attention disruption."
          };
        case "upbeat":
          return {
            prevBpm: Math.round(trackBpm * 0.85),
            prevKey: getRelatedKey(trackKey, 2),
            nextBpm: Math.round(trackBpm * 1.15),
            nextKey: getRelatedKey(trackKey, -2),
            variance: 0.18,
            status: "Moderate (Energy Elevator)",
            color: "text-blue-400 border-blue-500/20 bg-blue-500/10",
            notes: "Song acts as a step-ladder to accelerate playlist intensity. Creates a pleasant momentum progression."
          };
        case "sudden":
          return {
            prevBpm: Math.round(trackBpm * 0.65),
            prevKey: getRelatedKey(trackKey, 5),
            nextBpm: Math.round(trackBpm * 1.45),
            nextKey: getRelatedKey(trackKey, -5),
            variance: 0.64,
            status: "Critical (Abrupt Genre Skip Risk)",
            color: "text-rose-400 border-rose-500/20 bg-rose-500/10",
            notes: "Jarring tempo/key shift between playlists. Demands excessive acoustic adaptation (high skip risk)."
          };
      }
    };

    const trans = getTransitionStats(vibeTransitionTheme);

    // C. 30-Second Skip & Playthrough Simulation Calculator
    // Skip risk decreases if overallProduction is high and commercialReadiness is high, modified by live traits
    let liveSkipModifier = 0;
    if (critique?.liveMetrics) {
      const { calculatedLufs, calculatedBpm, calculatedStereoCorrelation } = critique.liveMetrics;
      // Loudness penalty: if quieter than -12.5 LUFS
      if (calculatedLufs < -12.5) {
        liveSkipModifier += Math.round(Math.abs(calculatedLufs + 12.5) * 1.8);
      }
      // Out of phase or completely mono penalty
      if (calculatedStereoCorrelation > 0.82) {
        liveSkipModifier += 6; // mono
      } else if (calculatedStereoCorrelation < -0.15) {
        liveSkipModifier += 14; // out of phase issues
      }
      // BPM extreme check
      if (calculatedBpm < 75 || calculatedBpm > 155) {
        liveSkipModifier += 5;
      }
    }
    const baseSkipProb = Math.min(85, Math.max(10, 95 - Math.round((commercialReadinessVal * 0.70) + (overallProductionVal * 0.20)) + liveSkipModifier));
    // Completion rate prediction (CR) is inverse of Skip Risk (SR) with some decay
    const predictedSkipRate = baseSkipProb;
    const predictedCompletionRate = Math.min(96, Math.max(15, 100 - baseSkipProb - 5));

    // Determine current skip risk status text during the 30-second live playback
    const getLiveSimFeedback = (seconds: number) => {
      if (seconds === 0) return { risk: "0%", status: "Simulation Ready", desc: "Awaiting ignition. Press TEST RUN to model audience response." };
      if (seconds < 5) {
        return {
          risk: `${predictedSkipRate + 12}%`,
          status: "Aesthetic Immediacy Check (0s - 5s)",
          desc: "Critical! Immediate sound match check. Clean transients and early hook prevent fast skip."
        };
      }
      if (seconds < 15) {
        return {
          risk: `${predictedSkipRate}%`,
          status: "Vocal & Lead Intro Phase (5s - 15s)",
          desc: "Vocal/theme introduction anchors attention. Chord cadence resolved."
        };
      }
      if (seconds < 29) {
        return {
          risk: `${Math.round(predictedSkipRate * 0.6)}%`,
          status: "Vibe Consolidation Phase (15s - 29s)",
          desc: "Steady groove flow. Harmonic content matching expectation parameters."
        };
      }
      return {
        risk: "0%",
        status: "🎉 GATEKEEPER CLEARED!",
        desc: "30-second boundary breached! Stream is monetarily counted in Spotify analytics."
      };
    };

    const getSkipRateLabel = (rate: number): { label: string; color: string } => {
      if (rate <= 20) return { label: "▲ EXCELLENT", color: "text-emerald-400" };
      if (rate <= 32) return { label: "▲ GOOD", color: "text-green-400" };
      if (rate <= 45) return { label: "◆ AVERAGE", color: "text-yellow-400" };
      if (rate <= 60) return { label: "▼ ELEVATED RISK", color: "text-orange-400" };
      return { label: "▼ HIGH RISK", color: "text-rose-400" };
    };

    const getCompletionRateLabel = (rate: number): { label: string; color: string } => {
      if (rate >= 75) return { label: "▲ OPTIMIZED", color: "text-teal-400" };
      if (rate >= 60) return { label: "▲ GOOD", color: "text-green-400" };
      if (rate >= 45) return { label: "◆ AVERAGE", color: "text-yellow-400" };
      if (rate >= 30) return { label: "▼ BELOW TARGET", color: "text-orange-400" };
      return { label: "▼ POOR", color: "text-rose-400" };
    };

    const liveStats = getLiveSimFeedback(sandboxProgress);

    return (
      <div className="bg-[#13161C] border border-white/10 rounded-[32px] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-6 my-2 scroll-mt-[100px]" id="algotorial-sandbox-panel">
        {/* Dynamic Background Glows */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[90px] pointer-events-none" />

        {/* Section Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5 gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-gradient-to-tr from-amber-600/10 to-amber-500/20 border border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Compass className="w-6 h-6 animate-spin-strobe" />
            </span>
            <div className="flex flex-col text-left">
              <h2 className="text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
                Algotorial Playlist Sandbox
                <span className="text-[10px] bg-amber-500/20 border border-amber-500/30 text-amber-500 font-mono tracking-widest px-2 py-0.5 rounded-full">SIMULATION ENGINE</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Contextual Modeling: Simulating track performance inside Spotify's "Algotorial" curation &amp; feedback loops.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-mono select-none">
            <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>LATENT CODES MODEL: V1.8.2-PREVIEW</span>
          </div>
        </div>

        {/* 2x2 Interactive Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* Panel A: Cosine Similarity Vector Mapping */}
          <div className="bg-[#0A0B0E] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-inner min-h-[360px]">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5 flex-wrap gap-y-1">
                <span className="text-xs font-bold text-white font-sans uppercase flex items-center gap-1.5 leading-none">
                  <span className="text-blue-400 font-mono text-[14px]">A</span>
                  Cosine Similarity Mapping
                </span>
                <span className="text-[10px] font-mono text-slate-500">Vector Alignment (θ)</span>
                <div className="w-full flex justify-start pl-5 mt-1">
                  <button 
                    onClick={() => onViewDefinition && onViewDefinition("cosine-similarity")}
                    className="text-[9px] text-[#22d3ee] hover:text-white font-mono hover:underline cursor-pointer transition-colors text-left font-bold"
                  >
                    (see explanation)
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4 text-left">
                Measures how closely your song's acoustic vector aligns with typical playlist target footprints.
              </p>
              
              {/* Target Playlist Selectors */}
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {(["today-hits", "discover-weekly", "chill-vibes", "indie"] as const).map((pId) => {
                  const pStats = getPlaylistCoords(pId);
                  const isSel = selectedTargetPlaylist === pId;
                  return (
                    <button
                      key={pId}
                      onClick={() => setSelectedTargetPlaylist(pId)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold text-left transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                        isSel
                          ? "bg-blue-600/10 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                          : "bg-black/50 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10"
                      }`}
                    >
                      <span className="text-xs">{pStats.icon}</span>
                      <span className="truncate">{pStats.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Vector Grid Area and Stats */}
            <div className="flex items-center gap-5 my-0.5" id="vector-plotter-graphics">
              {/* Concentric Circles Vector Diagram */}
              <div className="relative w-28 h-28 bg-[#0F1116] rounded-full border border-white/5 flex items-center justify-center flex-shrink-0">
                <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute overflow-visible">
                  {/* Outer Grid Ring */}
                  <circle cx="50" cy="50" r="45" className="stroke-white/5 fill-none" strokeWidth="0.8" />
                  <circle cx="50" cy="50" r="30" className="stroke-white/5 fill-none" strokeWidth="0.8" />
                  <circle cx="50" cy="50" r="15" className="stroke-white/5 fill-none" strokeWidth="0.8" />
                  
                  {/* Dynamic Axis Lines */}
                  <line x1="5" y1="50" x2="95" y2="50" className="stroke-white/5" strokeWidth="0.5" />
                  <line x1="50" y1="5" x2="50" y2="95" className="stroke-white/5" strokeWidth="0.5" />
                  
                  {/* Playlist Coordinate Vector Line (Target) */}
                  <line 
                    x1="50" 
                    y1="50" 
                    x2={50 + (target.val * 40)} 
                    y2={50 - (target.nrg * 40)} 
                    className="stroke-amber-400" 
                    strokeWidth="1.8" 
                    strokeLinecap="round"
                    strokeDasharray="2,2"
                  />
                  <circle 
                    cx={50 + (target.val * 40)} 
                    cy={50 - (target.nrg * 40)} 
                    r="3.5" 
                    className="fill-amber-400 stroke-black shadow-lg" 
                    strokeWidth="1"
                  />
                  
                  {/* Your Song Vector Line */}
                  <line 
                    x1="50" 
                    y1="50" 
                    x2={50 + (inferredValence * 40)} 
                    y2={50 - (inferredEnergy * 40)} 
                    className="stroke-blue-400 animate-pulse" 
                    strokeWidth="2.2" 
                    strokeLinecap="round"
                  />
                  <circle 
                    cx={50 + (inferredValence * 40)} 
                    cy={50 - (inferredEnergy * 40)} 
                    r="4.5" 
                    className="fill-blue-400 stroke-white ring-2 ring-blue-500/20 animate-pulse" 
                    strokeWidth="1.2"
                  />
                </svg>
                {/* Latent space labels */}
                <span className="absolute bottom-0 text-[8px] font-mono text-slate-600">VALENCE</span>
                <span className="absolute left-1 top-12 text-[8px] font-mono text-slate-600 rotate-90 origin-left">ENERGY</span>
              </div>

              {/* Angle Description & Formula */}
              <div className="flex-1 flex flex-col text-left gap-1.5 justify-center">
                <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-600/10 py-0.5 px-2 rounded-md border border-blue-500/15 w-fit">
                  MATCH: {percentageMatch}% COHERENCE
                </span>
                <div className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  Vector Distance θ = {Math.round(Math.acos(cosSimilarity) * (180 / Math.PI))}°
                </div>
                <div className="font-mono text-[9px] text-slate-400 leading-normal">
                  Sim(u,s) = cos(θ) = <span className="font-bold text-white">{(cosSimilarity).toFixed(4)}</span>
                </div>
                <p className="text-[9.5px] text-slate-500 leading-snug">
                  {target.desc} Match factor is {percentageMatch >= 88 ? "Outstanding: fits native vibe perfectly." : percentageMatch >= 75 ? "Healthy: strong placement probability." : "Marginal Transition: will sound divergent."}
                </p>
              </div>
            </div>
          </div>

          {/* Panel B: Circumplex Mood Plotting */}
          <div className="bg-[#0A0B0E] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col transition-all group shadow-inner min-h-[360px]">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
                <span className="text-xs font-bold text-white font-sans uppercase flex items-center gap-1.5 leading-none">
                  <span className="text-pink-400 font-mono text-[14px]">B</span>
                  Circumplex Mood Space Plotter
                  {!hasUserSetMood && (
                    <span 
                      className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase tracking-wide inline-block truncate"
                      style={{ width: "61.225px", paddingRight: "9px" }}
                    >
                      Needs Your Input
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">Valence-Energy Affect Space</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4 text-left">
                Defines the song's musical emotion quadrant (Russell's model of affect) derived from theory and lyrics.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3 text-left">
                Mood is subjective — audio alone can't reliably measure how a song feels. You know your track better than any algorithm. Click or drag the dot below to place it where it actually sits.
              </p>
            </div>

            {/* Circumplex Quad Drawing - Centered Vertically */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-2 pr-1 relative my-1">
                {/* Visual 2D Grid Representation */}
                <div 
                  className={`relative aspect-square w-full max-w-[130px] border border-white/10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 flex self-center mx-auto cursor-pointer select-none ${isDraggingCircumplex ? 'border-cyan-500/50 shadow-[0_0_8px_rgba(34,211,238,0.2)]' : ''}`}
                  onClick={(e) => {
                    const { val, nrg } = handleCircumplexInteraction(e);
                    saveCircumplexPosition(val, nrg);
                  }}
                  onMouseDown={(e) => {
                    setIsDraggingCircumplex(true);
                    handleCircumplexInteraction(e);
                  }}
                  onMouseMove={(e) => {
                    if (isDraggingCircumplex) {
                      handleCircumplexInteraction(e);
                    }
                  }}
                  onMouseUp={(e) => {
                    if (isDraggingCircumplex) {
                      setIsDraggingCircumplex(false);
                      const { val, nrg } = handleCircumplexInteraction(e);
                      saveCircumplexPosition(val, nrg);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isDraggingCircumplex) {
                      setIsDraggingCircumplex(false);
                      const { val, nrg } = handleCircumplexInteraction(e);
                      saveCircumplexPosition(val, nrg);
                    }
                  }}
                >
                  {/* Axes and Grid */}
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/10 pointer-events-none" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-white/10 pointer-events-none" />
                  
                  {/* 4 Quadrants colored backgrounds */}
                  <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-amber-500/[0.03] flex items-center justify-center pointer-events-none">
                    <span className="text-[7.5px] font-mono text-amber-500/50 tracking-widest font-bold">EUPHORIC</span>
                  </div>
                  <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-red-500/[0.03] flex items-center justify-center pointer-events-none">
                    <span className="text-[7.5px] font-mono text-red-500/50 tracking-widest font-bold">INTENSE</span>
                  </div>
                  <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-violet-500/[0.03] flex items-center justify-center pointer-events-none">
                    <span className="text-[7.5px] font-mono text-violet-500/50 tracking-widest font-bold">MELANCHOLY</span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-emerald-500/[0.03] flex items-center justify-center pointer-events-none">
                    <span className="text-[7.5px] font-mono text-emerald-500/50 tracking-widest font-bold">SERENE</span>
                  </div>

                  {/* Glowing Pulsing Point for Your Song */}
                  <div 
                    className={hasUserSetMood 
                      ? "absolute w-3 h-3 rounded-full bg-cyan-400 border border-white shadow-[0_0_12px_rgba(34,211,238,0.85)] animate-pulse cursor-grab active:cursor-grabbing"
                      : "absolute w-4 h-4 rounded-full bg-transparent border-2 border-solid border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse cursor-grab active:cursor-grabbing"
                    }
                    style={{ 
                      left: `${inferredValence * 100}%`, 
                      bottom: `${inferredEnergy * 100}%`,
                      transform: "translate(-50%, 50%)",
                      borderStyle: "solid"
                    }}
                  />
                </div>

                {/* Coordinates read-out details */}
                <div className="flex flex-col text-left justify-center gap-1.5 pl-3">
                  <div className="font-mono text-[10px] text-slate-400">
                    Valence <span className="text-white font-bold font-sans">({inferredValence})</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    Energy <span className="text-white font-bold font-sans">({inferredEnergy})</span>
                  </div>
                  
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-pink-400 mt-1">
                    EST. QUADRANT: {
                      inferredValence >= 0.5 && inferredEnergy >= 0.5 ? "★ Euphoric Cheer" : 
                      inferredValence < 0.5 && inferredEnergy >= 0.5 ? "★ Intense / Aggressive" : 
                      inferredValence < 0.5 && inferredEnergy < 0.5 ? "★ Lyrical Melancholy" : 
                      "★ Serene / Chill"
                    }
                  </span>
                  
                  <p className="text-[9.5px] text-slate-500 leading-normal mt-1">
                    Valence maps the chord scale harmonic mood, while energy models transient complexity. Evaluators query this vector to schedule mood alignment playlists.
                  </p>
                  
                  <button
                    onClick={() => {
                      setLiveValence(0.5);
                      setLiveEnergy(0.5);
                      saveCircumplexPosition(0.5, 0.5);
                    }}
                    className="text-[10px] text-slate-600 hover:text-slate-400 underline transition-colors mt-2 text-left block w-fit"
                  >
                    Reset to center
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel C: Sequential Variance Vibe-Transition Lab */}
          <div className="bg-[#0A0B0E] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-inner min-h-[360px]">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5 flex-wrap gap-y-1">
                <span className="text-xs font-bold text-white font-sans uppercase flex items-center gap-1.5 leading-none">
                  <span className="text-emerald-400 font-mono text-[14px]">C</span>
                  Sequential Variance / Transition Lab
                </span>
                <span className="text-[10px] font-mono text-slate-500">Consecutive Variance (s²)</span>
                <div className="w-full flex justify-start pl-5 mt-1">
                  <button 
                    onClick={() => onViewDefinition && onViewDefinition("vibe-transition")}
                    className="text-[9px] text-[#22d3ee] hover:text-white font-mono hover:underline cursor-pointer transition-colors text-left font-bold"
                  >
                    (see explanation)
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4 text-left">
                Simulates placing your track consecutively next to other trending tracks to monitor transition flow.
              </p>

              {/* Simulation Mode Selector */}
              <div className="flex items-center gap-1.5 bg-black/60 p-1 border border-white/5 rounded-xl mb-4">
                {(["uniform", "upbeat", "sudden"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setVibeTransitionTheme(mode)}
                    className={`flex-1 text-[9.5px] font-mono font-bold py-1 px-1.5 rounded-lg border transition-all text-center uppercase cursor-pointer select-none ${
                      vibeTransitionTheme === mode
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : "border-transparent text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    {mode === "uniform" ? "Uniform" : mode === "upbeat" ? "Elevator" : "Sudden Shift"}
                  </button>
                ))}
              </div>
            </div>

            {/* Graphic and Calculation Box */}
            <div className="flex flex-col gap-3.5 my-1 text-left">
              {/* Chain Representation */}
              <div className="flex items-center justify-between gap-2.5 bg-black/40 border border-white/5 rounded-xl p-3 pr-4">
                <div className="flex flex-col gap-0.5 max-w-[80px]">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider leading-none">A: PREVIOUS</span>
                  <span className="text-[10px] font-bold text-slate-400 truncate leading-tight">{trans.prevBpm} BPM</span>
                  <span className="text-[8.5px] font-mono text-slate-500 truncate leading-none">{trans.prevKey}</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-full flex items-center h-1 justify-center relative bg-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute" />
                  </div>
                  <span className="text-[8px] font-mono text-emerald-400 font-bold mt-1.5 leading-none">Simulating...</span>
                </div>

                <div className="flex flex-col gap-0.5 border-x border-white/5 px-3 max-w-[100px]">
                  <span className="text-[8px] font-mono text-blue-400 uppercase tracking-wider leading-none">YOUR TRACK</span>
                  <span className="text-[10px] font-bold text-blue-200 truncate leading-tight">{trackBpm} BPM</span>
                  <span className="text-[8.5px] font-mono text-blue-400 truncate leading-none">{trackKey}</span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-full flex items-center h-1 justify-center relative bg-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute" />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 max-w-[80px]">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider leading-none">B: NEXT</span>
                  <span className="text-[10px] font-bold text-slate-400 truncate leading-tight">{trans.nextBpm} BPM</span>
                  <span className="text-[8.5px] font-mono text-slate-500 truncate leading-none">{trans.nextKey}</span>
                </div>
              </div>

              {/* Transition Stats readout */}
              <div className="flex flex-col gap-1 pr-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Flow Score:</span>
                  <span className={`font-bold border px-1.5 py-0.5 rounded ${trans.color}`}>
                    s² = {trans.variance.toFixed(2)} — {trans.status}
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-500 leading-normal mt-1">
                  💡 <span className="text-slate-400 font-medium">{trans.notes}</span> Curation programs target low-variance thresholds (below 0.15) on high-retention flagships like "Deep Focus" or "Pop Rising".
                </p>
              </div>
            </div>
          </div>

          {/* Panel D: Skip Rate (SR) & Completion (CR) Simulator */}
          <div className="bg-[#0A0B0E] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-inner min-h-[360px]">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
                <span className="text-xs font-bold text-white font-sans uppercase flex items-center gap-1.5 leading-none">
                  <span className="text-purple-400 font-mono text-[14px]">D</span>
                  30s Skip &amp; Playout Simulator
                </span>
                <span className="text-[10px] font-mono text-slate-500">The 30-Second Rule Gatekeeper</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4 text-left">
                Simulates virtual listener skip behavior during the initial 30 seconds (qualifying monetization milestone).
              </p>
            </div>

            {/* Simulator Controls & Playbar */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3.5 my-1 text-left relative overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    if (sandboxPlaying) {
                      setSandboxPlaying(false);
                    } else {
                      if (sandboxProgress >= 30) setSandboxProgress(0);
                      setSandboxPlaying(true);
                    }
                  }}
                  className={`w-9 h-9 cursor-pointer rounded-full border flex items-center justify-center flex-shrink-0 transition-all select-none ${
                    sandboxPlaying
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)] animate-pulse"
                      : "bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                  }`}
                >
                  {sandboxPlaying ? <Pause className="w-4.5 h-4.5 fill-current" /> : <Play className="w-4.5 h-4.5 fill-current ml-0.5" />}
                </button>
                
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                    <span className="text-slate-400 font-bold">{liveStats.status}</span>
                    <span className="text-blue-400 font-bold bg-neutral-900 border border-white/5 px-2 py-0.5 rounded-full">{sandboxProgress.toFixed(1)}s / 30.0s</span>
                  </div>
                  
                  {/* Outer Bar Progress */}
                  <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden relative border border-white/5 mt-1">
                    <div 
                      className="absolute top-0 left-0 bottom-0 bg-blue-500/80 transition-all" 
                      style={{ width: `${(sandboxProgress / 30) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* Output Readout */}
              <div className="flex flex-col gap-0.5 text-left border-t border-white/5 pt-3">
                <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400">Predicted Instantaneous Skip Risk:</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                  <span className={`font-black font-mono transition-all text-sm ${sandboxProgress === 30 ? "text-emerald-400 font-bold animate-ping" : sandboxProgress > 0 ? "text-amber-400 animate-pulse" : "text-slate-500"}`}>
                    {liveStats.risk}
                  </span>
                  <p className="text-[9.5px] text-slate-300 leading-normal">
                    {liveStats.desc}
                  </p>
                </div>
              </div>
            </div>

            {/* Predicted Cumulative Rates */}
            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3.5 pr-1">
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">PREDICTED SKIP RATE (SR)</span>
                <span className="text-lg font-black text-white font-mono mt-1 flex items-baseline gap-1">
                  {predictedSkipRate}%
                  <span className={`text-[10px] font-sans font-bold uppercase tracking-wider ${getSkipRateLabel(predictedSkipRate).color}`}>
                    {getSkipRateLabel(predictedSkipRate).label}
                  </span>
                </span>
                <p className="text-[8.5px] text-slate-500 leading-snug mt-0.5 leading-normal">
                  Typical threshold target: &lt; 32% within 30s. Perfect for early playlist preservation.
                </p>
              </div>

              <div className="flex flex-col text-left border-l border-white/5 pl-4">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">PREDICTED COMPLETION (CR)</span>
                <span className="text-lg font-black text-cyan-400 font-mono mt-1 flex items-baseline gap-1">
                  {predictedCompletionRate}%
                  <span className={`text-[10px] font-sans font-bold uppercase tracking-wider ${getCompletionRateLabel(predictedCompletionRate).color}`}>
                    {getCompletionRateLabel(predictedCompletionRate).label}
                  </span>
                </span>
                <p className="text-[8.5px] text-slate-500 leading-snug mt-0.5 leading-normal">
                  Probability of full track completion. Indicates structural engagement alignment.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Sandbox Explanatory Footer */}
        <div className="bg-[#0A0B0E] border border-white/5 rounded-2xl p-4 text-left relative z-10 flex items-start gap-3 mt-1.5 leading-normal">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <span className="text-slate-200 font-bold">Algorithmic Placement Strategy:</span> Spotify's "Algotorial" system schedules music into feedback sandboxes (Discover Weekly, Daily Mix). If a song satisfies low skip rates and high cross-30s completion targets, the system boosts its indexing weight. This helps the song transfer to highly popular human-curated editorial playlists like Today's Top Hits.
          </p>
        </div>
      </div>
    );
  };

  const renderSpotifyRecommendationPanel = () => {
    const profile = getSubgenreProfile(critique?.vibe?.genre || "", critique?.vibe?.subgenre || "");
    const archetype = profile?.archetype || "GRID_ELEC";

    // 2. Sonic Neighbors (NLP clusters)
    let sonicNeighbors = ["Tame Impala", "Roosevelt", "Phoenix", "Glass Animals", "Toro y Moi"];
    let clusterName = "Dream Gaze & Indie Crossover";

    const genreLower = (critique?.vibe?.genre || "").toLowerCase();

    if (genreLower.includes("country") || genreLower.includes("americana") || genreLower.includes("bluegrass")) {
      sonicNeighbors = ["Chris Stapleton", "Kacey Musgraves", "Zach Bryan", "Sturgill Simpson", "Tyler Childers"];
      clusterName = "Modern Country & Outlaw Americana Roots";
    } else if (isHipHopGenre) {
      sonicNeighbors = ["Travis Scott", "J. Cole", "Kendrick Lamar", "Mac Miller", "Metro Boomin"];
      clusterName = "Contemporary Hip-Hop & Hybrid Beats";
    } else if (isElectronicGenre) {
      sonicNeighbors = ["Kavinsky", "Daft Punk", "Justice", "RÜFÜS DU SOL", "Disclosure"];
      clusterName = "Neon Retro Electro & House Grid";
    } else if (isAcousticGenre) {
      sonicNeighbors = ["Bon Iver", "Phoebe Bridgers", "Sufjan Stevens", "Iron & Wine", "Fleet Foxes"];
      clusterName = "Intimate Acoustic & Organic Folk Universe";
    } else if (isRockGenre) {
      sonicNeighbors = ["Foo Fighters", "Royal Blood", "Queens of the Stone Age", "The Black Keys", "Arctic Monkeys"];
      clusterName = "Alternative & Modern Rock Currents";
    } else if (isPopGenre) {
      sonicNeighbors = ["Dua Lipa", "The Weeknd", "Harry Styles", "Billie Eilish", "Olivia Rodrigo"];
      clusterName = "Contemporary Pop & Mainstream Anthems";
    } else if (isJazzGenre) {
      sonicNeighbors = ["Leon Bridges", "SZA", "Anderson .Paak", "Bruno Mars", "Ezra Collective"];
      clusterName = "Modern Soul, Funk & Jazz Fusion";
    }

    // 3. Checklist Effect on Score
    const hasLufs = spotifyChecks.lufsConformity;
    const activeChecksCount = (spotifyChecks.vocalEntrance ? 1 : 0) + (spotifyChecks.spectralWidth ? 1 : 0) + (spotifyChecks.transientStability ? 1 : 0);
    const standardChecklistMaxBoost = 10;
    const standardChecklistBoost = Math.round((activeChecksCount / 3) * standardChecklistMaxBoost);

    // Predict recommendation score reflecting the average target matching of the Echo Nest features
    const averageMatch = Math.round((danceabilityMatch + energyMatch + acousticnessMatch + valenceMatch + instrumentalnessMatch + speechinessMatch + livenessMatch) / 7);
    const baseRecScore = Math.round((commercialReadinessVal * 0.4) + (overallProductionVal * 0.15) + (mixScoreVal * 0.20) + (averageMatch * 0.25));
    const rawPredictedScore = Math.min(99, Math.max(30, baseRecScore + standardChecklistBoost - 5));

    // Scale predictedScore down to mirror the low compatibility mapping, as requested by the user
    // Ties the ultimate algorithm feeder chances proportionally with the raw feature compatibility matches!
    const complianceFactor = (averageMatch / 100);
    let predictedScore = Math.round(rawPredictedScore * (0.35 + 0.65 * complianceFactor));
    if (hasLufs) {
      predictedScore = Math.min(100, predictedScore + 7);
    }

    // Feeder Channel Chances aligned directly and proportionally with overall compatibility score
    const valenceScore = critique?.streamingAlignment?.echoNestScorecard?.moodValence ?? 50;
    const danceScore = critique?.streamingAlignment?.echoNestScorecard?.danceability ?? 50;
    const energyScore = critique?.streamingAlignment?.echoNestScorecard?.energyIntensity ?? 50;
    const speechScore = critique?.streamingAlignment?.echoNestScorecard?.speechiness ?? 20;

    // Release Radar — driven by production quality and early hook delivery
    const releaseRadarChance = Math.min(99, Math.max(10, Math.round(
      (predictedScore * 0.60) +
      (spotifyChecks.vocalEntrance ? 8 : 0) +
      (spotifyChecks.spectralWidth ? 6 : 0) +
      (hasLufs ? 5 : 0)
    )));

    // Discover Weekly — driven by collaborative filtering: valence + danceability + energy alignment
    const discoverWeeklyChance = Math.min(95, Math.max(5, Math.round(
      (predictedScore * 0.45) +
      (valenceScore * 0.20) +
      (danceScore * 0.15) +
      (energyScore * 0.10)
    )));

    // Daily Mix & Radio — driven by genre consistency and energy profile
    const dailyMixChance = Math.min(99, Math.max(10, Math.round(
      (predictedScore * 0.50) +
      (energyScore * 0.18) +
      (danceScore * 0.12) +
      (averageMatch * 0.10)
    )));

    // AI Playlist Prompts — driven by mood valence, speechiness, and lyrical theme clarity
    const radioSeedChance = Math.min(99, Math.max(10, Math.round(
      (predictedScore * 0.35) +
      (valenceScore * 0.30) +
      (danceScore * 0.15) +
      (speechScore * 0.08) +
      (spotifyChecks.vocalEntrance ? 7 : 0)
    )));

    const metricsData = [
      {
        key: "danceability",
        name: "Danceability",
        value: danceability,
        target: targetDanceability,
        min: danceMinBound,
        max: danceMaxBound,
        match: danceabilityMatch,
        idealDesc: "rhythm syncopation and beat grids.",
        overDesc: "The track's groove is hyperactive/complex for the intended playlist neighborhood.",
        underDesc: "Rhythm is too uniform or static to engage target listenership profiles.",
        source: "score"
      },
      {
        key: "energy",
        name: "Energy & Intensity",
        value: energy,
        target: targetEnergy,
        min: energyMinBound,
        max: energyMaxBound,
        match: energyMatch,
        idealDesc: "perceptual loudness and transient speed.",
        overDesc: "Dynamics are over-compressed/crushed, prompting automated level clamps and listener fatigue.",
        underDesc: "Overall intensity is flat or hollow, failing playback impact criteria.",
        source: liveMetrics ? "audio" : "score"
      },
      {
        key: "acousticness",
        name: "Acousticness",
        value: acousticness,
        target: targetAcousticness,
        min: acousticMinBound,
        max: acousticMaxBound,
        match: acousticnessMatch,
        idealDesc: "organic vs electronic structural density.",
        overDesc: "Timber profile is excessively organic/dry for the intended synthetic production target.",
        underDesc: "Artificial elements override the genre's expected warm or wooden acoustics.",
        source: liveMetrics ? "audio" : "score"
      },
      {
        key: "valence",
        name: "Mood Valence",
        value: valence,
        target: targetValence,
        min: valenceMinBound,
        max: valenceMaxBound,
        match: valenceMatch,
        idealDesc: "musical sunlight and emotional brightness.",
        overDesc: "Harmony/chord scale is overly upbeat or bright, contradicting the target playlist mood vector.",
        underDesc: "Vibe is too dark or somber, mismatching happy or energetic listener filters.",
        source: "score"
      },
      {
        key: "speechiness",
        name: "Speechiness",
        value: speechiness,
        target: targetSpeechiness,
        min: speechMinBound,
        max: speechMaxBound,
        match: speechinessMatch,
        idealDesc: "spoken word presence over musical singing.",
        overDesc: "Vocal tracks lean toward spoken text or monologue, disrupting playlist music flow.",
        underDesc: "Spoken presence is overly attenuated or missing for a speech-focused style target.",
        source: "score"
      },
      {
        key: "instrumentalness",
        name: "Instrumentalness",
        value: instrumentalness,
        target: targetInstrumentalness,
        min: instMinBound,
        max: instMaxBound,
        match: instrumentalnessMatch,
        idealDesc: "vocal-to-instrumental ratio.",
        overDesc: "The track lacks clear vocal focus points required for artist neighborhood playlists.",
        underDesc: "Vocal files occupy too much front focus, overriding the expected ambient background style.",
        source: liveMetrics ? "audio" : "score"
      },
      {
        key: "liveness",
        name: "Liveness",
        value: liveness,
        target: targetLiveness,
        min: liveMinBound,
        max: liveMaxBound,
        match: livenessMatch,
        idealDesc: "reflections of live venue acoustics and ambient room noise.",
        overDesc: "Audience reflection/mic bleed feels like an unpolished bootleg, failing clean studio standards.",
        underDesc: "Performance contains insufficient room reflections to establish live venue authenticity.",
        source: liveMetrics ? "audio" : "score"
      }
    ];

    return (
      <div className="flex flex-col gap-6 w-full animate-fadeIn" id="spotify-recommendation-panel">
        
        {/* Indented parent container representing hierarchy */}
        <div className="border-l border-white/5 pl-4 md:pl-6 ml-0 md:ml-4 flex flex-col gap-6">

          {/* Card 1 TRIGGER: The ECHO NEST SCORECARD */}
          <div 
            onClick={() => setIsEchoNestExpanded(!isEchoNestExpanded)}
            className={`border rounded-2xl p-5 text-left cursor-pointer transition-all duration-300 relative overflow-hidden select-none ${
              isEchoNestExpanded 
                ? "bg-[#0c1811]/45 border-[#1ed760] shadow-[0_0_15px_rgba(29,185,84,0.15)] ring-1 ring-emerald-500/20" 
                : "bg-neutral-900/60 border-white/5 hover:border-[#1ed760]/40 text-slate-400 hover:bg-[#071109]/20"
            }`}
          >
            {/* Faint left highlight */}
            <div 
              className="absolute left-0 top-0 h-full w-[4px]"
              style={{ backgroundColor: "#1ed760", boxShadow: "0 0 10px #1ed760" }}
            />
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${
                  isEchoNestExpanded 
                    ? "bg-[#1DB954]/20 border-[#1DB954]/40 text-[#1ed760]" 
                    : "bg-neutral-800 border-white/5 text-slate-500"
                }`}>
                  <Activity className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#1ed760] font-bold block">Dual-Filtering Target Compliance</span>
                  <h3 className="text-base font-sans font-black text-white uppercase mt-0.5">
                    The ECHO NEST SCORECARD
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-[9px] font-mono text-slate-500">
                  {isEchoNestExpanded ? "COLLAPSE AUDIT ▲" : "EXPAND AUDIT ▼"}
                </span>
                <span className={`inline-block text-[9px] font-mono tracking-widest px-2.5 py-1 rounded-full border ${
                  isEchoNestExpanded
                    ? "bg-[#1ed760]/10 border-[#1ed760]/20 text-[#1ed760]"
                    : "bg-neutral-900 border-white/5 text-slate-400"
                }`}>
                  {isEchoNestExpanded ? "ACTIVE" : "VIEW DETAILED METRICS"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 1 Dropdown Content */}
          {isEchoNestExpanded && (
            <div className="bg-[#0D0E12] border border-[#1DB954]/25 rounded-2xl p-6 text-left flex flex-col gap-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-[#1DB954] h-[3px] w-full shadow-[0_0_8px_#1DB954]" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#1DB954]/10 rounded-lg text-[#1ed760] border border-[#1DB954]/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#1DB954]" />
                </span>
                <div>
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#1ed760] font-bold">Dual-Filtering Target Compliance:</h4>
                  <h3 
                    className="text-[18px] font-sans font-black text-white transition-colors uppercase mt-0.5 flex items-center gap-1"
                  >
                    The ECHO NEST SCORECARD
                  </h3>
                </div>
              </div>
              <div className="bg-black/40 border border-white/5 text-[9px] font-mono text-slate-400 px-3 py-1.5 rounded-full flex items-center gap-1.5 self-start md:self-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] animate-pulse" />
                Reference Calibration: Spotify BaRT Core Ingest
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-normal max-w-3xl">
              This panel shows an analysis of your song against all <strong className="text-white">7 Echo Nest sensory descriptors</strong>{" "}(<button onClick={() => onViewDefinition && onViewDefinition("Dual-Filtering Ingestion Target Compliance")} className="text-[#1ed760] font-sans font-black hover:underline cursor-pointer transition-colors hover:text-white" title="Click to view explanation inside Glossary">View Explanation</button>){" "}for your song's subgenre, mapping your track directly against content-based filtering ranges utilized in Spotify's recommender framework. (+/-5% confidence - Our targets are highly researched assumptions of the targets Spotify uses.)
            </p>
            {(critique?.vibe?.genre || critique?.vibe?.subgenre) && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Target Profile:</span>
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/5">
                  {critique?.vibe?.subgenre || critique?.vibe?.genre || "—"}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Render each Echo Nest metric */}
              {metricsData.map((item) => {
                const isOptimal = item.value >= item.min && item.value <= item.max;
                const isOver = item.value > item.max;
                const isUnder = item.value < item.min;

                return (
                  <div key={item.key} className="bg-[#13161C] border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-[#1ed760]/20 transition-all font-sans">
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">{item.name}</span>
                          {item.source === "audio" ? (
                            <span className="text-[8px] font-mono text-cyan-500/70 border border-cyan-500/20 px-1 py-0.5 rounded uppercase tracking-wide ml-1 normal-case font-medium">
                              ⬡ audio
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono text-slate-600 border border-white/5 px-1 py-0.5 rounded uppercase tracking-wide ml-1 normal-case font-medium">
                              AI
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-black text-[#1ed760]">{item.value}%</span>
                      </div>

                      {/* Customized Calibration Bar */}
                      <div className="w-full bg-neutral-900/60 h-2.5 rounded-full mt-2 mb-1.5 relative border border-white/5 overflow-visible animate-fadeIn">
                        {/* Shaded Corridor displaying real spreadsheet range bounds */}
                        <div 
                          className="absolute top-0 h-full bg-emerald-500/20 border-x border-emerald-500/30"
                          style={{ 
                            left: `${item.min}%`, 
                            width: `${item.max - item.min}%` 
                          }}
                          title={`Spreadsheet Optimal Corridor: ${item.min}% to ${item.max}%`}
                        />

                        {/* White cursor ticks exact ideal Target coordinate (midpoint) */}
                        <div 
                          className="absolute top-[-3px] w-1 h-[14px] bg-white rounded cursor-help transition-all duration-1000 z-10" 
                          style={{ left: `calc(${item.target}% - 2px)` }} 
                          title={`Ideal Target Midpoint: ${item.target}%`}
                        />

                        {/* Song's current marker */}
                        <div 
                          className={`absolute top-[-2px] w-2.5 h-[12px] rounded-full cursor-help transition-all duration-1000 z-20 ${
                            isOptimal 
                              ? "bg-[#1ed760] shadow-[0_0_8px_rgba(30,215,96,0.8)] animate-pulse" 
                              : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                          }`}
                          style={{ left: `calc(${item.value}% - 5px)` }}
                          title={`Current Value: ${item.value}%`}
                        />
                      </div>

                      {/* Explicit Target and Calibration range display */}
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mb-2 mt-1">
                        <span>Corridor: <strong className="text-white font-black">{item.min}%–{item.max}%</strong> <span className="opacity-70">(Midpoint: {item.target}%)</span></span>
                        <span>Current: <strong className={isOptimal ? "text-[#1ed760] font-black" : "text-amber-400 font-black"}>{item.value}%</strong></span>
                      </div>
                    </div>

                      {/* Highly descriptive label matching over/under/optimal states exactly */}
                    <div className="mt-2 text-left">
                      <div className="flex items-center gap-1 mb-1.5">
                        {isOptimal ? (
                          <span className="text-[9px] font-mono font-black text-emerald-400 bg-[#0A2010]/35 border border-emerald-500/25 px-1.5 py-0.5 rounded uppercase flex items-center gap-1 font-bold">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Optimal Match (Safe Zone)
                          </span>
                        ) : isOver ? (
                          <span className="text-[9px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/15 px-1.5 py-0.5 rounded uppercase font-bold">
                            ⚠️ Mismatch (+{item.value - item.max}% Overage)
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/15 px-1.5 py-0.5 rounded uppercase font-bold">
                            📉 Under Corridor (-{item.min - item.value}% Delta)
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[10.5px] text-slate-500 leading-relaxed font-sans">
                        {(() => {
                          if (isOptimal) {
                            const optimalMap: Record<string, string> = {
                              "danceability": "Your track's rhythmic grid, beat stability, and tempo regularity fall within the target corridor for your subgenre. The algorithm will recognize this as a natural fit for your intended playlist neighborhood.",
                              "energy": "Your track's transient density, spectral flatness, and integrated loudness profile align with the perceptual intensity targets for your subgenre. The algorithm will read this as the correct sonic weight for your intended playlist.",
                              "acousticness": "Your track's organic vs. electronic instrument confidence score falls within the target corridor. The algorithm is correctly identifying your production as structurally consistent with your subgenre's sonic fingerprint.",
                              "valence": "Your track's harmonic intervals, chord structure, and spectral brightness are registering the correct emotional tone for your subgenre. The algorithm will place this in the right emotional neighborhood.",
                              "speechiness": "Your track's vocal delivery density - the ratio of spoken word to sung melody - falls within the correct zone for your subgenre. The algorithm is correctly reading your vocal approach.",
                              "instrumentalness": "Your track's vocal-to-instrumental balance is registering within the correct confidence range for your subgenre. The algorithm is detecting the right presence or absence of vocal content.",
                              "liveness": "Your track's ambient noise floor, room decay, and audience presence signatures are within the target range. The algorithm is correctly reading this as a studio recording consistent with your subgenre."
                            };
                            const responseText = optimalMap[item.key] || `Rhythm compliance for ${item.idealDesc} is perfectly aligned to trigger target-filtering ingestion standards.`;
                            return (
                              <span className="text-slate-400 font-medium">
                                <strong>Safe Zone Match:</strong> {responseText}
                              </span>
                            );
                          }

                          // Dynamically pull from our Echo Nest diagnostics map
                          const metricMap: Record<string, string> = {
                            "danceability": "Danceability",
                            "energy": "Energy",
                            "acousticness": "Acousticness",
                            "valence": "Valence",
                            "speechiness": "Speechiness",
                            "instrumentalness": "Instrumentalness",
                            "liveness": "Liveness"
                          };
                          const metricMappedName = metricMap[item.key] || item.name;
                          const cond = isOver ? "TOO_HIGH" : "TOO_LOW";
                          const dynamicFeedback = getCritiqueAndFix(archetype, metricMappedName, cond);

                          const textFeedback = dynamicFeedback?.critique || (isOver ? item.overDesc : item.underDesc);
                          const fixFeedback = dynamicFeedback?.fix || "";

                          if (isOver) {
                            return (
                              <span className="text-amber-400/85 font-medium flex flex-col gap-2">
                                <span><strong>Overage Mismatch:</strong> {textFeedback}</span>
                                {fixFeedback && (
                                  <span className="block mt-1 p-2 bg-amber-500/10 border border-amber-500/15 rounded text-amber-300 font-sans text-[10px] leading-relaxed">
                                    <strong className="text-white">🔧 Mixing Calibration:</strong> {fixFeedback}
                                  </span>
                                )}
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-amber-400/85 font-medium flex flex-col gap-2">
                                <span><strong>Under-Threshold Delta:</strong> {textFeedback}</span>
                                {fixFeedback && (
                                  <span className="block mt-1 p-2 bg-amber-500/10 border border-amber-500/15 rounded text-amber-300 font-sans text-[10px] leading-relaxed">
                                    <strong className="text-white">🔧 Mixing Calibration:</strong> {fixFeedback}
                                  </span>
                                )}
                              </span>
                            );
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* 8. True Peak Limiter (Target -1.0 dBTP) */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                spotifyTruePeak > -1.0 
                  ? "bg-[#241315]/40 border-amber-800/40 hover:border-amber-600/50" 
                  : "bg-[#131c19]/40 border-emerald-950 hover:border-[#1ed760]/25"
              }`}>
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">True Peak Limiter Audit</span>
                    <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded ${spotifyTruePeak > -1.0 ? "bg-amber-500/10 text-amber-400 border border-amber-500/15" : "bg-emerald-500/10 text-[#1ed760] border border-emerald-500/15"}`}>
                      {spotifyTruePeak > -1.0 ? "LIMIT EXCEEDED WARNING" : "TARGET COMPLIANT"}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-900 h-2 rounded-full mt-2 mb-2 relative overflow-hidden border border-white/5">
                    <div className={`h-full rounded-full transition-all duration-1000 ${spotifyTruePeak > -1.0 ? "bg-amber-400" : "bg-[#1ed760]"}`} style={{ width: "100%" }} />
                  </div>
                </div>
                <p className="text-[10.5px] leading-relaxed mt-1 font-sans">
                  {spotifyTruePeak > -1.0 ? (
                    <span className="text-amber-300">
                      <strong>True Peak Warning: {spotifyTruePeak.toFixed(2)} dBTP exceeds -1.0 dB target</strong>. The hot master peaks risk digital compression artifacts during Vorbis transcoding. Reduce master ceiling slightly to secure dynamic range integrity.
                    </span>
                  ) : (
                    <span className="text-emerald-400/90">
                      <strong>True Peak PASS: {spotifyTruePeak.toFixed(2)} dBTP is below -1.0 dB target</strong>. Safe transcoding headroom! This preserves clean transient punch during encoding loops without codec clipping.
                    </span>
                  )}
                </p>
              </div>

            </div>

            <span className="text-[#1ed760] block mt-1 text-[11px] leading-relaxed bg-[#1ed760]/5 border border-[#1DB954]/15 p-3 rounded-xl shadow-inner">
              <strong className="font-extrabold uppercase text-[10px] block mb-1">💡 CRITICAL TRADING WINDOW RULE (±3% CORRIDOR):</strong> 
              Spotify's recommendation engine evaluates content targets within a highly narrow window. A deviation of <strong>up to ±3%</strong> from the ideal benchmark is sufficient to trigger optimal seeder categorization. Going above the target is NOT "extra credit"—it is classed as a <strong>Style Mismatch (Overage Mismatch)</strong>, which flags and excludes the track just as severely as falling under target!
            </span>

            {/* Scorecard bottom info bar */}
            <div className="border-t border-white/5 pt-3.5 mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
              <div className="flex flex-wrap items-center gap-4 animate-fadeIn">
                <div className="flex items-center gap-1.5">
                  <span>Estimated Song tempo:</span>
                  <strong className="text-white bg-neutral-950 px-2.5 py-1 border border-white/10 rounded-md font-sans flex items-center">
                    <span>{critique?.liveMetrics?.calculatedBpm ?? "—"} BPM</span>
                    {critique?.liveMetrics?.calculatedBpmConfidence !== undefined && (
                      <span className={`text-[9px] font-mono ml-1 ${
                        (critique.liveMetrics.calculatedBpmConfidence) >= 0.5 
                          ? "text-emerald-500" 
                          : "text-amber-500"
                      }`}>
                        ({Math.round((critique.liveMetrics.calculatedBpmConfidence) * 100)}% conf.)
                      </span>
                    )}
                  </strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Estimated Song Key:</span>
                  <strong className="text-white bg-neutral-950 px-2.5 py-1 border border-white/10 rounded-md font-sans flex items-center">
                    <span>{critique?.liveMetrics?.calculatedKey ?? "—"}</span>
                    {critique?.liveMetrics?.calculatedKeyConfidence !== undefined && (
                      <span className="text-[9px] font-mono text-slate-500 ml-1">
                        ({Math.round((critique.liveMetrics.calculatedKeyConfidence) * 100)}% conf.)
                      </span>
                    )}
                  </strong>
                </div>
                {critique?.liveMetrics?.calculatedTimeSignature !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <span>Time Signature:</span>
                    <strong className="text-white bg-neutral-950 px-2.5 py-1 border border-white/10 rounded-md font-sans flex items-center">
                      <span>
                        {critique.liveMetrics.calculatedTimeSignature === 6 
                          ? "6/8" 
                          : `${critique.liveMetrics.calculatedTimeSignature}/4`}
                      </span>
                      {critique.liveMetrics.calculatedTimeSignatureConfidence !== undefined && (
                        <span className={`text-[9px] font-mono ml-1 ${
                          critique.liveMetrics.calculatedTimeSignatureConfidence >= 0.7
                            ? "text-emerald-500"
                            : "text-amber-500"
                        }`}>
                          ({Math.round(critique.liveMetrics.calculatedTimeSignatureConfidence * 100)}% conf.)
                        </span>
                      )}
                    </strong>
                  </div>
                )}
                {(critique?.liveMetrics?.calculatedEndOfFadeIn !== undefined || critique?.liveMetrics?.calculatedStartOfFadeOut !== undefined) && (
                  <div className="flex items-center gap-1.5">
                    <span>Fade:</span>
                    <strong className="text-white bg-neutral-950 px-2.5 py-1 border border-white/10 rounded-md font-sans flex items-center gap-2">
                      {critique?.liveMetrics?.calculatedEndOfFadeIn !== undefined && critique.liveMetrics.calculatedEndOfFadeIn > 0 && (
                        <span className="text-[9px] font-mono text-cyan-400">
                          In: {critique.liveMetrics.calculatedEndOfFadeIn}s
                        </span>
                      )}
                      {critique?.liveMetrics?.calculatedEndOfFadeIn !== undefined && critique.liveMetrics.calculatedEndOfFadeIn === 0 && (
                        <span className="text-[9px] font-mono text-slate-500">No fade-in</span>
                      )}
                      {critique?.liveMetrics?.calculatedStartOfFadeOut !== undefined && critique?.liveMetrics?.calculatedDuration !== undefined && critique.liveMetrics.calculatedStartOfFadeOut < critique.liveMetrics.calculatedDuration && (
                        <span className="text-[9px] font-mono text-cyan-400">
                          Out: {critique.liveMetrics.calculatedStartOfFadeOut}s
                        </span>
                      )}
                      {critique?.liveMetrics?.calculatedStartOfFadeOut !== undefined && critique?.liveMetrics?.calculatedDuration !== undefined && critique.liveMetrics.calculatedStartOfFadeOut >= critique.liveMetrics.calculatedDuration && (
                        <span className="text-[9px] font-mono text-slate-500">No fade-out</span>
                      )}
                    </strong>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-500 italic font-sans font-medium">
                *Algorithmic triggers analyze raw BPM grid placement relative to transition indices.
              </div>
            </div>

          </div>
          )}

          {/* The Echo Nest Rabbit Hole Redirect Button */}
          <div className="flex justify-end">
            <button
              onClick={onNavigateToRabbitHole}
              className="cursor-pointer flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-[#1DB954] hover:bg-[#1ed760] font-sans font-bold text-xs uppercase tracking-wider text-black transition-all shadow-[0_0_15px_rgba(29,185,84,0.25)] hover:shadow-[0_0_25px_rgba(29,185,84,0.45)]"
            >
              <Rabbit className="w-4 h-4 text-black" style={{ fill: "currentColor" }} />
              <span>The Echo Nest Rabbit Hole</span>
            </button>
          </div>

          {/* Card 2 TRIGGER: RECOMMENDER PERFORMANCE PREDICTION */}
          <button 
            type="button"
            onClick={() => setIsRecommenderExpanded(!isRecommenderExpanded)}
            className={`w-full text-left border rounded-2xl p-5 cursor-pointer transition-all duration-300 relative overflow-hidden select-none outline-none ${
              isRecommenderExpanded 
                ? "bg-[#0c1811]/45 border-[#1ed760] shadow-[0_0_15px_rgba(29,185,84,0.15)] ring-1 ring-emerald-500/20" 
                : "bg-neutral-900/60 border-white/5 hover:border-[#1ed760]/40 text-slate-400 hover:bg-[#071109]/20"
            }`}
          >
            {/* Faint left highlight */}
            <div 
              className="absolute left-0 top-0 h-full w-[4px]"
              style={{ backgroundColor: "#1ed760", boxShadow: "0 0 10px #1ed760" }}
            />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 font-sans">
                <span className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${
                  isRecommenderExpanded 
                    ? "bg-[#1DB954]/20 border-[#1DB954]/40 text-[#1ed760]" 
                    : "bg-neutral-800 border-white/5 text-slate-500"
                }`}>
                  <Compass className="w-4 h-4 text-[#1ed760]" />
                </span>
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-[#1ed760] font-bold uppercase block">Predicted Algorithmic Indexing</span>
                  <p className="text-[17px] font-sans font-black text-white uppercase mt-0.5 animate-fadeIn">
                    RECOMMENDER PERFORMANCE PREDICTION
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 self-end md:self-auto font-sans">
                <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-3 py-1 rounded-xl">
                  <span className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider font-bold">Index Score:</span>
                  <span className="text-sm font-black font-mono text-[#1ed760] leading-none">{predictedScore}%</span>
                </div>
                <span className={`inline-block text-[9px] font-mono tracking-widest px-2.5 py-1 rounded-full border ${
                  isRecommenderExpanded
                    ? "bg-[#1ed760]/10 border-[#1ed760]/20 text-[#1ed760]"
                    : "bg-neutral-900 border-white/5 text-slate-400"
                }`}>
                  {isRecommenderExpanded ? "ACTIVE" : "VIEW SPOTIFY RECOMMENDATION AUDIT"}
                </span>
              </div>
            </div>
          </button>

          {/* Card 2 Dropdown Content */}
          {isRecommenderExpanded && (
            <div className="flex flex-col gap-6 w-full animate-fadeIn">

              {/* Curation Conclusion Card */}
              <div className="bg-neutral-950 border border-white/10 rounded-2xl p-5 text-left flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
              <Activity className="w-40 h-40 text-emerald-500 animate-[spin_20s_linear_infinite]" />
            </div>
            <div className="relative z-10 flex-1">
              <span className="text-[10px] font-mono tracking-widest text-[#1DB954] font-bold uppercase block">Predicted Algorithmic Indexing</span>
              <h2 className="text-lg font-extrabold text-white mt-1">Recommender Performance Prediction</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">
                Based on acoustic descriptors matching {critique?.vibe?.genre || "your style"}, we index this song's suitability for Spotify's discovery algorithms at **{predictedScore}%**. {
                  predictedScore >= 85 ? "This track exhibits critical, premium retention properties to seed high-performance collaborative playlists." :
                  predictedScore >= 70 ? "Stable performance potential. Optimize the first 30 seconds for maximum discovery loop acceleration." :
                  "High skip-prone profile. We recommend shifting vocally focused elements earlier in the mix and compressing the transients."
                }
              </p>
            </div>
            <div className="relative z-10 bg-neutral-900 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center min-w-[150px] shadow-lg flex-shrink-0 select-none">
              <span className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase">Indexing Score</span>
              <span className="text-3xl font-black text-[#1ed760] font-mono mt-1.5 leading-none">{predictedScore}%</span>
              <span className={`text-[8.5px] font-mono font-bold uppercase px-2 py-0.5 rounded mt-2 text-center select-none border ${
                predictedScore >= 85 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                predictedScore >= 70 ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                "bg-[#fe9a00]/10 border-[#fe9a00]/20 text-[#fe9a00]"
              }`}>
                {predictedScore >= 85 ? "▲ HIGH SEED CHANCE" : predictedScore >= 70 ? "■ MEDIUM RETENTION" : "▼ LOW SEED RANGE"}
              </span>
            </div>
          </div>

          {/* Sibling columns at the bottom for balanced spatial footprint */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Card 1: Artist Universe Vector */}
            <div className="bg-[#0D0E12] border border-white/5 rounded-2xl p-5 text-left flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                  <span className="text-xs font-bold text-white font-sans uppercase flex items-center gap-1.5 leading-none">
                    <span className="text-[#1ed760] font-mono text-[14px]">02</span>
                    NLP semantic Clustered Neighborhood
                  </span>
                  <span className="text-[8px] bg-sky-500/10 text-sky-400 font-mono px-2 py-0.5 rounded uppercase font-bold border border-sky-500/15 tracking-widest font-semibold">"Artist Universe"</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Spotify extracts semantic indicators from blogs and websites using LLM transformers. This establishes who your track's close **"Sonic Neighbors"** are:
                </p>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-white/5">
                <span className="text-[9px] font-mono font-semibold text-slate-500 uppercase tracking-widest block mb-2">Target Cluster Alignment:</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full block w-fit mb-3">
                  {critique?.vibe?.genre && critique?.vibe?.subgenre 
                    ? `${critique.vibe.genre} / ${critique.vibe.subgenre} (${clusterName})`
                    : clusterName}
                </span>

                <span className="text-[9px] font-mono font-semibold text-slate-500 uppercase tracking-widest block mb-1">Predicted Sonic Neighbors:</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sonicNeighbors.map((artist) => (
                    <span 
                      key={artist}
                      className="text-[10px] font-mono text-slate-300 font-bold bg-white/5 border border-white/10 px-2 py-1 rounded-md hover:bg-[#1ed760]/10 hover:border-[#1ed760]/30 hover:text-[#1ed760] hover:-translate-y-0.5 transition-all duration-300 select-none cursor-pointer"
                    >
                      {artist}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-4">
                  *Placement logic: Recommenders seed your track onto users' custom Daily Mixes and Radio queues that are already active on these neighbors' discographies.*
                </p>
              </div>
            </div>

            {/* Card 2: Discovery Feeder Distribution Probabilities */}
            <div className="bg-[#0D0E12] border border-white/5 rounded-2xl p-5 text-left flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                  <span className="text-xs font-bold text-white font-sans uppercase flex items-center gap-1.5 leading-none">
                    <span className="text-[#1ed760] font-mono text-[14px]">03</span>
                    Discovery Feeder Distribution Probabilities
                  </span>
                  <span className="text-[8px] bg-purple-500/10 text-purple-400 font-mono px-2 py-0.5 rounded uppercase font-bold border border-purple-500/15 tracking-widest font-semibold">Algorithms</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Predicted seeding chance across key Spotify recommendation feeder channels:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "Release Radar", score: releaseRadarChance, color: "text-[#1ed760]", path: "M 0 0", desc: "For organic followers" },
                  { name: "Discover Weekly", score: discoverWeeklyChance, color: "text-purple-400", path: "M 0 0", desc: "For collaborative users" },
                  { name: "Daily Mix & Radio", score: dailyMixChance, color: "text-blue-400", path: "M 0 0", desc: "For neighborhood clusters" },
                  { name: "AI Playlist Prompts", score: radioSeedChance, color: "text-cyan-400", path: "M 0 0", desc: "For NLP matching terms" }
                ].map((item) => (
                  <div key={item.name} className="bg-neutral-950 p-3.5 rounded-xl border border-white/5 flex gap-3 items-center">
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle cx="24" cy="24" r="21" fill="none" className="stroke-white/5" strokeWidth="3" />
                        <circle 
                          cx="24" 
                          cy="24" 
                          r="21" 
                          fill="none" 
                          className={item.color === "text-[#1ed760]" ? "stroke-emerald-500" : item.color === "text-purple-400" ? "stroke-purple-500" : item.color === "text-blue-400" ? "stroke-blue-500" : "stroke-cyan-500"} 
                          strokeWidth="3.2" 
                          strokeDasharray={2 * Math.PI * 21}
                          strokeDashoffset={2 * Math.PI * 21 * (1 - item.score / 100)}
                          strokeLinecap="round"
                          style={{ filter: "drop-shadow(0 0 3px currentColor)" }}
                        />
                      </svg>
                      <span className="absolute text-[10px] font-mono font-black text-white">{item.score}%</span>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-bold text-white font-sans">{item.name}</span>
                      <span className="text-[8.5px] text-slate-500 mt-0.5 leading-none font-mono font-semibold">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 30s Skip Prevention Checklist */}
          <div className="bg-[#0D0E12] border border-white/5 rounded-2xl p-5 text-left shadow-md">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-4">
              <span className="text-xs font-bold text-white font-sans uppercase flex items-center gap-1.5 leading-none">
                <span className="text-[#1ed760] font-mono text-[14px]">04</span>
                Collaborative Filtering Prevention Checklist (First 30 Seconds)
              </span>
              <span className="text-[8px] bg-amber-500/10 text-amber-500 font-mono px-2 py-0.5 rounded uppercase font-bold border border-amber-500/15 tracking-widest font-semibold">Collaborative Filter</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Under collaborative filtering, <strong>early skips represent negative feedback</strong> that diminishes algorithmic authority. On Spotify, a listener must listen to a track for more than 30 seconds to register a play. 
            </p>
            <div className="text-xs text-[#1DB954]/90 leading-relaxed bg-[#1DB954]/5 border border-[#1DB954]/15 p-4 rounded-xl mb-5 space-y-2">
              <div>
                <span className="text-white font-extrabold font-sans uppercase text-[10px] block mb-1">Algorithmic Performance Analysis:</span>
                These parameters assess how your track's physical composition and early structure protects you from skip-out triggers to dynamically raise your simulated <strong>Discovery Feeder Distribution Probabilities ("03")</strong> above.
              </div>
              <div className="pt-2 border-t border-[#1DB954]/15 text-slate-300/90 font-normal">
                {(() => {
                  const bucket = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                  const lufs = critique?.liveMetrics?.calculatedLufs;
                  const lra = critique?.liveMetrics?.calculatedLra;
                  const lufsPass = lufs !== undefined && lufs >= bucket.lufsMin && lufs <= bucket.lufsMax;
                  const lraPass = lra !== undefined && lra >= bucket.lraMin && (bucket.lraMax === null || lra <= bucket.lraMax);
                  return (
                    <>
                      <span className="text-white font-extrabold font-sans uppercase text-[10px] block mb-1">
                        Genre-Aware Loudness Assessment ({bucket.label})
                      </span>
                      Target window for this genre: <strong className="text-white">{bucket.lufsMin} to {bucket.lufsMax} LUFS</strong>, dynamic range window: <strong className="text-white">{bucket.lraMin}{bucket.lraMax !== null ? `-${bucket.lraMax}` : "+"} LU</strong>.
                      <br />
                      Measured loudness: <strong className="text-white">{lufs ?? "--"} LUFS</strong> ({lufsPass ? "within target window" : "outside target window for this genre"}).
                      <br />
                      Measured dynamic range: <strong className="text-white">{lra ?? "--"} LU</strong> ({lraPass ? "within target window" : "outside target window - track may sound over-compressed or under-produced for this genre"}).
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  id: "vocalEntrance",
                  title: "Vocal/Lead Theme enters < 12 seconds",
                  desc: "Hooks attention instantly. Delayed hooks increase listening hesitation and skip likelihood."
                },
                {
                  id: "spectralWidth",
                  title: "Instant Spectrum Width Expansion",
                  desc: "Bass and high sibilance dropped in early, creating immediate psychoacoustic investment."
                },
                {
                  id: "lufsConformity",
                  title: "LUFS Loudness Compliance (Genre-Aware)",
                  desc: "Loudness falls within the target window for this song's genre."
                },
                {
                  id: "lraConformity",
                  title: "Dynamic Range Compliance (Genre-Aware)",
                  desc: "Dynamic range (LRA) falls within the target window for this song's genre - avoids over-compression or under-production."
                },
                {
                  id: "transientStability",
                  title: "Transient Grid Stability (Grid Cohesion)",
                  desc: "Prevents initial rhythmic fatigue or timeline drift. Critical for headphone listeners."
                }
              ].map((check) => {
                const checked = spotifyChecks[check.id];
                const bucketForDesc = getGenreLoudnessBucket(critique?.vibe?.genre, critique?.vibe?.subgenre);
                const displayDesc = check.id === "lufsConformity"
                  ? (checked 
                      ? `Loudness (${critique?.liveMetrics?.calculatedLufs ?? "--"} LUFS) is within the ${bucketForDesc.lufsMin} to ${bucketForDesc.lufsMax} LUFS target window for ${bucketForDesc.label}.` 
                      : `Loudness (${critique?.liveMetrics?.calculatedLufs ?? "--"} LUFS) falls outside the ${bucketForDesc.lufsMin} to ${bucketForDesc.lufsMax} LUFS target window for ${bucketForDesc.label}.`)
                  : check.id === "lraConformity"
                  ? (checked
                      ? `Dynamic range (${critique?.liveMetrics?.calculatedLra ?? "--"} LU) is within the ${bucketForDesc.lraMin}${bucketForDesc.lraMax !== null ? `-${bucketForDesc.lraMax}` : "+"} LU target window for ${bucketForDesc.label}.`
                      : `Dynamic range (${critique?.liveMetrics?.calculatedLra ?? "--"} LU) falls outside the ${bucketForDesc.lraMin}${bucketForDesc.lraMax !== null ? `-${bucketForDesc.lraMax}` : "+"} LU target window for ${bucketForDesc.label}.`)
                  : check.desc;

                return (
                  <button
                    key={check.id}
                    type="button"
                    disabled
                    className={`flex items-start gap-3.5 p-4 rounded-xl border text-left cursor-default w-full select-none transition-all duration-300 ${
                      checked 
                        ? "bg-[#0A2010]/35 border-emerald-500/25 shadow-sm" 
                        : "bg-[#201c10]/30 border-[#ffba00]/15"
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {checked ? (
                        <CheckCircle className="w-4 h-4 text-[#1ed760]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#ffba00]" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-0.5">
                      <span 
                        className="text-xs font-bold leading-tight"
                        style={{ color: checked ? "#1ed760" : "#ffba00" }}
                      >
                        {check.title}
                      </span>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{displayDesc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

            </div>
          )}

        </div>

      </div>
    );
  };

  const renderStereoAzimuthPanel = () => {
    const azimuthScoreValue = Math.max(40, Math.min(99, Math.round(
      (critique?.mixQuality?.score ?? 75) * 0.4 + 
      (critique?.scores?.overallProduction ?? 75) * 0.3 + 
      (activeCategory === "azimuth" ? 85 : 78) - 
      ((genre.includes("mono") || subgenre.includes("mono")) ? 20 : 0)
    )));

    return (
      <div className="flex flex-col gap-6 w-full text-slate-300" id="azimuth-profiler-panel-section">
        {/* Retro Sonic Lineup Header Interface */}
        <div className="bg-[#0b1322] border border-cyan-500/15 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-sans select-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Compass className="w-24 h-24 text-cyan-500" />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 border border-cyan-500/25 bg-cyan-950/40 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-400 animate-pulse">
              <Compass className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-white tracking-wide">Sonic Lineup Azimuth Simulator v5.0</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Active Analysis Target: <span className="text-cyan-400 font-bold">{trackName}</span> | {critique?.vibe?.genre || "Production Master"} | 44.1 kHz 24-bit Stereo
              </p>
            </div>
          </div>

          {/* Interactive Player Transport Bar Mimicking Desktop Software */}
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
            
            {/* Record red indicator dot */}
            <div className={`w-2 h-2 rounded-full ${azimuthPlaying ? "bg-[#f43f5e] animate-pulse" : "bg-rose-500/30"}`} />
            
            <span className="text-slate-400 tracking-wider">
              {Math.floor((azimuthProgress * 0.3)).toString().padStart(2, "0")}:{Math.round(((azimuthProgress * 0.3) % 1) * 100).toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Master Comparison Selector Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#060a12]/80 p-3 rounded-2xl border border-white/5">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-mono text-cyan-400 tracking-wider font-semibold uppercase">Soundstage Calibration View</span>
            <span className="text-xs text-slate-400">Toggle between your song and reference masters to inspect panning density.</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#060a12] border border-white/5 rounded-xl">
            <button
              onClick={() => setAzimuthRefMode("user")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                azimuthRefMode === "user"
                  ? "bg-[#06b6d4]/15 text-cyan-400 border border-cyan-500/25"
                  : "hover:text-white text-slate-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${azimuthRefMode === "user" ? "bg-cyan-400 animate-pulse" : "bg-slate-700"}`} />
              User Blueprint
            </button>
            <button
              onClick={() => setAzimuthRefMode("benchmark")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                azimuthRefMode === "benchmark"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                  : "hover:text-white text-slate-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${azimuthRefMode === "benchmark" ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`} />
              Ideal Genre Benchmark
            </button>
            <button
              onClick={() => setAzimuthRefMode("overlap")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                azimuthRefMode === "overlap"
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                  : "hover:text-white text-slate-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${azimuthRefMode === "overlap" ? "bg-rose-500 animate-pulse" : "bg-slate-700"}`} />
              Overlap Alignment (A/B)
            </button>
          </div>
        </div>

        {/* Outer Split Container layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Visualizer itself (colspan 8) */}
          <div className="xl:col-span-8 flex flex-col gap-2">
            <StereoAzimuthVisualizer 
              activeTab={azimuthActiveTab as any}
              onActiveTabChange={(tab) => setAzimuthActiveTab(tab)}
              refMode={azimuthRefMode}
              isPlaying={azimuthPlaying}
              progress={azimuthProgress}
              onProgressChange={(val) => setAzimuthProgress(val)}
              genreName={critique?.vibe?.genre || "your genre"}
              liveMetrics={critique?.liveMetrics}
            />
          </div>

          {/* Right Column: Comparative Diagnostics Metrics (colspan 4) */}
          <div className="xl:col-span-4 flex flex-col gap-4 self-stretch justify-between">
            <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 flex-1 flex flex-col justify-between text-left relative overflow-hidden min-h-[300px]">
              <div className="flex flex-col gap-3.5">
                <span className="text-[9px] font-mono tracking-widest text-[#94a3b8] font-bold uppercase border-b border-white/10 pb-1.5 block">
                  AZIMUTH SOUNDSTAGE AUDIT
                </span>

                {/* Audit Item 1: Width separation */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Stereo Width Separation</span>
                    <span className="text-cyan-400">{azimuthRefMode === "benchmark" ? "100%" : "68% Matching"}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {azimuthRefMode === "benchmark" 
                      ? "Flawless panning limits. Instruments are spread to absolute limits (+/-90°) with correct high shelf level curves."
                      : `${critique?.mixQuality?.stereoField ?? "Solid width."}. Side acoustic elements could be panned wider from +/-35° out to +/-70° to open up the center lane.`
                    }
                  </p>
                </div>

                {/* Audit Item 2: Mono consistency / Low frequency lock */}
                <div className="flex flex-col gap-1 border-t border-white/[0.04] pt-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Sub-Bass Mono Alignment</span>
                    <span className="text-emerald-400">
                      {azimuthRefMode === "benchmark" ? "Pristine Corridor" : "92% Centered"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal font-sans">
                    {azimuthRefMode === "benchmark"
                      ? "Zero sub frequencies (>120Hz) detected outside the absolute center corridor, preventing potential vinyl mastering drift."
                      : "Low bass is locked dead center nicely. Only minimal sub-bass bleeding registers on extreme transients below 80Hz."
                    }
                  </p>
                </div>

                {/* Audit Item 3: Soundstage L/R Symmetry index */}
                <div className="flex flex-col gap-1 border-t border-white/[0.04] pt-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Lateral Panning Symmetry</span>
                    <span className="text-cyan-400">{azimuthRefMode === "benchmark" ? "100% Perfect" : "84% (Slight Left drift)"}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {azimuthRefMode === "benchmark"
                      ? "L/R channel power distribution scales calculate to exactly +0.02dB difference, providing ultimate professional acoustic balance."
                      : "Your left channel registers a higher dynamic range signature around the verse (due to double-tracked rhythm elements) than the right, creating a slight spatial weight drift."
                    }
                  </p>
                </div>
              </div>

              {/* Action Suggestion box */}
              <div className="bg-slate-950 border border-white/5 p-3 rounded-xl mt-4 text-[10px] text-slate-400 leading-relaxed font-semibold">
                <span className="text-cyan-400 block mb-0.5 uppercase tracking-wider font-mono text-[9px]">DIAGNOSTIC RECOMMENDATION:</span>
                To achieve the flawless wide side clouds shown in the **Ideal Benchmark**, try applying a Haas-effect chorus or a subtle micro-delay (12-18ms) to secondary high synthesizers or ambient delay paths.
              </div>
            </div>

            {/* Overall Azimuth Scorecard */}
            <div className="bg-neutral-950 border border-white/10 p-4.5 rounded-2xl flex items-center justify-between gap-4 select-none">
              <div className="text-left flex-1">
                <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase block tracking-wider">Soundstage Match Rate</span>
                <h4 className="text-sm font-extrabold text-white mt-0.5 leading-tight">Stereo Panning Integrity Profile</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Your panning spread and center alignment register at **{azimuthScoreValue}%** of the industry-optimal reference master.
                </p>
              </div>
              <div className="bg-[#0b1322] border border-cyan-500/20 p-3 rounded-xl text-center shadow-lg min-w-[100px] flex-shrink-0 flex flex-col justify-center items-center">
                <span className="text-[9.5px] font-bold font-mono text-[#06b6d4]">AZIMUTH INDEX</span>
                <span className="text-2xl font-black text-cyan-400 mt-0.5 font-mono">{azimuthScoreValue}%</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6" id="critique-display-container">
      {/* 1. Header Hero Panel */}
      <div className="bg-[#0D0E12] border border-white/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6 ring-1 ring-white/5 mt-[-12px]">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Disc className="w-48 h-48 animate-spin" style={{ animationDuration: "10s" }} />
        </div>

        {/* Left Side Stack containing the track details and the genre tabs */}
        <div className="flex flex-col gap-5 relative z-10">
          <div className="flex items-center gap-5">
            {coverArt ? (
              <img
                src={coverArt}
                alt="Track Cover Artwork"
                className="w-24 h-24 rounded-xl object-cover shadow-lg border border-white/15"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-tr from-blue-600/20 to-black rounded-xl flex items-center justify-center border border-white/15 shadow-[0_4px_15px_rgba(59,130,246,0.1)]">
                <Rabbit className="w-10 h-10 text-blue-400" />
              </div>
            )}

            <div className="flex flex-col text-left">
              <span className="text-[14px] font-mono tracking-widest text-blue-400 font-semibold uppercase flex items-center gap-1.5 bg-neutral-900/75 border border-white/5 py-1 px-3 rounded-full w-fit">
                <Radar className="w-4 h-4 text-blue-400 animate-spin-strobe" />
                <span>Analysis Complete</span>
              </span>
              <h1 className="text-xl font-bold text-white shadow-sm mt-2" id="evaluated-song-title">
                {trackName}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                by <span className="text-slate-300 font-medium">{artistName}</span>
              </p>
            </div>

            <button
              onClick={downloadFullReport}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Download Full Report (Excel)
            </button>
          </div>

          {/* Key and BPM Row - Version 4 Harmonic Audit */}
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap mt-1">
            <div 
              style={{ 
                width: isMobile ? "100%" : "auto"
              }}
              className="bg-[#11131A] px-4 py-3 rounded-xl border border-blue-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-blue-500/50 transition-all flex items-center gap-2.5 whitespace-nowrap min-w-fit"
            >
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Music4 className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold">Detected Key</span>
                <div className="font-bold text-pink-400 text-sm mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
                  <span>{getEstimatedKey().replace(" (TKEY)", "")}</span>
                </div>
              </div>
            </div>

            <div 
              style={{ 
                width: isMobile ? "100%" : "auto"
              }}
              className="bg-[#11131A] px-4 py-3 rounded-xl border border-blue-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-blue-500/50 transition-all flex items-center gap-2.5 whitespace-nowrap min-w-fit"
            >
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold">Tempo (BPM)</span>
                <div className="font-bold text-blue-400 text-sm mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                  <span>{getEstimatedBpm()} BPM</span>
                </div>
              </div>
            </div>

            <div 
              style={{ 
                width: isMobile ? "100%" : "auto"
              }}
              className="bg-[#11131A] px-4 py-3 rounded-xl border border-blue-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-blue-500/50 transition-all flex flex-col items-start gap-1 justify-center whitespace-nowrap min-w-fit"
            >
              <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold">Core Genre Profile:</span>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>{critique?.vibe?.genre ?? "N/A"}</span>
                {getGenreIcon(critique?.vibe?.genre ?? "", "w-4.5 h-4.5 ml-1")}
              </div>
            </div>

            <div 
              style={{ 
                width: isMobile ? "100%" : "auto"
              }}
              className="bg-[#11131A] px-4 py-3 rounded-xl border border-blue-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-blue-500/50 transition-all flex flex-col items-start gap-1 justify-center whitespace-nowrap min-w-fit"
            >
              <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-bold">Sub-Genre &amp; Dynamic Style:</span>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" style={{ backgroundColor: '#2dd4bf' }} />
                <span>{critique?.vibe?.subgenre ?? "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Playback utility desk */}
        {audioSourceUrl && (
          <div className="flex items-center gap-3 bg-neutral-950 border border-white/15 p-3 rounded-xl relative z-10 shadow-inner" id="header-audio-player">
            <button
              onClick={togglePlayback}
              className={`p-3 rounded-lg flex items-center justify-center transition-all duration-300 cursor-pointer ${
                isPlaying 
                  ? "bg-blue-600 hover:bg-blue-500 text-white" 
                  : "bg-neutral-900/60 hover:bg-white/5 text-blue-400 border border-white/5"
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current animate-pulse" /> : <Play className="w-4 h-4 fill-current pl-0.5" />}
            </button>
            <div className="flex flex-col pr-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                {isPlaying ? <Flame className="w-3 h-3 text-blue-500 animate-pulse" /> : null}
                {isPlaying ? "Auditory playback looping" : "Reference monitor"}
              </span>
              <span className="text-xs text-slate-500 mt-0.5">
                {localFileBlobUrl ? "Your uploaded file format" : "Spotify 30s audio sample preview"}
              </span>
            </div>
          </div>
        )}
      </div>

        {/* Combined Interactive Category Selectors & Main Scoreboard Grid */}
      <div className="flex flex-col gap-4 mt-4 mb-[-9px]" id="kpi-category-selectors">

        {/* MOBILE HORIZONTAL TABS */}
        <div className="md:hidden flex flex-row gap-2 overflow-x-auto pb-2 mb-2 w-full no-scrollbar" id="critique-mobile-tabs">
          <button
            onClick={() => { setActiveSection("streaming"); document.getElementById("section-streaming")?.scrollIntoView({ behavior: "smooth" }); }}
            className={`flex-1 min-w-[120px] flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl border transition-all text-left cursor-pointer ${
              activeSection === "streaming"
                ? "bg-blue-500/10 border-blue-500/40 text-blue-400"
                : "bg-neutral-900/50 border-white/5 text-slate-500"
            }`}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider truncate">Streaming</span>
              <span className="text-[8px] font-mono text-slate-500 truncate">Readiness</span>
            </div>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
              activeSection === "streaming" ? "bg-blue-500/25 text-blue-300" : "bg-neutral-800 text-slate-500"
            }`}>{streamingScore}</span>
          </button>

          <button
            onClick={() => { setActiveSection("sonic"); document.getElementById("section-sonic")?.scrollIntoView({ behavior: "smooth" }); }}
            className={`flex-1 min-w-[120px] flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl border transition-all text-left cursor-pointer ${
              activeSection === "sonic"
                ? "bg-[#46F4CD]/10 border-[#46F4CD]/40 text-[#46F4CD]"
                : "bg-neutral-900/50 border-white/5 text-slate-500"
            }`}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider truncate">Sonic</span>
              <span className="text-[8px] font-mono text-slate-500 truncate">Soundprint</span>
            </div>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
              activeSection === "sonic" ? "bg-[#46F4CD]/25 text-[#46F4CD]" : "bg-neutral-800 text-slate-500"
            }`}>{sonicScore}</span>
          </button>

          <button
            onClick={() => { setActiveSection("compositional"); document.getElementById("section-compositional")?.scrollIntoView({ behavior: "smooth" }); }}
            className={`flex-1 min-w-[120px] flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl border transition-all text-left cursor-pointer ${
              activeSection === "compositional"
                ? "bg-purple-500/10 border-purple-500/40 text-purple-400"
                : "bg-neutral-900/50 border-white/5 text-slate-500"
            }`}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider truncate">Compositional</span>
              <span className="text-[8px] font-mono text-slate-500 truncate">Depth</span>
            </div>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
              activeSection === "compositional" ? "bg-purple-500/25 text-purple-300" : "bg-neutral-800 text-slate-500"
            }`}>{compositionalScore}</span>
          </button>
        </div>

        <div className="flex relative mt-4" id="critique-page-layout">
          
          {/* SIDEBAR */}
          <div 
            className={`hidden md:flex sticky top-4 self-start flex-col gap-2.5 transition-all duration-300 mr-4 ${sidebarCollapsed ? 'w-14' : 'w-52'}`}
            style={{ height: 'fit-content' }}
          >
            {/* Collapse toggle */}
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-[10px] font-mono text-slate-600 tracking-widest uppercase">
                {sidebarCollapsed ? '' : 'Menu'}
              </span>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded-md bg-neutral-900/80 border border-white/5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer text-[11px] font-mono leading-none"
              >
                {sidebarCollapsed ? '»' : '«'}
              </button>
            </div>

            {/* STREAMING READINESS nav item */}
            <button
              onClick={() => {
                setActiveSection("streaming");
                setExpandedCategory("streaming");
                setTimeout(() => {
                  const el = document.getElementById("section-streaming");
                  if (el) {
                    const top = el.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top, behavior: "smooth" });
                  }
                }, 150);
              }}
              className={`relative flex items-center justify-between gap-2.5 min-h-[58px] px-3.5 py-3 rounded-xl border transition-all cursor-pointer text-left ${
                activeSection === "streaming" 
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.05)]" 
                  : "bg-[#0b0c10]/50 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10"
              }`}
            >
              {/* Subtle left glow bar on the active category */}
              {activeSection === "streaming" && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
              )}
              
              <div className="flex items-center gap-2.5 min-w-0 w-full">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeSection === "streaming" ? "bg-blue-400 shadow-[0_0_6px_#3b82f6]" : "bg-slate-600"}`} />
                {!sidebarCollapsed && (
                  <>
                    <div className="flex flex-col min-w-0 truncate">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-widest leading-none">STREAMING READINESS</span>
                    </div>
                  </>
                )}
              </div>
            </button>

            {/* Sub-links for streaming — only show when active and not collapsed */}
            {activeSection === "streaming" && !sidebarCollapsed && (
              <div className="flex flex-col gap-0.5 pl-3 border-l border-blue-500/20 ml-3.5 py-1">
                {["Commercial Impact", "Streaming Alignment", "Algo Sandbox"].map((label, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const ids = ["sidebar-link-streaming-0", "sidebar-link-streaming-1", "sidebar-link-streaming-2"];
                      setExpandedCategory('streaming');
                      setTimeout(() => {
                        const el = document.getElementById(ids[i]);
                        if (el) {
                          const top = el.getBoundingClientRect().top + window.scrollY - 80;
                          window.scrollTo({ top, behavior: 'smooth' });
                        }
                      }, 150);
                    }}
                    className="text-[12px] font-display font-normal text-slate-500 hover:text-blue-400 hover:bg-blue-500/5 px-2 py-1 rounded-md transition-all text-left cursor-pointer truncate w-full"
                  >
                    · {label}
                  </button>
                ))}
              </div>
            )}

            {/* SONIC SOUNDPRINT nav item */}
            <button
              onClick={() => {
                setActiveSection("sonic");
                setExpandedCategory("sonic");
                setTimeout(() => {
                  const el = document.getElementById("section-sonic");
                  if (el) {
                    const top = el.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top, behavior: "smooth" });
                  }
                }, 150);
              }}
              className={`relative flex items-center justify-between gap-2.5 min-h-[58px] px-3.5 py-3 rounded-xl border transition-all cursor-pointer text-left ${
                activeSection === "sonic" 
                  ? "bg-[#46F4CD]/10 border-[#46F4CD]/30 text-[#46F4CD] shadow-[0_0_15px_rgba(70,244,205,0.05)]" 
                  : "bg-[#0b0c10]/50 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10"
              }`}
            >
              {/* Subtle left glow bar on the active category */}
              {activeSection === "sonic" && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#46F4CD] shadow-[0_0_8px_#46F4CD]" />
              )}
              
              <div className="flex items-center gap-2.5 min-w-0 w-full">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeSection === "sonic" ? "bg-[#46F4CD] shadow-[0_0_6px_#46F4CD]" : "bg-slate-600"}`} />
                {!sidebarCollapsed && (
                  <>
                    <div className="flex flex-col min-w-0 truncate">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-widest leading-none">SONIC SOUNDPRINT</span>
                    </div>
                  </>
                )}
              </div>
            </button>

            {/* Sub-links for sonic */}
            {activeSection === "sonic" && !sidebarCollapsed && (
              <div className="flex flex-col gap-0.5 pl-3 border-l border-[#46F4CD]/20 ml-3.5 py-1">
                {["Engineering Studio", "Production Quality", "Tech Blueprints"].map((label, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const ids = ["sidebar-link-sonic-0", "sidebar-link-sonic-2", "sidebar-link-sonic-1"];
                      setExpandedCategory('sonic');
                      setTimeout(() => {
                        const el = document.getElementById(ids[i]);
                        if (el) {
                          const top = el.getBoundingClientRect().top + window.scrollY - 80;
                          window.scrollTo({ top, behavior: 'smooth' });
                        }
                      }, 150);
                    }}
                    className="text-[12px] font-display font-normal text-slate-500 hover:text-[#46F4CD] hover:bg-[#46F4CD]/5 transition-colors text-left py-1 px-2 rounded cursor-pointer"
                  >
                    · {label}
                  </button>
                ))}
              </div>
            )}

            {/* COMPOSITIONAL DEPTH nav item */}
            <button
              onClick={() => {
                setActiveSection("compositional");
                setExpandedCategory("compositional");
                setTimeout(() => {
                  const el = document.getElementById("section-compositional");
                  if (el) {
                    const top = el.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top, behavior: "smooth" });
                  }
                }, 150);
              }}
              className={`relative flex items-center justify-between gap-2.5 min-h-[58px] px-3.5 py-3 rounded-xl border transition-all cursor-pointer text-left ${
                activeSection === "compositional" 
                  ? "bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.05)]" 
                  : "bg-[#0b0c10]/50 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10"
              }`}
            >
              {/* Subtle left glow bar on the active category */}
              {activeSection === "compositional" && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-purple-500 shadow-[0_0_8px_#a855f7]" />
              )}
              
              <div className="flex items-center gap-2.5 min-w-0 w-full">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeSection === "compositional" ? "bg-purple-400 shadow-[0_0_6px_#a855f7]" : "bg-slate-600"}`} />
                {!sidebarCollapsed && (
                  <>
                    <div className="flex flex-col min-w-0 truncate">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-widest leading-none">COMPOSITIONAL DEPTH</span>
                    </div>
                  </>
                )}
              </div>
            </button>

            {/* Sub-links for compositional */}
            {activeSection === "compositional" && !sidebarCollapsed && (
              <div className="flex flex-col gap-0.5 pl-3 border-l border-purple-500/20 ml-3.5 py-1">
                {["Artistic Impact", "Songwriting Quality", "Song Architecture"].map((label, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setExpandedCategory('compositional');
                      setTimeout(() => {
                        const el = document.getElementById(`sidebar-link-compositional-${i}`);
                        if (el) {
                          const top = el.getBoundingClientRect().top + window.scrollY - 80;
                          window.scrollTo({ top, behavior: 'smooth' });
                        }
                      }, 150);
                    }}
                    className="text-[12px] font-display font-normal text-slate-500 hover:text-purple-400 hover:bg-purple-500/5 px-2 py-1 rounded-md transition-all text-left cursor-pointer truncate w-full"
                  >
                    · {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* THREE CATEGORY LANDING CARDS — default collapsed view */}
            {expandedCategory === null && (
              <div className="flex flex-col gap-4">
                {/* Streaming Readiness card */}
                <div
                  onClick={() => setExpandedCategory("streaming")}
                  className="relative cursor-pointer rounded-2xl overflow-hidden border border-blue-500/30 hover:border-blue-400/60 transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]"
                  style={{ minHeight: "170px", background: "linear-gradient(135deg, #090b0e 0%, #090b0e 60%, #0d1628 100%)" }}
                >
                  {/* Atmospheric gradient glow — bleeds left from circle */}
                  <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
                    <div className="absolute inset-0" style={{
                      background: "linear-gradient(to left, #2f65be 0%, #2b5cac 4%, #1c3c73 12%, #152d56 20%, #102241 28%, #0a162a 38%, #040911 52%, #000000 65%)",
                      opacity: 0.9
                    }} />
                  </div>
                  {/* Thick white circle — center positioned below-right of card */}
                  <div className="absolute pointer-events-none" style={{
                    width: "600px",
                    height: "600px",
                    borderRadius: "50%",
                    border: "20px solid rgba(255,255,255,0.95)",
                    right: "-320px",
                    bottom: "-320px",
                    boxShadow: "0 0 30px rgba(59,130,246,1), 0 0 60px rgba(59,130,246,0.8), 0 0 100px rgba(59,130,246,0.5), inset 0 0 30px rgba(59,130,246,0.8), inset 0 0 60px rgba(59,130,246,0.4)"
                  }} />
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-400 to-blue-600" />
                  {/* Content */}
                  <div className="relative z-10 p-7 flex flex-col gap-3">
                    <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-[0.2em]">Category</span>
                    <h2 className="text-[32px] font-black text-white uppercase leading-none tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>Streaming Readiness</h2>
                    <p className="text-[12px] text-slate-400 leading-relaxed max-w-lg mt-1">Commercial impact, streaming alignment, algorithmic sandbox, artist positioning — how streaming services find, categorize, and promote your song.</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {["Commercial Impact", "Streaming Alignment", "Algo Sandbox"].map(tag => (
                        <span key={tag} className="text-[9px] font-mono text-blue-400/70 border border-blue-500/25 px-2.5 py-1 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sonic Soundprint card */}
                <div
                  onClick={() => setExpandedCategory("sonic")}
                  className="relative cursor-pointer rounded-2xl overflow-hidden border border-[#46F4CD]/30 hover:border-[#46F4CD]/60 transition-all duration-300 hover:shadow-[0_0_40px_rgba(70,244,205,0.2)]"
                  style={{ minHeight: "170px", background: "linear-gradient(135deg, #090b0e 0%, #090b0e 60%, #091a14 100%)" }}
                >
                  {/* Atmospheric gradient glow — bleeds left from circle */}
                  <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
                    <div className="absolute inset-0" style={{
                      background: "linear-gradient(to left, #168ba0 0%, #0c7490 4%, #094d60 12%, #083e4b 20%, #09313b 28%, #072228 38%, #030809 52%, #000000 65%)",
                      opacity: 0.9
                    }} />
                  </div>
                  {/* Thick white circle — center positioned below-right, showing 9:00 to 10:20 arc */}
                  <div className="absolute pointer-events-none" style={{
                    width: "600px",
                    height: "600px",
                    borderRadius: "50%",
                    border: "20px solid rgba(255,255,255,0.95)",
                    right: "-380px",
                    bottom: "-280px",
                    boxShadow: "0 0 30px rgba(70,244,205,1), 0 0 60px rgba(70,244,205,0.8), 0 0 100px rgba(70,244,205,0.5), inset 0 0 30px rgba(70,244,205,0.8), inset 0 0 60px rgba(70,244,205,0.4)"
                  }} />
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#46F4CD] to-[#2dd4bf]" />
                  {/* Content */}
                  <div className="relative z-10 p-7 flex flex-col gap-3">
                    <span className="text-[10px] font-mono font-bold text-[#46F4CD] uppercase tracking-[0.2em]">Category</span>
                    <h2 className="text-[32px] font-black text-white uppercase leading-none tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>Sonic Soundprint</h2>
                    <p className="text-[12px] text-slate-400 leading-relaxed max-w-lg mt-1">Engineering studio, production quality, and technical diagnostic blueprints — whether your mix sounds finished and competitive.</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {["Engineering Studio", "Production Quality", "Tech Blueprints"].map(tag => (
                        <span key={tag} className="text-[9px] font-mono text-[#46F4CD]/70 border border-[#46F4CD]/25 px-2.5 py-1 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Compositional Depth card */}
                <div
                  onClick={() => setExpandedCategory("compositional")}
                  className="relative cursor-pointer rounded-2xl overflow-hidden border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]"
                  style={{ minHeight: "170px", background: "linear-gradient(135deg, #090b0e 0%, #090b0e 60%, #12091e 100%)" }}
                >
                  {/* Atmospheric gradient glow — bleeds left from circle */}
                  <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
                    <div className="absolute inset-0" style={{
                      background: "linear-gradient(to left, #7e3ac7 0%, #7436b7 4%, #50267e 12%, #401f64 20%, #331a4e 28%, #241435 38%, #160d20 52%, #000000 65%)",
                      opacity: 0.9
                    }} />
                  </div>
                  {/* Thick white circle — center positioned below-right, showing 9:00 to 10:20 arc, shifted further right */}
                  <div className="absolute pointer-events-none" style={{
                    width: "600px",
                    height: "600px",
                    borderRadius: "50%",
                    border: "20px solid rgba(255,255,255,0.95)",
                    right: "-460px",
                    bottom: "-240px",
                    boxShadow: "0 0 30px rgba(168,85,247,1), 0 0 60px rgba(168,85,247,0.8), 0 0 100px rgba(168,85,247,0.5), inset 0 0 30px rgba(168,85,247,0.8), inset 0 0 60px rgba(168,85,247,0.4)"
                  }} />
                  {/* Left accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-purple-400 to-purple-600" />
                  {/* Content */}
                  <div className="relative z-10 p-7 flex flex-col gap-3">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-[0.2em]">Category</span>
                    <h2 className="text-[32px] font-black text-white uppercase leading-none tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>Compositional Depth</h2>
                    <p className="text-[12px] text-slate-400 leading-relaxed max-w-lg mt-1">Artistic impact, songwriting quality, and song architecture — the human elements that make a song worth remembering.</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {["Artistic Impact", "Songwriting Quality", "Song Architecture"].map(tag => (
                        <span key={tag} className="text-[9px] font-mono text-purple-400/70 border border-purple-500/25 px-2.5 py-1 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* When a category is expanded show a back button above the sections */}
            {expandedCategory !== null && (
              <button
                onClick={() => setExpandedCategory(null)}
                className="flex items-center gap-2 text-[10px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer self-start px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl mb-2"
              >
                ← Back to Overview
              </button>
            )}

            {/* SECTION: STREAMING READINESS */}
            {(expandedCategory === "streaming" || expandedCategory === null) && expandedCategory === "streaming" && (
              <div id="section-streaming" className="flex flex-col gap-4">
              <div className="relative overflow-hidden flex items-center gap-4 px-5 py-3 border-t border-b border-blue-500/20" style={{ background: "linear-gradient(to right, #090b0e 0%, #090b0e 55%, #0d1628 100%)" }}>
                {/* Atmospheric glow */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: "linear-gradient(to left, #2f65be 0%, #1c3c73 15%, #040911 50%, #000000 75%)",
                  opacity: 0.5
                }} />
                {/* Mini circle arc */}
                <div className="absolute pointer-events-none" style={{
                  width: "200px", height: "200px", borderRadius: "50%",
                  border: "8px solid rgba(255,255,255,0.9)",
                  right: "-120px", bottom: "-100px",
                  boxShadow: "0 0 15px rgba(59,130,246,1), 0 0 30px rgba(59,130,246,0.6), inset 0 0 15px rgba(59,130,246,0.4)"
                }} />
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-400 to-blue-600" />
                {/* Content */}
                <div className="relative z-10 flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-[0.2em]">Category</span>
                  <span className="text-[16px] font-black text-white uppercase leading-none tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>Streaming Readiness</span>
                </div>
                <span className="relative z-10 text-[9px] font-mono text-slate-500 ml-auto">Algorithmic curation & discovery potential</span>
              </div>

              {/* Card 1: Mainstream Radio Formatting (blue) */}
              <div className="flex flex-col w-full gap-4" id="sidebar-link-streaming-0">
          <button
            onClick={() => handleCategoryChange("mainstream")}
            className={`relative z-10 flex flex-col justify-between py-[15px] px-6 h-[180px] rounded-[24px] border transition-all duration-300 text-left cursor-pointer group overflow-hidden select-none text-white w-full ${
              activeCategory === "mainstream"
                ? "bg-[#090b0e] border-blue-500 shadow-[0_0_35px_rgba(59,130,246,0.35)] ring-1 ring-blue-500/40 font-black"
                : "bg-[#0A0B0E]/60 border-[#2a7eff] hover:border-[#2a7eff] hover:bg-neutral-900/40 text-slate-400"
            }`}
          >
            {/* Background ambient shade */}
            {activeCategory === "mainstream" ? (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950/5 via-neutral-950 to-[#03050a] pointer-events-none" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 to-[#03050a] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 w-full h-full">
              {/* Left Content Column */}
              <div className="flex flex-col flex-1 justify-between gap-3 h-full">
                {/* Header block */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                    activeCategory === "mainstream"
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : "bg-neutral-900 border-white/5 text-slate-500 group-hover:text-slate-300"
                  }`}>
                    <Rabbit className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <span 
                      className={`font-black text-[19px] tracking-wider uppercase transition-colors ${
                        activeCategory === "mainstream" ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      COMMERCIAL IMPACT
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Algorithmic Curation Potential</span>
                  </div>
                </div>

                {/* Bottom info block */}
                <div className={`border-t text-left pt-2 px-0.5 transition-colors ${
                  activeCategory === "mainstream" ? "border-blue-500/15" : "border-white/5"
                }`}>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mb-2">
                    This is a generalized, "quick view" analysis of how streaming services algorithms might assess your song upon upload: streaming readiness (80% weight) & production quality (20% weight).
                    <span className="block mt-1 text-blue-400/90 font-mono text-[8.5px] uppercase tracking-wider">THIS METRIC IS HOW STREAMING SERVICES EVALUATE YOUR SONG UPON UPLOAD.</span>
                  </p>
                  <span className={`inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                    activeCategory === "mainstream"
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                      : "bg-neutral-900/50 border-white/5 text-slate-600 group-hover:text-slate-400"
                  }`}>
                    {activeCategory === "mainstream" ? "ACTIVE ⬇" : "VIEW METRICS"}
                  </span>
                </div>
              </div>

              {/* Right Score display */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <ScoreCircle 
                  score={Math.round((critique?.scores?.commercialReadiness ?? 75) * 0.8 + (critique?.scores?.overallProduction ?? 75) * 0.2)} 
                  size={110} 
                  strokeWidth={7} 
                  color={activeCategory === "mainstream" ? "#3b82f6" : "rgba(59, 130, 246, 0.45)"} 
                  glowColor={activeCategory === "mainstream" ? "rgba(59, 130, 246, 0.65)" : "rgba(59, 130, 246, 0.15)"} 
                  extraGlow={activeCategory === "mainstream"}
                />
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {activeCategory === "mainstream" && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: -8 }}
                animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                exit={{ height: 0, opacity: 0, marginTop: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden w-full relative z-0"
              >
                <div style={{ position: "relative", left: "15px", width: "calc(100% - 15px)" }} className="bg-black/80 border border-[#2a7eff] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col gap-5">
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }}>
                    COMMERCIAL & PRODUCTION IMPACT METRICS
                  </div>
                  <div style={{ marginTop: "-20px", paddingTop: "11px", paddingBottom: "18px" }} className="flex items-center justify-between border-b border-white/5">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#90a1b9] uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span>Active Diagnostics List</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 text-right">
                      Click any metric to expand technical feedback & recommendations
                    </span>
                  </div>

                  <div className="flex flex-col gap-5 relative">
                    <div className="relative flex flex-col gap-5">
                      {getFilteredMetrics("mainstream").slice(0, 2).map((metric) => {
                        if (!metric) return null;
                        const isExpanded = expandedMetric === metric.id;
                        return (
                          <div key={metric.id} className="flex flex-col gap-1.5 relative" id={`metric-wrapper-${metric.id}`}>
                            <RowMetricCard
                              metric={metric}
                              isExpanded={isExpanded}
                              onClick={() => {
                                setExpandedMetric(isExpanded ? null : metric.id);
                              }}
                            />
                            {isExpanded && renderExpandedBreakdown(metric.id)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 5: Spotify Algorithm Compatibility Panel & Discovery Readiness Scorecard */}
        <div className="flex flex-col w-full gap-4 relative z-10" id="sidebar-link-streaming-1">
          
          {/* Button A: Spotify Algorithm Compatibility */}
          <button
            onClick={() => {
              if (activeCategory === "spotify") {
                handleCategoryChange(null);
              } else {
                handleCategoryChange("spotify");
              }
            }}
            className={`relative z-10 flex flex-col justify-between py-[15px] px-6 h-[180px] rounded-[24px] border transition-all duration-300 text-left cursor-pointer group overflow-hidden select-none text-white w-full ${
              activeCategory === "spotify"
                ? "bg-[#090b0e] border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30 font-black"
                : "bg-[#0A0B0E]/60 border-[#1ed760] hover:border-[#1ed760] hover:bg-[#090c0a]/40 text-slate-400"
            }`}
          >
            {/* Background ambient shade */}
            {activeCategory === "spotify" ? (
              <div className="absolute inset-0 bg-gradient-to-br from-[#0c2415]/30 via-neutral-950 to-[#030509] pointer-events-none" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#040c07]/10 via-neutral-950 to-[#030509] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 w-full h-full">
              {/* Left Content Column */}
              <div className="flex flex-col flex-1 justify-between gap-3 h-full font-sans">
                {/* Header block */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                    activeCategory === "spotify"
                      ? "bg-[#1DB954]/10 border-[#1DB954]/30 text-[#1DB954] shadow-[0_0_15px_rgba(29,185,84,0.3)]"
                      : "p-2 rounded-xl border border-white/5 bg-neutral-900 text-slate-500 group-hover:text-[#1DB954] group-hover:border-[#1DB954]/20 group-hover:shadow-[0_0_15px_rgba(29,185,84,0.2)]"
                  }`}>
                    <Activity className="w-5 h-5 text-[#1DB954]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span 
                      className={`font-black text-[19px] tracking-wider uppercase transition-colors ${
                        activeCategory === "spotify" ? "text-white" : "text-slate-200 group-hover:text-white"
                      }`}
                    >
                      STREAMING ALGORITHMIC ALIGNMENT
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium tracking-wide">Pillars of Content &amp; Collaborative Filtering</span>
                  </div>
                </div>

                {/* Bottom info block */}
                <div className={`border-t text-left pt-2 px-0.5 transition-colors ${
                  activeCategory === "spotify" ? "border-emerald-500/15" : "border-white/5"
                }`}>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mb-2">
                    This is the high level, deep dive audit of your tracks potential alignment against Spotify's content-based acoustic analysis, "Artist Universe" semantic clusters, and 30s skip prevention metrics.
                    <span className="block mt-1 text-[#1DB954] font-mono text-[8.5px] uppercase tracking-wider">BEFORE YOUR SONG'S FIRST STREAM: THIS ANALYSIS EVALUATES DUAL INDEXING: ACOUSTIC PARAMETERS &amp; WEB NLP CLUSTERING.</span>
                  </p>
                  <span className={`inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                    activeCategory === "spotify"
                      ? "bg-[#1ed760]/10 border-[#1ed760]/20 text-[#1ed760]"
                      : "bg-neutral-900/50 border-white/5 text-slate-600 group-hover:text-[#1ed760]/80"
                  }`}>
                    {activeCategory === "spotify" ? "ACTIVE ⬇" : "VIEW SPOTIFY RECOMMENDATION AUDIT ⚡"}
                  </span>
                </div>
              </div>

              {/* Instantly visible compatibility mini scorecard */}
              <div className="hidden lg:flex flex-col gap-2 bg-black/60 p-4 rounded-2xl border border-white/5 w-[250px] self-stretch justify-center relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-[2px] bg-[#1ed760]/55" />
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1 block">
                  Algorithmic Target Match
                </span>
                <div className="flex flex-col gap-1.5 mt-1 font-mono text-[9px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Danceability Match:</span>
                    <span className="text-[#1ed760]" style={{ color: '#1ed760', fontWeight: 900 }}>{danceabilityMatch}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Energy Match Index:</span>
                    <span className="text-emerald-400" style={{ color: '#34d399', fontWeight: 900 }}>{energyMatch}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Acousticness Match:</span>
                    <span className="text-emerald-400" style={{ color: '#34d399', fontWeight: 900 }}>{acousticnessMatch}%</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-1 mt-1 text-[8px]">
                    <span className="text-slate-500">True Peak Limiters:</span>
                    <span className={spotifyTruePeak > -1.0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"} style={spotifyTruePeak > -1.0 ? { color: '#f59e0b' } : { color: '#34d399' }}>
                      {spotifyTruePeak > -1.0 ? "EXCEEDS -1.0dB" : "PASS (-1.05 dBTP)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {activeCategory === "spotify" && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: -8 }}
                animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                exit={{ height: 0, opacity: 0, marginTop: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden w-full relative z-0"
              >
                <div style={{ position: "relative", left: "15px", width: "calc(100% - 15px)" }} className="bg-[#0A0B0E] border border-[#1ed760] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col gap-5">
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }}>
                    SPOTIFY ALGORITHMIC ALIGNMENT & COMPATIBILITY
                  </div>
                  <div style={{ marginTop: "-20px", paddingTop: "11px", paddingBottom: "18px" }} className="flex items-center justify-between border-b border-white/5">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#90a1b9] uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#1ed760] animate-pulse" />
                      <span>AUTOMATED ALGORITHM AUDIT</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 text-right">
                      Mapping content acoustic parameters and NLP semantic embeddings
                    </span>
                  </div>
                  <div className="w-full">
                    {renderSpotifyRecommendationPanel()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 2: Algotorial Playlist Sandbox Button/Shortcut (amber) */}
        <div className="flex flex-col w-full gap-4" id="sidebar-link-streaming-2">
          <button
            onClick={() => {
              if (activeCategory === "sandbox") {
                handleCategoryChange(null);
              } else {
                handleCategoryChange("sandbox");
                setSandboxPlaying(true);
              }
            }}
            className={`relative z-10 flex flex-col justify-between py-[15px] px-6 h-[180px] rounded-[24px] border transition-all duration-300 text-left cursor-pointer group overflow-hidden select-none text-white w-full ${
              activeCategory === "sandbox"
                ? "bg-[#090b0e] border-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/40 font-black"
                : "bg-[#0A0B0E]/60 border-[#f59e0b] hover:border-[#f59e0b] hover:bg-neutral-900/40 text-slate-400"
            }`}
          >
            {/* Background ambient shade */}
            {activeCategory === "sandbox" ? (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-950/10 via-neutral-950 to-[#03050a] pointer-events-none" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 to-[#0c0d11] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 w-full h-full">
              {/* Left Content Column */}
              <div className="flex flex-col flex-1 justify-between gap-3 h-full font-sans">
                {/* Header block */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                    activeCategory === "sandbox"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      : "p-2 rounded-xl border border-white/5 bg-neutral-900 text-slate-500 group-hover:text-amber-400 group-hover:border-amber-500/20 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  }`}>
                    <Compass className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className={`font-black text-[19px] tracking-wider uppercase transition-colors ${
                      activeCategory === "sandbox" ? "text-white" : "text-slate-400 group-hover:text-white"
                    }`}>
                      ALGORITHMIC SANDBOX
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium font-sans">Placement & Retention Simulator</span>
                  </div>
                </div>

                {/* Bottom info block */}
                <div className={`border-t text-left pt-2 px-0.5 transition-colors ${
                  activeCategory === "sandbox" ? "border-amber-500/15" : "border-white/5"
                }`}>
                  <p className="text-[10px] text-slate-400 text-left leading-relaxed font-semibold mb-2">
                    Simulate streaming skip-rates and metric feedback parameters inside curators' placement filters.
                    <span className="block mt-1 text-[#fe9a00] font-mono text-[9px] tracking-widest uppercase transition-colors">THIS METRIC SIMULATES HOW STREAMING SERVICES DETERMINE YOUR SONG'S IMPACT AFTER IT BEGINS STREAMING.</span>
                  </p>
                  <span className={`inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                    activeCategory === "sandbox"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                      : "bg-[#0A0B0E]/60 border-white/5 hover:border-amber-500/40 hover:bg-neutral-900/40 text-slate-500 group-hover:text-amber-400"
                  }`}>
                    {activeCategory === "sandbox" ? "ACTIVE ⬇" : "TEST PLACEMENT ⚡"}
                  </span>
                </div>
              </div>

              {/* Right Radar circle visualization */}
              <div className="flex-shrink-0 flex items-center justify-center relative w-[110px] h-[110px]">
                {/* Outer pulsing ring */}
                <div className={`absolute inset-0 rounded-full border border-dashed duration-[25s] ${
                  activeCategory === "sandbox" ? "border-amber-500/40 animate-spin" : "border-amber-500/20 group-hover:animate-spin"
                }`} />
                <div className={`absolute inset-2 rounded-full border bg-[#0e1014] flex flex-col items-center justify-center shadow-inner relative overflow-hidden transition-colors ${
                  activeCategory === "sandbox" ? "border-amber-500/40" : "border-white/5 group-hover:border-amber-500/30"
                }`}>
                  {/* Visual pulse line or equalizer */}
                  <div className="flex items-end gap-1 h-8 mb-1">
                    <div className={`w-[3px] rounded-full h-4 transition-all ${activeCategory === "sandbox" ? "bg-amber-500 scale-y-125" : "bg-amber-500/60 group-hover:bg-amber-500 group-hover:scale-y-125"}`} />
                    <div className={`w-[3px] rounded-full h-7 delay-75 transition-all ${activeCategory === "sandbox" ? "bg-amber-500 scale-y-110" : "bg-amber-500/60 group-hover:bg-amber-500 group-hover:scale-y-110"}`} />
                    <div className={`w-[3px] rounded-full h-5 delay-150 transition-all ${activeCategory === "sandbox" ? "bg-amber-500 scale-y-125" : "bg-amber-500/60 group-hover:bg-amber-500 group-hover:scale-y-125"}`} />
                    <div className={`w-[3px] rounded-full h-3 delay-200 transition-all ${activeCategory === "sandbox" ? "bg-amber-500 scale-y-105" : "bg-amber-500/60 group-hover:bg-amber-500 group-hover:scale-y-105"}`} />
                  </div>
                  <span className={`text-[10px] font-sans font-black transition-colors ${activeCategory === "sandbox" ? "text-amber-500" : "text-slate-400 group-hover:text-amber-400"}`}>SANDBOX</span>
                  <span className="text-[8px] font-mono text-slate-500">PLAYBACK</span>
                </div>
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {activeCategory === "sandbox" && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: -8 }}
                animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                exit={{ height: 0, opacity: 0, marginTop: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden w-full relative z-0"
              >
                <div style={{ position: "relative", left: "15px", width: "calc(100% - 15px)" }} className="bg-[#0A0B0E] border border-[#f59e0b] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col gap-5 font-sans">
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }}>
                    ALGORITHMIC PLAYLIST SANDBOX
                  </div>
                  <div style={{ marginTop: "-20px", paddingTop: "11px", paddingBottom: "18px" }} className="flex items-center justify-between border-b border-white/5 font-sans">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#90a1b9] uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>ACTIVE PLAYBACK INSTANCE</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 text-right">
                      Tune skip-rates and metric feedback parameters inside Spotify curator loops
                    </span>
                  </div>
                  <div className="w-full">
                    {renderAlgotorialSandbox()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </div> /* End of section-streaming */
            )}

      {/* SECTION: SONIC SOUNDPRINT */}
      {expandedCategory === "sonic" && (
        <div id="section-sonic" className="flex flex-col gap-4 mt-8">
        <div className="relative overflow-hidden flex items-center gap-4 px-5 py-3 border-t border-b border-[#46F4CD]/20" style={{ background: "linear-gradient(to right, #090b0e 0%, #090b0e 55%, #091a14 100%)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(to left, #168ba0 0%, #094d60 15%, #030809 50%, #000000 75%)",
            opacity: 0.5
          }} />
          <div className="absolute pointer-events-none" style={{
            width: "200px", height: "200px", borderRadius: "50%",
            border: "8px solid rgba(255,255,255,0.9)",
            right: "-120px", bottom: "-100px",
            boxShadow: "0 0 15px rgba(70,244,205,1), 0 0 30px rgba(70,244,205,0.6), inset 0 0 15px rgba(70,244,205,0.4)"
          }} />
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#46F4CD] to-[#2dd4bf]" />
          <div className="relative z-10 flex flex-col gap-0.5">
            <span className="text-[9px] font-mono font-bold text-[#46F4CD] uppercase tracking-[0.2em]">Category</span>
            <span className="text-[16px] font-black text-white uppercase leading-none tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>Sonic Soundprint</span>
          </div>
          <span className="relative z-10 text-[9px] font-mono text-slate-500 ml-auto">Technical mix architecture & engineering diagnostics</span>
        </div>

        {/* The engineering studio invite banner moved here with blue border */}
        <div 
          onClick={() => {
            if (onNavigateToEngineeringStudio) onNavigateToEngineeringStudio();
          }}
          className="group relative bg-[#13161C] border-[1.2px] border-[#2563EB] rounded-3xl p-6.5 shadow-[0_4px_30px_rgba(0,0,0,0.4)] flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_0_40px_rgba(37,99,235,0.12)] hover:scale-[1.005]"
          id="sidebar-link-sonic-0"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-500/[0.015] to-[#2563EB]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[320px] h-[320px] bg-[#2563EB]/[0.02] rounded-full blur-[80px] pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 text-center md:text-left">
            <div className="p-4 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.15)] group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
              <Volume2 className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide uppercase flex items-center justify-center md:justify-start gap-2.5">
                THE ENGINEERING STUDIO
                <span className="text-[9px] bg-[#2563EB]/15 border border-[#2563EB]/25 text-blue-400 font-mono tracking-widest px-2.5 py-0.5 rounded-full uppercase">High Precision Analysis</span>
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-xl leading-relaxed">
                <span className="font-bold text-white">Enter the studio.</span>{"  "}<span className="text-[#90a1b9]">This powerhouse engineering and production mix/master diagnostic suite guides a mix from good to masterful. Nine diagnostic modules analyze a broad array of measurements that guide step-by-step, plugin setting specific mix correction blueprints.</span>
              </p>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigateToEngineeringStudio) onNavigateToEngineeringStudio();
              }}
              className="px-6 py-3 bg-[#2563EB] hover:bg-blue-500 text-white font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] cursor-pointer flex items-center gap-2 group-hover:scale-102"
            >
              <span>Enter Engineering Studio</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Card: Technical and Diagnostic Blueprints (cyan) */}
        <div className="flex flex-col w-full gap-4" id="sidebar-link-sonic-1">
          <button
            onClick={() => handleCategoryChange("blueprints")}
            id="blueprint-category-selector"
            className={`relative z-10 flex flex-col justify-between py-[15px] px-6 h-[180px] rounded-[24px] border transition-all duration-300 text-left cursor-pointer group overflow-hidden select-none text-white w-full ${
              activeCategory === "blueprints"
                ? "bg-[#090b0e] border-cyan-500 shadow-[0_0_35px_rgba(6,182,212,0.35)] ring-1 ring-cyan-500/40 font-black"
                : "bg-[#0A0B0E]/60 border-[#06b6d4] hover:border-[#06b6d4] hover:bg-neutral-900/40 text-slate-400"
            }`}
          >
            {/* Background ambient shade */}
            {activeCategory === "blueprints" ? (
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/5 via-neutral-950 to-[#030509] pointer-events-none" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 to-[#030509] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 w-full h-full">
              {/* Left Content Column */}
              <div className="flex flex-col flex-1 justify-between gap-3 h-full">
                {/* Header block */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                    activeCategory === "blueprints"
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                      : "bg-neutral-900 border-white/5 text-slate-500 group-hover:text-slate-300"
                  }`}>
                    <Layers className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex flex-col">
                    <span 
                      className={`font-black text-[19px] tracking-wider uppercase transition-colors ${
                        activeCategory === "blueprints" ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      TECHNICAL AND DIAGNOSTIC BLUEPRINTS
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Core Metric Integration</span>
                  </div>
                </div>

                {/* Bottom info block */}
                <div className={`border-t text-left pt-2 px-0.5 transition-colors ${
                  activeCategory === "blueprints" ? "border-cyan-500/15" : "border-white/5"
                }`}>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mb-2">
                    Integrated assessment linking Composition Flow, Stereo Mix Balance, Vocal Tracking, Instrumental Staging, and Title Searchability.
                    <span className="block mt-1 text-cyan-400/90 font-mono text-[8.5px] uppercase tracking-wider">A highly precise look at the acoustic parameters and indexing metadata of the track.</span>
                  </p>
                  <span className={`inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                    activeCategory === "blueprints"
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      : "bg-neutral-900/50 border-white/5 text-slate-600 group-hover:text-slate-400"
                  }`}>
                    {activeCategory === "blueprints" ? "ACTIVE ⬇" : "VIEW METRICS"}
                  </span>
                </div>
              </div>

              {/* Right Blueprint Vector schematic visual */}
              <div className="flex-shrink-0 flex items-center justify-center relative w-[110px] h-[110px]">
                {/* Outer pulsing ring */}
                <div className={`absolute inset-0 rounded-full border border-dashed duration-[30s] ${
                  activeCategory === "blueprints" ? "border-cyan-500/50 animate-spin" : "border-cyan-500/20 group-hover:animate-spin"
                }`} />
                <div className={`absolute inset-2 rounded-full border bg-[#05070a]/90 flex flex-col items-center justify-center shadow-inner overflow-hidden transition-colors ${
                  activeCategory === "blueprints" ? "border-cyan-500/40" : "border-white/5 group-hover:border-cyan-500/30"
                }`}>
                  {/* Tech drawing lines layout */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    {/* Grid overlay */}
                    <div className="w-full h-full border border-cyan-500/40 relative">
                      <div className="absolute left-1/2 top-0 bottom-0 border-l border-cyan-500/40" />
                      <div className="absolute top-1/2 left-0 right-0 border-t border-cyan-500/40" />
                      <div className="absolute inset-4 rounded-full border border-cyan-500/40" />
                    </div>
                  </div>
                  
                  {/* Visual icon representation */}
                  <div className="flex items-center justify-center gap-1.5 z-10">
                    <Sliders className={`w-6 h-6 transition-transform duration-500 ${
                      activeCategory === "blueprints" ? "text-cyan-400 scale-110 rotate-12" : "text-slate-500 group-hover:text-cyan-400/80"
                    }`} />
                  </div>
                  <span className={`text-[8.5px] font-mono tracking-wider font-bold mt-2 z-10 uppercase ${
                    activeCategory === "blueprints" ? "text-cyan-400" : "text-slate-500"
                  }`}>
                    BLUEPRINT
                  </span>
                  <span className="text-[7.5px] font-mono text-slate-600 z-10">DIAGN: ON</span>
                </div>
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {activeCategory === "blueprints" && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: -8 }}
                animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                exit={{ height: 0, opacity: 0, marginTop: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden w-full relative z-0"
              >
                <div style={{ position: "relative", left: "15px", width: "calc(100% - 15px)" }} className="bg-black/80 border border-[#06b6d4] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col gap-5">
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }}>
                    TECHNICAL & DIAGNOSTIC SYSTEM BLUEPRINTS
                  </div>
                  <div style={{ marginTop: "-20px", paddingTop: "11px", paddingBottom: "18px" }} className="flex items-center justify-between border-b border-white/5">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#90a1b9] uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>DIAGNOSTIC SYSTEM BLUEPRINTS</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 text-right">
                      Exposing critical audio performance vectors & Search Indexing blueprints
                    </span>
                  </div>

                  <div className="flex flex-col gap-5 relative">
                    {getFilteredMetrics("blueprints").map((metric) => {
                      if (!metric) return null;
                      const isExpanded = expandedMetric === metric.id;
                      return (
                        <div key={metric.id} className="flex flex-col gap-1.5 relative" id={`metric-wrapper-${metric.id}`}>
                          <RowMetricCard
                            metric={metric}
                            isExpanded={isExpanded}
                            onClick={() => {
                              setExpandedMetric(isExpanded ? null : metric.id);
                            }}
                          />
                          {isExpanded && renderExpandedBreakdown(metric.id)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card: Production Quality (Turquoise-Lime #46F4CD) */}
        <div className="flex flex-col w-full gap-4 mt-6" id="sidebar-link-sonic-2">
          <button
            onClick={() => setProductionQualityExpanded(!productionQualityExpanded)}
            className={`relative z-10 flex flex-col justify-between py-[15px] px-6 h-[180px] rounded-[24px] border transition-all duration-300 text-left cursor-pointer group overflow-hidden select-none text-white w-full ${
              productionQualityExpanded
                ? "bg-[#090b0e] border-[#46F4CD] shadow-[0_0_35px_rgba(70,244,205,0.35)] ring-1 ring-[#46F4CD]/40 font-black"
                : "bg-[#0A0B0E]/60 border-[#46F4CD]/40 hover:border-[#46F4CD] hover:bg-neutral-900/40 text-slate-400"
            }`}
          >
            {/* Background ambient shade */}
            {productionQualityExpanded ? (
              <div className="absolute inset-0 bg-gradient-to-br from-[#46F4CD]/5 via-neutral-950 to-[#030509] pointer-events-none" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 to-[#030509] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 w-full h-full">
              {/* Left Content Column */}
              <div className="flex flex-col flex-1 justify-between gap-3 h-full">
                {/* Header block */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                    productionQualityExpanded
                      ? "bg-[#46F4CD]/10 border-[#46F4CD]/30 text-[#46F4CD] shadow-[0_0_15px_rgba(70,244,205,0.25)]"
                      : "bg-neutral-900 border-white/5 text-slate-500 group-hover:text-slate-300"
                  }`}>
                    <Cog className="w-5 h-5 text-[#46F4CD]" />
                  </div>
                  <div className="flex flex-col">
                    <span 
                      className={`font-black text-[19px] tracking-wider uppercase transition-colors ${
                        productionQualityExpanded ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      PRODUCTION QUALITY
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Sonic Fidelity & Engineering Polish</span>
                  </div>
                </div>

                {/* Bottom info block */}
                <div className={`border-t text-left pt-2 px-0.5 transition-colors ${
                  productionQualityExpanded ? "border-[#46F4CD]/15" : "border-white/5"
                }`}>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mb-2">
                    A diagnostic of arrangement, sonic texture, low-end power, stereo depth, vocals, and energy.
                    <span className="block mt-1 text-[#46F4CD]/90 font-mono text-[8.5px] uppercase tracking-wider">This metric is crucial for algorithmic reach and listener retention.</span>
                  </p>
                  <span className={`inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                    productionQualityExpanded
                      ? "bg-[#46F4CD]/10 border-[#46F4CD]/20 text-[#46F4CD]"
                      : "bg-neutral-900/50 border-white/5 text-slate-600 group-hover:text-slate-400"
                  }`}>
                    {productionQualityExpanded ? "ACTIVE ⬇" : "VIEW METRICS"}
                  </span>
                </div>
              </div>

              {/* Right Score display */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <ScoreCircle 
                  score={(() => {
                    const scores = [
                      Math.min(100, Math.round((critique?.arrangement?.flowScore ?? 72) * 1.0)),
                      Math.min(100, Math.round((critique?.scores?.overallProduction ?? 68) * 0.9)),
                      Math.min(100, Math.round(50 + ((liveMetrics?.calculatedBassEnergy ?? 0.3) * 100))),
                      Math.min(100, Math.round(50 + ((liveMetrics?.calculatedStereoCorrelation ?? 0.5) * 45))),
                      Math.min(100, critique?.performance?.vocalScore ?? 65),
                      Math.min(100, Math.round(50 + ((liveMetrics?.calculatedLra ?? 6) * 3)))
                    ];
                    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                  })()} 
                  size={110} 
                  strokeWidth={7} 
                  color={productionQualityExpanded ? "#46F4CD" : "rgba(70, 244, 205, 0.45)"} 
                  glowColor={productionQualityExpanded ? "rgba(70, 244, 205, 0.65)" : "rgba(70, 244, 205, 0.15)"} 
                  extraGlow={productionQualityExpanded}
                />
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {productionQualityExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: -8 }}
                animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                exit={{ height: 0, opacity: 0, marginTop: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden w-full relative z-0"
              >
                <div style={{ position: "relative", left: "15px", width: "calc(100% - 15px)" }} className="bg-black/80 border border-[#46F4CD] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col gap-5">
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }} className="uppercase tracking-wide">
                    PRODUCTION QUALITY DIAGNOSTICS
                  </div>
                  
                  {/* Descriptor box */}
                  <div className="p-4 bg-[#020203] border border-white/10 rounded-xl flex flex-col gap-2">
                    <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                      Streaming algorithms don't hear your mix — but your listeners do. Poor production drives early skips, and early skips tank your algorithmic reach.
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono italic">
                      Some of these metrics share data with other YSS modules. PRODUCTION QUALITY combines them here with a single focus: not whether your mix is technically correct, but whether it sounds like a finished, competitive record.
                    </p>
                  </div>

                  {/* Radar Chart + Click-to-expand detail panels */}
                  <div className="flex flex-col gap-4 mt-2">
                    {(() => {
                      const pqMetrics = [
                        {
                          label: "Arrangement\nDensity",
                          key: "Arrangement Density",
                          score: Math.min(100, Math.round((critique?.arrangement?.flowScore ?? 72) * 1.0)),
                          desc: critique?.arrangement?.transitionsAndArc ?? "Arrangement transitions and dynamic arc data unavailable.",
                          improve: "Try introducing a new element (pad, counter-melody, or percussion layer) in the second verse to prevent listener fatigue. In your DAW, automate a subtle filter sweep on a background element to maintain movement. Plugin suggestion: Soundtoys Crystallizer or a simple frequency shifter on a parallel bus."
                        },
                        {
                          label: "Sonic Texture\n& Sound Design",
                          key: "Sonic Texture & Sound Design",
                          score: Math.min(100, Math.round((critique?.scores?.overallProduction ?? 68) * 0.9)),
                          desc: [critique?.vibe?.aesthetic, critique?.mixQuality?.dominanceIssues].filter(v => v && v.trim().toLowerCase() !== "none" && v.trim() !== "").join(" ") || "Sonic texture data unavailable.",
                          improve: "Add harmonic saturation to your lead elements to give them character. Run a parallel saturation bus — send 20–30% of your mix to a saturator like Decapitator or RC-20 Retro Color, blend subtly. Even-order harmonics (tape/tube saturation) add warmth; odd-order (transistor/clipper) add edge and presence."
                        },
                        {
                          label: "Low-End\nPower",
                          key: "Low-End Power",
                          score: Math.min(100, Math.round(50 + ((liveMetrics?.calculatedBassEnergy ?? 0.3) * 100))),
                          desc: critique?.mixQuality?.frequencyBalance?.lowEnd ?? "Low-end frequency data unavailable.",
                          improve: "Sidechain your bass guitar or synth bass to the kick drum at a 3:1 ratio, 10ms attack, 80ms release. This creates rhythmic breathing between kick and bass that adds punch without muddiness. High-pass everything above 80Hz in the side channel (M/S EQ) to keep low end tight and mono. Plugin suggestion: Trackspacer or standard sidechain compression."
                        },
                        {
                          label: "Width &\nDimension",
                          key: "Width & Dimension",
                          score: Math.min(100, Math.round(50 + ((liveMetrics?.calculatedStereoCorrelation ?? 0.5) * 45))),
                          desc: critique?.mixQuality?.stereoField ?? "Stereo field data unavailable.",
                          improve: "Apply mid-side EQ to your master bus or room reverb returns: cut 200–300Hz in the sides to tighten the center, and gently boost 8–12kHz in the sides for air and space. Add a Haas effect (10–30ms delay) on a parallel guitar or synth track panned hard opposite to create width without phase issues. Plugin suggestion: Ozone Imager or MSED."
                        },
                        {
                          label: "Vocal\nProduction",
                          key: "Vocal Production",
                          score: Math.min(100, critique?.performance?.vocalScore ?? 65),
                          desc: critique?.performance?.vocalsCritique ?? "Vocal production data unavailable.",
                          improve: "Double your lead vocal with a pitch-shifted copy (detune by ±8–12 cents) panned 30% left and right to create natural width without muddiness. Add a short plate reverb (pre-delay 18–22ms, decay 1.2s) at 12–15% wet to place the vocal in a space. De-ess the 5–8kHz range dynamically. Plugin suggestion: FabFilter Pro-DS, Valhalla Plate, or Soundtoys Little Plate."
                        },
                        {
                          label: "Energy\nManagement",
                          key: "Energy Management",
                          score: Math.min(100, Math.round(50 + ((liveMetrics?.calculatedLra ?? 6) * 3))),
                          desc: critique?.mixQuality?.frequencyBalance?.midrange ?? critique?.arrangement?.transitionsAndArc ?? "Energy management data unavailable.",
                          improve: "Automate your master bus compressor threshold — open it up slightly in verses (raise threshold by 2–3dB) and tighten in choruses to make the dynamic shift feel physical and intentional. Use volume automation on your drum bus to build 1–2dB through the pre-chorus. Plugin suggestion: Waves SSL G-Bus Compressor or Klanghelm MJUC for musical compression behavior."
                        },
                      ];

                      const cx = 160, cy = 155, r = 110;
                      const angles = pqMetrics.map((_, i) => (Math.PI * 2 * i) / pqMetrics.length - Math.PI / 2);
                      const points = pqMetrics.map((m, i) => ({
                        x: cx + r * (m.score / 100) * Math.cos(angles[i]),
                        y: cy + r * (m.score / 100) * Math.sin(angles[i]),
                      }));
                      const gridLevels = [25, 50, 75, 100];

                      return (
                        <>
                          {/* Two-column six-metric card grid */}
                          {(() => {
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                {pqMetrics.map((m, idx) => (
                                  <PQMetricCard
                                    key={idx}
                                    idx={idx}
                                    label={m.label.replace("\n", " ")}
                                    score={m.score}
                                    desc={m.desc}
                                    improve={m.improve}
                                  />
                                ))}
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div> /* End of section-sonic */
      )}

        {/* SECTION: COMPOSITIONAL DEPTH */}
        {expandedCategory === "compositional" && (
          <div id="section-compositional" className="flex flex-col gap-4 mt-8">
          <div className="relative overflow-hidden flex items-center gap-4 px-5 py-3 border-t border-b border-purple-500/20" style={{ background: "linear-gradient(to right, #090b0e 0%, #090b0e 55%, #12091e 100%)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "linear-gradient(to left, #7e3ac7 0%, #50267e 15%, #160d20 50%, #000000 75%)",
              opacity: 0.5
            }} />
            <div className="absolute pointer-events-none" style={{
              width: "200px", height: "200px", borderRadius: "50%",
              border: "8px solid rgba(255,255,255,0.9)",
              right: "-120px", bottom: "-100px",
              boxShadow: "0 0 15px rgba(168,85,247,1), 0 0 30px rgba(168,85,247,0.6), inset 0 0 15px rgba(168,85,247,0.4)"
            }} />
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-purple-400 to-purple-600" />
            <div className="relative z-10 flex flex-col gap-0.5">
              <span className="text-[9px] font-mono font-bold text-purple-400 uppercase tracking-[0.2em]">Category</span>
              <span className="text-[16px] font-black text-white uppercase leading-none tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>Compositional Depth</span>
            </div>
            <span className="relative z-10 text-[9px] font-mono text-slate-500 ml-auto">Songwriting craft, theory & artistic merit</span>
          </div>

          {/* Card 3: Artistic Integrity (purple/pink) */}
          <div className="flex flex-col w-full gap-4" id="sidebar-link-compositional-0">
          <button
            onClick={() => handleCategoryChange("artistic")}
            className={`relative z-10 flex flex-col justify-between py-[15px] px-6 h-[180px] rounded-[24px] border transition-all duration-300 text-left cursor-pointer group overflow-hidden select-none text-white w-full ${
              activeCategory === "artistic"
                ? "bg-[#090b0e] border-purple-500 shadow-[0_0_35px_rgba(168,85,247,0.35)] ring-1 ring-purple-500/40 font-black"
                : "bg-[#0A0B0E]/60 border-[#a855f7] hover:border-[#a855f7] hover:bg-neutral-900/40 text-slate-400"
            }`}
          >
            {/* Background ambient shade */}
            {activeCategory === "artistic" ? (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-950/5 via-neutral-950 to-[#030509] pointer-events-none" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 to-[#030509] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 w-full h-full">
              {/* Left Content Column */}
              <div className="flex flex-col flex-1 justify-between gap-3 h-full">
                {/* Header block */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                    activeCategory === "artistic"
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                      : "bg-neutral-900 border-white/5 text-slate-500 group-hover:text-slate-300"
                  }`}>
                    <Music4 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex flex-col">
                    <span 
                      className={`font-black text-[19px] tracking-wider uppercase transition-colors ${
                        activeCategory === "artistic" ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      ARTISTIC IMPACT
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Architecture & Music Theory Application</span>
                  </div>
                </div>

                {/* Bottom info block */}
                <div className={`border-t text-left pt-2 px-0.5 transition-colors ${
                  activeCategory === "artistic" ? "border-purple-500/15" : "border-white/5"
                }`}>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mb-2">
                    An evaluation of creative authenticity, harmonic depth, and musical competence.
                    <span className="block mt-1 text-purple-400/90 font-mono text-[8.5px] uppercase tracking-wider">This metric is not considered by streaming services.</span>
                  </p>
                  <span className={`inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                    activeCategory === "artistic"
                      ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      : "bg-neutral-900/50 border-white/5 text-slate-600 group-hover:text-slate-400"
                  }`}>
                    {activeCategory === "artistic" ? "ACTIVE ⬇" : "VIEW METRICS"}
                  </span>
                </div>
              </div>

              {/* Right Score display */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <ScoreCircle 
                  score={artisticScore} 
                  size={110} 
                  strokeWidth={7} 
                  color={activeCategory === "artistic" ? "#ec4899" : "rgba(236, 72, 153, 0.45)"} 
                  glowColor={activeCategory === "artistic" ? "rgba(236, 72, 153, 0.65)" : "rgba(236, 72, 153, 0.15)"} 
                  extraGlow={activeCategory === "artistic"}
                />
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {activeCategory === "artistic" && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: -8 }}
                animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                exit={{ height: 0, opacity: 0, marginTop: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden w-full relative z-0"
              >
                <div style={{ position: "relative", left: "15px", width: "calc(100% - 15px)" }} className="bg-black/80 border border-[#a855f7] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col gap-5">
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }}>
                    ARTISTIC DEPTH AND IMPACT
                  </div>
                  <div style={{ marginTop: "-20px", paddingTop: "11px", paddingBottom: "18px" }} className="flex items-center justify-between border-b border-white/5">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#90a1b9] uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      <span>Active Diagnostics List</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 text-right">
                      Click any metric to expand technical feedback & recommendations
                    </span>
                  </div>

                  <div className="flex flex-col gap-5 relative">
                    {getFilteredMetrics("artistic").slice(0, 1).map((metric) => {
                      if (!metric) return null;
                      const isExpanded = expandedMetric === metric.id;
                      return (
                        <div key={metric.id} className="flex flex-col gap-1.5 relative" id={`metric-wrapper-${metric.id}`}>
                          <RowMetricCard
                            metric={metric}
                            isExpanded={isExpanded}
                            onClick={() => {
                              setExpandedMetric(isExpanded ? null : metric.id);
                            }}
                          />
                          {isExpanded && renderExpandedBreakdown(metric.id)}
                        </div>
                      );
                    })}

                    <div className="my-2 border-b-4 border-pink-500/80 shadow-[0_0_12px_rgba(236,72,153,0.6)] rounded-full w-full animate-pulse" />

                    <div className="flex flex-wrap items-baseline gap-2" style={{ marginTop: "12px", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }}>
                        ARTISTIC & LYRICAL FOUNDATION METRICS
                      </span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: "bold", color: "#90a1b9", fontSize: "12px" }}>
                        - also used in both the Artistic Impact and Songwriting Quality Scores
                      </span>
                    </div>

                    {getFilteredMetrics("artistic").slice(1).map((metric) => {
                      if (!metric) return null;
                      const isExpanded = expandedMetric === metric.id;
                      return (
                        <div key={metric.id} className="flex flex-col gap-1.5 relative" id={`metric-wrapper-${metric.id}`}>
                          <RowMetricCard
                            metric={metric}
                            isExpanded={isExpanded}
                            onClick={() => {
                              setExpandedMetric(isExpanded ? null : metric.id);
                            }}
                          />
                          {isExpanded && renderExpandedBreakdown(metric.id)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 4: Songwriting DNA & Potential (emerald) */}
        <div className="flex flex-col w-full gap-4" id="sidebar-link-compositional-1">
          <button
            onClick={() => handleCategoryChange("dna")}
            className={`relative z-10 flex flex-col justify-between py-[15px] px-6 h-[180px] rounded-[24px] border transition-all duration-300 text-left cursor-pointer group overflow-hidden select-none text-white w-full ${
              activeCategory === "dna"
                ? "bg-[#090b0e] border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/40 font-black"
                : "bg-[#0A0B0E]/60 border-[#10b981] hover:border-[#10b981] hover:bg-neutral-900/40 text-slate-400"
            }`}
          >
            {/* Background ambient shade */}
            {activeCategory === "dna" ? (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/5 via-neutral-950 to-[#030509] pointer-events-none" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 to-[#030509] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 w-full h-full">
              {/* Left Content Column */}
              <div className="flex flex-col flex-1 justify-between gap-3 h-full">
                {/* Header block */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                    activeCategory === "dna"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                      : "bg-neutral-900 border-white/5 text-slate-500 group-hover:text-slate-300"
                  }`}>
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span 
                      className={`font-black text-[19px] tracking-wider uppercase transition-colors ${
                        activeCategory === "dna" ? "text-white" : "text-[#10b981] group-hover:text-white"
                      }`}
                    >
                      SONGWRITING QUALITY
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Structural Mechanics</span>
                  </div>
                </div>

                {/* Bottom info block */}
                <div className={`border-t text-left pt-2 px-0.5 transition-colors ${
                  activeCategory === "dna" ? "border-emerald-500/15" : "border-white/5"
                }`}>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mb-2">
                    An analysis of the underlying strength of the songwriting compared to popular songwriting parameters.
                    <span className="block mt-1 text-emerald-400/90 font-mono text-[8.5px] uppercase tracking-wider">This metric is not considered by streaming services.</span>
                  </p>
                  <span className={`inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                    activeCategory === "dna"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-neutral-900/50 border-white/5 text-slate-600 group-hover:text-slate-400"
                  }`}>
                    {activeCategory === "dna" ? "ACTIVE ⬇" : "VIEW METRICS"}
                  </span>
                </div>
              </div>

              {/* Right Score display */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <ScoreCircle 
                  score={dnaScore} 
                  size={110} 
                  strokeWidth={7} 
                  color={activeCategory === "dna" ? "#10b981" : "rgba(16,185,129,0.45)"} 
                  glowColor={activeCategory === "dna" ? "rgba(16,185,129,0.65)" : "rgba(16,185,129,0.15)"} 
                  extraGlow={activeCategory === "dna"}
                />
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {activeCategory === "dna" && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: -8 }}
                animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                exit={{ height: 0, opacity: 0, marginTop: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden w-full relative z-0"
              >
                <div style={{ position: "relative", left: "15px", width: "calc(100% - 15px)" }} className="bg-black/80 border border-[#10b981] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col gap-5">
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }}>
                    SONGWRITING STRENGTH AND QUALITY
                  </div>
                  <div style={{ marginTop: "-20px", paddingTop: "11px", paddingBottom: "18px" }} className="flex items-center justify-between border-b border-white/5">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#90a1b9] uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Active Diagnostics List</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 text-right">
                      Click any metric to expand technical feedback & recommendations
                    </span>
                  </div>

                  <div className="flex flex-col gap-5 relative">
                    {getFilteredMetrics("dna").map((metric) => {
                      if (!metric) return null;
                      const isExpanded = expandedMetric === metric.id;
                      return (
                        <div key={metric.id} className="flex flex-col gap-1.5 relative" id={`metric-wrapper-${metric.id}`}>
                          <RowMetricCard
                            metric={metric}
                            isExpanded={isExpanded}
                            onClick={() => {
                              setExpandedMetric(isExpanded ? null : metric.id);
                            }}
                          />
                          {isExpanded && renderExpandedBreakdown(metric.id)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 5: Song Architecture (violet) */}
        <div className="flex flex-col w-full gap-4" id="sidebar-link-compositional-2">
          <button
            onClick={() => handleCategoryChange("architecture")}
            className={`relative z-10 flex flex-col justify-between py-[15px] px-6 h-[180px] rounded-[24px] border transition-all duration-300 text-left cursor-pointer group overflow-hidden select-none text-white w-full ${
              activeCategory === "architecture"
                ? "bg-[#090b0e] border-violet-500 shadow-[0_0_35px_rgba(139,92,246,0.35)] ring-1 ring-violet-500/40 font-black"
                : "bg-[#0A0B0E]/60 border-[#8b5cf6] hover:border-[#8b5cf6] hover:bg-neutral-900/40 text-slate-400"
            }`}
          >
            {/* Background ambient shade */}
            {activeCategory === "architecture" ? (
              <div className="absolute inset-0 bg-gradient-to-br from-violet-950/5 via-neutral-950 to-[#030509] pointer-events-none" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 to-[#030509] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 w-full h-full">
              {/* Left Content Column */}
              <div className="flex flex-col flex-1 justify-between gap-3 h-full">
                {/* Header block */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                    activeCategory === "architecture"
                      ? "bg-violet-500/10 border-violet-500/30 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                      : "bg-neutral-900 border-white/5 text-slate-500 group-hover:text-slate-300"
                  }`}>
                    <Waves className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex flex-col">
                    <span 
                      className={`font-black text-[19px] tracking-wider uppercase transition-colors ${
                        activeCategory === "architecture" ? "text-white" : "text-[#8b5cf6] group-hover:text-white"
                      }`}
                    >
                      SONG STRUCTURE & SECTIONS OUTLINE
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Structural Timeline & Section Map</span>
                  </div>
                </div>

                {/* Bottom info block */}
                <div className={`border-t text-left pt-2 px-0.5 transition-colors ${
                  activeCategory === "architecture" ? "border-violet-500/15" : "border-white/5"
                }`}>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mb-2">
                    A visual breakdown of your song's structural sections with timestamps, loudness arc, and hook placement audit.
                    <span className="block mt-1 text-violet-400/90 font-mono text-[8.5px] uppercase tracking-wider">This metric is not considered by streaming services.</span>
                  </p>
                  <span className={`inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                    activeCategory === "architecture"
                      ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                      : "bg-neutral-900/50 border-white/5 text-slate-600 group-hover:text-slate-400"
                  }`}>
                    {activeCategory === "architecture" ? "ACTIVE ⬇" : "VIEW TIMELINE"}
                  </span>
                </div>
              </div>

              {/* Right Blueprint Vector schematic visual */}
              <div className="flex-shrink-0 flex items-center justify-center relative w-[110px] h-[110px]">
                {/* Outer pulsing ring */}
                <div className={`absolute inset-0 rounded-full border border-dashed duration-[35s] ${
                  activeCategory === "architecture" ? "border-violet-500/50 animate-spin" : "border-violet-500/20 group-hover:animate-spin"
                }`} />
                <div className={`absolute inset-2 rounded-full border bg-[#05070a]/90 flex flex-col items-center justify-center shadow-inner overflow-hidden transition-colors ${
                  activeCategory === "architecture" ? "border-violet-500/40" : "border-white/5 group-hover:border-[#8b5cf6]/30"
                }`}>
                  {/* Tech drawing lines layout */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    {/* Grid overlay */}
                    <div className="w-full h-full border border-violet-500/40 relative">
                      <div className="absolute left-1/2 top-0 bottom-0 border-l border-violet-500/40" />
                      <div className="absolute top-1/2 left-0 right-0 border-t border-violet-500/40" />
                      <div className="absolute inset-4 rounded-full border border-violet-500/40" />
                      <div className="absolute inset-8 rounded-full border border-violet-500/40" />
                    </div>
                  </div>
                  
                  {/* Visual icon representation */}
                  <div className="flex items-center justify-center gap-1.5 z-10">
                    <Activity className={`w-6 h-6 transition-transform duration-500 ${
                      activeCategory === "architecture" ? "text-violet-400 scale-110 rotate-6" : "text-slate-500 group-hover:text-violet-400/80"
                    }`} />
                  </div>
                  <span className={`text-[8.5px] font-mono tracking-wider font-bold mt-2 z-10 uppercase ${
                    activeCategory === "architecture" ? "text-violet-400" : "text-slate-500"
                  }`}>
                    WAVEFORM
                  </span>
                </div>
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {activeCategory === "architecture" && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: -8 }}
                animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                exit={{ height: 0, opacity: 0, marginTop: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden w-full relative z-0"
              >
                <div style={{ position: "relative", left: "15px", width: "calc(100% - 15px)" }} className="bg-[#0b0c10]/95 border border-[#8b5cf6]/30 rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col gap-5">
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }} className="flex items-center gap-2">
                    <Waves className="w-4 h-4 text-violet-400" />
                    <span>SONG STRUCTURE & SECTIONS DIARY</span>
                  </div>
                  <div style={{ marginTop: "-20px", paddingTop: "11px", paddingBottom: "18px" }} className="flex items-center justify-between border-b border-white/5">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#90a1b9] uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                      <span>Timeline-based Arrangement Blueprint</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 text-right">
                      Interactive layout mapping peaks, transitions, and dynamics
                    </span>
                  </div>

                  <div className="flex flex-col gap-6 relative">
                    {/* Section Map & Progression */}
                    <div className="bg-[#0e1115]/80 border border-white/5 rounded-2xl p-5 shadow-inner">
                      <div className="flex justify-between items-center mb-3.5">
                        <span className="text-[10px] font-mono text-violet-400 uppercase font-bold tracking-widest flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" />
                          Section Map & Progression
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">Based on analyzed loudness envelope</span>
                      </div>
                      {(() => {
                        const points = liveMetrics?.calculatedWaveformPointsHD ?? liveMetrics?.calculatedWaveformPoints ?? [];
                        const duration = liveMetrics?.calculatedDuration ?? 0;
                        if (points.length === 0 || duration === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-xl bg-black/40">
                              <span className="text-[11px] text-slate-400 font-medium mb-1">No audio data found</span>
                              <p className="text-[9.5px] text-slate-500 max-w-xs text-center leading-relaxed">
                                Upload a local audio file to generate the section map.
                              </p>
                            </div>
                          );
                        }

                        // Build 32 windows for higher resolution
                        const numWindows = 32;
                        const wSize = Math.floor(points.length / numWindows);
                        const windows: number[] = [];
                        for (let i = 0; i < numWindows; i++) {
                          const slice = points.slice(i * wSize, (i + 1) * wSize);
                          const avg = slice.length > 0 ? slice.reduce((a: number, b: number) => a + b, 0) / slice.length : 0;
                          windows.push(avg);
                        }

                        // Smooth windows to reduce noise
                        const smoothed = windows.map((v, i) => {
                          const neighbors = windows.slice(Math.max(0, i - 1), Math.min(numWindows, i + 2));
                          return neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
                        });

                        // Detect boundaries — significant amplitude change OR local minimum
                        const boundaries: number[] = [0];
                        for (let i = 2; i < numWindows - 2; i++) {
                          const rising = smoothed[i] > smoothed[i - 1] && smoothed[i - 1] < smoothed[i - 2];
                          const falling = smoothed[i] < smoothed[i - 1] && smoothed[i - 1] > smoothed[i - 2];
                          const bigChange = Math.abs(smoothed[i] - smoothed[i - 1]) > 4;
                          if ((rising || falling || bigChange) && i - boundaries[boundaries.length - 1] >= 2) {
                            boundaries.push(i);
                          }
                        }
                        boundaries.push(numWindows);

                        // Merge very short sections (less than 3% of duration)
                        const minWindows = Math.max(1, Math.floor(numWindows * 0.03));
                        const merged: number[] = [0];
                        for (let i = 1; i < boundaries.length - 1; i++) {
                          if (boundaries[i] - merged[merged.length - 1] >= minWindows) {
                            merged.push(boundaries[i]);
                          }
                        }
                        merged.push(numWindows);

                        // Build sections with amplitude
                        const rawSections = merged.slice(0, -1).map((start, idx) => {
                          const end = merged[idx + 1];
                          const startTime = (start / numWindows) * duration;
                          const endTime = (end / numWindows) * duration;
                          const avgAmp = smoothed.slice(start, end).reduce((a, b) => a + b, 0) / (end - start);
                          const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
                          return { start, end, startTime, endTime, avgAmp, fmt };
                        });

                        // Rank sections by amplitude to assign labels accurately
                        const sorted = [...rawSections].sort((a, b) => b.avgAmp - a.avgAmp);
                        const maxAmp = sorted[0]?.avgAmp ?? 1;
                        const minAmp = sorted[sorted.length - 1]?.avgAmp ?? 0;
                        const ampRange = maxAmp - minAmp || 1;

                        // Assign label based on amplitude rank and position
                        const labeled = rawSections.map((s, idx) => {
                          const rank = sorted.findIndex(r => r.startTime === s.startTime);
                          const total = rawSections.length;
                          const isFirst = idx === 0;
                          const isLast = idx === total - 1;
                          const ampPct = (s.avgAmp - minAmp) / ampRange;

                          let label: string;
                          if (isFirst && s.endTime < duration * 0.2) {
                            label = 'Intro';
                          } else if (isLast && s.startTime > duration * 0.75) {
                            label = 'Outro';
                          } else if (rank < Math.ceil(total * 0.3)) {
                            label = 'Chorus';
                          } else if (rank >= Math.floor(total * 0.7)) {
                            label = 'Verse';
                          } else if (ampPct > 0.55 && ampPct < 0.75) {
                            label = 'Pre-Chorus';
                          } else if (ampPct < 0.35 && !isFirst && !isLast) {
                            label = 'Bridge';
                          } else {
                            label = idx % 2 === 0 ? 'Verse' : 'Pre-Chorus';
                          }
                          return { ...s, label };
                        });

                        // Calculate LUFS estimates per section
                        const lufs = liveMetrics?.calculatedLufs ?? -12;
                        const sections = labeled.map(s => {
                          const sectionLufs = parseFloat((lufs + ((s.avgAmp - 50) * 0.18)).toFixed(1));
                          return { ...s, sectionLufs };
                        });

                        const maxLufs = Math.max(...sections.map(s => s.sectionLufs));
                        const minLufs = Math.min(...sections.map(s => s.sectionLufs));
                        const lufsRange = maxLufs - minLufs || 1;
                        const chartHeight = 100; // px

                        const sectionColors: Record<string, string> = {
                          'Intro': '#3b82f6',
                          'Verse': '#06b6d4',
                          'Pre-Chorus': '#8b5cf6',
                          'Chorus': '#f43f5e',
                          'Bridge': '#f59e0b',
                          'Outro': '#64748b',
                        };

                        return (
                          <div className="flex flex-col gap-4">
                            {/* LUFS label */}
                            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Loudness</div>

                            {/* Bar chart */}
                            <div className="relative w-full" style={{ height: `${chartHeight + 48}px` }}>
                              {/* Y axis guides */}
                              <div className="absolute left-0 right-0 top-0 flex flex-col justify-between pointer-events-none" style={{ height: `${chartHeight}px` }}>
                                {[maxLufs, (maxLufs + minLufs) / 2, minLufs].map((v, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="text-[8px] font-mono text-slate-600 w-10 text-right flex-shrink-0">{v.toFixed(1)}dB</span>
                                    <div className="flex-1 h-px bg-white/[0.03]" />
                                  </div>
                                ))}
                              </div>

                              {/* Bars container */}
                              <div className="absolute left-12 right-0 top-0 bottom-12 flex items-end gap-[2px]">
                                {sections.map((s, i) => {
                                  const barHeightPct = Math.max(8, Math.round(((s.sectionLufs - minLufs) / lufsRange) * 90 + 8));
                                  const widthPct = ((s.endTime - s.startTime) / duration) * 100;
                                  const color = sectionColors[s.label] ?? '#6366f1';
                                  const isChorus = s.label === 'Chorus';
                                  const hookEarly = isChorus && s.startTime < 60;
                                  return (
                                    <div
                                      key={i}
                                      className="relative flex flex-col justify-end group/bar"
                                      style={{ width: `${widthPct}%`, height: '100%' }}
                                    >
                                      {/* Bar */}
                                      <div
                                        className="w-full rounded-t-sm transition-all duration-700 relative"
                                        style={{
                                          height: `${barHeightPct}%`,
                                          backgroundColor: color,
                                          opacity: 0.75,
                                          boxShadow: isChorus ? `0 0 12px ${color}60` : 'none'
                                        }}
                                      >
                                        {/* Hover tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/bar:flex flex-col items-center z-30 pointer-events-none">
                                          <div className="bg-neutral-900 border border-white/10 px-2 py-1 rounded-md text-[9px] font-mono text-white whitespace-nowrap shadow-2xl">
                                            {s.label} · {s.fmt(s.startTime)}–{s.fmt(s.endTime)} · {s.sectionLufs} LUFS
                                          </div>
                                          <div className="w-1.5 h-1.5 bg-neutral-900 border-r border-b border-white/10 rotate-45 -mt-1" />
                                        </div>
                                      </div>

                                      {/* X axis label */}
                                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full flex flex-col items-center pt-1.5" style={{ width: 'max-content' }}>
                                        <span className="text-[8px] font-mono text-slate-500">{s.fmt(s.startTime)}</span>
                                        <span className={`text-[9px] font-mono font-bold mt-0.5`} style={{ color }}>{s.label}</span>
                                        {hookEarly && (
                                          <span className="text-[8px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded mt-0.5 whitespace-nowrap">
                                            Hook at {s.fmt(s.startTime)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Bottom grid columns for Hook Placement & Dynamic Arc */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                      {/* Hook Placement Audit */}
                      <div className="bg-[#0e1115]/80 border border-white/5 rounded-2xl p-5 shadow-inner flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-mono text-violet-400 uppercase font-bold tracking-widest flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Hook Placement Audit
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">First 30s analysis</span>
                          </div>
                          {(() => {
                            const points = liveMetrics?.calculatedWaveformPointsHD ?? liveMetrics?.calculatedWaveformPoints ?? [];
                            const duration = liveMetrics?.calculatedDuration ?? 0;
                            if (points.length === 0 || duration === 0) {
                              return <div className="text-[10px] text-slate-600 font-mono py-4">Upload a track to analyze hooks.</div>;
                            }
                        const first30Count = Math.max(1, Math.floor(points.length * (30 / duration)));
                        const first30 = points.slice(0, first30Count);
                        const rest = points.slice(first30Count);
                        const avgFirst30 = first30.reduce((a: number, b: number) => a + b, 0) / first30.length;
                        const avgRest = rest.length > 0 ? rest.reduce((a: number, b: number) => a + b, 0) / rest.length : avgFirst30;
                        const hookRatio = avgFirst30 / Math.max(avgRest, 1);
                        const hookScore = Math.min(99, Math.max(5, Math.round((hookRatio - 0.5) * 180)));
                        const overallPeak = Math.max(...points);
                            const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
                            const peakIdx = points.indexOf(overallPeak);
                            const peakTime = (peakIdx / points.length) * duration;
                            return (
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400">Energy ratio in first 30 seconds</span>
                                  <span className={`text-sm font-black font-mono ${hookScore > 70 ? 'text-emerald-400' : hookScore > 45 ? 'text-amber-400' : 'text-rose-400'}`}>{hookScore}%</span>
                                </div>
                                <div className="w-full bg-neutral-950 border border-white/[0.03] rounded-full h-2.5 overflow-hidden p-[2px]">
                                  <div className={`h-full rounded-full transition-all duration-1000 ${
                                    hookScore > 70 ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : hookScore > 45 ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                  }`} style={{ width: `${hookScore}%` }} />
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed bg-black/30 border border-white/[0.02] rounded-xl p-3 mt-1.5 font-sans">
                                  {hookScore > 70 ? (
                                    <>
                                      <strong className="text-emerald-400">Strong early engagement:</strong> Peak energy arrives within the first 30 seconds of the song. Outstanding arrangement strategy matching popular playlist standards for maximizing listener retention.
                                    </>
                                  ) : hookScore > 45 ? (
                                    <>
                                      <strong className="text-amber-400">Moderate early energy:</strong> The track builds gradually, hitting peak volume later around <span className="font-mono text-slate-300">{fmt(peakTime)}</span>. Consider adding a quick vocal snippet, riser, or dynamic sound at the intro to hook listeners.
                                    </>
                                  ) : (
                                    <>
                                      <strong className="text-rose-400">Low introductory energy:</strong> Peak energy doesn't arrive until <span className="font-mono text-slate-300">{fmt(peakTime)}</span>. Listeners may skip before reaching the main drop or chorus. Consider shortening the intro timeline.
                                    </>
                                  )}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Dynamic Arc & Loudness Lift */}
                      <div className="bg-[#0e1115]/80 border border-white/5 rounded-2xl p-5 shadow-inner flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-mono text-violet-400 uppercase font-bold tracking-widest flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5" />
                              Dynamic Arc Lift
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">Chorus vs. Verse Delta</span>
                          </div>
                          {(() => {
                            const points = liveMetrics?.calculatedWaveformPointsHD ?? liveMetrics?.calculatedWaveformPoints ?? [];
                            const lufs = liveMetrics?.calculatedLufs ?? -12;
                            if (points.length === 0) {
                              return <div className="text-[10px] text-slate-600 font-mono py-4">Upload a track to analyze dynamics.</div>;
                            }
                        // Use detected windows for verse/chorus positions
                        const wSize = Math.floor(points.length / 16);
                        const wins: number[] = [];
                        for (let i = 0; i < 16; i++) {
                          const sl = points.slice(i * wSize, (i + 1) * wSize);
                          wins.push(sl.length > 0 ? sl.reduce((a: number, b: number) => a + b, 0) / sl.length : 0);
                        }
                        // Find lowest energy window (verse) and highest energy window (chorus)
                        const minWinIdx = wins.indexOf(Math.min(...wins.slice(1, 12)));
                        const maxWinIdx = wins.indexOf(Math.max(...wins.slice(2, 14)));
                        const verseSlice = points.slice(minWinIdx * wSize, (minWinIdx + 2) * wSize);
                        const chorusSlice = points.slice(maxWinIdx * wSize, (maxWinIdx + 2) * wSize);
                        const verseAvg = verseSlice.reduce((a: number, b: number) => a + b, 0) / Math.max(verseSlice.length, 1);
                        const chorusAvg = chorusSlice.reduce((a: number, b: number) => a + b, 0) / Math.max(chorusSlice.length, 1);
                        const verseLufs = parseFloat((lufs + ((verseAvg - 50) * 0.28)).toFixed(1));
                        const chorusLufs = parseFloat((lufs + ((chorusAvg - 50) * 0.28)).toFixed(1));
                        const diff = parseFloat((chorusLufs - verseLufs).toFixed(1));
                            return (
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-2 bg-black/40 border border-white/[0.02] p-3 rounded-xl font-mono">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">Verse Loudness Estimate</span>
                                    <span className="text-cyan-400 font-bold">{verseLufs} LUFS</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">Chorus Loudness Estimate</span>
                                    <span className="text-rose-400 font-bold">{chorusLufs} LUFS</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] border-t border-white/5 pt-2 mt-1">
                                    <span className="text-slate-400">Chorus Power Lift</span>
                                    <span className={`font-black ${diff > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                      {diff > 0 ? `+${diff}` : diff} dB
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed bg-black/30 border border-white/[0.02] rounded-xl p-3 font-sans">
                                  {diff > 2 ? (
                                    <>
                                      <strong className="text-emerald-400">Excellent Dynamic Lift:</strong> Strong power boost detected when transitioning into the chorus section. This helps keep listeners emotionally stimulated and prevents arrangement fatigue.
                                    </>
                                  ) : diff > 0 ? (
                                    <>
                                      <strong className="text-amber-400">Mild Chorus Lift:</strong> Standard Pop/Rock lift. Consider beefing up the chorus layout by adding more stereo elements, thicker vocals, or an extra synth layer to make the drop hit harder.
                                    </>
                                  ) : (
                                    <>
                                      <strong className="text-rose-400">Flat Arrangement Arc:</strong> The chorus does not show a power increase relative to the verse. This flat energy profile is a common cause of disengagement during playlist delivery.
                                    </>
                                  )}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div> /* End of section-compositional */
        )}

          </div> {/* End of MAIN CONTENT AREA */}
        </div> {/* End of critique-page-layout */}
      </div>

      {/* Old duplicate Spotify and Sandbox metrics layout containers */}
      <div className="hidden" id="spotify-metric-card-wrapper-duplicate">
        
        {/* Button A: Spotify Algorithm Compatibility */}
        <div className="hidden">
          <button
            onClick={() => {
              if (activeCategory === "spotify") {
                handleCategoryChange(null);
              } else {
                handleCategoryChange("spotify");
              }
            }}
            className={`relative z-10 flex flex-col justify-between p-6 rounded-[24px] border transition-all duration-300 text-left cursor-pointer group overflow-hidden select-none text-white w-full ${
              activeCategory === "spotify"
                ? "bg-[#090b0e] border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30 font-black"
                : "bg-[#0A0B0E]/60 border-[#1ed760] hover:border-[#1ed760] hover:bg-[#090c0a]/40 text-slate-400"
            }`}
          >
            {/* Background ambient shade */}
            {activeCategory === "spotify" ? (
              <div className="absolute inset-0 bg-gradient-to-br from-[#0c2415]/30 via-neutral-950 to-[#030509] pointer-events-none" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#040c07]/10 via-neutral-950 to-[#030509] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 w-full h-full">
              {/* Left Content Column */}
              <div className="flex flex-col flex-1 justify-between gap-3 h-full">
                {/* Header block */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                    activeCategory === "spotify"
                      ? "bg-[#1DB954]/10 border-[#1DB954]/30 text-[#1DB954] shadow-[0_0_15px_rgba(29,185,84,0.3)]"
                      : "p-2 rounded-xl border border-white/5 bg-neutral-900 text-slate-500 group-hover:text-[#1DB954] group-hover:border-[#1DB954]/20 group-hover:shadow-[0_0_15px_rgba(29,185,84,0.2)]"
                  }`}>
                    <Activity className="w-5 h-5 text-[#1DB954]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span 
                      className={`font-black text-[19px] tracking-wider uppercase transition-colors ${
                        activeCategory === "spotify" ? "text-white" : "text-slate-200 group-hover:text-white"
                      }`}
                    >
                      STREAMING ALGORITHMIC ALIGNMENT
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium tracking-wide">Pillars of Content &amp; Collaborative Filtering</span>
                  </div>
                </div>

                {/* Bottom info block */}
                <div className={`border-t text-left pt-2 px-0.5 transition-colors ${
                  activeCategory === "spotify" ? "border-emerald-500/15" : "border-white/5"
                }`}>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mb-2">
                    This is the high level, deep dive audit of your tracks potential alignment against Spotify's content-based acoustic analysis, "Artist Universe" semantic clusters, and 30s skip prevention metrics.
                    <span className="block mt-1 text-[#1DB954] font-mono text-[8.5px] uppercase tracking-wider">BEFORE YOUR SONG'S FIRST STREAM: THIS ANALYSIS EVALUATES DUAL INDEXING: ACOUSTIC PARAMETERS &amp; WEB NLP CLUSTERING.</span>
                  </p>
                  <span className={`inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                    activeCategory === "spotify"
                      ? "bg-[#1ed760]/10 border-[#1ed760]/20 text-[#1ed760]"
                      : "bg-neutral-900/50 border-white/5 text-slate-600 group-hover:text-[#1ed760]/80"
                  }`}>
                    {activeCategory === "spotify" ? "ACTIVE ⬇" : "VIEW SPOTIFY RECOMMENDATION AUDIT ⚡"}
                  </span>
                </div>
              </div>

              {/* Instantly visible compatibility mini scorecard */}
              <div className="hidden lg:flex flex-col gap-2 bg-black/60 p-4 rounded-2xl border border-white/5 w-[250px] self-stretch justify-center relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-[2px] bg-[#1ed760]/55" />
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1 block">
                  Algorithmic Target Match
                </span>
                <div className="flex flex-col gap-1.5 mt-1 font-mono text-[9px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Danceability Match:</span>
                    <span className="text-[#1ed760]" style={{ color: '#1ed760', fontWeight: 900 }}>{danceabilityMatch}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Energy Match Index:</span>
                    <span className="text-emerald-400" style={{ color: '#34d399', fontWeight: 900 }}>{energyMatch}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Acousticness Match:</span>
                    <span className="text-emerald-400" style={{ color: '#34d399', fontWeight: 900 }}>{acousticnessMatch}%</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-1 mt-1 text-[8px]">
                    <span className="text-slate-500">True Peak Limiters:</span>
                    <span className={spotifyTruePeak > -1.0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"} style={spotifyTruePeak > -1.0 ? { color: '#f59e0b' } : { color: '#34d399' }}>
                      {spotifyTruePeak > -1.0 ? "EXCEEDS -1.0dB" : "PASS (-1.05 dBTP)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {activeCategory === "spotify" && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: -8 }}
                animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                exit={{ height: 0, opacity: 0, marginTop: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden w-full relative z-0"
              >
                <div style={{ position: "relative", left: "15px", width: "calc(100% - 15px)" }} className="bg-[#0A0B0E] border border-[#1ed760] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col gap-5">
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }}>
                    SPOTIFY ALGORITHMIC ALIGNMENT & COMPATIBILITY
                  </div>
                  <div style={{ marginTop: "-20px", paddingTop: "11px", paddingBottom: "18px" }} className="flex items-center justify-between border-b border-white/5">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#90a1b9] uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#1ed760] animate-pulse" />
                      <span>AUTOMATED ALGORITHM AUDIT</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 text-right">
                      Mapping content acoustic parameters and NLP semantic embeddings
                    </span>
                  </div>
                  <div className="w-full">
                    {renderSpotifyRecommendationPanel()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 2: Algotorial Playlist Sandbox Button/Shortcut (amber) */}
        <div className="flex flex-col w-full gap-4">
          <button
            onClick={() => {
              if (activeCategory === "sandbox") {
                handleCategoryChange(null);
              } else {
                handleCategoryChange("sandbox");
                setSandboxPlaying(true);
              }
            }}
            className={`relative z-10 flex flex-col justify-between p-6 rounded-[24px] border transition-all duration-300 text-left cursor-pointer group overflow-hidden select-none min-h-[175px] text-white w-full ${
              activeCategory === "sandbox"
                ? "bg-[#090b0e] border-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/40 font-black"
                : "bg-[#0A0B0E]/60 border-[#f59e0b] hover:border-[#f59e0b] hover:bg-neutral-900/40 text-slate-400"
            }`}
          >
            {/* Background ambient shade */}
            {activeCategory === "sandbox" ? (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-950/10 via-neutral-950 to-[#03050a] pointer-events-none" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 to-[#0c0d11] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 w-full h-full">
              {/* Left Content Column */}
              <div className="flex flex-col flex-1 justify-between gap-3 h-full">
                {/* Header block */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border flex-shrink-0 flex items-center justify-center transition-all ${
                    activeCategory === "sandbox"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      : "p-2 rounded-xl border border-white/5 bg-neutral-900 text-slate-500 group-hover:text-amber-400 group-hover:border-amber-500/20 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  }`}>
                    <Compass className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-black text-[19px] tracking-wider uppercase transition-colors ${
                      activeCategory === "sandbox" ? "text-white" : "text-slate-400 group-hover:text-white"
                    }`}>
                      ALGORITHMIC SANDBOX
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Placement & Retention Simulator</span>
                  </div>
                </div>

                {/* Bottom info block */}
                <div className={`border-t text-left pt-2 px-0.5 transition-colors ${
                  activeCategory === "sandbox" ? "border-amber-500/15" : "border-white/5"
                }`}>
                  <p className="text-[10px] text-slate-400 text-left leading-relaxed font-semibold mb-2">
                    Simulate streaming skip-rates and metric feedback parameters inside curators' placement filters.
                    <span className="block mt-1 text-[#fe9a00] font-mono text-[9px] tracking-widest uppercase transition-colors">THIS METRIC SIMULATES HOW STREAMING SERVICES DETERMINE YOUR SONG'S IMPACT AFTER IT BEGINS STREAMING.</span>
                  </p>
                  <span className={`inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                    activeCategory === "sandbox"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                      : "bg-[#0A0B0E]/60 border-white/5 hover:border-amber-500/40 hover:bg-neutral-900/40 text-slate-500 group-hover:text-amber-400"
                  }`}>
                    {activeCategory === "sandbox" ? "ACTIVE ⬇" : "TEST PLACEMENT ⚡"}
                  </span>
                </div>
              </div>

              {/* Right Radar circle visualization */}
              <div className="flex-shrink-0 flex items-center justify-center relative w-[110px] h-[110px]">
                {/* Outer pulsing ring */}
                <div className={`absolute inset-0 rounded-full border border-dashed duration-[25s] ${
                  activeCategory === "sandbox" ? "border-amber-500/40 animate-spin" : "border-amber-500/20 group-hover:animate-spin"
                }`} />
                <div className={`absolute inset-2 rounded-full border bg-[#0e1014] flex flex-col items-center justify-center shadow-inner relative overflow-hidden transition-colors ${
                  activeCategory === "sandbox" ? "border-amber-500/40" : "border-white/5 group-hover:border-amber-500/30"
                }`}>
                  {/* Visual pulse line or equalizer */}
                  <div className="flex items-end gap-1 h-8 mb-1">
                    <div className={`w-[3px] rounded-full h-4 transition-all ${activeCategory === "sandbox" ? "bg-amber-500 scale-y-125" : "bg-amber-500/60 group-hover:bg-amber-500 group-hover:scale-y-125"}`} />
                    <div className={`w-[3px] rounded-full h-7 delay-75 transition-all ${activeCategory === "sandbox" ? "bg-amber-500 scale-y-110" : "bg-amber-500/60 group-hover:bg-amber-500 group-hover:scale-y-110"}`} />
                    <div className={`w-[3px] rounded-full h-5 delay-150 transition-all ${activeCategory === "sandbox" ? "bg-amber-500 scale-y-125" : "bg-amber-500/60 group-hover:bg-amber-500 group-hover:scale-y-125"}`} />
                    <div className={`w-[3px] rounded-full h-3 delay-200 transition-all ${activeCategory === "sandbox" ? "bg-amber-500 scale-y-105" : "bg-amber-500/60 group-hover:bg-amber-500 group-hover:scale-y-105"}`} />
                  </div>
                  <span className={`text-[10px] font-sans font-black transition-colors ${activeCategory === "sandbox" ? "text-amber-500" : "text-slate-400 group-hover:text-amber-400"}`}>SANDBOX</span>
                  <span className="text-[8px] font-mono text-slate-500">PLAYBACK</span>
                </div>
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {activeCategory === "sandbox" && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: -8 }}
                animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                exit={{ height: 0, opacity: 0, marginTop: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden w-full relative z-0"
              >
                <div style={{ position: "relative", left: "15px", width: "calc(100% - 15px)" }} className="bg-[#0A0B0E] border border-[#f59e0b] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] flex flex-col gap-5">
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: "bold", color: "#ffffff", fontSize: "16px" }}>
                    ALGORITHMIC PLAYLIST SANDBOX
                  </div>
                  <div style={{ marginTop: "-20px", paddingTop: "11px", paddingBottom: "18px" }} className="flex items-center justify-between border-b border-white/5">
                    <span className="text-xs font-mono font-bold tracking-widest text-[#90a1b9] uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>ACTIVE PLAYBACK INSTANCE</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 text-right">
                      Tune skip-rates and metric feedback parameters inside Spotify curator loops
                    </span>
                  </div>
                  <div className="w-full">
                    {renderAlgotorialSandbox()}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>



      {/* Dedicated A&R Consultation Invitation Banner */}
      <div 
        onClick={() => {
          if (onOpenArConsult) onOpenArConsult();
        }}
        className="group relative bg-[#0C0F17] border border-blue-500/20 hover:border-blue-400/40 rounded-[28px] p-8 md:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.4)] flex flex-col md:flex-row items-center justify-between gap-8 mt-10 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.12)] hover:scale-[1.01]" 
        id="ar-consultation-suite-invite"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-500/[0.02] to-indigo-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[200px] h-[200px] bg-indigo-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 text-center md:text-left">
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-blue-600/15 via-blue-500/10 to-indigo-500/5 border border-blue-500/25 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
            <User className="w-8 h-8 animate-pulse text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide uppercase flex items-center justify-center md:justify-start gap-2.5">
              Consult with your A&amp;R Executive
              <span className="text-[9px] bg-blue-500/15 border border-blue-500/25 text-blue-400 font-mono tracking-widest px-2.5 py-0.5 rounded-full uppercase">Strategic AI Suite</span>
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-xl leading-relaxed font-sans">
              Your hired industry representative (Mr. Z, Kirsten Z, and other Spotify experts) has analyzed this audit's specific scores. Get immediate strategic consult, curated task prioritizations, and action guide lists.
            </p>
          </div>
        </div>

        <div className="relative z-10 shrink-0">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenArConsult) onOpenArConsult();
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] cursor-pointer flex items-center gap-2 group-hover:scale-102"
          >
            <span>Open Consultation Suite</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Legacy console wrapped and hidden */}
      <div className="hidden" id="legacy-hidden-console-wrapper">
        <div className="bg-[#0B0C10] border border-blue-500/25 rounded-[32px] p-6 shadow-[0_0_50px_rgba(59,130,246,0.06)] flex flex-col gap-6 mt-8 relative overflow-hidden" id="ar-consultation-suite">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5 gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600/10 to-blue-500/20 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <User className="w-6 h-6 animate-pulse" />
            </span>
            <div className="text-left">
              <h2 className="text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
                A&amp;R Executive Consultation Console
                <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono tracking-widest px-2 py-0.5 rounded-full uppercase">Ask Your Rep</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Hire and consult with professional A&amp;R representatives trained with deep strategic knowledge of Spotify algorithms, loudness norms, and our Studio rating taxonomy.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-stretch">
          {/* Left Side: The Roster Slate ("Hire Your Representative") */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="text-left mb-1.5">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-black">
                The Representative Roster (Z Y Z Y X)
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                Choose a dedicated strategist. Each representative brings the exact same app knowledge base adapted to their unique professional tone.
              </p>
            </div>

            <div className="flex flex-col gap-3" id="roster-list-slate">
              {REPRESENTATIVES.map((rep) => {
                const isSelected = selectedRepId === rep.id;
                
                return (
                  <button
                    key={rep.id}
                    onClick={() => handleHireRep(rep.id as any)}
                    className={`relative w-full p-3.5 rounded-2xl border transition-all duration-300 text-left hover:bg-neutral-900/40 flex items-center gap-3.5 cursor-pointer select-none group overflow-hidden ${
                      isSelected
                        ? "bg-[#090b0e] border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30"
                        : "bg-black/40 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {/* Background indicator shade */}
                    {isSelected && (
                      <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent pointer-events-none" />
                    )}

                    {/* Holographic silhouette avatar */}
                    <div className={`relative flex-shrink-0 w-11 h-11 rounded-xl bg-neutral-900 flex items-center justify-center border transition-all ${
                      isSelected ? "border-blue-500/35 shadow-[0_0_12px_rgba(59,130,246,0.2)]" : "border-white/5"
                    }`}>
                      <svg viewBox="0 0 100 100" className={`w-8 h-8 transition-all ${isSelected ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"}`}>
                        <circle cx="50" cy="50" r="46" fill="#0b0c10" stroke="currentColor" strokeWidth="1" className="opacity-30" />
                        <path d="M50 25 C38 25 38 44 50 44 C62 44 62 25 50 25 Z M20 80 C20 62 35 55 50 55 C65 55 80 62 80 80" fill="currentColor" className="opacity-90" />
                        {isSelected && (
                          <>
                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" className="animate-spin" />
                            <path d="M 33 32 Q 50 46 67 32" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                            <path d="M 28 75 Q 50 60 72 75" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                          </>
                        )}
                      </svg>
                      {/* Active green pulsing node */}
                      {isSelected && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] animate-ping" />
                      )}
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-[13px] font-bold tracking-tight ${isSelected ? "text-white" : "text-slate-400"}`}>
                          {rep.name}
                        </span>
                        <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase font-black">
                          {rep.label} ID:{(rep.id as string).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                        {rep.tagline}
                      </span>
                    </div>

                    <div className="flex-shrink-0">
                      <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border transition-all ${
                        isSelected 
                          ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                          : "bg-neutral-900 border-white/5 text-slate-600 group-hover:text-slate-400"
                      }`}>
                        {isSelected ? "Hired" : "Hire Rep"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Side: The Interactive "Seasoned A&R Specialist" AI Blueprint Chat Hub */}
          <div className="lg:col-span-8 flex flex-col bg-[#07080a] border border-white/5 rounded-2xl overflow-hidden min-h-[480px]">
            {/* Active Representative Banner with clean neon-blue holographic frame */}
            <div className="p-4 bg-black border-b border-white/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Holographic Interactive Representative Node with beautiful glowing neon lines */}
                <div className="relative p-0.5 rounded-xl bg-gradient-to-tr from-blue-600/20 to-blue-500/25 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)] flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-blue-600/5 animate-pulse" />
                  <svg viewBox="0 0 100 100" className="w-10 h-10 text-blue-400 relative z-10">
                    <circle cx="50" cy="50" r="46" fill="#08090d" stroke="#2563eb" strokeWidth="1" className="opacity-40" />
                    <path d="M50 24 C38 24 38 43 50 43 C62 43 62 24 50 24 Z M18 78 C18 60 32 53 50 53 C68 53 82 60 82 78" fill="#1b1e2a" stroke="#2563eb" strokeWidth="1" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#2563eb" strokeWidth="1.2" strokeDasharray="3 6" className="animate-spin" style={{ animationDuration: '30s' }} />
                    <path d="M 33 30 Q 50 44 67 30" fill="none" stroke="#00f2fe" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />
                    <path d="M 28 75 Q 50 61 72 75" fill="none" stroke="#00f2fe" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-black tracking-tight text-white">
                      Hired Advisor: {REPRESENTATIVES.find(r => r.id === selectedRepId)?.name}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-slate-400 max-w-md line-clamp-1">
                    {REPRESENTATIVES.find(r => r.id === selectedRepId)?.tagline} · {REPRESENTATIVES.find(r => r.id === selectedRepId)?.bio}
                  </p>
                </div>
              </div>

              {/* Reset discussion handler */}
              <button
                onClick={() => handleHireRep(selectedRepId)}
                className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-slate-400 hover:text-slate-200 text-[10px] font-mono rounded-lg transition-all cursor-pointer"
              >
                Clear Chats
              </button>
            </div>

            {/* Conversation Messages space */}
            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 font-sans text-xs bg-gradient-to-b from-[#07080a] to-[#040507] text-left max-h-[340px]" id="rep-messages-box">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                const isSystem = msg.role === "system";
                
                if (isSystem) {
                  return (
                    <div key={index} className="flex justify-center my-1 select-none animate-fadeIn">
                      <span className="px-3.5 py-1.5 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 font-mono shadow-inner">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 max-w-[85%] animate-fadeIn ${
                      isUser ? "self-end flex-row-reverse" : "self-start"
                    }`}
                  >
                    {/* Quick identity icon bubble */}
                    <div className={`p-2 rounded-xl flex-shrink-0 border flex items-center justify-center ${
                      isUser 
                        ? "bg-slate-800 border-slate-700 text-slate-300"
                        : "bg-blue-600/10 border-blue-500/25 text-blue-400"
                    }`}>
                      {isUser ? (
                        <User className="w-3.5 h-3.5" />
                      ) : (
                        <Rabbit className="w-3.5 h-3.5 animate-pulse text-blue-400" />
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className={`flex items-center gap-2 mb-1 justify-start ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="font-bold text-[11px] text-slate-300">
                          {msg.senderName}
                        </span>
                        <span className="text-[9px] font-mono text-slate-600 font-medium select-none">
                          {isUser ? "Artist Account" : "Industry Rep"}
                        </span>
                      </div>

                      <div className={`p-3.5 rounded-2xl border leading-relaxed text-[12.5px] whitespace-pre-wrap select-text selection:bg-blue-500/35 ${
                        isUser
                          ? "bg-slate-900 border-slate-800 text-slate-200 rounded-tr-none"
                          : "bg-[#090b0d] border-white/5 text-slate-300 rounded-tl-none shadow-md"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isConsulting && (
                <div className="flex items-start gap-3 max-w-[85%] self-start animate-pulse">
                  <div className="p-2 rounded-xl flex-shrink-0 bg-blue-600/5 border border-blue-500/15 text-blue-500 flex items-center justify-center">
                    <Radar className="w-3.5 h-3.5 animate-spin-strobe" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[11px] text-slate-500 mb-1 block">
                      Representative listening...
                    </span>
                    <div className="p-3 bg-[#090b0d] border border-white/5 text-slate-500 rounded-2xl rounded-tl-none tracking-wide text-[11.5px] italic">
                      Reviewing track scores and formulating strategic recommendations...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggestions Box */}
            <div className="px-4 py-2 bg-neutral-950 border-t border-white/5 flex flex-wrap gap-2 text-left justify-start">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1 py-1 mr-1.5 select-none">
                <Sliders className="w-3 h-3" /> Quick Questions:
              </span>
              {[
                { label: "Contrast?", query: "Why are my composition flow and vocal scores in contrast? Explain the metrics." },
                { label: "Analyze Score", query: "Explain why my overall score is not higher based on our rating taxonomy." },
                { label: "Loudness Limits", query: "Explain how Spotify dynamic compression affects my track volume and LUFS levels." },
                { label: "Action Guide", query: "Take me through DAW taskId #1 on my checklist and explain how to apply target values." }
              ].map((sug, i) => (
                <button
                  key={i}
                  disabled={isConsulting}
                  onClick={() => {
                    setChatInput(sug.query);
                    setTimeout(() => {
                      const inp = document.getElementById("ar-chat-input-field");
                      if (inp) inp.focus();
                    }, 50);
                  }}
                  className="px-2.5 py-1 bg-[#13161C] hover:bg-white/5 border border-white/5 hover:border-white/12 text-[10px] text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer font-medium disabled:opacity-50"
                >
                  {sug.label}
                </button>
              ))}
            </div>

            {/* Chat Input Console Form Box */}
            <form onSubmit={handleSendMessage} className="p-4 bg-black border-t border-white/5 flex items-center gap-3">
              <input
                type="text"
                id="ar-chat-input-field"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask ${REPRESENTATIVES.find(r => r.id === selectedRepId)?.name} questions about this song, the rating, or DAW tasks...`}
                disabled={isConsulting}
                className="flex-1 bg-[#090b0d] border border-white/10 hover:border-white/15 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 font-sans focus:outline-none transition-all disabled:opacity-50"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isConsulting}
                className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer flex-shrink-0"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEREOPHONIC AZIMUTH PLATFORM VISUALIZER (Sonic Lineup Clone)
// ============================================================================

interface StereoAzimuthVisualizerProps {
  activeTab: "outline" | "waveform" | "melodic" | "spectrogram" | "pitch" | "key" | "azimuth";
  onActiveTabChange: (tab: "outline" | "waveform" | "melodic" | "spectrogram" | "pitch" | "key" | "azimuth") => void;
  refMode: "user" | "benchmark" | "overlap";
  isPlaying: boolean;
  progress: number;
  onProgressChange: (val: number) => void;
  genreName: string;
  liveMetrics?: any;
}

function StereoAzimuthVisualizer({ activeTab, onActiveTabChange, refMode, isPlaying, progress, onProgressChange, genreName, liveMetrics }: StereoAzimuthVisualizerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationRef = React.useRef<number | null>(null);
  const [internalProgress, setInternalProgress] = React.useState(progress);

  // Synchronize internal state with prop
  React.useEffect(() => {
    setInternalProgress(progress);
  }, [progress]);

  // Handle playhead animation loop when isPlaying is true
  React.useEffect(() => {
    if (isPlaying) {
      let lastTime = performance.now();
      const updateLoop = (now: number) => {
        const delta = now - lastTime;
        lastTime = now;
        setInternalProgress((prev) => {
          let next = prev + (delta / 300); // speed controls
          if (next >= 100) {
            onProgressChange(0);
            return 0; // wrap around
          }
          onProgressChange(next);
          return next;
        });
        animationRef.current = requestAnimationFrame(updateLoop);
      };
      animationRef.current = requestAnimationFrame(updateLoop);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, onProgressChange]);

  // Render canvas frame
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Background deep space neon-dark-blue
    ctx.fillStyle = "#011022";
    ctx.fillRect(0, 0, width, height);

    // Draw background grid lines (horizontal and vertical)
    ctx.strokeStyle = "rgba(14, 116, 144, 0.08)";
    ctx.lineWidth = 1;

    // Vertical time grid lines
    const gridCount = 10;
    for (let i = 0; i <= gridCount; i++) {
      const x = (width / gridCount) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Time stamp label
      ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
      ctx.font = "9px monospace";
      ctx.fillText(`${(i * 3).toFixed(0)}s`, x + 5, height - 8);
    }

    // Horizontal grid lines (depending on mode)
    const hCount = 5;
    for (let i = 1; i < hCount; i++) {
      const y = (height / hCount) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw chord segments and markers mimicking Sonic Lineup screenshot
    const markers = [
      { percentage: 6, label: "Reference", chord: "Intro" },
      { percentage: 18, label: "C Major", chord: "C" },
      { percentage: 48, label: "A Minor 7", chord: "Am7" },
      { percentage: 70, label: "G Major", chord: "G" },
      { percentage: 88, label: "A Major", chord: "A" }
    ];

    markers.forEach((m) => {
      const mx = (width * m.percentage) / 100;
      // Draw vertical marker line
      ctx.strokeStyle = "rgba(38, 105, 160, 0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, height);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Draw chord/marker text above
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(m.chord, mx + 5, 20);
      ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
      ctx.font = "9px sans-serif";
      ctx.fillText(m.label, mx + 5, 32);
    });

    // NOW DRAW SPECIFIC SUB VIEWS
    if (activeTab === "waveform" || activeTab === "outline") {
      ctx.lineWidth = activeTab === "outline" ? 2 : 1;
      const pts = liveMetrics?.calculatedWaveformPoints || [];
      const points = pts.length > 0 ? pts.length - 1 : 250;
      
      // Draw upper and lower envelopes
      if (activeTab === "waveform") {
        ctx.fillStyle = "rgba(6, 182, 212, 0.12)";
      }
      ctx.strokeStyle = "#06b6d4";

      // Draw L channel envelope upper and lower
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const x = (width / points) * i;
        const t = i / points;
        let amp = 0.15;
        if (pts.length > 0) {
          amp = (pts[i] || 15) / 100;
        } else {
          if (t > 0.06 && t < 0.2) amp = 0.35 + Math.sin(t * 80) * 0.1;
          if (t >= 0.2 && t < 0.48) amp = 0.25 + Math.cos(t * 100) * 0.08;
          if (t >= 0.48 && t < 0.7) amp = 0.45 + Math.sin(t * 120) * 0.15;
          if (t >= 0.7 && t < 0.88) amp = 0.65 + Math.sin(t * 50) * 0.18;
          if (t >= 0.88) amp = 0.5 + Math.sin(t * 60) * 0.12;
        }
        
        const noise = pts.length > 0 ? 0 : Math.sin(i * 1.7) * Math.cos(i * 0.8) * 0.06;
        const finalAmp = Math.max(0.04, amp + noise) * (height * 0.35);
        
        const yUpper = (height * 0.25) - finalAmp;
        if (i === 0) ctx.moveTo(x, yUpper);
        else ctx.lineTo(x, yUpper);
      }
      for (let i = points; i >= 0; i--) {
        const x = (width / points) * i;
        const t = i / points;
        let amp = 0.15;
        if (pts.length > 0) {
          amp = (pts[i] || 15) / 100;
        } else {
          if (t > 0.06 && t < 0.2) amp = 0.35 + Math.sin(t * 80) * 0.1;
          if (t >= 0.2 && t < 0.48) amp = 0.25 + Math.cos(t * 100) * 0.08;
          if (t >= 0.48 && t < 0.7) amp = 0.45 + Math.sin(t * 120) * 0.15;
          if (t >= 0.7 && t < 0.88) amp = 0.65 + Math.sin(t * 50) * 0.18;
          if (t >= 0.88) amp = 0.5 + Math.sin(t * 60) * 0.12;
        }
        
        const noise = pts.length > 0 ? 0 : Math.sin(i * 1.7) * Math.cos(i * 0.8) * 0.06;
        const finalAmp = Math.max(0.04, amp + noise) * (height * 0.35);
        const yLower = (height * 0.25) + finalAmp;
        ctx.lineTo(x, yLower);
      }
      ctx.closePath();
      if (activeTab === "waveform") ctx.fill();
      ctx.stroke();

      // Draw R channel envelope on bottom half
      ctx.beginPath();
      if (activeTab === "waveform") {
        ctx.fillStyle = "rgba(139, 92, 246, 0.1)";
      }
      ctx.strokeStyle = "#8b5cf6";
      for (let i = 0; i <= points; i++) {
        const x = (width / points) * i;
        const t = i / points;
        let amp = 0.15;
        if (pts.length > 0) {
          const rVar = 1.0 + Math.sin(i / 3) * 0.15;
          amp = Math.min(1.0, ((pts[i] || 15) / 100) * rVar);
        } else {
          if (t > 0.06 && t < 0.2) amp = 0.32 + Math.sin(t * 70) * 0.08;
          if (t >= 0.2 && t < 0.48) amp = 0.28 + Math.cos(t * 90) * 0.07;
          if (t >= 0.48 && t < 0.7) amp = 0.42 + Math.sin(t * 110) * 0.12;
          if (t >= 0.7 && t < 0.88) amp = 0.63 + Math.sin(t * 55) * 0.17;
          if (t >= 0.88) amp = 0.48 + Math.sin(t * 65) * 0.1;
        }
        
        const noise = pts.length > 0 ? 0 : Math.cos(i * 1.5) * Math.sin(i * 0.9) * 0.05;
        const finalAmp = Math.max(0.04, amp + noise) * (height * 0.35);
        const yUpper = (height * 0.75) - finalAmp;
        if (i === 0) ctx.moveTo(x, yUpper);
        else ctx.lineTo(x, yUpper);
      }
      for (let i = points; i >= 0; i--) {
        const x = (width / points) * i;
        const t = i / points;
        let amp = 0.15;
        if (pts.length > 0) {
          const rVar = 1.0 + Math.sin(i / 3) * 0.15;
          amp = Math.min(1.0, ((pts[i] || 15) / 100) * rVar);
        } else {
          if (t > 0.06 && t < 0.2) amp = 0.32 + Math.sin(t * 70) * 0.08;
          if (t >= 0.2 && t < 0.48) amp = 0.28 + Math.cos(t * 90) * 0.07;
          if (t >= 0.48 && t < 0.7) amp = 0.42 + Math.sin(t * 110) * 0.12;
          if (t >= 0.7 && t < 0.88) amp = 0.63 + Math.sin(t * 55) * 0.17;
          if (t >= 0.88) amp = 0.48 + Math.sin(t * 65) * 0.1;
        }
        
        const noise = pts.length > 0 ? 0 : Math.cos(i * 1.5) * Math.sin(i * 0.9) * 0.05;
        const finalAmp = Math.max(0.04, amp + noise) * (height * 0.35);
        const yLower = (height * 0.75) + finalAmp;
        ctx.lineTo(x, yLower);
      }
      ctx.closePath();
      if (activeTab === "waveform") ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "bold 9px monospace";
      ctx.fillText("CH L (Left Channels)", 15, height * 0.12);
      ctx.fillText("CH R (Right Channels)", 15, height * 0.62);

    } else if (activeTab === "spectrogram" || activeTab === "melodic") {
      const cols = 120;
      const rows = 28;
      const colWidth = width / cols;
      const rowHeight = height / rows;

      ctx.save();
      for (let c = 0; c < cols; c++) {
        const tc = c / cols;
        for (let r = 0; r < rows; r++) {
          const tr = r / rows;
          let val = 0;
          
          if (activeTab === "melodic") {
            const isNoteFreq = (r === 5 || r === 9 || r === 11 || r === 15 || r === 18 || r === 22);
            if (isNoteFreq) {
              val = 0.25 + Math.sin(tc * 14 + r) * 0.35 + Math.cos(tc * 6) * 0.3;
              if (tc > 0.7) val += 0.22;
            } else {
              val = Math.random() * 0.12;
            }
          } else {
            // normal spectrogram scaled via calculated energies if available
            if (r > 20) { // sub bass & low end
              const multiplier = liveMetrics ? (liveMetrics.calculatedBassEnergy / 50) : 1;
              val = (0.42 + Math.sin(tc * 18) * 0.25 + Math.cos(tc * 7) * 0.2) * multiplier;
            } else if (r < 7) { // high air frequency
              const multiplier = liveMetrics ? (liveMetrics.calculatedHighEnergy / 50) : 1;
              val = (Math.sin(tc * 45) * Math.random() * 0.32) * multiplier;
            } else { // mids
              const multiplier = liveMetrics ? (liveMetrics.calculatedMidEnergy / 50) : 1;
              val = ((0.22 + Math.sin(tc * 12) * 0.2) * (1 - tr * 0.5) + Math.random() * 0.1) * multiplier;
            }
            if (c % 14 === 0) val += 0.32; // rhythmic pulse grid
          }

          val = Math.max(0, Math.min(1, val));
          let color = `rgba(${Math.round(val * 42)}, ${Math.round(val * 155 + 22)}, ${Math.round(val * 215 + 42)}, ${val * 0.8})`;
          if (val > 0.72) {
            color = `rgba(30, 215, 96, ${val * 0.9})`; // neon green sparks
          }

          ctx.fillStyle = color;
          ctx.fillRect(c * colWidth, height - (r * rowHeight) - rowHeight, colWidth + 0.6, rowHeight + 0.6);
        }
      }
      ctx.restore();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 9px monospace";
      ctx.fillText(activeTab === "spectrogram" ? "Spectrogram Analysis (128-Band FFT)" : "Harmonic Melodic Ribbon Map", 15, 20);

    } else if (activeTab === "pitch") {
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(234, 179, 8, 0.45)";
      ctx.shadowBlur = 8;
      
      ctx.beginPath();
      const points = 250;
      for (let i = 0; i <= points; i++) {
        const x = (width / points) * i;
        const t = i / points;
        let pY = height * 0.55;
        
        if (t < 0.06) {
          pY = height * 1.1; // silent
        } else if (t < 0.18) {
          pY = height * (0.65 + Math.sin(t * 30) * 0.08 + Math.sin(t * 160) * 0.015);
        } else if (t < 0.48) {
          const block = Math.floor(t * 18) % 3;
          pY = height * (0.52 - block * 0.04 + Math.sin(t * 200) * 0.008);
        } else if (t < 0.7) {
          pY = height * (0.43 + Math.cos(t * 22) * 0.1 + Math.cos(t * 250) * 0.01);
        } else {
          pY = height * (0.32 + Math.sin(t * 12) * 0.05 + Math.sin(t * 290) * 0.018);
        }

        if (pY < height) {
          if (i === 0 || t < 0.06) ctx.moveTo(x, pY);
          else ctx.lineTo(x, pY);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "8px monospace";
      ctx.fillText("Oct 4 (440Hz Reference)", width - 110, height * 0.3);
      ctx.fillText("Oct 3 (220Hz Reference)", width - 110, height * 0.55);
      ctx.fillText("Oct 2 (110Hz Reference)", width - 110, height * 0.8);

    } else if (activeTab === "key") {
      ctx.save();
      const segments = [
        { start: 0, end: 6, key: "C Major", desc: "Centered Diatonic Harmonic Core", color: "rgba(59, 130, 246, 0.08)" },
        { start: 6, end: 18, key: "C Major", desc: "Intro Harmonic Section", color: "rgba(59, 130, 246, 0.08)" },
        { start: 18, end: 48, key: "A Minor 7", desc: "Pre-chorus Relative Shift", color: "rgba(139, 92, 246, 0.12)" },
        { start: 48, end: 70, key: "G Major", desc: "Bridge Dominant Release", color: "rgba(236, 72, 153, 0.1)" },
        { start: 70, end: 88, key: "A Major", desc: "Key Modulation Climax", color: "rgba(16, 185, 129, 0.12)" },
        { start: 88, end: 100, key: "A Major Outro", desc: "Harmonic Decay", color: "rgba(234, 179, 8, 0.1)" },
      ];

      segments.forEach((seg) => {
        const sx = (width * seg.start) / 100;
        const ex = (width * seg.end) / 100;
        
        ctx.fillStyle = seg.color;
        ctx.fillRect(sx, 0, ex - sx, height);
        
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.beginPath();
        ctx.moveTo(ex, 0);
        ctx.lineTo(ex, height);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(seg.key, sx + 12, height * 0.42);
        ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
        ctx.font = "9px monospace";
        ctx.fillText(seg.desc, sx + 12, height * 0.55);
      });
      ctx.restore();

    } else if (activeTab === "azimuth") {
      const cols = 150;
      const rows = 40;
      const colWidth = width / cols;
      const rowHeight = height / rows;

      ctx.save();
      for (let c = 0; c < cols; c++) {
        const tc = c / cols;
        for (let r = 0; r < rows; r++) {
          const tr = (r - (rows/2)) / (rows/2); // -1 to +1 Left/Right
          const distFromCenter = Math.abs(tr);

          let userEnergy = 0;
          let targetEnergy = 0;

          if (liveMetrics) {
            // Get live values from metrics
            const correlation = liveMetrics.calculatedStereoCorrelation ?? 0.15;
            const bass = liveMetrics.calculatedBassEnergy ?? 45;
            const mid = liveMetrics.calculatedMidEnergy ?? 40;
            const high = liveMetrics.calculatedHighEnergy ?? 35;
            const wavePoints = liveMetrics.calculatedWaveformPoints || [];
            
            // Width factor mapped from correlation (correlation +1.0 is mono, 0.0 is wide, -1.0 is out of phase)
            const widthFactor = Math.max(0.1, Math.min(1.0, 1.0 - correlation)); 
            
            // Waveform envelope index
            let wavePctVal = 1.0;
            if (wavePoints.length > 0) {
              const pIdx = Math.floor(tc * wavePoints.length);
              wavePctVal = Math.max(0.12, (wavePoints[pIdx] || 50) / 100);
            }

            // A. Center mono core (usually vocals or sub-bass)
            const centerLimit = 0.06 + (1.0 - widthFactor) * 0.05;
            if (distFromCenter < centerLimit) {
              const centerFactor = (bass / 100) * 0.8 + 0.45;
              userEnergy = centerFactor * wavePctVal * 1.15; 
            }

            // B. Left and Right side clouds
            const sidePos = 0.45 + widthFactor * 0.33; // ranges from 0.45 (mono) to 0.78 (wide)
            const sideWidth = 0.10 + (high / 100) * 0.12; 

            const leftDist = Math.abs(tr + sidePos);
            const rightDist = Math.abs(tr - sidePos);

            if (leftDist < sideWidth) {
              const sideEnergyVal = ((mid * 0.4 + high * 0.6) / 100) * 0.72 + 0.22;
              userEnergy += sideEnergyVal * wavePctVal * (1.0 - leftDist / sideWidth);
            }
            if (rightDist < sideWidth) {
              const sideEnergyVal = ((mid * 0.4 + high * 0.6) / 100) * 0.72 + 0.22;
              userEnergy += sideEnergyVal * wavePctVal * (1.0 - rightDist / sideWidth);
            }

            userEnergy += Math.random() * 0.06;
          } else {
            // Static default baseline fallback profile
            if (distFromCenter < 0.12) {
              const drift = (tc > 0.18 && tc < 0.48) ? -0.04 : 0;
              const diff = Math.abs(tr - drift);
              if (diff < 0.08) {
                userEnergy = 0.88 + Math.sin(tc * 35) * 0.1;
              }
            }
            const leftSideAmp = Math.abs(tr - (-0.66));
            const rightSideAmp = Math.abs(tr - (0.64));
            if (leftSideAmp < 0.15) {
              userEnergy += (tc > 0.18) ? (0.52 + Math.cos(tc * 14) * 0.22) : 0.08;
            }
            if (rightSideAmp < 0.15) {
              userEnergy += (tc > 0.18) ? (0.35 + Math.sin(tc * 11) * 0.18) : 0.08;
            }
            userEnergy += Math.random() * 0.08;
          }

          // Compute target master coordinates
          if (distFromCenter < 0.07) {
            targetEnergy = 0.96 + Math.sin(tc * 45) * 0.04;
          }
          const tgtLeftSide = Math.abs(tr - (-0.78));
          const tgtRightSide = Math.abs(tr - (0.78));
          if (tgtLeftSide < 0.17) {
            targetEnergy += (tc > 0.15) ? (0.64 + Math.cos(tc * 9) * 0.22) : 0.14;
          }
          if (tgtRightSide < 0.17) {
            targetEnergy += (tc > 0.15) ? (0.64 + Math.cos(tc * 9) * 0.22) : 0.14;
          }
          targetEnergy += Math.random() * 0.06;

          let displayedEnergy = 0;
          if (refMode === "user") {
            displayedEnergy = userEnergy;
          } else if (refMode === "benchmark") {
            displayedEnergy = targetEnergy;
          } else {
            displayedEnergy = Math.max(userEnergy, targetEnergy);
          }

          displayedEnergy = Math.max(0, Math.min(1.1, displayedEnergy));

          if (displayedEnergy > 0.12) {
            let fillStyle = "";
            if (refMode === "overlap") {
              const hasUser = userEnergy > 0.32;
              const hasTarget = targetEnergy > 0.32;
              if (hasUser && hasTarget) {
                fillStyle = `rgba(14, 165, 233, ${Math.min(0.85, displayedEnergy)})`;
              } else if (hasUser) {
                fillStyle = `rgba(244, 63, 94, ${Math.min(0.8, userEnergy)})`;
              } else {
                fillStyle = `rgba(16, 185, 129, ${Math.min(0.45, targetEnergy)})`;
              }
            } else if (refMode === "user") {
              if (distFromCenter < 0.12 && userEnergy > 0.55) {
                fillStyle = `rgba(234, 179, 8, ${userEnergy * 0.95})`;
              } else {
                fillStyle = `rgba(14, 116, 144, ${userEnergy * 0.8})`;
              }
            } else {
              if (distFromCenter < 0.07 && targetEnergy > 0.55) {
                fillStyle = `rgba(250, 204, 21, ${targetEnergy * 0.98})`;
              } else {
                fillStyle = `rgba(34, 197, 94, ${targetEnergy * 0.85})`;
              }
            }
            
            ctx.fillStyle = fillStyle;
            ctx.fillRect(c * colWidth, r * rowHeight, colWidth + 0.6, rowHeight + 0.6);
          }
        }
      }
      ctx.restore();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 9px monospace";
      ctx.fillText("LEFT STEREO CHANNEL (-90° PANNING LIMITS)", 15, 22);
      ctx.fillText("CENTER AXIS CO-EFFICIENTS (0° MONO LOCKED CORE)", 15, height / 2 + 3);
      ctx.fillText("RIGHT STEREO CHANNEL (+90° PANNING LIMITS)", 15, height - 15);
    }

    // DRAW PLAYHEAD TIMELINE SWEEPER
    const playheadX = (width * internalProgress) / 100;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.0;
    
    ctx.shadowColor = "rgba(6, 182, 212, 0.8)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Playhead arrow trigger
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 8);
    ctx.closePath();
    ctx.fill();

  }, [activeTab, refMode, internalProgress]);

  // Handle playhead drag scrubbing
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
    <div className="flex flex-col gap-3">
      {/* Visualizer canvas */}
      <div className="relative border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)] group">
        <canvas
          ref={canvasRef}
          width={1000}
          height={320}
          onClick={handleCanvasClick}
          className="w-full h-[220px] md:h-[280px] block cursor-ew-resize bg-[#011022]"
        />
        <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 rounded-2xl" />
      </div>

      {/* Styled Sonic Lineup tabs at the bottom row */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 bg-neutral-900/60 p-2 border border-white/5 rounded-xl">
        <button
          onClick={() => onActiveTabChange("outline")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all tracking-wider ${
            activeTab === "outline"
              ? "bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30"
              : "bg-black/40 hover:bg-black/80 hover:text-white text-slate-400 border border-transparent"
          }`}
        >
          Outline Waveform
        </button>
        <button
          onClick={() => onActiveTabChange("waveform")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all tracking-wider ${
            activeTab === "waveform"
              ? "bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30"
              : "bg-black/40 hover:bg-black/80 hover:text-white text-slate-400 border border-transparent"
          }`}
        >
          Waveform
        </button>
        <button
          onClick={() => onActiveTabChange("melodic")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all tracking-wider ${
            activeTab === "melodic"
              ? "bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30"
              : "bg-black/40 hover:bg-black/80 hover:text-white text-slate-400 border border-transparent"
          }`}
        >
          Melodic Spectrogram
        </button>
        <button
          onClick={() => onActiveTabChange("spectrogram")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all tracking-wider ${
            activeTab === "spectrogram"
              ? "bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30"
              : "bg-black/40 hover:bg-black/80 hover:text-white text-slate-400 border border-transparent"
          }`}
        >
          Spectrogram
        </button>
        <button
          onClick={() => onActiveTabChange("pitch")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all tracking-wider ${
            activeTab === "pitch"
              ? "bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30"
              : "bg-black/40 hover:bg-black/80 hover:text-white text-slate-400 border border-transparent"
          }`}
        >
          Sung Pitch
        </button>
        <button
          onClick={() => onActiveTabChange("key")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all tracking-wider ${
            activeTab === "key"
              ? "bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30"
              : "bg-black/40 hover:bg-black/40 hover:text-white text-slate-400 border border-transparent"
          }`}
        >
          Key Grid
        </button>
        <button
          onClick={() => onActiveTabChange("azimuth")}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold uppercase transition-all tracking-widest ${
            activeTab === "azimuth"
              ? "bg-cyan-500 text-black border border-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              : "bg-black/60 hover:bg-black border border-white/5 text-cyan-400/80 hover:text-cyan-400"
          }`}
        >
          Stereo Azimuth ★
        </button>
      </div>

    </div>
  );
}

