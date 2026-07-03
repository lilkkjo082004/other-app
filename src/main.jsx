import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initCalm } from './lib/comfort.js';

initCalm(); // apply Calm Mode before first paint if the user enabled it
createRoot(document.getElementById('root')).render(<App />);

// Register the service worker (PWA: offline shell + installable).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

// ── Update toast ─────────────────────────────────────────────────────────────
// A new deploy changes the hashed bundle name in index.html. Compare the served
// index.html against the bundle this page is running; when they differ, show a
// small "update ready" pill. Checked shortly after load and whenever the tab
// regains focus (the moment a long-lived PWA session would otherwise go stale).
(() => {
  if (!import.meta.env.PROD) return;
  let shown = false;
  const currentBundle = () => {
    const s = document.querySelector('script[type="module"][src*="assets/"]');
    return s ? (s.getAttribute('src').match(/assets\/[^"']+\.js/) || [null])[0] : null;
  };
  async function check() {
    if (shown) return;
    const mine = currentBundle();
    if (!mine) return;
    try {
      const res = await fetch('./index.html', { cache: 'no-cache' });
      const html = await res.text();
      const m = html.match(/assets\/[^"']+\.js/);
      if (m && m[0] !== mine) showToast();
    } catch (e) { /* offline — try again later */ }
  }
  function showToast() {
    if (shown) return;
    shown = true;
    const el = document.createElement('button');
    el.textContent = '✦ Update ready — tap to refresh';
    el.setAttribute('aria-label', 'A new version is available. Tap to refresh.');
    el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;background:#7c5bf5;color:#fff;border:none;border-radius:50px;padding:10px 18px;font:600 13px "DM Sans",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.45);cursor:pointer';
    el.onclick = () => window.location.reload();
    document.body.appendChild(el);
  }
  setTimeout(check, 6000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
})();
