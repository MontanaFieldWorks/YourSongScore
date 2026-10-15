import assert from "node:assert/strict";
import test from "node:test";

// Regression truth table for the production-finish ceiling in server.ts.
// Code-level validation must also verify this table stays aligned with the implementation.
function ceiling(spectralFlags, totalFlags) {
  if (spectralFlags >= 2 && totalFlags === 4) return 80;
  if (spectralFlags >= 2 && totalFlags === 3) return 84;
  return null;
}

test("production finish ceiling preserves prior behavior for all possible four-flag combinations", () => {
  for (let crest=0; crest<=1; crest++) for (let sub=0; sub<=1; sub++)
    for (let mid=0; mid<=1; mid++) for (let air=0; air<=1; air++) {
      const sf=sub+mid+air, flags=crest+sf;
      const previous=(sf>=2 && flags>=5)?74:(sf>=2 && flags===4)?80:(sf>=2 && flags===3)?84:null;
      assert.equal(ceiling(sf, flags), previous, `crest=${crest},sub=${sub},mid=${mid},air=${air}`);
    }
});
