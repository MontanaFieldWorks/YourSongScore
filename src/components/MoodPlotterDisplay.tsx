import React from "react";

interface MoodPlotterDisplayProps {
  valence: number; // 0 to 1
  energy: number; // 0 to 1
}

export default function MoodPlotterDisplay({ valence, energy }: MoodPlotterDisplayProps) {
  // Clamp values to ensure they stay within bounds
  const clampedValence = Math.max(0, Math.min(1, valence));
  const clampedEnergy = Math.max(0, Math.min(1, energy));

  // Determine estimated quadrant text
  let quadrantText = "Serene / Chill";
  if (clampedValence >= 0.5 && clampedEnergy >= 0.5) {
    quadrantText = "Euphoric Cheer";
  } else if (clampedValence < 0.5 && clampedEnergy >= 0.5) {
    quadrantText = "Intense / Aggressive";
  } else if (clampedValence < 0.5 && clampedEnergy < 0.5) {
    quadrantText = "Lyrical Melancholy";
  }

  return (
    <div 
      className="bg-[#090b0e] border border-white/5 rounded-2xl p-5 sm:p-6 text-white flex flex-col gap-4 shadow-2xl w-full"
      id="mood-plotter-display-card"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <span className="text-xs font-mono font-bold text-[#90a1b9] uppercase tracking-wider">
          Circumplex Mood Space
        </span>
        <span className="text-[9px] font-mono text-slate-500 uppercase">
          Read-Only Analysis
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 my-1 justify-center">
        {/* Circumplex Quad Drawing */}
        <div 
          className="relative aspect-square w-full max-w-[130px] border border-white/10 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 flex select-none"
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
            className="absolute w-3 h-3 rounded-full bg-cyan-400 border border-white shadow-[0_0_12px_rgba(34,211,238,0.85)] animate-pulse"
            style={{ 
              left: `${clampedValence * 100}%`, 
              bottom: `${clampedEnergy * 100}%`,
              transform: "translate(-50%, 50%)",
              borderStyle: "solid"
            }}
          />
        </div>

        {/* Coordinates Read-out Details */}
        <div className="flex-1 flex flex-col text-left justify-center gap-1.5 w-full">
          <div className="flex justify-between items-center sm:justify-start sm:gap-4">
            <span className="font-mono text-[10px] text-slate-400">Valence</span>
            <span className="text-white font-mono font-bold text-xs bg-white/5 px-1.5 py-0.5 rounded">
              {clampedValence.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center sm:justify-start sm:gap-4 mt-0.5">
            <span className="font-mono text-[10px] text-slate-400">Energy</span>
            <span className="text-white font-mono font-bold text-xs bg-white/5 px-1.5 py-0.5 rounded">
              {clampedEnergy.toFixed(2)}
            </span>
          </div>
          
          <div className="mt-2 border-t border-white/5 pt-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">
              Est. Quadrant
            </span>
            <span className="text-xs font-bold text-cyan-400 mt-0.5 block">
              ★ {quadrantText}
            </span>
          </div>
          
          <p className="text-[9.5px] text-slate-500 leading-normal mt-1">
            Valence maps harmonic positivity (major/minor affect), while energy represents transient dynamic intensity and rhythmic density.
          </p>
        </div>
      </div>
    </div>
  );
}
