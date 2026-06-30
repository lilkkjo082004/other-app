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
