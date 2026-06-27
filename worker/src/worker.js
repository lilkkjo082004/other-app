/**
 * OTHER — Claude API proxy (Cloudflare Worker)
 *
 * Keeps the Anthropic API key off the client. The Flutter app POSTs
 * { model, max_tokens, system, messages } here; the worker forwards it to the
 * Anthropic Messages API and returns a slim { text } payload.
 *
 * Setup:
 *   cd worker
 *   npm install -g wrangler        # if you don't have it
 *   wrangler secret put ANTHROPIC_API_KEY
 *   wrangler deploy
 *
 * Then run the app with:
 *   flutter run -d chrome --dart-define=OTHER_AI_PROXY=https://<name>.workers.dev
 *
 * Optionally set ALLOWED_ORIGIN (a var in wrangler.toml) to lock CORS to your
 * web app's origin. Defaults to "*".
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS_CAP = 1024;

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(env) },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, env);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'Server missing ANTHROPIC_API_KEY' }, 500, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return json({ error: 'Invalid JSON body' }, 400, env);
    }

    const { model, system, messages } = payload;
    if (!model || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'model and messages are required' }, 400, env);
    }

    // Clamp max_tokens so a malformed client can't run up a huge bill.
    const maxTokens = Math.min(
      MAX_TOKENS_CAP,
      Math.max(1, Number(payload.max_tokens) || 400),
    );

    const body = { model, max_tokens: maxTokens, messages };
    if (typeof system === 'string' && system.length > 0) body.system = system;

    let upstream;
    try {
      upstream = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return json({ error: 'Upstream request failed', detail: String(e) }, 502, env);
    }

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok || !data) {
      return json(
        { error: 'Anthropic API error', status: upstream.status, detail: data },
        upstream.status || 502,
        env,
      );
    }

    // Collapse the content blocks into plain text for the client.
    let text = '';
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block && block.type === 'text' && typeof block.text === 'string') {
          text += block.text;
        }
      }
    }

    return json({ text: text.trim(), stop_reason: data.stop_reason }, 200, env);
  },
};
