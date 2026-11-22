import React, { useEffect, useRef } from "react";
import { 
  ArrowLeft, Volume2, Activity, Sliders, Gauge, Waves, 
  Radio, Wrench, ShieldCheck, Layers, Compass, Zap, HelpCircle, Sparkles, BookOpen
} from "lucide-react";

interface EngineeringDetailsPageProps {
  onBack: () => void;
}

export default function EngineeringDetailsPage({ onBack }: EngineeringDetailsPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const modules = [
    { id: "harmonic-resolution", name: "Harmonic Resolution", icon: Zap, color: "text-purple-400" },
    { id: "signal-levels", name: "Signal & Levels", icon: Gauge, color: "text-purple-400" },
    { id: "dynamics-profile-1", name: "Dynamics Profile", icon: Activity, color: "text-purple-400" },
    { id: "frequency-balance", name: "Frequency Balance", icon: Sliders, color: "text-purple-400" },
    { id: "stereo-field", name: "Stereo Field", icon: Waves, color: "text-purple-400" },
    { id: "genre-compliance", name: "Genre Compliance", icon: ShieldCheck, color: "text-purple-400" },
    { id: "noise-artifacts", name: "Noise & Artifacts", icon: Wrench, color: "text-purple-400" },
    { id: "arrangement-patterns", name: "Arrangement Patterns", icon: Layers, color: "text-purple-400" },
    { id: "stereo-azimuth", name: "Stereo Azimuth Profile", icon: Compass, color: "text-purple-400" }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex flex-col gap-8 font-sans animate-fadeIn max-w-5xl mx-auto" ref={containerRef}>
      
      {/* 1. Header Navigation and Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-500/5 rounded-full blur-[60px] pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={onBack}
            className="p-3 bg-neutral-900/80 hover:bg-white/5 border border-white/5 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-lg"
            title="Return to What YSS Does"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono tracking-widest text-purple-400 font-bold flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              <span>THE ENGINEERING STUDIO DETAILS</span>
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              YSS's The Engineering Studio: Module by Module Description
            </h1>
            <span className="text-[11px] text-slate-400 font-mono tracking-wider mt-0.5">
              Module-by-Module Technical Analysis Catalog
            </span>
          </div>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.30)] hover:scale-102 self-start md:self-auto relative z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* 2. Interactive Navigation Jumper Deck */}
      <div className="bg-[#0A0B0E] border border-white/5 rounded-2xl p-4 flex flex-wrap gap-2 items-center justify-center select-none">
        <span className="text-xs text-slate-500 font-mono uppercase tracking-wider mr-2 hidden lg:inline">Modules:</span>
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => scrollToSection(m.id)}
              className="px-3.5 py-1.5 bg-[#020203] hover:bg-white/5 border border-white/5 hover:border-white/15 rounded-xl text-xs text-slate-300 font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Icon className={`w-3.5 h-3.5 ${m.color}`} />
              <span>{m.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Studio Introduction Banner */}
      <div className="bg-gradient-to-br from-purple-950/20 to-black border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl text-left">
        <div className="absolute -right-16 -bottom-16 opacity-10 pointer-events-none">
          <Volume2 className="w-64 h-64 text-purple-500" />
        </div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-2xl text-purple-400 shrink-0">
            <Volume2 className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">THE ENGINEERING STUDIO</h2>
            <p className="text-slate-300 text-xs leading-relaxed mt-2 font-sans">
              Enter the studio. This powerhouse engineering and production mix/master diagnostic suite guides a mix from good to masterful. Nine diagnostic modules analyze a broad array of measurements that guide step-by-step, plugin setting specific mix correction blueprints.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Modules Outline Catalog */}
      <div className="flex flex-col gap-6">

        {/* MODULE 1: HARMONIC RESOLUTION */}
        <div id="harmonic-resolution" className="scroll-mt-6 flex flex-col gap-4 text-left">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
            <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>Harmonic Resolution</span>
          </h2>
          <div className="bg-[#0E1015] border border-purple-500/10 rounded-2xl p-5">
            <h3 className="text-xs font-mono font-extrabold text-purple-400 tracking-wider uppercase mb-1">HARMONIC SPECTRAL RESOLUTION</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              A high-resolution spectral monitoring utility that sweeps the frequency spectrum from 20 Hz to 20 kHz to map harmonic overloads. It identifies specific resonant spikes and provides parametric target points to clean up problematic frequencies in your digital audio workstation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> EQ Resonance Nodes
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Point-by-point target frequencies where acoustic buildups or volume overloads are actively detected.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Surgical EQ Attenuation
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A simulated filter response that shows the frequency adjustments required to pull resonance peaks back into an optimized range.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Spectrogram View
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A canvas-rendered FFT spectrogram displaying frequency energy over time, color-mapped from dark blue (low energy) through cyan and yellow to white (peak energy). Requires a local file upload to activate.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 2: SIGNAL & LEVELS */}
        <div id="signal-levels" className="scroll-mt-6 flex flex-col gap-4 text-left">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
            <Gauge className="w-4 h-4 text-purple-400" />
            <span>Signal &amp; Levels</span>
          </h2>
          <div className="bg-[#0E1015] border border-purple-500/10 rounded-2xl p-5">
            <h3 className="text-xs font-mono font-extrabold text-purple-400 tracking-wider uppercase mb-1">LOUDNESS &amp; SIGNAL AMPLITUDE AUDIT</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              This module conducts an essential amplitude analysis to measure overall signal energy, dynamic variance, and headroom. It ensures your master complies with digital distribution requirements and stays free of distortion.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> True Peak Output (-dBTP)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The absolute peak level of the analog waveform reconstructing the digital samples to prevent inter-sample clipping on speakers.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Integrated Loudness (LUFS)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The average perceived audio weight measured over the entire duration of the track.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Loudness Range (LRA)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A measurement of the structural dynamic variation between the quietest and loudest sections of a song.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Crest Factor Index
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The ratio of peak amplitude to average RMS power which reveals how compressed or "squashed" your transients are.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Master Headroom
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The safety margin of decibels remaining between your loudest peak and the digital distortion ceiling.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Key &amp; BPM
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Displays the estimated musical key and tempo detected from the uploaded audio file, shown alongside amplitude metrics for quick reference.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl md:col-span-2 lg:col-span-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Platform Offset Table
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A comparison of your track's integrated loudness against Spotify (-14 LUFS), Apple Music (-16 LUFS), and Tidal (-14 LUFS) normalization targets, showing the exact dB offset for each platform.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 3: DYNAMICS PROFILE 1 */}
        <div id="dynamics-profile-1" className="scroll-mt-6 flex flex-col gap-4 text-left">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Dynamics Profile</span>
          </h2>
          <div className="bg-[#0E1015] border border-purple-500/10 rounded-2xl p-5">
            <h3 className="text-xs font-mono font-extrabold text-purple-400 tracking-wider uppercase mb-1">DYNAMIC VARIANCE &amp; COMPRESSION PROFILE</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              An analytical sweep examining transient spikes, compression boundaries, and macro vs. micro changes over time. It ensures that critical instruments like drums maintain their sharp impact while retaining overall volume consistency.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Peak-to-Loudness Ratio (PLR)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A moment-to-moment measurement tracking the density of transient peaks against average loudness.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Compression Artifact Sweep
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A perceptual detection scanner identifying excessive compression errors like volume pumping or breathing.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Transient Attack Integrity
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  An analysis verifying whether drum attacks and initial transient spikes are sharply preserved or smeared.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Macro vs. Micro Dynamics
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The relationship between long-term sectional volume changes and instantaneous moment-to-moment transients.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl md:col-span-2">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Per-Section Loudness Breakdown
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Estimated LUFS values for four structural sections (Intro, Verse, Chorus, Outro), derived from waveform envelope analysis of the uploaded audio file. Timestamp ranges display below each section bar when a local file is present.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 4: FREQUENCY BALANCE */}
        <div id="frequency-balance" className="scroll-mt-6 flex flex-col gap-4 text-left">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Frequency Balance</span>
          </h2>
          <div className="bg-[#0E1015] border border-purple-500/10 rounded-2xl p-5">
            <h3 className="text-xs font-mono font-extrabold text-purple-400 tracking-wider uppercase mb-1">MULTI-BAND SPECTRE BALANCE ANALYSIS</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              A six-band spectral energy sweep mapping acoustic density from sub-bass foundations up through high-frequency presence. It acts as an objective meter to verify that your frequency curve matches commercial sonic expectations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Spectral Octave Distribution
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The average relative power contained within specific sub-bass, bass, low-mid, mid, high-mid, and air bands.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Problem Frequency Anomalies
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Automatic detection of generic frequency defects like mud, boxiness, harshness, or sibilant buildup.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Low-End Management Check
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Verification that frequencies below 100 Hz are steered into mono and free of sub-frequency rumble.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> High-Frequency Air
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The measurement of presence and fine detail above the 10 kHz threshold.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl md:col-span-2 lg:col-span-2">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Spectral Tilt Gradient
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The overall slope of your frequency distribution indicating whether your mix is darker or brighter than average.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 6: STEREO FIELD */}
        <div id="stereo-field" className="scroll-mt-6 flex flex-col gap-4 text-left">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
            <Waves className="w-4 h-4 text-purple-400" />
            <span>Stereo Field</span>
          </h2>
          <div className="bg-[#0E1015] border border-purple-500/10 rounded-2xl p-5">
            <h3 className="text-xs font-mono font-extrabold text-purple-400 tracking-wider uppercase mb-1">STEREO FIELD ANALYZER &amp; 3D SOUNDSTAGE</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              This module combines stereo width analysis with front-to-back spatial depth mapping into a single two-tab view. It inspects the acoustic balance between mono center details and stereo side information, flags spatial errors that could compromise playback on mono speaker configurations, and reconstructs the perceptual depth of the mix.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Phase Coherence Corridor (Tab 1)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A correlation index verifying that the left and right channels do not cancel each other out when summed to mono. Includes spatial field width, Mid/Side energy balance, low-end stereo isolation, and spatial imaging consistency.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Depth Map (Tab 2)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A perceptual analyzer reconstructing front-to-back depth, spatial reverb tails, and dry-to-wet balance. Shows reverb and delay presence, depth layering differentiation, and wet/dry balance ratio.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 7: GENRE COMPLIANCE */}
        <div id="genre-compliance" className="scroll-mt-6 flex flex-col gap-4 text-left">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Genre Compliance</span>
          </h2>
          <div className="bg-[#0E1015] border border-purple-500/10 rounded-2xl p-5">
            <h3 className="text-xs font-mono font-extrabold text-purple-400 tracking-wider uppercase mb-1">GENRE &amp; REFERENCE COMPLIANCE</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              This module compares your track's loudness and frequency signature against standard target profiles for global streaming networks. It is framed as a competitor comparison — showing how your master sits relative to the average for your genre rather than against abstract targets.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Loudness Target Matching
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A target guide tracking how closely your file matches platform normalization levels like Spotify (-14 LUFS) or Apple Music (-16 LUFS).
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Spectral Curve Reference
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A direct overlay mapping your frequency distribution against standard models for your chosen genre.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Competitor Loudness Delta
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Shows how many dB louder or quieter your master is compared to the average commercial master in your genre — e.g., "+2.1 dB louder than avg Rock master."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 8: NOISE & ARTIFACTS */}
        <div id="noise-artifacts" className="scroll-mt-6 flex flex-col gap-4 text-left">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
            <Wrench className="w-4 h-4 text-purple-400" />
            <span>Noise &amp; Artifacts</span>
          </h2>
          <div className="bg-[#0E1015] border border-purple-500/10 rounded-2xl p-5">
            <h3 className="text-xs font-mono font-extrabold text-purple-400 tracking-wider uppercase mb-1">ACOUSTIC NOISE FLOOR &amp; DC OFFSET</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              An auditing module designed to detect system noise, low-level electrical hum, files glitches, and digital conversion offsets. It weeds out hidden system defects which waste master headroom.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Noise Floor Level
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The residual background volume level tracking low-frequency hums or digital hiss.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> DC Offset Bias
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A measurement detecting whether electrical waveform displacement is off-center, which reduces valuable headroom.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Codec Compression Artifacts
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A check mapping digital smearing or pre-ringing caused by low-rate MP3 or AAC compression.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Clicks, Pops, and Glitches
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  An automatic transient spike detector identifying edit-points, digital pops, or buffer glitches.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 9: ARRANGEMENT PATTERNS */}
        <div id="arrangement-patterns" className="scroll-mt-6 flex flex-col gap-4 text-left">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Arrangement Patterns</span>
          </h2>
          <div className="bg-[#0E1015] border border-purple-500/10 rounded-2xl p-5">
            <h3 className="text-xs font-mono font-extrabold text-purple-400 tracking-wider uppercase mb-1">FREQUENCY MASKING ANALYZER</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              A multi-track simulator running on arrangement files to locate clashing tracks and crowded acoustic neighborhoods. It ensures critical instruments like the kick drum and bass guitar retain separate, clear space.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Harmonic Overlap Mapping
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A detector highlighting crowded frequencies where different instruments contend for the exact same space.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Element Separation Indicator
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The level of sonic clarity and boundary distinction between parallel lead tracks in your arrangement.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Section-to-Section Consistency
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A comparison tool mapping energy and loudness transitions between the verses, choruses, and bridges.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 10: STEREO AZIMUTH PROFILE */}
        <div id="stereo-azimuth" className="scroll-mt-6 flex flex-col gap-4 text-left">
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 border-b border-white/10 pb-2">
            <Compass className="w-4 h-4 text-purple-400" />
            <span>Stereo Azimuth Profile</span>
          </h2>
          <div className="bg-[#0E1015] border border-purple-500/10 rounded-2xl p-5">
            <h3 className="text-xs font-mono font-extrabold text-purple-400 tracking-wider uppercase mb-1">STEREO AZIMUTH ANALYZER</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              An advanced stereophonic compass mapping active panning distribution and center-channel energy weighting. It registers panned channels to verify that the virtual soundstage maintains a balanced, stable coordinate layout.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Stereographic Coordinate Profile
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  The relative panning distribution of lead instruments across the virtual soundstage canvas.
                </p>
              </div>
              <div className="bg-[#020203] border border-white/5 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span className="text-purple-400">•</span> Center Stage Weight
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  A correlation index tracking how strictly low-end bass, kick drums, and lead vocals are aligned to the dead-center.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Bottom Navigation Bar */}
      <div className="flex justify-center mt-6">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 hover:text-white text-slate-300 font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all border border-white/10 hover:border-white/25 flex items-center gap-2 cursor-pointer shadow-xl hover:scale-[1.02]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to What YSS Does</span>
        </button>
      </div>

    </div>
  );
}
