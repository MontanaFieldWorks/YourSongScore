import { CritiqueResponse } from "./types";

export interface TestSongOption {
  id: string;
  name: string;
  artist: string;
  description: string;
  label: string;
  badgeColor: string;
  data: CritiqueResponse;
}

const TEST_SONG_OPTIONS_RAW = [
  {
    id: "test-excellent",
    name: "Elysian Fields",
    artist: "Stella & The Echo",
    description: "Flawless production, pristine mix balance, and beautiful cinematic arrangements.",
    label: "Option A: Golden Record (Excellent)",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    data: {
      trackInfo: {
        name: "Elysian Fields",
        artist: "Stella & The Echo",
        hasAudio: true,
        statusMessage: "Pristine dynamic scale. Radio-ready master profile verified."
      },
      critique: {
        vibe: {
          genre: "Alternative Pop / Synth Indie",
          subgenre: "Dreamgaze",
          aesthetic: "Celestial, cinematic, warm tape saturation with lush vintage reverb plates.",
          commercialViability: "Extremely High. Perfect fit for Spotify's 'Late Night Vibes' or 'Indie Blue' editorial playlists."
        },
        mixQuality: {
          score: 95,
          stereoField: "Impeccably wide. Active stereo widening on backing vocals and pad synthesizers; kick and low snare locked dead center.",
          frequencyBalance: {
            lowEnd: "Clean and powerful. A sidechained kick clears room for the sub-bass at 50Hz, avoiding any boominess.",
            midrange: "Ultra-transparent and spacious. Vocal frequencies are boosted selectively at 2.5kHz with no clutter.",
            highEnd: "Pristine, silk-like airy brightness at 12kHz using state-of-the-art analog shelving."
          },
          dominanceIssues: "Trace levels. Snare transients occasionally peak by +0.5dB too high, but are beautifully glued."
        },
        performance: {
          vocalScore: 96,
          vocalsCritique: "Stunning vocal delivery. Intimate, breathless primary takes complemented by pitch-perfect secondary and tertiary harmony stacks.",
          instrumentalScore: 94,
          instrumentationCritique: "Exceptional tightness. Acoustic guitars have razor-sharp microtheme precision; synth lines lock perfectly with the step sequencer."
        },
        arrangement: {
          flowScore: 95,
          transitionsAndArc: "Brilliant build-up. Seamless transition from the airy ambient intro to the punchy, explosive chorus. Excellent dynamic contrast."
        },
        scores: {
          overallProduction: 96,
          commercialReadiness: 94
        },
        actionItems: [
          {
            title: "Snare Transient Glues",
            recommendation: "Apply a gentle 1.5dB ratio peak limiter to the snare bus.",
            technicalGuide: "Use FabFilter Pro-L 2 with 0.2ms lookahead time, linking stereo channels to 60% for a wider snap."
          },
          {
            title: "Faint Reverb Tail Gate",
            recommendation: "Gate the reverb tails directly in the bridge section to sharpen silence.",
            technicalGuide: "Using DAW default Gate, set threshold to -48dB and release to 180ms on the auxiliary bus."
          }
        ],
        lyricalImpact: {
          score: 93,
          meaningClarity: "Poetic but deeply resonant. High emotional connection throughout.",
          feedback: "Lyrical themes of transience and space travel are executed with incredible semantic elegance."
        },
        musicTheory: {
          score: 91,
          chordStructures: "Sophisticated retro chords. Elegant voice leading with minor 9th and major 7th chord progressions.",
          feedback: "The modal change in the pre-chorus provides a highly satisfying resolution of harmonic tension."
        },
        titleSearchability: {
          score: 89,
          uniquenessLevel: "Strong and distinct title style.",
          feedback: "Uncluttered SEO space; high likelihood of organic discoverability."
        },
        liveMetrics: {
          calculatedLufs: -9.5,
          calculatedTruePeak: -1.0,
          calculatedLra: 8.5,
          calculatedStereoCorrelation: 0.28,
          calculatedBpm: 120,
          calculatedKey: "F# Major",
          calculatedBassEnergy: 78,
          calculatedMidEnergy: 82,
          calculatedHighEnergy: 80,
          calculatedDuration: 210,
          calculatedWaveformPoints: [
            18, 20, 22, 19, 21,
            35, 38, 40, 42, 39, 41, 43,
            45, 52, 58, 65, 72,
            82, 85, 88, 90, 89, 91, 88, 92,
            32, 35, 38, 36, 37, 39,
            46, 54, 62, 68, 74,
            84, 87, 89, 92, 91, 93, 90, 94,
            22, 25, 28, 24, 26, 30,
            86, 88, 91, 94, 95, 93, 96, 94, 98,
            45, 38, 30, 22, 15, 8, 3
          ]
        }
      }
    }
  },
  {
    id: "test-poor",
    name: "Gravel Grinder",
    artist: "Rusty Sparkplug",
    description: "Muddy low-end clash, boxy mids, timing deviations, and harsh highs.",
    label: "Option B: Basement Demo (Poor)",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    data: {
      trackInfo: {
        name: "Gravel Grinder",
        artist: "Rusty Sparkplug",
        hasAudio: true,
        statusMessage: "High ear fatigue risks. Dynamic levels exceed safety ratios."
      },
      critique: {
        vibe: {
          genre: "Lo-Fi Grunge Rock",
          subgenre: "Garage Punk",
          aesthetic: "Extremely muddy, harsh sibilance, excessive phase cancellation, clipped waveforms.",
          commercialViability: "Extremely Low. The mixing issues make it fatiguing for casual listeners or streaming playlists."
        },
        mixQuality: {
          score: 34,
          stereoField: "Monophonic yet chaotic. Drum overheads are out of phase, and the bass guitar wanders randomly between channels.",
          frequencyBalance: {
            lowEnd: "A giant wall of mud around 180Hz. Kick and bass are fighting for the exact same space without any high-pass filters.",
            midrange: "Harsh, boxy, and congested. A severe build-up of frequencies between 300Hz and 800Hz drowns out the vocal.",
            highEnd: "Aggressive, piercing sibilance. High-hat clicks at 6kHz are deafening, with zero airy frequencies above 10kHz."
          },
          dominanceIssues: "Severe distortion. Guitar solos spike violently, causing digital clipping of +3dB on the master output."
        },
        performance: {
          vocalScore: 45,
          vocalsCritique: "Intonation struggles throughout. The lead singer repeatedly drifts flat during long held notes, and the timing is loose.",
          instrumentalScore: 42,
          instrumentationCritique: "Rhythm section is poorly synchronized. The garage guitars drift ahead of the beat, leading to a disorganized timeline."
        },
        arrangement: {
          flowScore: 38,
          transitionsAndArc: "Abrupt and disjointed. The song cuts straight into the verse with zero build-up, and the chorus loses energy."
        },
        scores: {
          overallProduction: 37,
          commercialReadiness: 32
        },
        actionItems: [
          {
            title: "High-Pass Low End Cut",
            recommendation: "Clean up the low-end mud immediately.",
            technicalGuide: "Apply a steep 24dB/oct High-Pass filter on the guitar bus at 120Hz and the vocal track at 80Hz."
          },
          {
            title: "De-Ess Crucial Vocals",
            recommendation: "Tame the harsh piercing sibilance.",
            technicalGuide: "Instantiate a dedicated De-Esser plugin around 6.2kHz on the primary vocal chain; apply up to 5dB of gain reduction."
          },
          {
            title: "Sidechain Kick and Bass",
            recommendation: "Let the kick punch through the sub-bass foundation.",
            technicalGuide: "Set up a compressor on the Bass channel with an external sidechain input triggered by the Kick. Target 2-3dB gain reduction."
          }
        ],
        lyricalImpact: {
          score: 48,
          meaningClarity: "Vague, repetitive, and clichéd themes.",
          feedback: "Lacks narrative depth; lyrics feel compiled rather than felt."
        },
        musicTheory: {
          score: 41,
          chordStructures: "Extremely basic three-chord progression repeated endlessly.",
          feedback: "No melodic variety, key shifts, or tension-release patterns; very repetitive harmonic landscape."
        },
        titleSearchability: {
          score: 35,
          uniquenessLevel: "High competition title.",
          feedback: "Over 5,000 matches with the word 'Gravel'; discoverability is statistically near zero."
        },
        liveMetrics: {
          calculatedLufs: -5.8,
          calculatedTruePeak: 1.2,
          calculatedLra: 3.2,
          calculatedStereoCorrelation: 0.05,
          calculatedBpm: 145,
          calculatedKey: "A minor",
          calculatedBassEnergy: 92,
          calculatedMidEnergy: 85,
          calculatedHighEnergy: 78,
          calculatedDuration: 165,
          calculatedWaveformPoints: [
            45, 48, 52, 50, 48,
            68, 72, 70, 74, 71, 73, 75, 72, 74, 73,
            85, 88, 92, 95, 94, 96, 95, 98, 96, 97,
            66, 70, 68, 72, 69, 71, 73, 70, 72, 71,
            86, 89, 93, 96, 95, 97, 96, 99, 97, 98,
            75, 78, 82, 80, 84, 82, 85, 83, 86, 84,
            88, 91, 95, 98, 97, 99, 98, 100, 99, 99,
            70, 72, 74, 71, 73, 75, 72, 74, 73, 70
          ]
        }
      }
    }
  },
  {
    id: "test-mixed",
    name: "Midnight Neon",
    artist: "Chrome Pulse",
    description: "Beautiful vocal performance and retro synths, but vocal is panned wrong and bass lacks pocket timing.",
    label: "Option C: Diamond in the Rough (Mixed)",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    data: {
      trackInfo: {
        name: "Midnight Neon",
        artist: "Chrome Pulse",
        hasAudio: true,
        statusMessage: "Niche readiness. Excellent core melodies, but requires corrective mixing."
      },
      critique: {
        vibe: {
          genre: "Synthwave / Retro Electro",
          subgenre: "Outrun",
          aesthetic: "Warm, thick nostalgic synthesizers with beautiful chord progressions, but vocal element sits poorly in the mix.",
          commercialViability: "Moderate. Good candidate for niche chill synthwave community lists, but needs mix polishing for mainstream radios."
        },
        mixQuality: {
          score: 58,
          stereoField: "Acceptably wide synth pads, but lead vocal is panned slightly off-center by mistake, causing lopsided imagery.",
          frequencyBalance: {
            lowEnd: "Nice sub-bass presence, but kick lacks transient click to pierce through the 100Hz rumble.",
            midrange: "Too crowded around 500Hz. Beautiful synth chords are masking the human voice.",
            highEnd: "Good sparkle and clean sizzle, and high-hat tracks have a pleasant retro roll-off above 15kHz."
          },
          dominanceIssues: "Lead vocal is buried at times and struggles to cut through the heavy instrumentals."
        },
        performance: {
          vocalScore: 88,
          vocalsCritique: "Beautiful pitch accuracy and rich tone. The singer captures the melancholy 80s aesthetic perfectly.",
          instrumentalScore: 64,
          instrumentationCritique: "Solid rhythmic timing on step instruments, but the live electric bass track has loose pocket timing."
        },
        arrangement: {
          flowScore: 72,
          transitionsAndArc: "Strong build. The filter sweep in the pre-chorus is highly effective, though the final outro feels cut off."
        },
        scores: {
          overallProduction: 68,
          commercialReadiness: 62
        },
        actionItems: [
          {
            title: "Vocal Pocket EQ Cut",
            recommendation: "Make room for the vocal track inside the synth pads.",
            technicalGuide: "Place a dynamic EQ on the Synth bus, sidechaining it to the Vocals. Cut 2dB at 1.5kHz when the vocalist sings."
          },
          {
            title: "Center the Primary Vocal Row",
            recommendation: "Restore solid monophonic centering to the main voice.",
            technicalGuide: "Verify pan pots in DAW vocal track. Reset main vocal track to exactly C (Center); use delays instead of panning for size."
          },
          {
            title: "Transient Shaping for the Kick",
            recommendation: "Help the kick cut through the mix.",
            technicalGuide: "Apply a transient designer plugin on the Kick channel. Boost attack by +2.5dB and reduce sustain by -1dB."
          }
        ],
        lyricalImpact: {
          score: 75,
          meaningClarity: "Cohesive retro-nostalgic themes with solid appeal.",
          feedback: "Captures the late-night driving mood perfectly, though some lyrics rely heavily on typical synthwave tropes."
        },
        musicTheory: {
          score: 85,
          chordStructures: "Evocative modal changes reminiscent of classic 80s soundtracks.",
          feedback: "Great use of suspended chords to sustain atmospheric intrigue before resolving."
        },
        titleSearchability: {
          score: 60,
          uniquenessLevel: "Fair index search quality.",
          feedback: "A few existing artists use 'Neon' themes, but adding 'Pulse' clears up some SEO room."
        },
        liveMetrics: {
          calculatedLufs: -11.2,
          calculatedTruePeak: -0.5,
          calculatedLra: 6.8,
          calculatedStereoCorrelation: 0.42,
          calculatedBpm: 112,
          calculatedKey: "B minor",
          calculatedBassEnergy: 70,
          calculatedMidEnergy: 65,
          calculatedHighEnergy: 72,
          calculatedDuration: 240,
          calculatedWaveformPoints: [
            22, 24, 26, 25, 23,
            42, 45, 48, 44, 46, 47, 49, 45,
            50, 55, 60, 65, 70,
            76, 79, 82, 85, 83, 84, 82, 86,
            40, 43, 46, 42, 44, 45, 47, 44,
            51, 56, 61, 66, 71,
            77, 80, 83, 86, 84, 85, 83, 87,
            30, 35, 40, 48, 55, 62, 70, 78,
            80, 83, 86, 88, 87, 89, 86, 90,
            48, 42, 35, 28, 20, 12, 5
          ]
        }
      }
    }
  },
  {
    id: "test-hero",
    name: "Your Hero",
    artist: "Ezryn Zyzyx",
    description: "High-octane arena synth-rock with hot master levels, massive dynamic synths, and robust vocal lines.",
    label: "Option D: Your Hero (Rock)",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    data: {
      trackInfo: {
        name: "Your Hero",
        artist: "Ezryn Zyzyx",
        hasAudio: true,
        statusMessage: "Solid master levels verified (-8.4 LUFS). Stable energetic performance, moderate A&R indexing potential."
      },
      critique: {
        vibe: {
          genre: "Rock",
          subgenre: "Modern Rock/Alternative Rock Cross Over",
          aesthetic: "High-octane analog synth sweeps, pounding dynamic rock kits, and soaring electric guitar walls.",
          commercialViability: "Highly Viable. Excellent fit for high-intensity game soundtracks, sport features, or Spotify's Synthwave/Retro playlists."
        },
        mixQuality: {
          score: 82,
          stereoField: "Extremely wide and engaging. Gated retro snare pans out wide; lead vocals and heavy drive electric guitars take full center stage.",
          frequencyBalance: {
            lowEnd: "Thick and solid. Dynamic sidechaining prevents the bass guitar from clogging up the kick's transient space.",
            midrange: "Energetic but slightly cluttered around 1.5kHz where heavy guitar grit and lead vocal presence clash head-on.",
            highEnd: "Slightly harsh sibilance around 6.5kHz triggering limiting artifacts under hot loudness targets."
          },
          dominanceIssues: "The heavy-packed synthesizer bus is slightly masking the lead vocal line during high-intensity chorus builds."
        },
        performance: {
          vocalScore: 89,
          vocalsCritique: "Soaring electric vocal performance. Dynamic delivery is strong, though sibilance peaks need narrow dynamic EQ suppression.",
          instrumentalScore: 87,
          instrumentationCritique: "Phenomenal guitar tracking and punchy drum fills. Synth envelope releases are impeccably programmed, matching the tempo perfectly."
        },
        arrangement: {
          flowScore: 88,
          transitionsAndArc: "Elite dynamic build-up. The filter sweep in the pre-chorus is highly cinematic, delivering immense impact when the chorus releases."
        },
        scores: {
          overallProduction: 86,
          commercialReadiness: 84
        },
        actionItems: [
          {
            title: "Dynamic Vocals Space EQ",
            recommendation: "Carve out space for the lead vocals within the active synth tracks.",
            technicalGuide: "Apply a sidechain dynamic EQ on the Synth bus, keyed to the lead vocal. Duck those synths by -1.5dB at 1.5kHz when the singer performs."
          },
          {
            title: "Tame High-Frequency Sibilance",
            recommendation: "Prevent limiting distortion by taming high-end peaks.",
            technicalGuide: "Instantiate a dynamic EQ or dedicated de-esser on lead vocals/cymbals between 5.5kHz to 7kHz to reclaim master headroom."
          },
          {
            title: "Abbey Road Reverb Filtering",
            recommendation: "Clean up spatial reverb tails in the bottom end.",
            technicalGuide: "Use a high-pass filter at 300Hz and a low-pass at 8.5kHz on high-reverb delay lines to isolate clutter and clear the soundstage."
          }
        ],
        lyricalImpact: {
          score: 91,
          meaningClarity: "Clear & Narrative",
          feedback: "Stellar metaphors about resilience and rising up, perfectly fitted to an arena-anthem chorus structure."
        },
        musicTheory: {
          score: 88,
          chordStructures: "i - VII - VI - v minor chord progression with ascending voice leading in E minor.",
          feedback: "Captures the classic dark-retro drive. The ascending chord step in the pre-chorus builds incredible harmonic expectation."
        },
        titleSearchability: {
          score: 82,
          uniquenessLevel: "Moderately Unique Motif",
          feedback: "While 'Your Hero' is a familiar theme, its specific genre-pairing and strong technical production supports great index performance."
        }
      }
    }
  },
  {
    id: "test-country-miss",
    name: "I'm a Stupid Day Drinker",
    artist: "Raging Tire Fire",
    description: "Subgenre: Country Pop. Misses of target benchmarks for danceability, acousticness, mood valence, and liveness.",
    label: "Option E: Country Pop Miss (Poor)",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    data: {
      trackInfo: {
        name: "I'm a Stupid Day Drinker",
        artist: "Raging Tire Fire",
        hasAudio: false,
        statusMessage: "Severe algorithm delta detected. Benchmark alignment is exceptionally low."
      },
      critique: {
        vibe: {
          genre: "Country",
          subgenre: "Country Pop / Contemporary Country Airplay",
          aesthetic: "Disjointed country-pop elements, loose drum timings, dry sterile acoustics with a glaring lack of modern compression glue.",
          commercialViability: "Low. The extreme differences from standard playlisting parameters means algorithmic indexing will likely skip this record."
        },
        mixQuality: {
          score: 38,
          stereoField: "Extremely narrow. Vocals are centered but acoustic guitars are thin and raw with no stereo dimension.",
          frequencyBalance: {
            lowEnd: "Muddy and uncompressed. Bass guitar dominates below 100Hz with zero sidechanging, muddying the kick soundstage.",
            midrange: "Cluttered and flat. Acoustic instruments clash in the lower mids around 400Hz causing boxy tones.",
            highEnd: "Dull and lifeless. Completely lacks high-end air above 8kHz, leaving the vocal sounding dark and cheap."
          },
          dominanceIssues: "Master peak levels are highly uneven; snare drum transient spikes are driving the master bus into clipping thresholds."
        },
        performance: {
          vocalScore: 48,
          vocalsCritique: "Intonation is shaky on held notes; the performance lacks the polished warmth expected of Country-Pop vocals, sounding dry and unrefined.",
          instrumentalScore: 42,
          instrumentationCritique: "Loose pocket timing. Acoustic guitars drift ahead of the drums, and backing tracks lack uniform tightness."
        },
        arrangement: {
          flowScore: 40,
          transitionsAndArc: "Abrupt build. Cuts from a sparse flat verse straight into a loud chorus without effective sonic dynamic lifters."
        },
        scores: {
          overallProduction: 42,
          commercialReadiness: 39
        },
        actionItems: [
          {
            title: "Dynamic Range Control",
            recommendation: "Apply multibus compression to the stereo bus elements.",
            technicalGuide: "Use a slow-attack fast-release glue compressor with a 2:1 ratio on the stereo master to bind tracks."
          },
          {
            title: "Stereo Imaging Expansion",
            recommendation: "Widen country pop acoustic guitars to build spacious hooks.",
            technicalGuide: "Harness a stereo delaying effect or micro-pitch shifter on side acoustic guitars, panning double takes out left and right."
          }
        ],
        lyricalImpact: {
          score: 35,
          meaningClarity: "Stale, simplistic clichés.",
          feedback: "Themes of day drinking lack nuance or standard radio-friendly narrative progression; the delivery sounds unenthusiastic."
        },
        musicTheory: {
          score: 42,
          chordStructures: "Overly simplified I-V-vi-IV loop with no variation.",
          feedback: "Melody behaves predictably; lacks satisfying rhythmic syncopations or harmonic hooks to invite replays."
        },
        titleSearchability: {
          score: 41,
          uniquenessLevel: "High phrase saturation.",
          feedback: "Adding standard drinking slang to Country-pop catalogues creates high title search competition."
        },
        spotifyOverrides: {
          danceability: 35,
          acousticness: 85,
          valence: 20,
          liveness: 75
        },
        liveMetrics: {
          calculatedLufs: -14.5,
          calculatedTruePeak: -0.2,
          calculatedLra: 10.5,
          calculatedStereoCorrelation: 0.15,
          calculatedBpm: 96,
          calculatedKey: "G Major",
          calculatedBassEnergy: 48,
          calculatedMidEnergy: 52,
          calculatedHighEnergy: 42,
          calculatedDuration: 198,
          calculatedWaveformPoints: [
            12, 14, 13, 15, 12,
            28, 30, 29, 31, 28, 30, 29, 32,
            34, 38, 42, 45,
            55, 58, 56, 59, 57, 58, 56, 60,
            26, 29, 28, 30, 27, 29, 28, 31,
            35, 39, 43, 46,
            56, 59, 57, 60, 58, 59, 57, 61,
            30, 32, 34, 31, 33, 35,
            58, 60, 62, 65, 63, 64, 62, 66,
            32, 28, 24, 18, 12, 6
          ]
        }
      }
    }
  }
];

export const TEST_SONG_OPTIONS: TestSongOption[] = TEST_SONG_OPTIONS_RAW.map(opt => {
  if (opt.data?.critique?.liveMetrics) {
    const pts = opt.data.critique.liveMetrics.calculatedWaveformPoints;
    const hd: number[] = [];
    for (let i = 0; i < 400; i++) {
      const srcIdx = Math.floor((i / 400) * pts.length);
      hd.push(pts[srcIdx] || 40);
    }
    (opt.data.critique.liveMetrics as any).calculatedWaveformPointsHD = hd;
  }
  return opt as TestSongOption;
});
