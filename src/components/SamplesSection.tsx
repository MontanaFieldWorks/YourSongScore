import React from "react";
import { SAMPLE_SONGS, SampleSong } from "../types";
import { Play, Music, Radio, Disc } from "lucide-react";

interface SamplesSectionProps {
  onSelectSample: (sample: SampleSong) => void;
  disabled: boolean;
  selectedId?: string;
}

export default function SamplesSection({ onSelectSample, disabled, selectedId }: SamplesSectionProps) {
  return (
    <div className="bg-[#13161C] border border-white/5 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <Disc className="w-5 h-5 text-blue-500 animate-spin" style={{ animationDuration: "6s" }} id="samples-icon" />
        <h2 className="text-lg font-semibold text-slate-100" id="samples-title">
          Quick Demo Sandbox
        </h2>
      </div>
      
      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
        Don&apos;t have an audio file ready? Instantly test the A&amp;R mixing engine using these reference demo tracks. Click a track to route it directly to the Gemini analysis client:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="samples-grid">
        {SAMPLE_SONGS.map((song) => {
          const isSelected = selectedId === song.id;
          
          return (
            <button
              key={song.id}
              onClick={() => !disabled && onSelectSample(song)}
              disabled={disabled}
              id={`sample-btn-${song.id}`}
              className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                isSelected
                  ? "bg-blue-950/40 border-blue-500/80 ring-2 ring-blue-500/20"
                  : "bg-[#0A0B0E] border-white/5 hover:border-white/10 hover:bg-white/5"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className={`text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full ${
                  song.type === "demo"
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : song.type === "vocal"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                }`}>
                  {song.type === "demo" ? "Unfinished Demo" : song.type === "vocal" ? "Vocal Focus" : "Finished Mix"}
                </span>
                
                <span className="text-xs text-slate-500 font-mono">
                  {song.id === "bedroom-demo" ? "6.8 MB" : "5.4 MB"}
                </span>
              </div>

              <h3 className="font-semibold text-slate-200 text-sm truncate w-full mb-1">
                {song.title}
              </h3>
              
              <p className="text-slate-400 text-xs truncate w-full mb-3">
                {song.artist}
              </p>

              <p className="text-slate-500 text-xs line-clamp-2 leading-snug mb-4 mt-auto">
                {song.description}
              </p>

              <div className="flex items-center gap-2 text-xs font-medium mt-auto pt-2 border-t border-white/5 w-full text-blue-500 hover:text-blue-400 transition-colors">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isSelected ? "Analyzing..." : "Load Audit"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
