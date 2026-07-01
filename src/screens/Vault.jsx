import React, { useState, useEffect } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { vaultExists, setPin, verifyPin, loadEntries, addEntry, removeEntry, resetVault } from '../lib/vault.js';

// Private vault — PIN-gated notes/letters-to-self. Device-local; never synced,
// never sent to the AI. Locks again whenever you leave the screen.
export default function Vault({ onBack }) {
  const [mode, setMode] = useState(vaultExists() ? 'unlock' : 'create'); // create | unlock | open
  const [pin, setPinInput] = useState('');
  const [pin2, setPin2] = useState('');
  const [err, setErr] = useState('');
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => { setErr(''); }, [pin, pin2]);

  async function create() {
    if (pin.length < 4) { setErr('Use at least 4 digits.'); return; }
    if (pin !== pin2) { setErr('PINs don’t match.'); return; }
    await setPin(pin);
    setEntries(loadEntries()); setMode('open'); setPinInput(''); setPin2('');
  }
  async function unlock() {
    if (await verifyPin(pin)) { setEntries(loadEntries()); setMode('open'); setPinInput(''); }
    else setErr('That PIN doesn’t match.');
  }
  function add() { const now = Date.now(); setEntries((p) => addEntry(p, text, now)); setText(''); }
  function forget() { if (confirm('Reset the vault? This permanently deletes your PIN and every private note.')) { resetVault(); setEntries([]); setMode('create'); setPinInput(''); setPin2(''); } }

  const header = (title) => (
    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
      <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
      <span style={{ fontSize: 15, fontWeight: 600 }}>🔒 {title}</span>
    </div>
  );
  const pinInput = (val, set, label) => (
    <input type="password" inputMode="numeric" value={val} onChange={(e) => set(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder={label}
      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '13px 15px', fontSize: 18, letterSpacing: 6, color: C.text, outline: 'none', textAlign: 'center', marginBottom: 10 }} />
  );

  if (mode !== 'open') {
    return (
      <Shell>
        {header('Private vault')}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '30px 22px 44px', textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>🔒</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 23, fontWeight: 700 }}>{mode === 'create' ? 'Create your vault' : 'Enter your PIN'}</div>
          <p style={{ fontSize: 12.5, color: C.textSoft, margin: '8px 0 20px', lineHeight: 1.5 }}>Private notes just for you. Never leaves this device, never shared with your companions.</p>
          <div style={{ maxWidth: 260, margin: '0 auto' }}>
            {pinInput(pin, setPinInput, mode === 'create' ? 'Choose a PIN' : 'PIN')}
            {mode === 'create' && pinInput(pin2, setPin2, 'Confirm PIN')}
            {err && <div style={{ color: C.danger, fontSize: 12, marginBottom: 10 }}>{err}</div>}
            <button onClick={mode === 'create' ? create : unlock} className="bp" style={{ width: '100%' }}>{mode === 'create' ? 'Create vault' : 'Unlock'}</button>
            {mode === 'unlock' && <button onClick={forget} style={{ marginTop: 12, background: 'none', border: 'none', color: C.textDim, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Forgot PIN? Reset the vault</button>}
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {header('Private vault')}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 44px' }}>
        <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Write something private…" style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '11px 13px', fontSize: 14, color: C.text, outline: 'none', resize: 'none', lineHeight: 1.5, fontFamily: "'DM Sans',sans-serif" }} />
          <button onClick={add} disabled={!text.trim()} style={{ background: text.trim() ? C.glow1 : C.border, border: 'none', borderRadius: 12, color: '#fff', padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans',sans-serif" }}>Save</button>
        </div>
        {entries.length === 0 && <p style={{ fontSize: 13, color: C.textDim, textAlign: 'center', lineHeight: 1.6 }}>Your private notes will live here, locked behind your PIN.</p>}
        {entries.map((e) => (
          <div key={e.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 13, padding: '12px 13px', marginBottom: 9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 10, color: C.textDim }}>{e.ts ? new Date(e.ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
              <button aria-label="Delete note" onClick={() => setEntries((p) => removeEntry(p, e.id))} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 14, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', marginTop: 2 }}>{e.text}</div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
