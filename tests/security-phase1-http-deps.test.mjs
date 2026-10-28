import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import multer from "multer";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const lock = JSON.parse(readFileSync(new URL("package-lock.json", root), "utf8"));
const serverSource = readFileSync(new URL("server.ts", root), "utf8");

const installed = (name) => lock.packages[`node_modules/${name}`]?.version;

test("patched Phase 1 HTTP dependencies are present in the committed lockfile", () => {
  assert.equal(installed("express"), "4.22.3");
  assert.equal(installed("multer"), "2.5.0");
  assert.equal(installed("body-parser"), "1.20.9");
  assert.equal(installed("proxy-addr"), "2.0.8");
  assert.equal(installed("qs"), "6.16.1");
  assert.equal(manifest.dependencies.express, "^4.22.3");
  assert.equal(manifest.dependencies.multer, "^2.5.0");
  for (const name of ["body-parser", "proxy-addr", "qs"]) {
    assert.equal(manifest.overrides[name], installed(name));
  }
});

test("real YSS upload route retains the single audio-file and 15MB limits", () => {
  assert.match(serverSource, /multer\s*\(\s*\{[\s\S]*?storage:\s*multer\.memoryStorage\(\)/);
  assert.match(serverSource, /fileSize:\s*15\s*\*\s*1024\s*\*\s*1024/);
  assert.match(serverSource, /app\.post\("\/api\/critique-file",\s*upload\.single\("audio"\)/);
});

async function withLocalServer(limit, callback) {
  const app = express();
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: limit } });
  app.post("/upload", upload.single("audio"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });
    res.json({
      fieldname: req.file.fieldname,
      name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.buffer.length,
    });
  });
  app.post("/form", (req, res) => res.json({ parsed: req.body }));
  app.get("/ip", (req, res) => res.json({ ip: req.ip, forwarded: req.ips }));
  app.use((err, _req, res, _next) => {
    res.status(err?.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ code: err?.code || "PARSER_ERROR" });
  });
  const instance = app.listen(0, "127.0.0.1");
  await once(instance, "listening");
  const address = instance.address();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    await callback(base);
  } finally {
    await new Promise((resolve, reject) => {
      instance.close((err) => err ? reject(err) : resolve());
      instance.closeAllConnections?.();
    });
  }
}

function audioForm(field = "audio", size = 6) {
  const form = new FormData();
  form.append(field, new Blob([Buffer.alloc(size, 0x31)], { type: "audio/mpeg" }), "demo.mp3");
  return form;
}

test("patched Multer accepts the expected MP3 upload and rejects unexpected fields", async () => {
  await withLocalServer(15 * 1024 * 1024, async (base) => {
    const ok = await fetch(base + "/upload", { method: "POST", body: audioForm() });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { fieldname: "audio", name: "demo.mp3", mime: "audio/mpeg", size: 6 });
    const invalid = await fetch(base + "/upload", { method: "POST", body: audioForm("unexpected") });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, "LIMIT_UNEXPECTED_FILE");
    const stillHealthy = await fetch(base + "/ip");
    assert.equal(stillHealthy.status, 200);
  });
});

test("patched Multer enforces upload byte limits and Express parses form bodies", async () => {
  await withLocalServer(4, async (base) => {
    const oversized = await fetch(base + "/upload", { method: "POST", body: audioForm("audio", 6) });
    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json()).code, "LIMIT_FILE_SIZE");
    const form = await fetch(base + "/form", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "sample%5Bvalue%5D=ok"
    });
    assert.equal(form.status, 200);
    assert.equal((await form.json()).parsed.sample.value, "ok");
  });
});

test("Express 4 retains disabled trust proxy by default", async () => {
  await withLocalServer(16, async (base) => {
    const response = await fetch(base + "/ip", {
      headers: { "X-Forwarded-For": "192.0.2.187" }
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.notEqual(data.ip, "192.0.2.187");
    assert.deepEqual(data.forwarded, []);
  });
});

test("Phase 2 build-tool patches remain on the existing compatible major lines", () => {
  assert.equal(manifest.dependencies.vite, "^6.4.5");
  assert.equal(manifest.devDependencies.vite, "^6.4.5");
  const expected = {
    vite: "6.4.5",
    "@babel/core": "7.29.7",
    "baseline-browser-mapping": "2.11.34",
    "brace-expansion": "1.1.21",
    browserslist: "4.29.5",
    nanoid: "3.3.20",
    postcss: "8.5.32",
    "source-map-js": "1.2.2",
  };
  for (const [name, version] of Object.entries(expected)) {
    assert.equal(installed(name), version, `installed ${name}`);
  }
  assert.equal(lock.packages["node_modules/readdir-glob/node_modules/brace-expansion"]?.version, "2.1.7");
  // Firebase/gRPC and ExcelJS were deliberately excluded from this patch.
  assert.equal(installed("firebase"), "12.14.0");
  assert.equal(installed("@grpc/grpc-js"), "1.9.16");
  assert.equal(installed("exceljs"), "4.4.0");
});

test("Phase 3 patch-only dependency versions and invariant SDKs", () => {
  assert.equal(installed("protobufjs"), "7.6.6");
  assert.equal(lock.packages["node_modules/tsx/node_modules/esbuild"]?.version, "0.28.2");
  assert.equal(installed("tsx"), "4.22.3");
  assert.equal(installed("esbuild"), "0.25.12"); // production bundler: unchanged
  assert.equal(installed("firebase"), "12.14.0");
  assert.equal(installed("@firebase/firestore"), "4.15.0");
  assert.equal(installed("@grpc/grpc-js"), "1.9.16");
  assert.equal(installed("@grpc/proto-loader"), "0.7.15");
  assert.equal(installed("exceljs"), "4.4.0");
  assert.equal(installed("uuid"), "8.3.2");
  assert.ok(!lock.packages["node_modules/@protobufjs/inquire"]);
});

test("patched protobufjs retains trusted-schema encode/decode behavior", async () => {
  const imported = await import("protobufjs");
  const protobuf = imported.default ?? imported;
  const root = protobuf.parse('syntax = "proto3"; message PatchSmoke { string track = 1; }').root;
  const type = root.lookupType("PatchSmoke");
  const encoded = type.encode({ track: "offline-smoke" }).finish();
  assert.equal(type.decode(encoded).track, "offline-smoke");
});
