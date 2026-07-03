import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initCalm } from './lib/comfort.js';

initCalm(); // apply Calm Mode before first paint if the user enabled it
createRoot(document.getElementById('root')).render(<App />);

// ── Service worker + reliable update flow ────────────────────────────────────
// Because scripts/stamp-sw.mjs gives every deploy a byte-different sw.js, the
// browser now runs a real update cycle per deploy. We surface it with an
// "Update ready" pill driven by the SW lifecycle (not by string-diffing
// index.html), then reload once the new worker actually takes control — so the
// user always lands on a fully consistent new version, never a half-swapped one.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    let reg;
    try {
      reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    } catch (e) {
      return;
    }

    // Reload exactly once, and only after the user accepted an update — not on
    // the first-install claim (when there was no prior controller).
    let updating = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updating) window.location.reload();
    });

    const promptUpdate = () => showUpdatePill(() => {
      updating = true;
      reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });

    // A worker finished installing while we were away and is already waiting.
    if (reg.waiting && navigator.serviceWorker.controller) promptUpdate();

    // A new worker begins installing after an update check.
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        // 'installed' + an existing controller == an update (not first install).
        if (nw.state === 'installed' && navigator.serviceWorker.controller) promptUpdate();
      });
    });

    // Nudge the browser to look for a new sw.js now and whenever the tab
    // refocuses — the moment a long-lived PWA session would otherwise go stale.
    const check = () => reg.update().catch(() => {});
    setTimeout(check, 6000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  });
}

function showUpdatePill(onAccept) {
  if (document.getElementById('other-update-pill')) return;
  const el = document.createElement('button');
  el.id = 'other-update-pill';
  el.textContent = '✦ Update ready — tap to refresh';
  el.setAttribute('aria-label', 'A new version is available. Tap to refresh.');
  el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;background:#7c5bf5;color:#fff;border:none;border-radius:50px;padding:10px 18px;font:600 13px "DM Sans",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.45);cursor:pointer';
  el.onclick = () => { el.textContent = '✦ Updating…'; onAccept(); };
  document.body.appendChild(el);
}
