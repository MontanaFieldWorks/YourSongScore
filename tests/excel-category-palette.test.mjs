import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const display = readFileSync(new URL("../src/components/CritiqueDisplay.tsx", import.meta.url), "utf8");
const colorsBlock = display.match(/const CATS: Record<string, \{ dark: string; agg: string; core: string \}> = \{([\s\S]*?)\n    \};/);
const groupBlock = display.match(/const groupMap: Record<string, \{ category: string; agg: string \| null \}> = \{([\s\S]*?)\n    \};/);

test("Excel export registers a valid color palette for every category in the report map", () => {
  assert.ok(colorsBlock, "Excel palette definition missing");
  assert.ok(groupBlock, "Excel grouping definition missing");
  const palettes = [...colorsBlock[1].matchAll(/"([^"]+)": \{ dark: "([A-Fa-f0-9]{8})", agg: "([A-Fa-f0-9]{8})", core: "([A-Fa-f0-9]{8})" \}/g)];
  const categories = [...groupBlock[1].matchAll(/category: "([^"]+)"/g)].map(match => match[1]);
  const known = new Set(palettes.map(match => match[1]));
  assert.ok(known.size > 0, "no category palettes detected");
  for (const category of new Set(categories)) {
    assert.ok(known.has(category), "category has no Excel palette: " + category);
  }
});
test("Title & Discoverability remains separated from sonic production scoring", () => {
  assert.match(groupBlock?.[1] || "", /searchability: \{ category: "TITLE & DISCOVERABILITY", agg: null \}/);
  assert.match(colorsBlock?.[1] || "", /"TITLE & DISCOVERABILITY": \{ dark: "[A-F0-9]{8}"/);
});
