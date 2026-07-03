import React, { useState } from "react";
import { 
  ArrowLeft, Tag, Sparkles, Wrench, Globe, BookOpen, Library, 
  Compass, Check, Play, Pause, ChevronRight, Info, AlertTriangle, Music,
  Rabbit, Earth, WalletMinimal
} from "lucide-react";

// Custom SVG Spotlight
const Spotlight = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M12 2a3 3 0 0 0-3 3v3h6V5a3 3 0 0 0-3-3z" />
    <path d="M12 8v4" />
    <path d="M5 21h14" />
    <path d="M19 21c0-5-3-9-7-9s-7 4-7 9" />
  </svg>
);

// Mirror of the custom Birdhouse SVG from UsefulToolsPage.tsx
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
    <path d="M12 2L2 11h3v10h14V11h3L12 2z" />
    <circle cx="12" cy="14" r="3" />
    <line x1="12" y1="17" x2="12" y2="20" />
  </svg>
);

// Custom SVG Rabbit pointing the other way
const MirrorRabbit = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    style={{ ...props.style, transform: "scaleX(-1)" }}
  >
    <path d="M14 5c0-1-.5-2-1.5-2s-1.5 1-1.5 2v3H14V5z" />
    <path d="M10 5c0-1-.5-2-1.5-2S7 4 7 5v3h3V5z" />
    <path d="M16 18c0-1.5-1-3-3-3.5a5 5 0 0 0-6 0c-2 .5-3 2-3 3.5 0 1.5 1 2.5 3 2.5h6c2 0 3-1 3-2.5z" />
    <path d="M13 15v3" />
    <path d="M9 15v3" />
    <circle cx="11" cy="11" r="1.5" />
  </svg>
);

const CustomRabbit = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M14 5c0-1-.5-2-1.5-2s-1.5 1-1.5 2v3H14V5z" />
    <path d="M10 5c0-1-.5-2-1.5-2S7 4 7 5v3h3V5z" />
    <path d="M16 18c0-1.5-1-3-3-3.5a5 5 0 0 0-6 0c-2 .5-3 2-3 3.5 0 1.5 1 2.5 3 2.5h6c2 0 3-1 3-2.5z" />
    <path d="M13 15v3" />
    <path d="M9 15v3" />
    <circle cx="11" cy="11" r="1.5" />
  </svg>
);

interface RabbitHolePageV2Props {
  onBack: () => void;
  onNavigateToStacks?: () => void;
  onNavigateToSpotifyAnalyzer?: () => void;
  trackInfo?: any;
}

export default function RabbitHolePageV2({ 
  onBack, 
  onNavigateToStacks, 
  onNavigateToSpotifyAnalyzer,
  trackInfo 
}: RabbitHolePageV2Props) {
  
  // Local states for interactive modals or expanded insights
  const [activeSecretModal, setActiveSecretModal] = useState(false);
  const [activeEchoNestModal, setActiveEchoNestModal] = useState(false);
  const [activeMetadataModal, setActiveMetadataModal] = useState(false);
  const [activeListenerMapModal, setActiveListenerMapModal] = useState(false);

  // Simple state for Mock Metadata Tag Generator
  const [metaTitle, setMetaTitle] = useState(trackInfo?.name || "");
  const [metaArtist, setMetaArtist] = useState(trackInfo?.artist || "");
  const [metaGenre, setMetaGenre] = useState("");
  const [metaIsrc, setMetaIsrc] = useState("");
  const [isGenerated, setIsGenerated] = useState(false);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleGenerateMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerated(true);
  };

  return (
    <div className="flex flex-col gap-8 font-sans animate-fadeIn max-w-6xl mx-auto relative select-none pb-12" id="rabbit-hole-v2-container">
      
      {/* Back Button Floater */}
      <div className="flex justify-start">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-wider uppercase text-slate-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Rabbit Hole</span>
        </button>
      </div>

      {/* Centered STANDOUT TITLE with Rabbit logos flanking & Subheadline */}
      <div className="flex flex-col items-center justify-center text-center mt-4 mb-4 z-10">
        <div className="border border-white/10 bg-[#07080a]/90 px-8 py-5 rounded-2xl flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#bd93f9]/50 to-transparent" />
          
          <div className="flex items-center gap-4 justify-center mb-1">
            <CustomRabbit className="w-8 h-8 text-[#bd93f9] animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-widest uppercase font-sans">
              The Rabbit Hole
            </h1>
            <MirrorRabbit className="w-8 h-8 text-[#bd93f9] animate-pulse" />
          </div>
          <p className="text-[11px] md:text-xs text-[#bd93f9] font-mono tracking-wider font-extrabold uppercase opacity-90 mt-1">
            — THE HIDDEN WORLD OF MUSIC STREAMING GATEKEEPERS. —
          </p>
        </div>
      </div>

      {/* Main Grid Wrapper with glowing lines and central neon circle */}
      <div className="relative min-h-[600px] w-full grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-stretch px-4 z-10 mt-4">
        
        {/* INTERSECTING CROSSHAIR COORDINATE GRID */}
        {/* Horizontal crosshair */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5 hidden md:block z-0 -translate-y-1/2 pointer-events-none" />
        {/* Vertical crosshair */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/5 hidden md:block z-0 -translate-x-1/2 pointer-events-none" />

        {/* MASSIVE GLOWING NEON CIRCLE (Centered) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:flex items-center justify-center z-10">
          {/* Broad atmospheric deep purple/pink wash */}
          <div className="absolute w-[440px] h-[440px] rounded-full bg-purple-600/10 blur-[90px]" />
          <div className="absolute w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[55px]" />
          
          {/* Main glowing white/purple outer border line */}
          <div className="w-[300px] h-[300px] rounded-full border-[6px] border-white/95 shadow-[0_0_30px_rgba(255,255,255,0.4),0_0_60px_rgba(168,85,247,0.3)] relative flex items-center justify-center">
            {/* Inner accent halo */}
            <div className="absolute inset-2 rounded-full border border-[#bd93f9]/15" />
          </div>
        </div>

        {/* LEFT COLUMN: TOOLS */}
        <div className="flex flex-col gap-6 relative z-20">
          
          {/* Column Header */}
          <div className="flex flex-col text-left mb-2">
            <h2 className="text-xl font-black text-white tracking-widest uppercase font-mono border-b border-white/10 pb-2 inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#bd93f9] inline-block animate-ping" />
              <span>Tools</span>
            </h2>
          </div>

          {/* Tool Card 1: Spotify Artist Profile Analyzer */}
          <div 
            onClick={onNavigateToSpotifyAnalyzer}
            className="group relative flex items-start gap-4 p-5 bg-[#0a0b0f]/85 border border-white/10 rounded-2xl hover:border-[#bd93f9]/60 hover:shadow-[0_0_25px_rgba(189,147,249,0.15)] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md"
          >
            {/* Hover decorative overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#bd93f9] shrink-0 border border-[#bd93f9]/20 group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Spotlight className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="flex flex-col text-left">
              <div className="flex flex-col items-start gap-1">
                <h3 
                  className="font-sans font-bold text-[#94a3b8] normal-case transition-colors"
                  style={{ fontSize: "22px", fontFamily: "Inter, sans-serif", lineHeight: "22px" }}
                >
                  The Burrow:
                </h3>
                <span 
                  className="font-sans font-bold text-white"
                  style={{ fontSize: "18px" }}
                >
                  Spotify Artist Profile Analyzer
                </span>
              </div>
              <p 
                className="text-slate-400 mt-1 leading-relaxed"
                style={{ fontSize: "11px", lineHeight: "15.5px" }}
              >
                Explore the hidden world of your own Spotify Artist Profile. What you are seeing when logged in is only 25% of your profile.
              </p>
              

            </div>
          </div>

          {/* Tool Card 2: Global Listener Map */}
          <div 
            onClick={() => setActiveListenerMapModal(true)}
            className="group relative flex items-start gap-4 p-5 bg-[#0a0b0f]/85 border border-white/10 rounded-2xl hover:border-[#bd93f9]/60 hover:shadow-[0_0_25px_rgba(189,147,249,0.15)] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#bd93f9] shrink-0 border border-[#bd93f9]/20 group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Earth className="w-6 h-6" />
            </div>
            
            <div className="flex flex-col text-left">
              <div className="flex flex-col items-start gap-1">
                <h3 
                  className="font-sans font-bold text-[#94a3b8] normal-case transition-colors"
                  style={{ fontSize: "22px", fontFamily: "Inter, sans-serif", lineHeight: "22px" }}
                >
                  The Tunnel:
                </h3>
                <span 
                  className="font-sans font-bold text-white"
                  style={{ fontSize: "18px" }}
                >
                  Global Listener Map
                </span>
              </div>
              <p 
                className="text-slate-400 mt-1 leading-relaxed"
                style={{ fontSize: "11px", lineHeight: "15.5px" }}
              >
                Regardless of your genre, or even your level of skill as a song writer. Chances are, there's an audience out there for you. This tool can help you find it.
              </p>
              

            </div>
          </div>

          {/* Tool Card 3: Song Metadata Generator */}
          <div 
            onClick={() => setActiveMetadataModal(true)}
            className="group relative flex items-start gap-4 p-5 bg-[#0a0b0f]/85 border border-white/10 rounded-2xl hover:border-[#bd93f9]/60 hover:shadow-[0_0_25px_rgba(189,147,249,0.15)] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#bd93f9] shrink-0 border border-[#bd93f9]/20 group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Tag className="w-6 h-6" />
            </div>
            
            <div className="flex flex-col text-left">
              <div className="flex flex-col items-start gap-1">
                <h3 
                  className="font-sans font-bold text-[#94a3b8] normal-case transition-colors"
                  style={{ fontSize: "22px", fontFamily: "Inter, sans-serif", lineHeight: "22px" }}
                >
                  The Stash:
                </h3>
                <span 
                  className="font-sans font-bold text-white"
                  style={{ fontSize: "18px" }}
                >
                  Song Metadata Generator
                </span>
              </div>
              <p 
                className="text-slate-400 mt-1 leading-relaxed"
                style={{ fontSize: "11px", lineHeight: "15.5px" }}
              >
                Song metadata is the digital ID card attached to an audio file. It contains critical text and numeric data. This tool generate descriptors specific to your song.
              </p>
              

            </div>
          </div>

          {/* Nested Bottom Card: Other Tools in the Warren */}
          <div className="mt-2 p-5 bg-[#050608]/95 border border-white/5 rounded-2xl flex items-center gap-5 text-left shadow-lg">
            <div className="p-3 bg-neutral-900 border border-white/5 text-slate-400 rounded-xl shrink-0">
              <Wrench className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-xs font-mono uppercase font-black tracking-wider text-slate-300 mb-1">
                Other Tools in the Warren
              </h4>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>Song Licensing Navigator</li>
                <li>MP3-4 Tag Creator</li>
              </ul>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: KNOWLEDGE */}
        <div className="flex flex-col gap-6 relative z-20">
          
          {/* Column Header */}
          <div className="flex flex-col text-left mb-2">
            <h2 className="text-xl font-black text-white tracking-widest uppercase font-mono border-b border-white/10 pb-2 inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#bd93f9] inline-block animate-ping" />
              <span>Knowledge</span>
            </h2>
          </div>

          {/* Knowledge Card 1: The Hidden Chamber (KEY READ) */}
          <div 
            onClick={() => setActiveSecretModal(true)}
            className="group relative flex items-start gap-4 p-5 bg-[#0a0b0f]/85 border border-white/10 rounded-2xl hover:border-[#bd93f9]/60 hover:shadow-[0_0_25px_rgba(189,147,249,0.15)] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            {/* Top-Right Pill Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono font-black tracking-widest">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              <span>KEY READ</span>
            </div>

            <div className="flex flex-col flex-grow pr-16">
              <div className="flex flex-col items-start gap-1">
                <h3 
                  className="font-sans font-bold text-[#94a3b8] normal-case transition-colors"
                  style={{ fontSize: "22px", fontFamily: "Inter, sans-serif", lineHeight: "22px" }}
                >
                  The Hidden Chamber:
                </h3>
                <span 
                  className="font-sans font-bold text-white"
                  style={{ fontSize: "18px" }}
                >
                  The Streaming Industry's Foul Secret
                </span>
              </div>
              <p 
                className="text-slate-400 mt-1 leading-relaxed"
                style={{ fontSize: "11px", lineHeight: "15.5px" }}
              >
                You know the game is rigged. But you have not idea just how bad it is... and that you can rig it too.
              </p>
              

            </div>

            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#bd93f9] shrink-0 border border-[#bd93f9]/20 self-start group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Rabbit className="w-6 h-6" />
            </div>
          </div>

          {/* Knowledge Card 2: The Blind Tunnel (-14 LUFS) */}
          <div 
            onClick={onNavigateToStacks}
            className="group relative flex items-start gap-4 p-5 bg-[#0a0b0f]/85 border border-white/10 rounded-2xl hover:border-[#bd93f9]/60 hover:shadow-[0_0_25px_rgba(189,147,249,0.15)] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex flex-col flex-grow">
              <div className="flex flex-col items-start gap-1">
                <h3 
                  className="font-sans font-bold text-[#94a3b8] normal-case transition-colors"
                  style={{ fontSize: "22px", fontFamily: "Inter, sans-serif", lineHeight: "22px" }}
                >
                  The Blind Tunnel:
                </h3>
                <span 
                  className="font-sans font-bold text-white"
                  style={{ fontSize: "18px" }}
                >
                  The Misunderstood -14 LUFS Target
                </span>
              </div>
              <p 
                className="text-slate-400 mt-1 leading-relaxed"
                style={{ fontSize: "11px", lineHeight: "15.5px" }}
              >
                You've targeted your master to hit -14 LUFS. So why does your track sound so weak compared to every other song?
              </p>
              

            </div>

            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#bd93f9] shrink-0 border border-[#bd93f9]/20 self-start group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <WalletMinimal className="w-6 h-6" />
            </div>
          </div>

          {/* Knowledge Card 3: The Nest (The Echo Nest) */}
          <div 
            onClick={() => setActiveEchoNestModal(true)}
            className="group relative flex items-start gap-4 p-5 bg-[#0a0b0f]/85 border border-white/10 rounded-2xl hover:border-[#bd93f9]/60 hover:shadow-[0_0_25px_rgba(189,147,249,0.15)] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex flex-col flex-grow">
              <div className="flex flex-col items-start gap-1">
                <h3 
                  className="font-sans font-bold text-[#94a3b8] normal-case transition-colors"
                  style={{ fontSize: "22px", fontFamily: "Inter, sans-serif", lineHeight: "22px" }}
                >
                  The Nest:
                </h3>
                <span 
                  className="font-sans font-bold text-white"
                  style={{ fontSize: "18px" }}
                >
                  Understanding The Echo Nest
                </span>
              </div>
              <p 
                className="text-slate-400 mt-1 leading-relaxed"
                style={{ fontSize: "11px", lineHeight: "15.5px" }}
              >
                Spotify uses The Echo Nest's music intelligence and audio-analysis technology to power its entire algorithmic recommendation engine and discovery features.
              </p>
              

            </div>

            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#bd93f9] shrink-0 border border-[#bd93f9]/20 self-start group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Birdhouse className="w-6 h-6" />
            </div>
          </div>

          {/* Nested Bottom Card: The Stacks Shortcut */}
          <div 
            onClick={onNavigateToStacks}
            className="group mt-2 p-5 bg-[#050608]/95 border border-white/5 hover:border-[#bd93f9]/30 rounded-2xl flex items-center justify-between gap-5 text-left shadow-lg cursor-pointer transition-all duration-300"
          >
            <div className="flex items-center gap-5">
              <div className="p-3 bg-neutral-900 border border-white/5 text-slate-400 rounded-xl shrink-0 group-hover:text-[#bd93f9] transition-colors">
                <Library className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-xs font-mono uppercase font-black tracking-wider text-slate-300 mb-0.5 group-hover:text-white transition-colors">
                  The Stacks:
                </h4>
                <p className="text-xs text-slate-400">
                  YSS's Library of Music Industry Info
                </p>
              </div>
            </div>
            <div className="text-[#bd93f9] opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>

        </div>

      </div>

      {/* INTERACTIVE INSIGHT DRAWER: The Hidden Chamber Secret Intel */}
      {activeSecretModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#0b0c0f] border border-[#bd93f9]/30 rounded-3xl p-6 max-w-lg w-full text-left flex flex-col gap-5 shadow-[0_0_50px_rgba(189,147,249,0.25)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <CustomRabbit className="w-48 h-48 text-[#bd93f9]" />
            </div>
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CustomRabbit className="w-5 h-5 text-[#bd93f9] animate-pulse" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Secret Intel unlocked
                </h3>
              </div>
              <button 
                onClick={() => setActiveSecretModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer border border-white/5 px-2 py-1 rounded hover:bg-white/5"
              >
                CLOSE [X]
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs md:text-sm text-slate-300 leading-relaxed font-sans mt-2">
              <p className="border-l-2 border-[#bd93f9] pl-3 py-0.5 bg-[#bd93f9]/5 rounded-r">
                <strong className="text-white block mb-0.5">The Skip-Rate Gatekeeper</strong>
                Spotify's algorithmic feed (Discover Weekly / Release Radar) evaluates the <strong>"Skip Rate"</strong> in the first 30 seconds of a listener's interaction. If a track is skipped before 30 seconds, it incurs a severe rank penalty.
              </p>
              <p>
                <strong>How to Game the Gate:</strong> Modern pop and hip-hop records are mixed to place high-impact hooks, drum rolls, or dramatic vocal declarations within the first 5 to 7 seconds. Long, slow atmospheric intros trigger a 40%+ drop-off in average casual feeds.
              </p>
              <p>
                <strong>The "Double Play" Loop:</strong> Independent teams bypass standard curator feeds by creating 1-to-2-minute loop segments that prompt natural repeat plays, raising the algorithmic "re-play quotient" and pushing the track into discovery buckets automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE INSIGHT DRAWER: The Echo Nest Factors */}
      {activeEchoNestModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#0b0c0f] border border-[#bd93f9]/30 rounded-3xl p-6 max-w-lg w-full text-left flex flex-col gap-5 shadow-[0_0_50px_rgba(189,147,249,0.25)] relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Birdhouse className="w-5 h-5 text-[#bd93f9]" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Decoding The Echo Nest
                </h3>
              </div>
              <button 
                onClick={() => setActiveEchoNestModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer border border-white/5 px-2 py-1 rounded hover:bg-white/5"
              >
                CLOSE [X]
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs text-slate-300 leading-relaxed font-sans">
              <p className="mb-2">
                Originally spun out of MIT Media Lab and acquired by Spotify in 2014, The Echo Nest analyzes raw audio waveforms into key semantic vectors. Your track's placement depends heavily on these:
              </p>
              
              <div className="grid grid-cols-2 gap-3 bg-[#07080a] p-3 rounded-xl border border-white/5">
                <div>
                  <strong className="text-[#bd93f9] block">1. Valence</strong>
                  <span>Mathematical "musical positiveness". Tracks with high valence sound happy, cheerful, or euphoric.</span>
                </div>
                <div>
                  <strong className="text-[#bd93f9] block">2. Energy</strong>
                  <span>Perceptual intensity and activity, calculated from dynamic range, entropy, and tempo patterns.</span>
                </div>
                <div>
                  <strong className="text-[#bd93f9] block">3. Acousticness</strong>
                  <span>Probability score (0.0 to 1.0) of whether the audio uses acoustic guitars, pianos, or natural reverbs.</span>
                </div>
                <div>
                  <strong className="text-[#bd93f9] block">4. Danceability</strong>
                  <span>Rhythmic stability, tempo consistency, beat strength, and overall groove uniformity.</span>
                </div>
              </div>
              
              <p className="text-[10px] text-slate-500 italic mt-1">
                Note: YourSongScore integrates these same audio algorithms to pre-audit your track before submission!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE MODAL: Song Metadata Tag Generator */}
      {activeMetadataModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#0b0c0f] border border-[#bd93f9]/30 rounded-3xl p-6 max-w-lg w-full text-left flex flex-col gap-5 shadow-[0_0_50px_rgba(189,147,249,0.25)] relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#bd93f9]" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Song Metadata Stash Tool
                </h3>
              </div>
              <button 
                onClick={() => {
                  setActiveMetadataModal(false);
                  setIsGenerated(false);
                }}
                className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer border border-white/5 px-2 py-1 rounded hover:bg-white/5"
              >
                CLOSE [X]
              </button>
            </div>

            {!isGenerated ? (
              <form onSubmit={handleGenerateMetadata} className="flex flex-col gap-4">
                <p className="text-xs text-slate-400">
                  Generate compliant metadata tags. Inject these identifiers into your master files before delivery.
                </p>
                
                <div className="flex flex-col gap-1 text-xs">
                  <label className="text-slate-300 font-bold">Track Name / Title</label>
                  <input 
                    type="text" 
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    required
                    placeholder="e.g. My Awesome Demo"
                    className="bg-[#07080a] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[#bd93f9]"
                  />
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <label className="text-slate-300 font-bold">Primary Artist</label>
                  <input 
                    type="text" 
                    value={metaArtist}
                    onChange={(e) => setMetaArtist(e.target.value)}
                    required
                    placeholder="e.g. DJ Spark"
                    className="bg-[#07080a] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[#bd93f9]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 text-xs">
                    <label className="text-slate-300 font-bold">Genre Profile</label>
                    <input 
                      type="text" 
                      value={metaGenre}
                      onChange={(e) => setMetaGenre(e.target.value)}
                      placeholder="e.g. Synthwave"
                      className="bg-[#07080a] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[#bd93f9]"
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-xs">
                    <label className="text-slate-300 font-bold">ISRC Code</label>
                    <input 
                      type="text" 
                      value={metaIsrc}
                      onChange={(e) => setMetaIsrc(e.target.value)}
                      placeholder="e.g. US-AB1-23-45678"
                      className="bg-[#07080a] border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[#bd93f9]"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="mt-2 w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs uppercase font-extrabold tracking-widest rounded-xl transition-all cursor-pointer shadow-lg"
                >
                  Compile Metadata Tags
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 animate-fadeIn">
                <div className="p-4 bg-purple-600/10 border border-purple-500/20 text-[#bd93f9] text-xs rounded-xl flex items-center gap-2.5">
                  <Check className="w-5 h-5 shrink-0" />
                  <span>Metadata distribution payload successfully generated and formatted!</span>
                </div>

                <div className="bg-[#07080a] border border-white/10 rounded-xl p-4 flex flex-col gap-2 font-mono text-xs text-slate-300">
                  <div><span className="text-purple-400">Title:</span> {metaTitle || "Unknown Track"}</div>
                  <div><span className="text-purple-400">Artist:</span> {metaArtist || "Unknown Artist"}</div>
                  <div><span className="text-purple-400">Genre:</span> {metaGenre || "Electronic"}</div>
                  <div><span className="text-purple-400">ISRC:</span> {metaIsrc || "GENERIC_PAYLOAD"}</div>
                  <div><span className="text-purple-400">Encoded_By:</span> YourSongScore Rabbit Hole Tool v2</div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`Title: ${metaTitle}\nArtist: ${metaArtist}\nGenre: ${metaGenre}\nISRC: ${metaIsrc}\nEncoded_By: YourSongScore`);
                    }}
                    className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all cursor-pointer"
                  >
                    Copy Tag List
                  </button>
                  <button 
                    onClick={() => setIsGenerated(false)}
                    className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-slate-400 hover:text-white font-mono text-xs uppercase font-bold tracking-widest rounded-lg transition-all cursor-pointer"
                  >
                    Edit Tags
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INTERACTIVE MODAL: Global Listener Map Coordinates */}
      {activeListenerMapModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#0b0c0f] border border-[#bd93f9]/30 rounded-3xl p-6 max-w-lg w-full text-left flex flex-col gap-5 shadow-[0_0_50px_rgba(189,147,249,0.25)] relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#bd93f9]" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Global Listener Map
                </h3>
              </div>
              <button 
                onClick={() => setActiveListenerMapModal(false)}
                className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer border border-white/5 px-2 py-1 rounded hover:bg-white/5"
              >
                CLOSE [X]
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs text-slate-300 leading-relaxed font-sans">
              <p>
                YSS scans the core frequencies, rhythmic density, and vocal placement of your master to pinpoint high-receptivity geographic clusters.
              </p>

              {/* Minimalist Map / Radar Graphic with SVG markers */}
              <div className="relative h-44 bg-[#07080a] border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center">
                {/* Horizontal radar coordinates */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
                
                {/* Radar sweep */}
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/0 via-purple-500/0 to-purple-500/10 rounded-2xl animate-pulse" />

                {/* Simulated continents/clusters */}
                <div className="absolute top-1/4 left-1/3 w-8 h-8 rounded-full bg-purple-600/15 filter blur-sm" />
                <div className="absolute top-1/2 right-1/4 w-12 h-12 rounded-full bg-indigo-500/15 filter blur-sm" />
                
                {/* Real-time glowing markers */}
                <div className="absolute top-[28%] left-[35%] flex flex-col items-center">
                  <span className="w-2 h-2 rounded-full bg-[#bd93f9] animate-ping" />
                  <span className="text-[8px] font-mono font-bold text-white/70 mt-1 uppercase">Berlin (92%)</span>
                </div>

                <div className="absolute top-[55%] right-[28%] flex flex-col items-center">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  <span className="text-[8px] font-mono font-bold text-white/70 mt-1 uppercase">Tokyo (88%)</span>
                </div>

                <div className="absolute top-[68%] left-[22%] flex flex-col items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span className="text-[8px] font-mono font-bold text-white/70 mt-1 uppercase">London (94%)</span>
                </div>

                {/* Centered crosshair coordinate indicators */}
                <div className="text-[10px] font-mono text-slate-500 bg-[#07080a] border border-white/10 px-2 py-0.5 rounded-md z-10 select-none">
                  MAP SCAN: COMPLETED
                </div>
              </div>

              <div className="p-3 bg-neutral-900/60 border border-white/5 rounded-xl text-slate-400">
                <span className="font-bold text-white block mb-0.5">High Receptivity Match found:</span>
                Your song's dynamic profile matches active streaming subcultures in key techno-ambient and synth-pop capitals. Tailor your release strategy and playlist submissions specifically to these listener clusters.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
