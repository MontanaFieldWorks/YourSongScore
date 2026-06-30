import React, { useState } from "react";
import { 
  ArrowLeft, Tag, RefreshCw, Sparkles, Sliders, Check, Copy, Disc, Rabbit, Radar, Flame, Play, Pause, Lock, Earth, Spotlight, LibraryBig 
} from "lucide-react";
import { getGenreIcon } from "./CritiqueDisplay";

// Custom pristine SVG representation of a Birdhouse for structural navigation
const Birdhouse = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    style={props.style}
  >
    {/* Clean, high-impact outline representing a classic birdhouse */}
    <path d="M12 2L2 11h3v10h14V11h3L12 2z" />
    <circle cx="12" cy="14" r="3" />
    <line x1="12" y1="17" x2="12" y2="20" />
  </svg>
);

interface UsefulToolsPageProps {
  onBack: () => void;
  critique: any;
  trackInfo: any;
  localFileBlobUrl: string | null;
  onNavigateToStacks?: () => void;
}

export default function UsefulToolsPage({ onBack, critique, trackInfo, localFileBlobUrl, onNavigateToStacks }: UsefulToolsPageProps) {
  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [audioRef] = useState(() => new Audio());
  const [isPlaying, setIsPlaying] = useState(false);

  React.useEffect(() => {
    return () => {
      audioRef.pause();
    };
  }, [audioRef]);

  const trackName = trackInfo?.name || "Independent Demo Track";
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

  // Tag writer states and logic
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStep, setExtractionStep] = useState("");
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
              const el = document.getElementById("metadata-panel-section-tools");
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

  const getEstimatedBpm = () => {
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
    const localTrackName = trackName || "Independent Demo Track";
    const localArtistName = artistName || "Independent Songwriter";
    const rawGenre = critique?.vibe?.genre || "";
    const rawSubgenre = critique?.vibe?.subgenre || "";
    const aesthetic = critique?.vibe?.aesthetic || "";
    
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

    const theoryScoreVal = critique?.musicTheory?.score ?? 72;
    const lyricsScoreVal = critique?.lyricalImpact?.score ?? 70;
    const overallProductionVal = critique?.scores?.overallProduction ?? 75;
    const commercialReadinessVal = critique?.scores?.commercialReadiness ?? 75;

    const val = Math.min(0.95, Math.max(0.12, Math.round(((theoryScoreVal * 0.45) + (lyricsScoreVal * 0.45) + 10)) / 100));
    const nrg = Math.min(0.95, Math.max(0.15, Math.round(((overallProductionVal * 0.70) + (commercialReadinessVal * 0.30))) / 100));

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

    let lyricalTopics: string[] = [];
    const titleLower = localTrackName.toLowerCase();
    if (titleLower.includes("dream") || titleLower.includes("daylight")) {
      lyricalTopics = ["Subconscious Escape", "Hopeful Daylight Wandering", "Ethereal Reflections"];
    } else if (titleLower.includes("wave") || titleLower.includes("midnight") || titleLower.includes("night")) {
      lyricalTopics = ["Late Night Journeys", "Metropolitan Solitude", "Transient Waves of Sentiment"];
    } else if (titleLower.includes("static") || titleLower.includes("horizon")) {
      lyricalTopics = ["Liminal Spaces", "Static & Overload", "Interstellar Departures"];
    } else {
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

  if (!critique) {
    return (
      <div className="bg-[#0D0E12] border border-white/10 rounded-3xl p-8 text-center max-w-2xl mx-auto my-12 shadow-2xl">
        <Sliders className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-white mb-2">The Rabbit Hole Locked</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Please upload and analyze a track in the <span className="text-white font-semibold">Artist Locker</span> or use the <span className="text-amber-400 font-semibold">Quick Test Load</span> sandbox menu at the top of the screen to populate active song metadata and unlock <span className="text-[#bd93f9] font-semibold">The Rabbit Hole</span> features!
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" id="useful-tools-container">
      {/* Centered STANDOUT TITLE with Rabbit logos flanking & Subheadline */}
      <div className="flex flex-col items-center justify-center text-center mt-6 mb-4">
        <div className="flex items-center gap-3 justify-center mb-1">
          <Rabbit className="w-8 h-8 text-[#bd93f9] animate-pulse" />
          <h1 className="text-3xl font-black text-white tracking-widest uppercase font-sans">The Rabbit Hole</h1>
          <Rabbit className="w-8 h-8 text-[#bd93f9] animate-pulse" style={{ transform: "scaleX(-1)" }} />
        </div>
        <p className="text-xs text-[#bd93f9] font-mono tracking-wider font-extrabold uppercase opacity-85 font-sans">
          — the hidden world of music streaming gatekeepers. —
        </p>
      </div>

      {/* Grid/Flex workspace holding 1st Div (35% width) and The Maze Goers Tool Box (65% width) side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
        {/* 1st Div Copy as Header (35% width, on left/above) */}
        <div className="w-full lg:w-[35%] bg-[#0D0E12] border border-white/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 ring-1 ring-white/5 flex-shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Disc className="w-48 h-48 animate-spin" style={{ animationDuration: "10s" }} />
          </div>

          <div className="flex items-center gap-5 relative z-10">
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
              <div className="w-24 h-24 bg-[#13151D] rounded-xl flex items-center justify-center border border-white/15 shadow-[0_4px_15px_rgba(59,130,246,0.1)]">
                <Rabbit className="w-10 h-10 text-[#bd93f9]" />
              </div>
            )}

            <div className="flex flex-col text-left">
              <h1 className="text-xl font-bold text-white shadow-sm mt-2 font-sans" id="evaluated-song-title">
                {trackName}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5 font-sans">
                by <span className="text-slate-300 font-medium">{artistName}</span>
              </p>
            </div>
          </div>

          {/* Playback utility desk */}
          {audioSourceUrl && (
            <div className="flex items-center gap-3 bg-neutral-950 border border-white/15 p-3 rounded-xl relative z-10 shadow-inner" id="header-audio-player font-sans font-sans font-sans">
              <button
                onClick={togglePlayback}
                className={`p-3 rounded-lg flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  isPlaying 
                    ? "bg-blue-600 hover:bg-blue-500 text-white animate-pulse" 
                    : "bg-neutral-900/60 hover:bg-white/5 text-blue-400 border border-white/5"
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current pl-0.5" />}
              </button>
              <div className="flex flex-col pr-4 font-sans">
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

        {/* Column Container Div: The Maze Goers Tool Box (65% width, styled with deep violet/purple theme accents, now on right/below) */}
        <div className="w-full lg:w-[65%] bg-[#08090C] border border-[#bd93f9]/20 rounded-3xl p-5 flex flex-col justify-between ring-1 ring-[#bd93f9]/10 relative overflow-hidden shadow-2xl flex-shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Rabbit className="w-32 h-32 text-[#bd93f9]" />
          </div>

          <div className="text-center relative z-10 border-b border-white/5 pb-2.5">
            <h3 
              style={{ fontSize: "16px" }} 
              className="font-mono font-black tracking-widest text-[#bd93f9] uppercase font-sans animate-fadeIn"
            >
              The Deep Dark - a Tool Box for the Labyrinthian Music Industry "Rabbit Hole".
            </h3>
          </div>

          {/* Three dynamic stack navigation shortcuts */}
          <div className="flex flex-col gap-2 relative z-10 py-3 flex-grow justify-center">
            {/* Short #0: The Streaming Rabbit Hole */}
            <button
              className="w-full text-left p-2.5 rounded-xl bg-neutral-950/80 hover:bg-neutral-950 border border-white/5 hover:border-[#bd93f9]/30 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center justify-between transition-all cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <Rabbit className="text-[#bd93f9] group-hover:rotate-6 transition-transform" style={{ width: "18px", height: "18px" }} />
                <span className="font-sans font-bold" style={{ fontSize: "16px" }}>The Streaming Rabbit Hole</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#bd93f9] opacity-75 group-hover:opacity-100 font-extrabold flex items-center gap-1 font-sans">
                ENTER ➔
              </span>
            </button>

            {/* Short #1: Song Metadata Stash (appears ready to click but remains unlinked, Tag icon) */}
            <button
              className="w-full text-left p-2.5 rounded-xl bg-neutral-950/80 hover:bg-neutral-950 border border-white/5 hover:border-[#bd93f9]/30 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center justify-between transition-all cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <Tag className="text-[#bd93f9] group-hover:rotate-12 transition-transform" style={{ width: "18px", height: "18px" }} />
                <span className="font-sans font-bold" style={{ fontSize: "16px" }}>Song Metadata Stash</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#bd93f9] opacity-75 group-hover:opacity-100 font-extrabold flex items-center gap-1 font-sans">
                PUSH TO ⬇
              </span>
            </button>

            {/* Short #2: The Echo Nest Rabbit Hole (no auto select, no link yet, Birdhouse icon as requested) */}
            <button
              className="w-full text-left p-2.5 rounded-xl bg-neutral-950/80 hover:bg-neutral-950 border border-white/5 hover:border-[#bd93f9]/30 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center justify-between transition-all cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <Birdhouse className="text-[#bd93f9] group-hover:rotate-12 transition-transform" style={{ width: "18px", height: "18px" }} />
                <span className="font-sans font-bold" style={{ fontSize: "16px" }}>The Echo Nest Rabbit Hole</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#bd93f9] opacity-75 group-hover:opacity-100 font-extrabold flex items-center gap-1 font-sans">
                ENTER ➔
              </span>
            </button>

            {/* Short #2.5: The Stacks - The Blind Tunnel (LibraryBig icon, links to Stacks page) */}
            <button
              onClick={onNavigateToStacks}
              className="w-full text-left p-2.5 rounded-xl bg-[#0F0A18]/80 hover:bg-[#1A0F2C]/80 border border-[#bd93f9]/20 hover:border-[#bd93f9]/50 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center justify-between transition-all cursor-pointer group shadow-[0_0_15px_rgba(189,147,249,0.05)] hover:shadow-[0_0_20px_rgba(189,147,249,0.15)]"
            >
              <span className="flex items-center gap-2">
                <LibraryBig className="text-[#bd93f9] group-hover:rotate-6 transition-transform" style={{ width: "18px", height: "18px" }} />
                <span className="font-sans font-bold text-purple-200 group-hover:text-purple-100" style={{ fontSize: "16px" }}>The Blind Tunnel: The Misunderstood -14.0</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#bd93f9] opacity-75 group-hover:opacity-100 font-extrabold flex items-center gap-1 font-sans">
                ENTER ➔
              </span>
            </button>

            {/* Short #3: The Listener Map Rabbit Hole (Earth icon as requested, active but unlinked) */}
            <button
              className="w-full text-left p-2.5 rounded-xl bg-neutral-950/80 hover:bg-neutral-950 border border-white/5 hover:border-[#bd93f9]/30 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center justify-between transition-all cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <Earth className="text-[#bd93f9] group-hover:rotate-6 transition-transform" style={{ width: "18px", height: "18px" }} />
                <span className="font-sans font-bold" style={{ fontSize: "16px" }}>The Listener Map Rabbit Hole</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#bd93f9] opacity-75 group-hover:opacity-100 font-extrabold flex items-center gap-1 font-sans">
                EXPLORE ➔
              </span>
            </button>

            {/* Short #4: Spotify Artist Profile Analyzer (Spotlight icon, active but unlinked) */}
            <button
              className="w-full text-left p-2.5 rounded-xl bg-neutral-950/80 hover:bg-neutral-950 border border-white/5 hover:border-[#bd93f9]/30 text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center justify-between transition-all cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <Spotlight className="text-[#bd93f9] group-hover:rotate-12 transition-transform" style={{ width: "18px", height: "18px" }} />
                <span className="font-sans font-bold" style={{ fontSize: "16px" }}>Spotify Artist Profile Analyzer</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#bd93f9] opacity-75 group-hover:opacity-100 font-extrabold flex items-center gap-1 font-sans">
                ANALYZE ➔
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3rd Div Copy - Sonic Architecture & Soundstage Blueprint */}
      <div className="bg-[#0D0E12] border border-white/15 rounded-3xl p-6 shadow-xl flex flex-col gap-5 ring-1 ring-white/5">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#bd93f9] font-bold uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#bd93f9] animate-pulse" />
            <span>Acoustic Blueprint &amp; Styling Signature</span>
          </span>
          <h2 className="text-lg font-extrabold text-white mt-1">Sonic Architecture &amp; Soundstage Blueprint</h2>
        </div>

        {/* Across the width of the app window */}
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div 
            style={{ 
              width: isMobile ? "100%" : "calc((100% - 32.1px) / 3 - 60px)",
              flexShrink: 0 
            }}
            className="bg-[#13151D] p-4 rounded-2xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.35)] hover:border-white/20 transition-all flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Core Genre Profile</span>
              <p className="mt-1 font-bold text-white text-base leading-snug flex items-center gap-2 pb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>{critique?.vibe?.genre ?? "N/A"}</span>
                {getGenreIcon(critique?.vibe?.genre ?? "", "w-4.5 h-4.5 ml-1.5")}
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center gap-2 text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">
              Vibe Matcher
            </div>
          </div>

          <div 
            style={{ 
              width: isMobile ? "100%" : "calc((100% - 32.1px) / 3 - 60px)",
              flexShrink: 0 
            }}
            className="bg-[#13151D] p-4 rounded-2xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.35)] hover:border-white/20 transition-all flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Sub-Genre &amp; Dynamic Style</span>
              <p className="mt-1 font-bold text-white text-base leading-snug flex items-center gap-2 pb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" style={{ backgroundColor: '#2dd4bf' }} />
                <span>{critique?.vibe?.subgenre ?? "N/A"}</span>
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center gap-2 text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">
              Style Profile
            </div>
          </div>

          <div 
            style={{ 
              width: isMobile ? "100%" : "calc((100% - 32.1px) / 3 + 120px)",
              flexShrink: 0 
            }}
            className="bg-[#13151D] p-4 rounded-2xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.35)] hover:border-white/20 transition-all flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Aesthetic Identity &amp; Vibe Blueprint</span>
              <p className="mt-1 font-bold text-white text-base leading-snug flex items-center gap-2 pb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>{critique?.vibe?.aesthetic ?? "N/A"}</span>
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center gap-2 text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">
              Acoustic Aura
            </div>
          </div>
        </div>

        {/* Commercial Target and Playlist Viability populated below that */}
        <div style={{ paddingRight: "10px", paddingBottom: "10px", paddingLeft: "16px", paddingTop: "12px" }} className="bg-neutral-950 rounded-2xl border border-white/10 shadow-inner">
          <span className="text-[12px] uppercase font-mono tracking-wider text-amber-400 font-bold block mb-2">
            Target Commercial Viability &amp; Curator Playlist Strategy
          </span>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {critique?.vibe?.commercialViability ?? "N/A"}
          </p>
        </div>
      </div>

      {/* WAV/MP3 Metadata Extractor Controller & Widget */}
      <div id="binary-tag-writer-section" className="w-full lg:w-[65%] bg-[#0D0E12] border border-[#bd93f9]/30 rounded-3xl p-6 shadow-xl flex flex-col gap-5 ring-1 ring-[#bd93f9]/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Tag className="w-24 h-24 text-[#bd93f9]" />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#bd93f9] font-bold uppercase flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#bd93f9]" />
              <span>Broadcast Audio Container Registry</span>
            </span>
            <h2 className="text-lg font-extrabold text-white mt-1">WAV/MP3 ID3 Metadata Tag Writer</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Extract and compile distribution-ready container tags, release bios, SEO keywords, and metadata payloads.
            </p>
          </div>

          <button
            onClick={runMetadataExtraction}
            disabled={isExtracting}
            className={`cursor-pointer px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 border whitespace-nowrap self-start sm:self-center ${
              isExtracting
                ? "bg-purple-950/40 border-purple-800/50 text-purple-300 cursor-not-allowed"
                : "bg-gradient-to-r from-[#bd93f9] to-[#8e7dff] hover:from-[#cb9fff] hover:to-[#9c8fff] text-black border-transparent shadow-[0_0_20px_rgba(189,147,249,0.25)] hover:shadow-[0_0_25px_rgba(189,147,249,0.35)]"
            }`}
          >
            {isExtracting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Reading Tags...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black animate-pulse" />
                <span>Extract Metadata Tags</span>
              </>
            )}
          </button>
        </div>

        {/* Live progress meter */}
        {isExtracting && (
          <div className="bg-black/60 border border-white/5 p-4 rounded-2xl animate-pulse flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#bd93f9] font-bold uppercase tracking-wider">{extractionStep}</span>
              <span className="text-slate-400 font-bold">{extractionProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
              <div 
                style={{ width: `${extractionProgress}%` }} 
                className="h-full bg-gradient-to-r from-[#bd93f9] to-[#8e7dff] transition-all duration-300 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Extracted Metadata Dashboard Section (Dynamic Expansion) */}
        {showMetadataPanel && !isExtracting && (
          <div id="metadata-panel-section-tools" className="mt-2 border-t border-white/10 pt-6 flex flex-col gap-6 animate-fadeIn font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Traditional Container ID3 Frame Fields */}
              <div className="bg-[#050608]/90 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Sliders className="w-32 h-32 text-slate-400" />
                </div>
                
                <div className="flex items-center justify-between border-b border-white/5 pb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-purple-500/10 rounded-lg text-[#bd93f9] border border-purple-500/20">
                      <Tag className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">Binary Frame Identifier</h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Compliant with ID3v2.4.0 (32,109 Bytes written)</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    Container Validated
                  </span>
                </div>

                <div className="flex flex-col gap-3 relative z-10">
                  {[
                    { tag: "TIT2", label: "Track Title", val: trackName },
                    { tag: "TPE1", label: "Lead Performer / Artist", val: artistName },
                    { tag: "TCON", label: "Content Genre", val: critique?.vibe?.genre || "Unknown" },
                    { tag: "TIT3", label: "Sub-Genre Profile", val: critique?.vibe?.subgenre || "Unknown" },
                    { tag: "TBPM", label: "Beats Per Minute (BPM)", val: getEstimatedBpm().toString() },
                    { tag: "TKEY", label: "Initial Key Signature", val: getEstimatedKey() },
                    { tag: "TSSE", label: "Dynamic Encoder", val: "YourSongScore AI v3.0 Master Engine" },
                    { tag: "TCOP", label: "Copyright License", val: `© 2026 ${artistName}. All Rights Reserved.` }
                  ].map((field, idx) => (
                    <div key={idx} className="bg-neutral-950/80 hover:bg-neutral-950 border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors group">
                      <div className="flex items-start sm:items-center gap-2.5">
                        <span className="text-[10px] font-mono font-bold bg-[#13151D] text-slate-400 px-2 py-1 border border-white/5 rounded">
                          {field.tag}
                        </span>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold leading-tight">
                            {field.label}
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-200 mt-1 block">
                            {field.val}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyToClipboard(field.val, field.tag)}
                        className="cursor-pointer text-[10px] text-slate-400 hover:text-[#bd93f9] bg-[#13151D] hover:bg-purple-950/30 border border-white/5 hover:border-purple-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 w-fit self-end sm:self-center font-bold"
                      >
                        {copiedField === field.tag ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 animate-scaleIn" />
                            <span className="text-emerald-400 font-bold font-mono">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Tag</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Copyable Release Bio, Keywords & Web Metadata */}
              <div className="flex flex-col gap-6">
                {/* Section A: Copyable Release Bio / Pitch Copy */}
                <div className="bg-[#050608]/90 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 relative">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      <span>Distribution Song description &amp; Pitch Copy</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-normal p-3 bg-neutral-950 rounded-xl border border-white/5">
                    {getGeneratedRobustDescription()}
                  </p>

                  <button
                    onClick={() => handleCopyToClipboard(getGeneratedRobustDescription(), "bio")}
                    className="cursor-pointer w-full bg-[#bd93f9]/10 hover:bg-[#bd93f9]/20 border border-[#bd93f9]/30 hover:border-[#bd93f9]/50 text-[#bd93f9] font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(189,147,249,0.05)] hover:shadow-[0_0_20px_rgba(189,147,249,0.15)]"
                  >
                    {copiedField === "bio" ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied Pitch Description!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Pitch Description</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Section B: Dynamic Distribution Keywords */}
                <div className="bg-[#050608]/90 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8e7dff] animate-pulse" />
                      <span>Release Metadata Keywords</span>
                    </span>
                    <button
                      onClick={() => handleCopyToClipboard(getGeneratedKeywords().join(", "), "keywords")}
                      className="cursor-pointer text-[10px] text-[#8e7dff] hover:text-[#cb9fff] bg-[#8e7dff]/10 hover:bg-[#8e7dff]/20 border border-[#8e7dff]/20 hover:border-[#bd93f9]/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold"
                    >
                      {copiedField === "keywords" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied All</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy All Keywords</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {getGeneratedKeywords().map((kw, i) => (
                      <span key={i} className="text-[11px] font-mono text-slate-300 bg-neutral-950 hover:bg-[#13151D] px-2.5 py-1 rounded-lg border border-white/5 transition-colors select-none font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Section C: Socials & YouTube Hashtags */}
                <div className="bg-[#050608]/90 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                      <span>Social Media &amp; YT Marketing Hashtags</span>
                    </span>
                    <button
                      onClick={() => {
                        const tags = [
                          `#${trackName.replace(/\s+/g, "")}`,
                          `#${artistName.replace(/\s+/g, "")}`,
                          `#${(critique?.vibe?.genre || "").replace(/[^a-zA-Z0-9]/g, "")}`,
                          `#${(critique?.vibe?.subgenre || "").replace(/[^a-zA-Z0-9]/g, "")}`,
                          "#AudiophileBlueprint",
                          "#IndependentSongwriter"
                        ].join(" ");
                        handleCopyToClipboard(tags, "hashtags");
                      }}
                      className="cursor-pointer text-[10px] text-teal-400 hover:text-teal-300 bg-teal-400/10 hover:bg-teal-400/20 border border-teal-400/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold"
                    >
                      {copiedField === "hashtags" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedField === "hashtags" ? "Copied" : "Copy Tags"}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      `#${trackName.replace(/\s+/g, "")}`,
                      `#${artistName.replace(/\s+/g, "")}`,
                      `#${(critique?.vibe?.genre || "").replace(/[^a-zA-Z0-9]/g, "")}`,
                      `#${(critique?.vibe?.subgenre || "").replace(/[^a-zA-Z0-9]/g, "")}`,
                      "#AudiophileBlueprint",
                      "#IndependentSongwriter"
                    ].map((tag, i) => (
                      <span key={i} className="text-xs font-semibold text-teal-400 hover:text-teal-300 select-all">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
