/**
 * Public-facing description of an unscored Mud Prevention diagnostic.
 * This intentionally does not interpret Gemini's subjective listening tier or
 * commentary; those remain unchanged in the raw critique for internal audit.
 * Reporting only: never mutates critique data or participates in scoring.
 */
export function getMudPreventionPublicCommentary(critique: any): string {
  const evidence = critique?.mixBalanceEvidence;
  const finite = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

  const statements: string[] = [
    "DIAGNOSTIC ONLY — excluded from numerical scoring; no validated mud-quality verdict.",
  ];

  if (finite(evidence?.lowMidEnergy) && finite(evidence?.coreMidEnergy)) {
    statements.push(
      `Measured low-mid/core relative band indices: ${evidence.lowMidEnergy.toFixed(1)} / ${evidence.coreMidEnergy.toFixed(1)} (display scale, not a calibrated quality threshold).`
    );
  } else if (finite(evidence?.lowMidEnergy)) {
    statements.push(`Measured low-mid relative band index: ${evidence.lowMidEnergy.toFixed(1)} (display scale).`);
  } else if (finite(evidence?.coreMidEnergy)) {
    statements.push(`Measured core-mid relative band index: ${evidence.coreMidEnergy.toFixed(1)} (display scale).`);
  }

  const mudFlux = finite(evidence?.mudFlux)
    ? evidence.mudFlux
    : critique?.liveMetrics?.calculatedMudFlux;
  if (finite(mudFlux)) {
    statements.push(
      `Measured 150–400 Hz spectral flux: ${mudFlux.toFixed(2)} (gain-dependent diagnostic; not a mud-quality threshold).`
    );
  }

  statements.push(
    "These measurements describe spectral balance or activity; alone they do not establish audible masking, a clean mix, or an intentional tonal choice. No clean/muddy conclusion is assigned."
  );
  return statements.join(" ");
}
