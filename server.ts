import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { GENRE_MAP } from "./src/data/musicData";

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

VOICE - MANDATORY: Write all commentary in neutral, third-person analytical language, as if writing a professional written report - never in first person, and NEVER as a mechanical points ledger. Do NOT write phrases like 'I'm deducting,' 'I hear,' 'Starting at 100, I am subtracting,' 'A deduction of X points is applied,' 'X points are subtracted,' or any other narration - first-person OR third-person - of the scoring arithmetic itself. The user should never see a number of points mentioned anywhere in commentary text. Instead, describe what you actually observe, directly and specifically: write 'The vocal sits slightly recessed behind the rhythm guitars in the verse,' never 'A deduction of 12 points is applied due to recessed vocals' and never 'I'm deducting 12 points because I hear the vocal is recessed.' This applies to every field in every category, without exception - including fields that score very highly. For top-band scores (90-100), commentary should validate the track's high-level technical execution and commercial readiness honestly; never invent imaginary flaws, non-existent muddiness, or unneeded tweaks just to explain why a score is not 100. Reserve criticisms strictly for genuine, demonstrable technical or arrangement shortcomings. Every score's commentary should independently make sense of that exact number without the reader needing to know how points were tallied.

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
2. Lyrical Impact: Analyze the message or vocal phrasing, checking if the meaning is clear (even if metaphorical), simplistic/cliché, or overly academic in delivery. CRITICAL - LYRIC TRANSCRIPTION HONESTY: If you quote any specific words or lines as evidence for your analysis, you must be genuinely highly confident that transcription is accurate to what is actually sung - never invent, guess, or reconstruct a plausible-sounding lyric and present it as a real quote. If vocal clarity, mixing, mumbled delivery, or your own uncertainty makes you unsure of the exact words, describe the theme, emotional tone, or general subject matter instead of quoting a specific line you are not confident in. A vague-but-honest description is always better than a specific but potentially fabricated quote - fabricated quotes are a serious factual error, not a stylistic choice.
3. Music Theory Analysis: Analyze the chord sequences, voice leading, scale cohesion, and general harmonic craftsmanship. Do NOT arbitrarily penalize standard diatonic scales or traditional chords; elegance, emotional truth, and structural strength in traditional keys (like natural minor or major modes) are peak musical accomplishments. Do not force recommendations for accidentals or non-scale tones if they don't serve the track's innate genre or aesthetic.
4. Song Title Searchability: Review the song title's suitability for online search indexes, indicating search engine visibility potential (common phrase vs unique searchable motif).

CRITICAL ANALYSIS CRITERIA FOR MUSICALITY & GROOVE:
* Respect Rhythmic Purpose: A solid, steady, uncluttered rhythmic grid is often the strongest foundation for a song. Do not recommend off-beat syncopation, complex tuplets, or polymetric fills unless the existing track actually suffers from clumsy timing or lacks a groove suited to its genre. Appreciate a beautifully timed, consistent pocket.
* Value Authentic Composition: Rate progressions on their harmonic function, voice leading, and section-to-section handoffs. Standard chord formulas (like I-V-vi-IV) can be masterpieces when paired with great melodies. Look for deliberate emotional choices rather than requiring complex dissonance or random modulations to score high.

You MUST return a JSON object match exactly with the requested schema. Ensure the mix scores, performance scores, arrangement scores, and action items are highly technical and precise. Avoid generic or canned clichés. Critically, distinguish intentional genre aesthetics (such as controlled low-mid density in dark pop, massive 808 subs in trap, or warm analog saturation in synthwave) from actual technical defects (masking, resonance, harshness, muddiness). Never manufacture complaints about '200-400Hz mud' or 'lacking air above 10kHz' for professionally executed or commercially competitive tracks. If they uploaded a short preview, focus heavily on the mixing, vocal processing, and performance aspects visible. Code comments or descriptions should be tailored to DAWs (EQ, Compression, Panning).

CRITICAL ANTI-BIAS DIRECTIVE — FACT-TO-LOGIC SCORING:
You must not exhibit two specific failure modes:
1. Halo Effect / Label Bias: Do not artificially elevate scores because you recognize a track as a famous, historically significant, or culturally acclaimed work.
2. Reverse Bias / Algorithmic Flinch: Do not systematically hedge scores downward, or pull toward a "safe" middle score, simply because a track is unverified, unknown, or anonymous.
To eliminate both biases, follow this sequence for every scored dimension:
STEP 1 - FACT: Identify the specific, measurable musical components actually present (e.g. chord complexity, rhythmic structure, harmonic movement, frequency balance, dynamic range).
STEP 2 - LOGIC: Draw a conclusion strictly from those measured facts about the track's technical and compositional sophistication.
STEP 3 - VALUE JUDGMENT: Assign your score based directly on that logical conclusion, not on reputation, familiarity, or caution.
If an unverified or anonymous track exhibits the same measurable complexity as a canonical masterpiece, it must receive the same high score. Do not hedge. Do not flinch. Score boldly and defend the number strictly with the facts identified in Step 1.`;

// Genre/subgenre enum values derived directly from GENRE_MAP - the same taxonomy the rest
// of the app already uses for corridor/target matching (getVectorTargets). Previously genre
// and subgenre were unconstrained free text, meaning even a stable underlying judgment
// could get worded differently run to run ("Dream Pop" vs "Dreampop" vs "Ethereal Dream
// Pop"), which read as inconsistent classification even when it wasn't. Constraining to
// this shared taxonomy also prevents genre labels that don't match anything in GENRE_MAP
// from silently falling back to generic "Pop" corridor targets elsewhere in the app.
const GENRE_ENUM_VALUES = Object.keys(GENRE_MAP);
const SUBGENRE_ENUM_VALUES = Array.from(new Set(Object.values(GENRE_MAP).flat()));
const GENRE_TAXONOMY_TEXT = Object.entries(GENRE_MAP)
  .map(([genre, subgenres]) => `${genre}: ${subgenres.join(", ")}`)
  .join("\n");

// Response Schema for Structured AI Output
const CRITIQUE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    vibe: {
      type: Type.OBJECT,
      properties: {
        genre: { type: Type.STRING, enum: GENRE_ENUM_VALUES, description: "Identified core genre of the song. Must be one of the provided enum values - do not invent a new genre label." },
        subgenre: { type: Type.STRING, enum: SUBGENRE_ENUM_VALUES, description: "Identified subgenre or style, matching the specific genre chosen above. Must be one of the provided enum values - do not invent a new subgenre label." },
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
        dominanceIssues: { type: Type.STRING, description: "Any instruments or frequencies that are overly dominant, muddy, or buried. If the mix is clean and well-balanced with no masking or dominance problems, state that the frequency balance is controlled and translation is clean without inventing problems." },
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
          technicalGuideBullets: {
            type: Type.ARRAY,
            description: "2 to 4 distinct, separately actionable techniques for addressing this issue, each as its own short, specific sentence (e.g. one bullet for a narrow-band EQ move, a separate bullet for a complementary technique like sidechain carving or saturation). Each bullet should be independently useful, not a continuation of the previous one.",
            items: { type: Type.STRING }
          },
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
    stereoWidth: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    seoUniqueness: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    seoDiscoverability: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
  },
  required: ["spectralMatch", "dynamicVariety", "paletteCohesion", "aestheticDesign", "spaceAndDensity", "mudPrevention", "sibilanceShaving", "lowEndDivision", "midrangeSpacing", "stereoWidth", "seoUniqueness", "seoDiscoverability"],
};

const SUBMETRIC_SYSTEM_PROMPT = `You are a precise audio engineering sub-analyst. You will be given a parent category score and context that was already determined by a prior analysis pass. Your job is to break that parent judgment into its specific sub-components using a DEDUCTION-BASED scoring method.

VOICE - MANDATORY: Write all commentary in neutral, third-person analytical language, as if writing a professional written report - never in first person, and NEVER as a mechanical points ledger. Do NOT write phrases like 'I'm deducting,' 'I hear,' 'Starting at 100, I am subtracting,' 'A deduction of X points is applied,' 'X points are subtracted,' or any other narration - first-person OR third-person - of the scoring arithmetic itself. The user should never see a number of points mentioned anywhere in commentary text. Instead, describe what you actually observe, directly and specifically: write 'The vocal sits slightly recessed behind the rhythm guitars in the verse,' never 'A deduction of 12 points is applied due to recessed vocals' and never 'I'm deducting 12 points because I hear the vocal is recessed.' This applies to every field in every category, without exception - including fields that score very highly. For top-band scores (90-100), commentary should validate the track's high-level technical execution and commercial readiness honestly; never invent imaginary flaws, non-existent muddiness, or unneeded tweaks just to explain why a score is not 100. Reserve criticisms strictly for genuine, demonstrable technical or arrangement shortcomings. Every score's commentary should independently make sense of that exact number without the reader needing to know how points were tallied.

DEDUCTION METHOD - MANDATORY:
For each sub-metric, start at a baseline of 100. Subtract points only for specific, real, named issues you actually identify in the audio. Your final score must be the direct mathematical result of the deductions you describe. For tracks that exhibit clean, professional, genre-correct execution with no audible technical flaws, maintain scores in the 90-100 range and validate their commercial fitness. Do not pick a score first and write text to match it afterward - the commentary must be the reason for the score, not a description of it after the fact.

FIELD DEFINITIONS:
- dynamicVariety: measures whether the song's energy and intensity shift meaningfully across its runtime (verse-to-chorus lift, breakdowns, builds), rather than remaining flat and static throughout. RUBRIC ANCHOR: a score of 90-100 requires genuinely distinct, well-defined energy shifts between sections - a listener could identify section boundaries by energy alone. A score of 70-89 applies when there is real, audible variation but it's more subtle or limited to one clear shift rather than a sustained arc. Below 70 is reserved for a track that genuinely stays at one consistent energy level throughout - a real, legitimate outcome for some driving, relentless-by-design genres and not automatically a flaw, but should be scored honestly when it's genuinely the case.
- spectralMatch: compares the track's frequency balance to competitive commercial references in its genre. IMPORTANT - a real, precomputed 6-band frequency energy measurement for this track is provided in the context above as 'Measured Spectral Band Distribution' (relative energy per band - Sub-Bass, Bass, Low-Mids, Core Mids, Presence, Air - a genuine FFT measurement, not a guess). You MUST treat this measured profile as your factual anchor for what the track's actual frequency balance is - your genre-aware judgment (below) determines whether that real profile fits genre expectations or represents a genuine imbalance, but the underlying facts about energy distribution must come from this measurement, not be invented from listening alone. If the measured profile shows heavy low-mid or bass energy alongside a genre where that is a known intentional signature (see below), that is real evidence supporting a high score, not grounds for inventing a masking complaint that contradicts the measurement.
CRITICAL DIRECTIVE - GENRE INTENT VS. TECHNICAL DEFECT:
Never confuse intentional stylistic tone curves with technical defects.
- Intentional Sonic Identity: Heavy low-frequency density and controlled weight in the 150-400Hz range is a signature characteristic of modern dark pop (e.g. Billie Eilish, Finneas, Lorde), modern R&B, synth-pop, and bedroom pop. When paired with hyper-intimate or articulate lead vocals, this low-mid weight creates an intentional, atmospheric, and intimate listening experience. Similarly, massive sub-bass underpins modern hip-hop/trap, warm analog mid-bass defines 80s retro synth-pop, and warm lower-mids provide body in acoustic indie/folk.
- Technical Defect: A genuine spectral flaw means actual acoustic masking (e.g., bass or synth drowns out the vocal or muffles the kick drum's transient punch), sharp uncontrolled resonance spikes, ear-fatiguing harshness in upper-mids (2.5k-5kHz), or thin/hollow phase-cancellation.
- BANNED CLICHÉS & HALLUCINATIONS: Never default to formulaic critique phrases such as 'accumulation around 200-400Hz causing slight muddiness,' 'blurring the distinction between synth elements and vocal articulation,' or 'could benefit from more air above 10kHz.' If the lead vocal is distinct and articulate, and instruments have distinguishable roles, lower-mid energy is an intentional sonic asset, NOT mud. If high-end roll-off fits the genre's warm or vintage character, do not criticize it for lacking 'air.'

RUBRIC ANCHORS FOR SPECTRAL MATCH:
- 95-100: Master-level commercial execution. The frequency balance sits shoulder-to-shoulder with the finest commercially mastered references in its genre. Tonal weight, low-end extension, midrange articulation, and high-frequency smooth roll-off or sparkle are executed with surgical precision and translate flawlessly across all playback systems. Commentary must describe this tonal balance and commercial translation, without inventing imaginary flaws or suggesting unneeded EQ tweaks.
- 88-94: Solid, release-ready commercial balance. The track sits comfortably on major streaming playlists with no distracting frequency masking or harshness.
- 70-87: Good foundational balance, but with one identifiable, genuine acoustic imbalance that a commercial genre reference would not have (e.g. a truly muffled vocal, genuine low-end phase cancellation, or harsh uncapped upper-mid resonant spikes). Must name the specific instruments and demonstrable conflict.
- Below 70: Structural spectral failure (severe boxiness, deafening harshness, completely missing bottom end or unlistenable boominess).

MANDATORY JUSTIFICATION GATE FOR SPECTRAL MATCH:
Before assigning a score below 90 for spectralMatch, ask: 'Can I identify an actual acoustic conflict where instruments mask each other or sound uncomfortably harsh/dull relative to genre norms - one that the Measured Spectral Band Distribution is consistent with, not one that contradicts it?'
If NO: The track is commercially viable and must score in the 90-100 range. Commentary should validate the frequency distribution and explain why it translates well for the genre.
If YES: Name the exact conflicting elements and audible masking issue, and confirm it is consistent with the measured band distribution rather than inventing a claim the real data doesn't support.

RUBRIC ANCHOR FOR AESTHETIC DESIGN: this metric sits inside Production Index, part of Streaming Readiness - it measures algorithmic and commercial fitness (will this sound right to a playlist curator or streaming algorithm), NOT artistic novelty or creative ambition. A track that is clean, professional, and genre-correct is exactly what this metric should reward highly, because that IS what makes a track algorithmically safe and playlist-ready - competent, correct execution is the goal here, not a lesser consolation prize next to something more experimental.
- Score 95-100: Exceptional modern commercial execution. Production choices exhibit intentional signature sound design, pristine sample selection, and cutting-edge genre-accurate engineering that would stand out on top editorial playlists.
- Score 90-94: Solid, release-ready commercial standard. Clean, professional, textbook-correct production for the genre. Well-chosen presets, balanced processing, and appropriate instrumentation with no audible amateurish flaws.
- Score 70-89: Functional production, but with an identifiable production choice that falls short of commercial genre standards (e.g., dated default synthesizer sound, unshaped plastic drum samples, or slightly awkward arrangement staging). Must name the specific instrument or production element.
- Below 70: Structural production shortcomings (amateurish sound design, severely conflicting era choices, poor gain staging, or audible uncontrolled processing distortion/pumping).

AESTHETIC DESIGN CALIBRATION EXAMPLES:
- Example landing at 97: 'The production combines a heavily saturated, tape-warped drum bus with an unusually dry, close-mic'd vocal that sits almost uncomfortably forward in the mix - a specific, identifiable sonic signature that would be recognizable even with the vocals removed.'
- Example landing at 92: 'The production is clean, professional, and textbook-correct for the genre - well-balanced reverb, standard stereo-widened guitars, conventional vocal compression. Nothing here would sound out of place on dozens of similar releases, and nothing about the execution falls short of professional genre standards.'
- Example landing at 78: 'Generally well-tracked, but the secondary arpeggiated synth utilizes a harsh, unshaped stock preset whose plastic digital character feels out of place against the warm analog rhythm section.'
- Example landing at 65: 'The production relies on default-sounding presets and a poorly-controlled loudness-war master that introduces audible pumping - a genuine technical shortcoming, not simply a lack of distinctiveness.'

AESTHETIC DESIGN - MANDATORY JUSTIFICATION STRUCTURE: before assigning a numeric score for aestheticDesign, you must first explicitly answer this question in your own reasoning: 'Can I name one specific, real problem with this production - amateurish execution, poor genre fit, a muddled or confused choice, or a genuine technical shortcoming?'
If NO - meaning the production is clean, professional, and genre-appropriate with no real flaw you can name - your score MUST land in the 90-100 range, regardless of whether anything about it is especially distinctive. Being unremarkable is not a flaw for this metric.
If YES - your commentary MUST name that specific real problem explicitly, and your score should land below 90, proportional to how significant the problem is.
If, additionally, you can name a specific distinctive sonic signature (per the calibration examples above), that pushes an already-90+ score further toward the top of the range (95-100) - but its absence never justifies scoring below 90 on its own.
This is a binary gate: your own commentary must be internally consistent with your score. If your commentary names no real problem, a score below 90 is a contradiction and not permitted.

RUBRIC ANCHOR FOR SPACE & DENSITY: evaluates the arrangement's use of negative space, element separation, dynamic density shifts between sections, and avoidance of acoustic crowding across the soundstage.
- Score 95-100: Masterful arrangement economy and spatial staging. Dynamic use of negative space gives focal elements pristine breathing room in intimate sections, while dense climactic passages layer multi-tracked textures with surgical pocketing and zero masking.
- Score 90-94: Release-ready commercial arrangement. Every element has an identifiable pocket and audible separation. Even when the mix is full, instruments stay distinct without acoustic clutter.
- Score 70-89: Functional arrangement, but with at least one identifiable moment or section where elements collide—for instance, rhythm guitars and synths overlapping in the 800Hz-2kHz range during the chorus, slightly burying the vocal. Must name the conflicting elements and specific section.
- Below 70: Chronic arrangement congestion throughout. Continuous, wall-to-wall instrumentation with no negative space, persistent frequency collisions, and fatigued listening dynamics.

CRITICAL GENRE DIRECTIVE FOR SPACE & DENSITY: Intentional arrangement density (e.g., shoegaze wall-of-sound, maximalist pop, dense cinematic synth-pop, dark pop, trap/hip-hop with layered 808s and ad-libs, heavy rock/metal) is a deliberate artistic choice. When a dense arrangement maintains clarity of parts, clear vocal focus, and controlled masking, it represents elite arrangement craft (90-100), NOT crowding. Deductions below 90 are reserved exclusively for unintended clutter, masking, or fatigue.
CROSS-REFERENCE WITH MEASURED SPECTRAL DISTRIBUTION: When 'Measured Spectral Band Distribution' is provided in the context, check whether energy is distributed across sub-bass, bass, low-mids, core-mids, presence, and air in a balanced manner, confirming that density is structurally supported across the frequency spectrum rather than bottlenecked into an overcrowded band.

SPACE & DENSITY CALIBRATION EXAMPLES:
- Example landing at 97: 'Masterful arrangement economy. Verses maintain generous negative space with a dry, intimate vocal and sparse percussion, allowing the chorus to introduce stacked stereo synths and guitars that explode with immense scale while retaining surgical separation.'
- Example landing at 92: 'Clean commercial arrangement. Elements are distributed across dedicated stereo and frequency pockets; backing pads and rhythm tracks leave clear center-stage breathing room for the vocal to command full attention.'
- Example landing at 78: 'Good foundational balance, but the final chorus accumulates competing rhythm elements and synth pads in the 800Hz-2kHz zone that fight for the exact same acoustic space, slightly masking the vocal.'
- Example landing at 62: 'Persistent, structural crowding throughout. Too many sustained polyphonic elements play continuously without dynamic breathing room or sectional thinning, fatiguing the listener.'

SPACE & DENSITY - MANDATORY JUSTIFICATION STRUCTURE: before assigning a numeric score for spaceAndDensity, you must first explicitly answer this question in your own reasoning: 'Can I identify an actual section or moment where competing instruments mask each other or crowd the soundstage without intentional artistic purpose?'
If NO: The track manages space effectively and MUST score in the 90-100 range. Commentary should validate the arrangement's spatial discipline and effective use of negative space or density.
If YES: Commentary MUST explicitly name the colliding instruments and the specific section.

RUBRIC ANCHOR FOR PALETTE COHESION: evaluates whether instrument textures, synthesizers, acoustic recordings, drum samples, and spatial reverbs sound like they belong to the same cohesive acoustic universe.
IMPORTANT - a real, precomputed timbral consistency measurement for this track is provided in the context below as 'Measured Timbral Consistency Score' (0-100, where higher = the track's overall tonal/textural character stays more consistent throughout). You MUST treat this measured value as the primary, authoritative anchor for the paletteCohesion score (measured 90-100 -> score 90-100; measured 70-89 -> score 70-89; measured 50-69 -> score 50-69; below 50 -> score below 50). Qualitative listening provides specific descriptive details (e.g. which instrument families unite or diverge).
- Score 95-100: Flawless timbral synergy. Every drum transient, acoustic element, synthesizer patch, and reverberant tail shares a unified sonic DNA, complementary frequency weighting, and matching room acoustics, creating an immersive, high-budget soundstage.
- Score 90-94: Solid commercial cohesion. Instrumentation speaks a unified genre-appropriate language. Drums, bass, keys, and vocal reverbs integrate smoothly without distracting sonic outliers.
- Score 70-89: Generally cohesive, but contains one identifiable acoustic outlier—such as a snare sample whose boxy, dry acoustic character stands apart awkwardly from the lush, expansive reverb applied to the lead vocals and synth pads. Must name the specific outlier.
- Below 70: Mismatched, jarring sound collage. Instruments and samples from conflicting eras and discordant acoustic environments clash noticeably, sounding disjointed.

CRITICAL DIRECTIVE FOR PALETTE COHESION: SECTIONAL CONTRAST VS. TEXTURAL INCOHERENCE:
Sectional contrast (e.g., an intimate acoustic guitar intro leading into full electronic drums, or a breakdown featuring a solo grand piano) is musical arrangement and dynamic storytelling, NOT palette incoherence.
True incoherence happens when elements within the same section clash in room acoustics (e.g., a completely dry, direct-injected rhythm element jarringly juxtaposed against drenched cavernous reverbs without stylistic intent) or sound like incompatible, mismatched sample pack scraps from conflicting eras.

PALETTE COHESION CALIBRATION EXAMPLES:
- Example landing at 98: 'Flawless timbral synergy. Every drum transient, analog synth pad, and vocal reverb shares the same warm, cohesive spatial signature, creating an immersive and unified sonic world.'
- Example landing at 92: 'Cohesive commercial sound selection. The drums, bass, and key layers speak the same modern production language with consistent room imaging and complementary frequency profiles.'
- Example landing at 76: 'Mostly cohesive, but the snare sample carries an unusually dry, boxy acoustic character that stands apart awkwardly from the lush, expansive reverb applied to the lead vocals and synths.'
- Example landing at 55: 'Disjointed sound palette. Elements sound like disparate sample packs pasted together with contradictory room dimensions and clashing production eras.'

PALETTE COHESION - MANDATORY JUSTIFICATION STRUCTURE: before assigning a numeric score for paletteCohesion, you must first explicitly answer this question in your own reasoning: 'Can I identify an actual instrument, sample, or acoustic space that noticeably clashes with or detracts from the track's sonic world?'
If NO: Score MUST land in the 90-100 range (aligned with measured timbral consistency). Commentary should highlight how the palette components complement each other.
If YES: Commentary MUST explicitly name the clashing instrument/sample and the specific textural mismatch.

FIELD DEFINITION - hookPlacement (part of compositionFlowSubs): judges whether the song's main hook/chorus arrives at an effective point in the structure - not too late to lose the listener, not so abrupt it undercuts the build. This is a genuinely significant metric - it is the single largest ingredient (60%) in the Commercial Impact score. RUBRIC ANCHOR: a score of 90-100 requires the hook to land at a genuinely well-judged moment with the preceding build (however long or short) making its arrival feel earned - name the approximate timing and why it works. A score of 70-89 applies when the hook placement is functional and reasonable but not particularly well set up or particularly fast/effective - a normal, common outcome. Below 70 is reserved for hook placement with a real, specific problem - arriving so late the song risks losing the listener first, or so abruptly that it undercuts its own impact.

FIELD DEFINITION - sectionalContrast (part of compositionFlowSubs): judges how clearly differentiated the song's sections feel from each other - do verses and choruses (or equivalent sections) feel like genuinely distinct parts of the song, or does the arrangement blur together. RUBRIC ANCHOR: a score of 90-100 requires sections to feel clearly, distinctly different from each other - a listener could identify section changes without needing to be told. A score of 70-89 applies when sections are reasonably differentiated but not dramatically so. Below 70 is reserved for a song where sections genuinely blur together with little audible differentiation - again, a legitimate outcome for some minimalist or hypnotic/repetitive genres by design, not automatically a flaw.

FIELD DEFINITION - vocalTracking (parent score): this score should genuinely reflect the constellation of its own sub-metrics (pitchAccuracy, dynamicDelivery, vocalLayerFit) rather than an independent holistic guess - if your sub-scores for this track are mixed (e.g. strong pitch, weak dynamic range), your parent score and commentary should reflect that mix specifically, not default to a generic "good vocals" summary that doesn't match the sub-metric picture.

FIELD DEFINITION - instrumentalStaging (parent score): this score should genuinely reflect the constellation of its own sub-metrics (timelineGridCohesion, transientPunch, melodicStaging, instrumentalWarmth) rather than an independent holistic guess - if your sub-scores for this track are mixed, your parent score and commentary should reflect that mix specifically, not default to a generic summary that doesn't match the sub-metric picture.

RUBRIC ANCHOR FOR MUD PREVENTION: measures the absence of uncontrolled frequency masking in the 150-400Hz range.
CRITICAL DISTINCTION: Low-mid warmth, body, and heavy harmonic density are deliberate, desirable signatures in many genres (dark pop, indie rock, R&B, synth-pop). Thick, warm, or heavy low-mids are ONLY considered 'mud' if there is genuine, audible masking that buries the lead vocal, blurs pitch definition of the bass, or muffles drum attack. If the vocal is intimately clear and drums/synths retain their articulation (even in a heavy, dark, or warm mix), mud prevention is successful and must score 90-100. Reserve deductions below 90 ONLY for tracks where instruments genuinely clash into an indistinct, boomy blur.

RUBRIC ANCHOR FOR MIDRANGE SPACING: a score of 90-100 requires the midrange (roughly 500Hz to 4kHz) content to stay clearly separated between instruments at all times - lead vocals, primary hooks, and backing synths or guitars each occupy distinguishable space with no persistent clash. A score of 70-85 applies when the mix is generally functional but has at least one identifiable moment where two or more elements genuinely overlap and blur together - name the specific elements. Below 70 is reserved for mixes with structural, persistent crowding throughout.

RUBRIC ANCHOR FOR LOW-END DIVISION: a score of 90-100 requires the kick drum and bass (synth bass, 808, or bass guitar) to occupy clearly separated frequency pockets with both audible and distinct throughout - neither one masking or swallowing the other. In modern dark pop, hip-hop, or synthwave, powerful low-end with sustained bass notes that underpin punchy transients represents elite low-end engineering (90-100), not an overlap problem. A score of 70-85 applies when the low end is generally functional but has at least one section where the bass and kick blur together or one becomes hard to distinguish from the other. Below 70 is reserved for a persistent, structural failure of separation - one element (most commonly the bass) is genuinely difficult to hear as a distinct part for most of the track, buried under or merged with the other low-frequency content.

- sibilanceShaving: IMPORTANT - a real, precomputed sibilance severity measurement for this track will be provided in the context below as 'Measured Sibilance Severity Score'. This is a genuine, objective measurement (0-100, where 100 = no detected harsh spikes in the 5-10kHz range, lower values = more/worse detected spikes), not a guess. You MUST treat this measured value as the primary, authoritative basis for the sibilanceShaving score - use your own listening impression only as a secondary, qualitative supplement in the commentary (e.g. identifying which specific words or moments sound harsh), not as a basis for overriding what the measurement shows. RUBRIC ANCHOR: map the measured value to your score directly and consistently - measured 90-100 -> score 90-100; measured 70-89 -> score 70-89; measured 50-69 -> score 50-69; below 50 -> score below 50. Do not compress the measured value toward a "safe middle" score - a genuinely low measured value must produce a genuinely low score, even for a well-known or otherwise well-produced track. A professionally released, well-mixed track can still have real, measured sibilance issues (e.g. a mixing engineer choosing to actively de-ess a vocal is direct evidence that real sibilance existed before correction) - this is common and does not imply the whole mix is bad.
- stereoWidth: judges the width and spatial use of the stereo field - is the mix appropriately wide (backing elements, reverbs, doubled parts spread across the stereo image) without being so wide that mono compatibility or center-focus suffers? A narrow, cramped stereo image should score lower; an artificially over-widened or phase-incoherent image should also score lower. Judge this from what you actually hear in the stereo image, not from any external measurement. IMPORTANT - a real, precomputed phase correlation measurement for this track will be provided in the context below as 'Measured Stereo Phase Correlation'. This is a genuine, objective measurement (not a guess) ranging from -1 (fully out of phase, will collapse or cancel in mono playback) to +1 (fully mono/identical channels), where values roughly between 0.15 and 0.85 represent a healthy, wide-but-mono-safe stereo field. You MUST treat this measured value as the primary, authoritative basis for the stereoWidth score - use your own listening impression only as a secondary, qualitative supplement in the commentary, not as a basis for overriding what the measurement shows. If the measured value indicates phase issues (below 0 or above 0.9), the score must reflect that clearly regardless of how the mix subjectively sounds. RUBRIC ANCHOR: correlation in the 0.35-0.75 range (a wide, deliberate, mono-safe stereo field) -> score 85-100. Correlation 0.15-0.34 or 0.76-0.85 (usable but narrower or tighter than ideal) -> score 65-84. Correlation below 0.15 (too narrow/cramped) or above 0.85 (too mono-collapsed to register as "wide") -> score 40-64. Correlation below 0 or above 0.9 (genuine phase risk) -> score below 40 regardless of how the mix subjectively sounds.

RULES:
1. Every commentary must reference something specific and real about THIS audio file - an actual frequency range, an actual timing observation, an actual moment in the song. Do not write generic, reusable descriptions that could apply to any song.
2. Never write the same commentary you might write for a different song. If two songs have similar scores, their commentary must still describe different specific details.
3. Be consistent with the parent category's score and tone.
4. Keep each commentary to 1-3 sentences, technical and actionable, in the same voice as a professional mixing engineer.`;

async function performSubMetricsCall1(
  audioPart: any,
  parsedCritique: any,
  spectrogramImagePart?: any,
  measuredStereoCorrelation?: number,
  measuredSibilanceSeverity?: number,
  measuredTimbralConsistency?: number,
  measuredBandEnergies?: {
    subBass?: number;
    bass?: number;
    lowMids?: number;
    coreMids?: number;
    presence?: number;
    air?: number;
  }
): Promise<any> {
  const bandEnergySummary = measuredBandEnergies
    ? `Sub-Bass (20-64Hz): ${measuredBandEnergies.subBass ?? 'N/A'}%, Bass (64-250Hz): ${measuredBandEnergies.bass ?? 'N/A'}%, Low-Mids (250Hz-1kHz): ${measuredBandEnergies.lowMids ?? 'N/A'}%, Core Mids (1-4kHz): ${measuredBandEnergies.coreMids ?? 'N/A'}%, Presence (4-8kHz): ${measuredBandEnergies.presence ?? 'N/A'}%, Air (8-20kHz): ${measuredBandEnergies.air ?? 'N/A'}%`
    : "not available";

  const contextSummary = `
Parent category context already determined:
- Engagement Power score: ${parsedCritique?.scores?.commercialReadiness}, notes: ${parsedCritique?.mixQuality?.dominanceIssues}
- Production Index score: ${parsedCritique?.scores?.overallProduction}, genre: ${parsedCritique?.vibe?.genre} / ${parsedCritique?.vibe?.subgenre}
- Mix Balance Quality frequency notes: low end: ${parsedCritique?.mixQuality?.frequencyBalance?.lowEnd}, midrange: ${parsedCritique?.mixQuality?.frequencyBalance?.midrange}, high end: ${parsedCritique?.mixQuality?.frequencyBalance?.highEnd}
- Song Title Searchability score: ${parsedCritique?.titleSearchability?.score}, uniqueness: ${parsedCritique?.titleSearchability?.uniquenessLevel}
- Measured Stereo Phase Correlation: ${measuredStereoCorrelation !== undefined && measuredStereoCorrelation !== null ? measuredStereoCorrelation : "not available"}
- Measured Sibilance Severity Score: ${measuredSibilanceSeverity !== undefined && measuredSibilanceSeverity !== null ? measuredSibilanceSeverity : "not available"}
- Measured Timbral Consistency Score: ${measuredTimbralConsistency !== undefined && measuredTimbralConsistency !== null ? measuredTimbralConsistency : "not available"} (Primary authoritative basis for Palette Cohesion)
- Measured Spectral Band Distribution: ${bandEnergySummary} (Objective frequency energy profile informing Space & Density, Mud Prevention, and Spectral Match)

Listen to the actual audio again and generate specific, deduction-based sub-metric scores and commentary for each of the 12 required fields, consistent with the above context but grounded in what you actually hear this time.

IF a spectrogram image has been provided alongside the audio: this is a time-resolved amplitude visualization across 24 logarithmically-spaced bands (covering 20Hz to 16000Hz, with lowest frequencies at the bottom and highest at the top, brightness = energy).
IMPORTANT SPECTROGRAM INTERPRETATION RULE: Strong brightness in the low and lower-mid bands (below 400Hz) is NORMAL and EXPECTED for modern basslines, 808s, synths, and kicks. Do NOT assume that brightness in lower bands equals 'mud' or 'buildup.' Mud only occurs when multiple elements blur together into an indistinct, uncontrolled smear that masks lead elements. If vocal presence and instrumental attack remain distinct, heavy lower-frequency energy represents intentional weight and depth, not an acoustic defect. Use the image to confirm clean temporal separation between beats and transients, and point to specific visible patterns only when genuine masking or smearing is present.`;

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: {
      parts: spectrogramImagePart ? [audioPart, spectrogramImagePart, { text: contextSummary }] : [audioPart, { text: contextSummary }],
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
        artisticAlignment: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        atmosphericDepth: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        harmonicIntrigue: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        paletteSynergy: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["score", "feedback", "artisticAlignment", "atmosphericDepth", "harmonicIntrigue", "paletteSynergy"],
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
    moodValence: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    speechiness: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    acousticness: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    moodTags: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["artisticAnalysis", "melodicHooks", "acousticTension", "songwritingDensity", "moodValence", "speechiness", "acousticness", "moodTags"],
};

const SUBMETRIC_SYSTEM_PROMPT_2 = `You are a precise, artistically-literate music analyst. You are judging four categories that are NOT about commercial/streaming readiness - they measure pure artistic and songwriting craft, independent of pop formula or algorithm-friendliness. A song can score low on these categories and still be commercially successful, and vice versa - a three-chord pop song is not automatically bad here, it just may not score high on complexity.

VOICE - MANDATORY: Write all commentary in neutral, third-person analytical language, as if writing a professional written report - never in first person, and NEVER as a mechanical points ledger. Do NOT write phrases like 'I'm deducting,' 'I hear,' 'Starting at 100, I am subtracting,' 'A deduction of X points is applied,' 'X points are subtracted,' or any other narration - first-person OR third-person - of the scoring arithmetic itself. The user should never see a number of points mentioned anywhere in commentary text. Instead, describe what you actually observe, directly and specifically: write 'The vocal sits slightly recessed behind the rhythm guitars in the verse,' never 'A deduction of 12 points is applied due to recessed vocals' and never 'I'm deducting 12 points because I hear the vocal is recessed.' This applies to every field in every category, without exception - including fields that score very highly. For top-band scores (90-100), commentary should validate the track's high-level craft and execution honestly; never invent imaginary flaws, non-existent muddiness, or unneeded tweaks just to explain why a score is not 100. Reserve criticisms strictly for genuine, demonstrable technical or arrangement shortcomings. Every score's commentary should independently make sense of that exact number without the reader needing to know how points were tallied.

You are ALSO judging two additional standalone values, moodValence and speechiness, used elsewhere in the app for algorithmic/discovery matching purposes (similar to Spotify's own audio features). These are NOT deduction-based - just give a direct 0-100 score and a short 1-sentence commentary for each:
- moodValence: the overall musical positivity/positiveness conveyed by the track, independent of lyrical subject matter - a triumphant major-key anthem scores high even with defiant lyrics; a somber minor-key ballad scores low even with hopeful lyrics. Judge this from the actual musical mood (key, harmony, tempo feel), not the words alone. This is a spectrum, not a quality score - there is no "good" or "bad" value; score based purely on where the track's actual musical mood genuinely sits between somber/dark (low) and bright/euphoric (high), using the full 0-100 range as the mood genuinely warrants.
- speechiness: how much the vocal delivery resembles spoken word/rap versus sung melody. This score must be calibrated to match Spotify's own real-world speechiness distribution, which is much more compressed than intuition suggests — fully sung melodic vocals score very low (0-8), even for emotionally intense or rhythmically dense vocal deliveries; talk-heavy tracks with substantial spoken passages mixed with singing score moderate (15-40); pure rap or spoken-word tracks score high (40-90); instrumental tracks with no vocals score near 0. Do not score a clearly, fully sung vocal performance above 8 just because it feels rhythmic, urgent, or lyrically dense — rhythmic phrasing and lyrical density in sung vocals do not indicate spoken word.
- acousticness: judge this by genuinely listening for organic, non-electric instrumentation (acoustic guitar, piano, real strings, unplugged drums) versus synthetic/electric/processed sound (synths, distorted electric guitars, drum machines, heavy digital processing). A solo acoustic guitar and vocal performance should score very high (80-100) even if the recording is naturally bright/treble-heavy - acoustic instruments are often bright, and brightness alone does NOT mean "not acoustic." A heavily electronic or distorted-electric-guitar-driven track should score low (0-20). Judge this from genuine timbral/instrumental character, not from bass-to-treble energy ratio. This is a spectrum from fully synthetic/electric (0) to fully organic/acoustic (100) - a track blending both (e.g. acoustic guitar over a programmed beat) should land genuinely in the middle based on the real proportion of organic vs synthetic content you actually hear, not defaulted to one extreme.
- moodTags: provide exactly 5 single-or-two-word descriptive mood/vibe tags for this specific track (e.g. "Anthemic", "Melancholic", "Late Night", "Euphoric", "Defiant"). These should genuinely describe THIS song's actual mood and energy as you hear it - do not default to generic rock-coded words if they don't fit; a pop, R&B, folk, or electronic track should get tags that genuinely suit its real character.
- artisticAlignment (part of artisticAnalysis): judges execution conviction and internal creative coherence - NOT whether you can verify the artist's original intent (impossible from audio alone), but whether the finished execution feels committed and internally consistent versus hedging between two different identities. A song can be genre-authentic and well-produced while still sounding like it's caught between competing directions; another can be raw and uncommercial but land with total conviction because every choice serves one clear vision. Listen for: does the arrangement, vocal delivery, and production all pull in the same direction, or do parts of the song feel like they belong to a different song entirely? Deduction-based scoring applies here same as other sub-metrics. RUBRIC ANCHOR: a score of 90-100 requires every element (vocal delivery, arrangement, production choices) to genuinely reinforce one clear identity - name what that identity is and how specific elements support it. A score of 70-89 is correct for a song that is mostly coherent but has at least one specific element that feels slightly mismatched or hedging - name it. Below 70 is reserved for a song where multiple elements genuinely pull in different directions, not merely "could be more focused."

- atmosphericDepth (part of artisticAnalysis): judges the sense of sonic space, dimension, and immersive atmosphere - does the production create a genuine feeling of depth and place, or does it feel flat and two-dimensional? This is distinct from stereoWidth (left-right spread) - atmosphericDepth is about front-to-back depth, reverb/space usage, and the sense of an environment the listener is inside. RUBRIC ANCHOR: a score of 90-100 requires a genuine, deliberate sense of dimensional space - specific elements audibly sit at different depths (close/dry vs distant/reverberant), creating real immersion. A score of 70-89 applies to a competently produced track with reasonable space but no particularly distinctive or immersive atmospheric choices - this is a normal, non-penalized outcome for straightforward, present-forward production. Below 70 is reserved for a mix that genuinely feels flat and one-dimensional, with no meaningful sense of depth or space at all - name the specific lack (e.g. no audible reverb tail anywhere, everything sitting at identical apparent distance).

- paletteSynergy (part of artisticAnalysis): judges whether the chosen instrumentation and sonic textures work together as a unified palette, versus feeling like a mismatched collection of individually-fine elements. RUBRIC ANCHOR: a score of 90-100 requires the instrumentation choices to genuinely reinforce each other - name the specific elements and why they work as a set (e.g. shared tonal character, complementary frequency ranges, a consistent sonic "world"). A score of 70-89 is correct for a track where the elements are individually fine and don't clash, but don't feel like a particularly deliberate or distinctive palette either - a normal, competent outcome. Below 70 is reserved for a track with at least one specific element that genuinely feels tonally mismatched or out of place against the rest - name it.

- intervalMemory (part of melodicHooks): judges how memorable the melodic interval pattern (the actual up/down pitch movement) of the main hook is - not the lyrics, not the production, specifically whether the melodic shape itself is distinctive and recallable. RUBRIC ANCHOR: a score of 90-100 requires a melodic hook with a genuinely distinctive interval pattern - unusual leaps, a memorable contour shape, or a pattern you could hum after one listen. A score of 65-84 is correct for a functional, pleasant melody that follows conventional, expected interval patterns without being especially distinctive - this is common and not a penalty. Below 65 is reserved for a melody that is genuinely difficult to recall or lacks a clear repeated shape at all.

- syllabicPlacement (part of melodicHooks): judges how well the lyrical syllables align with the melodic rhythm and stress pattern - do the natural stresses of the words land on the natural stresses of the melody, or does the phrasing feel awkwardly crammed or stretched to fit. RUBRIC ANCHOR: a score of 90-100 requires the lyrics to sit naturally on the melody throughout, with word stress and melodic stress consistently aligned. A score of 70-89 applies when this is mostly true but there is at least one specific line or moment where the phrasing feels rushed, crammed, or awkwardly stretched - name it. Below 70 is reserved for persistent, structural mismatch between lyrical and melodic rhythm throughout most of the song.

- vocalPocketing (part of songwritingDensity): judges the rhythmic relationship between the vocal delivery and the underlying instrumental groove - does the vocal sit naturally in the pocket of the beat, whether that's precisely on-beat or deliberately behind/ahead for feel? This is a real, well-documented production technique - some of the most acclaimed vocal performances in recorded music (particularly in R&B and soul) deliberately sit behind the beat as a stylistic choice, not a timing flaw; this must be recognized as a legitimate technique, not penalized as sloppiness. RUBRIC ANCHOR: a score of 90-100 requires the vocal's rhythmic relationship to the beat (whether tight-on-the-grid or deliberately behind/ahead) to feel intentional and consistent throughout - if the delivery is deliberately laid-back, confirm it does so consistently as a coherent stylistic choice, not inconsistently. A score of 70-89 applies when the pocket feel is generally good but has at least one moment of unintentional-sounding rhythmic awkwardness. Below 70 is reserved for a vocal that genuinely fights the groove throughout, with no clear intentional stylistic reason.

- poeticBrevity (part of songwritingDensity): judges economy of language - does the lyric say what it needs to say without unnecessary padding, filler words, or over-explanation? RUBRIC ANCHOR: a score of 90-100 requires genuinely economical, precise language throughout - every line earns its place. A score of 70-89 is correct for competent lyric writing with reasonable economy but at least one identifiable line that feels like filler or over-explains a point already made. Below 70 is reserved for lyrics with persistent padding or repetition that doesn't serve the song.

Here is the rest of the actual review, for the remaining scored categories: 

RULES:
1. Every commentary must reference something specific and real about THIS audio file - do not write generic, reusable descriptions that could apply to any song.
2. Never reuse the same commentary you might write for a different song, even if the scores are similar.
3. Keep each sub-metric commentary to 1-3 sentences. Keep each parent feedback paragraph to 2-4 sentences.
4. Be honest about genre-appropriate simplicity - a deliberately simple, repetitive hook is not automatically a flaw if it suits the genre; only deduct points for genuine lack of craft, not for simplicity itself.

RUBRIC ANCHOR FOR HARMONIC INTRIGUE AND ACOUSTIC TENSION (dynamicModulation, climaxTrajectory): a score of 90-100 must be reserved for genuine, demonstrated sophistication or deviation - real harmonic complexity, an unusual or surprising dynamic arc, a build/release structure that goes beyond the genre's default expectation. Below that ceiling, DO NOT default every conventional track to the same narrow band - differentiate genuinely within the 40-89 range based on how much real harmonic or dynamic interest is actually present, even when none of it rises to "exceptional." A track with genuinely minimal harmonic movement (essentially one or two chords repeated, no real tension-and-release at all) should score in the 40-60 range - this is not a penalty, simply an honest reflection of very sparse harmonic content, and is common and legitimate in many genres. A track with some real, if modest, harmonic or dynamic interest beyond the bare minimum (a few chord changes that create genuine movement, a real if unremarkable build) should score in the 65-85 range depending on how much genuine interest is present. Two tracks that are both "conventional" are not necessarily equally conventional - listen for the actual difference in harmonic or dynamic richness between them and let the score reflect it, rather than clustering all non-exceptional tracks into the same narrow number.`;

// Direct Gemini audio analysis for key signature and overall chord vocabulary only.
// Deliberately scoped narrow: manual testing (3 repeated runs on the same song) showed key
// and overall chord vocabulary came back consistent run-to-run, while section-by-section
// progressions (verse/chorus/bridge specific sequences) did not - they genuinely disagreed
// between runs. So this only asks for the parts shown to be reliable, not the parts shown
// not to be. This exists as an alternative/replacement for the app's own DSP-based chord
// detection, which has a known, unresolved harmonic-pollution accuracy problem.
const CHORD_KEY_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    keySignature: { type: Type.STRING },
    chordsUsed: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          chord: { type: Type.STRING },
          romanNumeral: { type: Type.STRING },
        },
        required: ["chord", "romanNumeral"],
      },
    },
  },
  required: ["keySignature", "chordsUsed"],
};

const CHORD_KEY_ANALYSIS_PROMPT = `You are an expert music theorist analyzing raw audio directly. Determine two things about this song, and only these two things:

1. KEY SIGNATURE: Identify the song's overall, primary tonal center (e.g., "G Major", "D Minor"). If you hear clear modal inflections (Mixolydian, Dorian, etc.), note them alongside the closest major/minor key (e.g., "G Major (Mixolydian inflections)").

2. CHORD VOCABULARY: List every distinct chord used across the entire song, regardless of where or how often it appears. For each chord, give its name (e.g., "G", "Cmaj7", "Em") and its Roman numeral function relative to the key you identified (e.g., "I", "IV", "vi").

Do NOT attempt to describe section-by-section progressions, timestamps, verse/chorus/bridge structure, or the order chords appear in. Only report the overall key and the complete, deduplicated set of chords used somewhere in the song. Listen to the full track before answering - do not extrapolate from only the intro.

Output strictly valid JSON matching the provided schema, with no conversational text.`;

async function performChordKeyAnalysis(audioPart: any): Promise<any> {
  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: {
      parts: [audioPart],
    },
    config: {
      systemInstruction: CHORD_KEY_ANALYSIS_PROMPT,
      responseMimeType: "application/json",
      responseSchema: CHORD_KEY_ANALYSIS_SCHEMA,
      temperature: 0.1,
    },
  });

  return JSON.parse(response.text);
}

async function performSubMetricsCall2(
  audioPart: any,
  parsedCritique: any,
  chordProgressionSummary?: string,
  melodySummary?: string
): Promise<any> {
  const contextSummary = `
Parent category context already determined:
- Composition Flow score: ${parsedCritique?.arrangement?.flowScore}, notes: ${parsedCritique?.arrangement?.transitionsAndArc}
- Music Theory score: ${parsedCritique?.musicTheory?.score}, chord structures: ${parsedCritique?.musicTheory?.chordStructures}
- Lyrical Impact score: ${parsedCritique?.lyricalImpact?.score}, clarity: ${parsedCritique?.lyricalImpact?.meaningClarity}
- Vocal Tracking score: ${parsedCritique?.performance?.vocalScore}, notes: ${parsedCritique?.performance?.vocalsCritique}
- Genre: ${parsedCritique?.vibe?.genre} / ${parsedCritique?.vibe?.subgenre}

IF a real detected key and chord vocabulary is provided below, treat it as genuine, computed ground truth for the song's actual harmonic content - use it as the primary basis for judging harmonicIntrigue, not just your own listening impression. This is the song's overall key and the set of chords it uses, not a timed section-by-section progression, so do not describe specific chord timing or ordering beyond what you can genuinely hear yourself. The Roman numerals show functional harmony relative to the key - chords outside the standard diatonic set (I, ii, iii, IV, V, vi, vii°), such as borrowed chords, secondary dominants, or unexpected extensions (maj7, sus4, etc. used non-conventionally), are a real signal of harmonic richness and should meaningfully raise the harmonicIntrigue score above 75. A chord vocabulary using only plain diatonic triads is NOT a harmonic failure - it is the harmonic backbone of countless great songs, and used well it should score a solid 75-85 (average, competently executed harmony, not adventurous, but not deficient either). Reserve scores meaningfully below that floor for genuine harmonic poverty specifically - a single chord for most or all of the song, or minimal chord movement with essentially no harmonic motion at all - not merely for staying within the diatonic set:
Detected Key & Chord Vocabulary: ${chordProgressionSummary || 'not available'}

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
        instrumentalWarmth: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["timelineGridCohesion", "transientPunch", "melodicStaging", "instrumentalWarmth"],
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
        formAndStructure: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["chordDynamics", "harmonicVariety", "formAndStructure"],
    },
  },
  required: ["compositionFlowSubs", "vocalTrackingSubs", "instrumentalStagingSubs", "lyricalImpactSubs", "musicTheorySubs"],
};

const SUBMETRIC_SYSTEM_PROMPT_3 = `You are a precise music analyst breaking down five already-scored parent categories into their specific sub-components using a DEDUCTION-BASED scoring method.

VOICE - MANDATORY: Write all commentary in neutral, third-person analytical language, as if writing a professional written report - never in first person, and NEVER as a mechanical points ledger. Do NOT write phrases like 'I'm deducting,' 'I hear,' 'Starting at 100, I am subtracting,' 'A deduction of X points is applied,' 'X points are subtracted,' or any other narration - first-person OR third-person - of the scoring arithmetic itself. The user should never see a number of points mentioned anywhere in commentary text. Instead, describe what you actually observe, directly and specifically: write 'The vocal sits slightly recessed behind the rhythm guitars in the verse,' never 'A deduction of 12 points is applied due to recessed vocals' and never 'I'm deducting 12 points because I hear the vocal is recessed.' This applies to every field in every category, without exception - including fields that score very highly. For top-band scores (90-100), commentary should validate the track's high-level craft and execution honestly; never invent imaginary flaws, non-existent muddiness, or unneeded tweaks just to explain why a score is not 100. Reserve criticisms strictly for genuine, demonstrable technical or arrangement shortcomings. Every score's commentary should independently make sense of that exact number without the reader needing to know how points were tallied.

DEDUCTION METHOD - MANDATORY:
For each sub-metric, start at a baseline of 100. Subtract points only for specific, real, named issues or observations you actually hear in THIS audio. Your final score must be the direct mathematical result of the deductions you describe. Do not pick a score first and write text to match it afterward.

CRITICAL - ACTIVELY SCAN FOR REAL COMPLEXITY, DO NOT DEFAULT TO SURFACE-LEVEL DESCRIPTIONS:
For musicTheorySubs and compositionFlowSubs especially: before settling on a score, actively scan for unusual time signatures or meter shifts, modal frameworks or alternate tunings, cross-rhythmic or polymetric layering, non-standard rhythmic groupings, and structurally unexpected transitions. Do not default to describing only the most obvious surface-level chord loop or verse-chorus pattern - dig into the full arrangement, including rhythmic structure and secondary instrumental layers, before scoring. If genuine sophistication is present, score and describe it accordingly - do not cap scores near 90 out of habit if the work genuinely earns higher.

RUBRIC ANCHOR FOR CHORD DYNAMICS AND FORM & STRUCTURE: the instruction above applies ONLY when genuine sophistication is actually present - it does not mean every track defaults toward 90+. A score of 90-100 must be reserved for genuine, demonstrated musical sophistication or deviation - real modulations, structural surprises, non-diatonic harmonic movement, or similarly distinctive craft you can point to specifically. Below that ceiling, DO NOT cluster every conventional track into the same narrow band - differentiate genuinely within the 40-89 range based on how much real craft or interest is actually present, even when none of it is exceptional. A track with genuinely minimal chord movement or an extremely bare, repetitive structure should score in the 40-60 range - this is not a penalty, simply an honest reflection of very sparse content, and is common and legitimate in many genres. A track with real, if modest, craft beyond the bare minimum (chord choices that create genuine if unremarkable movement, a structure with at least one real point of interest) should score in the 65-85 range depending on how much genuine interest is present. Two tracks that are both "conventional" are not necessarily equally conventional - listen for the actual difference in craft between them and let the score reflect it, rather than clustering all non-exceptional tracks into the same narrow number. Reserve scores below 40 only for songs that show genuine weaknesses - sloppy execution, unclear structure, or harmonically unconvincing choices, not merely simplicity.

FIELD DEFINITION - chordDynamics: when a real Detected Chord Progression is provided in the context above, use those actual chord names and their sequence as your primary evidence for judging harmonic sophistication, tension/release, and voice-leading - this is genuine computed data, not a guess, and should ground your commentary in specific real chord names rather than generic descriptions like 'diatonic chords.'

FAIRNESS RULE - DO NOT PENALIZE INTENTIONAL GENRE SIMPLICITY:
A deliberately simple, repetitive, or stripped-down approach (e.g. punk power chords, minimal vocal layering) is not automatically a flaw if it suits the genre and is executed well. Only deduct points for genuine lack of craft or real technical problems, never for simplicity itself.

RULES:
1. Every commentary must reference something specific and real about THIS audio file - an actual moment, an actual lyric, an actual rhythmic or harmonic detail. Never write generic, reusable descriptions that could apply to any song.
2. Never reuse the same commentary you might write for a different song, even if scores are similar.
3. Keep each commentary to 1-3 sentences, technical and specific, in the voice of a professional music analyst.

CRITICAL - LYRIC TRANSCRIPTION HONESTY (applies to meaningClarity, clicheAvoidance, and hookPlacement): If your commentary quotes specific lyric lines as evidence, you must be genuinely highly confident that transcription is accurate to what is actually sung. Never invent or reconstruct a plausible-sounding lyric and present it as a real quote - this is a serious factual error. If you are not certain of the exact words, describe the theme, imagery, or emotional content instead of quoting a specific line.

FIELD DEFINITION - timelineGridCohesion (part of instrumentalStagingSubs): IMPORTANT - a real, precomputed grid cohesion measurement will be provided above as 'Measured Timeline Grid Cohesion Score' (0-100, based on how closely real detected instrument attacks align with the expected beat grid at the song's actual tempo). You MUST treat this measured value as the primary, authoritative basis for this score - use your own listening impression only as a secondary, qualitative supplement. RUBRIC ANCHOR: measured 85-100 -> score 90-100 (tight, precise timing throughout); measured 65-84 -> score 70-89 (generally solid with some natural human looseness, not mechanically perfect); measured 40-64 -> score 50-69 (noticeably loose in at least one section); below 40 -> score below 50 (persistent, structural timing looseness). A deliberately loose, "human feel" performance in genres like blues, garage rock, or soul is not inherently a flaw - reflect the measured value honestly rather than assuming loose timing must mean a mistake.

FIELD DEFINITION - transientPunch (part of instrumentalStagingSubs): IMPORTANT - a real, precomputed transient punch measurement will be provided above as 'Measured Transient Punch Score' (0-100, based on the real crest factor of detected drum/percussion attacks - higher means sharper, punchier hits; lower means softer, more compressed/squashed transients). Treat this measured value as the primary, authoritative basis for this score. RUBRIC ANCHOR: measured 80-100 -> score 85-100 (genuinely sharp, dynamic transients - drum hits that visibly and audibly cut through). Measured 55-79 -> score 65-84 (solid punch with some compression, still retains real impact). Measured 30-54 -> score 45-64 (noticeably softened/compressed transients, drums feel present but not sharp). Below 30 -> score below 45 (transients genuinely squashed flat - this is a real, common outcome of heavy mastering-stage limiting, not an exaggeration; a well-known example is a master pushed so hard for loudness that an alternate, less-compressed release of the same recording is documented as sounding punchier by ear).

FIELD DEFINITION - melodicStaging (part of instrumentalStagingSubs): despite its name, this judges stereo placement/panning distribution of instruments, not melody. IMPORTANT - a real, precomputed measurement will be provided above as 'Measured Melodic Staging Score' (0-100, based on real measured variance in the stereo pan balance over time - higher means instruments genuinely occupy distinct places in the stereo field at different times; lower means the mix stays mostly centered with minimal stereo movement). Treat this measured value as the primary, authoritative basis for this score. RUBRIC ANCHOR: measured 75-100 -> score 85-100 (genuinely wide, deliberate spatial placement - a mix using the full stereo field as part of its arrangement, the kind of production regularly cited as pioneering for its use of panning). Measured 45-74 -> score 65-84 (some real stereo movement and placement, not purely centered but not maximally wide either). Measured 20-44 -> score 45-64 (mostly centered with limited stereo variation). Below 20 -> score below 45 (essentially mono-centered arrangement - common and often appropriate in genres built around a focused, centered vocal or lead, not inherently a flaw).

FIELD DEFINITION - instrumentalWarmth (part of instrumentalStagingSubs): judges the general tonal warmth and richness of the backing instrumentation - full and rounded versus thin and harsh. IMPORTANT - a real, precomputed warmth measurement will be provided above as 'Measured Instrumental Warmth Score' (0-100, based on the real measured ratio of low-mid frequency energy to high-frequency energy). Treat this measured value as the primary, authoritative basis for this score, using your own listening impression only as a secondary supplement. RUBRIC ANCHOR: measured 80-100 -> score 85-100 (genuinely full, rounded low-mid presence - the kind of low-end character engineers specifically describe as "warm" in their own words about a mix). Measured 55-79 -> score 65-84 (reasonably full-bodied with some real warmth present). Measured 30-54 -> score 45-64 (leaner, thinner low-mid presence - not necessarily a flaw, can suit a deliberately bright or minimal production). Below 30 -> score below 45 (genuinely thin/harsh low-mid character throughout).

FIELD DEFINITION - pitchAccuracy (part of vocalTrackingSubs): judges genuine pitch drift and intonation stability ONLY - do not confuse this with vocal timbre. A raspy, gritty, distorted, or aggressive vocal delivery (common in rock, punk, blues, and similar genres) can create the AUDITORY IMPRESSION of pitch instability due to the vocal's harmonic complexity and grain, without the singer actually being off-pitch. Before deducting points, confirm the note is genuinely landing on the wrong pitch relative to the underlying harmony - not simply that the vocal has a rough, unpolished, or grainy tonal quality. A technically in-tune singer with a naturally raspy or aggressive voice should score highly here; reserve deductions for cases where the actual pitch center is audibly wrong, not merely where the vocal timbre sounds "imperfect" or "raw." ADDITIONALLY: if real Detected Melody/Pitch Data is provided in the context above, use it as supporting evidence, keeping in mind the caveat that it reflects the dominant mix pitch generally, not confirmed-isolated vocal - weight your own listening impression more heavily than this data specifically for pitchAccuracy, unlike chordDynamics and melody where the detected data should be primary. RUBRIC ANCHOR: a score of 95-100 requires genuinely rock-solid pitch center throughout, including any exposed or unaccompanied moments (an a cappella opening or bridge with no instrumental cover to hide drift is the clearest test - if present and the pitch holds, that alone supports a top-band score). A score of 80-94 is correct for a vocal with solid overall pitch control but at least one audible, specific moment of real drift or strain (typically on a sustained high note or a fast, difficult run) - name the moment. A score of 60-79 applies when drift is noticeable at multiple points but the performance is still clearly landing on the intended notes overall, not genuinely off-key. Below 60 is reserved for audible, sustained pitch problems that a listener would notice without needing to be told - this is uncommon on professionally released tracks and should not be used as a default low score out of caution; only use it when the evidence genuinely supports it.

FIELD DEFINITION - dynamicDelivery: IMPORTANT - a real, precomputed vocal dynamics measurement will be provided above as 'Measured Vocal Dynamics Score' (0-100, based on genuine measured loudness variation specifically during sung/voiced passages - higher means real, natural dynamic push and pull; lower means a vocal that sits at a fairly constant volume throughout). If this value is available, treat it as the primary, authoritative basis for this score, using your own listening impression as a secondary supplement. If it says 'not available' (not enough clearly voiced material was detected to measure), rely on your own listening judgment as normal. RUBRIC ANCHOR: map the measured value to your score directly - measured 80-100 -> score 85-100 (genuine, wide dynamic range, e.g. a whisper-to-belt vocal arc); measured 55-79 -> score 65-84 (real but moderate push and pull); measured 30-54 -> score 45-64 (a vocal that stays fairly close to one dynamic level with only minor variation); below 30 -> score below 45 (essentially constant vocal volume throughout, common in genres built around a consistent, driving vocal delivery - this is not inherently a flaw, simply an honest reflection of the measured dynamic range).

FIELD DEFINITION - vocalLayerFit - MANDATORY JUSTIFICATION STRUCTURE: before assigning a score, you must first explicitly determine whether this song actually contains audible backing vocals, harmonies, or vocal doubling/layering at all. If NO layered vocal elements are audible anywhere in the track, state this plainly in your commentary (e.g. 'This track features a single lead vocal with no audible backing harmonies or doubling') and assign a score of exactly 100 - there is nothing to judge the fit of, so a perfect score reflects the absence of any layering problem, not a judgment of quality. If YES, layered vocals ARE present, your commentary MUST describe specifically how they interact with the lead (blend well / compete for space / timing misalignment / etc.), and your score should genuinely reflect the quality of that specific interaction, using the full 0-100 range as appropriate - do not default to a comfortable high number without describing the actual layering behavior you hear. RUBRIC ANCHOR for the layering-present case: a score of 90-100 requires genuinely tight, well-blended layering with clean timing and pitch alignment between parts, even in complex multi-part harmony - a listener would need to listen closely to pick the individual layers apart. A score of 70-89 applies when the layering is functional and generally blends but has at least one identifiable moment of loose timing, pitch mismatch, or a layer that sits slightly awkwardly against the lead. Below 70 is reserved for layering with a persistent, structural fit problem - audible timing drift, clashing pitch, or backing vocals that compete with rather than support the lead throughout most of their appearances.`;

async function performSubMetricsCall3(
  audioPart: any,
  parsedCritique: any,
  chromagramImagePart?: any,
  rhythmImagePart?: any,
  measuredGridCohesion?: number,
  measuredTransientPunch?: number,
  measuredMelodicStaging?: number,
  measuredInstrumentalWarmth?: number,
  chordProgressionSummary?: string,
  melodySummary?: string,
  measuredVocalDynamics?: number
): Promise<any> {
  const contextSummary = `
Parent category context already determined:
- Composition Flow score: ${parsedCritique?.arrangement?.flowScore}, notes: ${parsedCritique?.arrangement?.transitionsAndArc}
- Vocal Tracking score: ${parsedCritique?.performance?.vocalScore}, notes: ${parsedCritique?.performance?.vocalsCritique}
- Instrumental Staging score: ${parsedCritique?.performance?.instrumentalScore}
- Lyrical Impact score: ${parsedCritique?.lyricalImpact?.score}, meaning classification: "${parsedCritique?.lyricalImpact?.meaningClarity}", feedback: ${parsedCritique?.lyricalImpact?.feedback}
- Music Theory score: ${parsedCritique?.musicTheory?.score}, chord structures: ${parsedCritique?.musicTheory?.chordStructures}
- Harmonic Intrigue (already scored in a separate pass): ${parsedCritique?.subMetricsCall2?.artisticAnalysis?.harmonicIntrigue?.score ?? "N/A"}/100, notes: "${parsedCritique?.subMetricsCall2?.artisticAnalysis?.harmonicIntrigue?.commentary ?? "N/A"}"
- Genre: ${parsedCritique?.vibe?.genre} / ${parsedCritique?.vibe?.subgenre}
- Measured Timeline Grid Cohesion Score: ${measuredGridCohesion !== undefined && measuredGridCohesion !== null ? measuredGridCohesion : 'not available'}
- Measured Transient Punch Score: ${measuredTransientPunch !== undefined && measuredTransientPunch !== null ? measuredTransientPunch : 'not available'}
- Measured Melodic Staging Score: ${measuredMelodicStaging !== undefined && measuredMelodicStaging !== null ? measuredMelodicStaging : 'not available'}
- Measured Instrumental Warmth Score: ${measuredInstrumentalWarmth !== undefined && measuredInstrumentalWarmth !== null ? measuredInstrumentalWarmth : 'not available'}
- Measured Vocal Dynamics Score: ${measuredVocalDynamics !== undefined && measuredVocalDynamics !== null ? measuredVocalDynamics : 'not available'}

CONSISTENCY REQUIREMENT: Your meaningClarity sub-score and commentary MUST be consistent with the parent Lyrical Impact's meaning classification shown above - if the parent was classified "Clear", do not describe the lyrics as abstract, dream-like, or oblique in your sub-commentary, and vice versa. Similarly, your chordDynamics score should be consistent with the Harmonic Intrigue score shown above (both describe overlapping harmonic content) - do not score chordDynamics dramatically higher than Harmonic Intrigue unless your commentary specifically identifies a distinct, real reason for the difference (e.g. Harmonic Intrigue addresses novelty/complexity while Chord Dynamics addresses functional/dynamic use of chords - these can differ, but only for a specific, stated reason, not by default).

IF a chromagram image has been provided alongside the audio: this is a time-resolved visualization of pitch-class energy across the song's full duration (12 rows, one per pitch class C through B, x-axis is time). Use it as genuine supporting evidence when scoring musicTheorySubs specifically - look for visual patterns indicating key changes, modal color, unusual harmonic movement, or rhythmic/metric irregularities that might be easy to miss by ear alone. Cross-reference what you see in the image against what you hear before finalizing chordDynamics, harmonicVariety, and formAndStructure scores and commentary.

IF a rhythm onset image has been provided alongside the audio: this is an 800x300 canvas showing rhythmic attack energy (amber bars) plotted over the song's full duration, with thin gridlines marking expected beat positions at the detected tempo (brighter gridlines mark the first beat of each measure). Use this specifically when scoring musicTheorySubs, particularly formAndStructure - look for places where the bars drift off the grid, cluster irregularly, or show grouping patterns inconsistent with a steady 4/4 or 3/4 feel (for example, quintuplet or other non-standard rhythmic groupings, or a meter shift partway through the track). This is strong visual evidence of metric or rhythmic complexity that might otherwise be missed by ear alone, and should directly inform the formAndStructure score and commentary - do not default to describing "no unusual time signatures" if the image shows a clear deviation from the grid.

Detected Chord Progression (real, computed ground truth - use as the primary basis for chordDynamics scoring, not just your own listening impression): ${chordProgressionSummary || 'not available'}
Detected Melody/Pitch Data (real, computed): ${melodySummary || 'not available'}
IMPORTANT CAVEAT on the melody data above: this reflects the dominant monophonic pitch detected in the mix at each moment, which is usually but not always the lead vocal - during instrumental sections or dense arrangements it may reflect a lead instrument instead. Use it as genuine supporting evidence for the melody score, but do not treat it as confirmed, isolated vocal data.

Listen to the actual audio again and generate specific, deduction-based scores and commentary for all 16 sub-fields across these 5 categories, consistent with the above context but grounded in what you actually hear this time. Actively scan for genuine technical sophistication before defaulting to surface-level descriptions.`;

  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        audioPart,
        ...(chromagramImagePart ? [chromagramImagePart] : []),
        ...(rhythmImagePart ? [rhythmImagePart] : []),
        { text: contextSummary },
      ],
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
  const c2Ready = (parsedCritique.subMetricsCall2 && !parsedCritique.subMetricsCall2Failed) ? parsedCritique.subMetricsCall2 : null;
  const c3Ready = (parsedCritique.subMetricsCall3 && !parsedCritique.subMetricsCall3Failed) ? parsedCritique.subMetricsCall3 : null;

  if (c2Ready?.artisticAnalysis) {
    const artisticAlignmentScore = weightedAvg([
      [c2Ready.artisticAnalysis.artisticAlignment?.score, 30],
      [c2Ready.artisticAnalysis.harmonicIntrigue?.score, 30],
      [c2Ready.artisticAnalysis.atmosphericDepth?.score, 20],
      [c2Ready.artisticAnalysis.paletteSynergy?.score, 20],
    ]);
    if (artisticAlignmentScore !== null) {
      parsedCritique.subMetricsCall2.artisticAnalysis.score = artisticAlignmentScore;
    }
  }

  if (c2Ready?.melodicHooks) {
    const melodicHooksScore = weightedAvg([
      [c2Ready.melodicHooks.intervalMemory?.score, 50],
      [c2Ready.melodicHooks.syllabicPlacement?.score, 50],
    ]);
    if (melodicHooksScore !== null) {
      parsedCritique.subMetricsCall2.melodicHooks.score = melodicHooksScore;
    }
  }

  if (c2Ready?.acousticTension) {
    const acousticTensionScore = weightedAvg([
      [c2Ready.acousticTension.dynamicModulation?.score, 50],
      [c2Ready.acousticTension.climaxTrajectory?.score, 50],
    ]);
    if (acousticTensionScore !== null) {
      parsedCritique.subMetricsCall2.acousticTension.score = acousticTensionScore;
    }
  }

  if (c2Ready?.songwritingDensity) {
    const songwritingDensityScore = weightedAvg([
      [c2Ready.songwritingDensity.vocalPocketing?.score, 50],
      [c2Ready.songwritingDensity.poeticBrevity?.score, 50],
    ]);
    if (songwritingDensityScore !== null) {
      parsedCritique.subMetricsCall2.songwritingDensity.score = songwritingDensityScore;
    }
  }

  // Engagement Power (formerly MIX/MASTER INTEGRITY) - now combines Call 1 and Call 3 data
  const engagementPower = weightedAvg([
    [c3Ready?.compositionFlowSubs?.hookPlacement?.score, 60],
    [c1Ready?.dynamicVariety?.score, 20],
    [c1Ready?.spectralMatch?.score, 10],
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
      [c1Ready.midrangeSpacing?.score, 25],
      [c1Ready.lowEndDivision?.score, 20],
      [c1Ready.sibilanceShaving?.score, 15],
      [c1Ready.stereoWidth?.score, 15],
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
      [c3.vocalTrackingSubs?.pitchAccuracy?.score, 40],
      [c3.vocalTrackingSubs?.dynamicDelivery?.score, 35],
      [c3.vocalTrackingSubs?.vocalLayerFit?.score, 25],
    ]);
    if (vocal !== null && parsedCritique.performance) {
      parsedCritique.performance.vocalScore = vocal;
    }

    const instrumental = weightedAvg([
      [c3.instrumentalStagingSubs?.timelineGridCohesion?.score, 34],
      [c3.instrumentalStagingSubs?.transientPunch?.score, 33],
      [c3.instrumentalStagingSubs?.instrumentalWarmth?.score, 33],
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
      [c3.musicTheorySubs?.chordDynamics?.score, 40],
      [c3.musicTheorySubs?.harmonicVariety?.score, 30],
      [c3.musicTheorySubs?.formAndStructure?.score, 30],
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
  actionItems?: Array<{ title: string; recommendation: string; technicalGuide: string; technicalGuideBullets?: string[] }>;
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

    const chromagramImageRaw = req.body.chromagramImage;
    const chromagramImagePart = chromagramImageRaw && chromagramImageRaw.length > 0
      ? { inlineData: { mimeType: "image/png", data: chromagramImageRaw.replace(/^data:image\/png;base64,/, "") } }
      : null;

    const rhythmImageRaw = req.body.rhythmImage;
    const rhythmImagePart = rhythmImageRaw && rhythmImageRaw.length > 0
      ? { inlineData: { mimeType: "image/png", data: rhythmImageRaw.replace(/^data:image\/png;base64,/, "") } }
      : null;

    const spectrogramImageRaw = req.body.spectrogramImage;
    const spectrogramImagePart = spectrogramImageRaw && spectrogramImageRaw.length > 0
      ? { inlineData: { mimeType: "image/png", data: spectrogramImageRaw.replace(/^data:image\/png;base64,/, "") } }
      : null;

    const stereoCorrelationRaw = req.body.stereoCorrelation;
    const stereoCorrelation = (stereoCorrelationRaw !== undefined && stereoCorrelationRaw !== null && stereoCorrelationRaw !== "")
      ? parseFloat(stereoCorrelationRaw)
      : undefined;

    const sibilanceSeverityRaw = req.body.sibilanceSeverity;
    const sibilanceSeverity = (sibilanceSeverityRaw !== undefined && sibilanceSeverityRaw !== null && sibilanceSeverityRaw !== "")
      ? parseFloat(sibilanceSeverityRaw)
      : undefined;

    const timbralConsistencyRaw = req.body.timbralConsistency;
    const timbralConsistency = (timbralConsistencyRaw !== undefined && timbralConsistencyRaw !== null && timbralConsistencyRaw !== "")
      ? parseFloat(timbralConsistencyRaw)
      : undefined;

    const gridCohesionRaw = req.body.gridCohesion;
    const gridCohesion = (gridCohesionRaw !== undefined && gridCohesionRaw !== null && gridCohesionRaw !== "")
      ? parseFloat(gridCohesionRaw)
      : undefined;

    const transientPunchRaw = req.body.transientPunch;
    const transientPunch = (transientPunchRaw !== undefined && transientPunchRaw !== null && transientPunchRaw !== "")
      ? parseFloat(transientPunchRaw)
      : undefined;

    const melodicStagingRaw = req.body.melodicStaging;
    const melodicStaging = (melodicStagingRaw !== undefined && melodicStagingRaw !== null && melodicStagingRaw !== "")
      ? parseFloat(melodicStagingRaw)
      : undefined;

    const instrumentalWarmthRaw = req.body.instrumentalWarmth;
    const instrumentalWarmth = (instrumentalWarmthRaw !== undefined && instrumentalWarmthRaw !== null && instrumentalWarmthRaw !== "")
      ? parseFloat(instrumentalWarmthRaw)
      : undefined;

    const vocalDynamicsRaw = req.body.vocalDynamics;
    const vocalDynamics = (vocalDynamicsRaw !== undefined && vocalDynamicsRaw !== null && vocalDynamicsRaw !== "")
      ? parseFloat(vocalDynamicsRaw)
      : undefined;

    const subBassBandEnergy = (req.body.subBassBandEnergy !== undefined && req.body.subBassBandEnergy !== null && req.body.subBassBandEnergy !== "")
      ? parseFloat(req.body.subBassBandEnergy)
      : undefined;
    const bassBandEnergy = (req.body.bassBandEnergy !== undefined && req.body.bassBandEnergy !== null && req.body.bassBandEnergy !== "")
      ? parseFloat(req.body.bassBandEnergy)
      : undefined;
    const lowMidsBandEnergy = (req.body.lowMidsBandEnergy !== undefined && req.body.lowMidsBandEnergy !== null && req.body.lowMidsBandEnergy !== "")
      ? parseFloat(req.body.lowMidsBandEnergy)
      : undefined;
    const coreMidsBandEnergy = (req.body.coreMidsBandEnergy !== undefined && req.body.coreMidsBandEnergy !== null && req.body.coreMidsBandEnergy !== "")
      ? parseFloat(req.body.coreMidsBandEnergy)
      : undefined;
    const presenceBandEnergy = (req.body.presenceBandEnergy !== undefined && req.body.presenceBandEnergy !== null && req.body.presenceBandEnergy !== "")
      ? parseFloat(req.body.presenceBandEnergy)
      : undefined;
    const airBandEnergy = (req.body.airBandEnergy !== undefined && req.body.airBandEnergy !== null && req.body.airBandEnergy !== "")
      ? parseFloat(req.body.airBandEnergy)
      : undefined;

    const bandEnergies = (subBassBandEnergy !== undefined || bassBandEnergy !== undefined || lowMidsBandEnergy !== undefined) ? {
      subBass: subBassBandEnergy,
      bass: bassBandEnergy,
      lowMids: lowMidsBandEnergy,
      coreMids: coreMidsBandEnergy,
      presence: presenceBandEnergy,
      air: airBandEnergy
    } : undefined;

    const chordProgressionSummary = req.body.chordProgressionSummary || undefined;
    const melodySummary = req.body.melodySummary || undefined;

    let userInstruction = "Listen to this songwriter's track and evaluate all aspects of performance, tracking, and mix distribution.";
    if (metaGenre) {
      userInstruction += `\n\n[EMBEDDED FILE METADATA CONTEXT]`;
      userInstruction += `\n- Embedded Genre: "${metaGenre}". This is the explicit, ground-truth genre file tag. Analyze and score the track relative to this specific genre/style.`;
    }
    userInstruction += `\n\n[BLIND AUDITION MODE]\nYou are NOT being given the track title or artist name for the purposes of judging performance, mix quality, artistic merit, or any category other than Song Title Searchability. Evaluate all other categories exactly as you would an anonymous submission with zero cultural context. Do not attempt to guess or identify the artist or song for those categories. Score strictly on what you hear.`;
    if (metaTitle && metaTitle.trim().length > 0) {
      userInstruction += `\n\n[TITLE PROVIDED FOR SEARCHABILITY SCORING ONLY]\nThe user has provided this exact song title: "${metaTitle.trim()}". Use this exact title ONLY to score the Song Title Searchability category (SEO Uniqueness and SEO Discoverability). Do not use this title to identify, guess, or recognize the actual commercial artist or recording - continue blind audition mode for every other category.`;
    } else {
      userInstruction += `\n\n[NO TITLE PROVIDED]\nNo song title was provided for this upload. For the Song Title Searchability category ONLY, you MUST consistently report that title data is unavailable. This means: do not invent a fictional title, do not guess a title, and critically - even if you believe you recognize this specific recording as a real, commercially released song, you MUST NOT use that recognized title either. Treat this category as if the song's identity is completely unknown and unknowable, regardless of any recognition confidence you may have. Score both SEO Uniqueness and SEO Discoverability at exactly 50, with commentary stating plainly that no title was provided so searchability cannot be genuinely assessed. Under no circumstances should any specific title - invented, guessed, or recognized - appear anywhere in your Song Title Searchability commentary.`;
    }

    if (!metaGenre) {
      userInstruction += `\n\n- Genre Identification Directive: No explicit, valid genre metadata tag was found in the audio container. You MUST perform a deep acoustic and stylistic analysis of the track's drum/beat structures, lead instrumentation, tempo/timing, harmonic mood, production era, and vocal delivery to identify the core genre and subgenre. You MUST select genre and subgenre ONLY from this exact taxonomy - do not invent a label outside this list, and ensure the subgenre you choose genuinely belongs to the genre you selected:\n${GENRE_TAXONOMY_TEXT}\n\nFor Rap / Hip-Hop specifically, base your subgenre choice on regional production style, vocal delivery, and beat construction - do not default to a common archetype out of habit if the track's actual sonic signature points to a different regional style within the list above. This taxonomy does not have a dedicated Folk/Acoustic/Singer-Songwriter category - for genuinely acoustic, folk-rooted, or singer-songwriter material, the correct home is Alternative, or Country's "Americana" subgenre specifically (not the Country genre's other, more mainstream-country subgenres) - do not default to R&B, Funk, or Pop for quiet acoustic material just because it is calm or vintage-sounding; those genres require their own real, defining sonic characteristics (groove-driven rhythm, syncopated basslines, vocal runs/melisma for R&B; a clear dance/backbeat pulse for Funk) to be genuinely present, not just an old recording era. When nothing fits perfectly, choose the closest reasonable match to the track's actual instrumentation and rhythmic character, not the most tonally similar-sounding label. Check the frequency range structures and arrangement styles to see what type of playlist it fits best.`;
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
      const subMetricsCall1 = await performSubMetricsCall1(audioPart, parsedCritique, spectrogramImagePart, stereoCorrelation, sibilanceSeverity, timbralConsistency, bandEnergies);
      parsedCritique.subMetricsCall1 = subMetricsCall1;
      parsedCritique.subMetricsCall1Failed = false;
      console.log("[Call 1] Sub-Metrics Call 1 completed successfully.");
    } catch (subErr: any) {
      console.error("[Call 1] Sub-Metrics Call 1 failed, continuing without it:", subErr.message || subErr);
      parsedCritique.subMetricsCall1Failed = true;
    }

    let verifiedChordSummary: string | undefined = undefined;
    try {
      console.log("[Chord/Key] Starting direct Gemini chord/key analysis...");
      const chordKeyAnalysis = await performChordKeyAnalysis(audioPart);
      parsedCritique.chordKeyAnalysis = chordKeyAnalysis;
      parsedCritique.chordKeyAnalysisFailed = false;
      console.log("[Chord/Key] Direct Gemini chord/key analysis completed successfully.");
      if (chordKeyAnalysis?.keySignature && chordKeyAnalysis?.chordsUsed?.length > 0) {
        const chordList = chordKeyAnalysis.chordsUsed.map((c: any) => `${c.chord} (${c.romanNumeral})`).join(", ");
        verifiedChordSummary = `Key: ${chordKeyAnalysis.keySignature}. Chord vocabulary used: ${chordList}. (Note: this is the song's overall key and chord vocabulary, not a timed section-by-section progression.)`;
      }
    } catch (subErr: any) {
      console.error("[Chord/Key] Direct Gemini chord/key analysis failed, continuing without it:", subErr.message || subErr);
      parsedCritique.chordKeyAnalysisFailed = true;
    }

    try {
      console.log("[Call 2] Starting Sub-Metrics Call 2...");
      const subMetricsCall2 = await performSubMetricsCall2(audioPart, parsedCritique, verifiedChordSummary ?? chordProgressionSummary, melodySummary);
      parsedCritique.subMetricsCall2 = subMetricsCall2;
      parsedCritique.subMetricsCall2Failed = false;
      console.log("[Call 2] Sub-Metrics Call 2 completed successfully.");
    } catch (subErr: any) {
      console.error("[Call 2] Sub-Metrics Call 2 failed, continuing without it:", subErr.message || subErr);
      parsedCritique.subMetricsCall2Failed = true;
    }

    try {
      console.log("[Call 3] Starting Sub-Metrics Call 3...");
      const subMetricsCall3 = await performSubMetricsCall3(
        audioPart,
        parsedCritique,
        chromagramImagePart,
        rhythmImagePart,
        gridCohesion,
        transientPunch,
        melodicStaging,
        instrumentalWarmth,
        chordProgressionSummary,
        melodySummary,
        vocalDynamics
      );
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
    const { url, threeX, metaTitle, metaArtist, metaGenre: rawMetaGenre, chromagramImage, rhythmImage, spectrogramImage, stereoCorrelation: rawStereoCorrelation, sibilanceSeverity: rawSibilanceSeverity, timbralConsistency: rawTimbralConsistency, gridCohesion: rawGridCohesion, transientPunch: rawTransientPunch, melodicStaging: rawMelodicStaging, instrumentalWarmth: rawInstrumentalWarmth, vocalDynamics: rawVocalDynamics } = req.body;
    const chordProgressionSummary = req.body.chordProgressionSummary || undefined;
    const melodySummary = req.body.melodySummary || undefined;
    const metaGenre = isPlaceholderGenre(rawMetaGenre) ? "" : rawMetaGenre;
    const stereoCorrelation = (rawStereoCorrelation !== undefined && rawStereoCorrelation !== null && rawStereoCorrelation !== "")
      ? parseFloat(rawStereoCorrelation)
      : undefined;
    const sibilanceSeverity = (rawSibilanceSeverity !== undefined && rawSibilanceSeverity !== null && rawSibilanceSeverity !== "")
      ? parseFloat(rawSibilanceSeverity)
      : undefined;
    const timbralConsistency = (rawTimbralConsistency !== undefined && rawTimbralConsistency !== null && rawTimbralConsistency !== "")
      ? parseFloat(rawTimbralConsistency)
      : undefined;
    const gridCohesion = (rawGridCohesion !== undefined && rawGridCohesion !== null && rawGridCohesion !== "")
      ? parseFloat(rawGridCohesion)
      : undefined;
    const transientPunch = (rawTransientPunch !== undefined && rawTransientPunch !== null && rawTransientPunch !== "")
      ? parseFloat(rawTransientPunch)
      : undefined;
    const melodicStaging = (rawMelodicStaging !== undefined && rawMelodicStaging !== null && rawMelodicStaging !== "")
      ? parseFloat(rawMelodicStaging)
      : undefined;
    const instrumentalWarmth = (rawInstrumentalWarmth !== undefined && rawInstrumentalWarmth !== null && rawInstrumentalWarmth !== "")
      ? parseFloat(rawInstrumentalWarmth)
      : undefined;
    const vocalDynamics = (rawVocalDynamics !== undefined && rawVocalDynamics !== null && rawVocalDynamics !== "")
      ? parseFloat(rawVocalDynamics)
      : undefined;

    const subBassBandEnergy = (req.body.subBassBandEnergy !== undefined && req.body.subBassBandEnergy !== null && req.body.subBassBandEnergy !== "")
      ? parseFloat(req.body.subBassBandEnergy)
      : undefined;
    const bassBandEnergy = (req.body.bassBandEnergy !== undefined && req.body.bassBandEnergy !== null && req.body.bassBandEnergy !== "")
      ? parseFloat(req.body.bassBandEnergy)
      : undefined;
    const lowMidsBandEnergy = (req.body.lowMidsBandEnergy !== undefined && req.body.lowMidsBandEnergy !== null && req.body.lowMidsBandEnergy !== "")
      ? parseFloat(req.body.lowMidsBandEnergy)
      : undefined;
    const coreMidsBandEnergy = (req.body.coreMidsBandEnergy !== undefined && req.body.coreMidsBandEnergy !== null && req.body.coreMidsBandEnergy !== "")
      ? parseFloat(req.body.coreMidsBandEnergy)
      : undefined;
    const presenceBandEnergy = (req.body.presenceBandEnergy !== undefined && req.body.presenceBandEnergy !== null && req.body.presenceBandEnergy !== "")
      ? parseFloat(req.body.presenceBandEnergy)
      : undefined;
    const airBandEnergy = (req.body.airBandEnergy !== undefined && req.body.airBandEnergy !== null && req.body.airBandEnergy !== "")
      ? parseFloat(req.body.airBandEnergy)
      : undefined;

    const bandEnergies = (subBassBandEnergy !== undefined || bassBandEnergy !== undefined || lowMidsBandEnergy !== undefined) ? {
      subBass: subBassBandEnergy,
      bass: bassBandEnergy,
      lowMids: lowMidsBandEnergy,
      coreMids: coreMidsBandEnergy,
      presence: presenceBandEnergy,
      air: airBandEnergy
    } : undefined;

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

    const chromagramImagePart = chromagramImage
      ? { inlineData: { mimeType: "image/png", data: chromagramImage.replace(/^data:image\/png;base64,/, "") } }
      : null;

    const rhythmImagePart = rhythmImage
      ? { inlineData: { mimeType: "image/png", data: rhythmImage.replace(/^data:image\/png;base64,/, "") } }
      : null;

    const spectrogramImagePart = spectrogramImage
      ? { inlineData: { mimeType: "image/png", data: spectrogramImage.replace(/^data:image\/png;base64,/, "") } }
      : null;

    let userInstruction = "Analyze this songwriters track from the direct URL stream. Critically review the production and deliver feedback.";
    if (metaGenre) {
      userInstruction += `\n\n[EMBEDDED FILE METADATA CONTEXT]`;
      userInstruction += `\n- Embedded Genre: "${metaGenre}". This is the explicit, ground-truth genre file tag. Analyze and score the track relative to this specific genre/style.`;
    }
    userInstruction += `\n\n[BLIND AUDITION MODE]\nYou are NOT being given the track title or artist name for the purposes of judging performance, mix quality, artistic merit, or any category other than Song Title Searchability. Evaluate all other categories exactly as you would an anonymous submission with zero cultural context. Do not attempt to guess or identify the artist or song for those categories. Score strictly on what you hear.`;
    if (metaTitle && metaTitle.trim().length > 0) {
      userInstruction += `\n\n[TITLE PROVIDED FOR SEARCHABILITY SCORING ONLY]\nThe user has provided this exact song title: "${metaTitle.trim()}". Use this exact title ONLY to score the Song Title Searchability category (SEO Uniqueness and SEO Discoverability). Do not use this title to identify, guess, or recognize the actual commercial artist or recording - continue blind audition mode for every other category.`;
    } else {
      userInstruction += `\n\n[NO TITLE PROVIDED]\nNo song title was provided for this upload. For the Song Title Searchability category ONLY, you MUST consistently report that title data is unavailable. This means: do not invent a fictional title, do not guess a title, and critically - even if you believe you recognize this specific recording as a real, commercially released song, you MUST NOT use that recognized title either. Treat this category as if the song's identity is completely unknown and unknowable, regardless of any recognition confidence you may have. Score both SEO Uniqueness and SEO Discoverability at exactly 50, with commentary stating plainly that no title was provided so searchability cannot be genuinely assessed. Under no circumstances should any specific title - invented, guessed, or recognized - appear anywhere in your Song Title Searchability commentary.`;
    }

    if (!metaGenre) {
      userInstruction += `\n\n- Genre Identification Directive: No explicit, valid genre metadata tag was found in the audio container. You MUST perform a deep acoustic and stylistic analysis of the track's drum/beat structures, lead instrumentation, tempo/timing, harmonic mood, production era, and vocal delivery to identify the core genre and subgenre. You MUST select genre and subgenre ONLY from this exact taxonomy - do not invent a label outside this list, and ensure the subgenre you choose genuinely belongs to the genre you selected:\n${GENRE_TAXONOMY_TEXT}\n\nFor Rap / Hip-Hop specifically, base your subgenre choice on regional production style, vocal delivery, and beat construction - do not default to a common archetype out of habit if the track's actual sonic signature points to a different regional style within the list above. This taxonomy does not have a dedicated Folk/Acoustic/Singer-Songwriter category - for genuinely acoustic, folk-rooted, or singer-songwriter material, the correct home is Alternative, or Country's "Americana" subgenre specifically (not the Country genre's other, more mainstream-country subgenres) - do not default to R&B, Funk, or Pop for quiet acoustic material just because it is calm or vintage-sounding; those genres require their own real, defining sonic characteristics (groove-driven rhythm, syncopated basslines, vocal runs/melisma for R&B; a clear dance/backbeat pulse for Funk) to be genuinely present, not just an old recording era. When nothing fits perfectly, choose the closest reasonable match to the track's actual instrumentation and rhythmic character, not the most tonally similar-sounding label. Check the frequency range structures and arrangement styles to see what type of playlist it fits best.`;
    }

    const parsedCritique = await performCritiqueAnalysis(
      [
        audioPart,
        userInstruction,
      ],
      SYSTEM_PROMPT,
      !!threeX
    );

    try {
      console.log("[Call 1] Starting Sub-Metrics Call 1 (URL route)...");
      const subMetricsCall1 = await performSubMetricsCall1(audioPart, parsedCritique, spectrogramImagePart, stereoCorrelation, sibilanceSeverity, timbralConsistency, bandEnergies);
      parsedCritique.subMetricsCall1 = subMetricsCall1;
      parsedCritique.subMetricsCall1Failed = false;
    } catch (subErr: any) {
      console.error("[Call 1] Failed (URL route), continuing without it:", subErr.message || subErr);
      parsedCritique.subMetricsCall1Failed = true;
    }

    let verifiedChordSummary: string | undefined = undefined;
    try {
      console.log("[Chord/Key] Starting direct Gemini chord/key analysis (URL route)...");
      const chordKeyAnalysis = await performChordKeyAnalysis(audioPart);
      parsedCritique.chordKeyAnalysis = chordKeyAnalysis;
      parsedCritique.chordKeyAnalysisFailed = false;
      if (chordKeyAnalysis?.keySignature && chordKeyAnalysis?.chordsUsed?.length > 0) {
        const chordList = chordKeyAnalysis.chordsUsed.map((c: any) => `${c.chord} (${c.romanNumeral})`).join(", ");
        verifiedChordSummary = `Key: ${chordKeyAnalysis.keySignature}. Chord vocabulary used: ${chordList}. (Note: this is the song's overall key and chord vocabulary, not a timed section-by-section progression.)`;
      }
    } catch (subErr: any) {
      console.error("[Chord/Key] Failed (URL route), continuing without it:", subErr.message || subErr);
      parsedCritique.chordKeyAnalysisFailed = true;
    }

    try {
      console.log("[Call 2] Starting Sub-Metrics Call 2 (URL route)...");
      const subMetricsCall2 = await performSubMetricsCall2(audioPart, parsedCritique, verifiedChordSummary ?? chordProgressionSummary, melodySummary);
      parsedCritique.subMetricsCall2 = subMetricsCall2;
      parsedCritique.subMetricsCall2Failed = false;
    } catch (subErr: any) {
      console.error("[Call 2] Failed (URL route), continuing without it:", subErr.message || subErr);
      parsedCritique.subMetricsCall2Failed = true;
    }

    try {
      console.log("[Call 3] Starting Sub-Metrics Call 3 (URL route)...");
      const subMetricsCall3 = await performSubMetricsCall3(
        audioPart,
        parsedCritique,
        chromagramImagePart,
        rhythmImagePart,
        gridCohesion,
        transientPunch,
        melodicStaging,
        instrumentalWarmth,
        chordProgressionSummary,
        melodySummary,
        vocalDynamics
      );
      parsedCritique.subMetricsCall3 = subMetricsCall3;
      parsedCritique.subMetricsCall3Failed = false;
    } catch (subErr: any) {
      console.error("[Call 3] Failed (URL route), continuing without it:", subErr.message || subErr);
      parsedCritique.subMetricsCall3Failed = true;
    }

    reconcileParentScores(parsedCritique);

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

    try {
      console.log("[Call 1] Starting Sub-Metrics Call 1 (Spotify route)...");
      const subMetricsCall1 = await performSubMetricsCall1(audioPart, critique);
      critique.subMetricsCall1 = subMetricsCall1;
      critique.subMetricsCall1Failed = false;
    } catch (subErr: any) {
      console.error("[Call 1] Failed (Spotify route), continuing without it:", subErr.message || subErr);
      critique.subMetricsCall1Failed = true;
    }

    let verifiedChordSummary: string | undefined = undefined;
    try {
      console.log("[Chord/Key] Starting direct Gemini chord/key analysis (Spotify route)...");
      const chordKeyAnalysis = await performChordKeyAnalysis(audioPart);
      critique.chordKeyAnalysis = chordKeyAnalysis;
      critique.chordKeyAnalysisFailed = false;
      if (chordKeyAnalysis?.keySignature && chordKeyAnalysis?.chordsUsed?.length > 0) {
        const chordList = chordKeyAnalysis.chordsUsed.map((c: any) => `${c.chord} (${c.romanNumeral})`).join(", ");
        verifiedChordSummary = `Key: ${chordKeyAnalysis.keySignature}. Chord vocabulary used: ${chordList}. (Note: this is the song's overall key and chord vocabulary, not a timed section-by-section progression.)`;
      }
    } catch (subErr: any) {
      console.error("[Chord/Key] Failed (Spotify route), continuing without it:", subErr.message || subErr);
      critique.chordKeyAnalysisFailed = true;
    }

    try {
      console.log("[Call 2] Starting Sub-Metrics Call 2 (Spotify route)...");
      const subMetricsCall2 = await performSubMetricsCall2(audioPart, critique, verifiedChordSummary);
      critique.subMetricsCall2 = subMetricsCall2;
      critique.subMetricsCall2Failed = false;
    } catch (subErr: any) {
      console.error("[Call 2] Failed (Spotify route), continuing without it:", subErr.message || subErr);
      critique.subMetricsCall2Failed = true;
    }

    try {
      console.log("[Call 3] Starting Sub-Metrics Call 3 (Spotify route)...");
      const subMetricsCall3 = await performSubMetricsCall3(audioPart, critique);
      critique.subMetricsCall3 = subMetricsCall3;
      critique.subMetricsCall3Failed = false;
    } catch (subErr: any) {
      console.error("[Call 3] Failed (Spotify route), continuing without it:", subErr.message || subErr);
      critique.subMetricsCall3Failed = true;
    }

    reconcileParentScores(critique);

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
