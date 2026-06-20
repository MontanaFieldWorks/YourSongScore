import React from "react";
import { 
  ArrowLeft, Layers, Sparkles, BookOpen, Clock, BarChart3, Wrench, 
  Tv, Code, ShieldCheck, Heart, Radio, LineChart, HelpCircle
} from "lucide-react";

interface WhatItDoesPageProps {
  onBack: () => void;
}

export default function WhatItDoesPage({ onBack }: WhatItDoesPageProps) {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col gap-8 font-sans animate-fadeIn max-w-5xl mx-auto" id="what-it-does-yoursongscore-page">
      
      {/* 1. Header Navigation and Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0b0e] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={onBack}
            className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-105"
            title="Return to song audit view"
          >
            <ArrowLeft className="w-5 h-5 animate-pulse" />
          </button>
          
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#a855f7] font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Score Mechanics &amp; App Engine Directory</span>
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              What YourSongScore Does
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

      {/* 2. Core Diagnostic Cards Section */}
      <div className="flex flex-col gap-6 text-left">
        <div>
          <span className="text-[10px] font-mono uppercase bg-[#16203a] border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full w-fit tracking-widest font-bold">
            THE THREE BENCHMARK FORMULAS
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-2.5">
            Diagnostic Scores &amp; Weight Breakdowns
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Understanding the math and methodology behind the three major scoring cards at the top of your audio audit panel.
          </p>
        </div>

        {/* Diagnostic Score Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Mainstream Card */}
          <div className="bg-[#0A0B0E] border border-blue-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
            <div>
              <span className="text-[9px] font-mono text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md font-bold tracking-widest">
                CARD #1
              </span>
              <h3 className="text-base font-extrabold text-white mt-3">Commercial Impact Score</h3>
              <p className="text-xs font-mono text-blue-400/90 tracking-wider uppercase mt-1">Algorithmic Readiness Index</p>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Evaluates how well a song aligns with modern streaming delivery requirements and mainstream-formatted radio playlists. It measures whether the track's sonic blueprint can successfully pass predictive algotorial filtering steps upon initial release.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <span className="text-[10px] font-mono text-slate-400 block mb-2 uppercase tracking-wider font-semibold">Weight Math:</span>
              <div className="flex flex-col gap-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Streaming Readiness</span>
                  <span className="text-blue-400 font-bold">80%</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Overall Production</span>
                  <span className="text-blue-400 font-bold">20%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Artistic Card */}
          <div className="bg-[#0A0B0E] border border-purple-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
            <div>
              <span className="text-[9px] font-mono text-purple-400 uppercase bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md font-bold tracking-widest">
                CARD #2
              </span>
              <h3 className="text-base font-extrabold text-white mt-3">Artistic Impact Score</h3>
              <p className="text-xs font-mono text-purple-400/90 tracking-wider uppercase mt-1">Creative &amp; Technical Depth</p>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Designed completely independent of commercial formula constraints. This index values atmospheric integrity, non-traditional poetic storytelling, harmonic complexity (like open-tunings, chord gravity), and general creative alignment.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <span className="text-[10px] font-mono text-slate-400 block mb-2 uppercase tracking-wider font-semibold">Weight Math:</span>
              <div className="flex flex-col gap-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Music Theory Score</span>
                  <span className="text-purple-400 font-bold">35%</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Lyrical Impact</span>
                  <span className="text-purple-400 font-bold">35%</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Overall Production</span>
                  <span className="text-purple-400 font-bold">30%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Songwriting Card */}
          <div className="bg-[#0A0B0E] border border-emerald-500/10 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/20 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
            <div>
              <span className="text-[9px] font-mono text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold tracking-widest">
                CARD #3
              </span>
              <h3 className="text-base font-extrabold text-white mt-3">Songwriting Quality Score</h3>
              <p className="text-xs font-mono text-emerald-400/90 tracking-wider uppercase mt-1">Structural Mechanics Index</p>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Measures whether the underlying dynamic form is fundamentally strong. Regardless of where and how the audio was recorded, this index is computed relative to the effectiveness of arrangement builders, melodic DNA, and lyric-vocal synergy.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <span className="text-[10px] font-mono text-slate-400 block mb-2 uppercase tracking-wider font-semibold">Weight Math:</span>
              <div className="flex flex-col gap-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Melodic DNA</span>
                  <span className="text-emerald-400 font-bold">Balanced Avg</span>
                </div>
                <p className="text-[10px] text-slate-500 px-2 font-mono leading-tight">
                  (70% Arrangement Flow + 30% Theory Score)
                </p>
                <div className="flex justify-between text-slate-300 mt-0.5">
                  <span>Tension Mechanics</span>
                  <span className="text-emerald-400 font-bold">Balanced Avg</span>
                </div>
                <p className="text-[10px] text-slate-500 px-2 font-mono leading-tight">
                  (60% Arrangement Flow + 40% Instrumental Performance)
                </p>
                <div className="flex justify-between text-slate-300 mt-0.5">
                  <span>Density Mechanics</span>
                  <span className="text-emerald-400 font-bold">Balanced Avg</span>
                </div>
                <p className="text-[10px] text-slate-500 px-2 font-mono leading-tight">
                  (80% Lyrical Impact + 20% Vocal Tone)
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. The Interactive Feature Directory Dashboard */}
      <div className="flex flex-col gap-6 text-left border-t border-white/5 pt-10">
        <div>
          <span className="text-[10px] font-mono uppercase bg-[#18112d] border border-purple-500/10 text-purple-400 px-3 py-1 rounded-full w-fit tracking-widest font-bold">
            THE APPLICATION FEATURE MAP
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-2.5">
            Every Other Feature of the App Explained
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            An overview of the diagnostic panels, audio analyzers, metadata writers, and real-time simulations executing under the hood.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Feature 1: Metadata / Writer Panel */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex-shrink-0 h-fit">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">Metadata &amp; Writer Panel</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Estimates the core genre, lists recommended secondary subgenres, calculates target searchability ratings of your title, and identifies copyright risk vectors to ensure your metadata resists commercial search index collisions.
              </p>
            </div>
          </div>

          {/* Feature 2: Playout / Algorical Simulators */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex-shrink-0 h-fit">
              <Radio className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">Algorical / Playout Simulators</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Simulates real streaming conditions with interactive testing layouts. Includes sequential Playlist Coherence (Handoff Test), Russell's Affective Valence Coordinates (Similarity Constellation Mapping), and critical 30-Second Skip Risk Behavior curves.
              </p>
            </div>
          </div>

          {/* Feature 3: Mixing Desk / Spectral Analysis */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex-shrink-0 h-fit">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">Mixing Desk &amp; Spectral Balance</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scans your audio's transient spectrum across four critical frequency brackets (Low Mud, Low-Mid Boxiness, High-Mid Harshness, High Air). Generates DAW adjustment checklists outlining step-by-step EQ gains, Q-widths, and compression targets for your vocal/harmonic tracks.
              </p>
            </div>
          </div>

          {/* Feature 4: Performance Meter (Vocal & Instrument) */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex-shrink-0 h-fit">
              <LineChart className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">Performance Meter (Vocal &amp; Instrument)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rates the execution of the song's key performers. Deeply inspects backline articulation, bassline tracking, instrument separation, vocal pitch delivery, vocal chain treatment, breath management, and ensemble handoff tightness.
              </p>
            </div>
          </div>

          {/* Feature 5: Composition Flow */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl flex-shrink-0 h-fit">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">Composition Flow</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Examines structural timing: the pacing of sectional transitions, tension-release arcs, hook placements, repetitive choruses, and melodic contours. It makes sure that independent of recording quality, the underlying song blueprint captures the listener's focus.
              </p>
            </div>
          </div>

          {/* Feature 6: 3x Analysis (High Stability Mode) */}
          <div className="bg-[#13161C]/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl flex-shrink-0 h-fit">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <h4 className="text-sm font-bold text-white">3x Analysis Mode (High Stability Engine)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Toggles a multi-pass audit script that processes your audio critique three times simultaneously. It evaluates convergent mathematical averages of all scores to bypass artificial intelligence generation variance and deliver reliable metrics.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Spotify Stream Limitations Explanation Section */}
      <div 
        id="spotify-preview-limitations-explanation"
        className="mt-4 p-6 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 hover:border-amber-500/25 rounded-3xl text-left transition-all duration-300 ring-1 ring-amber-500/10"
      >
        <div className="flex gap-4">
          <HelpCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-amber-500 font-bold block">
              Aesthetic Fidelity &amp; Stream Range note
            </span>
            <span className="text-sm font-extrabold text-slate-200">
              Why MP3/WAV Upload is Required for True Full-Length Audits
            </span>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Spotify restricts developer-registered applications to fetching a <span className="text-amber-400 font-semibold font-mono">30-second high-quality preview stream</span>. While this is sufficient for our listener AI to analyze tone balance signatures, sub-bass weights, and vocal clarity within that segment, it is unable to sweep the complete composition.
            </p>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Because of this limitation, the AI cannot audit your entire structural pacing, energetic build-ups, dynamic drop off progression, or mathematically locate exactly when your <span className="text-white font-medium">main chorus/hook occurs</span> if it resides outside of that initial 30-second window.
            </p>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              For a granular, unbounded, and fully technical A&amp;R master audit across your track's full timeline, <span className="text-blue-400 font-semibold">uploading your complete master MP3 or WAV file</span> remains the gold standard.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Bottom Launch CTA Card */}
      <div className="bg-[#0A0B0E] border border-white/5 p-8 rounded-3xl relative overflow-hidden flex flex-col gap-4 text-center mt-4 select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-col items-center gap-1.5 z-10">
          <span className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl inline-block mb-1 shadow-inner">
            <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight">Run Your Real-Time Session</h2>
          <p className="text-xs text-slate-400 max-w-lg leading-relaxed mt-1 mx-auto">
            Ready to test your track against standard commercial and artistic thresholds?
          </p>
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 mt-4 cursor-pointer hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:scale-102"
          >
            <span>LAUNCH DESIGN ENGINE</span>
          </button>
        </div>
      </div>

    </div>
  );
}
