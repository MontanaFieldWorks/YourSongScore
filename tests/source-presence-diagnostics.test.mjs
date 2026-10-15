import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../server.ts", import.meta.url), "utf8");

test("vocal applicability gate stays unchanged while raw evidence is preserved", () => {
  assert.match(source, /backingVocalLayersPresent === false\) \{/);
  assert.match(source, /vocals\.vocalLayerFit\.applicable = false;/);
  assert.match(source, /rawCommentary: String\(vocals\.vocalLayerFit\.commentary \|\| ""\)/);
  assert.match(source, /decisionSource: "CALL3_SINGLE_LISTEN"/);
});

test("two-source instrument verification remains mandatory", () => {
  assert.match(source, /if \(!percussionPresent \|\| !bassPresent \|\| !corroborated\)/);
  assert.match(source, /audit\.rolesIndependent === true/);
  assert.match(source, /SECOND_PASS_UNAVAILABLE/);
  assert.match(source, /LISTENING_PASSES_DISAGREE/);
  assert.match(source, /firstPassCommentary: String\(lowEnd\.commentary \|\| ""\)/);
});

test("diagnostics do not introduce another paid listening pass", () => {
  assert.match(source, /decisionSource: "CALL3_SINGLE_LISTEN"/);
});
