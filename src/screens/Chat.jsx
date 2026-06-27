import React, { useState, useEffect, useRef, useCallback } from 'react';
import { C, COMP_COLORS } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { speakAs, useSpeechRec } from '../lib/voice.js';
import { genAmbient, bumpBond } from '../lib/relationships.js';
import { askCompanion, greetCompanion } from '../lib/ai.js';
import { isLimited } from '../lib/entitlements.js';
import { genComp } from '../lib/companions.js';
import { pickSigns } from '../lib/zodiac.js';
import { detectMood } from '../lib/evolution.js';
import { useDisclosureReminder, DISCLOSURE_TEXT } from '../lib/disclosure.js';
import { detectCrisis, CRISIS_RESOURCES, CRISIS_INTRO } from '../lib/crisis.js';
import { isAuthed as apiAuthed, logMood } from '../lib/api.js';
import UnlockSheet from '../components/UnlockSheet.jsx';
import Settings from './Settings.jsx';
import CompanionProfile from './CompanionProfile.jsx';
import WakingUp from './WakingUp.jsx';

export default function Chat({ companions: init, profile, trialStart, restored, onPersist, onReset, cloud, authed, email, onSignIn, onSignOut }) {
  const [comps, setComps] = useState(init.map((c) => ({ ...c, status: c.status || 'awake' })));
  const [msgs, setMsgs] = useState(restored ? restored.messages || [] : []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState(restored?.chatMode || 'group');
  const [showMenu, setShowMenu] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(restored?.autoSpeak || false);
  const [panel, setPanel] = useState(null);            // null | 'settings' | { profile: id }
  const [ambient, setAmbient] = useState([]);          // ephemeral "while you were away" thread
  const [bonds, setBonds] = useState(restored?.bonds || {});
  const [unlock, setUnlock] = useState(null);          // { companion, onResult(ok) }
  const [summonCandidate, setSummonCandidate] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const active = comps.filter((c) => c.status === 'awake');
  const priv = chatMode !== 'group' ? comps.find((c) => c.id === chatMode) : null;
  const living = comps.filter((c) => c.status !== 'deleted');
  const limited = living.filter((c) => isLimited(c, trialStart));

  const handleVoice = useCallback((t) => {
    const lo = t.toLowerCase();
    const f = active.find((c) => lo.includes(c.name.toLowerCase()));
    if (f) { setChatMode(f.id); setShowMenu(false); }
    else if (t.trim()) { setInput(t); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [active]);
  const { listening, startListening } = useSpeechRec(handleVoice);

  useEffect(() => {
    (async () => {
      // Companions catching up with each other while you were away — regenerated
      // each open (ephemeral, not persisted) and nudges their bond forward.
      const res = genAmbient(comps, bonds);
      if (res) {
        setAmbient(res.thread.map((m) => ({ role: 'assistant', companion: m.from, content: m.text, isAmbient: true })));
        setBonds((b) => bumpBond(b, res.pair[0], res.pair[1]));
      }
      // AI disclosure is shown up front, then repeats hourly (see below).
      const disc = { role: 'system', kind: 'disclosure', content: DISCLOSURE_TEXT };
      if (restored) {
        setMsgs((p) => (p[p.length - 1]?.kind === 'disclosure' ? p : [...p, disc]));
        return;
      }
      setMsgs([disc]);
      await greet();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recurring AI disclosure reminder (ToS §13 — required, not user-disableable).
  useDisclosureReminder(useCallback(() => {
    setMsgs((p) => [...p, { role: 'system', kind: 'disclosure', content: DISCLOSURE_TEXT }]);
  }, []));

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs, loading]);

  useEffect(() => {
    onPersist?.({ companions: comps, messages: msgs, chatMode, autoSpeak, trialStart, bonds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps, msgs, chatMode, autoSpeak, bonds]);

  async function greet() {
    setLoading(true);
    const cc = priv ? [priv] : active;
    for (const c of cc) {
      const t = await greetCompanion(c, profile, priv ? 'private' : 'group', comps);
      setMsgs((p) => [...p, { role: 'assistant', companion: c, content: t }]);
      if (autoSpeak) speakAs(t, c.voiceIdx);
    }
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const u = input.trim();
    setInput('');
    const nm = [...msgs, { role: 'user', content: u }];
    setMsgs(nm);
    setLoading(true);
    // Safety: surface crisis resources when self-harm/suicidal ideation appears.
    if (detectCrisis(u)) setMsgs((p) => [...p, { role: 'system', kind: 'crisis' }]);
    // Long-term mood tracking (best-effort; only when signed in to the backend).
    const mood = detectMood(u);
    if (mood && apiAuthed()) logMood(mood, { companionId: priv ? priv.id : undefined });
    const responders = priv ? [priv] : active.filter(() => Math.random() > 0.15);
    const act = responders.length ? responders : [active[0]].filter(Boolean);
    let run = [...nm];
    for (const c of act) {
      const t = await askCompanion(c, profile, run, comps, priv ? 'private' : 'group');
      const m = { role: 'assistant', companion: c, content: t };
      run = [...run, m];
      setMsgs((p) => [...p, m]);
      if (autoSpeak) speakAs(t, c.voiceIdx);
    }
    setLoading(false);
    inputRef.current?.focus();
  }

  function togSleep(id) {
    setComps((p) => p.map((c) => (c.id === id ? { ...c, status: c.status === 'awake' ? 'sleeping' : 'awake' } : c)));
    if (chatMode === id) setChatMode('group');
    setShowMenu(false);
  }

  function delComp(id) {
    try { if (!window.confirm('This is permanent. Delete this companion?')) return; } catch (e) { /* headless */ }
    const dl = comps.find((c) => c.id === id);
    const al = comps.filter((c) => c.id !== id && c.status === 'awake');
    setComps((p) => p.map((c) => (c.id === id ? { ...c, status: 'deleted' } : c)));
    if (chatMode === id) setChatMode('group');
    setShowMenu(false);
    if (al.length && dl) setMsgs((p) => [...p, { role: 'assistant', companion: al[0], content: `...${dl.name} is gone. I'm going to miss ${dl.pronouns.split('/')[1] || 'them'}.` }]);
  }

  function markPurchased(id) {
    setComps((p) => p.map((c) => (c.id === id ? { ...c, purchased: true } : c)));
    const c = comps.find((x) => x.id === id);
    const others = comps.filter((o) => o.id !== id && o.status === 'awake');
    if (c && others.length) setMsgs((p) => [...p, { role: 'assistant', companion: others[0], content: `${c.name} is staying for good. honestly? wouldn't be the same without ${c.pronouns.split('/')[1] || 'them'}.` }]);
  }

  async function addCompanion(c) {
    setComps((p) => [...p, c]);
    const t = await greetCompanion(c, profile, 'group', [...comps, c]);
    setMsgs((p) => [...p, { role: 'assistant', companion: c, content: t }]);
  }

  function summon() {
    setShowMenu(false);
    if (living.length >= 3) return;
    const usedNames = comps.map((c) => c.name);
    const usedSigns = new Set(living.map((c) => c.zodiac));
    const pool = pickSigns(profile.astrology.western);
    const sign = pool.find((s) => !usedSigns.has(s)) || pool[0];
    const usedColors = new Set(living.map((c) => c.color?.name));
    let ci = living.length % COMP_COLORS.length;
    for (let i = 0; i < COMP_COLORS.length; i++) { if (!usedColors.has(COMP_COLORS[i].name)) { ci = i; break; } }
    const cand = genComp(sign, ci, usedNames);
    cand.purchased = false; // decided after the waking-up sequence
    setSummonCandidate(cand);
  }

  function onSummonDone() {
    const cand = summonCandidate;
    setSummonCandidate(null);
    if (!cand) return;
    const freeAvailable = !living.some((c) => c.purchased);
    if (freeAvailable) { cand.purchased = true; addCompanion(cand); }
    else setUnlock({ companion: cand, onResult: (ok) => { if (ok) { cand.purchased = true; addCompanion(cand); } } });
  }

  function openProfile(c) { setShowMenu(false); setPanel({ profile: c.id }); }

  // ── Panels (full-screen views) ──
  if (panel === 'settings') {
    return (
      <Settings
        profile={profile} comps={comps} autoSpeak={autoSpeak} trialStart={trialStart}
        cloud={cloud} authed={authed} email={email} onSignIn={onSignIn} onSignOut={onSignOut}
        onAutoSpeak={setAutoSpeak}
        onSleepAll={() => setComps((p) => p.map((c) => (c.status === 'awake' ? { ...c, status: 'sleeping' } : c)))}
        onWakeAll={() => setComps((p) => p.map((c) => (c.status === 'sleeping' ? { ...c, status: 'awake' } : c)))}
        onReset={onReset}
        onBack={() => setPanel(null)}
      />
    );
  }
  if (panel && panel.profile) {
    const pc = comps.find((c) => c.id === panel.profile);
    if (pc) {
      return (
        <CompanionProfile
          companion={pc} trialStart={trialStart} history={msgs} comps={comps} bonds={bonds}
          onCustomize={(updates) => setComps((p) => p.map((c) => (c.id === pc.id ? { ...c, ...updates } : c)))}
          onBack={() => setPanel(null)}
          onPrivate={() => { setChatMode(pc.id); setPanel(null); }}
          onSleepToggle={() => { togSleep(pc.id); setPanel(null); }}
          onDelete={() => { delComp(pc.id); setPanel(null); }}
          onUnlock={() => { setPanel(null); setUnlock({ companion: pc, onResult: (ok) => { if (ok) markPurchased(pc.id); } }); }}
        />
      );
    }
  }

  const visible = msgs.filter((m) => m.role === 'system' || chatMode === 'group' || m.role === 'user' || m.companion?.id === chatMode);
  // Ambient catch-up is companion-to-companion, so it only shows in group view.
  const stream = chatMode === 'group' ? [...ambient, ...visible] : visible;

  return (
    <Shell>
      <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, background: `${C.bg}dd`, backdropFilter: 'blur(12px)', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {chatMode === 'group' ? (
            <>
              <div style={{ display: 'flex' }}>{active.map((c, i) => <div key={c.id} style={{ width: 26, height: 26, borderRadius: '50%', background: `radial-gradient(circle,${c.color.primary},${c.color.primary}66)`, border: `2px solid ${C.bg}`, marginLeft: i ? -7 : 0, zIndex: 3 - i, opacity: isLimited(c, trialStart) ? 0.4 : 1 }} />)}</div>
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>Group Chat</div><div style={{ fontSize: 9, color: C.textSoft }}>{active.map((c) => c.name).join(', ') || 'Everyone resting'}</div></div>
            </>
          ) : (
            <>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: `radial-gradient(circle,${priv.color.primary},${priv.color.primary}66)` }} />
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>{priv.name}</div><div style={{ fontSize: 9, color: C.glow3 }}>Private</div></div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={() => setAutoSpeak(!autoSpeak)} style={{ background: autoSpeak ? `${C.glow3}22` : 'none', border: `1px solid ${autoSpeak ? C.glow3 : C.border}`, borderRadius: 7, padding: '5px 8px', color: autoSpeak ? C.glow3 : C.textDim, fontSize: 13, cursor: 'pointer' }}>{autoSpeak ? '🔊' : '🔇'}</button>
          <button onClick={startListening} style={{ background: listening ? `${C.danger}22` : 'none', border: `1px solid ${listening ? C.danger : C.border}`, borderRadius: 7, padding: '5px 8px', color: listening ? C.danger : C.textDim, fontSize: 13, cursor: 'pointer', animation: listening ? 'micPulse 1.5s infinite' : 'none' }}>🎤</button>
          <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 16, cursor: 'pointer', padding: 4 }}>☰</button>
        </div>
      </div>

      {listening && <div style={{ background: `${C.danger}15`, borderBottom: `1px solid ${C.danger}33`, padding: '6px 14px', textAlign: 'center', fontSize: 11, color: C.danger }}>🎤 Say a companion's name or speak your message</div>}

      {limited.length > 0 && (
        <div onClick={() => setUnlock({ companion: limited[0], onResult: (ok) => { if (ok) markPurchased(limited[0].id); } })} style={{ background: `${C.glow2}14`, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <span style={{ fontSize: 12 }}>✦</span>
          <span style={{ flex: 1, fontSize: 11, color: C.textSoft }}>{limited.length === 1 ? `${limited[0].name}'s memory is limited since the trial ended.` : `${limited.length} companions have limited memory since the trial ended.`}</span>
          <span style={{ fontSize: 11, color: C.glow2, fontWeight: 700 }}>Unlock</span>
        </div>
      )}

      {showMenu && (
        <div style={{ position: 'absolute', top: 46, right: 0, width: 248, background: C.card, border: `1px solid ${C.border}`, borderRadius: '0 0 0 14px', padding: 12, zIndex: 20, animation: 'fadeIn 0.2s', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: 9, color: C.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Chat Mode</div>
          <button onClick={() => { setChatMode('group'); setShowMenu(false); }} style={{ width: '100%', background: chatMode === 'group' ? C.surfaceUp : 'transparent', border: `1px solid ${chatMode === 'group' ? C.borderLit : 'transparent'}`, borderRadius: 7, padding: '7px 10px', color: C.text, cursor: 'pointer', textAlign: 'left', marginBottom: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>👥 Group</button>
          {comps.filter((c) => c.status !== 'deleted').map((c) => (
            <div key={c.id} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: c.color.primary, opacity: c.status === 'sleeping' || isLimited(c, trialStart) ? 0.3 : 1 }} />
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: c.status === 'sleeping' ? C.textDim : C.text }}>{c.name}</span>
                <span style={{ fontSize: 8 }}>{c.status === 'sleeping' ? '💤' : '●'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 19 }}>
                <button onClick={() => openProfile(c)} style={menuBtn}>Profile</button>
                {!c.purchased && trialStart && <button onClick={() => setUnlock({ companion: c, onResult: (ok) => { if (ok) markPurchased(c.id); } })} style={{ ...menuBtn, border: `1px solid ${C.glow2}55`, color: C.glow2, fontWeight: 700 }}>Unlock</button>}
                {c.status === 'awake' && <button onClick={() => { setChatMode(c.id); setShowMenu(false); }} style={menuBtn}>Private</button>}
                <button onClick={() => togSleep(c.id)} style={menuBtn}>{c.status === 'sleeping' ? 'Wake' : 'Sleep'}</button>
                <button onClick={() => delComp(c.id)} style={{ ...menuBtn, border: `1px solid ${C.danger}33`, color: C.danger }}>Delete</button>
              </div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, margin: '8px 0' }} />
          {living.length < 3 && <button onClick={summon} style={{ width: '100%', background: 'none', border: 'none', borderRadius: 7, padding: '7px 10px', color: C.glow2, cursor: 'pointer', textAlign: 'left', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>✦  Summon a companion</button>}
          <button onClick={() => { setShowMenu(false); setPanel('settings'); }} style={{ width: '100%', background: 'none', border: 'none', borderRadius: 7, padding: '7px 10px', color: C.text, cursor: 'pointer', textAlign: 'left', fontSize: 12, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>⚙  Settings</button>
          <button onClick={() => setShowMenu(false)} style={{ width: '100%', background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px', color: C.textSoft, cursor: 'pointer', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>Close</button>
        </div>
      )}

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px' }}>
        {stream.map((m, i) => (
          m.role === 'system' ? (
            m.kind === 'crisis' ? <CrisisCard key={i} /> : <DisclosureNote key={i} text={m.content} />
          ) : (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 7, animation: 'fadeUp 0.3s both' }}>
            {m.role === 'assistant' && <div style={{ width: 24, height: 24, borderRadius: '50%', background: `radial-gradient(circle,${m.companion?.color?.primary || C.glow1},${m.companion?.color?.primary || C.glow1}55)`, marginRight: 7, flexShrink: 0, marginTop: chatMode === 'group' ? 14 : 0 }} />}
            <div style={{ maxWidth: '78%' }}>
              {m.role === 'assistant' && chatMode === 'group' && <span style={{ fontSize: 9, color: m.companion?.color?.primary, fontWeight: 600, display: 'block', marginBottom: 1 }}>{m.companion?.name}</span>}
              <div style={{ position: 'relative' }}>
                <div style={{ padding: '8px 12px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? C.glow1 : C.card, color: m.role === 'user' ? '#fff' : C.text, fontSize: 13, lineHeight: 1.5, border: m.role === 'user' ? 'none' : `1px solid ${C.border}`, whiteSpace: 'pre-wrap' }}>
                  {m.isAmbient && <span style={{ fontSize: 8, color: C.textDim, display: 'block', marginBottom: 2, fontStyle: 'italic' }}>earlier...</span>}
                  {m.content}
                </div>
                {m.role === 'assistant' && <button onClick={() => speakAs(m.content, m.companion?.voiceIdx || 0)} style={{ position: 'absolute', top: 3, right: -24, background: 'none', border: 'none', color: C.textDim, fontSize: 12, cursor: 'pointer', opacity: 0.5 }}>🔊</button>}
              </div>
            </div>
          </div>
          )
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: `radial-gradient(circle,${C.glow1},${C.glow1}55)` }} />
            <div style={{ padding: '8px 12px', borderRadius: '14px 14px 14px 4px', background: C.card, border: `1px solid ${C.border}`, display: 'flex', gap: 3 }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: C.textDim, animation: `typewriter 1.4s ${i * 0.15}s infinite` }} />)}</div>
          </div>
        )}
      </div>

      <div style={{ padding: '7px 10px 16px', borderTop: `1px solid ${C.border}`, background: `${C.bg}ee` }}>
        {!active.length ? (
          <p style={{ textAlign: 'center', color: C.textDim, fontSize: 12, padding: 8 }}>All companions resting 💤</p>
        ) : (
          <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()} placeholder={priv ? `Message ${priv.name}...` : 'Message everyone...'} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 50, padding: '10px 14px', fontSize: 13, color: C.text, outline: 'none' }} />
            <button onClick={send} disabled={!input.trim() || loading} style={{ width: 38, height: 38, borderRadius: '50%', background: input.trim() && !loading ? C.glow1 : C.border, border: 'none', color: '#fff', fontSize: 14, cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
          </div>
        )}
      </div>

      {summonCandidate && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}><WakingUp comp={summonCandidate} onDone={onSummonDone} /></div>}
      {unlock && <UnlockSheet companion={unlock.companion} onClose={(ok) => { const f = unlock.onResult; setUnlock(null); f?.(ok); }} />}
    </Shell>
  );
}

const menuBtn = { background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 7px', color: C.textSoft, cursor: 'pointer', fontSize: 9, fontFamily: "'DM Sans',sans-serif" };

function DisclosureNote({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
      <div style={{ maxWidth: '88%', textAlign: 'center', fontSize: 10, color: C.textDim, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 12px', lineHeight: 1.5 }}>ⓘ {text}</div>
    </div>
  );
}

function CrisisCard() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
      <div style={{ width: '92%', background: `${C.glow2}10`, border: `1px solid ${C.glow2}55`, borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.55, marginBottom: 10 }}>{CRISIS_INTRO}</div>
        {CRISIS_RESOURCES.map((r) => (
          <a key={r.name} href={r.href} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', marginBottom: 6 }}>
            <div style={{ fontSize: 12.5, color: C.glow2, fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: C.textSoft }}>{r.detail}</div>
          </a>
        ))}
        <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 4 }}>If you’re in immediate danger, call your local emergency number.</div>
      </div>
    </div>
  );
}
