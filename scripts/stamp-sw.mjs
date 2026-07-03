// Post-build step: stamp a unique version into dist/sw.js.
//
// Vite content-hashes the /assets bundles on every deploy but copies
// public/sw.js verbatim, so the service worker file is byte-identical across
// deploys. Browsers only run an update cycle when the SW bytes change, so
// without this the browser never notices a new version and users stay on a
// stale cached bundle. We derive the version from the hashed entry bundle, so
// sw.js changes exactly when the app code changes (no spurious updates when a
// rebuild produces identical output).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

let build;
try {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const m = html.match(/assets\/index-([A-Za-z0-9_-]+)\.js/);
  build = m ? m[1] : String(Date.now());
} catch {
  build = String(Date.now());
}

const swPath = join(dist, 'sw.js');
let sw = readFileSync(swPath, 'utf8');
if (!sw.includes('__BUILD__')) {
  console.warn('stamp-sw: no __BUILD__ placeholder in dist/sw.js — nothing stamped');
} else {
  writeFileSync(swPath, sw.replaceAll('__BUILD__', build));
  console.log(`stamp-sw: service worker versioned as other-${build}`);
}
