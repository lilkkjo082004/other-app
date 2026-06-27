# OTHER — Claude API proxy (Cloudflare Worker)

A tiny worker that keeps the Anthropic API key off the client. The Flutter app
sends `{ model, max_tokens, system, messages }`; the worker forwards the request
to the Anthropic Messages API and returns a slim `{ text }` response.

## Deploy

```bash
cd worker
npm install -g wrangler        # one-time, if needed
wrangler login                 # one-time
wrangler secret put ANTHROPIC_API_KEY   # paste your sk-ant-... key
wrangler deploy
```

`wrangler deploy` prints the worker URL (e.g. `https://other-ai.<you>.workers.dev`).

## Point the app at it

```bash
flutter run -d chrome \
  --dart-define=OTHER_AI_PROXY=https://other-ai.<you>.workers.dev
# optional, to use a cheaper model:
#   --dart-define=OTHER_AI_MODEL=claude-sonnet-4-6
```

For a release web build, pass the same `--dart-define` flags to `flutter build web`.

## Lock down CORS (production)

By default the worker allows any origin so it's easy to test. In production set
`ALLOWED_ORIGIN` in `wrangler.toml` to your web app's origin and redeploy.

## Notes

- The worker clamps `max_tokens` to 1024 as a cheap abuse guard.
- It uses `anthropic-version: 2023-06-01` and the model the client requests
  (defaults to `claude-opus-4-8`). No thinking/sampling params are sent — chat
  responses are kept short and fast.
- If the app is run without `OTHER_AI_PROXY`, it falls back to built-in
  placeholder responses and never calls this worker.
