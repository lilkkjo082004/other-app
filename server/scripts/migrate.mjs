// Apply schema.sql to the REMOTE D1 database from CI.
//
// Why not `wrangler d1 execute --remote --file=schema.sql`? That path uploads
// the file through D1's R2-backed `/import` API, which a scoped CI API token
// can't authenticate to (Cloudflare error 10000) even when the token is
// super-admin. The plain `/query` REST endpoint works with the token we have,
// so we drive it directly here. Every statement in schema.sql is
// `CREATE TABLE/INDEX IF NOT EXISTS`, so this is idempotent and safe to run on
// every deploy — it's the only thing that migrates new tables to prod.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Trim: a stored secret can carry a trailing newline. Wrangler trims it (so
// `wrangler deploy` works), but a raw string interpolated into the request URL
// would not — a newline in the account id yields Cloudflare error 7403.
const acct = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const token = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
if (!acct || !token) {
  console.error('Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const toml = readFileSync(join(here, '..', 'wrangler.toml'), 'utf8');
const dbId = (toml.match(/database_id\s*=\s*"([^"]+)"/) || [])[1];
if (!dbId) {
  console.error('Could not find database_id in wrangler.toml');
  process.exit(1);
}

// Strip line comments, then split on ';'. The schema is DDL with no semicolons
// inside string literals, so a naive split is correct here.
const sql = readFileSync(join(here, '..', 'schema.sql'), 'utf8');
const statements = sql
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

// Dry-run: parse + list statements without touching the network. Lets CI (and a
// developer) validate the split without credentials.
const dryRun = process.argv.includes('--dry-run');
const url = `https://api.cloudflare.com/client/v4/accounts/${acct}/d1/database/${dbId}/query`;

for (let i = 0; i < statements.length; i++) {
  const label = statements[i].split('\n')[0].slice(0, 60);
  if (dryRun) {
    console.log(`[${i + 1}/${statements.length}] ${label}`);
    continue;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: statements[i] + ';' }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    console.error(`[${i + 1}/${statements.length}] FAIL (HTTP ${res.status}): ${label}`);
    console.error(JSON.stringify(body.errors || body));
    process.exit(1);
  }
  console.log(`[${i + 1}/${statements.length}] ok: ${label}`);
}
console.log(dryRun ? 'Parsed schema OK (dry run) ✓' : 'D1 schema applied ✓');
