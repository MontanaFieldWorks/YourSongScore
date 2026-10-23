# Phase B prompt reconciliation audit (read-only scoring proposal)

Base commit: 583d467. No live prompt altered by this branch.

## Findings
- Existing deterministic score schema returns `qualityTier` and `commentary` for 33 tier-governed child metrics. The server maps tiers to 96,93,90,88,85,79,71,58.
- The legacy numerical rubric texts remain in all three submetric prompts. The model sees these ranges despite being unable to emit a per-metric numerical score.
- Contradictory ranges can influence tier selection: they are *not dead code*. Delete/replace only after an A/B audio benchmark, unlike the unreachable genre pipeline.
- `RUBRIC ANCHOR` has 27 text occurrences (not equivalent to number of metrics). Locations on baseline server.ts: 1076, 1084, 1096, 1124, 1144, 1168, 1170, 1176, 1179, 1181, 1192, 1414, 1416, 1418, 1420, 1422, 1424, 1434, 1625, 1648, 1663, 1668, 1673, 1678, 1698, 1703, 1705.
- Preserve instrument-presence restrictions, metric definitions, genre context, measured DSP diagnostics, and distinctions between competent/exceptional and characteristic/quality.

## Proposed single tier-language contract
1. Select **applicability** using credible source evidence; absence is N/A, not poor or perfect execution.
2. Describe concrete observable evidence and uncertainty, without inventing instruments or DSP interpretation.
3. Select one of eight quality tiers using the shared calibration: SEVERE, MATERIAL_ISSUE, LIMITED, PROFESSIONAL, PROFESSIONAL_HIGH, ABOVE_AVERAGE, EXCEPTIONAL, REFERENCE.
4. Do not use legacy numeric output bands for tier-controlled child metrics. Keep numerical targets for explicitly measured *features* distinct from *quality scoring*.
5. Server alone assigns canonical numeric scores; the model must not generate them.

## Safe migration sequence
- Rewrite per-metric numerical anchor passages into qualitative **evidence cues** preserving metric-specific distinguishing criteria. Do not drop them blindly.
- Make scoring prompt changes alone in a separate PR. Do not alter tier map or genre logic at the same time.
- Run static checks, then repeat matched audio evaluations (baseline vs candidate) on Braden, Seven Sisters, Queen, Drake, Cars and Blinding Lights, followed by 17-song regression if no failures.
- Acceptance: no new false N/A on known layered vocals; no invented vocal-performance evidence for instrumental controls; no worsened master/demo separation; reduced nonsensical prose; stable per-song repeatability.
- Cannot claim audio A/B outcome from historical XLSX alone; those exports contain baseline outputs, not new model responses.

## Decision
Not safe to delete the 17 purported dead paragraphs blindly. Preserve scoring architecture until controlled output validation is available. This branch is a complete inventory and migration specification, not a model-behavior change.
