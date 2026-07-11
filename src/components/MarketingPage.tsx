import React from "react";
import { ArrowLeft } from "lucide-react";
import { CritiqueData, TrackInfo } from "../types";

interface MarketingPageProps {
  onBack: () => void;
  critique: CritiqueData | null;
  trackInfo: TrackInfo | null;
}

export default function MarketingPage({ onBack, critique, trackInfo }: MarketingPageProps) {
  const moodTags = (() => {
    if (critique?.subMetricsCall2?.moodTags && Array.isArray(critique.subMetricsCall2.moodTags) && critique.subMetricsCall2.moodTags.length > 0) {
      return critique.subMetricsCall2.moodTags.slice(0, 7);
    }
    const aesthetic = critique?.vibe?.aesthetic ?? "";
    const viability = critique?.vibe?.commercialViability ?? "";
    const combined = `${aesthetic} ${viability}`;
    const tagMap: { [key: string]: string } = {
      "driv": "Driving", "energet": "High Energy", "anthem": "Anthemic",
      "raw": "Raw", "grit": "Gritty", "defian": "Defiant", "dark": "Dark", "melanchol": "Melancholic",
      "upbeat": "Upbeat", "euphori": "Euphoric", "cinematic": "Cinematic", "intense": "Intense",
      "aggress": "Aggressive", "late night": "Late Night", "atmospheric": "Atmospheric",
      "nostalgic": "Nostalgic", "haunting": "Haunting", "playful": "Playful", "fun": "Fun",
      "danc": "Danceable", "groov": "Groovy", "minimalist": "Minimalist", "epic": "Epic",
      "rebel": "Rebellious", "confident": "Confident", "emot": "Emotional", "power": "Powerful",
      "infectious": "Infectious", "feel-good": "Feel-Good", "optimis": "Optimistic", "joyful": "Joyful",
      "celebrat": "Celebratory", "summer": "Summery", "retro": "Retro", "vintage": "Vintage",
      "soul": "Soulful", "funk": "Funky", "warm": "Warm", "bright": "Bright", "lush": "Lush",
      "modern": "Modern", "tension": "Tense", "vulnerable": "Vulnerable", "intimate": "Intimate"
    };
    const detected = Object.entries(tagMap).filter(([key]) => combined.toLowerCase().includes(key)).map(([, label]) => label);
    const unique = [...new Set(detected)].slice(0, 7);
    return unique.length > 0 ? unique : ["Driving", "Defiant", "High Energy", "Raw", "Anthemic"];
  })();

  const sonicPeers = (() => {
    const universe = (critique?.streamingAlignment as any)?.artistUniverse ?? "";
    const genre = critique?.vibe?.genre ?? "";
    const subgenre = critique?.vibe?.subgenre ?? "";
    const artistMap: { [key: string]: string[] } = {
      "hard rock": ["Royal Blood", "Wolfmother", "Rival Sons", "Greta Van Fleet"],
      "classic rock": ["The Black Keys", "Jack White", "The White Stripes", "Clutch"],
      "indie rock": ["Arctic Monkeys", "Interpol", "Editors", "Bloc Party"],
      "alternative": ["Foo Fighters", "Muse", "Placebo", "Nothing But Thieves"],
      "punk": ["The Gaslight Anthem", "Social Distortion", "The Hold Steady", "Frank Turner"],
      "blues rock": ["Gary Clark Jr.", "Joe Bonamassa", "Marcus King", "The Black Keys"],
      "garage rock": ["The Strokes", "Jack White", "The Hives", "The Vines"],
      "pop rock": ["OneRepublic", "Imagine Dragons", "The Killers", "Neon Trees"],
      "dance-pop": ["Bruno Mars", "Justin Timberlake", "Dua Lipa", "Lizzo", "Doja Cat"],
      "dance pop": ["Bruno Mars", "Justin Timberlake", "Dua Lipa", "Lizzo", "Doja Cat"],
      "retro soul": ["Bruno Mars", "Leon Bridges", "Anderson .Paak", "Silk Sonic"],
      "soul": ["Leon Bridges", "Anderson .Paak", "Gary Clark Jr.", "H.E.R."],
      "funk": ["Bruno Mars", "Anderson .Paak", "Silk Sonic", "Cory Wong"],
      "pop": ["Bruno Mars", "Ed Sheeran", "Harry Styles", "Dua Lipa"],
      "r&b": ["H.E.R.", "Daniel Caesar", "SZA", "Anderson .Paak"],
      "electronic": ["Daft Punk", "Disclosure", "Calvin Harris", "Kaytranada"],
      "country": ["Morgan Wallen", "Tyler Childers", "Zach Bryan", "Kacey Musgraves"],
      "folk": ["Noah Kahan", "Phoebe Bridgers", "Bon Iver", "Iron & Wine"],
      "hip hop": ["Kendrick Lamar", "J. Cole", "Isaiah Rashad", "Joey Bada$$"],
      "metal": ["Tool", "Mastodon", "Gojira", "Baroness"],
      "ambient": ["Brian Eno", "Hammock", "Explosions in the Sky", "Stars of the Lid"],
    };
    const combined = `${genre} ${subgenre} ${universe}`.toLowerCase();
    let peers: string[] = ["The Black Keys", "Royal Blood", "Jack White", "Foo Fighters"];
    for (const [key, artists] of Object.entries(artistMap)) {
      if (combined.includes(key)) { peers = artists; break; }
    }
    return peers.slice(0, 5);
  })();

  return (
    <div className="flex flex-col gap-6 font-sans animate-fadeIn max-w-4xl mx-auto py-4">
      <div className="flex justify-start">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-wider uppercase text-slate-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer shadow-lg"
        >
          <ArrowLeft className="w-4 h-4 text-[#ad46ff]" />
          <span>Back to The Rabbit Hole</span>
        </button>
      </div>

      <h1 className="text-3xl font-black text-white tracking-widest uppercase font-sans text-center">Marketing</h1>

      <div className="bg-black/80 border border-[#44CDF4] rounded-3xl p-6 shadow-[0_0_35px_rgba(0,0,0,0.5)] flex flex-col gap-6">
        <div className="p-4 bg-[#020203] border border-white/10 rounded-xl">
          <p className="text-xs text-slate-200 leading-relaxed font-semibold">
            Algorithms sort you whether you plan for it or not. This shows you which box you're being put in — and whether that box is the right one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#050608] border border-white/5 rounded-2xl p-5 flex flex-col gap-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">Mood Tags</div>
            <div className="flex flex-wrap gap-2">
              {moodTags.map((tag: string) => (
                <span key={tag} className="px-3 py-1 bg-[#44CDF4]/5 border border-[#44CDF4]/20 rounded-full text-[11px] font-semibold text-[#44CDF4] tracking-wide">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#050608] border border-white/5 rounded-2xl p-5 flex flex-col gap-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">Sonic Peer Group</div>
            <div className="flex flex-wrap gap-2">
              {sonicPeers.map((artist: string) => (
                <span key={artist} className="px-3 py-1 bg-neutral-900 border border-white/10 rounded-full text-[11px] font-semibold text-slate-300">
                  {artist}
                </span>
              ))}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Listeners of these artists are your most likely first audience.
            </span>
          </div>

          <div className="bg-[#050608] border border-white/5 rounded-2xl p-5 flex flex-col gap-3 md:col-span-2">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">Audience Profile</div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {critique?.vibe?.commercialViability
                ? `${critique.vibe.commercialViability} Listener behavioral profile: tracks with this energy signature typically show high listen-through rates and moderate-to-high save rates among active music discovery users.`
                : "Male, 28–45. Most likely listening context: late night drive, workout, or background focus session. Behavioral profile: high listen-through rate, moderate save rate, low skip probability after the 30-second mark."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
