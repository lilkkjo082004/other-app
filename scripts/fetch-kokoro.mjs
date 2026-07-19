// Mirror the Kokoro-82M weights we use into public/models/kokoro so the app can
// self-host them — no runtime dependency on the Hugging Face CDN (its uptime or
// terms). Run in CI before `npm run build`; run locally too if you want the
// on-device voice while developing. Already-present files are skipped (set
// FORCE=1 to re-download). Missing files are warned, not fatal — at runtime the
// app falls back to HF for anything not mirrored.
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const BASE = `https://huggingface.co/${REPO}/resolve/main/`;
const OUT = new URL('../public/models/kokoro/', import.meta.url);

// Keep in sync with LOCAL_VOICE_PRESETS in src/lib/localtts.js.
const VOICES = ['af_heart', 'af_bella', 'af_nicole', 'af_sarah', 'af_sky', 'bf_emma', 'bf_isabella', 'am_michael', 'am_adam', 'am_eric', 'bm_george', 'bm_lewis'];
const FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/model_quantized.onnx',   // dtype 'q8'
  'onnx/model_q8.onnx',          // alt name, whichever the repo uses
  ...VOICES.map((v) => `voices/${v}.bin`),
];

const path = (u) => fileURLToPath(u);
async function exists(u) { try { await stat(path(u)); return true; } catch { return false; } }

let ok = 0, cached = 0, missing = 0;
for (const rel of FILES) {
  const dest = new URL(rel, OUT);
  if ((await exists(dest)) && !process.env.FORCE) { cached++; continue; }
  try {
    const res = await fetch(BASE + rel);
    if (!res.ok) { console.warn(`  – skip ${rel} (${res.status})`); missing++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(path(dest)), { recursive: true });
    await writeFile(path(dest), buf);
    console.log(`  ✓ ${rel} (${(buf.length / 1048576).toFixed(1)} MB)`);
    ok++;
  } catch (e) { console.warn(`  ! ${rel}: ${e.message}`); missing++; }
}
console.log(`kokoro mirror: ${ok} downloaded, ${cached} cached, ${missing} missing`);
