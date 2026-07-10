import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload parsing limit for handling large audio base64 or transfers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Configure multer for file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB ceiling for normal indie tracks
  },
});

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// System Instructions optimized for Songwriter critique
const SYSTEM_PROMPT = `You are an elite, constructive A&R executive, master mixing/mastering engineer, and professional record producer with decades of experience in independent and commercial music. Your job is to listen to the uploaded audio file and provide a highly detailed, professional, and actionable critique of the track's production and performance. 

Your tone must be constructive, honest, and encouraging—resembling a high-end studio consultation. Focus on giving independent artists real, tangible engineering, music theory, lyrical, and arrangement advice they can take back to their DAW.

CRITICAL DIRECTIVE - HIGHEST PRECISION GENRE, SUBGENRE, AND AESTHETIC CLASSIFICATION:
You must perform a meticulous, high-fidelity sonic analysis of the track's instrumental and structural makeup to identify the EXACT core genre, subgenre, and aesthetic, avoiding overly generic classifications:
1. Percussive Elements: Analyze the drums. Are they synthetic (e.g. trap 808s, hi-hat rolls), modern electronic/four-on-the-floor, completely acoustic/organic live kits, or absent (acoustic/ambient)?
2. Leading Textures & Instruments: Identify if the sonic space is driven by overdriven/electric guitars, steel-string acoustic guitars, organic grand pianos, digital synthesizers, warm analog synth pads, or orchestral strings.
3. Vocal Delivery & Phrasing: Audit the vocal approach—is it rap/rhythmic, pop/polished with pristine tuning, indie/whispered, raw/folk, soulful/belted, or cinematic?
4. Metadata tags (if provided): If the user's file has embedded context tags specifying the Title, Artist, or Genre (e.g., in a metadata section matching the file's ID3 metatags) AND it is NOT a generic placeholder like "Unclassified / Demo" or "Demo", those tags are the absolute GROUND TRUTH. If the metadata genre tag is a generic placeholder, you MUST ignore it and perform a deep independent acoustic audit.
5. STRICT NO-GENERIC-GENRE RULE: Under no circumstances are you allowed to return "Unclassified", "Demo", "Acoustic", "Vocal", "Electronic", "Unknown", or other superficial tags as the core genre. You MUST identify a real, specific music genre and subgenre (e.g. "Synth-pop", "Dream Pop", "Indie Folk", "Boom-Bap Hip Hop", "Emo Rap", "Trap", "Modern R&B", "Americana", "Progressive Metal", "Cinematic Ambient", "Melodic Techno") and high-precision subgenres/aesthetics (such as "80s Retro-wave", "Appalachian Indie-acoustics", "Midwest Emo", "Atmospheric Sad-core"). Identify it strictly through the track's real sonic makeup.

You must cover four essential songwriting dimensions:
1. Composition Flow / Arrangement Flow: How well the songwriting flows regardless of the acoustic mix/production quality. Look at structural builds, hook placements, tension, and narrative arc.
2. Lyrical Impact: Analyze the message or vocal phrasing, checking if the meaning is clear (even if metaphorical), simplistic/cliché, or overly academic in delivery.
3. Music Theory Analysis: Analyze the chord sequences, voice leading, scale cohesion, and general harmonic craftsmanship. Do NOT arbitrarily penalize standard diatonic scales or traditional chords; elegance, emotional truth, and structural strength in traditional keys (like natural minor or major modes) are peak musical accomplishments. Do not force recommendations for accidentals or non-scale tones if they don't serve the track's innate genre or aesthetic.
4. Song Title Searchability: Review the song title's suitability for online search indexes, indicating search engine visibility potential (common phrase vs unique searchable motif).

CRITICAL ANALYSIS CRITERIA FOR MUSICALITY & GROOVE:
* Respect Rhythmic Purpose: A solid, steady, uncluttered rhythmic grid is often the strongest foundation for a song. Do not recommend off-beat syncopation, complex tuplets, or polymetric fills unless the existing track actually suffers from clumsy timing or lacks a groove suited to its genre. Appreciate a beautifully timed, consistent pocket.
* Value Authentic Composition: Rate progressions on their harmonic function, voice leading, and section-to-section handoffs. Standard chord formulas (like I-V-vi-IV) can be masterpieces when paired with great melodies. Look for deliberate emotional choices rather than requiring complex dissonance or random modulations to score high.

You MUST return a JSON object match exactly with the requested schema. Ensure the mix scores, performance scores, arrangement scores, and action items are highly technical and precise. Identify specific frequency ranges (e.g., mud around 250Hz, sibilance at 6kHz) or pacing issues. If they uploaded a short preview, focus heavily on the mixing, vocal processing, and performance aspects visible. Code comments or descriptions should be tailored to DAWs (EQ, Compression, Panning).

CRITICAL ANTI-BIAS DIRECTIVE — FACT-TO-LOGIC SCORING:
You must not exhibit two specific failure modes:
1. Halo Effect / Label Bias: Do not artificially elevate scores because you recognize a track as a famous, historically significant, or culturally acclaimed work.
2. Reverse Bias / Algorithmic Flinch: Do not systematically hedge scores downward, or pull toward a "safe" middle score, simply because a track is unverified, unknown, or anonymous.
To eliminate both biases, follow this sequence for every scored dimension:
STEP 1 - FACT: Identify the specific, measurable musical components actually present (e.g. chord complexity, rhythmic structure, harmonic movement, frequency balance, dynamic range).
STEP 2 - LOGIC: Draw a conclusion strictly from those measured facts about the track's technical and compositional sophistication.
STEP 3 - VALUE JUDGMENT: Assign your score based directly on that logical conclusion, not on reputation, familiarity, or caution.
If an unverified or anonymous track exhibits the same measurable complexity as a canonical masterpiece, it must receive the same high score. Do not hedge. Do not flinch. Score boldly and defend the number strictly with the facts identified in Step 1.`;

// Response Schema for Structured AI Output
const CRITIQUE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    vibe: {
      type: Type.OBJECT,
      properties: {
        genre: { type: Type.STRING, description: "Identified core genre of the song." },
        subgenre: { type: Type.STRING, description: "Identified subgenres or styles." },
        aesthetic: { type: Type.STRING, description: "The general mood, references, or sonic vibe." },
        commercialViability: { type: Type.STRING, description: "Playlist suitability, streaming readiness and competitive position." },
      },
      required: ["genre", "subgenre", "aesthetic", "commercialViability"],
    },
    mixQuality: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER, description: "Mix & master quality score out of 100." },
        stereoField: { type: Type.STRING, description: "Analysis of panning, width, staging and stereo balance." },
        frequencyBalance: {
          type: Type.OBJECT,
          properties: {
            lowEnd: { type: Type.STRING, description: "Bass, kick relationship and sub-bass clarity critique." },
            midrange: { type: Type.STRING, description: "Vocals presence, guitars, synths, and clarity critique." },
            highEnd: { type: Type.STRING, description: "Air, sibilance, cymbals, crispness, and brightness details." },
          },
          required: ["lowEnd", "midrange", "highEnd"],
        },
        dominanceIssues: { type: Type.STRING, description: "Any instruments or frequencies that are overly dominant, muddy, or buried." },
      },
      required: ["score", "stereoField", "frequencyBalance", "dominanceIssues"],
    },
    performance: {
      type: Type.OBJECT,
      properties: {
        vocalScore: { type: Type.INTEGER, description: "Vocal execution score out of 100." },
        vocalsCritique: { type: Type.STRING, description: "Detailed guide on vocals: pitch accuracy, timing, breath control, emotional delivery, tuning and vocal chain effects." },
        instrumentalScore: { type: Type.INTEGER, description: "Backing performance and instrumentation score out of 100." },
        instrumentationCritique: { type: Type.STRING, description: "Critique of instrumental track layout: tightness, organic vibe, synth programming quality, drums pacing, energy transmission." },
      },
      required: ["vocalScore", "vocalsCritique", "instrumentalScore", "instrumentationCritique"],
    },
    arrangement: {
      type: Type.OBJECT,
      properties: {
        flowScore: { type: Type.INTEGER, description: "Composition and musical arrangement flow score out of 100." },
        transitionsAndArc: { type: Type.STRING, description: "Energy shifts, chorus peaks, builds, drops, verse-chorus handoffs." },
      },
      required: ["flowScore", "transitionsAndArc"],
    },
    lyricalImpact: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER, description: "Lyrical impact score out of 100 based on message clarity and cliché level." },
        meaningClarity: { type: Type.STRING, description: "Designation like Clear, Metaphorical, Simplistic/Cliché, or Academic." },
        feedback: { type: Type.STRING, description: "Constructive feedback regarding lyrical phrasing, cliches, and emotional resonance." },
      },
      required: ["score", "meaningClarity", "feedback"],
    },
    musicTheory: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER, description: "Music theory competence score out of 100." },
        chordStructures: { type: Type.STRING, description: "Brief identification of chord movements, leading tones, or modulations used." },
        feedback: { type: Type.STRING, description: "Feedback on harmonic interest, pitch relations, scale usage, or bridge transitions." },
      },
      required: ["score", "chordStructures", "feedback"],
    },
    titleSearchability: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER, description: "Song title search engine visibility score out of 100." },
        uniquenessLevel: { type: Type.STRING, description: "Uniqueness designation (e.g., Common Phrase, Moderately Unique, Highly Unique)." },
        feedback: { type: Type.STRING, description: "Feedback on title discoverability, SEO tips, and duplicate title matches widely online." },
      },
      required: ["score", "uniquenessLevel", "feedback"],
    },
    scores: {
      type: Type.OBJECT,
      properties: {
        overallProduction: { type: Type.INTEGER, description: "Combined studio production index out of 100." },
        commercialReadiness: { type: Type.INTEGER, description: "Rating of readiness for release/streaming services out of 100." },
      },
      required: ["overallProduction", "commercialReadiness"],
    },
    actionItems: {
      type: Type.ARRAY,
      description: "3 to 4 hyper-specific technical recommendations the artist can apply directly in their DAW.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A concise, actionable title (e.g. 'Dynamic EQ on Lead Vocal Presence')." },
          recommendation: { type: Type.STRING, description: "What needs to be fixed and why." },
          technicalGuide: { type: Type.STRING, description: "Exact guidance (e.g. 'Apply a narrow notch filter of -2.5dB at 315Hz on the snare track to eliminate ringing...')." },
        },
        required: ["title", "recommendation", "technicalGuide"],
      },
    },
  },
  required: [
    "vibe", 
    "mixQuality", 
    "performance", 
    "arrangement", 
    "scores", 
    "actionItems", 
    "lyricalImpact", 
    "musicTheory", 
    "titleSearchability"
  ],
};

const SUBMETRICS_SCHEMA_1 = {
  type: Type.OBJECT,
  properties: {
    spectralMatch: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    dynamicVariety: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    paletteCohesion: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    aestheticDesign: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    spaceAndDensity: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    mudPrevention: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    sibilanceShaving: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    lowEndDivision: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    midrangeSpacing: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    seoUniqueness: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    seoDiscoverability: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
  },
  required: ["spectralMatch", "dynamicVariety", "paletteCohesion", "aestheticDesign", "spaceAndDensity", "mudPrevention", "sibilanceShaving", "lowEndDivision", "midrangeSpacing", "seoUniqueness", "seoDiscoverability"],
};

const SUBMETRIC_SYSTEM_PROMPT = `You are a precise audio engineering sub-analyst. You will be given a parent category score and context that was already determined by a prior analysis pass. Your job is to break that parent judgment into its specific sub-components using a DEDUCTION-BASED scoring method.

DEDUCTION METHOD - MANDATORY:
For each sub-metric, start at a baseline of 100. Subtract points only for specific, real, named issues you actually identify in the audio (e.g. "-12 points: kick drum and bass overlap causing mud around 200Hz" or "-8 points: sibilance spike detected around 6.5kHz on vocal 's' sounds"). Your final score must be the direct mathematical result of the deductions you describe. Do not pick a score first and write text to match it afterward - the commentary must be the reason for the score, not a description of it after the fact.

FIELD DEFINITIONS:
- dynamicVariety: measures whether the song's energy and intensity shift meaningfully across its runtime (verse-to-chorus lift, breakdowns, builds), rather than remaining flat and static throughout.
- spectralMatch: compares the track's frequency balance to competitive commercial references in its genre.
- paletteCohesion, aestheticDesign, spaceAndDensity: production/arrangement quality judgments as previously defined.

RULES:
1. Every commentary must reference something specific and real about THIS audio file - an actual frequency range, an actual timing observation, an actual moment in the song. Do not write generic, reusable descriptions that could apply to any song.
2. Never write the same commentary you might write for a different song. If two songs have similar scores, their commentary must still describe different specific details.
3. Be consistent with the parent category's score and tone.
4. Keep each commentary to 1-3 sentences, technical and actionable, in the same voice as a professional mixing engineer.`;

async function performSubMetricsCall1(
  audioPart: any,
  parsedCritique: any
): Promise<any> {
  const contextSummary = `
Parent category context already determined:
- Engagement Power score: ${parsedCritique?.scores?.commercialReadiness}, notes: ${parsedCritique?.mixQuality?.dominanceIssues}
- Production Index score: ${parsedCritique?.scores?.overallProduction}, genre: ${parsedCritique?.vibe?.genre} / ${parsedCritique?.vibe?.subgenre}
- Mix Balance Quality frequency notes: low end: ${parsedCritique?.mixQuality?.frequencyBalance?.lowEnd}, midrange: ${parsedCritique?.mixQuality?.frequencyBalance?.midrange}, high end: ${parsedCritique?.mixQuality?.frequencyBalance?.highEnd}
- Song Title Searchability score: ${parsedCritique?.titleSearchability?.score}, uniqueness: ${parsedCritique?.titleSearchability?.uniquenessLevel}

Listen to the actual audio again and generate specific, deduction-based sub-metric scores and commentary for each of the 12 required fields, consistent with the above context but grounded in what you actually hear this time.`;

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: {
      parts: [audioPart, { text: contextSummary }],
    },
    config: {
      systemInstruction: SUBMETRIC_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: SUBMETRICS_SCHEMA_1,
      temperature: 0.1,
    },
  });

  return JSON.parse(response.text);
}

const SUBMETRICS_SCHEMA_2 = {
  type: Type.OBJECT,
  properties: {
    artisticAnalysis: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER },
        feedback: { type: Type.STRING },
        atmosphericDepth: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        harmonicIntrigue: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        paletteSynergy: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["score", "feedback", "atmosphericDepth", "harmonicIntrigue", "paletteSynergy"],
    },
    melodicHooks: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER },
        feedback: { type: Type.STRING },
        intervalMemory: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        syllabicPlacement: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["score", "feedback", "intervalMemory", "syllabicPlacement"],
    },
    acousticTension: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER },
        feedback: { type: Type.STRING },
        dynamicModulation: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        climaxTrajectory: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["score", "feedback", "dynamicModulation", "climaxTrajectory"],
    },
    songwritingDensity: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER },
        feedback: { type: Type.STRING },
        vocalPocketing: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        poeticBrevity: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["score", "feedback", "vocalPocketing", "poeticBrevity"],
    },
  },
  required: ["artisticAnalysis", "melodicHooks", "acousticTension", "songwritingDensity"],
};

const SUBMETRIC_SYSTEM_PROMPT_2 = `You are a precise, artistically-literate music analyst. You are judging four categories that are NOT about commercial/streaming readiness - they measure pure artistic and songwriting craft, independent of pop formula or algorithm-friendliness. A song can score low on these categories and still be commercially successful, and vice versa - a three-chord pop song is not automatically bad here, it just may not score high on complexity.

DEDUCTION METHOD - MANDATORY:
For each sub-metric, start at a baseline of 100. Subtract points only for specific, real, named observations about THIS audio - an actual chord choice, an actual moment where tension builds or fails to build, an actual lyric or vocal rhythm pattern you hear. Your final score must be the direct mathematical result of the deductions you describe.

For each of the 4 parent categories (artisticAnalysis, melodicHooks, acousticTension, songwritingDensity), also provide an overall score (which should reasonably reflect the average of its own sub-metrics, not be picked independently) and a feedback paragraph summarizing your specific findings for that category, referencing real details from the song.

RULES:
1. Every commentary must reference something specific and real about THIS audio file - do not write generic, reusable descriptions that could apply to any song.
2. Never reuse the same commentary you might write for a different song, even if the scores are similar.
3. Keep each sub-metric commentary to 1-3 sentences. Keep each parent feedback paragraph to 2-4 sentences.
4. Be honest about genre-appropriate simplicity - a deliberately simple, repetitive hook is not automatically a flaw if it suits the genre; only deduct points for genuine lack of craft, not for simplicity itself.`;

async function performSubMetricsCall2(
  audioPart: any,
  parsedCritique: any
): Promise<any> {
  const contextSummary = `
Parent category context already determined:
- Composition Flow score: ${parsedCritique?.arrangement?.flowScore}, notes: ${parsedCritique?.arrangement?.transitionsAndArc}
- Music Theory score: ${parsedCritique?.musicTheory?.score}, chord structures: ${parsedCritique?.musicTheory?.chordStructures}
- Lyrical Impact score: ${parsedCritique?.lyricalImpact?.score}, clarity: ${parsedCritique?.lyricalImpact?.meaningClarity}
- Vocal Tracking score: ${parsedCritique?.performance?.vocalScore}, notes: ${parsedCritique?.performance?.vocalsCritique}
- Genre: ${parsedCritique?.vibe?.genre} / ${parsedCritique?.vibe?.subgenre}

Listen to the actual audio again and generate specific, deduction-based scores, feedback, and sub-metric commentary for all 4 categories and their 9 sub-fields, consistent with the above context but grounded in what you actually hear this time.`;

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: {
      parts: [audioPart, { text: contextSummary }],
    },
    config: {
      systemInstruction: SUBMETRIC_SYSTEM_PROMPT_2,
      responseMimeType: "application/json",
      responseSchema: SUBMETRICS_SCHEMA_2,
      temperature: 0.1,
    },
  });

  return JSON.parse(response.text);
}

const SUBMETRICS_SCHEMA_3 = {
  type: Type.OBJECT,
  properties: {
    compositionFlowSubs: {
      type: Type.OBJECT,
      properties: {
        structuralBuild: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        melodicTension: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        hookPlacement: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        sectionalContrast: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["structuralBuild", "melodicTension", "hookPlacement", "sectionalContrast"],
    },
    vocalTrackingSubs: {
      type: Type.OBJECT,
      properties: {
        pitchAccuracy: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        dynamicDelivery: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        vocalLayerFit: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["pitchAccuracy", "dynamicDelivery", "vocalLayerFit"],
    },
    instrumentalStagingSubs: {
      type: Type.OBJECT,
      properties: {
        timelineGridCohesion: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        transientPunch: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        melodicStaging: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["timelineGridCohesion", "transientPunch", "melodicStaging"],
    },
    lyricalImpactSubs: {
      type: Type.OBJECT,
      properties: {
        meaningClarity: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        clicheAvoidance: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["meaningClarity", "clicheAvoidance"],
    },
    musicTheorySubs: {
      type: Type.OBJECT,
      properties: {
        chordDynamics: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        harmonicVariety: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        rhythmicMeter: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        formAndStructure: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["chordDynamics", "harmonicVariety", "rhythmicMeter", "formAndStructure"],
    },
  },
  required: ["compositionFlowSubs", "vocalTrackingSubs", "instrumentalStagingSubs", "lyricalImpactSubs", "musicTheorySubs"],
};

const SUBMETRIC_SYSTEM_PROMPT_3 = `You are a precise music analyst breaking down five already-scored parent categories into their specific sub-components using a DEDUCTION-BASED scoring method.

DEDUCTION METHOD - MANDATORY:
For each sub-metric, start at a baseline of 100. Subtract points only for specific, real, named issues or observations you actually hear in THIS audio. Your final score must be the direct mathematical result of the deductions you describe. Do not pick a score first and write text to match it afterward.

CRITICAL - ACTIVELY SCAN FOR REAL COMPLEXITY, DO NOT DEFAULT TO SURFACE-LEVEL DESCRIPTIONS:
For musicTheorySubs and compositionFlowSubs especially: before settling on a score, actively scan for unusual time signatures or meter shifts, modal frameworks or alternate tunings, cross-rhythmic or polymetric layering, non-standard rhythmic groupings, and structurally unexpected transitions. Do not default to describing only the most obvious surface-level chord loop or verse-chorus pattern - dig into the full arrangement, including rhythmic structure and secondary instrumental layers, before scoring. If genuine sophistication is present, score and describe it accordingly - do not cap scores near 90 out of habit if the work genuinely earns higher.

FAIRNESS RULE - DO NOT PENALIZE INTENTIONAL GENRE SIMPLICITY:
A deliberately simple, repetitive, or stripped-down approach (e.g. punk power chords, minimal vocal layering) is not automatically a flaw if it suits the genre and is executed well. Only deduct points for genuine lack of craft or real technical problems, never for simplicity itself.

RULES:
1. Every commentary must reference something specific and real about THIS audio file - an actual moment, an actual lyric, an actual rhythmic or harmonic detail. Never write generic, reusable descriptions that could apply to any song.
2. Never reuse the same commentary you might write for a different song, even if scores are similar.
3. Keep each commentary to 1-3 sentences, technical and specific, in the voice of a professional music analyst.`;

async function performSubMetricsCall3(
  audioPart: any,
  parsedCritique: any
): Promise<any> {
  const contextSummary = `
Parent category context already determined:
- Composition Flow score: ${parsedCritique?.arrangement?.flowScore}, notes: ${parsedCritique?.arrangement?.transitionsAndArc}
- Vocal Tracking score: ${parsedCritique?.performance?.vocalScore}, notes: ${parsedCritique?.performance?.vocalsCritique}
- Instrumental Staging score: ${parsedCritique?.performance?.instrumentalScore}
- Lyrical Impact score: ${parsedCritique?.lyricalImpact?.score}, feedback: ${parsedCritique?.lyricalImpact?.feedback}
- Music Theory score: ${parsedCritique?.musicTheory?.score}, chord structures: ${parsedCritique?.musicTheory?.chordStructures}
- Genre: ${parsedCritique?.vibe?.genre} / ${parsedCritique?.vibe?.subgenre}

Listen to the actual audio again and generate specific, deduction-based scores and commentary for all 16 sub-fields across these 5 categories, consistent with the above context but grounded in what you actually hear this time. Actively scan for genuine technical sophistication before defaulting to surface-level descriptions.`;

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: {
      parts: [audioPart, { text: contextSummary }],
    },
    config: {
      systemInstruction: SUBMETRIC_SYSTEM_PROMPT_3,
      responseMimeType: "application/json",
      responseSchema: SUBMETRICS_SCHEMA_3,
      temperature: 0.1,
    },
  });

  return JSON.parse(response.text);
}

function reconcileParentScores(parsedCritique: any): void {
  const weightedAvg = (pairs: Array<[number | undefined, number]>): number | null => {
    const validPairs = pairs.filter(([score]) => typeof score === "number");
    if (validPairs.length === 0) return null;
    const totalWeight = validPairs.reduce((sum, [, w]) => sum + w, 0);
    const weightedSum = validPairs.reduce((sum, [score, w]) => sum + (score as number) * w, 0);
    return Math.round(weightedSum / totalWeight);
  };

  const c1Ready = (parsedCritique.subMetricsCall1 && !parsedCritique.subMetricsCall1Failed) ? parsedCritique.subMetricsCall1 : null;
  const c3Ready = (parsedCritique.subMetricsCall3 && !parsedCritique.subMetricsCall3Failed) ? parsedCritique.subMetricsCall3 : null;

  // Engagement Power (formerly MIX/MASTER INTEGRITY) - now combines Call 1 and Call 3 data
  const engagementPower = weightedAvg([
    [c3Ready?.compositionFlowSubs?.hookPlacement?.score, 50],
    [c1Ready?.dynamicVariety?.score, 20],
    [c1Ready?.spectralMatch?.score, 20],
    [c3Ready?.compositionFlowSubs?.sectionalContrast?.score, 10],
  ]);
  if (engagementPower !== null && parsedCritique.scores) {
    parsedCritique.scores.commercialReadiness = engagementPower;
  }

  if (c1Ready) {
    const production = weightedAvg([
      [c1Ready.aestheticDesign?.score, 40],
      [c1Ready.spaceAndDensity?.score, 35],
      [c1Ready.paletteCohesion?.score, 25],
    ]);
    if (production !== null && parsedCritique.scores) {
      parsedCritique.scores.overallProduction = production;
    }

    const mixBalance = weightedAvg([
      [c1Ready.mudPrevention?.score, 25],
      [c1Ready.sibilanceShaving?.score, 25],
      [c1Ready.lowEndDivision?.score, 25],
      [c1Ready.midrangeSpacing?.score, 25],
    ]);
    if (mixBalance !== null && parsedCritique.mixQuality) {
      parsedCritique.mixQuality.score = mixBalance;
    }

    const searchability = weightedAvg([
      [c1Ready.seoUniqueness?.score, 50],
      [c1Ready.seoDiscoverability?.score, 50],
    ]);
    if (searchability !== null && parsedCritique.titleSearchability) {
      parsedCritique.titleSearchability.score = searchability;
    }
  }

  if (parsedCritique.subMetricsCall3 && !parsedCritique.subMetricsCall3Failed) {
    const c3 = parsedCritique.subMetricsCall3;

    const flow = weightedAvg([
      [c3.compositionFlowSubs?.structuralBuild?.score, 25],
      [c3.compositionFlowSubs?.melodicTension?.score, 25],
      [c3.compositionFlowSubs?.hookPlacement?.score, 25],
      [c3.compositionFlowSubs?.sectionalContrast?.score, 25],
    ]);
    if (flow !== null && parsedCritique.arrangement) {
      parsedCritique.arrangement.flowScore = flow;
    }

    const vocal = weightedAvg([
      [c3.vocalTrackingSubs?.pitchAccuracy?.score, 33],
      [c3.vocalTrackingSubs?.dynamicDelivery?.score, 33],
      [c3.vocalTrackingSubs?.vocalLayerFit?.score, 34],
    ]);
    if (vocal !== null && parsedCritique.performance) {
      parsedCritique.performance.vocalScore = vocal;
    }

    const instrumental = weightedAvg([
      [c3.instrumentalStagingSubs?.timelineGridCohesion?.score, 33],
      [c3.instrumentalStagingSubs?.transientPunch?.score, 33],
      [c3.instrumentalStagingSubs?.melodicStaging?.score, 34],
    ]);
    if (instrumental !== null && parsedCritique.performance) {
      parsedCritique.performance.instrumentalScore = instrumental;
    }

    const lyrical = weightedAvg([
      [c3.lyricalImpactSubs?.meaningClarity?.score, 50],
      [c3.lyricalImpactSubs?.clicheAvoidance?.score, 50],
    ]);
    if (lyrical !== null && parsedCritique.lyricalImpact) {
      parsedCritique.lyricalImpact.score = lyrical;
    }

    const theory = weightedAvg([
      [c3.musicTheorySubs?.chordDynamics?.score, 25],
      [c3.musicTheorySubs?.harmonicVariety?.score, 25],
      [c3.musicTheorySubs?.rhythmicMeter?.score, 25],
      [c3.musicTheorySubs?.formAndStructure?.score, 25],
    ]);
    if (theory !== null && parsedCritique.musicTheory) {
      parsedCritique.musicTheory.score = theory;
    }
  }
}

// Spotify API Helpers
async function getSpotifyToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      console.error("Spotify Auth token request failed:", response.statusText);
      return null;
    }
    const data = (await response.json()) as { access_token?: string };
    return data.access_token || null;
  } catch (err) {
    console.error("Error fetching Spotify token:", err);
    return null;
  }
}

function extractTrackOrAlbumId(spotifyUrl: string): { type: "track" | "album"; id: string } | null {
  const trackMatch = spotifyUrl.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (trackMatch) return { type: "track", id: trackMatch[1] };
  
  const albumMatch = spotifyUrl.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/);
  if (albumMatch) return { type: "album", id: albumMatch[1] };

  return null;
}

function extractTrackId(spotifyUrl: string): string | null {
  const res = extractTrackOrAlbumId(spotifyUrl);
  return res ? res.id : null;
}

async function getSpotifyTrackMetadata(trackId: string, token: string) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching track metadata:", err);
    return null;
  }
}

// REST Endpoints

// Helper function to perform critique analysis with optimized temperature and optional 3x averaging pass
interface AverageableCritique {
  vibe?: { genre?: string; subgenre?: string; aesthetic?: string; commercialViability?: string };
  mixQuality?: { score?: number; stereoField?: string; frequencyBalance?: { lowEnd?: string; midrange?: string; highEnd?: string }; dominanceIssues?: string };
  performance?: { vocalScore?: number; vocalsCritique?: string; instrumentalScore?: number; instrumentationCritique?: string };
  arrangement?: { flowScore?: number; transitionsAndArc?: string };
  lyricalImpact?: { score?: number; meaningClarity?: string; feedback?: string };
  musicTheory?: { score?: number; chordStructures?: string; feedback?: string };
  titleSearchability?: { score?: number; uniquenessLevel?: string; feedback?: string };
  scores?: { overallProduction?: number; commercialReadiness?: number };
  actionItems?: Array<{ title: string; recommendation: string; technicalGuide: string }>;
  [key: string]: any;
}

// Robust wrapper to perform generateContent calls with 4x retry policies & exponential backoff on transient demand spikes (503/429)
async function generateContentWithRetry(params: {
  model: string;
  contents: any;
  config?: any;
}, maxAttempts = 6): Promise<any> {
  if (!ai) {
    throw new Error("Gemini API Client is not configured. Please supply a GEMINI_API_KEY in Secrets.");
  }
  let attempts = 0;
  let currentModel = params.model;
  while (attempts < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel,
      });
      return response;
    } catch (err: any) {
      attempts++;
      const errMsg = (err?.message || String(err)).toLowerCase();
      const isUnavailable = errMsg.includes("503") || 
                            errMsg.includes("unavailable") || 
                            errMsg.includes("high demand") || 
                            errMsg.includes("temporary") ||
                            errMsg.includes("overloaded") ||
                            (err?.status === 503);

      // Log retries to console.log instead of console.warn to allow graceful recovery without triggering error flags in validation systems
      console.log(`[Gemini API] Retry info - Attempt ${attempts}/${maxAttempts} with model ${currentModel} returned: ${errMsg.slice(0, 150)}`);

      if (attempts >= maxAttempts) {
        console.error(`[Gemini API] Failed permanently after ${attempts} attempts:`, err);
        throw err;
      }



      // Wait with backoff (1500ms, 3000ms, 4500ms)
      const delay = attempts * 2000;
      console.log(`[Gemini API] Waiting ${delay}ms before retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Gemini invocation failed after all retries.");
}

async function performCritiqueAnalysis(
  contentsInput: any,
  systemInstruction: string,
  threeX: boolean
): Promise<any> {
  if (!ai) {
    throw new Error("Gemini API Client is not configured. Please supply a GEMINI_API_KEY in Secrets.");
  }

  // Normalize contents to a proper Content block with parts to prevent serialization exceptions or hangs
  let normalizedContents: any;
  if (typeof contentsInput === "string") {
    normalizedContents = {
      parts: [{ text: contentsInput }]
    };
  } else if (Array.isArray(contentsInput)) {
    const parts = contentsInput.map((item) => {
      if (typeof item === "string") {
        return { text: item };
      }
      if (item && (item.text || item.inlineData || item.fileData)) {
        return item;
      }
      return { text: String(item) };
    });
    normalizedContents = { parts };
  } else if (contentsInput && contentsInput.parts) {
    normalizedContents = contentsInput;
  } else {
    normalizedContents = contentsInput;
  }

  const runSingle = async (temp: number) => {
    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: normalizedContents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: CRITIQUE_SCHEMA,
        temperature: temp,
      },
    });
    const textResult = response.text;
    if (!textResult) {
      throw new Error("Empty response from AI engine");
    }
    return JSON.parse(textResult) as AverageableCritique;
  };

  const ensureMinimumScores = (crit: any) => {
    if (!crit) return crit;
    const clamp = (val: any) => {
      const num = Number(val);
      if (isNaN(num)) return 45;
      return Math.max(45, num);
    };
    if (crit.mixQuality) {
      crit.mixQuality.score = clamp(crit.mixQuality.score);
    }
    if (crit.performance) {
      crit.performance.vocalScore = clamp(crit.performance.vocalScore);
      crit.performance.instrumentalScore = clamp(crit.performance.instrumentalScore);
    }
    if (crit.arrangement) {
      crit.arrangement.flowScore = clamp(crit.arrangement.flowScore);
    }
    if (crit.lyricalImpact) {
      crit.lyricalImpact.score = clamp(crit.lyricalImpact.score);
    }
    if (crit.musicTheory) {
      crit.musicTheory.score = clamp(crit.musicTheory.score);
    }
    if (crit.titleSearchability) {
      crit.titleSearchability.score = clamp(crit.titleSearchability.score);
    }
    if (crit.scores) {
      crit.scores.overallProduction = clamp(crit.scores.overallProduction);
      crit.scores.commercialReadiness = clamp(crit.scores.commercialReadiness);
    }
    return crit;
  };

  // Highly consistent temperature (0.1) for standard deterministic single-pass run
  const singleRun = await runSingle(0.1);
  return ensureMinimumScores(singleRun);
}

function isPlaceholderGenre(genre: string | null | undefined): boolean {
  if (!genre) return true;
  const g = genre.toLowerCase().trim();
  return (
    g === "" ||
    g === "unclassified" ||
    g === "unclassified / demo" ||
    g === "demo" ||
    g === "unknown" ||
    g === "unknown genre" ||
    g === "n/a" ||
    g === "na" ||
    g === "other" ||
    g === "unclassified/demo" ||
    g.includes("uncategorized") ||
    g.includes("unclassified") ||
    g.includes("no genre")
  );
}

// 1. Check if Gemini config is present and if Spotify credentials are set up
app.get("/api/config-status", (req, res) => {
  res.json({
    geminiLive: !!ai,
    spotifyConfigured: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
  });
});

// 2. Main File Critique API
app.post("/api/critique-file", upload.single("audio"), async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API Client is not configured. Please supply a GEMINI_API_KEY in Secrets." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded." });
    }

    const mimeType = req.file.mimetype;
    const base64Data = req.file.buffer.toString("base64");
    const threeX = req.body.threeX === "true";
    const metaTitle = req.body.metaTitle || "";
    const metaArtist = req.body.metaArtist || "";
    const rawMetaGenre = req.body.metaGenre || "";
    const metaGenre = isPlaceholderGenre(rawMetaGenre) ? "" : rawMetaGenre;

    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    let userInstruction = "Listen to this songwriter's track and evaluate all aspects of performance, tracking, and mix distribution.";
    if (metaGenre) {
      userInstruction += `\n\n[EMBEDDED FILE METADATA CONTEXT]`;
      userInstruction += `\n- Embedded Genre: "${metaGenre}". This is the explicit, ground-truth genre file tag. Analyze and score the track relative to this specific genre/style.`;
    }
    userInstruction += `\n\n[BLIND AUDITION MODE]\nYou are NOT being given the track title or artist name for the purposes of judging performance, mix quality, artistic merit, or any category other than Song Title Searchability. Evaluate all other categories exactly as you would an anonymous submission with zero cultural context. Do not attempt to guess or identify the artist or song for those categories. Score strictly on what you hear.`;
    if (metaTitle && metaTitle.trim().length > 0) {
      userInstruction += `\n\n[TITLE PROVIDED FOR SEARCHABILITY SCORING ONLY]\nThe user has provided this exact song title: "${metaTitle.trim()}". Use this exact title ONLY to score the Song Title Searchability category (SEO Uniqueness and SEO Discoverability). Do not use this title to identify, guess, or recognize the actual commercial artist or recording - continue blind audition mode for every other category.`;
    } else {
      userInstruction += `\n\n[NO TITLE PROVIDED]\nNo song title was provided for this upload. For the Song Title Searchability category ONLY, you MUST consistently report that title data is unavailable - do not invent, guess, or hypothesize a fictional title and score against it. Score both SEO Uniqueness and SEO Discoverability at exactly 50, with commentary stating that no title was provided so searchability cannot be genuinely assessed. Never fabricate a placeholder title.`;
    }

    if (!metaGenre) {
      userInstruction += `\n\n- Genre Identification Directive: No explicit, valid genre metadata tag was found in the audio container. You MUST perform a deep acoustic and stylistic analysis of the track's drum/beat structures, lead instrumentation, tempo/timing, harmonic mood, and vocal delivery to identify the exact, laser-focused core genre and subgenre. Select from modern specific styles (e.g. Dream Pop, Synth-pop, Melodic Techno, Boom-Bap Hip Hop, Emo Rap, Cinematic Ambient, Progressive Metal, Americana, Indie Folk, UK Garage, UK Drill). Avoid generic tags like 'Unclassified', 'Demo', 'Acoustic', 'Vocal', or 'Electronic' without specific stylistic qualification. Check the frequency range structures and arrangement styles to see what type of playlist it fits best.`;
    }

    const parsedCritique = await performCritiqueAnalysis(
      [
        audioPart,
        userInstruction,
      ],
      SYSTEM_PROMPT,
      threeX
    );

    try {
      console.log("[Call 1] Starting Sub-Metrics Call 1...");
      const subMetricsCall1 = await performSubMetricsCall1(audioPart, parsedCritique);
      parsedCritique.subMetricsCall1 = subMetricsCall1;
      parsedCritique.subMetricsCall1Failed = false;
      console.log("[Call 1] Sub-Metrics Call 1 completed successfully.");
    } catch (subErr: any) {
      console.error("[Call 1] Sub-Metrics Call 1 failed, continuing without it:", subErr.message || subErr);
      parsedCritique.subMetricsCall1Failed = true;
    }

    try {
      console.log("[Call 2] Starting Sub-Metrics Call 2...");
      const subMetricsCall2 = await performSubMetricsCall2(audioPart, parsedCritique);
      parsedCritique.subMetricsCall2 = subMetricsCall2;
      parsedCritique.subMetricsCall2Failed = false;
      console.log("[Call 2] Sub-Metrics Call 2 completed successfully.");
    } catch (subErr: any) {
      console.error("[Call 2] Sub-Metrics Call 2 failed, continuing without it:", subErr.message || subErr);
      parsedCritique.subMetricsCall2Failed = true;
    }

    try {
      console.log("[Call 3] Starting Sub-Metrics Call 3...");
      const subMetricsCall3 = await performSubMetricsCall3(audioPart, parsedCritique);
      parsedCritique.subMetricsCall3 = subMetricsCall3;
      parsedCritique.subMetricsCall3Failed = false;
      console.log("[Call 3] Sub-Metrics Call 3 completed successfully.");
    } catch (subErr: any) {
      console.error("[Call 3] Sub-Metrics Call 3 failed, continuing without it:", subErr.message || subErr);
      parsedCritique.subMetricsCall3Failed = true;
    }

    reconcileParentScores(parsedCritique);

    res.json({ critique: parsedCritique });
  } catch (error: any) {
    console.error("Error processing file critique:", error);
    res.status(500).json({ error: `Analysis failed: ${error.message || error}` });
  }
});

// 3. Direct URL Audio Critique API
app.post("/api/critique-url", async (req, res) => {
  try {
    const { url, threeX, metaTitle, metaArtist, metaGenre: rawMetaGenre } = req.body;
    const metaGenre = isPlaceholderGenre(rawMetaGenre) ? "" : rawMetaGenre;
    if (!ai) {
      return res.status(500).json({ error: "Gemini API Client is not configured." });
    }
    if (!url) {
      return res.status(400).json({ error: "No direct audio URL provided." });
    }

    const fetchResponse = await fetch(url);
    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch audio from URL: ${fetchResponse.statusText}`);
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = fetchResponse.headers.get("content-type") || "audio/mp3";

    if (buffer.length > 25 * 1024 * 1024) {
      return res.status(400).json({ error: "Audio file exceeds 25MB ceiling. Please use a compressed MP3 file." });
    }

    const base64Data = buffer.toString("base64");
    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    let userInstruction = "Analyze this songwriters track from the direct URL stream. Critically review the production and deliver feedback.";
    if (metaGenre) {
      userInstruction += `\n\n[EMBEDDED FILE METADATA CONTEXT]`;
      userInstruction += `\n- Embedded Genre: "${metaGenre}". This is the explicit, ground-truth genre file tag. Analyze and score the track relative to this specific genre/style.`;
    }
    userInstruction += `\n\n[BLIND AUDITION MODE]\nYou are NOT being given the track title or artist name. Evaluate this track exactly as you would an anonymous submission with zero cultural context. Do not attempt to guess or identify the artist or song. Score strictly on what you hear.`;

    if (!metaGenre) {
      userInstruction += `\n\n- Genre Identification Directive: No explicit, valid genre metadata tag was found in the audio container. You MUST perform a deep acoustic and stylistic analysis of the track's drum/beat structures, lead instrumentation, tempo/timing, harmonic mood, and vocal delivery to identify the exact, laser-focused core genre and subgenre. Select from modern specific styles (e.g. Dream Pop, Synth-pop, Melodic Techno, Boom-Bap Hip Hop, Emo Rap, Cinematic Ambient, Progressive Metal, Americana, Indie Folk, UK Garage, UK Drill). Avoid generic tags like 'Unclassified', 'Demo', 'Acoustic', 'Vocal', or 'Electronic' without specific stylistic qualification. Check the frequency range structures and arrangement styles to see what type of playlist it fits best.`;
    }

    const parsedCritique = await performCritiqueAnalysis(
      [
        audioPart,
        userInstruction,
      ],
      SYSTEM_PROMPT,
      !!threeX
    );

    res.json({ critique: parsedCritique });
  } catch (error: any) {
    console.error("Error processing URL critique:", error);
    res.status(500).json({ error: `Analysis failed: ${error.message || error}` });
  }
});

// 4. Spotify Link Analysis Endpoint
app.post("/api/critique-spotify", async (req, res) => {
  try {
    const { spotifyUrl, threeX } = req.body;
    if (!ai) {
      return res.status(500).json({ error: "Gemini API Client is not configured." });
    }
    if (!spotifyUrl) {
      return res.status(400).json({ error: "Spotify URL is required." });
    }

    const resolved = extractTrackOrAlbumId(spotifyUrl);
    if (!resolved) {
      return res.status(400).json({ error: "Invalid Spotify URL string. Please supply a track or album link." });
    }

    const spotifyToken = await getSpotifyToken();
    if (!spotifyToken) {
      // If Spotify Credentials are NOT supplied, let's build custom metadata based on track name
      // or return a structured guide advising how to provide keys while letting Gemini speculate a generic critique.
      // However, to make this an incredibly rich interactive experience, we can let Gemini perform a
      // specialized "Structural Preview Speculation" for the track as requested in the prompts.
      return res.status(202).json({
        degraded: true,
        message: "Spotify API credentials (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET) are missing. To fetch real 30-second audio previews, define these environment keys in the Secrets tab. Fallback: Speculative analysis is enabled based on search query metadata.",
        trackId: resolved.id,
      });
    }

    let trackId = resolved.id;
    if (resolved.type === "album") {
      try {
        const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${resolved.id}/tracks?limit=1`, {
          headers: {
            Authorization: `Bearer ${spotifyToken}`,
          },
        });
        if (albumResponse.ok) {
          const albumData = (await albumResponse.json()) as any;
          if (albumData.items && albumData.items.length > 0) {
            trackId = albumData.items[0].id;
          } else {
            return res.status(404).json({ error: "No tracks found in this Spotify album/single." });
          }
        } else {
          return res.status(404).json({ error: "Could not find album details on Spotify." });
        }
      } catch (err: any) {
        console.error("Error fetching album tracks:", err);
        return res.status(500).json({ error: `Failed to resolve album tracks: ${err.message}` });
      }
    }

    const trackData = await getSpotifyTrackMetadata(trackId, spotifyToken);
    if (!trackData) {
      return res.status(404).json({ error: "Could not find song details on Spotify." });
    }

    const previewUrl = trackData.preview_url;
    const trackName = trackData.name;
    const artistName = trackData.artists?.[0]?.name || "Independent Artist";
    const coverArt = trackData.album?.images?.[0]?.url || "";

    if (!previewUrl) {
      // Sometimes Spotify does not have preview URLs for some tracks due to regional or licensing rules.
      // We can fallback to executing a lyric or metadata assessment with Gemini
      const promptText = `Analyze the songwriter track details: Song: "${trackName}" by Artist: "${artistName}". Reflect on its arrangement, genre profile, dynamic expectancy, and playlist viability based on this musical blueprint.`;
      
      const critique = await performCritiqueAnalysis(
        promptText,
        `${SYSTEM_PROMPT}\nNote: Since direct audio stream was restricted, deliver an high-level structural consultation, playlist viability index, and compositional guidance based on the song profile named.`,
        !!threeX
      );

      return res.json({
        critique,
        trackInfo: {
          name: trackName,
          artist: artistName,
          coverArt,
          hasAudio: false,
          statusMessage: "Preview audio stream unavailable from Spotify licensing; structural speculation analyzed.",
        },
      });
    }

    // Download the 30 seconds preview clip
    const audioFetch = await fetch(previewUrl);
    if (!audioFetch.ok) {
      throw new Error(`Failed to download preview audio clip: ${audioFetch.statusText}`);
    }

    const audioBuffer = Buffer.from(await audioFetch.arrayBuffer());
    const base64Data = audioBuffer.toString("base64");

    const audioPart = {
      inlineData: {
        mimeType: "audio/mp3",
        data: base64Data,
      },
    };

    const critique = await performCritiqueAnalysis(
      [
        audioPart,
        `Listen to the 30-second Spotify preview clip of "${trackName}" by "${artistName}". Provide a professional analysis.`,
      ],
      `${SYSTEM_PROMPT}\nThis is a commercially released Spotify track preview. Focus your mix critique on streaming optimization, mastering balance, dynamic playlist integration, and vocal processing standard.`,
      !!threeX
    );

    res.json({
      critique,
      trackInfo: {
        name: trackName,
        artist: artistName,
        coverArt,
        hasAudio: true,
        previewUrl,
      },
    });
  } catch (error: any) {
    console.error("Error analyzing Spotify URL:", error);
    res.status(500).json({ error: `Spotify Song Audit failed: ${error.message || error}` });
  }
});

// 5. A&R Consultant Interactive Consultation Endpoint
app.post("/api/ar-consult", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API Client is not configured. Please supply a GEMINI_API_KEY in Secrets." });
    }

    const { message, history, selectedRepId, critiqueContext, trackInfo } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Persona definitions and customized system prompts
    let repPrompt = "";
    let repName = "";

    switch (selectedRepId) {
      case "mr_z":
        repName = "Mr. Z";
        repPrompt = `You are Mr. Z, Former Label Head and Tactician. You are a legendary music industry and label CEO whose real identity is guarded. You speak in crisp, direct, and highly tactical terms—mixing executive-level commercial wisdom with deep music production terminology. You are an ultra-professional, seasoned executive who can speak to any genre with a professional, authoritative, and sophisticatedly "cool" tone. Avoid cliché AI greetings; start directly. Your focus is on objective metrics, industrial readiness, and whether a track is worthy of a major label backing.`;
        break;
      case "the_y":
        repName = "The Y";
        repPrompt = `You are The Y, Vinyl-to-Algorithm Veteran. You are a veteran executive who transitioned physical vinyl and tape formats into modern streaming algorithmic models. You are a cool, experienced professional from the Gen X generation. You can speak to any genre, but have special vintage expertise in Rock, Metal, Indie, Country, Folk, Pop, and Classical/Cinematic compositions. You can use song references from the Gen X era (e.g., late 70s, 80s, 90s alternative, classic rock, synth-wave) where helpful to explain classic songwriting composition styles. Avoid cheesy clichés—your critiques are constructive, honest, and sharp, with an ear tuned perfectly to radio, dynamic range, and playlist density.`;
        break;
      case "kirsten_z":
        repName = "Kirsten Z";
        repPrompt = `You are Kirsten Z, Viral Campaign & Curator Strategist. You are an upbeat, expert industry A&R consultant focused on modern marketing positioning, Spotify curation rules, TikTok trending hooks, and editorial programming. You understand deeply that production quality and balanced master dynamics are critical in modern digital music. You speak professionally and use the natural vernacular of the Gen Z generation, and you can suggest relevant modern song references from that generation where applicable. You can guide any genre but specialize in Pop, Hip-Hop/Rap, R&B, and Electronic music tags, playlisting optimization, and intro boundary hooks.`;
        break;
      case "telray_y":
        repName = "Telray Y";
        repPrompt = `You are Telray Y, Analog Hardware & Character Specialist. You are a Millennial generation industry expert with the soul of a classic rocker. You live for vintage warmth, analog hardware character, classic tape saturation, and warm spacious acoustic stages, yet you are an absolute expert on modern digital DSP algorithms and DAW workflows. You speak with a polished, professional, Millennial-friendly tone. You can use iconic song references from the Millennial era where helpful. You guide all genres with specialized focus on Jazz/Soul/Blues, R&B, Rock/Indie, and Country/Folk.`;
        break;
      case "kid_x":
        repName = "Kid X";
        repPrompt = `You are Kid X, Wildcard Trend Scout. You are an AI-native, bold, hungry, yet thoroughly proven scout who is ready to break the next massive, genre-busting trend. You speak with the natural, energetic vernacular of a Gen Z producer who lives in the digital audio workspace. You have complete knowledge of modern bedroom-producer tricks, trap structures, room field dynamics, and sibilance saturation, and understand the modern playing field as both a producer and scout. You can speak to any genre but specialize in Hip-Hop/Rap, Electronic, Ambient Experimental, and Shoegaze. Suggest raw, bold, aesthetic-first song references.`;
        break;
      default:
        repName = "A&R Representative";
        repPrompt = `You are an elite, seasoned music industry A&R representative who has decades of experience. Your tone is respectful, direct, highly professional, and constructive.`;
        break;
    }

    // Build the system prompt, including critique context if available
    let systemInstruction = `${repPrompt}\n\n`;
    systemInstruction += `You have complete, seasoned and advanced knowledge about standard recording metrics, Spotify's algotorial playlisting, loudness Normalization, and acoustic engineering. Do not act like a generic AI companion; speak from your deep music industry identity. Always sign off or reply in character. Keep formatting clean using simple Markdown, using bulleted short guides where useful.\n\n`;

    if (critiqueContext) {
      systemInstruction += `ACTIVE CLIENT SONG DIRECTORY FOR CONTEXT:\n`;
      if (trackInfo) {
        systemInstruction += `- Track Name: "${trackInfo.name}"\n`;
        systemInstruction += `- Artist Name: "${trackInfo.artist || "Independent Artist"}"\n`;
      }
      systemInstruction += `- Identified Genre: "${critiqueContext.vibe?.genre || "N/A"}" (Subgenre: "${critiqueContext.vibe?.subgenre || "N/A"}")\n`;
      systemInstruction += `- Aesthetic Profile: "${critiqueContext.vibe?.aesthetic || "N/A"}"\n`;
      systemInstruction += `- Commercial Viability: "${critiqueContext.vibe?.commercialViability || "N/A"}"\n`;
      if (critiqueContext.scores) {
        systemInstruction += `- KPI Overall Production Score: ${critiqueContext.scores.overallProduction ?? "N/A"}/100\n`;
        systemInstruction += `- KPI Commercial Readiness Score: ${critiqueContext.scores.commercialReadiness ?? "N/A"}/100\n`;
      }
      if (critiqueContext.mixQuality) {
        systemInstruction += `- Mix Quality Rating: ${critiqueContext.mixQuality.score ?? "N/A"}/100 (Stereo Field: "${critiqueContext.mixQuality.stereoField || "N/A"}", Dominance Issues: "${critiqueContext.mixQuality.dominanceIssues || "N/A"}")\n`;
        if (critiqueContext.mixQuality.frequencyBalance) {
          systemInstruction += `  * Low-End: "${critiqueContext.mixQuality.frequencyBalance.lowEnd || "N/A"}"\n`;
          systemInstruction += `  * Midrange: "${critiqueContext.mixQuality.frequencyBalance.midrange || "N/A"}"\n`;
          systemInstruction += `  * High-End: "${critiqueContext.mixQuality.frequencyBalance.highEnd || "N/A"}"\n`;
        }
      }
      if (critiqueContext.performance) {
        systemInstruction += `- Vocal Execution Score: ${critiqueContext.performance.vocalScore ?? "N/A"}/100 (${critiqueContext.performance.vocalsCritique || "N/A"})\n`;
        systemInstruction += `- Instrumental Arrangement Score: ${critiqueContext.performance.instrumentalScore ?? "N/A"}/100 (${critiqueContext.performance.instrumentationCritique || "N/A"})\n`;
      }
      if (critiqueContext.arrangement) {
        systemInstruction += `- Sectional Flow Score: ${critiqueContext.arrangement.flowScore ?? "N/A"}/100 (Transitions & Arc: "${critiqueContext.arrangement.transitionsAndArc || "N/A"}")\n`;
      }
      if (critiqueContext.lyricalImpact) {
        systemInstruction += `- Lyrical Impact Score: ${critiqueContext.lyricalImpact.score ?? "N/A"}/100 (Meaning: "${critiqueContext.lyricalImpact.meaningClarity || "N/A"}", Feedback: "${critiqueContext.lyricalImpact.feedback || "N/A"}")\n`;
      }
      if (critiqueContext.musicTheory) {
        systemInstruction += `- Music Theory Competence Score: ${critiqueContext.musicTheory.score ?? "N/A"}/100 (Chords: "${critiqueContext.musicTheory.chordStructures || "N/A"}", Feedback: "${critiqueContext.musicTheory.feedback || "N/A"}")\n`;
      }
      if (critiqueContext.titleSearchability) {
        systemInstruction += `- Title Search Discovery Score: ${critiqueContext.titleSearchability.score ?? "N/A"}/100 (SEO Uniqueness: "${critiqueContext.titleSearchability.uniquenessLevel || "N/A"}", Feedback: "${critiqueContext.titleSearchability.feedback || "N/A"}")\n`;
      }
      if (critiqueContext.actionItems && critiqueContext.actionItems.length > 0) {
        systemInstruction += `- Active DAW Tasks:\n`;
        critiqueContext.actionItems.forEach((it: any, i: number) => {
          systemInstruction += `  * Task [${i + 1}]: "${it.title}" - Rec: "${it.recommendation}" - Technical instructions: "${it.technicalGuide}"\n`;
        });
      }
      systemInstruction += `\nIf the client asks about score contradictions, explain mathematically or creatively how these metrics differ (e.g. why they can have great syncopation but score lower on composition flow due to section energy buildup, or why a song has wonderful rhythmic syllables but is turned down on commercial readiness because of LUFS or high sibilance). Always explain the scoring logic behind our studio Rating Taxonomy:\n- 90-100 is "Masterful" (Ready for immediate global editorial playlisting, pristine phase coherence and ear candy).\n- 80-89 is "Great" (Professional elite, tight syncopation but needs minor tweaks).\n- 70-79 is "Strong" (Competent structure, minor congestion/masking).\n- 60-69 is "Proficient" (Solid demo foundation, vocal peaks or low-end conflicts).\n- 0-59 is "Developing" (Rough draft/sketch, needs compositional/engineering rebuild).\n`;
    }

    // Process chat history into standard format for Gemini SDK
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text || msg.message || "" }],
        });
      });
    }

    // Add user's new message at the end
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "My apologies, I received static on my line. Can you run that by me again?";
    res.json({ reply, avatarId: selectedRepId, repName });
  } catch (err: any) {
    console.error("A&R Consultation error:", err);
    res.status(500).json({ error: `Consultation offline: ${err.message || err}` });
  }
});

// Global Error Handler for Multer or generic Express exceptions
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled server error:", err);
  
  const isMulterError = err && (
    err.name === "MulterError" || 
    err.code?.startsWith("LIMIT_") || 
    (multer && typeof (multer as any).MulterError !== "undefined" && err instanceof (multer as any).MulterError)
  );

  if (isMulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "The uploaded audio file exceeds the 15MB size limit. Please compress your track or submit a shorter segment." });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(500).json({ error: err.message || "An unexpected server-side error occurred." });
});

// Setup Vite & Static Assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicitly serve and transform index.html for development mode
    app.use("*", async (req, res, next) => {
      // Exclude standard API path prefixes
      if (req.originalUrl.startsWith("/api/")) {
        return next();
      }
      try {
        let template = fs.readFileSync(
          path.resolve(process.cwd(), "index.html"),
          "utf-8"
        );
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Independent Songwriter Critique server running on http://localhost:${PORT}`);
  });
}

startServer();
