import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Tag, Sparkles, Sliders, Layers, Info, 
  CheckCircle2, Award, Zap, Music, Globe, Database, 
  Copy, Check, Cpu, FileAudio, FileText, ChevronRight, HelpCircle,
  RefreshCw, Lock
} from "lucide-react";
import { getGenreIcon } from "./CritiqueDisplay";
import { subscribeToAuth, fetchUserTracks } from "../firebase";
import { StoredTrack, UserProfile } from "../types";

interface MetaDataGeneratorProps {
  onBack: () => void;
  trackInfo?: any;
  critique?: any;
  localFileBlobUrl?: string | null;
  currentUser?: UserProfile | null;
}

export default function MetaDataGenerator({ onBack, trackInfo, critique, localFileBlobUrl, currentUser }: MetaDataGeneratorProps) {
  // Local active track info and critique states to allow song switching
  const [localTrackInfo, setLocalTrackInfo] = useState<any>(trackInfo || null);
  const [localCritique, setLocalCritique] = useState<any>(critique || null);
  const [lockerTracks, setLockerTracks] = useState<StoredTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [user, setUser] = useState<UserProfile | null>(currentUser || null);

  // Sync prop changes
  useEffect(() => {
    if (trackInfo) setLocalTrackInfo(trackInfo);
  }, [trackInfo]);

  useEffect(() => {
    if (critique) setLocalCritique(critique);
  }, [critique]);

  // Auth subscriber fallback
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    } else {
      const unsub = subscribeToAuth((u) => {
        setUser(u);
      });
      return () => unsub();
    }
  }, [currentUser]);

  // Fetch analyzed tracks from Artist Locker
  useEffect(() => {
    if (!user) return;
    setLoadingTracks(true);
    fetchUserTracks(user.uid)
      .then((tracks) => {
        // Filter tracks that are analyzed and have a critique
        const analyzedTracks = tracks.filter(t => t.status === "analyzed" && t.critique);
        setLockerTracks(analyzedTracks);
      })
      .catch((err) => {
        console.error("Error fetching locker tracks:", err);
      })
      .finally(() => {
        setLoadingTracks(false);
      });
  }, [user]);

  // Input states
  const [metaTitle, setMetaTitle] = useState(localTrackInfo?.name || "");
  const [metaArtist, setMetaArtist] = useState(localTrackInfo?.artist || "");
  const [metaComposer, setMetaComposer] = useState("");
  const [metaGenre, setMetaGenre] = useState("");
  const [metaIsrc, setMetaIsrc] = useState("");
  const [metaIswc, setMetaIswc] = useState("");
  const [metaLabel, setMetaLabel] = useState("");
  const [metaYear, setMetaYear] = useState(new Date().getFullYear().toString());
  const [metaBpm, setMetaBpm] = useState("");
  const [metaKey, setMetaKey] = useState("");
  
  // Interactive UI states
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStep, setCompileStep] = useState(0);
  const [isGenerated, setIsGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Added states for the moved components
  const [isMobile, setIsMobile] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStep, setExtractionStep] = useState("");
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Autofill some fields if localTrackInfo is available
    if (localTrackInfo) {
      setMetaTitle(localTrackInfo.name || "");
      setMetaArtist(localTrackInfo.artist || "");
      if (localTrackInfo.genre) setMetaGenre(localTrackInfo.genre);
      if (localTrackInfo.bpm) setMetaBpm(localTrackInfo.bpm.toString());
      if (localTrackInfo.key) setMetaKey(localTrackInfo.key);
    }
  }, [localTrackInfo]);

  const compileLogs = [
    "Initializing master stream analyzer...",
    "Scanning audio container formatting (Stereo PCM Broadcast WAV / 24-bit / 48kHz)...",
    "Validating International Standard Recording Code (ISRC) format...",
    "Compiling ID3v2.4 frames & Vorbis comment schema...",
    "Injecting BWF (Broadcast Wave Format) 'bext' description metadata...",
    "Writing iTunes-compatible LIST INFO chunks & ID3 standard tags...",
    "Embedding A&R signature checksum & master level index...",
    "Metadata container sync completed successfully!"
  ];

  const handleStartCompile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCompiling(true);
    setCompileStep(0);
    setIsGenerated(false);
  };

  useEffect(() => {
    if (isCompiling) {
      if (compileStep < compileLogs.length) {
        const timer = setTimeout(() => {
          setCompileStep(prev => prev + 1);
        }, 600);
        return () => clearTimeout(timer);
      } else {
        setIsCompiling(false);
        setIsGenerated(true);
      }
    }
  }, [isCompiling, compileStep]);

  const handleCopy = () => {
    const textToCopy = `[SONG METADATA MANIFEST]
Title: ${metaTitle || "Untitled"}
Artist: ${metaArtist || "Unknown Artist"}
Composer/Lyricist: ${metaComposer || "N/A"}
Genre Profile: ${metaGenre || "Unspecified"}
ISRC Code: ${metaIsrc || "N/A"}
ISWC Code: ${metaIswc || "N/A"}
Record Label: ${metaLabel || "Independent"}
Year: ${metaYear}
BPM: ${metaBpm || "Auto-detected"}
Harmonic Key: ${metaKey || "Auto-detected"}
Encoder: YourSongScore Stash Engine v2.4`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    const genre = (localCritique?.vibe?.genre || "").toLowerCase();
    const style = (localCritique?.vibe?.subgenre || "").toLowerCase();
    if (genre.includes("synthwave") || style.includes("synthwave")) return 118;
    if (genre.includes("grunge") || style.includes("grunge") || genre.includes("punk")) return 142;
    if (genre.includes("dreamgaze") || style.includes("shoegaze") || genre.includes("ambient")) return 88;
    if (genre.includes("hip-hop") || genre.includes("rap")) return 92;
    if (genre.includes("pop") || style.includes("pop")) return 120;
    if (genre.includes("metal") || genre.includes("rock")) return 132;
    return 115;
  };

  const getEstimatedKey = () => {
    const chordStr = localCritique?.musicTheory?.chordStructures || "";
    if (chordStr.includes("E minor") || chordStr.includes("Em")) return "E minor (TKEY)";
    if (chordStr.includes("A minor") || chordStr.includes("Am")) return "A minor (TKEY)";
    if (chordStr.includes("G Major") || chordStr.includes("Gmaj")) return "G Major (TKEY)";
    if (chordStr.includes("C Major") || chordStr.includes("Cmaj")) return "C Major (TKEY)";
    return "B minor (TKEY)";
  };

  const getGeneratedRobustDescription = () => {
    const trackName = localTrackInfo?.name || "Independent Demo Track";
    const artistName = localTrackInfo?.artist || "Independent Songwriter";
    return `"${trackName}" by ${artistName} is a professionally calibrated ${localCritique?.vibe?.genre || "contemporary"} track capturing a distinct ${localCritique?.vibe?.subgenre || "studio"} performance. Moving through an aesthetic profile characterized by ${localCritique?.vibe?.aesthetic || "dynamic sonic texturing"}, the song shows outstanding dynamic production scale. Commercially, it holds a ${localCritique?.vibe?.commercialViability ? localCritique.vibe.commercialViability.split(".")[0] : "strong streaming presence"} layout, suitable for distribution across Spotify, Apple Music, Deezer, and YouTube playlists.`;
  };

  const getGeneratedKeywords = () => {
    const localTrackName = localTrackInfo?.name || "Independent Demo Track";
    const localArtistName = localTrackInfo?.artist || "Independent Songwriter";
    const rawGenre = localCritique?.vibe?.genre || "";
    const rawSubgenre = localCritique?.vibe?.subgenre || "";
    const aesthetic = localCritique?.vibe?.aesthetic || "";
    
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

    const theoryScoreVal = localCritique?.musicTheory?.score ?? 72;
    const lyricsScoreVal = localCritique?.lyricalImpact?.score ?? 70;
    const overallProductionVal = localCritique?.scores?.overallProduction ?? 75;
    const commercialReadinessVal = localCritique?.scores?.commercialReadiness ?? 75;

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

  return (
    <div className="flex flex-col gap-8 font-sans animate-fadeIn max-w-5xl mx-auto" id="metadata-generator-container">
      
      {/* 1. Header Navigation and Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-neutral-900/80 hover:bg-white/5 border border-white/5 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg"
            title="Return to Rabbit Hole"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono tracking-widest text-purple-400 font-bold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Studio Master Stash Tool</span>
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              Song Metadata Generator
            </h1>
          </div>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-102 self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rabbit Hole</span>
        </button>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Entry Form */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 3rd Div Copy - Sonic Architecture & Soundstage Blueprint */}
          <div className="bg-[#0D0E12] border border-white/15 rounded-3xl p-6 shadow-xl flex flex-col gap-5 ring-1 ring-white/5">
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col w-full md:w-auto">
                  <label htmlFor="locker-track-selector" className="text-xs font-mono font-bold tracking-wider text-purple-400 uppercase flex items-center gap-1.5 mb-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#bd93f9]" />
                    <span>Select Song from Artist Locker</span>
                  </label>
                  <select
                    id="locker-track-selector"
                    className="w-full md:w-80 bg-neutral-950 border border-white/10 hover:border-purple-500/30 text-base font-semibold text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#bd93f9] focus:border-[#bd93f9] transition-all cursor-pointer font-sans"
                    value={selectedTrackId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedTrackId(val);
                      if (!val) {
                        setLocalTrackInfo(trackInfo || null);
                        setLocalCritique(critique || null);
                      } else {
                        const selectedTrack = lockerTracks.find(t => t.id === val);
                        if (selectedTrack) {
                          setLocalTrackInfo({
                            name: selectedTrack.metaTitle || selectedTrack.name,
                            artist: selectedTrack.metaArtist || "Unknown Artist",
                            genre: selectedTrack.metaGenre || selectedTrack.critique?.vibe?.genre || ""
                          });
                          setLocalCritique(selectedTrack.critique);
                        }
                      }
                    }}
                  >
                    <option value="">-- Active Analysis (Default) --</option>
                    {loadingTracks ? (
                      <option disabled>Loading Locker tracks...</option>
                    ) : lockerTracks.length === 0 ? (
                      <option disabled>No analyzed songs in locker</option>
                    ) : (
                      lockerTracks.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.metaTitle || t.name} {t.metaArtist ? `(${t.metaArtist})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {selectedTrackId && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-400 font-mono text-[10px] uppercase font-bold animate-fadeIn shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Locker Song Active</span>
                  </div>
                )}
              </div>
            </div>

            {/* Across the width of the column */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div 
                className="bg-[#13151D] p-4 rounded-2xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.35)] hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Core Genre Profile</span>
                  <p className="mt-1 font-bold text-white text-base leading-snug flex items-center gap-2 pb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>{localCritique?.vibe?.genre ?? "N/A"}</span>
                    {getGenreIcon(localCritique?.vibe?.genre ?? "", "w-4.5 h-4.5 ml-1.5")}
                  </p>
                </div>
              </div>

              <div 
                className="bg-[#13151D] p-4 rounded-2xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.35)] hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Sub-Genre &amp; Dynamic Style</span>
                  <p className="mt-1 font-bold text-white text-base leading-snug flex items-center gap-2 pb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400" style={{ backgroundColor: '#2dd4bf' }} />
                    <span>{localCritique?.vibe?.subgenre ?? "N/A"}</span>
                  </p>
                </div>
              </div>

              <div 
                className="bg-[#13151D] p-4 rounded-2xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.35)] hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-bold block">Aesthetic Identity &amp; Vibe Blueprint</span>
                  <p className="mt-1 font-bold text-white text-base leading-snug flex items-center gap-2 pb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>{localCritique?.vibe?.aesthetic ?? "N/A"}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* WAV/MP3 Metadata Extractor Controller & Widget */}
          <div id="binary-tag-writer-section" className="w-full bg-[#0D0E12] border border-[#bd93f9]/30 rounded-3xl p-6 shadow-xl flex flex-col gap-5 ring-1 ring-[#bd93f9]/20 relative overflow-hidden">
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
                        { tag: "TIT2", label: "Track Title", val: localTrackInfo?.name || "Independent Demo Track" },
                        { tag: "TPE1", label: "Lead Performer / Artist", val: localTrackInfo?.artist || "Independent Songwriter" },
                        { tag: "TCON", label: "Content Genre", val: localCritique?.vibe?.genre || "Unknown" },
                        { tag: "TIT3", label: "Sub-Genre Profile", val: localCritique?.vibe?.subgenre || "Unknown" },
                        { tag: "TBPM", label: "Beats Per Minute (BPM)", val: getEstimatedBpm().toString() },
                        { tag: "TKEY", label: "Initial Key Signature", val: getEstimatedKey() },
                        { tag: "TSSE", label: "Dynamic Encoder", val: "YourSongScore AI v3.0 Master Engine" },
                        { tag: "TCOP", label: "Copyright License", val: `© 2026 ${localTrackInfo?.artist || "Independent Songwriter"}. All Rights Reserved.` }
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
                            const trackName = localTrackInfo?.name || "Independent Demo Track";
                            const artistName = localTrackInfo?.artist || "Independent Songwriter";
                            const tags = [
                              `#${trackName.replace(/\s+/g, "")}`,
                              `#${artistName.replace(/\s+/g, "")}`,
                              `#${(localCritique?.vibe?.genre || "").replace(/[^a-zA-Z0-9]/g, "")}`,
                              `#${(localCritique?.vibe?.subgenre || "").replace(/[^a-zA-Z0-9]/g, "")}`,
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
                          `#${(localTrackInfo?.name || "Independent Demo Track").replace(/\s+/g, "")}`,
                          `#${(localTrackInfo?.artist || "Independent Songwriter").replace(/\s+/g, "")}`,
                          `#${(localCritique?.vibe?.genre || "").replace(/[^a-zA-Z0-9]/g, "")}`,
                          `#${(localCritique?.vibe?.subgenre || "").replace(/[^a-zA-Z0-9]/g, "")}`,
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

          {/* Result Block */}
          {isGenerated ? (
            <div className="bg-[#0E1015] border border-emerald-500/20 rounded-3xl p-6 shadow-xl animate-fadeIn relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <CheckCircle2 className="w-24 h-24 text-emerald-500" />
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white tracking-tight">Injection Payload Ready</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Your song file tags have been parsed successfully.</p>
                </div>
              </div>

              <div className="bg-[#07080a] border border-white/10 rounded-xl p-4 flex flex-col gap-2.5 font-mono text-xs text-slate-300 select-all">
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-purple-400">Title:</span> 
                  <span className="text-white font-bold">{metaTitle || "Untitled"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-purple-400">Artist:</span> 
                  <span className="text-white font-bold">{metaArtist || "Unknown Artist"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-purple-400">Composer:</span> 
                  <span className="text-slate-400">{metaComposer || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-purple-400">Genre:</span> 
                  <span className="text-white">{metaGenre || "Unspecified"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-purple-400">ISRC:</span> 
                  <span className="text-emerald-400 font-bold">{metaIsrc || "NOT_ASSIGNED"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-purple-400">ISWC:</span> 
                  <span className="text-emerald-400 font-bold">{metaIswc || "NOT_ASSIGNED"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-purple-400">Label:</span> 
                  <span className="text-slate-400">{metaLabel || "Independent"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-purple-400">Year:</span> 
                  <span className="text-slate-400">{metaYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">Tempo / Key:</span> 
                  <span className="text-purple-300 font-bold">{metaBpm ? `${metaBpm} BPM` : "Auto"} / {metaKey || "Auto"}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button 
                  onClick={handleCopy}
                  className="flex-1 py-2.5 bg-neutral-900 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-mono text-xs uppercase font-extrabold tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-purple-400" />
                      <span>Copy Tag Bundle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Side: Output Dashboard / Live Preview */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Compilation Terminal Output */}
          {isCompiling && (
            <div className="bg-black border border-purple-500/30 rounded-3xl p-5 shadow-2xl relative overflow-hidden font-mono text-xs text-green-400">
              <div className="absolute top-2 right-2 flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-3.5 border-b border-white/5 pb-2 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>Compiler Terminal Logs</span>
              </h4>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {compileLogs.slice(0, compileStep).map((log, i) => (
                  <div key={i} className="flex gap-1.5 items-start">
                    <span className="text-slate-600 font-bold">&gt;</span>
                    <span className={i === compileStep - 1 ? "text-purple-300 animate-pulse" : "text-slate-300"}>{log}</span>
                  </div>
                ))}
                {compileStep < compileLogs.length && (
                  <div className="flex items-center gap-1 text-slate-600 animate-pulse">
                    <span>_</span>
                  </div>
                )}
              </div>
            </div>
          )}



          {/* Industry Best Practices / Informational panel */}
          <div className="bg-[#0E1015] border border-white/5 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/25 rounded-2xl text-blue-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-md font-bold text-white tracking-tight">Distribution Best Practices</h3>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-400 text-left">
              <div className="flex gap-2.5 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <p>
                  <strong>Metadata Coherence:</strong> Make sure spelling matches across Spotify CMS, Apple Music Connect, ASCAP/BMI registering, and distributor portals exactly. Discrepancies cause matching failures in royalty flows.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <p>
                  <strong>Unique ISRCs:</strong> Every distinct mix, edit, or master of a song requires a unique ISRC. Do not reuse a single ISRC for a radio edit and an extended club version.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <p>
                  <strong>Embedding Standard:</strong> Standard WAV files do not natively store metadata in a single agreed format. It is best to embed both ID3v2 tags and LIST INFO chunks to guarantee compatibility.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
