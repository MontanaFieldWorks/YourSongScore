import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

function actualConditions(src, variable) {
  const pattern = new RegExp("(?:if|else if) \\(spectralFlags\\.length >= 2 && flags\\.length (?:===|>=) \\d+\\) "+variable+" = \\d+;", "g");
  return [...src.matchAll(pattern)].map(m => m[0].replace(variable, "CEILING").replace(/^else /, ""));
}
test("server and client use identical reachable production-finish ceiling conditions", () => {
  assert.deepEqual(actualConditions(server,"ceiling"), actualConditions(client,"locallyCalculatedCeiling"));
  assert.equal(actualConditions(server,"ceiling").length, 2);
  assert.ok(!actualConditions(client,"locallyCalculatedCeiling").some(x=>x.includes("= 74")));
});
