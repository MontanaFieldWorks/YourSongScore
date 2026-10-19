# Stage A: tier-scoring inventory and score-ceiling contract (read-only)

**Baseline:** `b2307b8e02258124ed1ad0dcce4ec1978da1e315` on `main`. This document is informational and does not change scoring, prompts, thresholds, DSP, weights, applicability, or deployment. It accompanies exactly two prompt-only edits and their regression tests.

## Tier contract and inventory

Calls 1–3 use the same enum: `REFERENCE`, `EXCEPTIONAL`, `ABOVE_AVERAGE`, `PROFESSIONAL_HIGH`, `PROFESSIONAL`, `LIMITED`, `MATERIAL_ISSUE`, `SEVERE`. Server-mapped scores: **96, 93, 90, 88, 85, 79, 71, 58**, respectively (`server.ts:275-299`). Gemini emits a tier and commentary; the server assigns the score deterministically (`server.ts:344-369,659-705`). A tiered score can be nulled for N/A, capped by measured evidence, or excluded from a parent by the existing gates. Raw model parent-score fields and continua are outside this 36-field tier inventory.

| Call | Subgroup | Tier-governed field | Scored consumers / weight | Existing qualification or measured evidence |
|---|---|---|---|---|
| 1 | Production/mix | `spectralMatch` | Commercial Readiness / Engagement Power 10% | Measured spectral evidence; severe finish ceiling; client spectral correction |
| 1 | Production/mix | `dynamicVariety` | Commercial Readiness / Engagement Power 20% | Client measured-dynamics cap when triggered |
| 1 | Production/mix | `paletteCohesion` | Production Index 25% | Severe production-finish ceiling |
| 1 | Production/mix | `aestheticDesign` | Production Index 40% | Severe production-finish ceiling |
| 1 | Production/mix | `spaceAndDensity` | Production Index 35% | Severe finish ceiling; neutralized by documented finish evidence |
| 1 | Production/mix | `mudPrevention` | Diagnostic only (no beta parent weighting) | Diagnostic scoring version; null score in new reports |
| 1 | Production/mix | `sibilanceShaving` | Mix Balance Quality 15 nominal units | N/A without vocal/sibilant source; mix weight renormalizes |
| 1 | Production/mix | `lowEndDivision` | Mix Balance Quality 20 nominal units | N/A unless two separately audible bass/percussion roles corroborated by Call 3 |
| 1 | Production/mix | `midrangeSpacing` | Mix Balance Quality 25 nominal units | Client measured midrange cap possible |
| 1 | Production/mix | `stereoWidth` | Mix Balance Quality 15 nominal units | No separate scoring gate found in server reconciliation |
| 2 | Artistic analysis | `artisticAlignment` | Artistic Analysis parent 30% | Tier rubric in approved Stage A repair; no production-finish cap |
| 2 | Artistic analysis | `atmosphericDepth` | Artistic Analysis parent 20% | Musical/space quality judgment |
| 2 | Artistic analysis | `harmonicIntrigue` | Artistic Analysis parent 30% | Key/chord context is inferred evidence, not proof |
| 2 | Artistic analysis | `paletteSynergy` | Artistic Analysis parent 20% | Artistic palette judgment |
| 2 | Melodic hooks | `intervalMemory` | Melodic Hooks parent 50% | Musical hook judgment |
| 2 | Melodic hooks | `syllabicPlacement` | Melodic Hooks parent 50% | Applicability gate; exclude N/A from parent |
| 2 | Acoustic tension | `dynamicModulation` | Acoustic Tension parent 50%; Structural Engagement 30% | Client measured-dynamics cap; DSP fallback if Call 2 missing |
| 2 | Acoustic tension | `climaxTrajectory` | Acoustic Tension parent 50%; Structural Engagement 30% | Gemini quality judgment; DSP fallback if Call 2 missing; peak diagnostics non-scored |
| 2 | Songwriting density | `vocalPocketing` | Songwriting Density parent 50% | Lyric-dependent; N/A propagation |
| 2 | Songwriting density | `poeticBrevity` | Songwriting Density parent 50% | Lyric-dependent; N/A propagation |
| 3 | Composition flow | `structuralBuild` | Arrangement Flow parent 25% → Structural Engagement 40% | Composition-structure evidence |
| 3 | Composition flow | `melodicTension` | Arrangement Flow parent 25% → Structural Engagement 40% | Melodic tension evidence |
| 3 | Composition flow | `hookPlacement` | Arrangement Flow parent 25%; Commercial Readiness / Engagement Power 60% | Quality judgment also drives commercial composite |
| 3 | Composition flow | `sectionalContrast` | Arrangement Flow parent 25%; Commercial Readiness / Engagement Power 10% | Quality judgment also drives commercial composite |
| 3 | Vocal tracking | `pitchAccuracy` | Vocal Tracking parent 40% → Sonic Soundprint 30% when vocals present | N/A if instrumental |
| 3 | Vocal tracking | `dynamicDelivery` | Vocal Tracking parent 35% → Sonic Soundprint 30% when vocals present | N/A if instrumental |
| 3 | Vocal tracking | `vocalLayerFit` | Vocal Tracking parent 25% → Sonic Soundprint 30% when vocals present | N/A if no backing/doubled/harmony layers; source verification captured |
| 3 | Instrumental staging | `timelineGridCohesion` | Instrumental Staging parent 25% → Sonic Soundprint 20% | Timeline evidence |
| 3 | Instrumental staging | `transientPunch` | Instrumental Staging parent 25% → Sonic Soundprint 20% | Client transient cap may apply |
| 3 | Instrumental staging | `melodicStaging` | Instrumental Staging parent 25% → Sonic Soundprint 20% | Stereo instrumental staging |
| 3 | Instrumental staging | `instrumentalWarmth` | Instrumental Staging parent 25% → Sonic Soundprint 20% | Timbre/tonal warmth judgment |
| 3 | Lyrical impact | `meaningClarity` | Lyrical Impact parent 50% | N/A when lyrics absent |
| 3 | Lyrical impact | `clicheAvoidance` | Lyrical Impact parent 50% | N/A when lyrics absent |
| 3 | Music theory | `chordDynamics` | Music Theory parent 40% → Compositional Depth card | Music-theory judgment |
| 3 | Music theory | `harmonicVariety` | Music Theory parent 30% → Compositional Depth card | Harmonic variety judgment |
| 3 | Music theory | `formAndStructure` | Music Theory parent 30% → Compositional Depth card | Form & structure judgment |

**Count:** 10 Call 1 + 10 Call 2 + 16 Call 3 = **36** schema fields. Mud Prevention is a tier schema field but **not a beta scored metric** (`src/lib/mudPreventionDiagnostic.ts`); eligibility can remove additional fields on a particular song.

## Parent-score contracts (existing and unchanged)

- **Production Index** (`scores.overallProduction`): Aesthetic Design 40% + Space & Density 35% + Palette Cohesion 25% (`server.ts:1684-1693`), subject to severe finish ceiling and browser adjustments (`src/App.tsx`).
- **Commercial Readiness / Engagement Power** (`scores.commercialReadiness`): Hook Placement 60% + Dynamic Variety 20% + Spectral Match 10% + Sectional Contrast 10% (`server.ts:1565-1574`); client recomputes same blend.
- **Mix Balance Quality**: beta-scored Midrange Spacing 25 units, Low-End Division 20, Sibilance Shaving 15, Stereo Width 15; applicable weights renormalize, Mud Prevention excluded (`src/lib/mudPreventionDiagnostic.ts`).
- **Artistic Analysis**: Artistic Alignment 30%, Harmonic Intrigue 30%, Atmospheric Depth 20%, Palette Synergy 20% (`server.ts:1524-1533`). No special deterministic score adjustment for Artistic Alignment itself.
- **Melodic Hooks**: Interval Memory 50%, Syllabic Placement 50% with N/A propagation. **Acoustic Tension**: Dynamic Modulation 50%, Climax Trajectory 50%. **Songwriting Density**: Vocal Pocketing 50%, Poetic Brevity 50% with N/A.
- **Arrangement Flow**: Structural Build, Melodic Tension, Hook Placement, Sectional Contrast at 25% each. **Vocal Tracking**: Pitch Accuracy 40%, Dynamic Delivery 35%, Vocal Layer Fit 25%, N/A renormalization. **Instrumental Staging**: four fields at 25% each. **Lyrical Impact**: 50/50, N/A propagation. **Music Theory**: Chord Dynamics 40%, Harmonic Variety 30%, Form & Structure 30% (`server.ts:1718-1810`).
- **Structural Engagement** shown on summary: Arrangement Flow 40% + Dynamic Modulation 30% + Climax Trajectory 30%. **Sonic Soundprint**: Mix Quality 50% + Vocal Tracking 30% + Instrumental Staging 20% (renormalized 50/20 if instrumental), minus a validated finish adjustment (`src/components/CritiqueDisplay.tsx:666-778`).
- **Compositional Depth** is the separate Music Theory card, not an additional component of the Overall/Production Index. Export uses the same `computeCategoryScores()` UI values.

## Ceiling inventory and qualification

| Metric/composite | Tier-only mathematical bound | Real displayed-path qualification |
|---|---|---|
| Each mapped quality child | 96 (except N/A=0 placeholder/null or measured caps) | Some children are re-capped to 80/84/88 by verified production evidence or browser DSP; mapping itself unchanged |
| Production Index | 96 | Severe finish ceilings, browser technical finish penalty can only lower |
| Commercial Readiness | 96 | Browser can recompute, but it averages tier-governed children only |
| Mix Balance Quality | 96 | Existing applicability exclusions, ceiling, and weight renormalization |
| Artistic Analysis / Acoustic Tension / other tier-only parents | 96 | Unless all N/A, in which case parent becomes N/A |
| Arrangement Flow / Vocal Tracking / Instrumental Staging / Music Theory | 96 | Applicability and independent finish adjustments apply where implemented |
| Structural Engagement | 96 | Weighted combination of tier-only judgments |
| Sonic Soundprint | 96 | Tier-based input parents; technical finish deduction may lower |
| Compositional Depth card | 96 | Music Theory tier-based parent |
| Streaming Readiness | **Not a universal 96 cap** | Completion rate and Echo Nest profile matching add non-tier inputs; theoretical rounded score can reach 97 without a finish cap when tier parents are 96 and profile match is 100 (`CritiqueDisplay.tsx:666-736`) |
| Other UI proxies and descriptive continua | No conclusion from tier map alone | Outside scope; do not declare globally capped or verified |

**Important:** A zero placeholder for N/A is not evidence of a failed quality score; historic reports keep their original versioned scoring. `calculatedClimaxTrajectoryScore` is a separate DSP fallback, not the normal Gemini scoring path; do not remove it without a separate failure contract.

## Two approved prompt contradictions and precise remediation

1. Shared `SCORE_CALIBRATION` requires creative use of numeric endings 1,3,6,7, incompatible with eight deterministic mapped numbers. Delete this entire anti-clustering *numeric* requirement; preserve the existing Call 2 rule **“Do not vary tiers merely to create numerical spread.”**
2. Artistic Alignment calls ordinary coherent work 76–82, whose only reachable mapped value is `LIMITED=79`, while the shared `LIMITED` definition requires an actual audible weakness. Replace its *local* numeric bands and obsolete default with the existing tier semantics: `PROFESSIONAL=85` for ordinary coherent artistic identity, `LIMITED=79` only with a specific weakness; above-average identity still requires independent cross-dimensional musical evidence. No other rubric text changes.

## Separate proposal, NOT implemented: reaching a justified 100

**Candidate:** add `DEFINITIVE:100` as a **ninth tier** with a stricter, verifiable highest-level evidence rubric while retaining `REFERENCE:96`. This is an explicit product-design proposal only. A future separate implementation would need schema/enum updates across Calls 1–3, tier-mapping and commentary guidance, diagnostics, parent-impact analysis, versioned historical comparability, and evidence-based validation. It must not turn all existing 96s into 100s automatically. No new tier, score, or score threshold is added in this PR.

## Coordination and regression risks

Claude's educational-page work in `src/App.tsx` and documentation pages is outside the changed source paths. The two prompt edits will impact new Gemini responses if/when deployed, even though the scoring code remains exactly the same. Consequently, **automated tests cannot establish that actual scores will not shift**; the eventual merge/deploy requires explicit review and subsequent bounded model validation.

For future architecture work, client/server ceiling and aggregation duplication remains an observed maintenance risk, not in this PR. The familiar 35-song test collection is a **regression benchmark**, not a genuinely held-out truth set. No paid model calls were made to compile this inventory.
