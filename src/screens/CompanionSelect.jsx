import React, { useState } from 'react';
import { C } from '../theme.js';
import { ZODIAC, cap } from '../lib/zodiac.js';
import { Shell } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';

const PRONOUNS = ['she/her', 'he/him', 'they/them'];

export default function CompanionSelect({ comps, onSelect }) {
  // Local editable copy so the user can tweak a companion (name/pronouns) at
  // first meeting before committing; edits flow through to onSelect.
  const [list, setList] = useState(comps);
  const [sel, setSel] = useState(new Set());
  const [editing, setEditing] = useState(null); // companion id being edited
  const [draft, setDraft] = useState({ name: '', pronouns: '' });

  const tog = (id) => {
    const s = new Set(sel);
    s.has(id) ? s.delete(id) : s.add(id);
    setSel(s);
  };
  const openEdit = (c) => {
    setDraft({ name: c.name, pronouns: c.pronouns });
    setEditing(c.id);
  };
  const saveEdit = (id) => {
    const name = draft.name.trim().slice(0, 24);
    setList((l) => l.map((c) => (c.id === id ? { ...c, name: name || c.name, pronouns: draft.pronouns || c.pronouns } : c)));
    setEditing(null);
  };

  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 22 }}>
        <div style={{ textAlign: 'center', marginBottom: 18, marginTop: 14 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: C.glow1, marginBottom: 4 }}>Choose Your Companions</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Who's coming with you?</h2>
          <p style={{ color: C.textSoft, fontSize: 12 }}>Pick one free. All three = 2-week trial. Tap ✎ to make one yours.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {list.map((c, i) => {
            const s = sel.has(c.id);
            const isEditing = editing === c.id;
            return (
              <div key={c.id} style={{ background: s ? `${c.color.primary}10` : C.surface, border: `1.5px solid ${s ? c.color.primary : C.border}`, borderRadius: 14, transition: 'all 0.3s', boxShadow: s ? `0 0 18px ${c.color.glow}` : 'none', animation: `fadeUp 0.5s ${0.1 + i * 0.1}s both`, overflow: 'hidden' }}>
                <button onClick={() => tog(c.id)} style={{ background: 'none', border: 'none', width: '100%', padding: '14px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar comp={c} size={38} glow={false} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: C.textSoft }}>{c.pronouns}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Edit ${c.name}`}
                          onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); openEdit(c); } }}
                          style={{ marginLeft: 'auto', color: C.textDim, fontSize: 14, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
                        >✎</span>
                      </div>
                      <div style={{ fontSize: 11, color: c.color.primary, fontWeight: 500, marginBottom: 2 }}>{ZODIAC[c.zodiac].sym} {cap(c.zodiac)} · {ZODIAC[c.zodiac].el}</div>
                      <div style={{ fontSize: 11, color: C.textSoft, fontStyle: 'italic' }}>"{c.personality}"</div>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${s ? c.color.primary : C.border}`, background: s ? c.color.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0 }}>{s && '✓'}</div>
                  </div>
                </button>
                {isEditing && (
                  <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ height: 1, background: C.border, marginBottom: 4 }} />
                    <label style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.textDim }}>Name</label>
                    <input autoFocus value={draft.name} maxLength={24}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(c.id); if (e.key === 'Escape') setEditing(null); }}
                      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: 'none' }} />
                    <label style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.textDim, marginTop: 2 }}>Pronouns</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {PRONOUNS.map((p) => {
                        const on = draft.pronouns === p;
                        return (
                          <button key={p} onClick={() => setDraft((d) => ({ ...d, pronouns: p }))}
                            style={{ flex: 1, background: on ? `${c.color.primary}22` : C.bg, border: `1px solid ${on ? c.color.primary : C.border}`, color: on ? c.color.primary : C.textSoft, borderRadius: 8, padding: '7px 4px', cursor: 'pointer', fontSize: 11.5, fontWeight: on ? 600 : 400, fontFamily: "'DM Sans',sans-serif" }}>{p}</button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button onClick={() => setEditing(null)} style={{ flex: 1, background: 'none', border: `1px solid ${C.border}`, color: C.textSoft, borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                      <button onClick={() => saveEdit(c.id)} style={{ flex: 1, background: `${c.color.primary}22`, border: `1px solid ${c.color.primary}`, color: c.color.primary, borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>Save</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          {sel.size > 1 && <p style={{ fontSize: 10, color: C.glow2, marginBottom: 6 }}>✨ 2-week free trial</p>}
          <button className="bp" disabled={!sel.size} onClick={() => onSelect(list.filter((c) => sel.has(c.id)))} style={{ width: '100%' }}>
            {!sel.size ? 'Select at least one' : sel.size === 1 ? 'Start with this companion' : `Start with all ${sel.size}`}
          </button>
        </div>
      </div>
    </Shell>
  );
}
