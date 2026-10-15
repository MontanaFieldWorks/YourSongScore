# Low-frequency quality coverage — design specification (no scoring change)

## Confirmed current state
- `server.ts` Call 1 `lowEndDivision` judges *division between independent low-percussion and sustained bass roles*.
- `reconcileParentScores` verifies named percussion source, independent dedicated bass role, and second-pass corroboration. Without all, `lowEndDivision.applicable=false; score=0` (a correct N/A for an unperformed *interaction*).
- Final `mixQuality.score` renormalizes the other applicable children (mud 25, midrange 25, lowEndDivision 20, sibilance 15, stereoWidth 15). This omits dedicated bass-adequacy evaluation on solo acoustic, piano, or sparse orchestral recordings.
- Existing band distribution (sub/bass/low-mids), midrange flatness/flux, and low-end temporal evidence cannot identify individual instrument sources or by themselves establish a defect.

## Proposed independent measure: Low-Frequency Balance & Control
A new distinct technical child metric, *not* a rename of Low-End Division, applicable to **all audible recordings**. It evaluates delivered tonal foundation and engineering control whether or not a bass guitar, synth, kick, or separate bass instrument exists.

Audible criteria:
1. **Foundation adequacy:** Does the overall recording have intentional and appropriate weight, or an audibly thin/hollow bottom relative to its own arrangement and genre?
2. **Low-frequency control:** Are resonances, rumble, uncontrolled booms, and excessive low-mid buildup present? Identify specific audible passages rather than infer mud from percent energy.
3. **Temporal stability:** Are level and low-register behavior controlled through notes/sections; do occasional notes bloom, swamp, or disappear?
4. **Relation to the rest of the spectrum:** Is low-end weight proportionate to voice/instruments, without masking? Do not penalize a sparse guitar composition for lacking a kick drum or subbass.

Explicitly distinct from `lowEndDivision`: that metric assesses interaction of **two established independent roles**; it stays N/A when those roles do not exist. Neither the new metric nor its prose may claim an unverified bass/kick instrument. This is not a forced low score for absence of bass instrumentation.

## Evidence and safety constraints
- Use the existing DSP band-energy profile, spectrogram, low-mid flatness/flux, crest and time-section measurements only as corroborating context. They are not absolute pass/fail gates and must be compared with genre and relevant clean masters.
- Prefer time-resolved spectral ratios, low-band peaks and temporal variance and A/B original-vs-processed reference where available. Specific defect evidence is required for low ratings.
- Uncertain audible evidence means uncertainty, not invented instrumental identity or automatic 85/88.
- A deliberate sparse, narrow or warm recording may legitimately receive a good score if its actual balance and control are sound.

## Integration choice requires validation
Do **not** silently increase the weight of low end or replace a current score. Two options for an A/B experiment:
A. Retain `lowEndDivision` at 20 when applicable and route its existing 20-point parent weight to `lowFrequencyBalance` only when division is N/A. This evaluates a previously missing facet with stable weight but requires benchmark calibration.
B. Add `lowFrequencyBalance` as a universal child and explicitly reallocate Mix Balance weights (avoids inconsistent coverage, but changes all mix scores and needs wider revalidation).
Prefer A as the smaller-scope *candidate experiment*, not a decision to ship. Existing `mudPrevention` is not a substitute for inadequate bass foundation.

## Acceptance tests / gates
1. Single acoustic guitar (no drum/bass): `lowEndDivision=N/A`; `lowFrequencyBalance=applicable` with evidence about genuine low-register quality; no invented drum or bass.
2. Guitar + quiet vocalist with low-mid resonances: score/feedback must reflect the audible resonance when verified; not automatically professional because genre is acoustic.
3. Full-band clean professional mix: existing division evaluated when source corroborated; preserve clean benchmark score directionally.
4. All 12 Round 1 negative controls (4 source masters × clipped/muddy/overcompressed): muddy variants must be detectably worse on spectral/low-end control versus *their own clean master*, not compared across unrelated genres. Clipping/compression defects may appropriately affect other metrics even if low-end remains acceptable.
5. False source audit (Braden and Seven Sisters): no falsely named percussion or dedicated bass.
6. Run repeatability checks and compare category parents, commentary, and N/A decisions to baseline. No single-song thresholds.

## Status
Specification only. No schema, prompt, weight, applicability, score, API call, or production code changed. Scoring freeze remains effective until the controlled experiment and clean-master comparisons are approved.
