import React, { useState, useEffect, useRef } from "react";
import { 
  User, Send, Radar, Rabbit, Sliders, ArrowLeft, HelpCircle, 
  Sparkles, Award, Star, Volume2, Bookmark, Check, ShieldCheck
} from "lucide-react";
import { CritiqueResponse, CritiqueData } from "../types";

export interface Representative {
  id: "mr_z" | "the_y" | "kirsten_z" | "telray_y" | "kid_x";
  name: string;
  tagline: string;
  bio: string;
  specialties: string[];
  avatarColor: string;
  glowColor: string;
  initialMsg: string;
  chatAccent: string;
  gradient: string;
  label: string;
  generation: string;
}

export const REPRESENTATIVES: Representative[] = [
  {
    id: "mr_z",
    name: "Mr. Z",
    tagline: "Former Label Head & Tactician",
    generation: "Mysterious Icon",
    bio: "A legendary music industry and label CEO whose real identity is guarded. Speaks in crisp, direct, highly tactical terms—mixing executive-level commercial wisdom with deep music production terminology. He is a pro who speaks to any genre with a professional but \"cool\" tone.",
    specialties: ["All Genres (Specialties - All)"],
    avatarColor: "text-blue-400 border border-blue-500/30",
    glowColor: "rgba(59, 130, 246, 0.4)",
    initialMsg: "Ezryn. Or whoever you are today. I listened to the audit. Your track hits hard, but your transients are fighting each other and casting a shadow over your composition flow. Let's make this record signed, not shelved. What are we fixing first?",
    chatAccent: "bg-blue-600 border-blue-500 text-blue-100",
    gradient: "from-[#2563eb]/10 via-transparent to-transparent",
    label: "Z"
  },
  {
    id: "the_y",
    name: "The Y",
    tagline: "Vinyl-to-Algorithm Veteran",
    generation: "Gen X Generation",
    bio: "A veteran executive who transitioned classic physical vinyl and tape formats into modern streaming algorithmic models. Experienced, sharp-tongued but constructive, with an ear tuned perfectly to radio frequencies. He is a cool pro who uses iconic song references from the Gen X generation for classic songwriting compositions.",
    specialties: ["Rock/Metal/Indie", "Country/Folk", "Pop", "Classical/Cinematic"],
    avatarColor: "text-blue-400 border border-blue-500/30",
    glowColor: "rgba(59, 130, 246, 0.4)",
    initialMsg: "Back in my day, we mixed for physical vinyl groove headroom. Now you're mixed for Spotify's dynamic ceiling of -14 LUFS. Your track is strong, but you're over-compressing and choking your vocal syncopation. Let's dig in and make those classic references pop.",
    chatAccent: "bg-blue-600 border-blue-500 text-blue-100",
    gradient: "from-[#2563eb]/10 via-transparent to-transparent",
    label: "Y"
  },
  {
    id: "kirsten_z",
    name: "Kirsten Z",
    tagline: "Viral Campaign & Curator Strategist",
    generation: "Gen Z Generation",
    bio: "Focuses purely on marketing positioning to clear Spotify algorithms, curation parameters, TikTok trending loops, and major editorial playlists. She understands how produced master quality dictates momentum in modern music, and uses the natural vernacular and song references of the Gen Z generation.",
    specialties: ["Pop", "Hip-Hop/Rap", "R&B", "Electronic"],
    avatarColor: "text-blue-400 border border-blue-500/30",
    glowColor: "rgba(59, 130, 246, 0.4)",
    initialMsg: "Oh, this is such a mood! The sonic packaging has so much potential! But to clear the algorithm and catch the editorial curators' ears, we need to optimize your intro boundary and boost songwriting DNA structure. Ask me about playlist SEO!",
    chatAccent: "bg-blue-600 border-blue-500 text-blue-100",
    gradient: "from-[#2563eb]/10 via-transparent to-transparent",
    label: "Z"
  },
  {
    id: "telray_y",
    name: "Telray Y",
    tagline: "Analog Hardware & Character Specialist",
    generation: "Millennial Generation",
    bio: "A Millennial generation industry expert with the soul of a classic rocker. Focuses on hardware depth, analog character, classic tape saturation, and warm spacious acoustic density, yet is an absolute expert in modern digital stream algorithms and uses song references of the Millennial generation.",
    specialties: ["Jazz/Soul/Blues", "R&B", "Rock/Indie", "Country/Folk"],
    avatarColor: "text-blue-400 border border-blue-500/30",
    glowColor: "rgba(59, 130, 246, 0.4)",
    initialMsg: "Listen to that raw acoustic energy. It's solid, but modern digital mixing is feeling cold here. We need some classic tube delay vibe and tape saturation on the midranges to carve space for the lyrics. Tell me what DAW tools you're rocking.",
    chatAccent: "bg-blue-600 border-blue-500 text-blue-100",
    gradient: "from-[#2563eb]/10 via-transparent to-transparent",
    label: "Y"
  },
  {
    id: "kid_x",
    name: "Kid X",
    tagline: "Wildcard Trend Scout",
    generation: "Gen Z Generation",
    bio: "An AI native, bold, yet thoroughly proven scout ready to break the next big trend. Speaks with raw, bedroom-producer enthusiasm and understands the modern playing field as a producer and A&R representative. Uses current Gen Z production culture and references.",
    specialties: ["Hip-Hop/Rap", "Electronic", "Ambient Experimental", "Shoegaze"],
    avatarColor: "text-blue-400 border border-blue-500/30",
    glowColor: "rgba(59, 130, 246, 0.4)",
    initialMsg: "Yo! This song goes absolutely crazy! Standard curators might say it doesn't fit pop guidelines, but who cares? Let's turn up the sibilance saturation, break the loudness laws, and create a core TikTok loop in the first five seconds! What's our masterplan?",
    chatAccent: "bg-blue-600 border-blue-500 text-blue-100",
    gradient: "from-[#2563eb]/10 via-transparent to-transparent",
    label: "X"
  }
];

// Helper to render distinct silhouette avatars for all personas using uniform neon-blue
export function renderActiveAvatarSVG(repId: string, isSelected: boolean) {
  const blueColor = "#3b82f6"; // neon blue consistent theme accent
  const baseClass = isSelected ? "text-blue-400 animate-pulse" : "text-slate-500";
  
  return (
    <svg viewBox="0 0 100 100" className={`w-full h-full ${baseClass}`}>
      <defs>
        <radialGradient id={`glow-${repId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={blueColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={blueColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Background radial glow */}
      {isSelected && (
        <circle cx="50" cy="50" r="48" fill={`url(#glow-${repId})`} />
      )}
      
      {/* Standard outer boundary */}
      <circle cx="50" cy="50" r="46" fill="#0E1015" stroke={isSelected ? blueColor : "#1e293b"} strokeWidth={isSelected ? "1.5" : "1"} className="opacity-90" />
      
      {/* 1. Mr. Z - Executive Shades, Smart Collar, sharp corporate structure */}
      {repId === "mr_z" && (
        <g>
          {/* Executive Suit Collar */}
          <path d="M25 80 L35 60 L42 66 L50 56 L58 66 L65 60 L75 80 Z" fill={blueColor} className="opacity-50" />
          {/* Head & Neck */}
          <circle cx="50" cy="38" r="16" fill={blueColor} />
          {/* Sunglasses */}
          <path d="M37 36 L48 36 L46 41 L39 41 Z" fill="#000" stroke={blueColor} strokeWidth="1" />
          <path d="M52 36 L63 36 L61 41 L54 41 Z" fill="#000" stroke={blueColor} strokeWidth="1" />
          <line x1="48" y1="38" x2="52" y2="38" stroke={blueColor} strokeWidth="1.5" />
          {/* Executive smart earbud */}
          <circle cx="33" cy="38" r="2" fill={blueColor} />
          {/* Inner details */}
          <path d="M42 66 L50 80 L58 66" stroke="#000" strokeWidth="2" fill="none" />
        </g>
      )}

      {/* 2. The Y - Large Over-Ear Studio Headphones and Record Waveform rings */}
      {repId === "the_y" && (
        <g>
          {/* Record Groove Background aura rings */}
          {isSelected && (
            <g className="opacity-20">
              <circle cx="50" cy="38" r="28" fill="none" stroke={blueColor} strokeWidth="0.5" strokeDasharray="1 3" />
              <circle cx="50" cy="38" r="24" fill="none" stroke={blueColor} strokeWidth="0.5" strokeDasharray="3 2" />
            </g>
          )}
          {/* Head & Neck */}
          <circle cx="50" cy="38" r="16" fill={blueColor} />
          {/* Over-ear headphones headband */}
          <path d="M30 38 A20 20 0 0 1 70 38" fill="none" stroke={blueColor} strokeWidth="3" />
          {/* Ear cups */}
          <rect x="29" y="32" width="5" height="12" rx="2" fill="#000" stroke={blueColor} strokeWidth="1.5" />
          <rect x="66" y="32" width="5" height="12" rx="2" fill="#000" stroke={blueColor} strokeWidth="1.5" />
          {/* Torso */}
          <path d="M22 80 C22 62 35 55 50 55 C65 55 78 62 78 80" fill={blueColor} className="opacity-70" />
        </g>
      )}

      {/* 3. Kirsten Z - Algorithmic Crown / Smart Curators Eyewear */}
      {repId === "kirsten_z" && (
        <g>
          {/* Algorithmic circular trend-rings */}
          {isSelected && (
            <g className="opacity-30">
              <path d="M 50 6 A 44 44 0 1 1 49.9 6" fill="none" stroke={blueColor} strokeWidth="1" strokeDasharray="5 5" className="animate-spin" style={{ transformOrigin: "50% 50%", animationDuration: "10s" }} />
            </g>
          )}
          {/* Elegant Head & Neck */}
          <circle cx="50" cy="38" r="15" fill={blueColor} />
          {/* Modern Smart Glasses with circular lenses */}
          <circle cx="43" cy="36" r="5" fill="none" stroke="#000" strokeWidth="2.5" />
          <circle cx="43" cy="36" r="5" fill="none" stroke={blueColor} strokeWidth="1.5" />
          <circle cx="57" cy="36" r="5" fill="none" stroke="#000" strokeWidth="2.5" />
          <circle cx="57" cy="36" r="5" fill="none" stroke={blueColor} strokeWidth="1.5" />
          <line x1="48" y1="36" x2="52" y2="36" stroke={blueColor} strokeWidth="1.5" />
          {/* Curved Hair / Slick layout lines */}
          <path d="M35 30 Q42 22 50 24 Q58 22 65 30" fill="none" stroke={blueColor} strokeWidth="2" />
          {/* Torso */}
          <path d="M24 80 C24 64 36 56 50 56 C64 56 76 64 76 80" fill={blueColor} className="opacity-80" />
        </g>
      )}

      {/* 4. Telray Y - Classic Rocker Long Fringe, Wire Specs, retro tubes vibe */}
      {repId === "telray_y" && (
        <g>
          {/* Vintage tube outline behind */}
          {isSelected && (
            <path d="M42 12 L58 12 C60 12 62 14 62 17 L62 25 L38 25 L38 17 C38 14 40 12 42 12 Z" fill="none" stroke={blueColor} strokeWidth="1" className="opacity-25" />
          )}
          {/* Shag rocker hair */}
          <path d="M31 35 C31 22 36 18 50 18 C64 18 69 22 69 35 C69 46 66 48 50 48 C34 48 31 46 31 35 Z" fill={blueColor} />
          {/* Head & Neck */}
          <circle cx="50" cy="38" r="13" fill="#0E1015" stroke={blueColor} strokeWidth="1" />
          {/* Wire spectacles */}
          <circle cx="44" cy="37" r="4.5" fill="none" stroke={blueColor} strokeWidth="1" />
          <circle cx="56" cy="37" r="4.5" fill="none" stroke={blueColor} strokeWidth="1" />
          <line x1="48.5" y1="37" x2="51.5" y2="37" stroke={blueColor} strokeWidth="1" />
          {/* Torso */}
          <path d="M22 80 C22 61 34 54 50 54 C66 54 78 61 78 80" fill={blueColor} className="opacity-60" />
        </g>
      )}

      {/* 5. Kid X - Backward Snapback Cap lines / Beanie-hood and glitch loops */}
      {repId === "kid_x" && (
        <g>
          {/* Glitch lightning loops */}
          {isSelected && (
            <path d="M15 50 L25 45 L20 55 L30 50" fill="none" stroke={blueColor} strokeWidth="1" className="opacity-25" />
          )}
          {/* Head & Neck */}
          <circle cx="50" cy="40" r="15" fill={blueColor} />
          {/* Backward baseball cap bill (points left-up) */}
          <path d="M30 28 L46 25 L48 31 Z" fill={blueColor} stroke={blueColor} strokeWidth="1" />
          <path d="M42 27 C42 27 48 20 54 26 C60 32 58 38 52 38" fill="none" stroke="#000" strokeWidth="2" />
          {/* Trendy Studio Hoodie line */}
          <path d="M22 80 L35 56 C38 52 42 50 50 50 C58 50 62 52 65 56 L78 80" fill="none" stroke={blueColor} strokeWidth="2" />
          <path d="M25 80 C25 64 36 58 50 58 C64 58 75 64 75 80" fill={blueColor} className="opacity-60" />
        </g>
      )}

      {/* Dynamic spinner overlay for active reps */}
      {isSelected && (
        <circle cx="50" cy="50" r="42" fill="none" stroke={blueColor} strokeWidth="1" strokeDasharray="4 8" className="animate-spin" style={{ transformOrigin: "50% 50%", animationDuration: "25s" }} />
      )}
    </svg>
  );
}

interface ArConsultPageProps {
  critiqueContext: CritiqueResponse | null;
  onBack: () => void;
  followerEnabled: boolean;
  onToggleFollower: (val: boolean) => void;
  selectedRepId: "mr_z" | "the_y" | "kirsten_z" | "telray_y" | "kid_x";
  onSelectRep: (id: "mr_z" | "the_y" | "kirsten_z" | "telray_y" | "kid_x") => void;
  messages: Array<{ role: "user" | "model" | "system"; text: string; senderName?: string }>;
  onSetMessages: React.Dispatch<React.SetStateAction<Array<{ role: "user" | "model" | "system"; text: string; senderName?: string }>>>;
}

export default function ArConsultPage({
  critiqueContext,
  onBack,
  followerEnabled,
  onToggleFollower,
  selectedRepId,
  onSelectRep,
  messages,
  onSetMessages
}: ArConsultPageProps) {
  const [chatInput, setChatInput] = useState("");
  const [isConsulting, setIsConsulting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeRep = REPRESENTATIVES.find(r => r.id === selectedRepId) || REPRESENTATIVES[0];

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isConsulting]);

  const handleHireRep = (repId: "mr_z" | "the_y" | "kirsten_z" | "telray_y" | "kid_x") => {
    onSelectRep(repId);
    const rep = REPRESENTATIVES.find(r => r.id === repId);
    if (rep) {
      onSetMessages([
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

    const updatedMessages = [
      ...messages,
      { role: "user" as const, text: userMsgText, senderName: "Artist" }
    ];
    onSetMessages(updatedMessages);
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
          critiqueContext: critiqueContext?.critique || null,
          trackInfo: critiqueContext?.trackInfo || null
        })
      });

      if (!res.ok) {
        throw new Error("Representative went offline. Connection interrupted.");
      }

      const data = await res.json();
      onSetMessages(prev => [
        ...prev,
        { role: "model" as const, text: data.reply, senderName: activeRep.name }
      ]);
    } catch (err: any) {
      onSetMessages(prev => [
        ...prev,
        { role: "system" as const, text: `⚠️ Connection disrupted: ${err.message || err}` }
      ]);
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className="animate-fadeIn flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5 gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 bg-[#13161C] hover:bg-[#1E232E] border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer shadow-sm flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-left">
            <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase">
              Exclusive Advisory Studio Suite
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight font-display uppercase">
              A&amp;R Executive Consultation Console
            </h1>
          </div>
        </div>

        {/* Dynamic follower choice toggle */}
        <div className="bg-[#0e1117] border border-blue-500/20 px-5 py-3 rounded-2xl flex items-center justify-between gap-5 shadow-[0_0_15px_rgba(59,130,246,0.03)] text-left">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Have your rep follow you?</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Avatars appear floating on other pages for micro-interaction
            </p>
          </div>
          <button
            onClick={() => onToggleFollower(!followerEnabled)}
            className={`cursor-pointer px-3.5 py-1.5 rounded-xl border text-[10.5px] font-mono font-bold uppercase transition-all select-none ${
              followerEnabled
                ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                : "bg-neutral-900 border-white/5 text-slate-500 hover:text-slate-300"
            }`}
          >
            {followerEnabled ? "FOLLOWING" : "DISABLED"}
          </button>
        </div>
      </div>

      {/* Context info strip */}
      <div className="bg-gradient-to-r from-blue-950/20 via-blue-900/10 to-transparent border border-blue-500/10 rounded-2xl p-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 flex items-center justify-center">
            <Radar className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-mono tracking-widest text-blue-400 uppercase font-black">
              INTELLIGENT FEEDBACK SOURCE
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Active Context: {critiqueContext ? `Audit parameters loaded for "${critiqueContext.trackInfo?.name || "Your Uploaded Track"}"` : "General Strategy Mode (No active song audit loaded)"}
            </h3>
          </div>
        </div>
        {critiqueContext ? (
          <div className="flex items-center gap-3 bg-[#0B0D13] border border-white/5 px-4 py-2 rounded-xl">
            <div className="text-right">
              <span className="text-[9px] text-slate-400 font-mono block">PRODUCTION SCORE</span>
              <span className="text-xs font-black text-emerald-400">{critiqueContext.critique?.scores?.overallProduction || "N/A"}/100</span>
            </div>
            <div className="w-px h-6 bg-white/5" />
            <div className="text-right">
              <span className="text-[9px] text-slate-400 font-mono block">COMMERCIAL SCORE</span>
              <span className="text-xs font-black text-blue-400">{critiqueContext.critique?.scores?.commercialReadiness || "N/A"}/100</span>
            </div>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-slate-500 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
            Static fallback general advisory active
          </span>
        )}
      </div>

      {/* Roster & Chat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Advisor Roster */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="text-left bg-[#0A0C10] border border-white/5 p-4 rounded-2xl">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
              "Hire" Your A&amp;R AI Rep!
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ask them any questions as they've each been trained with deep strategic knowledge of Spotify algorithms, loudness norms, and our Studio rating taxonomy, loaded with specific talents to help you navigate the app, your scores, and how the industry uses our metric-based approach. All are versed in all genres, though they carry unique professional specializations.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {REPRESENTATIVES.map((rep) => {
              const isSelected = selectedRepId === rep.id;
              return (
                <button
                  key={rep.id}
                  onClick={() => handleHireRep(rep.id)}
                  className={`relative w-full p-3.5 rounded-2xl border transition-all duration-300 text-left hover:bg-neutral-900/40 flex items-center gap-3.5 cursor-pointer select-none group overflow-hidden ${
                    isSelected
                      ? "bg-[#090b0e] border-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.12)] ring-1 ring-blue-500/25"
                      : "bg-[#0E1015] border-white/5 hover:border-white/10"
                  }`}
                >
                  {/* Avatar wrapper */}
                  <div className="w-11 h-11 flex-shrink-0">
                    {renderActiveAvatarSVG(rep.id, isSelected)}
                  </div>

                  {/* Body text */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-[12.5px] font-bold tracking-tight ${isSelected ? "text-white" : "text-slate-300"}`}>
                        {rep.name}
                      </span>
                      <span className="text-[9px] font-mono tracking-widest text-[#3b82f6] font-bold">
                        {rep.label} ID:{(rep.id).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                      {rep.tagline}
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-mono truncate mt-0.5">
                      {rep.generation}
                    </span>
                  </div>

                  {/* Right side check / button */}
                  <div className="flex-shrink-0">
                    <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border transition-all ${
                      isSelected 
                        ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
                        : "bg-neutral-900 border-white/5 text-slate-500 group-hover:text-slate-300"
                    }`}>
                      {isSelected ? "Hired" : "Hire"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Consultation Panel */}
        <div className="lg:col-span-8 flex flex-col bg-[#07080a] border border-white/5 rounded-3xl overflow-hidden min-h-[500px]">
          
          {/* Active Banner */}
          <div className="p-4 bg-black border-b border-white/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex-shrink-0">
                {renderActiveAvatarSVG(selectedRepId, true)}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-black tracking-tight text-white">
                    Hired Representative: {activeRep.name}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <p className="text-[10.5px] text-slate-400 max-w-md line-clamp-1">
                  {activeRep.tagline} · {activeRep.generation}
                </p>
              </div>
            </div>

            {/* Clear button */}
            <button
              onClick={() => handleHireRep(selectedRepId)}
              className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-slate-400 hover:text-slate-200 text-[10px] font-mono rounded-lg transition-all cursor-pointer"
            >
              Clear Chats
            </button>
          </div>

          {/* Bio & Specialties ribbon */}
          <div className="bg-[#0C0E14] border-b border-white/5 px-4.5 py-3 text-left">
            <p className="text-[11px] text-slate-300 leading-relaxed italic">
              "{activeRep.bio}"
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider select-none">
                Specialties:
              </span>
              {activeRep.specialties.map((spec, sIdx) => (
                <span
                  key={sIdx}
                  className="text-[9px] font-mono bg-blue-500/5 text-blue-300 border border-blue-500/10 px-2 py-0.5 rounded"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          {/* Chat scrolling board */}
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 font-sans text-xs bg-gradient-to-b from-[#07080a] to-[#040507] text-left max-h-[350px]">
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
                  <div className={`p-1.5 w-7.5 h-7.5 rounded-lg flex-shrink-0 border flex items-center justify-center ${
                    isUser 
                      ? "bg-slate-800 border-slate-700 text-slate-300"
                      : "bg-blue-600/10 border-blue-500/20"
                  }`}>
                    {isUser ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <div className="w-5 h-5 flex-shrink-0">
                        {renderActiveAvatarSVG(selectedRepId, false)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className={`flex items-center gap-2 mb-1 justify-start ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                      <span className="font-bold text-[11px] text-slate-300">
                        {isUser ? "Artist Account" : msg.senderName}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600 font-medium select-none">
                        {isUser ? "Artist Profile" : "Industry Vet"}
                      </span>
                    </div>

                    <div className={`p-3.5 rounded-2xl border leading-relaxed text-[12px] whitespace-pre-wrap select-text selection:bg-blue-500/30 ${
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
                <div className="w-7.5 h-7.5 rounded-lg flex-shrink-0 bg-blue-600/5 border border-blue-500/10 flex items-center justify-center">
                  <Radar className="w-4 h-4 text-blue-500 animate-spin" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[11px] text-slate-500 mb-1 block">
                    {activeRep.name} formulating...
                  </span>
                  <div className="p-3 bg-[#090b0d] border border-white/5 text-slate-500 rounded-2xl rounded-tl-none tracking-wide text-[11px] italic">
                    Referencing rated performance, sibilance indices, and DAW goals...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-4 py-2 bg-neutral-950 border-t border-white/5 flex flex-wrap gap-2 text-left justify-start">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1 py-1 mr-1.5 select-none">
              <Sliders className="w-3 h-3 text-blue-400" /> Consult Quick Questions:
            </span>
            {[
              { label: "Contrast?", query: "Why are my composition flow and vocal scores in contrast? Explain the metrics." },
              { label: "Our Rating Taxonomy", query: "Can you detail the scoring tiers of our A&R Rating Taxonomy (elite, signed, draft, etc.) and where I land?" },
              { label: "Optimize Intro", query: "Explain how I can optimize my intro boundary hook to prevent listener skip risk on Spotify." },
              { label: "Loudness & LUFS", query: "How does Spotify's dynamic ceiling of -14 LUFS affect my final master compression and transiency?" }
            ].map((sug, i) => (
              <button
                key={i}
                disabled={isConsulting}
                onClick={() => {
                  setChatInput(sug.query);
                  setTimeout(() => {
                    const inp = document.getElementById("ar-console-input-field");
                    if (inp) inp.focus();
                  }, 50);
                }}
                className="px-2.5 py-1 bg-[#13161C] hover:bg-white/5 border border-white/5 hover:border-white/12 text-[10px] text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer font-medium disabled:opacity-50"
              >
                {sug.label}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={handleSendMessage} className="p-4 bg-black border-t border-white/5 flex items-center gap-3">
            <input
              type="text"
              id="ar-console-input-field"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Consult ${activeRep.name} about your ratings, target DSP tags, or DAW homework...`}
              disabled={isConsulting}
              className="flex-1 bg-[#090b0d] border border-white/10 hover:border-white/15 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-500 font-sans focus:outline-none transition-all disabled:opacity-50"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isConsulting}
              className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer flex-shrink-0"
            >
              <Send className="w-4.5 h-4.5 text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
