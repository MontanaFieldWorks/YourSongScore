import React, { useState } from "react";
import { 
  ArrowLeft, Tag, Sparkles, Wrench, Globe, BookOpen, Library, 
  Compass, Check, Play, Pause, ChevronRight, Info, AlertTriangle, Music,
  Rabbit, Earth, WalletMinimal, Spotlight, Bird
} from "lucide-react";

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
  onNavigateToMetadataGenerator?: () => void;
  onNavigateToMarketing?: () => void;
  trackInfo?: any;
}

export default function RabbitHolePageV2({ 
  onBack, 
  onNavigateToStacks, 
  onNavigateToSpotifyAnalyzer,
  onNavigateToMetadataGenerator,
  onNavigateToMarketing,
  trackInfo 
}: RabbitHolePageV2Props) {
  
  // Local states for interactive modals or expanded insights
  const [activeSecretModal, setActiveSecretModal] = useState(false);
  const [activeEchoNestModal, setActiveEchoNestModal] = useState(false);
  const [activeListenerMapModal, setActiveListenerMapModal] = useState(false);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col gap-2.5 font-sans animate-fadeIn max-w-6xl mx-auto relative select-none py-4" id="rabbit-hole-v2-container">
      
      {/* Back Button Floater */}
      <div className="flex justify-start">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-wider uppercase text-slate-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer shadow-lg"
        >
          <ArrowLeft className="w-4 h-4 text-[#ad46ff]" />
          <span>Exit Rabbit Hole</span>
        </button>
      </div>

      {/* Centered STANDOUT TITLE with Rabbit logos flanking & Subheadline */}
      <div className="flex flex-col items-center justify-center text-center pt-1.5 pb-1 z-10">
        <div className="border border-white/10 bg-[#07080a]/90 px-8 py-5 rounded-2xl flex flex-col items-center justify-center text-center max-w-2xl mx-auto shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#bd93f9]/50 to-transparent" />
          
          <div className="flex items-center gap-4 justify-center mb-1">
            <Rabbit className="w-8 h-8 text-[#ad46ff] animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-widest uppercase font-sans">
              The Rabbit Hole
            </h1>
            <Rabbit className="w-8 h-8 text-[#ad46ff] animate-pulse" style={{ transform: "scaleX(-1)" }} />
          </div>
          <p className="text-[11px] md:text-xs text-[#bd93f9] font-mono tracking-wider font-extrabold uppercase opacity-90 mt-1">
            — THE HIDDEN WORLD OF MUSIC STREAMING GATEKEEPERS. —
          </p>
        </div>
      </div>

      {/* Main Grid Wrapper with glowing lines and central neon circle */}
      <div className="relative min-h-[600px] w-full grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-5 items-stretch px-4 z-10 mt-2">
        
        {/* INTERSECTING CROSSHAIR COORDINATE GRID */}
        {/* Horizontal crosshair */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5 hidden md:block z-0 -translate-y-1/2 pointer-events-none" />
        {/* Vertical crosshair */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/5 hidden md:block z-0 -translate-x-1/2 pointer-events-none" />

        {/* MASSIVE GLOWING NEON CIRCLE (Centered on Row 2) */}
        <div className="absolute top-[247px] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:flex items-center justify-center z-45">
          {/* Radial atmospheric wash: dark center -> bright ring -> dark edge */}
          <div 
            className="absolute w-[387.2px] h-[387.2px] rounded-full blur-[61.6px]"
            style={{
              background: "radial-gradient(circle, #0b0a0e 0%, #331e50 20%, #57328c 32%, #7543bd 42%, #7342ba 48%, #57328c 58%, #412666 68%, #211532 82%, #0b0a0e 100%)"
            }}
          />
          
          {/* Main glowing white/purple outer border line */}
          <div className="w-[264px] h-[264px] rounded-full border-[11.25px] border-white/95 shadow-[0_0_26.4px_rgba(255,255,255,0.4),0_0_52.8px_rgba(173,70,255,0.35)] relative flex items-center justify-center">
            {/* Inner accent halo */}
            <div className="absolute inset-[6.6px] rounded-full border border-[#ad46ff]/20" />
          </div>
        </div>

        {/* Method 2: Rectangular blackout masks with pointer-events-none to block circle rendering in gaps */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[24px] bg-[#0A0B0E] hidden md:block z-50 pointer-events-none" />
        <div className="absolute top-[58px] -translate-y-1/2 left-1/2 -translate-x-1/2 w-[1024px] h-[16px] bg-[#0A0B0E] hidden md:block z-50 pointer-events-none" />
        <div className="absolute top-[184px] -translate-y-1/2 left-1/2 -translate-x-1/2 w-[1024px] h-[16px] bg-[#0A0B0E] hidden md:block z-50 pointer-events-none" />
        <div className="absolute top-[310px] -translate-y-1/2 left-1/2 -translate-x-1/2 w-[1024px] h-[16px] bg-[#0A0B0E] hidden md:block z-50 pointer-events-none" />
        <div className="absolute top-[436px] -translate-y-1/2 left-1/2 -translate-x-1/2 w-[1024px] h-[16px] bg-[#0A0B0E] hidden md:block z-50 pointer-events-none" />

        {/* LEFT COLUMN: TOOLS */}
        <div className="flex flex-col gap-4 relative z-20 md:justify-self-end" style={{ width: "500px" }}>
          
          {/* Column Header */}
          <div className="flex flex-col text-left h-[50px] justify-end pb-2 border-b border-white/10">
            <h2 className="text-xl font-black text-white tracking-widest uppercase font-mono">
              Tools
            </h2>
          </div>

          {/* Tool Card 1: Spotify Artist Profile Analyzer */}
          <div 
            onClick={onNavigateToSpotifyAnalyzer}
            className="group relative flex items-start gap-4 p-4 bg-[#0d0e12] border border-[#bd93f9]/30 rounded-none hover:border-[#bd93f9]/50 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md h-[110px]"
            style={{ width: "500px" }}
          >
            {/* Hover decorative overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#ad46ff] shrink-0 border border-[#bd93f9]/20 group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Spotlight className="w-6 h-6" />
            </div>
            
            <div className="flex flex-col text-left">
              <div className="flex flex-col items-start gap-0.5">
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
                className="text-slate-400 leading-relaxed"
                style={{ fontSize: "11px", lineHeight: "15.5px", width: "290px" }}
              >
                Explore the underworld of your own Spotify Artist Profile. What you see is only 25% of your profile.
              </p>
              

            </div>
          </div>

          {/* Tool Card 2: Global Listener Map */}
          <div 
            onClick={() => setActiveListenerMapModal(true)}
            className="group relative flex items-start gap-4 p-4 bg-[#0d0e12] border border-[#bd93f9]/30 rounded-none hover:border-[#bd93f9]/50 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md h-[110px]"
            style={{ width: "500px" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#ad46ff] shrink-0 border border-[#bd93f9]/20 group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Earth className="w-6 h-6" />
            </div>
            
            <div className="flex flex-col text-left">
              <div className="flex flex-col items-start gap-0.5">
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
                className="text-slate-400 leading-relaxed"
                style={{ fontSize: "11px", lineHeight: "15.5px", width: "290px" }}
              >
                Regardless of your skill as a song writer, there's an audience out there for you. This tool can help find it.
              </p>
              

            </div>
          </div>

          {/* Tool Card 3: Song Metadata Generator */}
          <div 
            onClick={onNavigateToMetadataGenerator}
            className="group relative flex items-start gap-4 p-4 bg-[#0d0e12] border border-[#bd93f9]/30 rounded-none hover:border-[#bd93f9]/50 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md h-[110px]"
            style={{ width: "500px" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#ad46ff] shrink-0 border border-[#bd93f9]/20 group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Tag className="w-6 h-6" />
            </div>
            
            <div className="flex flex-col text-left">
              <div className="flex flex-col items-start gap-0.5">
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
                className="text-slate-400 leading-relaxed"
                style={{ fontSize: "11px", lineHeight: "15.5px", width: "290px" }}
              >
                Song metadata is the digital ID card attached to an audio file. It contains critical text and numeric data.
              </p>
              

            </div>
          </div>

          {/* Nested Bottom Card: Other Tools in the Warren */}
          <div 
            className="p-5 bg-[#0d0e12] border border-[#bd93f9]/20 rounded-none flex items-center gap-5 text-left shadow-[0_0_20px_rgba(189,147,249,0.05)] hover:border-[#bd93f9]/50 transition-all duration-300"
            style={{ width: "500px" }}
          >
            <div className="p-3 bg-neutral-900 border border-white/5 text-slate-400 rounded-xl shrink-0">
              <Wrench className="w-5 h-5 text-[#ad46ff]" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[22px] font-sans font-bold text-[#94a3b8] mb-1">
                Other Tools in the Warren
              </h3>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li 
                  onClick={onNavigateToMarketing}
                  className="cursor-pointer text-[#ad46ff] hover:text-[#c17aff] hover:underline transition-colors w-fit"
                >
                  Marketing
                </li>
                <li>Song Licensing Navigator</li>
                <li>MP3-4 Tag Creator</li>
              </ul>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: KNOWLEDGE */}
        <div className="flex flex-col gap-4 relative z-20 md:justify-self-start" style={{ width: "500px" }}>
          
          {/* Column Header */}
          <div className="flex flex-col text-left h-[50px] justify-end pb-2 border-b border-white/10 text-right">
            <h2 className="text-xl font-black text-white tracking-widest uppercase font-mono">
              Knowledge
            </h2>
          </div>

          {/* Knowledge Card 1: The Hidden Chamber (KEY READ) */}
          <div 
            onClick={() => setActiveSecretModal(true)}
            className="group relative flex items-start gap-4 p-4 bg-[#0d0e12] border border-[#bd93f9]/30 rounded-none hover:border-[#bd93f9]/50 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md text-right h-[110px]"
            style={{ width: "500px" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex flex-col flex-grow">
              <div className="flex flex-col items-end gap-0.5">
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
                  The Streaming Game is Rigged:
                </span>
              </div>
              <p 
                className="text-slate-400 leading-relaxed text-right self-end"
                style={{ fontSize: "11px", lineHeight: "15.5px", width: "290px" }}
              >
                You know the game is rigged. But you have no idea just how bad it is... and that you can rig it too.
              </p>
              

            </div>

            <div className="flex flex-col items-center gap-1.5 self-start shrink-0">
              <div className="flex items-center gap-1 justify-center">
                <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: "#00d492" }} />
                <span style={{ fontSize: "8pt", color: "#00d492", lineHeight: "8px" }} className="font-mono font-black tracking-widest uppercase">
                  KEY READ
                </span>
              </div>
              <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#ad46ff] shrink-0 border border-[#bd93f9]/20 group-hover:scale-105 transition-transform duration-300 shadow-lg">
                <Rabbit className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Knowledge Card 2: The Blind Tunnel (-14 LUFS) */}
          <div 
            onClick={onNavigateToStacks}
            className="group relative flex items-start gap-4 p-4 bg-[#0d0e12] border border-[#bd93f9]/30 rounded-none hover:border-[#bd93f9]/50 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md text-right h-[110px]"
            style={{ width: "500px" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex flex-col flex-grow">
              <div className="flex flex-col items-end gap-0.5">
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
                  The Misunderstood -14
                </span>
              </div>
              <p 
                className="text-slate-400 leading-relaxed text-right self-end"
                style={{ fontSize: "11px", lineHeight: "15.5px", width: "290px" }}
              >
                You've targeted your master to hit -14 LUFS. So why does your track sound weak next to other songs?
              </p>
              

            </div>

            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#ad46ff] shrink-0 border border-[#bd93f9]/20 self-start group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <WalletMinimal className="w-6 h-6" />
            </div>
          </div>

          {/* Knowledge Card 3: The Nest (The Echo Nest) */}
          <div 
            onClick={() => setActiveEchoNestModal(true)}
            className="group relative flex items-start gap-4 p-4 bg-[#0d0e12] border border-[#bd93f9]/30 rounded-none hover:border-[#bd93f9]/50 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md text-right h-[110px]"
            style={{ width: "500px" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#bd93f9]/0 to-[#bd93f9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex flex-col flex-grow">
              <div className="flex flex-col items-end gap-0.5">
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
                className="text-slate-400 leading-relaxed text-right self-end"
                style={{ fontSize: "11px", lineHeight: "15.5px", width: "290px" }}
              >
                Spotify uses The Echo Nest to power its algorithmic engine – knowing it can make a difference.
              </p>
              

            </div>

            <div className="p-3 bg-[#bd93f9]/10 rounded-xl text-[#ad46ff] shrink-0 border border-[#bd93f9]/20 self-start group-hover:scale-105 transition-transform duration-300 shadow-lg">
              <Bird className="w-6 h-6" />
            </div>
          </div>

          {/* Nested Bottom Card: The Stacks Shortcut */}
          <div 
            onClick={onNavigateToStacks}
            className="group p-5 bg-[#0d0e12] border border-[#bd93f9]/20 hover:border-[#bd93f9]/50 rounded-none flex items-center justify-between gap-5 text-left shadow-[0_0_20px_rgba(189,147,249,0.05)] cursor-pointer transition-all duration-300"
            style={{ width: "500px" }}
          >
            <div className="flex items-center gap-5">
              <div className="p-3 bg-neutral-900 border border-white/5 text-slate-400 rounded-xl shrink-0 group-hover:text-[#ad46ff] transition-colors">
                <Library className="w-5 h-5 text-[#ad46ff]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[22px] font-sans font-bold text-[#94a3b8] mb-0.5 transition-colors">
                  The Stacks
                </h3>
                <p className="text-xs text-slate-400">
                  • YSS's Library of Music Industry Info
                </p>
                <p className="text-xs text-slate-400">
                  • How Spotify "Discovers" New Songs
                </p>
              </div>
            </div>
            <div className="text-[#ad46ff] opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
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
              <CustomRabbit className="w-48 h-48 text-[#ad46ff]" />
            </div>
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CustomRabbit className="w-5 h-5 text-[#ad46ff] animate-pulse" />
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
                <Bird className="w-5 h-5 text-[#ad46ff]" />
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

      {/* INTERACTIVE MODAL: Global Listener Map Coordinates */}
      {activeListenerMapModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#0b0c0f] border border-[#bd93f9]/30 rounded-3xl p-6 max-w-lg w-full text-left flex flex-col gap-5 shadow-[0_0_50px_rgba(189,147,249,0.25)] relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#ad46ff]" />
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
