import React, { useState, useEffect, useRef } from "react";
import { Play, Activity } from "lucide-react";

interface EnergySimulatorProps {
  realBandEnergies: number[]; // 6 real values, e.g. [subBass, bass, lowMids, coreMids, presence, air]
  realLufs: number;
  realTruePeak: number;
  autoPlay?: boolean; // if true, starts the animation immediately on mount rather than requiring a play button
}

export default function EnergySimulator({
  realBandEnergies = [50, 50, 50, 50, 50, 50],
  realLufs = -14,
  realTruePeak = -1.0,
  autoPlay = false
}: EnergySimulatorProps) {
  const [simulatedBands, setSimulatedBands] = useState<number[]>([10, 10, 10, 10, 10, 10]);
  const [simulatedLufs, setSimulatedLufs] = useState<number>(-24);
  const [simulatedPeak, setSimulatedPeak] = useState<number>(-4.0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  
  const animationRef = useRef<number | null>(null);

  const startAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsAnimating(true);
    const duration = 1800; // 1.8 seconds animation duration
    const startTime = Date.now();

    // Low starting values
    const startBands = [10, 10, 10, 10, 10, 10];
    const startLufs = -24;
    const startPeak = -4.0;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - t, 3);

      // Interpolate bands
      const currentBands = realBandEnergies.map((target, idx) => {
        const start = startBands[idx] !== undefined ? startBands[idx] : 10;
        // Dampening jitter effect to simulate active spectrum movement before settling
        const jitter = t < 1 ? Math.sin(elapsed * 0.012 + idx * 1.5) * 4 * (1 - t) : 0;
        const val = start + (target - start) * ease + jitter;
        return Math.max(10, Math.min(99, Math.round(val)));
      });
      setSimulatedBands(currentBands);

      // Interpolate LUFS
      const currentLufs = startLufs + (realLufs - startLufs) * ease;
      const lufsJitter = t < 1 ? Math.sin(elapsed * 0.018) * 0.25 * (1 - t) : 0;
      setSimulatedLufs(Number((currentLufs + lufsJitter).toFixed(1)));

      // Interpolate True Peak
      const currentPeak = startPeak + (realTruePeak - startPeak) * ease;
      const peakJitter = t < 1 ? Math.cos(elapsed * 0.022) * 0.12 * (1 - t) : 0;
      setSimulatedPeak(Number((currentPeak + peakJitter).toFixed(2)));

      if (t < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        // Force settle to exact real values
        setSimulatedBands([...realBandEnergies]);
        setSimulatedLufs(realLufs);
        setSimulatedPeak(realTruePeak);
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(tick);
  };

  // Run on mount if autoPlay is true or whenever real parameters change
  useEffect(() => {
    if (autoPlay) {
      startAnimation();
    } else {
      // If not autoplay, initialize at low values
      setSimulatedBands([10, 10, 10, 10, 10, 10]);
      setSimulatedLufs(-24);
      setSimulatedPeak(-4.0);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [realBandEnergies, realLufs, realTruePeak, autoPlay]);

  return (
    <div 
      className="bg-[#090b0e] border border-white/5 rounded-2xl p-5 sm:p-6 text-white flex flex-col gap-5 shadow-2xl w-full"
      id="energy-simulator-card"
    >
      {/* Simulation Trigger Bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#1ed760]" />
          <span className="text-xs font-mono font-bold text-[#90a1b9] uppercase tracking-wider">
            Audio Response Simulator
          </span>
        </div>
        
        <button
          onClick={startAnimation}
          disabled={isAnimating}
          className={`flex items-center gap-2 font-mono text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            isAnimating 
              ? "bg-[#13161c] text-slate-500 border border-white/5 cursor-not-allowed" 
              : "bg-[#1ed760] hover:bg-[#1db954] text-neutral-950 active:scale-[0.98]"
          }`}
        >
          {isAnimating ? (
            <>
              <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current text-neutral-950" />
              <span>Run Simulation</span>
            </>
          )}
        </button>
      </div>

      {/* Level Rails */}
      <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-4">
        {/* LUFS Meter */}
        <div>
          <div className="flex justify-between text-[10px] font-mono mb-1">
            <span className="text-slate-400 uppercase tracking-wide">Integrated Loudness</span>
            <span className="text-[#1ed760] font-bold font-mono">{simulatedLufs} LUFS</span>
          </div>
          <div className="h-2.5 bg-[#13161c] rounded-full relative overflow-hidden">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-500 via-[#1ed760] to-emerald-400 transition-all duration-150 ease-out" 
              style={{ width: `${Math.min(100, Math.max(0, ((simulatedLufs + 24) / 18) * 100))}%` }}
            />
            <div className="absolute left-[33%] w-px h-full bg-red-500" title="Brickwall safezone" />
          </div>
        </div>

        {/* True Peak Meter */}
        <div>
          <div className="flex justify-between text-[10px] font-mono mb-1">
            <span className="text-slate-400 uppercase tracking-wide">True Peak Ceiling</span>
            <span className={`font-bold font-mono ${simulatedPeak > -1.0 ? "text-yellow-400" : "text-white"}`}>
              {simulatedPeak} dBTP
            </span>
          </div>
          <div className="h-2.5 bg-[#13161c] rounded-full relative overflow-hidden">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-150 ease-out" 
              style={{ width: `${Math.min(100, Math.max(0, ((simulatedPeak + 4) / 4) * 100))}%` }}
            />
            <div className="absolute left-[75%] w-px h-full bg-red-500" title="-1.0 dBTP ceiling limit" />
          </div>
        </div>
      </div>

      {/* 6-Band Frequency Live Spectrum */}
      <div className="bg-black/60 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
          6-Band Dynamic Spectrum Energy
        </span>
        
        <div className="h-24 flex items-end justify-between gap-2.5 sm:gap-3 px-1">
          {simulatedBands.map((val, idx) => {
            const label = ["SUB", "BASS", "L-MID", "C-MID", "PRES", "AIR"][idx];
            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-[#13161c] h-16 rounded-md overflow-hidden relative flex flex-col justify-end">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-600 via-[#1ed760] to-purple-500 transition-all duration-150 ease-out"
                    style={{ height: `${val}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono text-slate-500 mt-2 font-bold">{label}</span>
                <span className="text-[9px] font-mono text-white font-bold mt-0.5">{val}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
