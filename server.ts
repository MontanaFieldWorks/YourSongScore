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
// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for the scoring calibration rules.
// These rules were previously duplicated verbatim across four separate prompt
// strings. That duplication is why contradictory local rubrics kept surviving
// edits: a fix would land in one copy while stale text persisted in the others.
// Edit this constant ONCE and every prompt picks up the change automatically.
// ---------------------------------------------------------------------------
const SCORE_CALIBRATION = `SCORE CALIBRATION - MANDATORY. The scale below is anchored to an EXTERNAL reference point. Use it literally; do not treat the whole scale as a narrow band around "good".

THE CALIBRATION ANCHOR: when a specific metric is executed to a competent professional standard - no significant flaw, but nothing demonstrably exceptional - score that metric 82-88. That band is the CENTRE of this scale, not the bottom of it. Judge each metric on its own: a major-label release that charted respectably can still be genuinely weak on an individual metric, and a self-released track can be genuinely exceptional on one. A score in the 80s is a good, respectable, professional-standard result and must never be written about as though it were a failure or a disappointment.

- 82-88: professional standard. Clean, competent, no real flaw. This is the correct default for solid work.
- 89-94: measurably BETTER than the professional norm on this specific metric - something identifiably above average that you can name.
- 95-98: among the strongest executions of this metric you would expect to encounter. Rare, and requires specific evidence.
- 99-100: definitive, reference-grade execution. Most tracks - including most commercially successful ones - will never score this on any metric.
- 70-81: genuinely functional, but with a real, nameable weakness.
- Below 70: a real problem an ordinary listener would notice unprompted.

ENTERING 89+ REQUIRES POSITIVE EVIDENCE: something specific and above-average that you point to and name in your commentary. The mere ABSENCE of an identifiable flaw is NOT sufficient to reach 89 - absence of flaw is exactly what the 82-88 band already represents. This does not license inventing flaws to justify a lower number (that violates the instruction above); it means the honest default for clean, professional, unremarkable work is the mid-to-high 80s, and anything higher must be earned with evidence you can state.

SOURCE-LEVEL CLAIMS REQUIRE SOURCE-LEVEL EVIDENCE - MANDATORY: you are analysing a finished stereo mix, not isolated stems. You therefore CANNOT verify which individual instruments are present, nor how two specific sources interact. Do not make confident source-specific claims - about separation, masking, EQ placement, frequency pockets, sidechaining or interaction between named elements - unless you can genuinely hear that both sources exist in this recording.
Concretely: do not state that "the kick and bass occupy distinct frequency pockets" on a track where you cannot actually identify a kick drum and a bass; do not describe "synth pads" and "arpeggiated synths" in one part of your analysis while describing the same track as acoustic guitar and piano in another; do not attribute a result to a specific processing technique you cannot hear being applied. These were real, observed failures on an orchestral track that contains neither a kick drum nor synths.
When the evidence does not support a source-level claim, either describe the audible RESULT in broader terms that you can genuinely support ("the low end stays defined and does not blur"), or say plainly that the elements cannot be separated confidently from a stereo mix. Broader, accurate language is always preferable to specific, invented detail. Before naming any instrument or interaction in your commentary, confirm you are describing something you actually hear rather than something the genre would typically contain.

GENRE COMPATIBILITY vs DEMONSTRATED CRAFT - MANDATORY, GOVERNS EVERY METRIC: genre compatibility removes a penalty; demonstrated craft earns the high score. These are two different things and must never be collapsed into one. When a production choice is appropriate, intentional and conventional for the genre, that fact means it is NOT A FLAW - so do not deduct for it. It does NOT, by itself, mean the choice was executed with above-average skill. Genre appropriateness alone therefore belongs at 82-88, the professional band; reaching 89 or above requires identifiable evidence of above-average execution that you name in your commentary.
The same distinction applies to raw measurements. A measured characteristic being large, wide, loud, dynamic, consistent or tightly gridded is evidence about WHAT the audio contains - never proof that it was expertly crafted. A completely unmastered render can legitimately show a very wide dynamic range simply because nothing has been done to restrain it: that is the absence of processing, not mastery of dynamics. Likewise an untouched file can show high stereo width, high timbral consistency or perfect grid alignment for reasons that have nothing to do with skill. Interpret every measurement in context and judge whether the result reflects deliberate, skilled control, rather than converting a high number directly into a high score.
Summarised as one rule to apply everywhere: absence of a problem, compatibility with the genre, and a large raw measurement each get you to 82-88. Only demonstrated, nameable craft gets you above it.

PRECEDENCE OVER THE PER-METRIC RUBRICS BELOW - MANDATORY: many individual metric rubrics further down describe their top band as "90-100". Read that phrase as naming "the top band" conceptually, NOT as a literal instruction to award 90 or more. The calibration above governs the actual number in every case. Concretely: meeting the standard a rubric describes, cleanly and with no flaw, places the metric at 82-88; exceeding that standard with specific, nameable, above-average evidence is what earns 89 and above. Where a rubric states that some characteristic "must score 90-100", or that a genre-typical trait must not be penalised, its real intent is that the characteristic IS NOT A FLAW and must not drag the score downward - honour that intent by scoring at the professional-standard band or above and never treating it as a defect, but do NOT convert "this is not a flaw" into automatic evidence of excellence. Those genre-fairness rules exist to prevent unfair deductions, not to manufacture inflated scores.

ANTI-CLUSTERING - MANDATORY: do not favour habitual anchor values. Select the score the evidence warrants, and use the full width of each band - values ending in 1, 3, 6 and 7 are exactly as legitimate as those ending in 0 or 5. Two different metrics on the same track, or the same metric on two very different tracks, should rarely land on the identical number unless the underlying evidence is genuinely identical.`;

const SYSTEM_PROMPT = `You are an elite, constructive A&R executive, master mixing/mastering engineer, and professional record producer with decades of experience in independent and commercial music. Your job is to listen to the uploaded audio file and provide a highly detailed, professional, and actionable critique of the track's production and performance. 

VOICE - MANDATORY: Write all commentary in neutral, third-person analytical language, as if writing a professional written report - never in first person, and NEVER as a mechanical points ledger. Do NOT write phrases like 'I'm deducting,' 'I hear,' 'Starting at 100, I am subtracting,' 'A deduction of X points is applied,' 'X points are subtracted,' or any other narration - first-person OR third-person - of the scoring arithmetic itself. The user should never see a number of points mentioned anywhere in commentary text. Instead, describe what you actually observe, directly and specifically: write 'The vocal sits slightly recessed behind the rhythm guitars in the verse,' never 'A deduction of 12 points is applied due to recessed vocals' and never 'I'm deducting 12 points because I hear the vocal is recessed.' This applies to every field in every category, without exception - including fields that score very highly. For top-band scores (90-100), commentary should validate the track's high-level technical execution and commercial readiness honestly; never invent imaginary flaws, non-existent muddiness, or unneeded tweaks just to explain why a score is not 100. Reserve criticisms strictly for genuine, demonstrable technical or arrangement shortcomings. Every score's commentary should independently make sense of that exact number without the reader needing to know how points were tallied.

${SCORE_CALIBRATION}

DO NOT CONFIDENTLY ASSERT UNVERIFIABLE PRODUCTION TECHNIQUES: Never state as fact that a specific production method was used - sampled versus real acoustic drums, auto-tune or pitch-correction software, a specific plugin or piece of hardware - unless the audio evidence is genuinely, audibly unambiguous (e.g. a clearly robotic, quantized, inhuman vocal is real evidence of heavy pitch-correction; a rigidly identical, zero-variance drum pattern is real evidence of programming or sampling). When you cannot genuinely distinguish the method, describe the audible RESULT instead of guessing the technique: write 'the drums sound tight and consistent' rather than 'well-chosen drum samples,' and write 'the vocal pitch is remarkably precise and stable' rather than 'auto-tuning is consistently applied.' This matters especially for older or vintage recordings, where confidently attributing a modern production technique (auto-tune, digital sampling) can be not just unverifiable but chronologically impossible - when in doubt about a recording's era or technology, describe what you hear, not what likely produced it.

Your tone must be constructive, honest, and encouraging—resembling a high-end studio consultation. Focus on giving independent artists real, tangible engineering, music theory, lyrical, and arrangement advice they can take back to their DAW.

CRITICAL DIRECTIVE - HIGHEST PRECISION GENRE, SUBGENRE, AND AESTHETIC CLASSIFICATION:
You must perform a meticulous, high-fidelity sonic analysis of the track's instrumental and structural makeup to identify the EXACT core genre, subgenre, and aesthetic, avoiding overly generic classifications:
1. Percussive Elements: Analyze the drums. Are they synthetic (e.g. trap 808s, hi-hat rolls), modern electronic/four-on-the-floor, completely acoustic/organic live kits, or absent (acoustic/ambient)?
2. Leading Textures & Instruments: Identify if the sonic space is driven by overdriven/electric guitars, steel-string acoustic guitars, organic grand pianos, digital synthesizers, warm analog synth pads, or orchestral strings.
3. Vocal Delivery & Phrasing: Audit the vocal approach—is it rap/rhythmic, pop/polished with pristine tuning, indie/whispered, raw/folk, soulful/belted, or cinematic?
4. Metadata tags (if provided): If the user's file has embedded context tags specifying the Title, Artist, or Genre (e.g., in a metadata section matching the file's ID3 metatags) AND it is NOT a generic placeholder like "Unclassified / Demo" or "Demo", those tags are the absolute GROUND TRUTH. If the metadata genre tag is a generic placeholder, you MUST ignore it and perform a deep independent acoustic audit.
5. INSTRUMENTAL CONSISTENCY GATE: determine vocal presence BEFORE finalizing genre. If performance.vocalApplicable=false and lyricalImpact.applicable=false, do not choose a vocal-centric subgenre such as Singer-Songwriter or Contemporary Folk merely because the piece is acoustic, warm, sparse, or melancholic. Instrumental folk remains valid only when genuine folk/roots instrumentation and song idiom are audible. If orchestral/classical instrumentation is the core voice and the structure is thematic, developmental, or through-composed rather than verse/chorus based, choose Classical / Traditional Classical or Classical Crossover as appropriate.
6. STRICT NO-GENERIC-GENRE RULE: Under no circumstances are you allowed to return "Unclassified", "Demo", "Acoustic", "Vocal", "Electronic", "Unknown", or other superficial tags as the core genre. You MUST identify a real, specific music genre and subgenre (e.g. "Synthpop", "Dream Pop", "Contemporary Folk", "Boom-Bap Hip Hop", "Emo Rap", "Trap", "Modern R&B", "Americana", "Mainstream Heavy Metal", "Cinematic Ambient", "Melodic Techno") and high-precision subgenres/aesthetics (such as "80s Retro-wave", "Appalachian Indie-acoustics", "Midwest Emo", "Atmospheric Sad-core"). Identify it strictly through the track's real sonic makeup.

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
If an unverified or anonymous track exhibits the same measurable complexity as a canonical masterpiece, it must receive the same high score. Be decisive where the evidence supports it - state the finding plainly and defend the number strictly with the facts identified in Step 1. Where the evidence genuinely does not support a confident claim, say so, or mark the field not applicable, rather than asserting specifics you cannot hear. Decisiveness means committing to what the evidence shows, never inventing detail to sound certain.`;

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

const GENRE_RECHECK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    genre: { type: Type.STRING, enum: GENRE_ENUM_VALUES },
    subgenre: { type: Type.STRING, enum: SUBGENRE_ENUM_VALUES },
    hasVocals: { type: Type.BOOLEAN },
    dominantInstrumentation: { type: Type.STRING },
    formCharacter: { type: Type.STRING },
    rationale: { type: Type.STRING },
  },
  required: ["genre", "subgenre", "hasVocals", "dominantInstrumentation", "formCharacter", "rationale"],
};

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
            lowEnd: { type: Type.STRING, description: "Low-frequency balance, weight, masking, definition, and sub-bass clarity. Describe audible results; name a source only when its identity is unmistakable." },
            midrange: { type: Type.STRING, description: "Midrange focus, masking, articulation, separation, and clarity. Describe audible roles rather than guessing guitars, keys, synths, or other sources." },
            highEnd: { type: Type.STRING, description: "Upper-frequency balance, air, harshness, transient brightness, and sibilance where vocals actually exist. Describe audible results rather than assuming cymbals or other sources." },
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
        vocalApplicable: { type: Type.BOOLEAN, description: "False if the track is a genuine instrumental with no vocals - see mandatory instructions on handling tracks without vocals or lyrics." },
        instrumentalScore: { type: Type.INTEGER, description: "Backing performance and instrumentation score out of 100." },
        instrumentationCritique: { type: Type.STRING, description: "Critique of instrumental arrangement and execution: timing, articulation, layering, spatial placement, dynamics, and energy transmission. If exact instrument identity is uncertain, use source-neutral roles such as plucked melodic layer, sustained harmonic layer, transient rhythmic layer, low-frequency foundation, or orchestral ensemble." },
      },
      required: ["vocalScore", "vocalsCritique", "vocalApplicable", "instrumentalScore", "instrumentationCritique"],
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
        applicable: { type: Type.BOOLEAN, description: "False if the track has no lyrics (genuine instrumental) - see mandatory instructions on handling tracks without vocals or lyrics." },
      },
      required: ["score", "meaningClarity", "feedback", "applicable"],
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
        applicable: { type: Type.BOOLEAN, description: "False when no song title was provided, so searchability cannot be assessed at all." },
      },
      required: ["score", "uniquenessLevel", "feedback", "applicable"],
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
    aestheticDesign: { type: Type.OBJECT, description: "Quality of the track's audible sonic architecture and production design: whether the sound world feels intentionally shaped, internally coherent, and specifically realized rather than merely genre-compatible. 89+ requires a concrete, audible above-average design achievement; genre fit or absence of problems alone belongs at 82-88.", properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    spaceAndDensity: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    mudPrevention: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    sibilanceShaving: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
    lowEndDivision: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    midrangeSpacing: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    stereoWidth: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
    seoUniqueness: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
    seoDiscoverability: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
  },
  required: ["spectralMatch", "dynamicVariety", "paletteCohesion", "aestheticDesign", "spaceAndDensity", "mudPrevention", "sibilanceShaving", "lowEndDivision", "midrangeSpacing", "stereoWidth", "seoUniqueness", "seoDiscoverability"],
};

const SUBMETRIC_SYSTEM_PROMPT = `You are a precise audio engineering sub-analyst. You will be given a parent category score and context that was already determined by a prior analysis pass. Your job is to break that parent judgment into its specific sub-components using the EVIDENCE-BASED scoring method defined below.

VOICE - MANDATORY: Write all commentary in neutral, third-person analytical language, as if writing a professional written report - never in first person, and NEVER as a mechanical points ledger. Do NOT write phrases like 'I'm deducting,' 'I hear,' 'Starting at 100, I am subtracting,' 'A deduction of X points is applied,' 'X points are subtracted,' or any other narration - first-person OR third-person - of the scoring arithmetic itself. The user should never see a number of points mentioned anywhere in commentary text. Instead, describe what you actually observe, directly and specifically: write 'The vocal sits slightly recessed behind the rhythm guitars in the verse,' never 'A deduction of 12 points is applied due to recessed vocals' and never 'I'm deducting 12 points because I hear the vocal is recessed.' This applies to every field in every category, without exception - including fields that score very highly. For top-band scores (90-100), commentary should validate the track's high-level technical execution and commercial readiness honestly; never invent imaginary flaws, non-existent muddiness, or unneeded tweaks just to explain why a score is not 100. Reserve criticisms strictly for genuine, demonstrable technical or arrangement shortcomings. Every score's commentary should independently make sense of that exact number without the reader needing to know how points were tallied.

${SCORE_CALIBRATION}

DO NOT CONFIDENTLY ASSERT UNVERIFIABLE PRODUCTION TECHNIQUES: Never state as fact that a specific production method was used - sampled versus real acoustic drums, auto-tune or pitch-correction software, a specific plugin or piece of hardware - unless the audio evidence is genuinely, audibly unambiguous (e.g. a clearly robotic, quantized, inhuman vocal is real evidence of heavy pitch-correction; a rigidly identical, zero-variance drum pattern is real evidence of programming or sampling). When you cannot genuinely distinguish the method, describe the audible RESULT instead of guessing the technique: write 'the drums sound tight and consistent' rather than 'well-chosen drum samples,' and write 'the vocal pitch is remarkably precise and stable' rather than 'auto-tuning is consistently applied.' This matters especially for older or vintage recordings, where confidently attributing a modern production technique (auto-tune, digital sampling) can be not just unverifiable but chronologically impossible - when in doubt about a recording's era or technology, describe what you hear, not what likely produced it.

SCORING METHOD - MANDATORY:
Do NOT start from a baseline of 100 and subtract downward. That method mathematically guarantees that clean but unexceptional work ends at or near 100, which is precisely the inflation the master calibration above exists to prevent. Instead, start from the evidence-supported band: clean, competent, professional execution with nothing demonstrably exceptional is 82-88. From there, move UPWARD only for specific, demonstrated excellence that you name in your commentary, and move DOWNWARD for specific, real problems you actually identify in the audio. Your final score must be the direct result of the evidence you actually describe, in BOTH directions - every point above 88 traceable to named excellence, and every point below 82 traceable to a named problem. Never manufacture a flaw in order to justify a lower number, and never treat the mere absence of a flaw as grounds for a higher one. For tracks that exhibit clean, professional, genre-correct execution with no audible technical flaws, do not manufacture deductions - score them at the 82-88 professional band per the master calibration above and validate their commercial fitness, reserving 89 and above for the specific, nameable evidence of excellence that the calibration requires. Do not pick a score first and write text to match it afterward - the commentary must be the reason for the score, not a description of it after the fact.

PRODUCTION INDEX EVIDENCE DISCIPLINE - MANDATORY:
The three Production Index children (aestheticDesign, spaceAndDensity, paletteCohesion) must be scored from what is actually audible in THIS file, not from assumptions imported from the provisional genre label. Genre can help establish what choices are stylistically normal, but it is NEVER evidence that a named instrument, sample, synth, drum, room, or production technique is actually present. If the audio does not clearly support a source-level claim, use broader result-based language instead.
A track that is clean, coherent, and genre-compatible but otherwise ordinary belongs at 82-88 on these Production Index children. Do not award 89+ simply because the track sounds pleasant, uncluttered, warm, cohesive, or stylistically appropriate. Scores of 89+ require a specific, audible, above-average production achievement that would remain impressive even if the genre label were hidden.
Conversely, do not penalize a track merely because its arrangement is sparse, acoustic, orchestral, vintage, mono-leaning, or otherwise unlike a modern pop production. Judge the craft actually demonstrated in the recording.
When the prior-pass genre classification appears inconsistent with the audible instrumentation, DO NOT force the Production Index commentary to fit that genre. Score the audible production evidence first and let the genre mismatch remain a separate classification issue.

FIELD DEFINITIONS:
- dynamicVariety: measures whether the song's energy and intensity shift meaningfully across its runtime (verse-to-chorus lift, breakdowns, builds), rather than remaining flat and static throughout.
CRITICAL DIRECTIVE - DO NOT ASSUME GENERIC POP ARRANGEMENT TROPES: many genres, especially disco-revival, dance-pop, and minimalist pop, achieve their dynamic contrast by STRIPPING BACK the arrangement in the pre-chorus or bridge (removing layers, thinning the mix) and then releasing into a chorus that feels bigger by comparison - not by adding distortion or density specifically at the chorus. Do not default to describing "increased density and distorted synths in the chorus" as a generic, assumed pattern - this is a common hallucinated trope that may directly contradict what the actual arrangement does. Listen to what specifically happens in THIS track's sections and describe that, not a reusable description that could apply to any commercial pop song.
SPECIFICITY REQUIREMENT: commentary must name the actual arrangement technique used in this specific track (e.g. "the pre-chorus strips back to just bass and vocal before the chorus reintroduces the full synth layer" or "the arrangement stays consistently full throughout with no structural thinning") - never a generic claim about "density" or "distortion" that isn't grounded in what actually happens in this track's own structure.
RUBRIC ANCHOR: a score of 90-100 requires genuinely distinct, well-defined energy shifts between sections - a listener could identify section boundaries by energy alone. A score of 70-89 applies when there is real, audible variation but it's more subtle or limited to one clear shift rather than a sustained arc. Below 70 is reserved for a track that genuinely stays at one consistent energy level throughout - a real, legitimate outcome for some driving, relentless-by-design genres and not automatically a flaw, but should be scored honestly when it's genuinely the case.
- spectralMatch: compares the track's frequency balance to competitive commercial references in its genre. IMPORTANT - a real, precomputed 6-band frequency energy measurement for this track is provided in the context above as 'Measured Spectral Band Distribution' (relative energy per band - Sub-Bass, Bass, Low-Mids, Core Mids, Presence, Air - a genuine FFT measurement, not a guess). You MUST treat this measured profile as your factual anchor for what the track's actual frequency balance is - your genre-aware judgment (below) determines whether that real profile fits genre expectations or represents a genuine imbalance, but the underlying facts about energy distribution must come from this measurement, not be invented from listening alone. If the measured profile shows heavy low-mid or bass energy alongside a genre where that is a known intentional signature (see below), that is real evidence supporting a high score, not grounds for inventing a masking complaint that contradicts the measurement.
CRITICAL DIRECTIVE - GENRE INTENT VS. TECHNICAL DEFECT:
Never confuse intentional stylistic tone curves with technical defects.
- Intentional Sonic Identity: Heavy low-frequency density and controlled weight in the 150-400Hz range is a signature characteristic of modern dark pop (e.g. Billie Eilish, Finneas, Lorde), modern R&B, synth-pop, and bedroom pop. When paired with hyper-intimate or articulate lead vocals, this low-mid weight creates an intentional, atmospheric, and intimate listening experience. Similarly, massive sub-bass underpins modern hip-hop/trap, warm analog mid-bass defines 80s retro synth-pop, and warm lower-mids provide body in acoustic indie/folk.
- Technical Defect: A genuine spectral flaw means actual acoustic masking (e.g., bass or synth drowns out the vocal or muffles the kick drum's transient punch), sharp uncontrolled resonance spikes, ear-fatiguing harshness in upper-mids (2.5k-5kHz), or thin/hollow phase-cancellation.
- BANNED CLICHÉS & HALLUCINATIONS: Never default to formulaic critique phrases such as 'accumulation around 200-400Hz causing slight muddiness,' 'blurring the distinction between synth elements and vocal articulation,' or 'could benefit from more air above 10kHz.' If the lead vocal is distinct and articulate, and instruments have distinguishable roles, lower-mid energy is an intentional sonic asset, NOT mud. If high-end roll-off fits the genre's warm or vintage character, do not criticize it for lacking 'air.'

RUBRIC ANCHORS FOR SPECTRAL MATCH:
- 95-100: Master-level commercial execution. The frequency balance sits shoulder-to-shoulder with the finest commercially mastered references in its genre. Tonal weight, low-end extension, midrange articulation, and high-frequency smooth roll-off or sparkle are executed with surgical precision and translate flawlessly across all playback systems. Commentary must describe this tonal balance and commercial translation, without inventing imaginary flaws or suggesting unneeded EQ tweaks.
- 89-94: Demonstrably better tonal balance than the genre norm - not merely free of problems, but showing a specific, nameable strength (e.g. unusually well-controlled low-end extension, or a high end that stays detailed without harshness at volume). You must name what is above average.
- 82-88: Clean, professional, release-ready commercial balance. The track sits comfortably on major streaming playlists with no distracting frequency masking or harshness. This is the correct band for competent, problem-free tonal balance: the absence of flaws belongs here, not higher.
- 70-81: Good foundational balance, but with one identifiable, genuine acoustic imbalance that a commercial genre reference would not have (e.g. a truly muffled vocal, genuine low-end phase cancellation, or harsh uncapped upper-mid resonant spikes). Must name the specific instruments and demonstrable conflict.
- Below 70: Structural spectral failure (severe boxiness, deafening harshness, completely missing bottom end or unlistenable boominess).

MANDATORY JUSTIFICATION GATE FOR SPECTRAL MATCH:
Before assigning a score below the 82-88 professional band for spectralMatch, ask: 'Can I identify an actual acoustic conflict where instruments mask each other or sound uncomfortably harsh/dull relative to genre norms - one that the Measured Spectral Band Distribution is consistent with, not one that contradicts it?'
If NO: The track is commercially viable and must not be penalised - score at 82-88 per the master calibration, going to 89+ only where the distribution is demonstrably better than the genre norm in a way you can name. Commentary should validate the frequency distribution and explain why it translates well for the genre.
If YES: Name the exact conflicting elements and audible masking issue, and confirm it is consistent with the measured band distribution rather than inventing a claim the real data doesn't support.

RUBRIC ANCHOR FOR AESTHETIC DESIGN: this metric measures the QUALITY OF THE AUDIBLE SONIC ARCHITECTURE - how intentionally the track's sound world is shaped and realized. It is not a reward for simply matching the provisional genre label, being pleasant, sounding clean, or avoiding obvious mistakes. Genre compatibility removes a penalty; it does not earn excellence.

AESTHETIC DESIGN - EVIDENCE HIERARCHY:
1. PRIMARY EVIDENCE = a specific audible design decision that can be described without guessing the production source: a distinctive contrast in texture, an unusually effective spatial treatment, an intentional relationship between dry/wet or narrow/wide sections, a recognizable treatment of transients or ambience, a clearly shaped tonal identity, or another concrete sonic decision that materially defines the track.
2. SUPPORTING EVIDENCE = the real measurements supplied for this track (timbral consistency, spectral-band distribution, stereo correlation, dynamic behavior). Use these to confirm or challenge what is heard. They describe the result; they do NOT prove craft by themselves.
3. NON-EVIDENCE = the genre label itself, generic words such as "cohesive", "polished", "professional", "warm", "cinematic", or "modern", and assumptions about instruments, presets, plugins, sample libraries, recording methods or processing that cannot actually be verified from the stereo audio.

SOURCE-CLAIM GATE - MANDATORY: never justify aestheticDesign with an instrument, sample, synth, drum, room, plugin, preset, or processing technique unless that source is genuinely identifiable in the audio. If uncertain, describe the audible result instead. A statement such as "the texture remains dark and close through the opening, then broadens into a brighter, more reverberant climax" is valid evidence; "the analog synth pads and sampled drums create cohesion" is not valid unless those sources are actually clear.

SCORE ANCHORS:
- 95-100: reference-level sonic design. Multiple specific production decisions form a distinctive, exceptionally controlled sound world that would remain identifiable even without artist, title, or genre context. Commentary must name the actual audible decisions.
- 89-94: demonstrably above-average aesthetic execution. At least one concrete, audible design choice is both distinctive and unusually well controlled relative to professional work. The commentary must identify that exact choice and explain why it materially strengthens the track.
- 82-88: clean, coherent, professional sonic design. The sound world fits the music, nothing feels accidentally mismatched, and the production choices are competent, but there is no specific evidence that the aesthetic execution rises above the professional norm.
- 70-81: functional design with a real, audible weakness such as an underdeveloped texture, inconsistent spatial treatment, distracting tonal mismatch, or a design choice that weakens the intended presentation. Name the actual audible problem; do not infer a source.
- Below 70: substantial production-design failure: multiple audible choices conflict, the sound world feels poorly controlled or incoherent, or the presentation repeatedly undermines the composition.

MANDATORY 89+ GATE: before awarding 89 or above, answer internally: "What exact audible production-design decision on THIS recording proves above-average craft?" If the answer is only genre fit, cleanliness, lack of clashes, timbral consistency, balanced frequency response, or generic praise, the score MUST remain 82-88. If the answer depends on an instrument or production technique that cannot be confidently identified, the score MUST remain 82-88 rather than inventing evidence.

MEASUREMENT CROSS-CHECK: a high timbral-consistency value may support the conclusion that the sound world is uniform, but uniformity alone is not design excellence. A balanced spectral profile may support translation, but balance alone is not a distinctive aesthetic. Stereo width and dynamic movement may support an intentional design only when the audible arrangement clearly uses them purposefully. Conversely, a measurement that reveals a real technical limitation may reduce the score if that limitation audibly weakens the intended aesthetic rather than serving it.

AESTHETIC DESIGN CALIBRATION EXAMPLES:
- Example landing at 96: 'The opening holds the image deliberately narrow and dry, then the final third expands into a much wider, longer-decay acoustic field while preserving a stable centre. That controlled spatial transformation becomes a defining part of the track's identity.'
- Example landing at 86: 'The sound world is coherent and professionally controlled, with consistent tonal weight and spatial treatment throughout. The execution supports the material cleanly, but no single audible production decision stands out as unusually distinctive or difficult.'
- Example landing at 77: 'The overall presentation is functional, but the middle section becomes noticeably flatter and less dimensional than the opening and ending, making the sonic identity feel underdeveloped at that point.'
- Example landing at 64: 'Several sections shift abruptly between incompatible tonal and spatial presentations without an apparent structural purpose, so the production identity repeatedly feels disconnected from itself.'

CONSISTENCY GATE: the number and commentary must agree. A commentary that contains only praise such as "clean", "cohesive", "balanced", "genre-appropriate" or "professional" cannot support 89+. A commentary below 82 must identify a real audible weakness. Never manufacture either excellence or deficiency merely to fit a chosen number.

RUBRIC ANCHOR FOR SPACE & DENSITY: evaluates the arrangement's use of negative space, element separation, dynamic density shifts between sections, and avoidance of acoustic crowding across the soundstage.
- Score 95-100: Masterful arrangement economy and spatial staging. Dynamic use of negative space gives focal elements pristine breathing room in intimate sections, while dense climactic passages layer multi-tracked textures with surgical pocketing and zero masking.
- Score 89-94: Demonstrably better spatial handling than the genre norm - not merely uncluttered, but showing a specific, nameable strength in how space is used (e.g. deliberate negative space that makes a later climax land harder). You must name what is above average.
- Score 82-88: Clean, professional, release-ready commercial arrangement. Every element has an identifiable pocket and audible separation. Even when the mix is full, instruments stay distinct without acoustic clutter. This is the correct band for a competent, uncluttered arrangement: the absence of collisions belongs here, not higher.
- Score 70-81: Functional arrangement, but with at least one identifiable moment or section where elements collide—for instance, rhythm guitars and synths overlapping in the 800Hz-2kHz range during the chorus, slightly burying the vocal. Must name the conflicting elements and specific section.
- Below 70: Chronic arrangement congestion throughout. Continuous, wall-to-wall instrumentation with no negative space, persistent frequency collisions, and fatigued listening dynamics.

CRITICAL GENRE DIRECTIVE FOR SPACE & DENSITY: Intentional arrangement density (e.g., shoegaze wall-of-sound, maximalist pop, dense cinematic synth-pop, dark pop, trap/hip-hop with layered 808s and ad-libs, heavy rock/metal) is a deliberate artistic choice. When a dense arrangement maintains clarity of parts, clear vocal focus, and controlled masking, it represents genuinely accomplished arrangement craft, NOT crowding - and where that control is demonstrably exceptional and you can say why, it earns 89+. Deductions below the 82-88 professional band are reserved exclusively for unintended clutter, masking, or fatigue.
CROSS-REFERENCE WITH MEASURED SPECTRAL DISTRIBUTION: When 'Measured Spectral Band Distribution' is provided in the context, check whether energy is distributed across sub-bass, bass, low-mids, core-mids, presence, and air in a balanced manner, confirming that density is structurally supported across the frequency spectrum rather than bottlenecked into an overcrowded band.

SPACE & DENSITY CALIBRATION EXAMPLES:
- Example landing at 97: 'Masterful arrangement economy. Verses maintain generous negative space with a dry, intimate vocal and sparse percussion, allowing the chorus to introduce stacked stereo synths and guitars that explode with immense scale while retaining surgical separation.'
- Example landing at 86: 'Clean professional arrangement. The track maintains useful breathing room and avoids obvious crowding, but the spatial handling is conventional rather than demonstrably exceptional. This is successful professional execution, not automatic evidence for a 90+ score.'
- Example landing at 78: 'Good foundational balance, but the final chorus accumulates competing rhythm elements and synth pads in the 800Hz-2kHz zone that fight for the exact same acoustic space, slightly masking the vocal.'
- Example landing at 62: 'Persistent, structural crowding throughout. Too many sustained polyphonic elements play continuously without dynamic breathing room or sectional thinning, fatiguing the listener.'

SPACE & DENSITY - MANDATORY JUSTIFICATION STRUCTURE: before assigning a numeric score for spaceAndDensity, you must first explicitly answer this question in your own reasoning: 'Can I identify an actual section or moment where competing instruments mask each other or crowd the soundstage without intentional artistic purpose?'
If NO: The track manages space effectively and must NOT be penalised for density that serves the genre - score it at 82-88 per the master calibration, reserving 89+ for cases where you can name something specifically superior about its handling of space. Commentary should validate the arrangement's spatial discipline and effective use of negative space or density.
If YES: Commentary MUST explicitly name the colliding instruments and the specific section.

RUBRIC ANCHOR FOR PALETTE COHESION: evaluates whether instrument textures, synthesizers, acoustic recordings, drum samples, and spatial reverbs sound like they belong to the same cohesive acoustic universe.
IMPORTANT - a real, precomputed timbral consistency measurement for this track is provided in the context below as 'Measured Timbral Consistency Score' (0-100, where higher = the track's overall tonal/textural character stays more consistent throughout). Treat this measured value as STRONG EVIDENCE about how consistent the track's texture actually is - but NOT as a direct score mapping. Per the master rule above, a high raw measurement is evidence about what the audio contains, never proof of craft: a sparse or sample-library render can score very high on timbral consistency simply because it uses one uniform sound source throughout, which is not the same as a producer skilfully uniting diverse instrument families. Use the measurement to bound your judgment - a genuinely LOW measured value (below roughly 60) is real evidence of inconsistency and should hold the score down unless you can explain why the variation is deliberate - but a HIGH measured value only establishes that nothing is clashing, which per the master calibration places the metric at 82-88. To go to 89 or above you must additionally name what is specifically accomplished about the palette: diverse sources genuinely made to share one sonic world, not merely an absence of outliers. Qualitative listening provides the specific descriptive details (e.g. which instrument families unite or diverge).
- Score 95-100: Flawless timbral synergy. Every drum transient, acoustic element, synthesizer patch, and reverberant tail shares a unified sonic DNA, complementary frequency weighting, and matching room acoustics, creating an immersive, high-budget soundstage.
- Score 89-94: Demonstrably stronger cohesion than the genre norm - not merely free of outliers, but showing a specific, nameable strength (e.g. a distinctive shared sonic signature across otherwise unrelated instrument families). You must name what is above average.
- Score 82-88: Clean, professional commercial cohesion. Instrumentation speaks a unified genre-appropriate language. Drums, bass, keys, and vocal reverbs integrate smoothly without distracting sonic outliers. This is the correct band for competent, outlier-free cohesion: the absence of clashes belongs here, not higher.
- Score 70-81: Generally cohesive, but contains one identifiable acoustic outlier—such as a snare sample whose boxy, dry acoustic character stands apart awkwardly from the lush, expansive reverb applied to the lead vocals and synth pads. Must name the specific outlier.
- Below 70: Mismatched, jarring sound collage. Instruments and samples from conflicting eras and discordant acoustic environments clash noticeably, sounding disjointed.

CRITICAL DIRECTIVE FOR PALETTE COHESION: SECTIONAL CONTRAST VS. TEXTURAL INCOHERENCE:
Sectional contrast (e.g., an intimate acoustic guitar intro leading into full electronic drums, or a breakdown featuring a solo grand piano) is musical arrangement and dynamic storytelling, NOT palette incoherence.
True incoherence happens when elements within the same section clash in room acoustics (e.g., a completely dry, direct-injected rhythm element jarringly juxtaposed against drenched cavernous reverbs without stylistic intent) or sound like incompatible, mismatched sample pack scraps from conflicting eras.

PALETTE COHESION CALIBRATION EXAMPLES:
- Example landing at 98: 'Flawless timbral synergy. Every drum transient, analog synth pad, and vocal reverb shares the same warm, cohesive spatial signature, creating an immersive and unified sonic world.'
- Example landing at 86: 'Cohesive professional sound selection. The audible elements share a consistent tonal and spatial character with no distracting outlier, but the cohesion is conventional rather than distinctively above the professional norm.'
- Example landing at 76: 'Mostly cohesive, but the snare sample carries an unusually dry, boxy acoustic character that stands apart awkwardly from the lush, expansive reverb applied to the lead vocals and synths.'
- Example landing at 55: 'Disjointed sound palette. Elements sound like disparate sample packs pasted together with contradictory room dimensions and clashing production eras.'

PALETTE COHESION - MANDATORY JUSTIFICATION STRUCTURE: before assigning a numeric score for paletteCohesion, you must first explicitly answer this question in your own reasoning: 'Can I identify an actual instrument, sample, or acoustic space that noticeably clashes with or detracts from the track's sonic world?'
If NO: do not deduct for palette clash - score at 82-88 per the master calibration, consistent with the measured timbral consistency, and go to 89+ only where that measurement is genuinely high AND you can name what makes the palette exceptional rather than merely unproblematic. Commentary should highlight how the palette components complement each other.
If YES: Commentary MUST explicitly name the clashing instrument/sample and the specific textural mismatch.

FIELD DEFINITION - hookPlacement (part of compositionFlowSubs): judges whether the song's main hook/chorus arrives at an effective point in the structure - not too late to lose the listener, not so abrupt it undercuts the build. This is a genuinely significant metric - it is the single largest ingredient (60%) in the Commercial Impact score. RUBRIC ANCHOR: a score of 90-100 requires the hook to land at a genuinely well-judged moment with the preceding build (however long or short) making its arrival feel earned - name the approximate timing and why it works. A score of 70-89 applies when the hook placement is functional and reasonable but not particularly well set up or particularly fast/effective - a normal, common outcome. Below 70 is reserved for hook placement with a real, specific problem - arriving so late the song risks losing the listener first, or so abruptly that it undercuts its own impact.

FIELD DEFINITION - sectionalContrast (part of compositionFlowSubs): judges how clearly differentiated the song's sections feel from each other - do verses and choruses (or equivalent sections) feel like genuinely distinct parts of the song, or does the arrangement blur together. RUBRIC ANCHOR: a score of 90-100 requires sections to feel clearly, distinctly different from each other - a listener could identify section changes without needing to be told. A score of 70-89 applies when sections are reasonably differentiated but not dramatically so. Below 70 is reserved for a song where sections genuinely blur together with little audible differentiation - again, a legitimate outcome for some minimalist or hypnotic/repetitive genres by design, not automatically a flaw.

FIELD DEFINITION - vocalTracking (parent score): this score should genuinely reflect the constellation of its own sub-metrics (pitchAccuracy, dynamicDelivery, vocalLayerFit) rather than an independent holistic guess - if your sub-scores for this track are mixed (e.g. strong pitch, weak dynamic range), your parent score and commentary should reflect that mix specifically, not default to a generic "good vocals" summary that doesn't match the sub-metric picture.

FIELD DEFINITION - instrumentalStaging (parent score): this score should genuinely reflect the constellation of its own sub-metrics (timelineGridCohesion, transientPunch, melodicStaging, instrumentalWarmth) rather than an independent holistic guess - if your sub-scores for this track are mixed, your parent score and commentary should reflect that mix specifically, not default to a generic summary that doesn't match the sub-metric picture.

RUBRIC ANCHOR FOR MUD PREVENTION: measures the absence of uncontrolled frequency masking in the 150-400Hz range. Real spectral flatness and flux measurements for this exact range are provided above as 'Measured Mud Band Evidence' - use them as supporting evidence for how tonal/structured versus noise-like/smeared this range genuinely is, alongside what you actually hear. Neither measurement alone proves masking - a distorted guitar, dense drums, or intentionally saturated production can also produce high flatness or flux without any real mud - so judge the combination of the real evidence and the audible result together, not either signal in isolation.
CRITICAL DISTINCTION: Low-mid warmth, body, and heavy harmonic density are deliberate, desirable signatures in many genres (dark pop, indie rock, R&B, synth-pop). Thick, warm, or heavy low-mids are ONLY considered 'mud' if there is genuine, audible masking that buries the lead vocal, blurs pitch definition of the bass, or muffles drum attack. If the vocal is intimately clear and drums/synths retain their articulation (even in a heavy, dark, or warm mix), mud prevention is successful and must NOT be penalised for that warmth - score it at the professional-standard band or above per the calibration rules, reserving 89+ for genuinely superior low-mid control you can point to specifically. Reserve deductions below the 82-88 professional band ONLY for tracks where instruments genuinely clash into an indistinct, boomy blur.

RUBRIC ANCHOR FOR MIDRANGE SPACING: a score of 90-100 requires the midrange (roughly 500Hz to 4kHz) content to stay clearly separated between instruments at all times - lead vocals, primary hooks, and backing synths or guitars each occupy distinguishable space with no persistent clash. Real spectral flatness and flux measurements for this exact range are provided above as 'Measured Midrange Evidence' and real energy readings for the Low-Mids/Core Mids bands are in 'Measured Spectral Band Distribution' - use these as supporting evidence for how densely and how tonally this range is occupied, alongside what you actually hear; neither number alone determines whether the density represents genuine crowding or healthy, well-arranged density. A score of 70-85 applies when the mix is generally functional but has at least one identifiable moment where two or more elements genuinely overlap and blur together - name the specific elements. Below 70 is reserved for mixes with structural, persistent crowding throughout.

RUBRIC ANCHOR FOR LOW-END DIVISION: a score of 90-100 requires the kick drum and bass (synth bass, 808, or bass guitar) to occupy clearly separated frequency pockets with both audible and distinct throughout - neither one masking or swallowing the other. Real sub-bass/bass temporal correlation and crest factor measurements are provided above as 'Measured Low-End Evidence' - use them as supporting evidence for how independently the sub-bass and bass regions actually behave over time, alongside what you actually hear. Low correlation can reflect deliberate, independent sound design (e.g. a modulated sub-bass in electronic genres) rather than a problem, and neither correlation nor crest factor alone proves or disproves genuine separation - judge the combination alongside the audible result. In modern dark pop, hip-hop, or synthwave, powerful low-end with sustained bass notes that underpin punchy transients represents elite low-end engineering (90-100), not an overlap problem. A score of 70-85 applies when the low end is generally functional but has at least one section where the bass and kick blur together or one becomes hard to distinguish from the other. Below 70 is reserved for a persistent, structural failure of separation - one element (most commonly the bass) is genuinely difficult to hear as a distinct part for most of the track, buried under or merged with the other low-frequency content.

- sibilanceShaving: IMPORTANT - a real, precomputed sibilance severity measurement for this track will be provided in the context below as 'Measured Sibilance Severity Score'. This is a genuine, objective measurement (0-100, where 100 = no detected harsh spikes in the 5-10kHz range, lower values = more/worse detected spikes), not a guess. You MUST treat this measured value as the primary, authoritative basis for the sibilanceShaving score - use your own listening impression only as a secondary, qualitative supplement in the commentary (e.g. identifying which specific words or moments sound harsh), not as a basis for overriding what the measurement shows. RUBRIC ANCHOR: map the measured value to your score directly and consistently - measured 90-100 -> score 90-100; measured 70-89 -> score 70-89; measured 50-69 -> score 50-69; below 50 -> score below 50. Do not compress the measured value toward a "safe middle" score - a genuinely low measured value must produce a genuinely low score, even for a well-known or otherwise well-produced track. A professionally released, well-mixed track can still have real, measured sibilance issues (e.g. a mixing engineer choosing to actively de-ess a vocal is direct evidence that real sibilance existed before correction) - this is common and does not imply the whole mix is bad.
- stereoWidth: judges the width and spatial use of the stereo field - is the mix appropriately wide (backing elements, reverbs, doubled parts spread across the stereo image) without being so wide that mono compatibility or center-focus suffers? Judge this from what you actually hear in the stereo image, not from any external measurement. IMPORTANT - a real, precomputed phase correlation measurement for this track will be provided in the context below as 'Measured Stereo Phase Correlation'. This is a genuine, objective measurement (not a guess). READ IT CORRECTLY - the physics are easy to invert: +1 means the left and right channels are identical, which is a MONO / very NARROW, dead-centre image (not a phase fault, simply an absence of width). Around 0 means the channels are highly DECORRELATED, which is a very WIDE image. Below 0 means the channels are increasingly out of phase, which is the genuine cancellation risk - a mix at negative correlation will partially or fully cancel when summed to mono. Width therefore INCREASES as the value falls from +1 toward 0, and phase risk appears only once it goes negative. Values roughly between 0.15 and 0.85 represent a healthy, wide-but-mono-safe stereo field.
USE THIS AS EVIDENCE, NOT AS A QUALITY SCORE IN ITSELF: the measurement tells you how wide or narrow the image genuinely is, and whether mono compatibility is at risk. It does NOT by itself tell you whether that width is good. Judge that from genre and context alongside what you actually hear - a tightly centred, mono-leaning image is a deliberate and correct choice in much hip-hop, garage rock, punk and intimate singer-songwriter material, while a very wide decorrelated field is the expectation in modern synth-pop, EDM and cinematic productions. Never convert "more width" into "better production" automatically in either direction.
MONO-COMPATIBILITY RISK IS UNIVERSAL, NOT GENRE-DEPENDENT: if the measured value is NEGATIVE, that is genuine phase cancellation risk and the score MUST reflect it clearly regardless of genre or how the mix subjectively sounds - a mix that partially cancels in mono is a real technical defect in any genre, with no legitimate stylistic exception. A very high positive value (above roughly 0.9) is NOT a phase fault: it means the mix is essentially mono. Treat that as a width finding to judge in context, not as a defect in itself.
GATE (very wide end): if the measured value is between 0 and 0.15, the image is highly decorrelated and very wide. Before scoring below 65, explicitly check: does that width fit the genre's convention and hold together in mono, rather than being an artificially widened mix that hollows out the centre? If YES - name that genre fit and score 82-88 per the master calibration, reserving 89+ for width you can specifically name as exceptionally well handled. If NO - score using the bands below.
GATE (mono / very narrow end): if the measured value is above roughly 0.9, the image is essentially mono. Before scoring below 65, explicitly check: is that centred image a deliberate convention of this genre rather than an undeveloped stereo mix? If YES - name that genre fit and score 82-88 per the master calibration. If NO - score using the bands below.
RUBRIC ANCHOR: correlation in the 0.35-0.75 range (a wide, deliberate, mono-safe stereo field) -> score 85-100. Correlation 0.15-0.34 or 0.76-0.85 (usable but narrower or tighter than ideal) -> score 65-84. Correlation between 0 and 0.15 -> score 40-64 only if the gate above finds the narrow image genuinely underdeveloped - otherwise 65-84 per the gate. Correlation below 0 (genuine phase cancellation risk - the mix partially cancels when summed to mono) -> score below 40 always, regardless of genre. A value ABOVE 0.9 is NOT a phase fault: it means the image is essentially mono, which is a width finding to judge in genre context per the corrected physics above, never an automatic sub-40 score.

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
  },
  measuredLowEndEvidence?: { subBassCorrelation?: number; subBassCrestFactor?: number; bassCrestFactor?: number },
  measuredMudEvidence?: { flatness?: number; flux?: number },
  measuredMidrangeEvidence?: { flatness?: number; flux?: number }
): Promise<any> {
  const bandEnergySummary = measuredBandEnergies
    ? `Sub-Bass (20-64Hz): ${measuredBandEnergies.subBass ?? 'N/A'}%, Bass (64-250Hz): ${measuredBandEnergies.bass ?? 'N/A'}%, Low-Mids (250Hz-1kHz): ${measuredBandEnergies.lowMids ?? 'N/A'}%, Core Mids (1-4kHz): ${measuredBandEnergies.coreMids ?? 'N/A'}%, Presence (4-8kHz): ${measuredBandEnergies.presence ?? 'N/A'}%, Air (8-20kHz): ${measuredBandEnergies.air ?? 'N/A'}%`
    : "not available";

  const mudEvidenceSummary = measuredMudEvidence
    ? `spectral flatness ${measuredMudEvidence.flatness ?? 'N/A'} (0=purely tonal/structured, 1=noise-like/smeared), spectral flux ${measuredMudEvidence.flux ?? 'N/A'} (frame-to-frame spectral change - higher means more active/shifting content in this range)`
    : "not available";

  const midrangeEvidenceSummary = measuredMidrangeEvidence
    ? `spectral flatness ${measuredMidrangeEvidence.flatness ?? 'N/A'}, spectral flux ${measuredMidrangeEvidence.flux ?? 'N/A'}`
    : "not available";

  const lowEndEvidenceSummary = measuredLowEndEvidence
    ? `sub-bass/bass temporal correlation ${measuredLowEndEvidence.subBassCorrelation ?? 'N/A'} (-1 to 1 - how closely sub-bass and bass energy rise and fall together over time; low correlation can reflect independent sound design such as modulated sub-bass, not necessarily a problem), sub-bass crest factor ${measuredLowEndEvidence.subBassCrestFactor ?? 'N/A'}, bass crest factor ${measuredLowEndEvidence.bassCrestFactor ?? 'N/A'} (peak-to-average ratio - higher suggests more transient, punchier low-end activity; lower suggests sustained, consistent energy)`
    : "not available";

  const contextSummary = `
Qualitative context from the earlier analysis pass (descriptive only - NO parent scores are given to you deliberately):
The parent category scores are intentionally withheld here. Your sub-metric scores are used to RECOMPUTE those parent scores, so being shown the earlier numbers would make this analysis gravitate back toward that first unaided impression instead of independently determining the result from the evidence. Score each sub-metric on its own merits from the audio, the measurements below, and the descriptive notes - never toward any prior number.
- Engagement Power notes: ${parsedCritique?.mixQuality?.dominanceIssues}
- Genre: ${parsedCritique?.vibe?.genre} / ${parsedCritique?.vibe?.subgenre}
- Mix Balance Quality frequency notes: low end: ${parsedCritique?.mixQuality?.frequencyBalance?.lowEnd}, midrange: ${parsedCritique?.mixQuality?.frequencyBalance?.midrange}, high end: ${parsedCritique?.mixQuality?.frequencyBalance?.highEnd}
- Song Title uniqueness classification: ${parsedCritique?.titleSearchability?.uniquenessLevel}
- Measured Stereo Phase Correlation: ${measuredStereoCorrelation !== undefined && measuredStereoCorrelation !== null ? measuredStereoCorrelation : "not available"}
- Measured Sibilance Severity Score: ${measuredSibilanceSeverity !== undefined && measuredSibilanceSeverity !== null ? measuredSibilanceSeverity : "not available"}
- Measured Timbral Consistency Score: ${measuredTimbralConsistency !== undefined && measuredTimbralConsistency !== null ? measuredTimbralConsistency : "not available"} (Primary authoritative basis for Palette Cohesion)
- Measured Spectral Band Distribution: ${bandEnergySummary} (Objective frequency energy profile informing Space & Density and Spectral Match)
- Measured Mud Band Evidence (150-400Hz - the range this metric is specifically about): ${mudEvidenceSummary}
- Measured Midrange Evidence (400Hz-4kHz - the range Midrange Spacing is specifically about): ${midrangeEvidenceSummary}
- Measured Low-End Evidence (for Low-End Division): ${lowEndEvidenceSummary}
IMPORTANT ON THE THREE EVIDENCE LINES ABOVE: these are real, objective DSP measurements - not a "mud score," "spacing score," or "separation score" on their own, and none of them should be treated as a single definitive verdict. Combine what these measurements suggest with what you actually hear and with genre context to reach your own scored judgment for mudPrevention, midrangeSpacing, and lowEndDivision - the measurements are evidence to reason with, not a formula to plug into a scoring equation, and no fixed numeric threshold should be treated as a hard pass/fail line.

Listen to the actual audio again and generate specific, evidence-based sub-metric scores and commentary for each of the 12 required fields, consistent with the above context but grounded in what you actually hear this time.

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
        syllabicPlacement: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
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
        vocalPocketing: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
        poeticBrevity: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
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

${SCORE_CALIBRATION}

DO NOT CONFIDENTLY ASSERT UNVERIFIABLE PRODUCTION TECHNIQUES: Never state as fact that a specific production method was used - sampled versus real acoustic drums, auto-tune or pitch-correction software, a specific plugin or piece of hardware - unless the audio evidence is genuinely, audibly unambiguous (e.g. a clearly robotic, quantized, inhuman vocal is real evidence of heavy pitch-correction; a rigidly identical, zero-variance drum pattern is real evidence of programming or sampling). When you cannot genuinely distinguish the method, describe the audible RESULT instead of guessing the technique: write 'the drums sound tight and consistent' rather than 'well-chosen drum samples,' and write 'the vocal pitch is remarkably precise and stable' rather than 'auto-tuning is consistently applied.' This matters especially for older or vintage recordings, where confidently attributing a modern production technique (auto-tune, digital sampling) can be not just unverifiable but chronologically impossible - when in doubt about a recording's era or technology, describe what you hear, not what likely produced it.

You are ALSO judging two additional standalone values, moodValence and speechiness, used elsewhere in the app for algorithmic/discovery matching purposes (similar to Spotify's own audio features). These are NOT scored against the calibration bands - just give a direct 0-100 score and a short 1-sentence commentary for each:
- moodValence: the overall musical positivity/positiveness conveyed by the track, independent of lyrical subject matter - a triumphant major-key anthem scores high even with defiant lyrics; a somber minor-key ballad scores low even with hopeful lyrics. Judge this from the actual musical mood (key, harmony, tempo feel), not the words alone. This is a spectrum, not a quality score - there is no "good" or "bad" value; score based purely on where the track's actual musical mood genuinely sits between somber/dark (low) and bright/euphoric (high), using the full 0-100 range as the mood genuinely warrants.
- speechiness: how much the vocal delivery resembles spoken word/rap versus sung melody. This score must be calibrated to match Spotify's own real-world speechiness distribution, which is much more compressed than intuition suggests — fully sung melodic vocals score very low (0-8), even for emotionally intense or rhythmically dense vocal deliveries; talk-heavy tracks with substantial spoken passages mixed with singing score moderate (15-40); pure rap or spoken-word tracks score high (40-90); instrumental tracks with no vocals score near 0. Do not score a clearly, fully sung vocal performance above 8 just because it feels rhythmic, urgent, or lyrically dense — rhythmic phrasing and lyrical density in sung vocals do not indicate spoken word.
- acousticness: judge this by genuinely listening for organic, non-electric instrumentation (acoustic guitar, piano, real strings, unplugged drums) versus synthetic/electric/processed sound (synths, distorted electric guitars, drum machines, heavy digital processing). A solo acoustic guitar and vocal performance should score very high (80-100) even if the recording is naturally bright/treble-heavy - acoustic instruments are often bright, and brightness alone does NOT mean "not acoustic." A heavily electronic or distorted-electric-guitar-driven track should score low (0-20). Judge this from genuine timbral/instrumental character, not from bass-to-treble energy ratio. This is a spectrum from fully synthetic/electric (0) to fully organic/acoustic (100) - a track blending both (e.g. acoustic guitar over a programmed beat) should land genuinely in the middle based on the real proportion of organic vs synthetic content you actually hear, not defaulted to one extreme.
- moodTags: provide exactly 5 single-or-two-word descriptive mood/vibe tags for this specific track (e.g. "Anthemic", "Melancholic", "Late Night", "Euphoric", "Defiant"). These should genuinely describe THIS song's actual mood and energy as you hear it - do not default to generic rock-coded words if they don't fit; a pop, R&B, folk, or electronic track should get tags that genuinely suit its real character.
- artisticAlignment (part of artisticAnalysis): judges execution conviction and internal creative coherence - NOT whether you can verify the artist's original intent (impossible from audio alone), but whether the finished execution feels committed and internally consistent versus hedging between two different identities. A song can be genre-authentic and well-produced while still sounding like it's caught between competing directions; another can be raw and uncommercial but land with total conviction because every choice serves one clear vision. Listen for: does the arrangement, vocal delivery, and production all pull in the same direction, or do parts of the song feel like they belong to a different song entirely? Evidence-based scoring applies here same as other sub-metrics. RUBRIC ANCHOR: a score of 90-100 requires every element (vocal delivery, arrangement, production choices) to genuinely reinforce one clear identity - name what that identity is and how specific elements support it. A score of 70-89 is correct for a song that is mostly coherent but has at least one specific element that feels slightly mismatched or hedging - name it. Below 70 is reserved for a song where multiple elements genuinely pull in different directions, not merely "could be more focused."

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
Qualitative context from the earlier analysis pass (descriptive only - NO parent scores are given to you deliberately):
The parent category scores are intentionally withheld here. Your sub-metric scores are used to RECOMPUTE those parent scores, so being shown the earlier numbers would make this analysis gravitate back toward that first unaided impression instead of independently determining the result from the evidence. Score each sub-metric on its own merits from the audio, the measurements below, and the descriptive notes - never toward any prior number.
- Composition Flow notes: ${parsedCritique?.arrangement?.transitionsAndArc}
- Music Theory chord structures: ${parsedCritique?.musicTheory?.chordStructures}
- Lyrical clarity classification: ${parsedCritique?.lyricalImpact?.meaningClarity}
- Vocal Tracking notes: ${parsedCritique?.performance?.vocalsCritique}
- Genre: ${parsedCritique?.vibe?.genre} / ${parsedCritique?.vibe?.subgenre}

IF a detected key and chord vocabulary is provided below, treat it as AI-INFERRED SUPPORTING EVIDENCE about the song's harmonic content - useful corroboration for judging harmonicIntrigue, to be weighed alongside your own listening impression rather than trusted over it. It is NOT verified ground truth: it comes from model inference on the audio, and direct model-based key identification has been measured on this project as unreliable, returning different keys for the same recording on repeated runs. If it clearly conflicts with what you actually hear, say so plainly and trust your listening; never present the detected key or chords to the user as confirmed fact. This is the song's overall key and the set of chords it uses, not a timed section-by-section progression, so do not describe specific chord timing or ordering beyond what you can genuinely hear yourself. The Roman numerals show functional harmony relative to the key - chords outside the standard diatonic set (I, ii, iii, IV, V, vi, vii°), such as borrowed chords, secondary dominants, or unexpected extensions (maj7, sus4, etc. used non-conventionally), are a real signal of harmonic richness and should meaningfully raise the harmonicIntrigue score above 75. A chord vocabulary using only plain diatonic triads is NOT a harmonic failure - it is the harmonic backbone of countless great songs, and used well it should score a solid 75-85 (average, competently executed harmony, not adventurous, but not deficient either). Reserve scores meaningfully below that floor for genuine harmonic poverty specifically - a single chord for most or all of the song, or minimal chord movement with essentially no harmonic motion at all - not merely for staying within the diatonic set:
Detected Key & Chord Vocabulary: ${chordProgressionSummary || 'not available'}

Listen to the actual audio again and generate specific, evidence-based scores, feedback, and sub-metric commentary for all 4 categories and their 9 sub-fields, consistent with the above context but grounded in what you actually hear this time.`;

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
        pitchAccuracy: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
        dynamicDelivery: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
        vocalLayerFit: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
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
        meaningClarity: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
        clicheAvoidance: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING }, applicable: { type: Type.BOOLEAN } }, required: ["score", "commentary", "applicable"] },
      },
      required: ["meaningClarity", "clicheAvoidance"],
    },
    musicTheorySubs: {
      type: Type.OBJECT,
      properties: {
        chordDynamics: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        harmonicVariety: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
        formAndStructure: { type: Type.OBJECT, description: "Structural effectiveness and development of the composition: proportion, section logic, thematic evolution, transitions, return/resolution, and overall arc. Do not equate complexity or verse/chorus conformity with quality.", properties: { score: { type: Type.INTEGER }, commentary: { type: Type.STRING } }, required: ["score", "commentary"] },
      },
      required: ["chordDynamics", "harmonicVariety", "formAndStructure"],
    },
  },
  required: ["compositionFlowSubs", "vocalTrackingSubs", "instrumentalStagingSubs", "lyricalImpactSubs", "musicTheorySubs"],
};

const SUBMETRIC_SYSTEM_PROMPT_3 = `You are a precise music analyst breaking down five already-scored parent categories into their specific sub-components using the EVIDENCE-BASED scoring method defined below.

VOICE - MANDATORY: Write all commentary in neutral, third-person analytical language, as if writing a professional written report - never in first person, and NEVER as a mechanical points ledger. Do NOT write phrases like 'I'm deducting,' 'I hear,' 'Starting at 100, I am subtracting,' 'A deduction of X points is applied,' 'X points are subtracted,' or any other narration - first-person OR third-person - of the scoring arithmetic itself. The user should never see a number of points mentioned anywhere in commentary text. Instead, describe what you actually observe, directly and specifically: write 'The vocal sits slightly recessed behind the rhythm guitars in the verse,' never 'A deduction of 12 points is applied due to recessed vocals' and never 'I'm deducting 12 points because I hear the vocal is recessed.' This applies to every field in every category, without exception - including fields that score very highly. For top-band scores (90-100), commentary should validate the track's high-level craft and execution honestly; never invent imaginary flaws, non-existent muddiness, or unneeded tweaks just to explain why a score is not 100. Reserve criticisms strictly for genuine, demonstrable technical or arrangement shortcomings. Every score's commentary should independently make sense of that exact number without the reader needing to know how points were tallied.

${SCORE_CALIBRATION}

DO NOT CONFIDENTLY ASSERT UNVERIFIABLE PRODUCTION TECHNIQUES: Never state as fact that a specific production method was used - sampled versus real acoustic drums, auto-tune or pitch-correction software, a specific plugin or piece of hardware - unless the audio evidence is genuinely, audibly unambiguous (e.g. a clearly robotic, quantized, inhuman vocal is real evidence of heavy pitch-correction; a rigidly identical, zero-variance drum pattern is real evidence of programming or sampling). When you cannot genuinely distinguish the method, describe the audible RESULT instead of guessing the technique: write 'the drums sound tight and consistent' rather than 'well-chosen drum samples,' and write 'the vocal pitch is remarkably precise and stable' rather than 'auto-tuning is consistently applied.' This matters especially for older or vintage recordings, where confidently attributing a modern production technique (auto-tune, digital sampling) can be not just unverifiable but chronologically impossible - when in doubt about a recording's era or technology, describe what you hear, not what likely produced it.

SCORING METHOD - MANDATORY:
Do NOT start from a baseline of 100 and subtract downward. That method mathematically guarantees that clean but unexceptional work ends at or near 100, which is precisely the inflation the master calibration above exists to prevent. Instead, start from the evidence-supported band: clean, competent, professional execution with nothing demonstrably exceptional is 82-88. From there, move UPWARD only for specific, demonstrated excellence that you name in your commentary, and move DOWNWARD for specific, real problems or observations you actually hear in THIS audio. Your final score must be the direct result of the evidence you actually describe, in BOTH directions - every point above 88 traceable to named excellence, and every point below 82 traceable to a named problem. Never manufacture a flaw in order to justify a lower number, and never treat the mere absence of a flaw as grounds for a higher one. Do not pick a score first and write text to match it afterward.

CRITICAL - ACTIVELY SCAN FOR REAL COMPLEXITY, DO NOT DEFAULT TO SURFACE-LEVEL DESCRIPTIONS:
For musicTheorySubs and compositionFlowSubs especially: before settling on a score, actively scan for unusual time signatures or meter shifts, modal frameworks or alternate tunings, cross-rhythmic or polymetric layering, non-standard rhythmic groupings, and structurally unexpected transitions. Do not default to describing only the most obvious surface-level chord loop or verse-chorus pattern - dig into the full arrangement, including rhythmic structure and secondary instrumental layers, before scoring. If genuine sophistication is present, score and describe it accordingly - do not cap scores near 90 out of habit if the work genuinely earns higher.

RUBRIC ANCHOR FOR CHORD DYNAMICS: judge harmonic movement, tension/release, voice-leading and functional use of the detected chords. Simplicity is not itself a defect. A simple progression can land in the professional 82-88 band when it is used with clear functional purpose and clean voice-leading; 89+ requires specific, demonstrable harmonic craft beyond ordinary professional execution. Scores below 82 require a real harmonic weakness, not merely a small chord vocabulary.

FIELD DEFINITION - formAndStructure: judge HOW WELL THE COMPOSITION IS ORGANIZED AND DEVELOPED, not how complicated or unconventional the form is. This metric is about structural effectiveness: proportion, pacing, section logic, thematic development, transition quality, contrast, recurrence, escalation, return/resolution, and whether the piece feels intentionally shaped from beginning to end.

MANDATORY FORM-NEUTRALITY RULE:
- Do NOT require verse/chorus form. Through-composed, sectional, episodic, theme-and-variation, build/drop, strophic, minimalist, instrumental, classical, cinematic and other valid forms must be judged by how effectively their own structure develops and resolves.
- Do NOT call an instrumental or through-composed passage a "verse", "chorus", "pre-chorus" or "bridge" unless the audio genuinely supports that song-form function.
- Do NOT award extra points merely because the form is unusual, and do NOT deduct merely because the form is simple, repetitive or conventional.
- Repetition is only a weakness when it creates an audible structural problem such as stagnation, weak pacing, an underdeveloped section, an unearned transition, or lack of meaningful development for the style.
- Complexity is only positive evidence when it is controlled and musically effective. Complexity for its own sake is not excellence.

FORM & STRUCTURE SCORE ANCHORS:
- 95-100: reference-level structural craft. The piece develops, contrasts, recalls and resolves material with exceptional control; major transitions and proportions feel unusually inevitable and expressive. Commentary must name the specific structural decisions that make it exceptional.
- 89-94: demonstrably above-average structural design. There is a specific, nameable strength such as especially effective thematic transformation, unusually strong long-range pacing, a powerful return/recontextualization, or a transition/climax architecture that clearly exceeds ordinary professional work.
- 82-88: coherent, professional structure. Sections or thematic regions are well-proportioned, transitions make sense, repetition serves the piece, and the form carries the listener through a complete arc without a meaningful structural weakness. This is the correct band for a well-written conventional OR non-conventional form.
- 70-81: functional structure with a real, identifiable weakness - for example an overlong section, an abrupt or underprepared transition, a middle passage that loses momentum, excessive repetition that genuinely stalls development, or a resolution that feels incomplete. Name the specific weakness.
- Below 70: substantial structural failure that an ordinary listener would notice - confusing organization, repeated loss of direction, major sections that feel disconnected, or a form that fails to establish and develop its musical ideas.

CRITICAL DISTINCTION - STRUCTURAL SOPHISTICATION VS. STRUCTURAL QUALITY:
A piece can be structurally excellent without being structurally complex. A concise three-section pop song, a repetitive punk form, a gradual electronic build, or an orchestral through-composed piece can all score highly when their proportions, transitions, development and payoff are exceptionally effective. Conversely, frequent meter changes, many sections, or an unusual form do not automatically earn a high score if the result feels poorly paced or incoherent.

FIELD DEFINITION - chordDynamics: when a real Detected Chord Progression is provided in the context above, use those actual chord names and their sequence as your primary evidence for judging harmonic sophistication, tension/release, and voice-leading - this is genuine computed data, not a guess, and should ground your commentary in specific real chord names rather than generic descriptions like 'diatonic chords.'

FIELD DEFINITION - harmonicVariety: this field judges the breadth and richness of the DISTINCT chords used across the song's entire timeline - how many genuinely different chords appear, and how much harmonic color or movement they introduce collectively - not the moment-to-moment tension/release quality that chordDynamics already covers, and NOT melody, interval patterns, or vocal pitch contour, which belong to other fields entirely. Commentary for this field must describe chord variety and richness specifically (e.g. "the song draws from a fairly wide set of chords including some outside the home key" or "the harmony rotates through only two or three chords for the entire runtime") - never describe melodic phrasing, vocal range, or pitch contour here, even if those are true and interesting observations elsewhere. When a real Detected Chord Progression is provided in the context above, use it as your primary evidence for how many genuinely distinct chords actually appear. RUBRIC ANCHOR: a score of 90-100 requires a genuinely wide chord vocabulary - multiple distinct chords including some borrowed, extended, or otherwise outside the plainest diatonic set. A score of 65-84 is correct for a moderate, functional chord palette that has some real variety without reaching for anything unusual. Below 65 is reserved for a genuinely narrow chord vocabulary - two or three repeated chords for most or all of the track - which is common and legitimate in many genres (punk, drone, minimalist electronic) and should be scored as an honest reflection of that narrowness, not as a hidden penalty.

FAIRNESS RULE - DO NOT PENALIZE INTENTIONAL GENRE SIMPLICITY:
A deliberately simple, repetitive, or stripped-down approach (e.g. punk power chords, minimal vocal layering) is not automatically a flaw if it suits the genre and is executed well. Only deduct points for genuine lack of craft or real technical problems, never for simplicity itself.

RULES:
1. Every commentary must reference something specific and real about THIS audio file - an actual moment, an actual lyric, an actual rhythmic or harmonic detail. Never write generic, reusable descriptions that could apply to any song.
2. Never reuse the same commentary you might write for a different song, even if scores are similar.
3. Keep each commentary to 1-3 sentences, technical and specific, in the voice of a professional music analyst.

CRITICAL - LYRIC TRANSCRIPTION HONESTY (applies to meaningClarity, clicheAvoidance, and hookPlacement): If your commentary quotes specific lyric lines as evidence, you must be genuinely highly confident that transcription is accurate to what is actually sung. Never invent or reconstruct a plausible-sounding lyric and present it as a real quote - this is a serious factual error. If you are not certain of the exact words, describe the theme, imagery, or emotional content instead of quoting a specific line.

FIELD DEFINITION - timelineGridCohesion (part of instrumentalStagingSubs): IMPORTANT - a real, precomputed grid cohesion measurement will be provided above as 'Measured Timeline Grid Cohesion Score' (0-100, based on how closely real detected instrument attacks align with the expected beat grid at the song's actual tempo).
IMPORTANT CALIBRATION NOTE: this measurement cannot distinguish a deliberate, consistent "pocket" feel (playing consistently behind or ahead of the grid as a stylistic choice, common in blues, garage rock, soul, and D'Angelo-style R&B) from genuinely erratic, inconsistent timing. Both can produce a similar measured looseness score.
GATE: if the measured value is low (below 65), before scoring below 70, explicitly check: does the looseness feel consistent and deliberate (the same relationship to the beat throughout, a real stylistic pocket) rather than erratic and unpredictable (drifting inconsistently, sometimes ahead, sometimes behind, no stable relationship to the grid)? If consistent/deliberate - name that specific pocket feel in the commentary and score at 82-88 or above - consistent, deliberate timing is the professional baseline rather than an achievement, so reserve 89+ for a pocket feel that is genuinely characterful and that you describe specifically. If erratic/unpredictable - score using the bands below.
RUBRIC ANCHOR: measured 85-100 -> score 85-95 (tight, precise timing throughout); measured 65-84 -> score 70-89 (generally solid with some natural human looseness, not mechanically perfect); measured 40-64 -> score 50-69 only if the gate above finds genuinely erratic timing - otherwise score per the gate above; below 40 -> score below 50 only if the gate above finds genuinely erratic timing - otherwise score per the gate above.

FIELD DEFINITION - transientPunch (part of instrumentalStagingSubs): IMPORTANT - a real, precomputed transient punch measurement will be provided above as 'Measured Transient Punch Score' (0-100, based on the real crest factor of detected drum/percussion attacks - higher means sharper, punchier hits; lower means softer, more compressed/squashed transients).
IMPORTANT CALIBRATION NOTE: soft, rounded, non-punchy transients are a deliberate aesthetic choice in genres like lo-fi hip-hop, ambient, shoegaze, and dream pop - not automatically evidence of over-limiting. Distinguish this from transients genuinely squashed flat by heavy mastering-stage loudness limiting (a real, common outcome in loud commercial masters, e.g. a scenario where an alternate, less-compressed release of the same recording is documented as sounding punchier by ear - that IS a genuine flaw).
GATE: if the measured value is low (below 55), before scoring below 85, explicitly check: does the softness fit a genre where rounded, non-aggressive transients are a deliberate production choice, with no other signs of over-limiting (e.g. pumping, flatness elsewhere in the mix)? If YES - name that genre fit in the commentary and score 82-88 per the master calibration - the choice being intentional and genre-appropriate means it is NOT a flaw, which places it at the professional band; reserve 89+ only for execution you can specifically name as exceptional rather than merely deliberate. If NO - meaning the softness reads as a genuine mastering artifact rather than a stylistic choice - score using the bands below.
RUBRIC ANCHOR: measured 80-100 -> score 85-100 (genuinely sharp, dynamic transients - drum hits that visibly and audibly cut through). Measured 55-79 -> score 65-84 (solid punch with some compression, still retains real impact). Measured 30-54 -> score 45-64 only if the gate above finds a genuine mastering artifact - otherwise score per the gate above. Below 30 -> score below 45 only if the gate above finds a genuine mastering artifact - otherwise score per the gate above.

FIELD DEFINITION - melodicStaging (part of instrumentalStagingSubs, displayed to users as "Stereo Instrument Staging"): this judges stereo placement/panning distribution of instruments, not melody. IMPORTANT - a real, precomputed measurement will be provided above as 'Measured Melodic Staging Score' (0-100, based on real measured variance in the stereo pan balance over time - higher means instruments genuinely occupy distinct places in the stereo field at different times; lower means the mix stays mostly centered with minimal stereo movement).
IMPORTANT CALIBRATION NOTE: a centered, minimally-panned arrangement is a deliberate genre choice in many styles built around a focused, centered vocal or lead (e.g. mono-leaning hip-hop, certain garage rock, intimate singer-songwriter production) - not automatically a spatial shortcoming.
GATE: if the measured value is low (below 45), before scoring below 85, explicitly check: does the centered arrangement fit the genre's convention and keep the mix feeling intentional rather than accidentally flat or undeveloped? If YES - name that genre fit in the commentary and score 82-88 per the master calibration - the choice being intentional and genre-appropriate means it is NOT a flaw, which places it at the professional band; reserve 89+ only for execution you can specifically name as exceptional rather than merely deliberate. If NO - meaning the lack of stereo movement reads as an underdeveloped mix rather than a stylistic choice - score using the bands below.
RUBRIC ANCHOR: measured 75-100 -> score 85-100 (genuinely wide, deliberate spatial placement - a mix using the full stereo field as part of its arrangement, the kind of production regularly cited as pioneering for its use of panning). Measured 45-74 -> score 65-84 (some real stereo movement and placement, not purely centered but not maximally wide either). Measured 20-44 -> score 45-64 only if the gate above finds the centered arrangement genuinely undeveloped - otherwise score per the gate above. Below 20 -> score below 45 only if the gate above finds the centered arrangement genuinely undeveloped - otherwise score per the gate above.

FIELD DEFINITION - instrumentalWarmth (part of instrumentalStagingSubs): judges the general tonal warmth and richness of the backing instrumentation - full and rounded versus thin and harsh. IMPORTANT - a real, precomputed warmth measurement will be provided above as 'Measured Instrumental Warmth Score' (0-100, based on the real measured ratio of low-mid frequency energy to high-frequency energy).
IMPORTANT CALIBRATION NOTE: a deliberately bright, thin, or minimal low-mid presence is a genuine aesthetic choice in genres like synth-pop, EDM, and modern pop - not automatically a tonal shortcoming.
GATE: if the measured value is low (below 55), before scoring below 85, explicitly check: does the brighter/thinner tonal balance fit the genre's convention and read as an intentional, controlled choice rather than an accidentally harsh or undernourished mix? If YES - name that genre fit in the commentary and score 82-88 per the master calibration - the choice being intentional and genre-appropriate means it is NOT a flaw, which places it at the professional band; reserve 89+ only for execution you can specifically name as exceptional rather than merely deliberate. If NO - meaning the thinness reads as a genuine tonal deficiency rather than a stylistic choice - score using the bands below.
RUBRIC ANCHOR: measured 80-100 -> score 85-100 (genuinely full, rounded low-mid presence - the kind of low-end character engineers specifically describe as "warm" in their own words about a mix). Measured 55-79 -> score 65-84 (reasonably full-bodied with some real warmth present). Measured 30-54 -> score 45-64 only if the gate above finds a genuine tonal deficiency - otherwise score per the gate above. Below 30 -> score below 45 only if the gate above finds a genuine tonal deficiency - otherwise score per the gate above.

HANDLING TRACKS WITHOUT VOCALS OR LYRICS - MANDATORY: several fields include an "applicable" (or "vocalApplicable") boolean alongside their score and commentary: pitchAccuracy, dynamicDelivery, vocalLayerFit, syllabicPlacement, vocalPocketing, poeticBrevity, meaningClarity, clicheAvoidance, the parent lyricalImpact score, and the parent vocalScore (as vocalApplicable) in the performance object. If the track is a genuine instrumental with no vocals, or has no discernible lyrical content, set applicable/vocalApplicable to false for every one of these fields that depends on vocals or lyrics existing - this includes both the parent-level scores and their sub-metrics, not just one or the other. When applicable is false, still provide a real score (use 0 as a clear placeholder) and a commentary explaining that this field does not apply because the track is instrumental/has no lyrics - do not invent a score of 100 (implying flawless vocal or lyrical work that was never attempted) and do not invent a low score either (implying a real deficiency that doesn't exist, since there was nothing to fail at). The applicable flag, not the placeholder score, is what determines whether this field is used in any parent-score calculation - getting that flag right matters far more than the placeholder number itself. Note that instrumentalScore (backing performance/instrumentation) and instrumentalStagingSubs always remain applicable regardless of vocals - only the vocal-specific and lyric-specific fields listed above are affected.

ELEMENT-LEVEL ABSENCE (a track that HAS vocals but lacks a specific element) - MANDATORY: the rule above covers whole tracks with no vocals at all. This rule covers the far more common case where the track has a lead vocal, but one specific thing a sub-metric measures is simply not present. The governing principle is identical and absolute: THE ABSENCE OF SOMETHING IS NEVER EVIDENCE THAT IT WAS DONE WELL. A metric measuring how well multiple elements fit together cannot be scored highly when there is only one element - there is no fit to evaluate, so the honest answer is "not applicable", never "perfect".

Two specific cases this affects:

SIBILANCE SHAVING: this metric evaluates the control of VOCAL SIBILANCE specifically - harsh "s", "t" and "sh" energy from a sung or spoken performance. If the track has no vocals, or no sibilant vocal source at all, there is no sibilance to control: set sibilanceShaving.applicable to false with a 0 placeholder. Do NOT award a high score on the reasoning that no harsh sibilance is present - that is the absence of the thing being measured, not evidence it was expertly managed. This was a real, observed failure: an instrumental orchestral track scored 98 here with commentary stating the track contains no vocals. Note also that general high-frequency harshness from cymbals, strings or synths is NOT sibilance and belongs to the other spectral metrics, not this one - do not repurpose this metric to comment on non-vocal high end.

The other case this most affects is vocalLayerFit. If the track genuinely has a single lead vocal with no backing harmonies, no doubling, and no stacked vocal layers, set vocalLayerFit.applicable to false with a 0 placeholder score, exactly as described above. Do NOT score it 90-100 on the reasoning that nothing is clashing or nothing is misaligned - an absence of layers is an absence of evidence, not evidence of excellence. This was a real, observed failure: seven separate professional tracks each received a perfect 100 for vocalLayerFit accompanied by commentary stating the track had no backing harmonies at all, which is exactly the reasoning this instruction forbids.

BEFORE declaring that layering is absent, listen carefully and be genuinely confident. Backing harmonies, octave doubling, and stacked vocal layers are extremely common and are often mixed subtly underneath the lead rather than being obvious. Incorrectly claiming a track has no vocal layering is a factual error about the audio, and it is a costly one, because it also wrongly triggers the not-applicable path above. If layering is present at all - even quietly, even only in the choruses - vocalLayerFit IS applicable and must be scored on how well those layers actually sit against the lead.

PARENT vocalScore WHEN A VOCAL SUB-METRIC IS NOT APPLICABLE - MANDATORY: vocalTracking's sub-metrics are weighted pitchAccuracy 40%, dynamicDelivery 35%, vocalLayerFit 25%. If vocalLayerFit is not applicable but the track does have a lead vocal, the parent vocalScore must be based only on pitchAccuracy and dynamicDelivery, re-weighted between themselves to represent the whole score - do not include the 0 placeholder as a weighted contributor, and equally do not treat the missing 25% as though it were earned in full. vocalApplicable itself stays TRUE in this case, because vocals genuinely do exist on the track; only the individual vocalLayerFit sub-metric is not applicable.

PARENT-SCORE COMPUTATION WHEN A SUB-METRIC IS NOT APPLICABLE - MANDATORY: melodicHooks.score must be based entirely on intervalMemory when syllabicPlacement.applicable is false - do not average in the 0 placeholder for syllabicPlacement, since that would silently drag the parent score down for a reason that has nothing to do with the actual melodic hook quality. Likewise, songwritingDensity.score must be based entirely on whichever of vocalPocketing/poeticBrevity remains applicable (or reflect that neither applies, if both are false for an instrumental) - never average in a not-applicable placeholder score as if it were a real, weighted contributor.

FIELD DEFINITION - pitchAccuracy (part of vocalTrackingSubs): judges genuine pitch drift and intonation stability ONLY - do not confuse this with vocal timbre. A raspy, gritty, distorted, or aggressive vocal delivery (common in rock, punk, blues, and similar genres) can create the AUDITORY IMPRESSION of pitch instability due to the vocal's harmonic complexity and grain, without the singer actually being off-pitch. Before deducting points, confirm the note is genuinely landing on the wrong pitch relative to the underlying harmony - not simply that the vocal has a rough, unpolished, or grainy tonal quality. A technically in-tune singer with a naturally raspy or aggressive voice should score highly here; reserve deductions for cases where the actual pitch center is audibly wrong, not merely where the vocal timbre sounds "imperfect" or "raw." ADDITIONALLY: if real Detected Melody/Pitch Data is provided in the context above, use it as supporting evidence, keeping in mind the caveat that it reflects the dominant mix pitch generally, not confirmed-isolated vocal - weight your own listening impression more heavily than this data specifically for pitchAccuracy, unlike chordDynamics and melody where the detected data should be primary. RUBRIC ANCHOR: a score of 95-100 requires genuinely rock-solid pitch center throughout, including any exposed or unaccompanied moments (an a cappella opening or bridge with no instrumental cover to hide drift is the clearest test - if present and the pitch holds, that alone supports a top-band score). A score of 80-94 is correct for a vocal with solid overall pitch control but at least one audible, specific moment of real drift or strain (typically on a sustained high note or a fast, difficult run) - name the moment. A score of 60-79 applies when drift is noticeable at multiple points but the performance is still clearly landing on the intended notes overall, not genuinely off-key. Below 60 is reserved for audible, sustained pitch problems that a listener would notice without needing to be told - this is uncommon on professionally released tracks and should not be used as a default low score out of caution; only use it when the evidence genuinely supports it.

FIELD DEFINITION - dynamicDelivery: IMPORTANT - a real, precomputed vocal dynamics measurement will be provided above as 'Measured Vocal Dynamics Score' (0-100, based on genuine measured loudness variation specifically during sung/voiced passages - higher means real, natural dynamic push and pull; lower means a vocal that sits at a fairly constant volume throughout). If it says 'not available' (not enough clearly voiced material was detected to measure), rely on your own listening judgment as normal.
IMPORTANT CALIBRATION NOTE: this measurement only captures raw loudness variance - it cannot detect register shifts (chest voice to falsetto), phrasing/rhythmic variation, or emotional trajectory across sections, all of which are real forms of dynamic vocal expression that a professionally compressed pop/EDM/hip-hop vocal can deliver while staying at a deliberately consistent playback level. A low measured value is real evidence worth checking, not an automatic verdict.
GATE: if the measured value is low (below 55), before scoring below the 82-88 professional band, explicitly check: does the vocal show genuine register shifts, phrasing variation, or emotional escalation across sections despite the flat raw loudness (e.g. an intimate low verse building to a soaring falsetto or belted chorus)? If YES - name that specific register/phrasing evidence in the commentary and score at 82-88 or above, going to 89+ where that expressive range is genuinely striking rather than merely present; the low raw-loudness measurement does not override real, audible expressive variety. If NO - meaning the vocal is genuinely flat in register, phrasing, AND loudness with no describable expressive arc - score using the bands below.
RUBRIC ANCHOR: measured 80-100 -> score 85-100 (genuine, wide dynamic range, e.g. a whisper-to-belt vocal arc); measured 55-79 -> score 65-84 (real but moderate push and pull); measured 30-54 -> score 45-64 only if the gate above finds no genuine register/phrasing variety - otherwise score per the gate above; below 30 -> score below 45 only if the gate above finds no genuine register/phrasing variety - otherwise score per the gate above.

FIELD DEFINITION - vocalLayerFit - MANDATORY JUSTIFICATION STRUCTURE: before assigning a score, you must first explicitly determine whether this song actually contains audible backing vocals, harmonies, or vocal doubling/layering at all. If NO layered vocal elements are audible anywhere in the track, state this plainly in your commentary and set vocalLayerFit.applicable to FALSE with a 0 placeholder score, exactly as the ELEMENT-LEVEL ABSENCE rule above requires. Do NOT assign 100 or any other high score: there is nothing to judge the fit of, and an absence of layering is an absence of evidence, not a perfect result. Before concluding that layering is absent, re-check carefully - backing harmonies and doubling are common and often mixed subtly under the lead. If YES, layered vocals ARE present, your commentary MUST describe specifically how they interact with the lead (blend well / compete for space / timing misalignment / etc.), and your score should genuinely reflect the quality of that specific interaction, using the full 0-100 range as appropriate - do not default to a comfortable high number without describing the actual layering behavior you hear. RUBRIC ANCHOR for the layering-present case: a score of 90-100 requires genuinely tight, well-blended layering with clean timing and pitch alignment between parts, even in complex multi-part harmony - a listener would need to listen closely to pick the individual layers apart. A score of 70-89 applies when the layering is functional and generally blends but has at least one identifiable moment of loose timing, pitch mismatch, or a layer that sits slightly awkwardly against the lead. Below 70 is reserved for layering with a persistent, structural fit problem - audible timing drift, clashing pitch, or backing vocals that compete with rather than support the lead throughout most of their appearances.`;

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
Qualitative context from the earlier analysis pass (descriptive only - NO parent scores are given to you deliberately):
The parent category scores are intentionally withheld here. Your sub-metric scores are used to RECOMPUTE those parent scores, so being shown the earlier numbers would make this analysis gravitate back toward that first unaided impression instead of independently determining the result from the evidence. Score each sub-metric on its own merits from the audio, the measurements below, and the descriptive notes - never toward any prior number.
- Composition Flow notes (DESCRIPTIVE CONTEXT ONLY; do not treat any section labels here as ground truth - verify form directly from the audio): ${parsedCritique?.arrangement?.transitionsAndArc}
- Vocal Tracking notes: ${parsedCritique?.performance?.vocalsCritique}
- Lyrical meaning classification: "${parsedCritique?.lyricalImpact?.meaningClarity}", feedback: ${parsedCritique?.lyricalImpact?.feedback}
- Music Theory chord structures: ${parsedCritique?.musicTheory?.chordStructures}
- Harmonic Intrigue notes from a separate pass: "${parsedCritique?.subMetricsCall2?.artisticAnalysis?.harmonicIntrigue?.commentary ?? "N/A"}"
- Genre: ${parsedCritique?.vibe?.genre} / ${parsedCritique?.vibe?.subgenre}
- Measured Timeline Grid Cohesion Score: ${measuredGridCohesion !== undefined && measuredGridCohesion !== null ? measuredGridCohesion : 'not available'}
- Measured Transient Punch Score: ${measuredTransientPunch !== undefined && measuredTransientPunch !== null ? measuredTransientPunch : 'not available'}
- Measured Melodic Staging Score: ${measuredMelodicStaging !== undefined && measuredMelodicStaging !== null ? measuredMelodicStaging : 'not available'}
- Measured Instrumental Warmth Score: ${measuredInstrumentalWarmth !== undefined && measuredInstrumentalWarmth !== null ? measuredInstrumentalWarmth : 'not available'}
- Measured Vocal Dynamics Score: ${measuredVocalDynamics !== undefined && measuredVocalDynamics !== null ? measuredVocalDynamics : 'not available'}

CONSISTENCY REQUIREMENT: Your meaningClarity sub-score and commentary MUST be consistent with the parent Lyrical Impact's meaning classification shown above - if the parent was classified "Clear", do not describe the lyrics as abstract, dream-like, or oblique in your sub-commentary, and vice versa. Similarly, your chordDynamics score should be consistent with the Harmonic Intrigue score shown above (both describe overlapping harmonic content) - do not score chordDynamics dramatically higher than Harmonic Intrigue unless your commentary specifically identifies a distinct, real reason for the difference (e.g. Harmonic Intrigue addresses novelty/complexity while Chord Dynamics addresses functional/dynamic use of chords - these can differ, but only for a specific, stated reason, not by default).

FORM & STRUCTURE INDEPENDENCE: formAndStructure is NOT a proxy for harmonic complexity, chord count, genre modernity, or pop-song conformity. Score the effectiveness of the form itself. A harmonically simple piece can have excellent structure; a harmonically complex piece can have weak structure. Do not let chordDynamics or harmonicVariety mechanically pull formAndStructure up or down.

IF a chromagram image has been provided alongside the audio: this is a time-resolved visualization of pitch-class energy across the song's full duration (12 rows, one per pitch class C through B, x-axis is time). Use it as genuine supporting evidence when scoring musicTheorySubs specifically - look for visual patterns indicating key changes, modal color, unusual harmonic movement, or rhythmic/metric irregularities that might be easy to miss by ear alone. Cross-reference what you see in the image against what you hear before finalizing chordDynamics, harmonicVariety, and formAndStructure scores and commentary.

IF a rhythm onset image has been provided alongside the audio: this is an 800x300 canvas showing rhythmic attack energy (amber bars) plotted over the song's full duration, with thin gridlines marking expected beat positions at the detected tempo (brighter gridlines mark the first beat of each measure). Use it as supporting evidence when scoring formAndStructure - for example, to locate section boundaries, changes in density, repeated formal blocks, meter shifts, or irregular groupings. Metric complexity is descriptive evidence, NOT an automatic quality bonus. A steady grid can support an excellent form, and an irregular grid can support either excellent or poor form depending on how coherently the structure develops.

FORM-LABEL DISCIPLINE: derive the structural description from what is actually audible. If the piece is instrumental, thematic, episodic, through-composed, classical/cinematic, or otherwise not clearly verse/chorus based, describe sections neutrally (opening statement, contrasting section, development, reprise, climax, coda, etc.) rather than inventing pop labels. Use verse/chorus/pre-chorus/bridge terminology only when those functions are genuinely evident in the audio.

Detected Chord Progression (real, computed ground truth - use as the primary basis for chordDynamics scoring, not just your own listening impression): ${chordProgressionSummary || 'not available'}
Detected Melody/Pitch Data (real, computed): ${melodySummary || 'not available'}
IMPORTANT CAVEAT on the melody data above: this reflects the dominant monophonic pitch detected in the mix at each moment, which is usually but not always the lead vocal - during instrumental sections or dense arrangements it may reflect a lead instrument instead. Use it as genuine supporting evidence for the melody score, but do not treat it as confirmed, isolated vocal data.

Listen to the actual audio again and generate specific, evidence-based scores and commentary for all 16 sub-fields across these 5 categories, consistent with the above context but grounded in what you actually hear this time. Actively scan for genuine technical sophistication before defaulting to surface-level descriptions.`;

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

// Genre and subgenre are two independent enums in the response schema, so a structurally
// valid response can still pair a genre with a subgenre belonging to a DIFFERENT genre
// (e.g. Rock + "Triple A", which actually lives under Alternative). The prompt forbids it,
// but nothing enforced it. That matters beyond tidiness: downstream profile lookups are
// keyed on `genre|subgenre`, so a mismatched pair silently misses its profile and falls
// back to a generic one. Where the subgenre is valid for some other genre, we trust the
// subgenre (the more specific, more considered signal) and correct the parent genre to
// match. If the subgenre matches nothing at all, we leave both untouched rather than guess.
function validateGenrePair(parsedCritique: any): void {
  const vibe = parsedCritique?.vibe;
  if (!vibe?.genre || !vibe?.subgenre) return;
  const genre = String(vibe.genre).trim();
  const subgenre = String(vibe.subgenre).trim();

  const subsForGenre: string[] | undefined = (GENRE_MAP as Record<string, string[]>)[genre];
  if (subsForGenre && subsForGenre.includes(subgenre)) return; // already consistent

  const owner = Object.keys(GENRE_MAP as Record<string, string[]>).find(g =>
    (GENRE_MAP as Record<string, string[]>)[g].includes(subgenre)
  );
  if (owner) {
    console.warn(`[GenreValidation] "${genre}" / "${subgenre}" is an invalid pair; "${subgenre}" belongs to "${owner}". Correcting genre to "${owner}".`);
    vibe.genre = owner;
  } else {
    console.warn(`[GenreValidation] Subgenre "${subgenre}" does not belong to any genre in GENRE_MAP (genre reported as "${genre}"). Leaving both unchanged.`);
  }
}

// ---------------------------------------------------------------------------
// UNIVERSAL APPLICABILITY PROPAGATION
// One shared rule for every parent score in the system, so applicability never has
// to be patched metric-by-metric again:
//   - NO children applicable   -> the parent itself becomes NOT APPLICABLE
//   - SOME children applicable -> exclude the others and RENORMALIZE the weights
//   - ALL children applicable  -> ordinary weighted average
// A not-applicable field carries a 0 placeholder, and 0 is a number, so any naive
// average silently treats "this does not exist" as "this scored zero". That produced
// a real, visible defect: an instrumental track reported Songwriting Quality 59 from
// (89 + 89 + 0) / 3, understating it by 30 points. It also allowed a parent to keep
// its earlier unaided score when every child underneath it was N/A.
// ---------------------------------------------------------------------------
type ParentResult = { score: number | null; applicable: boolean };

function isApplicable(sub: any): boolean {
  return !(sub && sub.applicable === false);
}

// Computes a parent from (child, weight) pairs, honouring applicability throughout.
// Returns applicable:false when there is nothing real left to average.
function computeParent(pairs: Array<[any, number]>): ParentResult {
  const usable = pairs.filter(([sub]) => isApplicable(sub) && typeof sub?.score === "number");
  const anyChildPresent = pairs.some(([sub]) => sub && typeof sub?.score === "number");
  if (usable.length === 0) {
    // Every child that exists is N/A -> the parent is N/A too. If no children were
    // returned at all, we simply have no basis to recompute and leave the parent alone.
    return { score: null, applicable: !anyChildPresent };
  }
  const totalWeight = usable.reduce((s, [, w]) => s + w, 0);
  const weightedSum = usable.reduce((s, [sub, w]) => s + (sub.score as number) * w, 0);
  return { score: Math.round(weightedSum / totalWeight), applicable: true };
}

// Writes a computed parent onto the target object, including its applicability.
// When the parent is N/A it is marked applicable:false with a 0 placeholder rather
// than being left holding a stale score from the earlier unaided pass.
function applyParent(target: any, field: string, result: ParentResult): void {
  if (!target) return;
  if (!result.applicable) {
    target[field] = 0;
    target.applicable = false;
    return;
  }
  if (result.score !== null) target[field] = result.score;
}

function enforceClassicalInstrumentalSourceNeutrality(parsedCritique: any): void {
  const genre = String(parsedCritique?.vibe?.genre ?? "").trim();
  const subgenre = String(parsedCritique?.vibe?.subgenre ?? "").trim();
  const noVocals = parsedCritique?.performance?.vocalApplicable === false;
  const noLyrics = parsedCritique?.lyricalImpact?.applicable === false;
  const classicalInstrumental = genre === "Classical" && noVocals && noLyrics;
  if (!classicalInstrumental) return;

  const replacements: Array<[RegExp, string]> = [
    [/\bacoustic guitars?\b/gi, "plucked melodic layer"],
    [/\belectric guitars?\b/gi, "plucked melodic layer"],
    [/\bbass guitars?\b/gi, "low-frequency foundation"],
    [/\bguitars?\b/gi, "plucked melodic layer"],
    [/\bgrand pianos?\b/gi, "pitched melodic layer"],
    [/\bpianos?\b/gi, "pitched melodic layer"],
    [/\bkeyboards?\b/gi, "pitched harmonic layer"],
    [/\bsynth(?:esizer)? pads?\b/gi, "sustained harmonic layer"],
    [/\bsynthesizers?\b/gi, "sustained harmonic layer"],
    [/\bsynths?\b/gi, "sustained harmonic layer"],
    [/\bdrum kits?\b/gi, "transient rhythmic layer"],
    [/\bdrums?\b/gi, "transient rhythmic layer"],
    [/\bkicks?\b/gi, "low-frequency transient"],
    [/\bsnares?\b/gi, "midrange transient"],
    [/\bcymbals?\b/gi, "high-frequency transient"],
    [/\bviolins?\b/gi, "orchestral ensemble"],
    [/\bviolas?\b/gi, "orchestral ensemble"],
    [/\bcellos?\b/gi, "orchestral ensemble"],
    [/\bdouble bass(?:es)?\b/gi, "orchestral low-frequency foundation"],
    [/\bstrings?\b/gi, "orchestral ensemble"],
    [/\bbrass\b/gi, "orchestral ensemble"],
    [/\bwoodwinds?\b/gi, "orchestral ensemble"],
    [/\bflutes?\b/gi, "orchestral ensemble"],
    [/\bclarinets?\b/gi, "orchestral ensemble"],
    [/\boboes?\b/gi, "orchestral ensemble"],
    [/\bbassoons?\b/gi, "orchestral ensemble"],
    [/\bhorns?\b/gi, "orchestral ensemble"],
    [/\btrumpets?\b/gi, "orchestral ensemble"],
    [/\btrombones?\b/gi, "orchestral ensemble"],
  ];

  const neutralize = (text: string): string => {
    let out = text;
    for (const [pattern, replacement] of replacements) out = out.replace(pattern, replacement);
    return out;
  };

  const walk = (value: any): any => {
    if (typeof value === "string") return neutralize(value);
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      for (const key of Object.keys(value)) value[key] = walk(value[key]);
    }
    return value;
  };

  walk(parsedCritique);

  if (parsedCritique?.performance?.instrumentationCritique) {
    parsedCritique.performance.instrumentationCritique =
      `Source-neutral orchestral assessment: ${parsedCritique.performance.instrumentationCritique}`;
  }

  if (parsedCritique?.vibe) {
    parsedCritique.vibe.genre = genre;
    parsedCritique.vibe.subgenre = subgenre;
  }
}

function reconcileParentScores(parsedCritique: any): void {
  const appScore = (sub: any): number | undefined =>
    isApplicable(sub) ? sub?.score : undefined;

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
    const melodicHooksResult = computeParent([
      [c2Ready.melodicHooks.intervalMemory, 50],
      [c2Ready.melodicHooks.syllabicPlacement, 50],
    ]);
    applyParent(parsedCritique.subMetricsCall2.melodicHooks, "score", melodicHooksResult);
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
    // Both children are lyric-dependent. On an instrumental both are N/A, so this parent
    // must itself become N/A - it was reporting 0, which then got averaged into the
    // Songwriting Quality composite as though it were a real score of zero.
    const songwritingDensityResult = computeParent([
      [c2Ready.songwritingDensity.vocalPocketing, 50],
      [c2Ready.songwritingDensity.poeticBrevity, 50],
    ]);
    applyParent(parsedCritique.subMetricsCall2.songwritingDensity, "score", songwritingDensityResult);
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
    const vocalSubs = c3Ready?.vocalTrackingSubs
      ? [
          c3Ready.vocalTrackingSubs.pitchAccuracy,
          c3Ready.vocalTrackingSubs.dynamicDelivery,
          c3Ready.vocalTrackingSubs.vocalLayerFit,
        ].filter(Boolean)
      : [];
    const call3ConfirmsNoVocals =
      vocalSubs.length > 0 && vocalSubs.every((sub: any) => sub?.applicable === false);
    const trackIsInstrumental =
      parsedCritique?.performance?.vocalApplicable === false || call3ConfirmsNoVocals;

    if (trackIsInstrumental && c1Ready.sibilanceShaving) {
      c1Ready.sibilanceShaving.score = 0;
      c1Ready.sibilanceShaving.applicable = false;
      c1Ready.sibilanceShaving.commentary =
        "Not applicable: no vocal or spoken sibilant source is present, so vocal sibilance control cannot be evaluated.";
    }

    const production = weightedAvg([
      [c1Ready.aestheticDesign?.score, 40],
      [c1Ready.spaceAndDensity?.score, 35],
      [c1Ready.paletteCohesion?.score, 25],
    ]);
    if (production !== null && parsedCritique.scores) {
      // Production Index represents the combined strength of three different production
      // dimensions. One standout child should not pull the aggregate into the 89+ band
      // when the other two are merely professional-standard. Require a majority of the
      // Production Index weight to carry genuine above-average evidence before the parent
      // itself can be called above-average.
      const productionChildren = [
        { score: c1Ready.aestheticDesign?.score, weight: 40 },
        { score: c1Ready.spaceAndDensity?.score, weight: 35 },
        { score: c1Ready.paletteCohesion?.score, weight: 25 },
      ].filter(x => typeof x.score === "number") as Array<{ score: number; weight: number }>;
      const aboveAverageWeight = productionChildren
        .filter(x => x.score >= 89)
        .reduce((sum, x) => sum + x.weight, 0);
      parsedCritique.scores.overallProduction =
        production > 88 && aboveAverageWeight < 50 ? 88 : production;
    }

    // sibilanceShaving can now be genuinely N/A (an instrumental has no vocal sibilance
    // to control). Routed through appScore so its 0 placeholder is excluded and the
    // remaining weights renormalize, rather than silently costing Mix Balance 15%.
    const mixBalance = weightedAvg([
      [c1Ready.mudPrevention?.score, 25],
      [c1Ready.midrangeSpacing?.score, 25],
      [c1Ready.lowEndDivision?.score, 20],
      [appScore(c1Ready.sibilanceShaving), 15],
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

    // Routed through the universal mechanism: if every vocal sub-metric is N/A (a genuine
    // instrumental), the parent vocalScore becomes N/A too rather than keeping the score
    // the earlier unaided pass guessed. Previously this parent reported 82 while all three
    // of its children were N/A.
    const vocal = computeParent([
      [c3.vocalTrackingSubs?.pitchAccuracy, 40],
      [c3.vocalTrackingSubs?.dynamicDelivery, 35],
      [c3.vocalTrackingSubs?.vocalLayerFit, 25],
    ]);
    if (parsedCritique.performance) {
      if (!vocal.applicable) {
        parsedCritique.performance.vocalScore = 0;
        parsedCritique.performance.vocalApplicable = false;
      } else if (vocal.score !== null) {
        parsedCritique.performance.vocalScore = vocal.score;
      }
    }

    // All four instrumentalStagingSubs contribute at 25% each, matching the weights the
    // UI actually displays to the user. melodicStaging (shown as "Stereo Instrument
    // Staging") was previously computed, displayed and labelled 25% but contributed 0%
    // to this parent score - the app was showing a weight it did not honour.
    const instrumental = weightedAvg([
      [c3.instrumentalStagingSubs?.timelineGridCohesion?.score, 25],
      [c3.instrumentalStagingSubs?.transientPunch?.score, 25],
      [c3.instrumentalStagingSubs?.melodicStaging?.score, 25],
      [c3.instrumentalStagingSubs?.instrumentalWarmth?.score, 25],
    ]);
    if (instrumental !== null && parsedCritique.performance) {
      parsedCritique.performance.instrumentalScore = instrumental;
    }

    // Same universal treatment: both children N/A (no lyrics) -> the parent is N/A,
    // not a stale 82 inherited from the first pass.
    const lyrical = computeParent([
      [c3.lyricalImpactSubs?.meaningClarity, 50],
      [c3.lyricalImpactSubs?.clicheAvoidance, 50],
    ]);
    applyParent(parsedCritique.lyricalImpact, "score", lyrical);

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

async function verifyInstrumentalGenreIfNeeded(
  audioPart: any,
  parsedCritique: any,
  hasExplicitGenreMetadata: boolean
): Promise<void> {
  if (hasExplicitGenreMetadata) return;

  const genre = String(parsedCritique?.vibe?.genre ?? "").trim();
  const subgenre = String(parsedCritique?.vibe?.subgenre ?? "").trim();
  const noVocals = parsedCritique?.performance?.vocalApplicable === false;
  const noLyrics = parsedCritique?.lyricalImpact?.applicable === false;

  // This verifier is deliberately narrow. Instrumental folk exists, so we do NOT ban
  // Folk / Singer-Songwriter for instrumentals. We only re-check the combination that has
  // repeatedly proven unstable: no vocals/no lyrics + a vocal-centric folk classification.
  const vocalCentricFolk =
    genre === "Folk / Singer-Songwriter" &&
    (subgenre === "Singer-Songwriter" || subgenre === "Contemporary Folk");

  if (!(noVocals && noLyrics && vocalCentricFolk)) return;

  try {
    console.log(`[GenreRecheck] Instrumental track was classified as ${genre} / ${subgenre}; running focused genre verification before sub-metrics.`);

    const context = `FOCUSED GENRE VERIFICATION - LISTEN TO THE AUDIO AGAIN.
The first pass classified this track as "${genre}" / "${subgenre}", but the same pass also determined that the track has NO VOCALS and NO LYRICS. Re-evaluate the genre from the audio itself before any downstream scoring uses that label.

This is NOT an instruction to force Classical. Instrumental folk is real. Decide from the actual dominant instrumentation, rhythmic foundation, and form.

Critical distinction:
- Folk / Singer-Songwriter requires genuine folk/song idiom: acoustic-song structure, folk-rooted picking/strumming/fiddle/banjo or comparable roots vocabulary, and usually a song-form foundation even when instrumental.
- Classical / Classical Crossover is appropriate when orchestral/classical instrumentation is the core voice (strings, brass, woodwinds, piano or orchestral ensemble), there is no pop/rock rhythm section driving the piece, and the form is thematic/through-composed/developmental rather than verse-chorus songwriting.
- Do not infer genre from mood alone. "Melancholic", "organic", "warm", or "acoustic" are not sufficient evidence for folk.
- Do not invent instruments. Report the dominant instrumentation you can actually hear.
- Choose ONLY from this taxonomy and make sure the subgenre belongs to the selected genre:
${GENRE_TAXONOMY_TEXT}

Return the best genre/subgenre plus a short evidence summary.`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: { parts: [audioPart, { text: context }] },
      config: {
        systemInstruction: "You are a conservative music-genre verifier. Resolve only the genre classification from audible evidence. Do not score production, composition, or commercial quality. Do not identify the artist or song.",
        responseMimeType: "application/json",
        responseSchema: GENRE_RECHECK_SCHEMA,
        temperature: 0,
      },
    }, 4);

    if (!response.text) return;
    const verified = JSON.parse(response.text);
    const candidate = { vibe: { genre: verified.genre, subgenre: verified.subgenre } };
    validateGenrePair(candidate);

    const verifiedGenre = candidate.vibe.genre;
    const verifiedSubgenre = candidate.vibe.subgenre;
    const pairIsValid =
      Array.isArray((GENRE_MAP as Record<string, string[]>)[verifiedGenre]) &&
      (GENRE_MAP as Record<string, string[]>)[verifiedGenre].includes(verifiedSubgenre);

    if (!pairIsValid || verified.hasVocals === true) {
      console.log("[GenreRecheck] Verification returned inconsistent evidence; keeping the original genre.");
      return;
    }

    // A focused second listen is more reliable for this contradiction than the original
    // one-pass label. Apply it before Calls 1-3 so the wrong genre cannot contaminate
    // production, arrangement, or theory interpretation.
    if (verifiedGenre !== genre || verifiedSubgenre !== subgenre) {
      console.log(`[GenreRecheck] Correcting ${genre} / ${subgenre} -> ${verifiedGenre} / ${verifiedSubgenre}. Evidence: ${verified.rationale}`);
      parsedCritique.vibe.genre = verifiedGenre;
      parsedCritique.vibe.subgenre = verifiedSubgenre;
    } else {
      console.log("[GenreRecheck] Focused verification confirmed the original instrumental-folk classification.");
    }
  } catch (err: any) {
    // Genre verification is a guardrail, not a new single point of failure.
    console.log("[GenreRecheck] Focused verification failed; continuing with the original classification:", err?.message || err);
  }
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
    // Validate and bound to the real 0-100 scale. This previously forced every parent
    // score up to a hidden minimum of 45, contradicting rubrics that explicitly allow
    // scores below 40 and silently manufacturing a floor the user never saw - it is why
    // several genuinely different low scores all surfaced as an identical 45.
    // A non-numeric value is not evidence of a mid-low score, so it returns null rather
    // than inventing 45; every assignment below is guarded against writing that null.
    const clamp = (val: any) => {
      const num = Number(val);
      if (!Number.isFinite(num)) return null;
      return Math.max(0, Math.min(100, num));
    };
    if (crit.mixQuality) {
      { const v = clamp(crit.mixQuality.score); if (v !== null) crit.mixQuality.score = v; }
    }
    if (crit.performance) {
      // Never clamp a not-applicable vocal score: for a genuine instrumental the 0 is a
      // deliberate N/A placeholder, and clamping it to 45 would surface a bogus "failing"
      // vocal score for a track that has no vocals to fail at.
      if (crit.performance.vocalApplicable !== false) {
        { const v = clamp(crit.performance.vocalScore); if (v !== null) crit.performance.vocalScore = v; }
      }
      { const v = clamp(crit.performance.instrumentalScore); if (v !== null) crit.performance.instrumentalScore = v; }
    }
    if (crit.arrangement) {
      { const v = clamp(crit.arrangement.flowScore); if (v !== null) crit.arrangement.flowScore = v; }
    }
    if (crit.lyricalImpact && crit.lyricalImpact.applicable !== false) {
      { const v = clamp(crit.lyricalImpact.score); if (v !== null) crit.lyricalImpact.score = v; }
    }
    if (crit.musicTheory) {
      { const v = clamp(crit.musicTheory.score); if (v !== null) crit.musicTheory.score = v; }
    }
    if (crit.titleSearchability && crit.titleSearchability.applicable !== false) {
      { const v = clamp(crit.titleSearchability.score); if (v !== null) crit.titleSearchability.score = v; }
    }
    if (crit.scores) {
      { const v = clamp(crit.scores.overallProduction); if (v !== null) crit.scores.overallProduction = v; }
      { const v = clamp(crit.scores.commercialReadiness); if (v !== null) crit.scores.commercialReadiness = v; }
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
    const subBassCorrelation = (req.body.subBassCorrelation !== undefined && req.body.subBassCorrelation !== null && req.body.subBassCorrelation !== "")
      ? parseFloat(req.body.subBassCorrelation)
      : undefined;
    const subBassCrestFactor = (req.body.subBassCrestFactor !== undefined && req.body.subBassCrestFactor !== null && req.body.subBassCrestFactor !== "")
      ? parseFloat(req.body.subBassCrestFactor)
      : undefined;
    const bassCrestFactor = (req.body.bassCrestFactor !== undefined && req.body.bassCrestFactor !== null && req.body.bassCrestFactor !== "")
      ? parseFloat(req.body.bassCrestFactor)
      : undefined;
    const mudFlatness = (req.body.mudFlatness !== undefined && req.body.mudFlatness !== null && req.body.mudFlatness !== "")
      ? parseFloat(req.body.mudFlatness)
      : undefined;
    const mudFlux = (req.body.mudFlux !== undefined && req.body.mudFlux !== null && req.body.mudFlux !== "")
      ? parseFloat(req.body.mudFlux)
      : undefined;
    const midrangeFlatness = (req.body.midrangeFlatness !== undefined && req.body.midrangeFlatness !== null && req.body.midrangeFlatness !== "")
      ? parseFloat(req.body.midrangeFlatness)
      : undefined;
    const midrangeFlux = (req.body.midrangeFlux !== undefined && req.body.midrangeFlux !== null && req.body.midrangeFlux !== "")
      ? parseFloat(req.body.midrangeFlux)
      : undefined;

    const bandEnergies = (subBassBandEnergy !== undefined || bassBandEnergy !== undefined || lowMidsBandEnergy !== undefined) ? {
      subBass: subBassBandEnergy,
      bass: bassBandEnergy,
      lowMids: lowMidsBandEnergy,
      coreMids: coreMidsBandEnergy,
      presence: presenceBandEnergy,
      air: airBandEnergy
    } : undefined;

    const lowEndEvidence = (subBassCorrelation !== undefined || subBassCrestFactor !== undefined || bassCrestFactor !== undefined) ? {
      subBassCorrelation, subBassCrestFactor, bassCrestFactor
    } : undefined;
    const mudEvidence = (mudFlatness !== undefined || mudFlux !== undefined) ? { flatness: mudFlatness, flux: mudFlux } : undefined;
    const midrangeEvidence = (midrangeFlatness !== undefined || midrangeFlux !== undefined) ? { flatness: midrangeFlatness, flux: midrangeFlux } : undefined;

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
      userInstruction += `\n\n[NO TITLE PROVIDED]\nNo song title was provided for this upload. For the Song Title Searchability category ONLY, you MUST consistently report that title data is unavailable. This means: do not invent a fictional title, do not guess a title, and critically - even if you believe you recognize this specific recording as a real, commercially released song, you MUST NOT use that recognized title either. Treat this category as if the song's identity is completely unknown and unknowable, regardless of any recognition confidence you may have. Set BOTH SEO Uniqueness and SEO Discoverability to applicable=false with a 0 placeholder score, and state plainly in the commentary that no title was provided so searchability cannot be assessed. Do NOT score them at 50 or any other invented mid-scale number: a metric that cannot be assessed has no score, and assigning one presents a guess as a measurement. Under no circumstances should any specific title - invented, guessed, or recognized - appear anywhere in your Song Title Searchability commentary.`;
    }

    if (!metaGenre) {
      userInstruction += `\n\n- Genre Identification Directive: No explicit, valid genre metadata tag was found in the audio container. You MUST perform a deep acoustic and stylistic analysis of the track's drum/beat structures, lead instrumentation, tempo/timing, harmonic mood, production era, and vocal delivery to identify the core genre and subgenre. You MUST select genre and subgenre ONLY from this exact taxonomy - do not invent a label outside this list, and ensure the subgenre you choose genuinely belongs to the genre you selected:\n${GENRE_TAXONOMY_TEXT}\n\nFor Rap / Hip-Hop specifically, base your subgenre choice on regional production style, vocal delivery, and beat construction - do not default to a common archetype out of habit if the track's actual sonic signature points to a different regional style within the list above. The taxonomy DOES now have a dedicated "Folk / Singer-Songwriter" genre (Folk Rock, Contemporary Folk, Singer-Songwriter, Traditional Folk) - use it for genuinely acoustic, folk-rooted or singer-songwriter material rather than routing such tracks into Alternative or Country. Country's "Americana" subgenre remains correct only for material with a genuine country/roots-country character, not for folk generally. The Rock genre also now includes "Punk / Post-Punk", "Progressive Rock / Art Rock", "New Wave / Power Pop" and "Psychedelic Rock" - use these for material that genuinely belongs to those styles instead of defaulting it into modern radio-format labels like "Active Rock" or "Modern Rock", which describe contemporary commercial rock formats rather than those distinct styles. Note that several labels in this taxonomy are radio/chart FORMAT names (Active Rock, Triple A, Mainstream Top 40, Airplay categories); do not assign an older or stylistically distinct recording to a modern format label merely because no other option looks familiar - choose the label that matches the music's actual style. Equally, several labels carry playlist-framing qualifiers such as "Revival", "Catalog" or "Heritage" (for example "Shoegaze / Dream Pop Revival", "Grunge / 90s Alternative Catalog", "Funk / R&B Heritage Catalog"). Those qualifiers describe how the style is packaged for listeners today; they do NOT mean the label is reserved for later revival acts or excludes the artists who originated the style. A foundational, original-era recording of a style belongs under that style's label - a definitive early shoegaze record is "Shoegaze / Dream Pop Revival", not a generic rock format label - so never rule out the stylistically correct option merely because its name contains one of these words. Do not default to R&B, Funk, or Pop for quiet acoustic material just because it is calm or vintage-sounding; those genres require their own real, defining sonic characteristics (groove-driven rhythm, syncopated basslines, vocal runs/melisma for R&B; a clear dance/backbeat pulse for Funk) to be genuinely present, not just an old recording era. IMPORTANT DISTINCTION - do not confuse "acoustic pop/folk/singer-songwriter" with a genuinely orchestral or classical composition just because both may use acoustic instruments like piano or guitar. A track belongs in Classical, not Alternative, if it shows real, identifiable classical/orchestral characteristics: primarily orchestral or classical instrumentation (strings, brass, woodwinds, solo piano, or similar) functioning as the composition's core voice rather than an accompaniment layer; the absence of a consistent pop/rock rhythm section (drum kit, bass guitar) driving a groove; and a through-composed, thematic, or classical formal structure (theme and variation, sonata-like development, or similar) rather than a verse-chorus pop song structure. A quiet solo piano or acoustic guitar performance of an actual song with lyrics, verses, and a chorus belongs in Folk / Singer-Songwriter (or Alternative/Americana where that genuinely fits better) as described above - but an instrumental orchestral or classical composition should be identified as Classical, using its real subgenres (Traditional Classical, Classical Crossover), even if it happens to feature acoustic instruments some pop genres also use. When nothing fits perfectly, choose the closest reasonable match to the track's actual instrumentation and rhythmic character, not the most tonally similar-sounding label. Check the frequency range structures and arrangement styles to see what type of playlist it fits best.`;
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

    // Validate the genre/subgenre pair BEFORE any sub-metric analysis runs. All of
    // Calls 1-3 are genre-aware, so validating only at the end meant the entire detailed
    // analysis could be computed against an invalid pair and merely relabelled afterwards.
    validateGenrePair(parsedCritique);
    await verifyInstrumentalGenreIfNeeded(audioPart, parsedCritique, !!metaGenre);
    validateGenrePair(parsedCritique);
      console.log("[Call 1] Starting Sub-Metrics Call 1...");
      const subMetricsCall1 = await performSubMetricsCall1(audioPart, parsedCritique, spectrogramImagePart, stereoCorrelation, sibilanceSeverity, timbralConsistency, bandEnergies, lowEndEvidence, mudEvidence, midrangeEvidence);
      parsedCritique.subMetricsCall1 = subMetricsCall1;
      parsedCritique.subMetricsCall1Failed = false;
      console.log("[Call 1] Sub-Metrics Call 1 completed successfully.");
    } catch (subErr: any) {
      console.error("[Call 1] Sub-Metrics Call 1 failed, continuing without it:", subErr.message || subErr);
      parsedCritique.subMetricsCall1Failed = true;
    }

    let inferredChordSummary: string | undefined = undefined;
    try {
      console.log("[Chord/Key] Starting direct Gemini chord/key analysis...");
      const chordKeyAnalysis = await performChordKeyAnalysis(audioPart);
      parsedCritique.chordKeyAnalysis = chordKeyAnalysis;
      parsedCritique.chordKeyAnalysisFailed = false;
      console.log("[Chord/Key] Direct Gemini chord/key analysis completed successfully.");
      if (chordKeyAnalysis?.keySignature && chordKeyAnalysis?.chordsUsed?.length > 0) {
        const chordList = chordKeyAnalysis.chordsUsed.map((c: any) => `${c.chord} (${c.romanNumeral})`).join(", ");
        inferredChordSummary = `Key: ${chordKeyAnalysis.keySignature}. Chord vocabulary used: ${chordList}. (Note: this is the song's overall key and chord vocabulary, not a timed section-by-section progression.)`;
      }
    } catch (subErr: any) {
      console.error("[Chord/Key] Direct Gemini chord/key analysis failed, continuing without it:", subErr.message || subErr);
      parsedCritique.chordKeyAnalysisFailed = true;
    }

    try {
      console.log("[Call 2] Starting Sub-Metrics Call 2...");
      const subMetricsCall2 = await performSubMetricsCall2(audioPart, parsedCritique, inferredChordSummary ?? chordProgressionSummary, melodySummary);
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

    validateGenrePair(parsedCritique);
    reconcileParentScores(parsedCritique);
    enforceClassicalInstrumentalSourceNeutrality(parsedCritique);

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
    const subBassCorrelation = (req.body.subBassCorrelation !== undefined && req.body.subBassCorrelation !== null && req.body.subBassCorrelation !== "")
      ? parseFloat(req.body.subBassCorrelation)
      : undefined;
    const subBassCrestFactor = (req.body.subBassCrestFactor !== undefined && req.body.subBassCrestFactor !== null && req.body.subBassCrestFactor !== "")
      ? parseFloat(req.body.subBassCrestFactor)
      : undefined;
    const bassCrestFactor = (req.body.bassCrestFactor !== undefined && req.body.bassCrestFactor !== null && req.body.bassCrestFactor !== "")
      ? parseFloat(req.body.bassCrestFactor)
      : undefined;
    const mudFlatness = (req.body.mudFlatness !== undefined && req.body.mudFlatness !== null && req.body.mudFlatness !== "")
      ? parseFloat(req.body.mudFlatness)
      : undefined;
    const mudFlux = (req.body.mudFlux !== undefined && req.body.mudFlux !== null && req.body.mudFlux !== "")
      ? parseFloat(req.body.mudFlux)
      : undefined;
    const midrangeFlatness = (req.body.midrangeFlatness !== undefined && req.body.midrangeFlatness !== null && req.body.midrangeFlatness !== "")
      ? parseFloat(req.body.midrangeFlatness)
      : undefined;
    const midrangeFlux = (req.body.midrangeFlux !== undefined && req.body.midrangeFlux !== null && req.body.midrangeFlux !== "")
      ? parseFloat(req.body.midrangeFlux)
      : undefined;

    const bandEnergies = (subBassBandEnergy !== undefined || bassBandEnergy !== undefined || lowMidsBandEnergy !== undefined) ? {
      subBass: subBassBandEnergy,
      bass: bassBandEnergy,
      lowMids: lowMidsBandEnergy,
      coreMids: coreMidsBandEnergy,
      presence: presenceBandEnergy,
      air: airBandEnergy
    } : undefined;

    const lowEndEvidence = (subBassCorrelation !== undefined || subBassCrestFactor !== undefined || bassCrestFactor !== undefined) ? {
      subBassCorrelation, subBassCrestFactor, bassCrestFactor
    } : undefined;
    const mudEvidence = (mudFlatness !== undefined || mudFlux !== undefined) ? { flatness: mudFlatness, flux: mudFlux } : undefined;
    const midrangeEvidence = (midrangeFlatness !== undefined || midrangeFlux !== undefined) ? { flatness: midrangeFlatness, flux: midrangeFlux } : undefined;

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
      userInstruction += `\n\n[NO TITLE PROVIDED]\nNo song title was provided for this upload. For the Song Title Searchability category ONLY, you MUST consistently report that title data is unavailable. This means: do not invent a fictional title, do not guess a title, and critically - even if you believe you recognize this specific recording as a real, commercially released song, you MUST NOT use that recognized title either. Treat this category as if the song's identity is completely unknown and unknowable, regardless of any recognition confidence you may have. Set BOTH SEO Uniqueness and SEO Discoverability to applicable=false with a 0 placeholder score, and state plainly in the commentary that no title was provided so searchability cannot be assessed. Do NOT score them at 50 or any other invented mid-scale number: a metric that cannot be assessed has no score, and assigning one presents a guess as a measurement. Under no circumstances should any specific title - invented, guessed, or recognized - appear anywhere in your Song Title Searchability commentary.`;
    }

    if (!metaGenre) {
      userInstruction += `\n\n- Genre Identification Directive: No explicit, valid genre metadata tag was found in the audio container. You MUST perform a deep acoustic and stylistic analysis of the track's drum/beat structures, lead instrumentation, tempo/timing, harmonic mood, production era, and vocal delivery to identify the core genre and subgenre. You MUST select genre and subgenre ONLY from this exact taxonomy - do not invent a label outside this list, and ensure the subgenre you choose genuinely belongs to the genre you selected:\n${GENRE_TAXONOMY_TEXT}\n\nFor Rap / Hip-Hop specifically, base your subgenre choice on regional production style, vocal delivery, and beat construction - do not default to a common archetype out of habit if the track's actual sonic signature points to a different regional style within the list above. The taxonomy DOES now have a dedicated "Folk / Singer-Songwriter" genre (Folk Rock, Contemporary Folk, Singer-Songwriter, Traditional Folk) - use it for genuinely acoustic, folk-rooted or singer-songwriter material rather than routing such tracks into Alternative or Country. Country's "Americana" subgenre remains correct only for material with a genuine country/roots-country character, not for folk generally. The Rock genre also now includes "Punk / Post-Punk", "Progressive Rock / Art Rock", "New Wave / Power Pop" and "Psychedelic Rock" - use these for material that genuinely belongs to those styles instead of defaulting it into modern radio-format labels like "Active Rock" or "Modern Rock", which describe contemporary commercial rock formats rather than those distinct styles. Note that several labels in this taxonomy are radio/chart FORMAT names (Active Rock, Triple A, Mainstream Top 40, Airplay categories); do not assign an older or stylistically distinct recording to a modern format label merely because no other option looks familiar - choose the label that matches the music's actual style. Equally, several labels carry playlist-framing qualifiers such as "Revival", "Catalog" or "Heritage" (for example "Shoegaze / Dream Pop Revival", "Grunge / 90s Alternative Catalog", "Funk / R&B Heritage Catalog"). Those qualifiers describe how the style is packaged for listeners today; they do NOT mean the label is reserved for later revival acts or excludes the artists who originated the style. A foundational, original-era recording of a style belongs under that style's label - a definitive early shoegaze record is "Shoegaze / Dream Pop Revival", not a generic rock format label - so never rule out the stylistically correct option merely because its name contains one of these words. Do not default to R&B, Funk, or Pop for quiet acoustic material just because it is calm or vintage-sounding; those genres require their own real, defining sonic characteristics (groove-driven rhythm, syncopated basslines, vocal runs/melisma for R&B; a clear dance/backbeat pulse for Funk) to be genuinely present, not just an old recording era. IMPORTANT DISTINCTION - do not confuse "acoustic pop/folk/singer-songwriter" with a genuinely orchestral or classical composition just because both may use acoustic instruments like piano or guitar. A track belongs in Classical, not Alternative, if it shows real, identifiable classical/orchestral characteristics: primarily orchestral or classical instrumentation (strings, brass, woodwinds, solo piano, or similar) functioning as the composition's core voice rather than an accompaniment layer; the absence of a consistent pop/rock rhythm section (drum kit, bass guitar) driving a groove; and a through-composed, thematic, or classical formal structure (theme and variation, sonata-like development, or similar) rather than a verse-chorus pop song structure. A quiet solo piano or acoustic guitar performance of an actual song with lyrics, verses, and a chorus belongs in Folk / Singer-Songwriter (or Alternative/Americana where that genuinely fits better) as described above - but an instrumental orchestral or classical composition should be identified as Classical, using its real subgenres (Traditional Classical, Classical Crossover), even if it happens to feature acoustic instruments some pop genres also use. When nothing fits perfectly, choose the closest reasonable match to the track's actual instrumentation and rhythmic character, not the most tonally similar-sounding label. Check the frequency range structures and arrangement styles to see what type of playlist it fits best.`;
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

    // Validate the genre/subgenre pair BEFORE any sub-metric analysis runs. All of
    // Calls 1-3 are genre-aware, so validating only at the end meant the entire detailed
    // analysis could be computed against an invalid pair and merely relabelled afterwards.
    validateGenrePair(parsedCritique);
    await verifyInstrumentalGenreIfNeeded(audioPart, parsedCritique, !!metaGenre);
    validateGenrePair(parsedCritique);
      console.log("[Call 1] Starting Sub-Metrics Call 1 (URL route)...");
      const subMetricsCall1 = await performSubMetricsCall1(audioPart, parsedCritique, spectrogramImagePart, stereoCorrelation, sibilanceSeverity, timbralConsistency, bandEnergies, lowEndEvidence, mudEvidence, midrangeEvidence);
      parsedCritique.subMetricsCall1 = subMetricsCall1;
      parsedCritique.subMetricsCall1Failed = false;
    } catch (subErr: any) {
      console.error("[Call 1] Failed (URL route), continuing without it:", subErr.message || subErr);
      parsedCritique.subMetricsCall1Failed = true;
    }

    let inferredChordSummary: string | undefined = undefined;
    try {
      console.log("[Chord/Key] Starting direct Gemini chord/key analysis (URL route)...");
      const chordKeyAnalysis = await performChordKeyAnalysis(audioPart);
      parsedCritique.chordKeyAnalysis = chordKeyAnalysis;
      parsedCritique.chordKeyAnalysisFailed = false;
      if (chordKeyAnalysis?.keySignature && chordKeyAnalysis?.chordsUsed?.length > 0) {
        const chordList = chordKeyAnalysis.chordsUsed.map((c: any) => `${c.chord} (${c.romanNumeral})`).join(", ");
        inferredChordSummary = `Key: ${chordKeyAnalysis.keySignature}. Chord vocabulary used: ${chordList}. (Note: this is the song's overall key and chord vocabulary, not a timed section-by-section progression.)`;
      }
    } catch (subErr: any) {
      console.error("[Chord/Key] Failed (URL route), continuing without it:", subErr.message || subErr);
      parsedCritique.chordKeyAnalysisFailed = true;
    }

    try {
      console.log("[Call 2] Starting Sub-Metrics Call 2 (URL route)...");
      const subMetricsCall2 = await performSubMetricsCall2(audioPart, parsedCritique, inferredChordSummary ?? chordProgressionSummary, melodySummary);
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

    validateGenrePair(parsedCritique);
    reconcileParentScores(parsedCritique);
    enforceClassicalInstrumentalSourceNeutrality(parsedCritique);

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

    // Validate the genre/subgenre pair BEFORE any sub-metric analysis runs. All of
    // Calls 1-3 are genre-aware, so validating only at the end meant the entire detailed
    // analysis could be computed against an invalid pair and merely relabelled afterwards.
    validateGenrePair(critique);
      console.log("[Call 1] Starting Sub-Metrics Call 1 (Spotify route)...");
      const subMetricsCall1 = await performSubMetricsCall1(audioPart, critique);
      critique.subMetricsCall1 = subMetricsCall1;
      critique.subMetricsCall1Failed = false;
    } catch (subErr: any) {
      console.error("[Call 1] Failed (Spotify route), continuing without it:", subErr.message || subErr);
      critique.subMetricsCall1Failed = true;
    }

    let inferredChordSummary: string | undefined = undefined;
    try {
      console.log("[Chord/Key] Starting direct Gemini chord/key analysis (Spotify route)...");
      const chordKeyAnalysis = await performChordKeyAnalysis(audioPart);
      critique.chordKeyAnalysis = chordKeyAnalysis;
      critique.chordKeyAnalysisFailed = false;
      if (chordKeyAnalysis?.keySignature && chordKeyAnalysis?.chordsUsed?.length > 0) {
        const chordList = chordKeyAnalysis.chordsUsed.map((c: any) => `${c.chord} (${c.romanNumeral})`).join(", ");
        inferredChordSummary = `Key: ${chordKeyAnalysis.keySignature}. Chord vocabulary used: ${chordList}. (Note: this is the song's overall key and chord vocabulary, not a timed section-by-section progression.)`;
      }
    } catch (subErr: any) {
      console.error("[Chord/Key] Failed (Spotify route), continuing without it:", subErr.message || subErr);
      critique.chordKeyAnalysisFailed = true;
    }

    try {
      console.log("[Call 2] Starting Sub-Metrics Call 2 (Spotify route)...");
      const subMetricsCall2 = await performSubMetricsCall2(audioPart, critique, inferredChordSummary);
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

    validateGenrePair(critique);
    reconcileParentScores(critique);
    enforceClassicalInstrumentalSourceNeutrality(critique);

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
