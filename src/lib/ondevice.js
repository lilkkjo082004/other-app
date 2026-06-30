// On-device AI: run a small model fully in the browser via WebGPU (WebLLM), so
// free users get real companion replies at ZERO token cost to us — private and
// offline once the model is cached. WebLLM is dynamically imported only when a
// user opts in, so it never weighs down the normal bundle. Falls back silently
// to the proxy / placeholder voice wherever WebGPU isn't available.

// q4f16 3B is a good warmth/size tradeoff; ~2GB one-time download. Swap here to
// trade quality for size (e.g. Llama-3.2-1B for low-RAM phones).
export const ON_DEVICE_MODEL = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
export const ON_DEVICE_LABEL = 'Llama 3.2 3B (on device)';

const KEY = 'other_ondevice';

export function onDeviceSupported() {
  try { return typeof navigator !== 'undefined' && !!navigator.gpu; } catch (e) { return false; }
}
export function onDeviceEnabled() {
  try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
}
export function setOnDeviceEnabled(on) {
  try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
}
// True only when the user opted in AND the device can actually run it.
export function onDeviceActive() { return onDeviceSupported() && onDeviceEnabled(); }

let _progress = null;
export function setProgressHandler(cb) { _progress = cb; }

let enginePromise = null;
// Lazily create (and cache) a single MLCEngine. The big web-llm code + model
// weights are fetched here, on first use only.
export function getEngine() {
  if (!onDeviceSupported()) return Promise.reject(new Error('WebGPU not supported'));
  if (!enginePromise) {
    enginePromise = (async () => {
      const webllm = await import('@mlc-ai/web-llm');
      return await webllm.CreateMLCEngine(ON_DEVICE_MODEL, {
        initProgressCallback: (p) => { try { _progress && _progress(p); } catch (e) { /* ignore */ } },
      });
    })().catch((e) => { enginePromise = null; throw e; });
  }
  return enginePromise;
}

// Warm the model up (download + init) ahead of the first message. Returns the
// engine or throws.
export function preloadEngine() { return getEngine(); }

// One completion through the local engine. `system` is a plain string; messages
// are {role,content}. Streams via onDelta when provided. Throws on empty/error
// so callers can fall back to the proxy or placeholder.
export async function completeOnDevice(system, messages, { onDelta, signal } = {}) {
  const engine = await getEngine();
  const msgs = [{ role: 'system', content: system }, ...messages];
  const params = { messages: msgs, temperature: 0.8, max_tokens: 400 };
  if (onDelta) {
    let full = '';
    const stream = await engine.chat.completions.create({ ...params, stream: true });
    for await (const chunk of stream) {
      if (signal?.aborted) break;
      const d = chunk?.choices?.[0]?.delta?.content || '';
      if (d) { full += d; onDelta(d); }
    }
    full = full.trim();
    if (!full) throw new Error('empty response');
    return full;
  }
  const res = await engine.chat.completions.create(params);
  const text = (res?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('empty response');
  return text;
}
