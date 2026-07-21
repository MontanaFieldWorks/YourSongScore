export interface VibeCritique {
  genre: string;
  subgenre: string;
  aesthetic: string;
  commercialViability: string;
}

export interface FrequencyBalance {
  lowEnd: string;
  midrange: string;
  highEnd: string;
}

export interface MixQualityCritique {
  score: number;
  stereoField: string;
  frequencyBalance: FrequencyBalance;
  dominanceIssues: string;
}

export interface PerformanceCritique {
  vocalScore: number;
  vocalsCritique: string;
  instrumentalScore: number;
  instrumentationCritique: string;
}

export interface ArrangementCritique {
  flowScore: number;
  transitionsAndArc: string;
}

export interface OverallScores {
  overallProduction: number;
  commercialReadiness: number;
}

export interface ActionItem {
  title: string;
  recommendation: string;
  technicalGuide: string;
}

export interface LyricalImpactCritique {
  score: number;
  meaningClarity: string;
  feedback: string;
}

export interface MusicTheoryCritique {
  score: number;
  chordStructures: string;
  feedback: string;
}

export interface TitleSearchabilityCritique {
  score: number;
  uniquenessLevel: string;
  feedback: string;
}

export interface LiveAudioMetrics {
  calculatedLufs: number;
  calculatedTruePeak: number;
  calculatedLra: number;
  calculatedStereoCorrelation: number;
  calculatedBpm: number;
  calculatedKey: string;
  calculatedBassEnergy: number;
  calculatedMidEnergy: number;
  calculatedHighEnergy: number;
  calculatedWaveformPoints: number[];
  calculatedWaveformPointsHD: number[];
  timeResolvedChromagram?: number[][];
  timeResolvedSpectrogram?: number[][];
  onsetRhythmTimeline?: number[];
  calculatedDuration?: number;
  calculatedKeyConfidence?: number;
  calculatedModeConfidence?: number;
  calculatedBpmConfidence?: number;
  calculatedEndOfFadeIn?: number;
  calculatedStartOfFadeOut?: number;
  calculatedTimeSignature?: number;
  calculatedTimeSignatureConfidence?: number;
  calculatedSubBassBandEnergy?: number;
  calculatedBassBandEnergy?: number;
  calculatedLowMidsBandEnergy?: number;
  calculatedCoreMidsBandEnergy?: number;
  calculatedPresenceBandEnergy?: number;
  calculatedAirBandEnergy?: number;
  detectedChordProgression?: { root: number; quality: "major" | "minor" | "power" | "sus4"; startFrame: number; endFrame: number; bassPitchClass: number }[];
  detectedChordProgressionNamed?: { root: number; quality: "major" | "minor" | "power" | "sus4"; startFrame: number; endFrame: number; name: string; startTimeSec: number; endTimeSec: number; bassPitchClass: number }[];
  detectedMelodyContour?: { voiced: boolean; frequencyHz?: number; midiNote?: number; timeSec: number }[];
  detectedMelodyNotes?: {
    notes: { midiNote: number; startTimeSec: number; endTimeSec: number }[];
    totalSteps: number;
    totalLeaps: number;
    totalRepeats: number;
    stepToLeapRatio: number;
  };
  calculatedSibilanceSpikeCount?: number;
  calculatedSibilanceSeverityScore?: number;
  calculatedTimbralConsistencyScore?: number;
  calculatedGridCohesionScore?: number;
  calculatedInstrumentalWarmthScore?: number;
  calculatedTransientPunchScore?: number;
  calculatedMelodicStagingScore?: number;
}

export interface CritiqueData {
  vibe: VibeCritique;
  mixQuality: MixQualityCritique;
  performance: PerformanceCritique;
  arrangement: ArrangementCritique;
  scores: OverallScores;
  actionItems: ActionItem[];
  lyricalImpact?: LyricalImpactCritique;
  musicTheory?: MusicTheoryCritique;
  titleSearchability?: TitleSearchabilityCritique;
  spotifyOverrides?: {
    danceability?: number;
    acousticness?: number;
    valence?: number;
    liveness?: number;
  };
  streamingAlignment?: {
    echoNestScorecard?: {
      moodValence?: number;
      danceability?: number;
      energyIntensity?: number;
      speechiness?: number;
    };
  };
  liveMetrics?: LiveAudioMetrics;
  userValence?: number;
  userEnergy?: number;
  subMetricsCall1?: any;
  subMetricsCall2?: any;
  subMetricsCall3?: any;
  subMetricsCall1Failed?: boolean;
  subMetricsCall2Failed?: boolean;
  subMetricsCall3Failed?: boolean;
}

export interface TrackInfo {
  name: string;
  artist: string;
  coverArt?: string;
  hasAudio?: boolean;
  statusMessage?: string;
  id?: string;
}

export interface CritiqueResponse {
  critique: CritiqueData;
  trackInfo?: TrackInfo;
}

export interface SampleSong {
  id: string;
  title: string;
  artist: string;
  type: "demo" | "finished" | "vocal";
  audioUrl: string;
  description: string;
  key?: string;
  bpm?: number;
}

export const SAMPLE_SONGS: SampleSong[] = [
  {
    id: "bedroom-demo",
    title: "Dreaming in Daylight",
    artist: "The Backyard Project",
    type: "demo",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    description: "A cozy, raw indie-pop mix in progress with active acoustic strumming and double-tracked backing keys.",
    key: "G Major",
    bpm: 115
  },
  {
    id: "live-session",
    title: "Midnight Waves",
    artist: "Tidal Sync",
    type: "vocal",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    description: "A fast-paced synthwave instrumental demo. Great for checking low-end compression recommendations and pacing.",
    key: "A minor",
    bpm: 120
  },
  {
    id: "retro-funk",
    title: "Static Horizon",
    artist: "Retrograde",
    type: "finished",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    description: "A fully developed, upbeat indie-rock arrangement. Excellent for testing commercial readiness and stream limiting levels.",
    key: "D minor",
    bpm: 128
  }
];

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt?: string;
}

export interface StoredTrack {
  id: string;
  userId: string;
  name: string;
  format: "WAV" | "MP3" | "FLAC" | "AAC" | string;
  size: number; // in MB
  status: "pending_analysis" | "analyzed";
  createdAt: string;
  convertedMp3Url?: string;
  critique?: CritiqueData;
  coverArt?: string;
  metaTitle?: string;
  metaArtist?: string;
  metaGenre?: string;
  metrics?: {
    overall: number;
    mix: number;
    performance: number;
    engagement: number;
    lyric: number;
    theory: number;
    seo: number;
  };
}

