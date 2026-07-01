import React, { useState } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { promptForDay, newEntry, addEntry, removeEntry } from '../lib/journal.js';

// A private journal: a gentle daily prompt, free-write entries, and a browsable
// + searchable history. Entries stay on-device/synced and are never sent to AI.
export default function Journal({ entries = [], onChange, onBack }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const prompt = promptForDay();
  const list = entries || [];
  const query = q.trim().toLowerCase();
  const shown = query ? list.filter((e) => (e.text || '').toLowerCase().includes(query) || (e.prompt || '').toLowerCase().includes(query)) : list;
  const fmt = (t) => { try { return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } };

  function save() {
    const t = text.trim();
    if (!t) return;
    onChange?.(addEntry(list, newEntry(t, prompt)));
    setText('');
  }

  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Journal</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 48px' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Today’s prompt</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: C.text, lineHeight: 1.4, marginBottom: 10 }}>{prompt}</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write freely — this stays private to you." rows={4}
            style={{ width: '100%', boxSizing: 'border-box', background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13.5, color: C.text, outline: 'none', resize: 'vertical', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <button onClick={save} disabled={!text.trim()} style={{ background: text.trim() ? C.glow1 : C.border, border: 'none', borderRadius: 10, padding: '9px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans',sans-serif" }}>Save entry</button>
            <span style={{ fontSize: 11, color: C.textDim }}>🔒 Private — never sent to companions or our servers' AI.</span>
          </div>
        </div>

        {list.length > 0 && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your journal…" style={{ width: '100%', boxSizing: 'border-box', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 50, padding: '9px 14px', fontSize: 13, color: C.text, outline: 'none', marginBottom: 14 }} />
        )}

        {shown.length === 0 && <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{list.length ? `Nothing matches “${q}”.` : 'Your entries will gather here. Start with today’s prompt above.'}</p>}

        {shown.map((e) => (
          <div key={e.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 13, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: C.textDim }}>{fmt(e.ts)}</span>
              <button aria-label="Delete entry" onClick={() => onChange?.(removeEntry(list, e.id))} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 13, cursor: 'pointer', opacity: 0.6 }}>✕</button>
            </div>
            {e.prompt && <div style={{ fontSize: 11.5, color: C.textSoft, fontStyle: 'italic', marginBottom: 5 }}>{e.prompt}</div>}
            <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{e.text}</div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
