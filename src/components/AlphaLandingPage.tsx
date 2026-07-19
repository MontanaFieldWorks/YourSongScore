import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Waves, Sparkles, Cpu, Target, FileAudio, Disc, 
  BarChart4, ArrowRight, CheckCircle2, ChevronRight, Play, Pause, Volume2, Music, Layers, 
  ShieldCheck, Activity, Radio, Sliders, Zap, Award, HelpCircle
} from "lucide-react";

interface AlphaLandingPageProps {
  onBack: () => void;
}

// Simulated Preloaded Tracks for the Sandbox Interactive Deck
const SANDBOX_TRACKS = [
  {
    id: "synthwave",
    title: "Neon Horizon (Retro Synthwave)",
    genre: "Electronic / Synthwave",
    score: 91,
    grade: "S-GRADE",
    color: "#1ed760",
    lufs: -8.4,
    plr: 5.8,
    truePeak: -0.2,
    correlation: 0.88,
    danceability: 82,
    energy: 91,
    valence: 68,
    critique: "Excellent sub-bass control, but heavy limiting has squashed the transients. Integrated LUFS is slightly hot at -8.4. Bring down the final threshold by 1dB to restore punch for high-fidelity car sound systems.",
    idealBands: [75, 80, 55, 60, 68, 55] // SUB, BASS, LMID, MID, PRES, AIR
  },
  {
    id: "indie",
    title: "Faded Pines (Organic Indie Folk)",
    genre: "Acoustic / Indie Folk",
    score: 95,
    grade: "MASTERPIECE",
    color: "#3b82f6",
    lufs: -14.2,
    plr: 11.2,
    truePeak: -1.5,
    correlation: 0.94,
    danceability: 48,
    energy: 35,
    valence: 52,
    critique: "Incredible dynamic range (11.2 PLR) and beautifully transparent high frequencies. Fully compliant with Spotify's target corridor. No master-bus alterations needed — the mix is perfectly natural.",
    idealBands: [35, 45, 58, 62, 50, 48]
  },
  {
    id: "lofi",
    title: "Raindrops & Tape Hiss (Lofi Beats)",
    genre: "Chillout / Lofi Hip Hop",
    score: 87,
    grade: "A-GRADE",
    color: "#a855f7",
    lufs: -12.1,
    plr: 9.1,
    truePeak: -1.0,
    correlation: 0.76,
    danceability: 74,
    energy: 42,
    valence: 38,
    critique: "Aesthetic vinyl crackle is causing slightly elevated presence energy, and the tape saturation has rolled off frequencies above 15kHz as intended. Monocompatibility is solid despite wide stereo image.",
    idealBands: [62, 68, 72, 52, 40, 25]
  }
];

export default function AlphaLandingPage({ onBack }: AlphaLandingPageProps) {
  const [scrollY, setScrollY] = useState(0);
  const [activeTrack, setActiveTrack] = useState(SANDBOX_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  
  // Audio sandbox dynamic animation states
  const [simulatedBands, setSimulatedBands] = useState<number[]>([50, 50, 50, 50, 50, 50]);
  const [simulatedLufs, setSimulatedLufs] = useState(activeTrack.lufs);
  const [simulatedPeak, setSimulatedPeak] = useState(activeTrack.truePeak);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animationFrameId = useRef<number | null>(null);

  // Scroll listener for parallax
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Update sandbox stats on track swap
  useEffect(() => {
    setSimulatedLufs(activeTrack.lufs);
    setSimulatedPeak(activeTrack.truePeak);
    setSimulatedBands([...activeTrack.idealBands]);
    setIsPlaying(false);
  }, [activeTrack]);

  // Simulated live audio processing loop
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      const updatePhysics = () => {
        // Create rhythmic bouncing based on simulated beats
        const time = Date.now() * 0.008;
        const kick = Math.sin(time) > 0.7 ? 1.4 : 0.9;
        const snare = Math.cos(time * 1.5) > 0.6 ? 1.3 : 1.0;
        
        setSimulatedBands(activeTrack.idealBands.map((base, idx) => {
          let multiplier = 1.0;
          if (idx <= 1) multiplier = kick;       // Bass bands dance to kick
          else if (idx === 3) multiplier = snare; // Mid bands dance to snare
          else multiplier = 1.0 + Math.sin(time + idx) * 0.15; // Ambient shimmer
          
          const raw = base * multiplier;
          return Math.max(10, Math.min(99, Math.round(raw)));
        }));

        // Subtle flutter on level meters
        setSimulatedLufs(Number((activeTrack.lufs + Math.sin(time * 2) * 0.15).toFixed(1)));
        setSimulatedPeak(Number((activeTrack.truePeak + Math.cos(time * 3) * 0.08).toFixed(2)));

        timer = requestAnimationFrame(updatePhysics);
      };
      timer = requestAnimationFrame(updatePhysics);
    } else {
      setSimulatedBands([...activeTrack.idealBands]);
      setSimulatedLufs(activeTrack.lufs);
      setSimulatedPeak(activeTrack.truePeak);
    }
    return () => {
      cancelAnimationFrame(timer);
    };
  }, [isPlaying, activeTrack]);

  // HTML5 Interactive Fluid Audio Waves Canvas Background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Audio-wave equations drawing loop
    let offset = 0;
    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      // Interpolate mouse coordinates smoothly (Easing)
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const mx = mouseRef.current.x || width / 2;
      const my = mouseRef.current.y || height / 2;

      // Draw multiple layers of translucent waves
      const wavesCount = 3;
      const colors = ["rgba(30, 215, 96, 0.03)", "rgba(59, 130, 246, 0.03)", "rgba(168, 85, 247, 0.02)"];
      
      for (let w = 0; w < wavesCount; w++) {
        ctx.beginPath();
        ctx.fillStyle = colors[w];

        const waveHeight = 80 + w * 40;
        const speed = 0.002 + w * 0.001;
        const frequency = 0.001 + w * 0.0005;

        // Perturb based on mouse position
        const mouseEffect = (mx / width) * 200;
        const waveOffset = offset * (1 + w * 0.2);

        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 15) {
          // Combination of sin/cos for biological fluid movement
          const y = 
            height - 350 +
            Math.sin(x * frequency + waveOffset) * waveHeight +
            Math.cos(x * 0.002 - waveOffset) * 40 +
            (Math.sin((x + mx) * 0.005) * 50 * (my / height));

          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
      }

      offset += 0.01;
      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#040507] text-slate-100 font-sans overflow-x-hidden relative selection:bg-[#1ed760] selection:text-[#040507]">
      
      {/* Dynamic Background Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80"
      />

      {/* Decorative Blur Ambient Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[50%] left-[-20%] w-[800px] h-[800px] rounded-full bg-[#1ed760]/5 blur-[180px] pointer-events-none" />

      {/* --- PREMIUM STICKY HEADER --- */}
      <header className="sticky top-0 w-full z-50 backdrop-blur-2xl bg-[#040507]/70 border-b border-white/[0.04]">
        <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Logo and Tag */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1ed760]/10 border border-[#1ed760]/20 rounded-xl text-[#1ed760]">
              <Waves className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-sm text-white tracking-wider uppercase">
                YourSongScore
              </span>
              <span className="text-[9px] font-mono text-[#1ed760] uppercase tracking-widest leading-none mt-0.5">
                A&R AUDIT SUITE
              </span>
            </div>
          </div>

          {/* SINGLE TARGET MENU LINK - Explicitly requested "Main Page" */}
          <nav>
            <button
              onClick={onBack}
              className="group flex items-center gap-2 bg-[#1ed760] hover:bg-[#1db954] text-neutral-950 text-xs font-mono py-2.5 px-6 rounded-full font-black uppercase tracking-wider shadow-[0_0_25px_rgba(30,215,96,0.2)] hover:shadow-[0_0_35px_rgba(30,215,96,0.35)] transition-all cursor-pointer hover:scale-105 active:scale-95 duration-200"
            >
              <span>Main Page</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 text-neutral-950" />
            </button>
          </nav>
        </div>
      </header>

      {/* --- INTENSE HERO SECTION --- */}
      <section className="relative pt-20 pb-28 lg:pt-32 lg:pb-40 px-6 z-10">
        <div className="w-full max-w-7xl mx-auto text-center flex flex-col items-center">
          
          {/* Tagline Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-white/10 text-[#1ed760] text-[10px] font-mono uppercase tracking-widest mb-8"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1ed760] animate-spin-slow" />
            <span>AI-Driven Spectral Mastering Audits</span>
          </motion.div>

          {/* Immersive Typographical Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-display font-black tracking-tighter text-white leading-[0.95] text-center max-w-5xl"
          >
            Pre-flight checking your song <br />
            <span className="bg-gradient-to-r from-[#1ed760] via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              before the world listens.
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-slate-400 text-base sm:text-xl leading-relaxed max-w-3xl mt-8 mb-12 text-center"
          >
            A high-fidelity diagnostic sandbox simulating Spotify editorial algorithms, loudness normalization curves, and target frequency corridors. Tune your mix to matching perfection.
          </motion.p>

          {/* Large Primary CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-5 items-center justify-center w-full max-w-md"
          >
            <button
              onClick={onBack}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-[#040507] font-mono text-xs font-black py-4 px-10 rounded-xl shadow-[0_4px_30px_rgba(255,255,255,0.15)] transition-all transform hover:-translate-y-0.5 cursor-pointer uppercase tracking-wider"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Enter Workspace</span>
            </button>
            
            <a
              href="#sandbox-interactive"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 text-slate-300 font-mono text-xs py-4 px-8 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
            >
              <span>Test Interactive Deck</span>
              <ChevronRight className="w-4 h-4 text-[#1ed760]" />
            </a>
          </motion.div>

          {/* Visual Divider / Scrolling Hint */}
          <div className="mt-24 flex flex-col items-center gap-2 text-slate-500 animate-bounce">
            <span className="text-[9px] font-mono uppercase tracking-widest">Scroll To Explore</span>
            <div className="w-px h-10 bg-gradient-to-b from-slate-500 to-transparent" />
          </div>

        </div>
      </section>

      {/* --- PLAYABLE WORKSPACE INTERACTIVE SANDBOX --- */}
      <section id="sandbox-interactive" className="py-24 bg-[#090b10] border-y border-white/[0.04] px-6 relative z-10">
        <div className="w-full max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-blue-400 font-mono text-xs uppercase tracking-widest font-bold">THE INTERACTIVE SCREENSHOT</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white mt-3 mb-4">
              Simulate Your Audio Response
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              We took our real app modules and built a playable live simulator. Click on different track profiles, press <strong className="text-white">PLAY</strong>, and watch the analyzer compute real-time vectors!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            
            {/* Sidebar Track Selector */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold text-left block mb-1">
                SELECT PROFILE ARCHETYPE
              </span>
              
              {SANDBOX_TRACKS.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    setActiveTrack(track);
                  }}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                    activeTrack.id === track.id 
                      ? "bg-[#11141c] border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" 
                      : "bg-[#0b0d13] border-white/[0.03] hover:border-white/10 hover:bg-[#0e1119]"
                  }`}
                >
                  {/* Left accent color strip */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1.5 transition-all"
                    style={{ backgroundColor: track.color }}
                  />

                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">
                        {track.genre}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1 group-hover:text-[#1ed760] transition-colors">
                        {track.title}
                      </h4>
                    </div>
                    <div 
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
                      style={{ color: track.color, borderColor: `${track.color}25`, backgroundColor: `${track.color}05` }}
                    >
                      {track.grade}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pl-2 text-[11px] font-mono text-slate-400">
                    <div>Loudness: <span className="text-white font-semibold">{track.lufs} LUFS</span></div>
                    <div>Dynamics: <span className="text-white font-semibold">{track.plr} PLR</span></div>
                  </div>
                </button>
              ))}

              <div className="bg-white/[0.01] border border-white/[0.04] p-5 rounded-2xl text-left mt-4">
                <div className="flex items-center gap-2.5 text-xs font-mono text-[#1ed760] font-bold mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ALGORITHM SAFE-PASS</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Avoid getting your track silent-bypassed. Running an audit aligns your music files within standard deviations of Spotify's target playlist neighborhoods.
                </p>
              </div>
            </div>

            {/* Simulated Live Analyzer Screen */}
            <div className="lg:col-span-8 bg-[#0b0d13] border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between relative overflow-hidden text-left">
              
              {/* LED status grid accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-radial-gradient from-blue-500/10 to-transparent pointer-events-none" />

              {/* Console Header */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500/80 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    DECK_SIMULATOR_V6.SH
                  </span>
                </div>
                
                {/* Active Play Control */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-2 font-mono text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-wider cursor-pointer transition-all ${
                    isPlaying 
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                      : "bg-[#1ed760] hover:bg-[#1db954] text-neutral-950"
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 fill-current" />
                      <span>Stop Simulation</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current text-neutral-950" />
                      <span>Run Live Play</span>
                    </>
                  )}
                </button>
              </div>

              {/* Main Workspace Metrics Visual Frame */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch mb-6">
                
                {/* Score Dial Circle */}
                <div className="md:col-span-4 bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative">
                  <div className="relative w-28 h-28 rounded-full border-[6px] border-white/5 flex items-center justify-center">
                    
                    {/* Pulsating colorful inner ring */}
                    <div 
                      className="absolute inset-0 rounded-full border-[6px] transition-all duration-500"
                      style={{ 
                        borderColor: activeTrack.color,
                        transform: isPlaying ? "scale(1.02)" : "scale(1)",
                        boxShadow: isPlaying ? `0 0 20px ${activeTrack.color}40` : "none"
                      }}
                    />

                    <div className="flex flex-col items-center z-10">
                      <span className="text-3xl font-black text-white font-mono leading-none">
                        {activeTrack.score}
                      </span>
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                        SCORE GRADE
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold mt-4" style={{ color: activeTrack.color }}>
                    {activeTrack.grade}
                  </span>
                </div>

                {/* Technical Hardware Level Rails */}
                <div className="md:col-span-8 bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* LUFS bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono mb-1">
                        <span className="text-slate-400">INTEGRATED LOUDNESS</span>
                        <span className="text-white font-bold">{simulatedLufs} LUFS</span>
                      </div>
                      <div className="h-2.5 bg-[#13161c] rounded-full relative overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300" 
                          style={{ width: `${Math.min(100, Math.max(10, ((simulatedLufs + 24) / 18) * 100))}%` }}
                        />
                        <div className="absolute left-[33%] w-px h-full bg-red-500" title="Brickwall safezone" />
                      </div>
                    </div>

                    {/* True Peak bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono mb-1">
                        <span className="text-slate-400">TRUE PEAK CEILING</span>
                        <span className={simulatedPeak > -1.0 ? "text-yellow-400 font-bold" : "text-white font-bold"}>
                          {simulatedPeak} dBTP
                        </span>
                      </div>
                      <div className="h-2.5 bg-[#13161c] rounded-full relative overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-300" 
                          style={{ width: `${Math.min(100, Math.max(10, ((simulatedPeak + 4) / 4) * 100))}%` }}
                        />
                        <div className="absolute left-[75%] w-px h-full bg-red-500" title="-1.0 dBTP ceiling limit" />
                      </div>
                    </div>

                    {/* Dynamics LRA ratio */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono mb-1">
                        <span className="text-slate-400">PEAK-TO-LOUDNESS RATIO (PLR)</span>
                        <span className="text-[#1ed760] font-bold">{activeTrack.plr} PLR</span>
                      </div>
                      <div className="h-2.5 bg-[#13161c] rounded-full relative overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-teal-500 to-emerald-400" 
                          style={{ width: `${Math.min(100, (activeTrack.plr / 15) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between text-[9px] font-mono text-slate-500 border-t border-white/5 pt-3 mt-4">
                    <span>Target: -14 to -11 LUFS</span>
                    <span>True Peak Target: &lt; -1.0 dBTP</span>
                  </div>
                </div>

              </div>

              {/* 6-Band Frequency Live Spectrum */}
              <div className="bg-black/60 border border-white/5 rounded-2xl p-5 mb-6">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-4">
                  6-BAND DYNAMIC SPECTRUM ENERGY
                </span>
                
                <div className="h-24 flex items-end justify-between gap-3 px-2">
                  {simulatedBands.map((val, idx) => {
                    const label = ["SUB", "BASS", "L-MID", "C-MID", "PRES", "AIR"][idx];
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-[#13161c] h-16 rounded-md overflow-hidden relative flex flex-col justify-end">
                          <div 
                            className="w-full bg-gradient-to-t from-blue-600 via-[#1ed760] to-purple-500 transition-all duration-150"
                            style={{ height: `${val}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-mono text-slate-500 mt-2">{label}</span>
                        <span className="text-[9px] font-mono text-white font-bold mt-0.5">{val}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic AI Diagnostic Output Critique */}
              <div className="bg-[#12151c] border border-white/10 p-5 rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-mono text-[#1ed760] font-bold mb-2">
                  <Activity className="w-4 h-4" />
                  <span>A&R DIAGNOSTIC ENGINE VERDICT</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
                  {isPlaying ? (
                    <span className="animate-pulse text-white">&gt; Processing audio streams... calculating algorithm compliance parameters...</span>
                  ) : (
                    <span>"{activeTrack.critique}"</span>
                  )}
                </p>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* --- STUDIO GEAR BRUSHED-METAL BENTO GRID --- */}
      <section className="py-24 px-6 relative z-10">
        <div className="w-full max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-[#1ed760] font-mono text-xs uppercase tracking-widest font-bold">HARDWARE-GRADE HARDCORE STATS</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white mt-3 mb-4">
              Diagnostic Hardware Racks
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              We ditched standard flat, clinical dashboards for visual representations modeled after real solid-state compression hardware gear.
            </p>
          </div>

          {/* Bento Rack Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            
            {/* Gear Block 1: Echo Nest Corridors */}
            <div className="md:col-span-8 bg-[#0d1016] border border-white/10 p-6 rounded-3xl flex flex-col justify-between text-left relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-b from-[#1ed760]/10 to-transparent pointer-events-none" />
              
              <div>
                <div className="flex items-center justify-between pb-3 mb-6 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#1ed760]" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">ECHO NEST CORRIDORS</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">CORRIDOR_MATCH_V1</span>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">Reverse-Engineered Echo Nest Vectors</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Spotify identifies tracks using 7 core dimensions. If your file falls outside the target boundary of your subgenre, the recommender system automatically excludes it from Discover Weekly and Release Radar.
                </p>
              </div>

              {/* Graphical demonstration mockup */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {[
                  { name: "DANCEABILITY", target: "65% - 85%", status: "NOMINAL", val: "74%" },
                  { name: "ENERGY", target: "70% - 90%", status: "NOMINAL", val: "82%" },
                  { name: "VALENCE", target: "45% - 70%", status: "DEFICIT", val: "38%" },
                  { name: "ACOUSTIC", target: "0% - 20%", status: "NOMINAL", val: "4%" }
                ].map((item, idx) => (
                  <div key={idx} className="bg-black/30 p-3 rounded-xl border border-white/5 text-left">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">{item.name}</span>
                    <span className="text-sm font-bold text-white block mt-1">{item.val}</span>
                    <span className="text-[9px] font-mono text-slate-400 block mt-1">Target: {item.target}</span>
                    <span className={`text-[8px] font-mono font-bold mt-2 inline-block px-1.5 py-0.5 rounded ${
                      item.status === "NOMINAL" ? "bg-emerald-500/10 text-[#1ed760]" : "bg-red-500/10 text-red-400"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gear Block 2: Spatial Imaging & Azimuth Angle */}
            <div className="md:col-span-4 bg-[#0d1016] border border-white/10 p-6 rounded-3xl flex flex-col justify-between text-left relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

              <div>
                <div className="flex items-center justify-between pb-3 mb-6 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">AZIMUTH SPATIAL RACK</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">STEREO_AZI_06</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">Phase & Spatial Compliance</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Avoid out-of-phase panning mistakes that disappear on mono mobile speakers. Calculate perfect stereo width mapping with phase correlation limits.
                </p>
              </div>

              {/* Dynamic Coordinate Plot representation */}
              <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center h-36 mt-4">
                <div className="w-24 h-24 rounded-full border border-white/10 relative flex items-center justify-center">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                  
                  {/* Rotating Stereo width beam */}
                  <div className="absolute w-1.5 h-16 bg-blue-500/80 rounded-full transform rotate-[15deg]" />
                  <div className="absolute w-0.5 h-16 bg-[#1ed760] rounded-full transform rotate-[-25deg]" />
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-2">MONO CHECK: 100% OK</span>
              </div>
            </div>

            {/* Gear Block 3: Dynamic Compression Limit Indicator */}
            <div className="md:col-span-4 bg-[#0d1016] border border-white/10 p-6 rounded-3xl flex flex-col justify-between text-left relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />

              <div>
                <div className="flex items-center justify-between pb-3 mb-6 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">COMPRESSION LIMITER</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">PLR_CHECKER</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">Peak-to-Loudness (PLR)</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Is your track brickwalled to death, or does it hold the open dynamics of major radio hits? Track precise transient degradation live.
                </p>
              </div>

              <div className="flex gap-1.5 items-end h-16 bg-black/40 rounded-xl p-3 border border-white/5 mt-4">
                {[10, 20, 35, 55, 78, 92, 70, 45, 20, 10].map((val, idx) => (
                  <div key={idx} className="flex-1 bg-purple-500/80 rounded-sm" style={{ height: `${val}%` }} />
                ))}
              </div>
            </div>

            {/* Gear Block 4: FFT Multi-Band Leveling */}
            <div className="md:col-span-8 bg-[#0d1016] border border-white/10 p-6 rounded-3xl flex flex-col justify-between text-left relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-b from-[#1ed760]/10 to-transparent pointer-events-none" />

              <div>
                <div className="flex items-center justify-between pb-3 mb-6 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <BarChart4 className="w-4 h-4 text-[#1ed760]" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">6-BAND BALANCER</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">FFT_BAND_V2</span>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">6-Band Level Auditing</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Check the precise ratio of Sub-Bass (20-64Hz) against Core Mids and Presence. Identify frequency buildup points that trigger consumer audio system mud.
                </p>
              </div>

              <div className="grid grid-cols-6 gap-3 mt-4">
                {[
                  { label: "Sub-Bass", val: "65%" },
                  { label: "Bass", val: "72%" },
                  { label: "Low-Mids", val: "48%" },
                  { label: "Mids", val: "54%" },
                  { label: "Presence", val: "42%" },
                  { label: "Air", val: "31%" }
                ].map((band, idx) => (
                  <div key={idx} className="bg-black/30 border border-white/5 rounded-xl p-2.5 text-center">
                    <span className="text-[7px] font-mono text-slate-500 uppercase tracking-widest block">{band.label}</span>
                    <span className="text-xs font-bold text-[#1ed760] font-mono block mt-1">{band.val}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* --- REASSURING STEPS / VALUE FUNNEL --- */}
      <section className="py-24 bg-[#07090d]/80 px-6 relative z-10">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <div className="text-left">
              <span className="text-blue-400 font-mono text-xs uppercase tracking-widest font-bold">ALGORITHMIC TRUTHS</span>
              <h2 className="text-4xl font-display font-extrabold text-white mt-3 mb-6">
                Editorial playlists are curated by vectors, not opinions.
              </h2>
              <p className="text-slate-400 text-base leading-relaxed mb-8">
                Every track pitched to Spotify Editorial curators first passes through an automated feature extraction system. If your song does not match the statistical properties of your target genre, curators will never even see your pitch.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-[#1ed760] h-fit">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Avoid Pitch Exclusion</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">Ensure your rhythm grid stability complies with targeted playlist profiles before hitting submit.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-[#1ed760] h-fit">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Calibrate Master Headroom</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">Fix excessive low-mid build-ups that choke limiting compressors and trigger distortion on Apple Music normalization curves.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Overlapping screenshots/mockups representing extreme premium aesthetic */}
              <div className="bg-[#12151d] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-left">
                <div className="flex justify-between items-center pb-3 mb-4 border-b border-white/5 text-xs font-mono text-slate-400">
                  <span>METRIC SCORECARD SUMMARY</span>
                  <Award className="w-4 h-4 text-[#1ed760]" />
                </div>

                <div className="space-y-3.5">
                  {[
                    { label: "Rhythm Compliance", percent: 94, status: "EXCELLENT" },
                    { label: "Stereo Azimuth Correlation", percent: 89, status: "NOMINAL" },
                    { label: "Dynamic Contrast Range", percent: 92, status: "EXCELLENT" },
                    { label: "Master Loudness Curve", percent: 85, status: "COMPLIANT" }
                  ].map((row, idx) => (
                    <div key={idx} className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-white block">{row.label}</span>
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5 inline-block">Scorecard Parameter Verified</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-bold text-[#1ed760] block">{row.percent}%</span>
                        <span className="text-[8px] font-mono text-slate-400 block tracking-widest font-black mt-0.5">{row.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- GIANT MARKETING CTA SECTION --- */}
      <section className="py-28 bg-gradient-to-t from-[#020305] to-[#090b10] border-t border-white/[0.04] px-6 relative z-10">
        <div className="absolute inset-x-0 bottom-0 h-96 bg-[#1ed760]/3 blur-[150px] pointer-events-none" />

        <div className="w-full max-w-4xl mx-auto text-center relative z-20">
          <div className="p-4 bg-[#1ed760]/10 border border-[#1ed760]/20 rounded-3xl w-fit mx-auto mb-8 text-[#1ed760]">
            <Waves className="w-10 h-10 animate-pulse" />
          </div>

          <h2 className="text-4xl sm:text-6xl font-display font-black text-white tracking-tight mb-6 leading-[1.05]">
            Master your sound. <br />
            <span className="bg-gradient-to-r from-[#1ed760] to-blue-400 bg-clip-text text-transparent">
              Benchmark your music now.
            </span>
          </h2>

          <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop uploading blind mixes to streaming platforms. Take advantage of deep, platform-aware technical commentary from YourSongScore today.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-sm mx-auto">
            <button
              onClick={onBack}
              className="flex-1 bg-[#1ed760] hover:bg-[#1db954] text-neutral-950 font-mono text-xs font-black py-4 px-8 rounded-xl shadow-[0_10px_35px_rgba(30,215,96,0.3)] hover:shadow-[0_10px_45px_rgba(30,215,96,0.55)] hover:scale-105 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
            >
              Analyze Your Tracks Now
            </button>
          </div>

          <div className="mt-16 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            <span>YourSongScore Studio v6 • Independent &R Toolkits</span>
          </div>
        </div>
      </section>

    </div>
  );
}
