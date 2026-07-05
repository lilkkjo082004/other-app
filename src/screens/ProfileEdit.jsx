import React, { useState, useRef } from 'react';
import { C } from '../theme.js';
import { Shell, Checks, Pills } from '../components/ui.jsx';
import { ACTIVITIES, CUISINES, DIETARY, VIBES, COMMUNICATION, RELATIONSHIP, LOVE_LANG, NEEDS, SOCIAL_ID, VALUES, RECHARGE, SUPPORT_STYLE } from '../data/onboarding.js';
import { readAvatar } from '../lib/photo.js';

// Edit your profile after onboarding — without a reset. Changing the birthday
// re-derives astrology and re-checks the age gate (handled in App.updateProfile).
export default function ProfileEdit({ profile, onSave, onBack }) {
  const [f, setF] = useState({ ...profile });
  const photoRef = useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { set('photo', await readAvatar(file)); } catch (err) { /* ignore bad image */ }
  }
  const initial = (f.name || '?').trim().charAt(0).toUpperCase();
  const toggle = (k, v) => setF((p) => {
    const cur = Array.isArray(p[k]) ? p[k] : [];
    return { ...p, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
  });

  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12 };
  const label = { fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 };
  const input = { width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 13px', fontSize: 14, color: C.text, outline: 'none' };
  const ta = { ...input, resize: 'none', lineHeight: 1.4, fontFamily: "'DM Sans',sans-serif" };

  const Multi = ({ title, k, opts }) => (
    <div style={card}><div style={label}>{title}</div><Checks opts={opts} sel={Array.isArray(f[k]) ? f[k] : []} onTog={(v) => toggle(k, v)} /></div>
  );

  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Edit profile</span>
        </div>
        <button onClick={() => onSave(f)} disabled={!f.name?.trim()} style={{ background: C.glow1, border: 'none', borderRadius: 20, color: '#fff', fontSize: 13, fontWeight: 600, padding: '7px 16px', cursor: f.name?.trim() ? 'pointer' : 'default', opacity: f.name?.trim() ? 1 : 0.5, fontFamily: "'DM Sans',sans-serif" }}>Save</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 40px' }}>
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
          <input ref={photoRef} type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
          <button aria-label="Change your photo" onClick={() => photoRef.current?.click()} style={{ flexShrink: 0, width: 64, height: 64, borderRadius: '50%', border: `1px solid ${C.border}`, background: f.photo ? `center/cover no-repeat url(${f.photo})` : C.bg, color: C.textSoft, cursor: 'pointer', fontSize: 22, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {!f.photo && initial}
          </button>
          <div style={{ flex: 1 }}>
            <div style={label}>Your photo</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => photoRef.current?.click()} style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 12px', fontSize: 12.5, color: C.text, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{f.photo ? 'Change' : 'Upload'}</button>
              {f.photo && <button onClick={() => set('photo', '')} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 12px', fontSize: 12.5, color: C.textSoft, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Remove</button>}
            </div>
            <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 6 }}>Stays on your device / your account. Optional.</div>
          </div>
        </div>
        <div style={card}>
          <div style={label}>Name</div>
          <input value={f.name || ''} onChange={(e) => set('name', e.target.value)} style={input} />
        </div>
        <div style={card}>
          <div style={label}>Birthday</div>
          <input type="date" value={f.dob || ''} onChange={(e) => set('dob', e.target.value)} style={{ ...input, colorScheme: 'dark' }} />
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>Changing this updates your astrology and re-checks your age.</div>
        </div>
        <div style={card}>
          <div style={label}>Occupation</div>
          <input value={f.occupation || ''} onChange={(e) => set('occupation', e.target.value)} placeholder="Designer, student, nurse…" style={input} />
        </div>

        <Multi title="Energy you gravitate toward" k="vibe" opts={VIBES} />
        <Multi title="How you communicate" k="communication" opts={COMMUNICATION} />
        <Multi title="Relationship status" k="relationship" opts={RELATIONSHIP} />
        <Multi title="Love language" k="loveLang" opts={LOVE_LANG} />
        <Multi title="What you want more of" k="needs" opts={NEEDS} />
        <Multi title="How friends describe you" k="socialId" opts={SOCIAL_ID} />

        <Multi title="What matters most to you" k="values" opts={VALUES} />
        <Multi title="How you recharge" k="recharge" opts={RECHARGE} />
        <div style={card}>
          <div style={label}>In your own words</div>
          <textarea rows={4} value={f.aboutYou && f.aboutYou !== 'not specified' ? f.aboutYou : ''} onChange={(e) => set('aboutYou', e.target.value)} placeholder="What's going on in your life right now…" style={ta} />
        </div>
        <Multi title="When you're struggling, what helps" k="supportStyle" opts={SUPPORT_STYLE} />

        <Multi title="Activities & hobbies" k="activities" opts={ACTIVITIES.map((a) => ({ v: a.id, label: a.label, em: a.em }))} />

        <div style={card}><div style={label}>Cuisines you love</div><Pills opts={CUISINES} sel={Array.isArray(f.cuisineLove) ? f.cuisineLove : []} onTog={(v) => toggle('cuisineLove', v)} /></div>
        <div style={card}><div style={label}>Cuisines to avoid</div><Pills opts={CUISINES} sel={Array.isArray(f.cuisineDislike) ? f.cuisineDislike : []} onTog={(v) => toggle('cuisineDislike', v)} /></div>
        <Multi title="Dietary" k="dietary" opts={DIETARY.map((x) => ({ v: x, label: x }))} />

        <div style={card}>
          <div style={label}>Favorite movies / shows</div>
          <textarea rows={2} value={f.favMovies && f.favMovies !== 'not specified' ? f.favMovies : ''} onChange={(e) => set('favMovies', e.target.value)} placeholder="The Office, Spirited Away…" style={ta} />
        </div>
        <div style={card}>
          <div style={label}>Favorite music</div>
          <textarea rows={2} value={f.favMusic && f.favMusic !== 'not specified' ? f.favMusic : ''} onChange={(e) => set('favMusic', e.target.value)} placeholder="SZA, Tyler the Creator…" style={ta} />
        </div>

        <button onClick={() => onSave(f)} disabled={!f.name?.trim()} className="bp" style={{ width: '100%', marginTop: 4, opacity: f.name?.trim() ? 1 : 0.5 }}>Save changes</button>
      </div>
    </Shell>
  );
}
