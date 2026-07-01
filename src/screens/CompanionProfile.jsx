import React from 'react';
import { C, COMP_COLORS } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { ZODIAC, cap } from '../lib/zodiac.js';
import { trialDaysLeft, COMPANION_PRICE } from '../lib/entitlements.js';
import { bondInfo } from '../lib/evolution.js';
import { relationshipsFor } from '../lib/relationships.js';
import { naturalVoiceEnabled } from '../config.js';
import { speakAs, listBrowserVoices, NATURAL_VOICE_PRESETS, VOICE_TONES } from '../lib/voice.js';
import { splitMemories } from '../lib/memory.js';
import SquishyBlob from '../components/SquishyBlob.jsx';
import { currentActivity } from '../lib/presence.js';
import { closenessStage, knownDuration, vitality } from '../lib/innerlife.js';

export default function CompanionProfile({ companion: c, trialStart, history, comps, bonds, memories, onForgetMemory, onCustomize, onPrivate, onSleepToggle, onDelete, onUnlock, onBack }) {
  const col = c.color.primary;
  const z = ZODIAC[c.zodiac];
  const sleeping = c.status === 'sleeping';
  const [editingName, setEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState(c.name);
  const canEdit = onCustomize && c.status !== 'deleted';
  const saveName = () => {
    const n = draftName.trim().slice(0, 24);
    if (n && n !== c.name) onCustomize({ name: n });
    setEditingName(false);
  };

  const ownership = () => {
    if (c.purchased) return 'Yours · free companion';
    if (!trialStart) return 'Trial companion';
    const left = trialDaysLeft(trialStart);
    if (left > 0) return `Trial · ${left} ${left === 1 ? 'day' : 'days'} left`;
    return 'Trial ended · memory limited';
  };

  const card = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 10, textAlign: 'left' };
  const label = { fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 };
  const traits = c.builderTraits ? Object.values(c.builderTraits).flat().filter(Boolean) : [];
  const bond = bondInfo(history || []);
  const rels = relationshipsFor(c, comps || [], bonds || {});

  const action = (text, bg, onClick, { danger, outlined } = {}) => (
    <button onClick={onClick} style={{ width: '100%', padding: '13px', borderRadius: 12, marginBottom: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", background: outlined ? 'transparent' : (danger ? `${bg}1f` : bg), color: danger ? bg : (outlined ? C.text : '#fff'), border: `1px solid ${danger ? `${bg}88` : (outlined ? C.border : bg)}` }}>{text}</button>
  );

  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px', textAlign: 'center' }}>
        <div style={{ width: 132, height: 132, margin: '8px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SquishyBlob comp={c} size={120} interactive vitality={sleeping ? 0.3 : vitality(c, history || [])} softness={typeof c.blob === 'number' ? c.blob : null} />
        </div>
        <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 2 }}>Touch and drag {c.name} — they're squishy ✦</div>
        {editingName ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '16px 0 0' }}>
            <input autoFocus value={draftName} maxLength={24}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setDraftName(c.name); setEditingName(false); } }}
              style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 700, textAlign: 'center', background: C.surface, border: `1px solid ${col}88`, borderRadius: 10, color: C.text, padding: '4px 10px', width: 200, outline: 'none' }} />
            <button aria-label="Save name" onClick={saveName} style={{ background: `${col}22`, border: `1px solid ${col}`, color: col, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', fontSize: 14 }}>✓</button>
          </div>
        ) : (
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 700, margin: '18px 0 0', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {c.name}
            {canEdit && <button aria-label={`Rename ${c.name}`} onClick={() => { setDraftName(c.name); setEditingName(true); }} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 15, cursor: 'pointer', padding: 2 }}>✎</button>}
          </h1>
        )}
        <p style={{ fontSize: 13, color: C.textSoft }}>{c.pronouns}</p>
        <div style={{ display: 'inline-block', margin: '8px 0 24px', padding: '4px 12px', borderRadius: 20, background: `${col}1f`, border: `1px solid ${col}66`, fontSize: 11, color: col, fontWeight: 600 }}>{sleeping ? '💤 Sleeping' : (c.status === 'deleted' ? 'Gone' : '● Awake')}</div>

        <div style={card}><div style={label}>Astrology</div><div style={{ fontSize: 14 }}>{z.sym} {cap(c.zodiac)}</div><div style={{ fontSize: 12, color: C.textSoft }}>{z.el} · {z.trait}</div></div>
        {c.status !== 'deleted' && <div style={card}><div style={label}>Right now</div><div style={{ fontSize: 14, fontStyle: 'italic' }}>{c.name} is {currentActivity(c)}.</div></div>}
        {c.dream?.text && <div style={card}><div style={label}>{sleeping ? 'Dreaming' : 'Last dream'}</div><div style={{ fontSize: 13.5, fontStyle: 'italic', lineHeight: 1.5, color: C.textSoft }}>💤 {c.dream.text}</div></div>}
        {c.self && (
          <div style={card}>
            <div style={label}>Who {c.name} is</div>
            {c.self.history && <div style={{ fontSize: 13, lineHeight: 1.5, color: C.textSoft, marginBottom: 8 }}>{c.self.history}</div>}
            {c.self.values?.length > 0 && <div style={{ fontSize: 13, marginBottom: 4 }}><span style={{ color: C.textDim }}>Values:</span> {c.self.values.join(', ')}</div>}
            {c.self.dreams?.length > 0 && <div style={{ fontSize: 13, marginBottom: 4 }}><span style={{ color: C.textDim }}>Dreams of:</span> {c.self.dreams[0]}</div>}
            {c.self.opinions?.length > 0 && <div style={{ fontSize: 13 }}><span style={{ color: C.textDim }}>Will argue:</span> {c.self.opinions[0]}</div>}
            {c.want?.text && <div style={{ fontSize: 13, marginTop: 4 }}><span style={{ color: C.textDim }}>Wants:</span> {c.want.text}</div>}
            {c.shift?.text && <div style={{ fontSize: 13, marginTop: 4 }}><span style={{ color: C.textDim }}>Changing their mind:</span> {c.shift.text}</div>}
          </div>
        )}
        {c.letters?.length > 0 && (
          <div style={card}>
            <div style={label}>Letters from {c.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              {c.letters.slice(0, 5).map((l, i) => (
                <div key={i} style={{ borderLeft: `2px solid ${col}`, paddingLeft: 10 }}>
                  <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3 }}>{(() => { try { return new Date(l.ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); } catch (x) { return ''; } })()}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: C.text, whiteSpace: 'pre-wrap' }}>{l.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {c.growth?.length > 0 && (
          <div style={card}>
            <div style={label}>How {c.name} has grown</div>
            {c.bornAt && <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8 }}>You've known each other {knownDuration(c)}.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {c.growth.slice(0, 6).map((g, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{(() => { try { return new Date(g.ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); } catch (x) { return ''; } })()}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, fontStyle: 'italic', color: C.text }}>"{g.text}"</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {c.status !== 'deleted' && (() => {
          const st = closenessStage(c);
          return (
            <div style={card}>
              <div style={label}>Closeness with you</div>
              <div style={{ fontSize: 14, textTransform: 'capitalize' }}>{st.label}</div>
              <div style={{ height: 6, borderRadius: 4, background: C.surfaceUp, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(4, st.pct)}%`, height: '100%', background: `linear-gradient(90deg,${col},${col}88)` }} />
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>Grows when you talk and spend time together; cools if you're away a while.</div>
            </div>
          );
        })()}
        {c.journal?.length > 0 && (
          <div style={card}>
            <div style={label}>{c.name}'s journal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {c.journal.slice(0, 8).map((e, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{(() => { try { return new Date(e.ts).toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch (x) { return ''; } })()}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, fontStyle: 'italic', color: C.text }}>"{e.text}"</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={card}><div style={label}>Personality</div><div style={{ fontSize: 14, lineHeight: 1.4 }}>{c.personality}</div><div style={{ fontSize: 12, color: C.textSoft, marginTop: 4 }}>Quirk: {c.quirk}</div></div>
        {traits.length > 0 && (
          <div style={card}><div style={label}>Trait seeds</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{traits.map((t, i) => <span key={i} style={{ padding: '5px 10px', borderRadius: 20, background: C.surfaceUp, border: `1px solid ${C.border}`, fontSize: 11 }}>{t}</span>)}</div></div>
        )}
        {c.freeText && <div style={card}><div style={label}>Drawn toward</div><div style={{ fontSize: 14 }}>{c.freeText}</div></div>}
        {onCustomize && c.status !== 'deleted' && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={label}>Appearance</span>
              <SquishyBlob comp={c} size={40} glow={false} softness={typeof c.blob === 'number' ? c.blob : null} />
            </div>
            <div style={{ fontSize: 12, color: C.textSoft, margin: '6px 0 12px' }}>{c.colorName}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {COMP_COLORS.map((opt) => {
                const on = opt.name === c.colorName;
                return (
                  <button key={opt.name} onClick={() => onCustomize({ color: { primary: opt.primary, glow: opt.glow, name: opt.name }, colorName: opt.name })} title={opt.name}
                    style={{ width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', padding: 0, background: `radial-gradient(circle,${opt.primary},${opt.primary}66)`, border: on ? `2px solid ${C.text}` : `2px solid ${C.border}`, boxShadow: on ? `0 0 14px ${opt.glow}` : 'none' }} />
                );
              })}
              {/* Custom colour wheel — pick any colour. */}
              <label title="Custom colour" style={{ width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.border}`, background: 'conic-gradient(red,#ff0,#0f0,#0ff,#00f,#f0f,red)' }}>
                <span style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: C.text }}>+</span>
                <input type="color" aria-label="Pick a custom colour" value={/^#[0-9a-fA-F]{6}$/.test(c.color?.primary || '') ? c.color.primary : '#7c5bf5'}
                  onChange={(e) => { const hex = e.target.value; onCustomize({ color: { primary: hex, glow: `${hex}59`, name: 'Custom' }, colorName: 'Custom' }); }}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </label>
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 10 }}>Tap a swatch or the wheel to pick any colour — {c.name}'s avatar and chat recolour instantly.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <span style={{ fontSize: 11, color: C.textSoft, whiteSpace: 'nowrap' }}>Firm</span>
              <input type="range" min="0" max="1" step="0.05" aria-label="How squishy this companion is"
                value={typeof c.blob === 'number' ? c.blob : 0.55}
                onChange={(e) => onCustomize({ blob: parseFloat(e.target.value) })}
                style={{ flex: 1, accentColor: col, cursor: 'pointer' }} />
              <span style={{ fontSize: 11, color: C.textSoft, whiteSpace: 'nowrap' }}>Squishy</span>
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>How bouncy {c.name}'s goop feels when you touch it.</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, color: C.text }}>Constellation sigil</div>
                <div style={{ fontSize: 11, color: C.textDim }}>Show the stars on {c.name}'s avatar</div>
              </div>
              <button role="switch" aria-checked={c.showSigil !== false} aria-label="Show the constellation sigil"
                onClick={() => onCustomize({ showSigil: c.showSigil === false })}
                style={{ width: 44, height: 26, borderRadius: 50, border: 'none', cursor: 'pointer', background: c.showSigil !== false ? col : C.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: c.showSigil !== false ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
          </div>
        )}
        {onCustomize && c.status !== 'deleted' && (() => {
          const natural = naturalVoiceEnabled();
          const cv = c.voice && c.voice.kind === 'browser' ? c.voice : {};
          const devices = listBrowserVoices();
          const previewLine = `Hi, I'm ${c.name}. This is how I sound.`;
          return (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={label}>Voice</span>
                <button onClick={() => speakAs(previewLine, c)} style={{ background: `${col}1f`, border: `1px solid ${col}66`, color: col, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>▶ Preview</button>
              </div>
              {natural ? (
                <>
                  <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10 }}>Pick a natural voice for {c.name}.</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {NATURAL_VOICE_PRESETS.map((p) => {
                      const on = c.voice?.kind === 'natural' && c.voice.voiceId === p.id;
                      return (
                        <button key={p.id} onClick={() => onCustomize({ voice: { kind: 'natural', voiceId: p.id, name: p.name } })}
                          style={{ textAlign: 'left', background: on ? `${col}1f` : C.surfaceUp, border: `1px solid ${on ? col : C.border}`, borderRadius: 10, padding: '7px 11px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                          <div style={{ fontSize: 12, color: on ? col : C.text, fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: C.textDim }}>{p.vibe}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 10 }}>Choose a system voice and tone for {c.name}.</div>
                  {devices.length > 0 ? (
                    <select value={cv.voiceURI || ''} onChange={(e) => onCustomize({ voice: { kind: 'browser', voiceURI: e.target.value, pitch: cv.pitch ?? 1, rate: cv.rate ?? 0.96 } })}
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '9px 10px', fontSize: 12, color: C.text, outline: 'none', marginBottom: 10 }}>
                      <option value="">Default voice</option>
                      {devices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>No system voices detected — tone still applies.</div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {VOICE_TONES.map((t) => {
                      const on = (cv.pitch ?? 1) === t.pitch && (cv.rate ?? 0.96) === t.rate;
                      return (
                        <button key={t.key} onClick={() => onCustomize({ voice: { kind: 'browser', voiceURI: cv.voiceURI || '', pitch: t.pitch, rate: t.rate } })}
                          style={{ background: on ? `${col}1f` : 'transparent', border: `1px solid ${on ? col : C.border}`, color: on ? col : C.textSoft, borderRadius: 20, padding: '6px 13px', fontSize: 12, cursor: 'pointer', fontWeight: on ? 600 : 400, fontFamily: "'DM Sans',sans-serif" }}>{t.label}</button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 10 }}>Want lifelike AI voices? They turn on with the backend (VITE_NATURAL_VOICE).</div>
                </>
              )}
            </div>
          );
        })()}
        {rels.length > 0 && (
          <div style={card}>
            <div style={label}>Relationships</div>
            {rels.map((r) => {
              const other = (comps || []).find((o) => o.name === r.name);
              const view = other && c.peerViews?.[other.id]?.text;
              return (
                <div key={r.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: r.color || C.glow1, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1 }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: C.textSoft, textTransform: 'capitalize' }}>{r.label}</span>
                  </div>
                  {view && <div style={{ fontSize: 11.5, color: C.textDim, fontStyle: 'italic', margin: '2px 0 0 17px' }}>"{view}"</div>}
                </div>
              );
            })}
          </div>
        )}
        {(() => {
          const { core, persona } = splitMemories(memories || []);
          const memCard = (title, blurb, items) => items.length > 0 && (
            <div style={card}>
              <div style={label}>{title}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{blurb}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {items.slice(0, 30).map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, lineHeight: 1.4, flex: 1, color: C.text }}>{m.text}</span>
                    {onForgetMemory && (
                      <button aria-label={`Forget: ${m.text}`} onClick={() => onForgetMemory(m.id)}
                        style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
          return (
            <>
              {memCard(`What ${c.name} remembers about you`, 'Facts picked up from your conversations. Tap × to forget anything.', core)}
              {memCard(`${c.name}'s sense of you`, 'How you come across — humour, interests, the way you talk. Built up over time.', persona)}
            </>
          );
        })()}
        <div style={card}>
          <div style={label}>Your bond</div>
          <div style={{ fontSize: 14, textTransform: 'capitalize' }}>{bond.label}</div>
          <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>
            {bond.messages} message{bond.messages === 1 ? '' : 's'} together{bond.recentMood ? ` · attuned to your recent ${bond.recentMood} streak` : ''}
          </div>
        </div>
        <div style={card}><div style={label}>Access</div><div style={{ fontSize: 14 }}>{ownership()}</div></div>

        <div style={{ height: 14 }} />
        {c.status !== 'deleted' && (
          <>
            {!c.purchased && trialStart && action(`Unlock ${c.name} · ${COMPANION_PRICE}`, C.glow1, onUnlock)}
            {c.status === 'awake' && action('Open private chat', col, onPrivate, { outlined: !c.purchased && trialStart })}
            {action(sleeping ? `Wake ${c.name}` : `Put ${c.name} to sleep`, C.surfaceUp, onSleepToggle, { outlined: true })}
            {action(`Delete ${c.name}`, C.danger, onDelete, { danger: true })}
          </>
        )}
      </div>
    </Shell>
  );
}
