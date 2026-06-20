import React from "react";
import { 
  ArrowLeft, Compass, Info, Gauge, Zap, AlertCircle, HelpCircle, 
  Activity, Sparkles, MoveRight, ChevronRight, Play, Heart, Flame, ShieldAlert
} from "lucide-react";

interface WhatIsPageProps {
  onBack: () => void;
}

export default function WhatIsPage({ onBack }: WhatIsPageProps) {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col gap-8 font-sans animate-fadeIn max-w-5xl mx-auto" id="what-is-yoursongscore-page">
      
      {/* 1. Header Navigation and Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={onBack}
            className="p-3 bg-neutral-900/80 hover:bg-white/5 border border-white/5 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-105"
            title="Return to song audit view"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400 font-bold flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Diagnostic Scope &amp; Curation Philosophy</span>
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              What YourSongScore Is (and Isn't)
            </h1>
          </div>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.30)] hover:scale-102 self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Song Audit</span>
        </button>
      </div>

      {/* 2. The Core Analogy Backdrop: Car vs Highway */}
      <div className="bg-[#13161C] border border-white/10 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-2xl select-none">
        {/* Decorative subtle visual grid */}
        <div className="absolute inset-0 bg-grid-white/[0.02] mask-linear-gradient pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-600/5 to-purple-600/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 text-left">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase bg-blue-600/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full w-fit tracking-widest font-bold">
              THE CAR VS THE HIGHWAY ANALOGY
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              A World-Class Engine Diagnosis
            </h2>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed mt-1">
              Developing a great record requires separating your audio's structural integrity from the chaotic conditions of commercial delivery. Here is how to understand YourSongScore's analysis profile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {/* The Car (What it is) */}
            <div className="bg-black/45 border border-emerald-500/15 rounded-2xl p-6 relative flex flex-col justify-between hover:border-emerald-500/25 transition-all">
              <div className="absolute top-4 right-4 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                DIAGNOSTIC FACT
              </div>
              <div>
                <span className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl inline-block mb-4">
                  <Gauge className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-200">What It Is: The Visual &amp; Structural Tuner</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  YourSongScore tells you: <span className="text-emerald-300 font-bold">"Your engine is custom tuned, your tires have perfect grip, and your physical chassis is rock solid."</span>
                </p>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  It acts as a master benchmark measuring your frequency balances, vocal compression ratios, melodic phrasing tightness, and spatial acoustics. It guarantees that on an engineering level, your track matches industry competitive formats.
                </p>
              </div>
              <div className="border-t border-white/5 mt-6 pt-3 text-[10px] text-slate-500 font-mono">
                ✓ SPECTRAL FOCUS • ✓ HARMONIC DENSITY • ✓ DAW COMPLIANCE
              </div>
            </div>

            {/* The Highway (What it isn't) */}
            <div className="bg-black/45 border border-pink-500/15 rounded-2xl p-6 relative flex flex-col justify-between hover:border-pink-500/25 transition-all">
              <div className="absolute top-4 right-4 text-[10px] font-mono font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/15">
                REALITY LIMIT
              </div>
              <div>
                <span className="p-3 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl inline-block mb-4">
                  <Compass className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-200">What It Isn't: The Crowded Speed Highway</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  YourSongScore does not natively predict: <span className="text-pink-300 font-bold">"Here is exactly how your car will navigate rush-hour traffic on a high-speed inter-city highway."</span>
                </p>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  The "highways" are the streaming distributors (like Spotify, Apple Music, and Deezer). They are the Highway Patrol too! They enforce algorithmic curation constraints and observe real-time human behavior metrics that alter your reach outside of the audio's engineering scope.
                </p>
              </div>
              <div className="border-t border-white/5 mt-6 pt-3 text-[10px] text-slate-500 font-mono">
                ⚠ AGGRESSIVE DNL CODES • ⚠ SKIP PROBABILITIES • ⚠ TRANSIENT BLENDING
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. The Three Algorithmic Highway Gates */}
      <div className="flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            The Three Algorithmic Highway Gates
            <span className="text-xs bg-neutral-900 border border-white/10 text-slate-400 font-mono px-2 py-0.5 rounded-full lowercase font-normal">and how we help you simulate them</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Understanding how streaming systems evaluate your track after delivery, and how our interactive sandbox widgets prepare you for the test.
          </p>
        </div>

        {/* Gate Grid */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* Gate 1: The Neighbor Test */}
          <div className="bg-[#0A0B0E] border border-white/10 rounded-2xl p-6 transition-all hover:bg-[#10131A]">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-blue-400 px-2 py-1 bg-blue-500/15 border border-blue-500/20 rounded">
                    GATE #1
                  </span>
                  <h3 className="text-base font-extrabold text-white">The "Neighbor Test" (Sequential Coherence)</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Spotify's recommender algorithm cares deeply about consecutive playlist transitions. When an organic or curated playlist changes, it grades whether your file will sound jarring when played immediately after a track by an artist like <span className="text-slate-200 font-medium">Olivia Rodrigo</span> or right before <span className="text-slate-200 font-medium">Drake</span>. 
                </p>
                <div className="bg-black/50 border border-red-500/10 rounded-xl p-3 text-red-400 text-[11px] leading-relaxed flex gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">The Hard Truth:</strong> A standard local audio checker does not measure this live "handshake" or consecutive blending step between your asset and the rest of the world's commercial library.
                  </div>
                </div>
              </div>

              <div className="md:w-1/2 border-t md:border-t-0 md:border-l border-white/5 pt-5 md:pt-0 md:pl-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-blue-500/10 border border-blue-500/15 text-blue-400 px-2.5 py-0.5 rounded-full w-fit font-bold tracking-widest block mb-2">
                    OUR PRE-EMPTIVE COMPANION
                  </span>
                  <h4 className="text-sm font-bold text-slate-200">💡 Playlist Transition "Handoff" Simulator</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    We have provided an advanced consecutive simulation matrix at the bottom of your audit display dashboard. 
                  </p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    This simulator uses your track's BPM and estimated Key signature to model transitions against adjacent songs in typical catalog groupings. Test for <span className="text-slate-200 font-medium">Uniform flow</span> (smooth blending), <span className="text-slate-200 font-medium">Elevator mode</span> (increasing key energy), or detect high skip risks caused by a <span className="text-rose-400 font-medium font-mono">Sudden Shift</span>.
                  </p>
                </div>
                <div className="bg-blue-950/20 border border-blue-800/20 text-blue-400 text-[10px] px-3 py-2 rounded-lg font-mono tracking-wide mt-4">
                  RUN SIMULATION ON: VIBE-TRANSITION LAB PANEL
                </div>
              </div>
            </div>
          </div>

          {/* Gate 2: The Mood Coordinate */}
          <div className="bg-[#0A0B0E] border border-white/10 rounded-2xl p-6 transition-all hover:bg-[#10131A]">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-pink-400 px-2 py-1 bg-pink-500/15 border border-pink-500/20 rounded">
                    GATE #2
                  </span>
                  <h3 className="text-base font-extrabold text-white">The "Mood Coordinate" (Acoustic Placement)</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Rather than classifying songs with vague generic keywords like "chill" or "dark", modern recommendation graphs plot files into strict mathematical X and Y coordinates inside <span className="text-slate-200 font-medium">Russell's Circumplex Model of Affect</span>. 
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  They specifically measure <span className="text-slate-200 font-medium">Valence</span> (emotional positivity or melancholic resolution) versus <span className="text-slate-200 font-medium">Energy</span> (acoustic intensity, drive, and transient thickness). Positioning your song relative to millions of others in the exact same style bracket determines its playlist cluster.
                </p>
                <div className="bg-black/50 border border-red-500/10 rounded-xl p-3 text-red-400 text-[11px] leading-relaxed flex gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">The Hard Truth:</strong> Pulling complete regional mood indexing directly from global cluster databases in real-time would inflate the cost of our lightweight analyzer to around <span className="text-slate-200 font-bold font-mono">$250/month</span> per seat.
                  </div>
                </div>
              </div>

              <div className="md:w-1/2 border-t md:border-t-0 md:border-l border-white/5 pt-5 md:pt-0 md:pl-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-pink-500/10 border border-pink-500/15 text-pink-400 px-2.5 py-0.5 rounded-full w-fit font-bold tracking-widest block mb-2">
                    OUR PRE-EMPTIVE COMPANION
                  </span>
                  <h4 className="text-sm font-bold text-slate-200">💡 Proprietary Visual Vector Constellation</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    To deliver premium intelligence without high subscription overhead, we developed a local Similarity Mapping Engine.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    It calculates a high-fidelity estimate of your music's valence/energy state using composition indicators, lyric sentiments, and loudness scales. This places you in one of four distinct flagships—<span className="text-slate-200 font-medium">Today's Top Hits, Chill Vibes, Discover Weekly, or Indie Stage</span>—providing clear targets for your marketing efforts.
                  </p>
                </div>
                <div className="bg-pink-950/20 border border-pink-800/20 text-pink-400 text-[10px] px-3 py-2 rounded-lg font-mono tracking-wide mt-4">
                  VISUALIZE VECTORS: COSINE SIMILARITY MAPPING PANEL
                </div>
              </div>
            </div>
          </div>

          {/* Gate 3: The Audience Behavior Forecast */}
          <div className="bg-[#0A0B0E] border border-white/10 rounded-2xl p-6 transition-all hover:bg-[#10131A]">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-purple-400 px-2 py-1 bg-purple-500/15 border border-purple-500/20 rounded">
                    GATE #3
                  </span>
                  <h3 className="text-base font-extrabold text-white">The "Audience Behavior" Forecast (Skip &amp; Progress)</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The ultimate gatekeeper in streaming recommendation algorithms is cumulative listener behavior. The first <span className="text-emerald-400 font-bold font-mono">30 seconds</span> of a song dictate its financial lifecycle—if a listener skips before 30s, the streaming companies register a "zero value event" and down-rank your catalog weight.
                </p>
                <div className="bg-black/50 border border-red-500/10 rounded-xl p-3 text-red-400 text-[11px] leading-relaxed flex gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">The Hard Truth:</strong> No offline algorithm can definitively guarantee actual human click behavior. A listener's immediate skip reaction depends heavily on transient room environment, mood shifts, and attention fatigue.
                  </div>
                </div>
              </div>

              <div className="md:w-1/2 border-t md:border-t-0 md:border-l border-white/5 pt-5 md:pt-0 md:pl-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-purple-500/10 border border-purple-500/15 text-purple-400 px-2.5 py-0.5 rounded-full w-fit font-bold tracking-widest block mb-2">
                    OUR PRE-EMPTIVE COMPANION
                  </span>
                  <h4 className="text-sm font-bold text-slate-200">💡 30-Second Skip &amp; Playout Simulator</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    While we cannot read the mind of every listener, we built an interactive playout time-trial sandbox that models skip-risk curves based on production quality and emotional focus.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Press the <span className="text-slate-200 font-semibold uppercase font-mono">Test Run</span> button on the simulator to watch a simulation crawl over key song phases. Check your risk drop as the introductory transients resolve and vocal anchors lock in, helping you identify and fix structural pacing errors before distributing your audio.
                  </p>
                </div>
                <div className="bg-purple-950/20 border border-purple-800/20 text-purple-400 text-[10px] px-3 py-2 rounded-lg font-mono tracking-wide mt-4">
                  ENGAGE TRIAL: 30S SKIP &amp; PLAYOUT SIMULATOR PANEL
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Beautiful Bottom CTA Summary Card */}
      <div className="bg-[#0A0B0E] border border-white/10 p-8 rounded-3xl relative overflow-hidden flex flex-col gap-4 text-center mt-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-col items-center gap-1.5 z-10">
          <span className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl inline-block mb-1 shadow-inner animate-pulse">
            <Activity className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight">Ready to Tune Your Performance?</h2>
          <p className="text-xs text-slate-400 max-w-lg leading-relaxed mt-1 mx-auto">
            Reviewing your diagnostic metrics inside our master panels establishes your basic dynamic and musical stability. Testing them in the playlist sandbox readies you for real audience routing.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 mt-4 cursor-pointer hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:scale-102"
          >
            <span>LAUNCH DESIGN ENGINE</span>
            <MoveRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
