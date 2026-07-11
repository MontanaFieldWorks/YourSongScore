export const GENRE_MAP: Record<string, string[]> = {
  "Pop": [
    "Mainstream Top 40",
    "Rhythm-Pop / Dance-pop",
    "Synthpop",
    "Teen Pop"
  ],
  "Rap / Hip-Hop": [
    "Mainstream Rap",
    "Rhythmic / Urban Mainstream",
    "Throwback Hip-Hop",
    "Rap Airplay"
  ],
  "Rock": [
    "Heritage Rock / Mainstream Rock",
    "Active Rock",
    "Modern Rock / Alternative Rock Crossover",
    "Mainstream Heavy Metal",
    "Grunge / 90s Alternative Catalog"
  ],
  "Alternative": [
    "Alternative",
    "Modern Rock / Active Indie",
    "Indie Rock / College Alternative",
    "Triple A",
    "Shoegaze / Dream Pop Revival"
  ],
  "Dance / Electronic": [
    "Mainstream Dance / Dance/Electronic Airplay",
    "House / Tech-House",
    "Techno",
    "Dubstep / Festival Bass",
    "Trance",
    "Drum and Bass",
    "Ambient / Downtempo"
  ],
  "R&B": [
    "Contemporary R&B / Urban Adult Contemporary",
    "Adult R&B",
    "Neo-Soul",
    "Funk / R&B Heritage Catalog"
  ],
  "Country": [
    "Country Airplay",
    "Country Pop / Contemporary Country Airplay",
    "Outlaw Country / Classic Country Catalog",
    "Americana",
    "Bluegrass",
    "Honky-Tonk"
  ],
  "Latin": [
    "Latin Rhythm",
    "Latin Trap",
    "Latin Tropical"
  ],
  "Jazz": [
    "Smooth Jazz",
    "Traditional Jazz"
  ],
  "Blues": [
    "Electric Blues / Chicago Blues",
    "Delta Blues / Roots Blues"
  ],
  "Classical": [
    "Traditional Classical",
    "Classical Crossover"
  ],
  "World Music": [
    "K-Pop / World Digital Song Sales",
    "Afrobeats / Afro-Pop Mainstream"
  ]
};

export interface SubgenreProfile {
  genre: string;
  subgenre: string;
  archetype: string;
  danceMin: number;
  danceMax: number;
  bpmMin: number;
  bpmMax: number;
  energyMin: number;
  energyMax: number;
  crestMin: number;
  crestMax: number;
  valenceMin: number;
  valenceMax: number;
  speechMin: number;
  speechMax: number;
  acousticMin: number;
  acousticMax: number;
  instMin: number;
  instMax: number;
  liveMin: number;
  liveMax: number;
}

export const SUBGENRE_PROFILES: Record<string, SubgenreProfile> = {
  // Pop
  "pop|mainstream top 40": {
    genre: "Pop",
    subgenre: "Mainstream Top 40",
    archetype: "GRID_ELEC",
    danceMin: 0.68, danceMax: 0.82,
    bpmMin: 100, bpmMax: 130,
    energyMin: 0.65, energyMax: 0.85,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.45, valenceMax: 0.75,
    speechMin: 0.03, speechMax: 0.12,
    acousticMin: 0.02, acousticMax: 0.22,
    instMin: 0, instMax: 0.05,
    liveMin: 0.04, liveMax: 0.15
  },
  "pop|rhythm-pop / dance-pop": {
    genre: "Pop",
    subgenre: "Rhythm-Pop / Dance-pop",
    archetype: "GRID_ELEC",
    danceMin: 0.78, danceMax: 0.92,
    bpmMin: 118, bpmMax: 128,
    energyMin: 0.75, energyMax: 0.9,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.6, valenceMax: 0.85,
    speechMin: 0.04, speechMax: 0.15,
    acousticMin: 0.01, acousticMax: 0.15,
    instMin: 0, instMax: 0.1,
    liveMin: 0.05, liveMax: 0.18
  },
  "pop|synthpop": {
    genre: "Pop",
    subgenre: "Synthpop",
    archetype: "GRID_ELEC",
    danceMin: 0.65, danceMax: 0.78,
    bpmMin: 110, bpmMax: 135,
    energyMin: 0.6, energyMax: 0.8,
    crestMin: 7, crestMax: 10,
    valenceMin: 0.4, valenceMax: 0.7,
    speechMin: 0.03, speechMax: 0.1,
    acousticMin: 0.01, acousticMax: 0.2,
    instMin: 0.01, instMax: 0.15,
    liveMin: 0.04, liveMax: 0.15
  },
  "pop|teen pop": {
    genre: "Pop",
    subgenre: "Teen Pop",
    archetype: "GRID_ELEC",
    danceMin: 0.7, danceMax: 0.85,
    bpmMin: 95, bpmMax: 125,
    energyMin: 0.68, energyMax: 0.88,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.7, valenceMax: 0.95,
    speechMin: 0.03, speechMax: 0.12,
    acousticMin: 0.03, acousticMax: 0.25,
    instMin: 0, instMax: 0.02,
    liveMin: 0.04, liveMax: 0.15
  },

  // Rap / Hip-Hop
  "rap / hip-hop|mainstream rap": {
    genre: "Rap / Hip-Hop",
    subgenre: "Mainstream Rap",
    archetype: "GRID_ELEC",
    danceMin: 0.72, danceMax: 0.88,
    bpmMin: 85, bpmMax: 105,
    energyMin: 0.6, energyMax: 0.82,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.45, valenceMax: 0.75,
    speechMin: 0.22, speechMax: 0.45,
    acousticMin: 0.02, acousticMax: 0.18,
    instMin: 0, instMax: 0.05,
    liveMin: 0.08, liveMax: 0.22
  },
  "rap / hip-hop|rhythmic / urban mainstream": {
    genre: "Rap / Hip-Hop",
    subgenre: "Rhythmic / Urban Mainstream",
    archetype: "GRID_ELEC",
    danceMin: 0.75, danceMax: 0.92,
    bpmMin: 90, bpmMax: 112,
    energyMin: 0.62, energyMax: 0.85,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.5, valenceMax: 0.8,
    speechMin: 0.18, speechMax: 0.38,
    acousticMin: 0.01, acousticMax: 0.15,
    instMin: 0, instMax: 0.08,
    liveMin: 0.06, liveMax: 0.2
  },
  "rap / hip-hop|throwback hip-hop": {
    genre: "Rap / Hip-Hop",
    subgenre: "Throwback Hip-Hop",
    archetype: "ORGANIC_TRAN",
    danceMin: 0.7, danceMax: 0.85,
    bpmMin: 88, bpmMax: 98,
    energyMin: 0.65, energyMax: 0.8,
    crestMin: 7, crestMax: 10,
    valenceMin: 0.55, valenceMax: 0.82,
    speechMin: 0.25, speechMax: 0.5,
    acousticMin: 0.05, acousticMax: 0.3,
    instMin: 0, instMax: 0.02,
    liveMin: 0.1, liveMax: 0.25
  },
  "rap / hip-hop|rap airplay": {
    genre: "Rap / Hip-Hop",
    subgenre: "Rap Airplay",
    archetype: "GRID_ELEC",
    danceMin: 0.68, danceMax: 0.85,
    bpmMin: 80, bpmMax: 140,
    energyMin: 0.58, energyMax: 0.8,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.4, valenceMax: 0.7,
    speechMin: 0.2, speechMax: 0.42,
    acousticMin: 0.02, acousticMax: 0.2,
    instMin: 0, instMax: 0.05,
    liveMin: 0.08, liveMax: 0.22
  },

  // Rock
  "rock|heritage rock / mainstream rock": {
    genre: "Rock",
    subgenre: "Heritage Rock / Mainstream Rock",
    archetype: "MID_GAIN",
    danceMin: 0.45, danceMax: 0.65,
    bpmMin: 110, bpmMax: 140,
    energyMin: 0.65, energyMax: 0.88,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.4, valenceMax: 0.72,
    speechMin: 0.03, speechMax: 0.08,
    acousticMin: 0.02, acousticMax: 0.18,
    instMin: 0.01, instMax: 0.25,
    liveMin: 0.08, liveMax: 0.25
  },
  "rock|active rock": {
    genre: "Rock",
    subgenre: "Active Rock",
    archetype: "HIGH_GAIN",
    danceMin: 0.4, danceMax: 0.6,
    bpmMin: 115, bpmMax: 150,
    energyMin: 0.75, energyMax: 0.95,
    crestMin: 4, crestMax: 7,
    valenceMin: 0.3, valenceMax: 0.6,
    speechMin: 0.04, speechMax: 0.12,
    acousticMin: 0, acousticMax: 0.05,
    instMin: 0.01, instMax: 0.2,
    liveMin: 0.06, liveMax: 0.22
  },
  "rock|modern rock / alternative rock crossover": {
    genre: "Rock",
    subgenre: "Modern Rock / Alternative Rock Crossover",
    archetype: "MID_GAIN",
    danceMin: 0.52, danceMax: 0.72,
    bpmMin: 115, bpmMax: 135,
    energyMin: 0.68, energyMax: 0.88,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.4, valenceMax: 0.7,
    speechMin: 0.03, speechMax: 0.09,
    acousticMin: 0.01, acousticMax: 0.15,
    instMin: 0.01, instMax: 0.18,
    liveMin: 0.05, liveMax: 0.2
  },
  "rock|mainstream heavy metal": {
    genre: "Rock",
    subgenre: "Mainstream Heavy Metal",
    archetype: "HIGH_GAIN",
    danceMin: 0.32, danceMax: 0.55,
    bpmMin: 120, bpmMax: 180,
    energyMin: 0.8, energyMax: 0.98,
    crestMin: 3, crestMax: 6,
    valenceMin: 0.15, valenceMax: 0.45,
    speechMin: 0.05, speechMax: 0.15,
    acousticMin: 0, acousticMax: 0.02,
    instMin: 0.05, instMax: 0.4,
    liveMin: 0.08, liveMax: 0.28
  },
  "rock|grunge / 90s alternative catalog": {
    genre: "Rock",
    subgenre: "Grunge / 90s Alternative Catalog",
    archetype: "MID_GAIN",
    danceMin: 0.42, danceMax: 0.62,
    bpmMin: 90, bpmMax: 130,
    energyMin: 0.6, energyMax: 0.85,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.25, valenceMax: 0.55,
    speechMin: 0.03, speechMax: 0.07,
    acousticMin: 0.01, acousticMax: 0.12,
    instMin: 0.01, instMax: 0.15,
    liveMin: 0.07, liveMax: 0.22
  },

  // Alternative
  "alternative|alternative": {
    genre: "Alternative",
    subgenre: "Alternative",
    archetype: "MID_GAIN",
    danceMin: 0.5, danceMax: 0.7,
    bpmMin: 105, bpmMax: 135,
    energyMin: 0.55, energyMax: 0.82,
    crestMin: 6, crestMax: 10,
    valenceMin: 0.35, valenceMax: 0.65,
    speechMin: 0.03, speechMax: 0.08,
    acousticMin: 0.02, acousticMax: 0.25,
    instMin: 0.01, instMax: 0.2,
    liveMin: 0.06, liveMax: 0.22
  },
  "alternative|modern rock / active indie": {
    genre: "Alternative",
    subgenre: "Modern Rock / Active Indie",
    archetype: "MID_GAIN",
    danceMin: 0.55, danceMax: 0.75,
    bpmMin: 112, bpmMax: 138,
    energyMin: 0.62, energyMax: 0.85,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.42, valenceMax: 0.72,
    speechMin: 0.03, speechMax: 0.09,
    acousticMin: 0.01, acousticMax: 0.18,
    instMin: 0.01, instMax: 0.15,
    liveMin: 0.05, liveMax: 0.2
  },
  "alternative|indie rock / college alternative": {
    genre: "Alternative",
    subgenre: "Indie Rock / College Alternative",
    archetype: "MID_GAIN",
    danceMin: 0.52, danceMax: 0.72,
    bpmMin: 100, bpmMax: 140,
    energyMin: 0.5, energyMax: 0.78,
    crestMin: 7, crestMax: 11,
    valenceMin: 0.38, valenceMax: 0.68,
    speechMin: 0.03, speechMax: 0.08,
    acousticMin: 0.05, acousticMax: 0.35,
    instMin: 0.02, instMax: 0.3,
    liveMin: 0.06, liveMax: 0.24
  },
  "alternative|triple a": {
    genre: "Alternative",
    subgenre: "Triple A",
    archetype: "MID_GAIN",
    danceMin: 0.48, danceMax: 0.68,
    bpmMin: 92, bpmMax: 124,
    energyMin: 0.45, energyMax: 0.72,
    crestMin: 8, crestMax: 12,
    valenceMin: 0.4, valenceMax: 0.7,
    speechMin: 0.03, speechMax: 0.06,
    acousticMin: 0.1, acousticMax: 0.55,
    instMin: 0.01, instMax: 0.15,
    liveMin: 0.06, liveMax: 0.2
  },
  "alternative|shoegaze / dream pop revival": {
    genre: "Alternative",
    subgenre: "Shoegaze / Dream Pop Revival",
    archetype: "MID_GAIN",
    danceMin: 0.38, danceMax: 0.6,
    bpmMin: 95, bpmMax: 140,
    energyMin: 0.55, energyMax: 0.8,
    crestMin: 7, crestMax: 10,
    valenceMin: 0.25, valenceMax: 0.55,
    speechMin: 0.03, speechMax: 0.06,
    acousticMin: 0.01, acousticMax: 0.22,
    instMin: 0.15, instMax: 0.75,
    liveMin: 0.05, liveMax: 0.18
  },

  // Dance / Electronic
  "dance / electronic|mainstream dance / dance/electronic airplay": {
    genre: "Dance / Electronic",
    subgenre: "Mainstream Dance / Dance/Electronic Airplay",
    archetype: "GRID_ELEC",
    danceMin: 0.75, danceMax: 0.88,
    bpmMin: 120, bpmMax: 128,
    energyMin: 0.72, energyMax: 0.9,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.5, valenceMax: 0.8,
    speechMin: 0.04, speechMax: 0.12,
    acousticMin: 0.01, acousticMax: 0.12,
    instMin: 0.02, instMax: 0.25,
    liveMin: 0.05, liveMax: 0.18
  },
  "dance / electronic|house / tech-house": {
    genre: "Dance / Electronic",
    subgenre: "House / Tech-House",
    archetype: "GRID_ELEC",
    danceMin: 0.78, danceMax: 0.92,
    bpmMin: 122, bpmMax: 126,
    energyMin: 0.7, energyMax: 0.88,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.52, valenceMax: 0.78,
    speechMin: 0.04, speechMax: 0.1,
    acousticMin: 0.01, acousticMax: 0.08,
    instMin: 0.2, instMax: 0.85,
    liveMin: 0.04, liveMax: 0.15
  },
  "dance / electronic|techno": {
    genre: "Dance / Electronic",
    subgenre: "Techno",
    archetype: "GRID_ELEC",
    danceMin: 0.76, danceMax: 0.88,
    bpmMin: 125, bpmMax: 132,
    energyMin: 0.75, energyMax: 0.92,
    crestMin: 4, crestMax: 7,
    valenceMin: 0.3, valenceMax: 0.62,
    speechMin: 0.04, speechMax: 0.09,
    acousticMin: 0, acousticMax: 0.05,
    instMin: 0.45, instMax: 0.92,
    liveMin: 0.04, liveMax: 0.14
  },
  "dance / electronic|dubstep / festival bass": {
    genre: "Dance / Electronic",
    subgenre: "Dubstep / Festival Bass",
    archetype: "GRID_ELEC",
    danceMin: 0.58, danceMax: 0.75,
    bpmMin: 140, bpmMax: 150,
    energyMin: 0.82, energyMax: 0.98,
    crestMin: 3, crestMax: 6,
    valenceMin: 0.25, valenceMax: 0.58,
    speechMin: 0.05, speechMax: 0.22,
    acousticMin: 0, acousticMax: 0.04,
    instMin: 0.1, instMax: 0.7,
    liveMin: 0.06, liveMax: 0.22
  },
  "dance / electronic|trance": {
    genre: "Dance / Electronic",
    subgenre: "Trance",
    archetype: "GRID_ELEC",
    danceMin: 0.62, danceMax: 0.78,
    bpmMin: 134, bpmMax: 140,
    energyMin: 0.75, energyMax: 0.92,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.38, valenceMax: 0.68,
    speechMin: 0.03, speechMax: 0.08,
    acousticMin: 0, acousticMax: 0.06,
    instMin: 0.35, instMax: 0.88,
    liveMin: 0.05, liveMax: 0.18
  },
  "dance / electronic|drum and bass": {
    genre: "Dance / Electronic",
    subgenre: "Drum and Bass",
    archetype: "GRID_ELEC",
    danceMin: 0.65, danceMax: 0.8,
    bpmMin: 170, bpmMax: 178,
    energyMin: 0.78, energyMax: 0.95,
    crestMin: 4, crestMax: 7,
    valenceMin: 0.4, valenceMax: 0.7,
    speechMin: 0.04, speechMax: 0.14,
    acousticMin: 0, acousticMax: 0.05,
    instMin: 0.25, instMax: 0.85,
    liveMin: 0.06, liveMax: 0.22
  },
  "dance / electronic|ambient / downtempo": {
    genre: "Dance / Electronic",
    subgenre: "Ambient / Downtempo",
    archetype: "WIDE_DYN",
    danceMin: 0.35, danceMax: 0.6,
    bpmMin: 70, bpmMax: 110,
    energyMin: 0.2, energyMax: 0.52,
    crestMin: 9, crestMax: 14,
    valenceMin: 0.2, valenceMax: 0.55,
    speechMin: 0.03, speechMax: 0.06,
    acousticMin: 0.2, acousticMax: 0.78,
    instMin: 0.5, instMax: 0.95,
    liveMin: 0.03, liveMax: 0.12
  },

  // R&B
  "r&b|contemporary r&b / urban adult contemporary": {
    genre: "R&B",
    subgenre: "Contemporary R&B / Urban Adult Contemporary",
    archetype: "GROOVE_DYN",
    danceMin: 0.65, danceMax: 0.82,
    bpmMin: 90, bpmMax: 120,
    energyMin: 0.52, energyMax: 0.76,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.45, valenceMax: 0.75,
    speechMin: 0.05, speechMax: 0.18,
    acousticMin: 0.04, acousticMax: 0.28,
    instMin: 0, instMax: 0.05,
    liveMin: 0.05, liveMax: 0.18
  },
  "r&b|adult r&b": {
    genre: "R&B",
    subgenre: "Adult R&B",
    archetype: "GROOVE_DYN",
    danceMin: 0.6, danceMax: 0.78,
    bpmMin: 82, bpmMax: 105,
    energyMin: 0.48, energyMax: 0.72,
    crestMin: 7, crestMax: 10,
    valenceMin: 0.48, valenceMax: 0.74,
    speechMin: 0.04, speechMax: 0.12,
    acousticMin: 0.06, acousticMax: 0.35,
    instMin: 0, instMax: 0.02,
    liveMin: 0.06, liveMax: 0.18
  },
  "r&b|neo-soul": {
    genre: "R&B",
    subgenre: "Neo-Soul",
    archetype: "GROOVE_DYN",
    danceMin: 0.62, danceMax: 0.8,
    bpmMin: 80, bpmMax: 100,
    energyMin: 0.45, energyMax: 0.68,
    crestMin: 8, crestMax: 11,
    valenceMin: 0.42, valenceMax: 0.72,
    speechMin: 0.05, speechMax: 0.16,
    acousticMin: 0.12, acousticMax: 0.52,
    instMin: 0.01, instMax: 0.12,
    liveMin: 0.08, liveMax: 0.24
  },
  "r&b|funk / r&b heritage catalog": {
    genre: "R&B",
    subgenre: "Funk / R&B Heritage Catalog",
    archetype: "GROOVE_DYN",
    danceMin: 0.72, danceMax: 0.88,
    bpmMin: 98, bpmMax: 118,
    energyMin: 0.62, energyMax: 0.82,
    crestMin: 7, crestMax: 10,
    valenceMin: 0.6, valenceMax: 0.88,
    speechMin: 0.04, speechMax: 0.12,
    acousticMin: 0.05, acousticMax: 0.3,
    instMin: 0.01, instMax: 0.1,
    liveMin: 0.08, liveMax: 0.25
  },

  // Country
  "country|country airplay": {
    genre: "Country",
    subgenre: "Country Airplay",
    archetype: "ORGANIC_TRAN",
    danceMin: 0.55, danceMax: 0.72,
    bpmMin: 90, bpmMax: 115,
    energyMin: 0.6, energyMax: 0.82,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.5, valenceMax: 0.78,
    speechMin: 0.03, speechMax: 0.06,
    acousticMin: 0.08, acousticMax: 0.42,
    instMin: 0, instMax: 0.05,
    liveMin: 0.06, liveMax: 0.18
  },
  "country|country pop / contemporary country airplay": {
    genre: "Country",
    subgenre: "Country Pop / Contemporary Country Airplay",
    archetype: "ORGANIC_TRAN",
    danceMin: 0.6, danceMax: 0.78,
    bpmMin: 92, bpmMax: 122,
    energyMin: 0.64, energyMax: 0.85,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.54, valenceMax: 0.82,
    speechMin: 0.03, speechMax: 0.07,
    acousticMin: 0.04, acousticMax: 0.3,
    instMin: 0, instMax: 0.02,
    liveMin: 0.05, liveMax: 0.16
  },
  "country|outlaw country / classic country catalog": {
    genre: "Country",
    subgenre: "Outlaw Country / Classic Country Catalog",
    archetype: "ORGANIC_TRAN",
    danceMin: 0.5, danceMax: 0.68,
    bpmMin: 84, bpmMax: 112,
    energyMin: 0.48, energyMax: 0.7,
    crestMin: 7, crestMax: 10,
    valenceMin: 0.48, valenceMax: 0.76,
    speechMin: 0.03, speechMax: 0.06,
    acousticMin: 0.22, acousticMax: 0.65,
    instMin: 0, instMax: 0.05,
    liveMin: 0.06, liveMax: 0.22
  },
  "country|americana": {
    genre: "Country",
    subgenre: "Americana",
    archetype: "ORGANIC_TRAN",
    danceMin: 0.48, danceMax: 0.68,
    bpmMin: 80, bpmMax: 120,
    energyMin: 0.44, energyMax: 0.7,
    crestMin: 7, crestMax: 11,
    valenceMin: 0.4, valenceMax: 0.7,
    speechMin: 0.03, speechMax: 0.06,
    acousticMin: 0.3, acousticMax: 0.75,
    instMin: 0.01, instMax: 0.15,
    liveMin: 0.06, liveMax: 0.22
  },
  "country|bluegrass": {
    genre: "Country",
    subgenre: "Bluegrass",
    archetype: "ORGANIC_TRAN",
    danceMin: 0.45, danceMax: 0.65,
    bpmMin: 95, bpmMax: 145,
    energyMin: 0.52, energyMax: 0.76,
    crestMin: 8, crestMax: 12,
    valenceMin: 0.55, valenceMax: 0.85,
    speechMin: 0.03, speechMax: 0.08,
    acousticMin: 0.65, acousticMax: 0.95,
    instMin: 0.01, instMax: 0.2,
    liveMin: 0.06, liveMax: 0.25
  },
  "country|honky-tonk": {
    genre: "Country",
    subgenre: "Honky-Tonk",
    archetype: "ORGANIC_TRAN",
    danceMin: 0.52, danceMax: 0.7,
    bpmMin: 86, bpmMax: 116,
    energyMin: 0.5, energyMax: 0.74,
    crestMin: 7, crestMax: 10,
    valenceMin: 0.52, valenceMax: 0.8,
    speechMin: 0.03, speechMax: 0.06,
    acousticMin: 0.2, acousticMax: 0.58,
    instMin: 0, instMax: 0.04,
    liveMin: 0.06, liveMax: 0.2
  },

  // Latin
  "latin|latin rhythm": {
    genre: "Latin",
    subgenre: "Latin Rhythm",
    archetype: "GRID_ELEC",
    danceMin: 0.75, danceMax: 0.92,
    bpmMin: 88, bpmMax: 105,
    energyMin: 0.65, energyMax: 0.86,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.58, valenceMax: 0.85,
    speechMin: 0.06, speechMax: 0.22,
    acousticMin: 0.03, acousticMax: 0.25,
    instMin: 0, instMax: 0.08,
    liveMin: 0.05, liveMax: 0.18
  },
  "latin|latin trap": {
    genre: "Latin",
    subgenre: "Latin Trap",
    archetype: "GRID_ELEC",
    danceMin: 0.7, danceMax: 0.86,
    bpmMin: 130, bpmMax: 145,
    energyMin: 0.62, energyMax: 0.84,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.42, valenceMax: 0.72,
    speechMin: 0.12, speechMax: 0.35,
    acousticMin: 0.02, acousticMax: 0.2,
    instMin: 0, instMax: 0.05,
    liveMin: 0.06, liveMax: 0.2
  },
  "latin|latin tropical": {
    genre: "Latin",
    subgenre: "Latin Tropical",
    archetype: "GRID_ELEC",
    danceMin: 0.72, danceMax: 0.88,
    bpmMin: 95, bpmMax: 128,
    energyMin: 0.65, energyMax: 0.85,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.65, valenceMax: 0.9,
    speechMin: 0.04, speechMax: 0.12,
    acousticMin: 0.12, acousticMax: 0.45,
    instMin: 0, instMax: 0.05,
    liveMin: 0.06, liveMax: 0.22
  },

  // Jazz
  "jazz|smooth jazz": {
    genre: "Jazz",
    subgenre: "Smooth Jazz",
    archetype: "GROOVE_DYN",
    danceMin: 0.55, danceMax: 0.74,
    bpmMin: 85, bpmMax: 105,
    energyMin: 0.45, energyMax: 0.68,
    crestMin: 8, crestMax: 11,
    valenceMin: 0.45, valenceMax: 0.75,
    speechMin: 0.03, speechMax: 0.07,
    acousticMin: 0.25, acousticMax: 0.65,
    instMin: 0.15, instMax: 0.7,
    liveMin: 0.05, liveMax: 0.16
  },
  "jazz|traditional jazz": {
    genre: "Jazz",
    subgenre: "Traditional Jazz",
    archetype: "ORGANIC_TRAN",
    danceMin: 0.42, danceMax: 0.65,
    bpmMin: 75, bpmMax: 140,
    energyMin: 0.35, energyMax: 0.62,
    crestMin: 9, crestMax: 13,
    valenceMin: 0.38, valenceMax: 0.68,
    speechMin: 0.03, speechMax: 0.08,
    acousticMin: 0.45, acousticMax: 0.85,
    instMin: 0.25, instMax: 0.85,
    liveMin: 0.08, liveMax: 0.26
  },

  // Blues
  "blues|electric blues / chicago blues": {
    genre: "Blues",
    subgenre: "Electric Blues / Chicago Blues",
    archetype: "ORGANIC_TRAN",
    danceMin: 0.5, danceMax: 0.7,
    bpmMin: 88, bpmMax: 124,
    energyMin: 0.52, energyMax: 0.78,
    crestMin: 7, crestMax: 10,
    valenceMin: 0.42, valenceMax: 0.72,
    speechMin: 0.03, speechMax: 0.08,
    acousticMin: 0.15, acousticMax: 0.52,
    instMin: 0.01, instMax: 0.18,
    liveMin: 0.07, liveMax: 0.22
  },
  "blues|delta blues / roots blues": {
    genre: "Blues",
    subgenre: "Delta Blues / Roots Blues",
    archetype: "ORGANIC_TRAN",
    danceMin: 0.42, danceMax: 0.65,
    bpmMin: 80, bpmMax: 115,
    energyMin: 0.32, energyMax: 0.6,
    crestMin: 8, crestMax: 12,
    valenceMin: 0.35, valenceMax: 0.68,
    speechMin: 0.03, speechMax: 0.07,
    acousticMin: 0.55, acousticMax: 0.92,
    instMin: 0.02, instMax: 0.25,
    liveMin: 0.06, liveMax: 0.24
  },

  // Classical
  "classical|traditional classical": {
    genre: "Classical",
    subgenre: "Traditional Classical",
    archetype: "WIDE_DYN",
    danceMin: 0.18, danceMax: 0.42,
    bpmMin: 65, bpmMax: 140,
    energyMin: 0.12, energyMax: 0.48,
    crestMin: 11, crestMax: 16,
    valenceMin: 0.15, valenceMax: 0.52,
    speechMin: 0.03, speechMax: 0.05,
    acousticMin: 0.75, acousticMax: 0.98,
    instMin: 0.65, instMax: 0.95,
    liveMin: 0.03, liveMax: 0.12
  },
  "classical|classical crossover": {
    genre: "Classical",
    subgenre: "Classical Crossover",
    archetype: "WIDE_DYN",
    danceMin: 0.35, danceMax: 0.62,
    bpmMin: 75, bpmMax: 135,
    energyMin: 0.4, energyMax: 0.7,
    crestMin: 8, crestMax: 12,
    valenceMin: 0.28, valenceMax: 0.62,
    speechMin: 0.03, speechMax: 0.06,
    acousticMin: 0.42, acousticMax: 0.8,
    instMin: 0.35, instMax: 0.85,
    liveMin: 0.04, liveMax: 0.15
  },

  // World Music
  "world music|k-pop / world digital song sales": {
    genre: "World Music",
    subgenre: "K-Pop / World Digital Song Sales",
    archetype: "GRID_ELEC",
    danceMin: 0.7, danceMax: 0.86,
    bpmMin: 100, bpmMax: 132,
    energyMin: 0.7, energyMax: 0.92,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.52, valenceMax: 0.82,
    speechMin: 0.04, speechMax: 0.16,
    acousticMin: 0.02, acousticMax: 0.18,
    instMin: 0, instMax: 0.06,
    liveMin: 0.05, liveMax: 0.18
  },
  "world music|afrobeats / afro-pop mainstream": {
    genre: "World Music",
    subgenre: "Afrobeats / Afro-Pop Mainstream",
    archetype: "GRID_ELEC",
    danceMin: 0.75, danceMax: 0.9,
    bpmMin: 98, bpmMax: 115,
    energyMin: 0.58, energyMax: 0.8,
    crestMin: 6, crestMax: 9,
    valenceMin: 0.62, valenceMax: 0.88,
    speechMin: 0.05, speechMax: 0.18,
    acousticMin: 0.06, acousticMax: 0.35,
    instMin: 0, instMax: 0.1,
    liveMin: 0.05, liveMax: 0.18
  },
  "hip hop|trap / mainstream hip-hop": {
    genre: "Hip-Hop",
    subgenre: "Trap / Mainstream Hip-Hop",
    archetype: "TRAP_808",
    danceMin: 0.65, danceMax: 0.85,
    bpmMin: 70, bpmMax: 150,
    energyMin: 0.55, energyMax: 0.8,
    crestMin: 5, crestMax: 8,
    valenceMin: 0.25, valenceMax: 0.55,
    speechMin: 0.15, speechMax: 0.4,
    acousticMin: 0.02, acousticMax: 0.15,
    instMin: 0, instMax: 0.05,
    liveMin: 0.05, liveMax: 0.2
  },
  "electronic|edm / dance": {
    genre: "Electronic",
    subgenre: "EDM / Dance",
    archetype: "FESTIVAL_EDM",
    danceMin: 0.7, danceMax: 0.9,
    bpmMin: 120, bpmMax: 140,
    energyMin: 0.75, energyMax: 0.95,
    crestMin: 4, crestMax: 7,
    valenceMin: 0.2, valenceMax: 0.45,
    speechMin: 0.03, speechMax: 0.1,
    acousticMin: 0.01, acousticMax: 0.08,
    instMin: 0.1, instMax: 0.4,
    liveMin: 0.05, liveMax: 0.2
  }
};

export const CRITIQUE_FIX_MAP: Record<string, { critique: string; fix: string }> = {
  // GRID_ELEC
  "GRID_ELEC|Danceability|TOO_LOW": {
    critique: "Your rhythm grid feels too fluid, loose, or humanly elastic for a competitive electronic/pop footprint. Playlists expect an iron-clad, highly predictable pulse that commands instant familiarity. Timing variances or loose grooves drop this metric below market viability.",
    fix: "Quantize your drum MIDI notes to a strict 100% grid layout. Strip away complex, syncopated ghost notes or shifting percussion steps. Focus on a clear backbeat on counts 2 and 4, and anchor your kick drum tightly to the grid."
  },
  "GRID_ELEC|Danceability|TOO_HIGH": {
    critique: "Your track's groove presents as an intense, rhythmically aggressive underground club loop. It lacks the broader accessible, vocal-focused framework required of a commercial radio pop production. Overwhelming rhythm lines pull focus entirely away from lyrics.",
    fix: "Soften the driving transient volume or decay length of your rhythm section. Introduce gentle melodic syncopation elsewhere in the arrangement, or carve out structural space where the rhythm steps back to let the lead vocal dominate."
  },
  "GRID_ELEC|Energy|TOO_LOW": {
    critique: "Your mix lacks the dense, hyper-competitive loudness, perceived psychological intensity, and forward thrust required for modern commercial streaming. This occurs when an audio file has an overly wide dynamic range or vast frequency gaps across the spectrum.",
    fix: "Apply multi-band compression across your main instrument busses to pull up quiet micro-details. Tighten your master bus limiter settings to control rapid transient peaks, compressing your mix's overall Crest Factor down into the tight 5 dB-8 dB zone."
  },
  "GRID_ELEC|Energy|TOO_HIGH": {
    critique: "Your master is over-saturated and hyper-compressed, flattening your mix into an exhausting, static 'wall of sound' that lacks breathing room. This extreme lack of dynamics chokes your performance and causes audible clipping on consumer streaming codecs.",
    fix: "Back off your final master limiters, lower your master bus compression ratios, and restore clean transient punch to your drum channels. Allow your arrangements to dip slightly in volume during verses to give choruses dynamic impact."
  },
  "GRID_ELEC|Valence|TOO_LOW": {
    critique: "The emotional footprint of this track registers as dark, brooding, or harmonically tense for a mainstream profile. The audio lacks the requisite harmonic consonance, spectral brightness, or uplifting pitch contours that algorithms look for in charting records.",
    fix: "Boost your upper-mid harmonic frequencies (3 kHz to 6 kHz), brighten up your synth tracking with high-shelf EQ, or introduce sparkling vocal harmony stacks. Consider altering minor chords to major extensions or incorporating bright counter-hooks."
  },
  "GRID_ELEC|Valence|TOO_HIGH": {
    critique: "The track reads algorithmically as overly sweet, hyper-cheerful, or piercingly bright. This can alienate modern demographics who generally favor more sophisticated, nuanced emotional states and balanced mid-range warmth over brittle high-end frequencies.",
    fix: "Incorporate minor chord extensions (such as minor 7ths or 9ths) to inject harmonic depth. Tame aggressive high-frequency sizzle with a dynamic EQ on your synths, and build a more solid, authoritative low-mid frequency foundation."
  },
  "GRID_ELEC|Speechiness|TOO_LOW": {
    critique: "Your vocal delivery is getting lost in the mix, presenting with low syllable-to-second sharpness and weak transient definition against the backing track. Lyrics are blending into the instruments rather than carving out distinct phonetic space.",
    fix: "Ensure your vocal tracking is perfectly front-and-center in mono. Use a high-shelf saturation plugin to accentuate transient crispness between 2 kHz and 7 kHz, making sure sharp consonants like T, K, and S cut through clearly."
  },
  "GRID_ELEC|Speechiness|TOO_HIGH": {
    critique: "Your track is triggering rapid-fire, highly conversational, or rhythmic staccato signatures that push its profile out of bounds into a spoken-word category. Commercial pop/dance tracks demand sustained melodic contours rather than percussive talking.",
    fix: "Adjust your vocal lines toward longer, sustained, and highly melodic sung vowel formants. Minimize rapid-fire syllable dense tracking, and save conversational or spoken-word elements purely for short intro or bridge moments."
  },
  "GRID_ELEC|Acousticness|TOO_LOW": {
    critique: "Your production presents an intensely sterile, digital footprint that lacks any organic texturing or analog-style acoustic warmth, drifting close to an experimental or industrial electronic category.",
    fix: "Introduce subtle analog warmth by running tracks through high-quality tape emulations, layer a warmly tracked acoustic bass beneath your synths, or blend in real mic recordings of organic textures behind your loops."
  },
  "GRID_ELEC|Acousticness|TOO_HIGH": {
    critique: "Your track relies too heavily on unprocessed, open acoustic instrumentation and un-quantized human transients, causing the system to index it as a traditional folk, indie, or singer-songwriter arrangement rather than a polished record.",
    fix: "Blend a solid, synthesized sub-bass layer beneath your acoustic guitars or pianos, execute pristine digital sample replacement on your live drums, and apply modern hard-tuned vocal pitch-correction software to slick out the organic footprint."
  },
  "GRID_ELEC|Instrumentalness|TOO_LOW": {
    critique: "The vocal presence is so relentlessly overwhelming that the mix lacks structural breathing room, or instrumental sections are completely masked by vocal clutter.",
    fix: "Incorporate distinct 2-to-4 bar instrumental turnarounds between sections, turn down your background vocal doubles during verses, or utilize sidechain ducking to allow your main synth or guitar lines to peak through when lines end."
  },
  "GRID_ELEC|Instrumentalness|TOO_HIGH": {
    critique: "Your vocal arrangement is taking too many breaks or sitting too far back behind the instruments. Mainstream formats require near-constant, commanding lyricism. Long instrumental gaps cause algorithms to treat it as background utility music.",
    fix: "Bring your lead vocal forward in the center channel mix, compress it aggressively to keep it sitting on top of the instrumentation, and condense your intro, bridge, or solo timelines to keep the vocal melody dominant."
  },
  "GRID_ELEC|Liveness|TOO_LOW": {
    critique: "The mix environment feels clinical or entirely computerized, completely lacking any natural air, ambient resonance, or organic spatial dimension.",
    fix: "Incorporate high-quality stereo room delays, use convolution reverbs that emulate small, high-end studio tracking rooms, or introduce subtle, organic field recordings or mic bleed into the background to make the space breathe."
  },
  "GRID_ELEC|Liveness|TOO_HIGH": {
    critique: "The engine detects heavy room bleed, uncontrolled low-frequency ambient rumble, or wide, out-of-phase reflections, giving the tracking an unpolished live venue or rehearsal space profile.",
    fix: "Tighten your vocal noise gates, dry out your tracking room with acoustic treatment, collapse your main sub-bass elements to a strict mono center channel, and swap out wide diffuse room reverbs for tightly controlled digital plate effects."
  },

  // HIGH_GAIN
  "HIGH_GAIN|Danceability|TOO_LOW": {
    critique: "The rhythmic momentum is dragging or over-complicated, failing to drive the steady physical head-nod required for heavy formats.",
    fix: "Lock your rhythm section to a driving, predictable pulse. Ensure the kick drum is perfectly aligned with the bass guitar's transient attacks to stabilize the foundational groove."
  },
  "HIGH_GAIN|Danceability|TOO_HIGH": {
    critique: "The drum grid is overly computerized or synchronized to a sterile club groove, completely stripping away the aggressive weight and human power of heavy rock.",
    fix: "Humanize your drum programming by shifting midi velocities and timing off the absolute grid. Use standard rock drumming patterns, avoiding synthetic hi-hat arrays or club sidechaining."
  },
  "HIGH_GAIN|Energy|TOO_LOW": {
    critique: "Your rhythm guitars and drums lack aggressive wall-of-sound intensity, sounding thin or distant.",
    fix: "Double-track or quad-track your rhythm guitars, panning them hard left and right. Saturate the mid-range frequencies, and use aggressive parallel compression on your drum room tracks."
  },
  "HIGH_GAIN|Energy|TOO_HIGH": {
    critique: "Severe clipping and master over-compression have choked the mix. The transients of your snare and kick are completely flattened, leaving no impact behind the drum hits.",
    fix: "Pull back on your master limiters. Group your distorted guitars onto a separate bus and compress them independently, allowing the drum transients to pierce through the dense wall cleanly."
  },
  "HIGH_GAIN|Valence|TOO_LOW": {
    critique: "The harmonic structures sound intensely dark or abrasive, moving past standard heavy tension into a completely dissonant, un-commercial category.",
    fix: "Infuse harmonic clarity by opening up the upper mid-range (2 kHz - 4 kHz) on your guitars. Introduce clean melodic vocal hooks or guitar harmonies using consonant pitch intervals."
  },
  "HIGH_GAIN|Valence|TOO_HIGH": {
    critique: "The chord selections sound overly cheerful or poppy, undermining the aggressive tone and serious mood of the genre.",
    fix: "Shift your chord structures toward minor scales or minor-key extensions. Lower the presence of high-frequency guitar sizzle and focus your mix on heavy, warm low-mid growl."
  },
  "HIGH_GAIN|Speechiness|TOO_LOW": {
    critique: "Aggressive vocal lines are completely buried behind the high-gain guitar layers, losing all transient punch and phonetic intelligibility.",
    fix: "Carve out a distinct frequency pocket in your rhythm guitar bus between 1 kHz and 3 kHz using a sidechained dynamic EQ that triggers whenever the lead vocal acts."
  },
  "HIGH_GAIN|Speechiness|TOO_HIGH": {
    critique: "Your vocal execution sounds too conversational or spoken, failing to match the raw, powerful, and driven vocal intensity expected of the genre.",
    fix: "Compress your vocals heavily to lock their dynamic range. Ensure the vocal performances rely on driven, saturated singing tones, screams, or deliberate vocal melodic contours."
  },
  "HIGH_GAIN|Acousticness|TOO_LOW": {
    critique: "The production features standard low acoustic parameters as expected, keeping the track centered on electric high-gain instrumentation.",
    fix: "Maintain your existing electric workflow. No adjustments required unless you intentionally want to pivot toward an acoustic rock style."
  },
  "HIGH_GAIN|Acousticness|TOO_HIGH": {
    critique: "Unprocessed acoustic instruments are undermining the aggressive electric aesthetic required for heavy rock formats.",
    fix: "Replace acoustic instruments with high-gain, overdriven electric guitars and distorted tube basses. Ensure live acoustic tracking runs through severe amp emulators or heavy parallel compression."
  },
  "HIGH_GAIN|Instrumentalness|TOO_LOW": {
    critique: "The performance lacks instrumental space, crowding the sonic field with non-stop vocal aggression without allowing riffs to breathe.",
    fix: "Create clear instrumental spaces or short riff windows between major vocal sections, allowing your guitar tones and drum transitions to drive the track."
  },
  "HIGH_GAIN|Instrumentalness|TOO_HIGH": {
    critique: "Long, meandering guitar solos or instrumental bridges are stalling the song's commercial rock momentum.",
    fix: "Condense instrumental solo timelines down to strict 4-to-8 bar windows. Ensure a vocal hook or powerful lyric anchors the track immediately before and after instrumental breaks."
  },
  "HIGH_GAIN|Liveness|TOO_LOW": {
    critique: "The mix environment feels overly dry, boxed-in, or completely synthesized, lacking the massive room sound characteristic of heavy formats.",
    fix: "Incorporate high-quality stereo room microphones or chamber reverbs on your drum groups to establish a spacious, authentic room profile."
  },
  "HIGH_GAIN|Liveness|TOO_HIGH": {
    critique: "Excessive room mic bleed or muddy phase correlation is causing your heavy guitars and drums to blur into an un-isolated garage profile.",
    fix: "Gate your close drum microphones tightly. Focus your wide ambient reverb treatments purely on separate FX sends, keeping your primary rhythm section locked in tight studio isolation."
  },

  // ORGANIC_TRAN
  "ORGANIC_TRAN|Danceability|TOO_LOW": {
    critique: "The timing is overly erratic or lacks a clear, foundational rhythmic anchor, making it difficult for the listener to track the underlying groove.",
    fix: "Record a rock-solid acoustic upright bass or acoustic guitar rhythm part to serve as the track's clock. Ensure all instruments anchor their accents on the primary downbeats."
  },
  "ORGANIC_TRAN|Danceability|TOO_HIGH": {
    critique: "The rhythm grid is artificially locked to a rigid, quantized computer grid, completely stripping away the natural, soulful human swing essential to organic genres.",
    fix: "Turn off all automatic digital quantization. Allow the musicians' natural timing micro-variations to breathe, preserving the organic push-and-pull interaction of a live rhythm section."
  },
  "ORGANIC_TRAN|Energy|TOO_LOW": {
    critique: "The instrumentation sounds thin, un-engaging, or completely lacks performance drive, reading as a flat bedroom demo.",
    fix: "Focus on performance velocity at the source. Use high-quality preamps to capture the physical wood and string resonance of your acoustic instruments, and apply gentle parallel compression."
  },
  "ORGANIC_TRAN|Energy|TOO_HIGH": {
    critique: "Over-compression has flattened the natural, expressive dynamic contours of your acoustic performance, turning wooden instruments into sterile, synthetic walls of sound.",
    fix: "Remove hard brick-wall limiters. Use transparent, slow-attack optical compressors to control wide volume spikes while preserving natural acoustic transient peaks."
  },
  "ORGANIC_TRAN|Valence|TOO_LOW": {
    critique: "The emotional delivery or chord structures feel completely dark, cold, or abrasive for an organic roots format.",
    fix: "Blend in warmer major chord extensions. Brighten up the acoustic space by using high-quality overhead condenser microphones to capture the natural sparkle of acoustic strings."
  },
  "ORGANIC_TRAN|Valence|TOO_HIGH": {
    critique: "The tracking sounds algorithmically hyper-cheerful, saccharine, or artificial, stripping away the soulful grit and emotional authenticity of the style.",
    fix: "Introduce minor chord variations or blue notes. Warm up the upper frequencies by rolling off cold digital treble above 12 kHz with a smooth shelving filter."
  },
  "ORGANIC_TRAN|Speechiness|TOO_LOW": {
    critique: "The storytelling or vocal message is buried beneath the instruments, losing lyrical presence and emotional clarity.",
    fix: "Boost the core presence frequencies of the human voice between 1.5 kHz and 4 kHz. Compress the vocal smoothly to ensure every syllable sits cleanly on top of the instrumentation."
  },
  "ORGANIC_TRAN|Speechiness|TOO_HIGH": {
    critique: "The vocal performance sounds completely un-melodic or overly speech-like, breaking the soulful, sung continuity expected of a musical arrangement.",
    fix: "Focus the vocal performance on smooth, connected phrasing and distinct pitch accuracy. Ensure melodic transitions and vocal stability guide the storytelling hooks."
  },
  "ORGANIC_TRAN|Acousticness|TOO_LOW": {
    critique: "The system detects an abundance of synthetic textures, digital MIDI programming, or severe processing, stripping away all organic authenticity.",
    fix: "Replace crystallized synth patches with authentic acoustic tracking (acoustic guitars, banjos, real piano, live strings). Prioritize microphone captures of real air moving in physical spaces."
  },
  "ORGANIC_TRAN|Acousticness|TOO_HIGH": {
    critique: "The acoustic tracking is completely raw, containing excessive hardware hiss, tuning errors, or unpolished imperfections that fall below commercial standards.",
    fix: "Execute careful manual pitch correction on vocal tracks, clean up string squeaks or background noises with spectral editing, and ensure premium mic placement."
  },
  "ORGANIC_TRAN|Instrumentalness|TOO_LOW": {
    critique: "The vocal lines run continuously without structural breaks, masking the intricate acoustic musicianship and instrumental solos typical of the style.",
    fix: "Introduce short 2-to-4 bar acoustic instrumental turnarounds or pick-up lines between verses to showcase the organic musicianship."
  },
  "ORGANIC_TRAN|Instrumentalness|TOO_HIGH": {
    critique: "Extended instrumental jam sections are overshadowing the central vocal performance, causing the track to index as background utility music.",
    fix: "Tighten the arrangement by restructuring instrument solos into focused, short turnarounds. Keep the primary vocal narrative driving the vast majority of the timeline."
  },
  "ORGANIC_TRAN|Liveness|TOO_LOW": {
    critique: "The mix space feels dry, computerized, or synthetically separated, lacking the natural room depth of musicians playing together.",
    fix: "Incorporate high-quality stereo ambient room mics or short convolution reverbs to simulate an authentic, shared acoustic room space."
  },
  "ORGANIC_TRAN|Liveness|TOO_HIGH": {
    critique: "Uncontrolled background room reflections, microphone bleed, or chaotic phase issues are muddying the mix.",
    fix: "Use directional cardioid microphones during tracking to isolate instruments. Utilize acoustic baffles to control room reflections, and rely on subtle convolution reverbs."
  },

  // WIDE_DYN
  "WIDE_DYN|Danceability|TOO_LOW": {
    critique: "Your track features zero rhythmic pulse as expected, establishing a fluid, cinematic soundscape without standard meter bounds.",
    fix: "No adjustment required; the fluid timeline matches your archetype's aesthetic profile perfectly."
  },
  "WIDE_DYN|Danceability|TOO_HIGH": {
    critique: "Your track features a driving, highly quantized percussive beat or rhythmic pop pulse that shatters the expansive, cinematic, or fluid atmosphere required for these formats.",
    fix: "Remove hard kick/snare loops. Rely on broad, sweeping melodic phrasing, evolving synth pads, or orchestral string swells to define time and movement fluidly."
  },
  "WIDE_DYN|Energy|TOO_LOW": {
    critique: "The soundstage sounds thin, completely empty, or lacks underlying harmonic support, failing to create an immersive landscape.",
    fix: "Layer deep sub-bass frequencies (<60 Hz), introduce rich orchestral warmth in the low-mids, or apply high-ratio parallel compression to low-level details."
  },
  "WIDE_DYN|Energy|TOO_HIGH": {
    critique: "Heavy compression has completely crushed the delicate dynamic range. The track sounds hyper-loud and fatiguing, which destroys the emotional breathing room vital to classical and ambient landscapes.",
    fix: "Remove master bus compressors and limiters entirely. Allow the music to flow naturally from delicate, quiet whispers to powerful, loud crescendos."
  },
  "WIDE_DYN|Valence|TOO_LOW": {
    critique: "The atmosphere reads as intensely abrasive or industrial, lacking the peaceful, melancholic beauty or majestic consonance expected.",
    fix: "Soften dissonant interval structures. Introduce major scale movements, smooth out harsh frequency spikes, and emphasize warm, resonant harmonic textures."
  },
  "WIDE_DYN|Valence|TOO_HIGH": {
    critique: "The arrangement sounds overly bright, childish, or artificial, losing its deep cinematic weight and artistic sophistication.",
    fix: "Lower the cutoff filters on high frequencies. Focus your arrangements on rich mid-range cello, viola, or warm, dark analog pad textures to ground the emotional mood."
  },
  "WIDE_DYN|Speechiness|TOO_LOW": {
    critique: "The arrangement contains minimal speech indices as expected, letting the musical textures command the primary sound field.",
    fix: "No adjustments needed; the pure instrumental/melodic architecture matches the design guidelines."
  },
  "WIDE_DYN|Speechiness|TOO_HIGH": {
    critique: "The inclusion of explicit spoken words or staccato speech patterns is breaking the immersive, instrumental flow of the arrangement.",
    fix: "Remove prominent spoken vocals. If vocals are utilized, transform them into abstract vocalises, long-tail choral harmonies, or heavily reverberated textural pads."
  },
  "WIDE_DYN|Acousticness|TOO_LOW": {
    critique: "The composition sounds entirely computer-generated and plastic, lacking the complex overtones and acoustic spatial depth required for orchestral or cinematic formats.",
    fix: "Integrate real, live instrument tracking or top-tier, round-robin orchestral sample libraries. Focus on capturing natural room microphone positions to preserve complex acoustic reflections."
  },
  "WIDE_DYN|Acousticness|TOO_HIGH": {
    critique: "The raw acoustic fields contain high environmental noise floors, digital clicks, or unpolished background bleed that compromises the pristine soundstage.",
    fix: "Apply surgical noise reduction to quiet passages. Ensure your gain staging is optimized to capture deep dynamics without tracking hardware hiss."
  },
  "WIDE_DYN|Instrumentalness|TOO_LOW": {
    critique: "Upfront, pop-style lyrical lead vocal tracking is pulling the composition out of its expansive instrumental framework.",
    fix: "Restructure the vocal tracking so it sits deeply embedded inside the mix as an ensemble texture, rather than a commanding center-panned narrative guide."
  },
  "WIDE_DYN|Instrumentalness|TOO_HIGH": {
    critique: "The track is completely instrumental as expected, maximizing soundstage depth and compositional focus.",
    fix: "No adjustment needed; your track successfully maintains its pure instrumental integrity."
  },
  "WIDE_DYN|Liveness|TOO_LOW": {
    critique: "The mix space feels entirely artificial, boxed-in, and dry, which chokes the natural acoustic size of the soundstage.",
    fix: "Apply expansive, highly diffuse algorithmic hall reverbs or long convolution spaces (3.0s - 5.0s decay times) to wrap the instrumentation in an immersive environment."
  },
  "WIDE_DYN|Liveness|TOO_HIGH": {
    critique: "The room signals feel completely uncontrolled, clashing with the precise clarity and high-fidelity isolation expected of a world-class production.",
    fix: "Control your ambient tails. Use directional mic configurations and tighten your room decay curves to ensure reflections support rather than muddy the arrangements."
  },

  // MID_GAIN
  "MID_GAIN|Danceability|TOO_LOW": {
    critique: "The rhythmic pocket feels dragging, overly complex, or disconnected, preventing alternative playlists from catching a steady, accessible groove.",
    fix: "Lock your bass player and drummer into a tight, unified pocket. Simplify intricate drum patterns, and prioritize a driving bassline to maintain forward momentum."
  },
  "MID_GAIN|Danceability|TOO_HIGH": {
    critique: "The rhythm tracking is presenting as a hyper-quantized pop or electronic dance record, completely stripping away the gritty, human band aesthetic essential to alternative rock.",
    fix: "Relax your digital quantization settings. Retain natural performance variations in the timing grid, and replace synthesized electronic drums with raw, acoustic drum tracking."
  },
  "MID_GAIN|Energy|TOO_LOW": {
    critique: "The guitars lack authority and the overall mix sounds thin, missing the driving, continuous mid-range power expected of an alternative production.",
    fix: "Saturate your mid-range frequencies between 400 Hz and 1.5 kHz. Apply parallel compression to your guitar busses, and use tape saturation plugins to glue the instrumentation."
  },
  "MID_GAIN|Energy|TOO_HIGH": {
    critique: "Excessive brick-wall master limiting has completely flattened your alternative production into an overdriven square wave, causing extreme listener fatigue.",
    fix: "Lower your final master limiter settings. Allow the natural dynamic variations between your verses and choruses to breathe, preserving transient impact when the full band drops in."
  },
  "MID_GAIN|Valence|TOO_LOW": {
    critique: "The harmonic structures sound completely dark, abrasive, or industrially cold, losing the classic bittersweet alternative mood.",
    fix: "Open up the upper frequencies on your guitars and vocals with a smooth high-shelf EQ. Blend in major chord movements or introduce melodic guitar counter-hooks to balance out moody basslines."
  },
  "MID_GAIN|Valence|TOO_HIGH": {
    critique: "The song reads algorithmically as overly bright, saccharine, or hyper-optimistic, stripping away the artistic edge and emotional nuance expected of alternative music.",
    fix: "Introduce minor chord variations or modal extensions. Focus your mixing choices on warm, gritty analog tones, avoiding pristine digital top-end sizzle."
  },
  "MID_GAIN|Speechiness|TOO_LOW": {
    critique: "The lead vocal performance is drowning inside a dense wall of guitars, losing all lyrical definition and emotional focus.",
    fix: "Use a dynamic equalizer to carve out a clean frequency pocket in your main guitar tracks around 2 kHz, sidechained directly to your lead vocal to create instantaneous clarity."
  },
  "MID_GAIN|Speechiness|TOO_HIGH": {
    critique: "The vocal tracking contains too many dry, conversational, or staccato spoken elements, breaking the melodic contour of the alternative rock framework.",
    fix: "Focus your vocal lines on continuous, emotionally driven sung phrasing. Smooth out rapid-fire syllable tracking, and utilize subtle chorus or delay modulations."
  },
  "MID_GAIN|Acousticness|TOO_LOW": {
    critique: "The production sounds entirely simulated, cold, or digital, completely lacking the organic band tracking or amp warmth required for the style.",
    fix: "Run your instruments through premium analog amp simulators or real tube hardware. Ensure the tracking features real acoustic drum shells and authentic electric guitar cabinets."
  },
  "MID_GAIN|Acousticness|TOO_HIGH": {
    critique: "Your track relies too heavily on raw, unprocessed acoustic guitars and un-quantized human grooves, causing the system to index it as folk or traditional country rather than alternative rock.",
    fix: "Introduce driving electric bass lines, layer processed electric guitars over your acoustic foundations, and use modern compression to sleek out the raw acoustic transients."
  },
  "MID_GAIN|Instrumentalness|TOO_LOW": {
    critique: "Relentless vocal tracking or excessive ad-lib layers are crowding the soundstage, choking the band's instrumental hooks.",
    fix: "Create distinct instrumental turnarounds between sections, allowing your guitar riffs or drum grooves to drive the track cleanly without vocal distractions."
  },
  "MID_GAIN|Instrumentalness|TOO_HIGH": {
    critique: "Extended instrumental transitions or long guitar solos are stalling your song's commercial rock momentum on alternative playlists.",
    fix: "Condense your instrumental solo segments down to strict 4-to-8 bar windows, ensuring your lead vocal performance remains the primary narrative guide."
  },
  "MID_GAIN|Liveness|TOO_LOW": {
    critique: "The mix space feels completely dry, clinical, or artificial, lacking the organic air and cohesive depth of a live band recording.",
    fix: "Incorporate high-quality room microphone tracking or convolution reverbs that emulate live tracking rooms, wrapping the entire band in a shared acoustic space."
  },
  "MID_GAIN|Liveness|TOO_HIGH": {
    critique: "Excessive room mic bleed or muddy phase correlation is causing your instruments to wash out into an unpolished garage profile.",
    fix: "Gate your live drum microphones more aggressively, collapse your low frequencies below 100 Hz to strict mono, and use controlled studio delays instead of open, diffuse reverbs."
  },

  // GROOVE_DYN
  "GROOVE_DYN|Danceability|TOO_LOW": {
    critique: "The groove feels stiff, mechanical, or completely rigid, missing the essential fluid, human swing and syncopation required for R&B.",
    fix: "Adjust your quantization settings to incorporate classic MPC-style rhythmic swing (54% - 58%). Introduce subtle micro-timing delays to your hi-hats and snares to create a relaxed, soulful pocket."
  },
  "GROOVE_DYN|Danceability|TOO_HIGH": {
    critique: "The rhythmic pace has stepped into an intense, hyper-quantized club groove, completely overriding the sensual, vocal-led R&B framework.",
    fix: "Pull back on hard driving club drum patterns. Focus your rhythm section on soulful, syncopated kick/snare arrangements that leave plenty of open space for the bass and vocals."
  },
  "GROOVE_DYN|Energy|TOO_LOW": {
    critique: "The rhythm tracking sounds thin, lacking the rich low-end weight and professional warmth required for competitive streaming playlists.",
    fix: "Apply multi-band compression to your low-end instrument groups. Boost the sub-bass frequencies (40 Hz - 80 Hz) and use parallel compression on your drums to add weight and punch."
  },
  "GROOVE_DYN|Energy|TOO_HIGH": {
    critique: "Extreme brick-wall master limiting has completely crushed your mix, stripping away the deep, warm low-end dynamics and transient breathing room essential to R&B.",
    fix: "Back off your final limiters and lower your master bus compression ratios. Allow your low-end synth bass and kicks to retain their natural, round dynamic expansion."
  },
  "GROOVE_DYN|Valence|TOO_LOW": {
    critique: "The emotional delivery or harmonic structures read as overly cold, abrasive, or dark for a smooth R&B profile.",
    fix: "Open up the upper-mid frequencies (3 kHz - 6 kHz) on your vocals and keyboard tracks. Introduce lush, consonant major-seventh or minor-ninth chord extensions and layer rich vocal harmony stacks."
  },
  "GROOVE_DYN|Valence|TOO_HIGH": {
    critique: "The mix reads algorithmically as hyper-cheerful or piercingly bright, stripping away the smooth, intimate, and sophisticated mood of the genre.",
    fix: "Smooth down harsh high frequencies on your synths and vocals with a gentle de-esser. Focus your mix on deep, warm low-mid tones (200 Hz - 500 Hz) to anchor a mature, intimate vibe."
  },
  "GROOVE_DYN|Speechiness|TOO_LOW": {
    critique: "Your vocal tracking is getting buried inside the instrument loops, losing its direct, upfront presence and intimate clarity.",
    fix: "Apply assertive compression to your lead vocal track to lock its dynamic range, and use high-shelf saturation to give the consonants distinct clarity."
  },
  "GROOVE_DYN|Speechiness|TOO_HIGH": {
    critique: "The vocal delivery contains too many rapid, conversational staccato spoken elements, pushing the track into a rap or spoken-word profile.",
    fix: "Pivot your vocal tracking toward longer, sustained, and highly melodic sung vowel formants, ensuring your choruses feature smooth, soaring hooks."
  },
  "GROOVE_DYN|Acousticness|TOO_LOW": {
    critique: "The production sounds intensely robotic, sterile, or digital, completely lacking any organic warmth or soul.",
    fix: "Introduce organic textures by tracking a real electric bass, layering real electric piano chords (like a Fender Rhodes), or running digital instruments through analog tape emulations."
  },
  "GROOVE_DYN|Acousticness|TOO_HIGH": {
    critique: "The track relies too heavily on raw, unprocessed acoustic instruments, causing the system to index it as folk or traditional roots music rather than R&B.",
    fix: "Blend a solid, synthesized sub-bass layer beneath your live tracking, execute clean digital sample replacement on your drums, and apply modern pitch correction to slick out your vocal tracking."
  },
  "GROOVE_DYN|Instrumentalness|TOO_LOW": {
    critique: "Vocal layers completely crowd the groove, leaving no breathing room for rhythmic or bass instrument interplay.",
    fix: "Simplify your background vocal arrangements and muting ad-libs over specialized bass or synth hooks to let the groove take center stage."
  },
  "GROOVE_DYN|Instrumentalness|TOO_HIGH": {
    critique: "Extended instrumental loops or long solo sections are stalling the song's commercial momentum on vocal-centric R&B playlists.",
    fix: "Condense instrumental windows and ensure a commanding lead vocal track or rich backing harmony stack drives the vast majority of the song's timeline."
  },
  "GROOVE_DYN|Liveness|TOO_LOW": {
    critique: "The mix environment lacks spatial dimension or ambient depth, sounding completely boxed-in or clinical.",
    fix: "Incorporate high-quality stereo micro-delays and warm algorithmic plate reverbs to expand the soundstage image seamlessly."
  },
  "GROOVE_DYN|Liveness|TOO_HIGH": {
    critique: "The engine detects heavy room bleed or wide out-of-phase reflections, giving the mix an unpolished live venue profile rather than an expensive, intimate studio finish.",
    fix: "Collapse your sub-bass elements to strict mono, use tight noise gates on your vocal mics, and swap out open room reverbs for silky digital plate or pristine stereo delay effects."
  }
};

export const VECTOR_TARGETS: Record<string, { pitch: string; timbre: string; loudness: string }> = {
  "Pop": {
    pitch: "Ultra-Quantized: Perfectly locked to the 12-semitone chromatic grid via pitch-correction software. Zero microtonal drift.",
    timbre: "Prismatic & Synthetic: Heavy energy saturation in high-frequency \"air\" (>8 kHz) and deep synthesized sub-bass (<60 Hz).",
    loudness: "Brick-Walled & Square: Immediate, instantaneous transient attacks followed by highly compressed, flat volume plateaus."
  },
  "Rap / Hip-Hop": {
    pitch: "Monotonous & Speech-Driven: Flat, speech-like vocal pitch lines; instrumental sub-bass (808s) locked to rigid, heavy root pitches.",
    timbre: "Percussive-Heavy: Massive energy spikes in coefficients tracking sharp transient noise (electronic snares, claps, hi-hats).",
    loudness: "Gated & Punchy: Aggressive percussive transients with rapid, gated volume drops between hits; highly limited overall mix."
  },
  "Rock": {
    pitch: "Harmonically Dense: Natural human pitch variance and vocal vibrato; intricate multi-note electric guitar chord overtones.",
    timbre: "Mid-Range Saturated: Dense energy concentration between 200 Hz and 2 kHz driven by overdriven guitar tubes and live drum shells.",
    loudness: "Continuous Wall: Smashed peak-to-average micro-ratios; constant, unrelenting volume curves due to high harmonic distortion."
  },
  "Alternative": {
    pitch: "Fluid & Volatile: High expressive pitch variance, uncorrected vocal tracking, raw pitch sweeps, and intricate modal chord shapes.",
    timbre: "Textured & Open: Wide, variable mid-range with dynamic high-frequency room reflections from live tracking spaces.",
    loudness: "Highly Dynamic: Broad micro-variance; completely preserves expressive room crescendos, sudden drops, and un-smashed drum peaks."
  },
  "Dance / Electronic": {
    pitch: "Mathematically Absolute: Pure synthetic oscillators locked flawlessly to pitch centers with looping, unshifting harmonic sequences.",
    timbre: "Pristine Waveforms: Pure digital harmonic distributions (sine, square, sawtooth waves); highly predictable spectral envelopes.",
    loudness: "Rigidly Repetitive: Fixed percussive volume intervals (e.g., 4/4 grid precision) with extreme sidechain-induced rhythmic pumping curves."
  },
  "R&B": {
    pitch: "Active Melisma: Complex, highly volatile vocal runs; frequent use of sophisticated jazz-adjacent extended chords (7ths, 9ths).",
    timbre: "Velvety & Warm: Heavy low-mid weight (250 Hz - 500 Hz); ultra-smooth vocal formants with rounded electronic bass.",
    loudness: "Soft & Rounded: Gentle transient slopes; polished, moderate compression that pushes vocals forward without flattening their impact."
  },
  "Country": {
    pitch: "Horizontal Glides: Continuous pitch-sliding mechanics (pedal steel guitar, vocal twang); traditional diatonic pitch geometry.",
    timbre: "Organic & Woody: High acoustic resonance; energy clusters around the upper-mids from banjos, fiddles, and acoustic guitars.",
    loudness: "Breathing & Linear: Open micro-dynamics; sharp initial picking transient spikes followed by long, natural exponential room decays."
  },
  "Latin": {
    pitch: "Melodically Syncopated: Highly melodic, repeating vocal hooks; brass and lead patterns tracking specific, clean scale keys.",
    timbre: "Crisp & Rhythmic: Dominated by sharp hand-percussion transients (congas, bongos, timbales) and mid-forward classical strings.",
    loudness: "Pulsing Cadence: Highly syncopated macro-groove; distinct rhythmic volume surges locked directly to a repeating loop (e.g., Dembow)."
  },
  "Jazz": {
    pitch: "Chromatic & Complex: Volatile chromatic tracking; constant modal shifting, passing tones, and improvised micro-pitch jumps.",
    timbre: "Dark & Non-Linear: Deep, warm horn profiles, acoustic upright bass acoustic resonance, and organic live cymbal brush textures.",
    loudness: "Completely Raw: Massive peak-to-average micro-ratios; preserves the organic, uncompressed playing velocity of human touch."
  },
  "Blues": {
    pitch: "Microtonal Drift: Centered around \"blue notes\"—intentional pitch variations drifting smoothly between minor and major intervals.",
    timbre: "Gritty & Harmonic: Tube-saturated electric guitar transients paired with raw, mid-focused, throat-centered vocal textures.",
    loudness: "Soulful Acceleration: Expressive micro-envelopes; individual notes strike with high initial velocity and taper out organically."
  },
  "Classical": {
    pitch: "Ensemble Fluidity: Sweep-driven orchestra pitch movements; continuous collective vibrato and dynamic harmonic modulations.",
    timbre: "Pure Resonance: Fully acoustic soundstage; complex organic orchestral overtones across a highly diffuse stereo field.",
    loudness: "Extreme Range: Slices show a vast gap between delicate, whispering pianissimo segments and explosive fortissimo peaks."
  },
  "World Music": {
    pitch: "Non-Western Scaling: Heavily dependent on microtonal interval subdivisions, regional ragas, and non-diatonic pitch centers.",
    timbre: "Exotic Signatures: Unique transient and spectral textures generated by regional folk instruments and localized acoustic percussion.",
    loudness: "Groove Foundations: Intense rhythmic syncopation; sharp percussive envelope shapes built over un-quantized human grooves."
  }
};

export function getSubgenreProfile(genreName: string, subgenreName: string): SubgenreProfile {
  let gKey = (genreName || "").toLowerCase().trim();
  const sKey = (subgenreName || "").toLowerCase().trim();

  // Normalize genre names to match spreadsheet categories
  if (gKey.includes("rock") || gKey.includes("alternative")) {
    // If the input is exactly "rock" or "rock & alternative", the keys in profiles look for either
    // rock|... or alternative|... since they are separate main branches.
    // Let's keep raw matching but perform fallback
  }

  // 1. Direct match with format "genre|subgenre"
  const directKey = `${gKey}|${sKey}`;
  if (SUBGENRE_PROFILES[directKey]) {
    return SUBGENRE_PROFILES[directKey];
  }

  // 2. Try matching by subgenre key only (highly robust fallback)
  for (const key of Object.keys(SUBGENRE_PROFILES)) {
    const parts = key.split("|");
    if (parts[1] === sKey) {
      return SUBGENRE_PROFILES[key];
    }
  }

  // 3. Loose search
  for (const key of Object.keys(SUBGENRE_PROFILES)) {
    const parts = key.split("|");
    if (sKey.includes(parts[1]) || parts[1].includes(sKey)) {
      return SUBGENRE_PROFILES[key];
    }
  }

  // 3.5. Main-genre-level fallback - if we know the broad genre but not the specific subgenre,
  // use a representative default for that genre rather than falling all the way to pop.
  const GENRE_DEFAULT_PROFILE: Record<string, string> = {
    "rock": "rock|heritage rock / mainstream rock",
    "alternative": "alternative|alternative",
    "r&b": "r&b|contemporary r&b / urban adult contemporary",
    "country": "country|country airplay",
    "latin": "latin|latin rhythm",
    "jazz": "jazz|smooth jazz",
    "blues": "blues|electric blues / chicago blues",
    "classical": "classical|traditional classical",
    "world music": "world music|k-pop / world digital song sales",
    "hip hop": "hip hop|trap / mainstream hip-hop",
    "hip-hop": "hip hop|trap / mainstream hip-hop",
    "rap": "hip hop|trap / mainstream hip-hop",
    "trap": "hip hop|trap / mainstream hip-hop",
    "electronic": "electronic|edm / dance",
    "edm": "electronic|edm / dance",
    "dance": "electronic|edm / dance",
    "house": "electronic|edm / dance",
    "techno": "electronic|edm / dance",
    "dubstep": "electronic|edm / dance",
  };
  for (const [genreWord, defaultKey] of Object.entries(GENRE_DEFAULT_PROFILE)) {
    if (gKey.includes(genreWord) && SUBGENRE_PROFILES[defaultKey]) {
      return SUBGENRE_PROFILES[defaultKey];
    }
  }

  // 4. Default fallback pop top 40 (only reached if genre itself is unrecognized)
  return SUBGENRE_PROFILES["pop|mainstream top 40"];
}

export function getVectorTargets(genre: string) {
  const norm = (genre || "").trim();
  
  // Try matching directly
  if (VECTOR_TARGETS[norm]) {
    return VECTOR_TARGETS[norm];
  }

  // Matching by containment
  for (const key of Object.keys(VECTOR_TARGETS)) {
    if (norm.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(norm.toLowerCase())) {
      return VECTOR_TARGETS[key];
    }
  }

  return VECTOR_TARGETS["Pop"];
}

export function getCritiqueAndFix(archetype: string, metric: string, condition: "TOO_LOW" | "TOO_HIGH") {
  const key = `${archetype}|${metric}|${condition}`;
  return CRITIQUE_FIX_MAP[key] || null;
}
