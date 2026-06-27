import React, { useState, useEffect } from 'react';
import { C } from '../theme.js';
import { Shell, Prog, Pills, Checks } from '../components/ui.jsx';
import { STEPS, ACTIVITIES, CUISINES, DIETARY } from '../data/onboarding.js';
import { ageTier } from '../lib/age.js';

const DRAFT_KEY = 'other_onboarding_v1';
const loadDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); } catch (e) { return {}; } };

export default function Onboarding({ onComplete }) {
  const draft0 = loadDraft();
  const [step, setStep] = useState(Math.min(draft0._step || 0, STEPS.length - 1));
  const [d, setD] = useState(draft0.data || {});
  const [txt, setTxt] = useState('');
  const [sel, setSel] = useState([]);
  const [anim, setAnim] = useState(false);
  const [dir, setDir] = useState('f');
  const [subs, setSubs] = useState({});
  const [fillSubs, setFillSubs] = useState(null);
  const sid = STEPS[step];

  useEffect(() => {
    const ex = d[sid];
    if (sid === 'activitySubs') { setSubs(ex || {}); setFillSubs(null); return; }
    if (Array.isArray(ex)) setSel(ex);
    else if (typeof ex === 'string') setTxt(ex);
    else { setSel([]); setTxt(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Persist a resumable draft so a refresh mid-onboarding doesn't lose progress.
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: d, _step: step })); } catch (e) { /* ignore */ } }, [d, step]);

  const go = (n, dr) => { setDir(dr); setAnim(true); setTimeout(() => { setStep(n); setAnim(false); }, 200); };
  const save = (val) => {
    const u = { ...d, [sid]: val };
    if (step < STEPS.length - 1) { setD(u); go(step + 1, 'f'); }
    else { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } onComplete(u); }
  };
  const back = () => step > 0 && go(step - 1, 'b');
  const tog = (v) => setSel((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const togSub = (a, v) => setSubs((p) => ({ ...p, [a]: (p[a] || []).includes(v) ? (p[a] || []).filter((x) => x !== v) : [...(p[a] || []), v] }));

  const sx = dir === 'f' ? '-14px' : '14px';
  const Back = () => (step > 0 ? <button onClick={back} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.textSoft, fontSize: 13, cursor: 'pointer', padding: '4px 0', marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>← Back</button> : null);
  const Q = ({ icon, q, sub }) => (
    <>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, marginBottom: sub ? 4 : 10, lineHeight: 1.3 }}>{q}</h2>
      {sub && <p style={{ color: C.textSoft, fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>{sub}</p>}
    </>
  );
  const inputStyle = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '13px 16px', fontSize: 15, color: C.text, outline: 'none' };
  const taStyle = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 13, color: C.text, outline: 'none', resize: 'none', lineHeight: 1.5 };

  const W = (ch) => (
    <Shell>
      <Prog s={step} t={STEPS.length} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 22px 22px', opacity: anim ? 0 : 1, transform: anim ? `translateX(${sx})` : 'none', transition: 'all 0.2s', overflowY: 'auto' }}>{ch}</div>
    </Shell>
  );

  if (sid === 'name') return W(<><Back /><Q icon="✦" q="What should we call you?" /><input autoFocus value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && txt.trim() && save(txt.trim())} placeholder="Your name..." style={inputStyle} /><button className="bp" disabled={!txt.trim()} onClick={() => save(txt.trim())} style={{ marginTop: 10, width: '100%' }}>Continue</button></>);

  if (sid === 'dob') return W(<><Back /><Q icon="☽" q="When were you born?" sub="We use this to match you with compatible companions." /><input type="date" value={txt} onChange={(e) => setTxt(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} /><button className="bp" disabled={!txt} onClick={() => save(txt)} style={{ marginTop: 10, width: '100%' }}>Reveal My Stars</button></>);

  if (sid === 'ageGroup') {
    const tier = ageTier(d.dob);
    if (tier === 'under13') return W(<><Back /><Q icon="🔒" q="You need to be at least 13" sub="Other isn't available to anyone under 13. If you entered the wrong birthday, go back and fix it — otherwise, please come back when you're older." /><button className="bg2" onClick={back} style={{ width: '100%' }}>← Change my birthday</button></>);
    if (tier === 'minor') return W(<><Back /><Q icon="🛡️" q="You're in friendship mode" sub="Because you're under 18, your companions stay strictly platonic and age-appropriate, with extra safety on at all times. This can't be changed while you're a minor." /><button className="bp" onClick={() => save('under18')} style={{ width: '100%' }}>Got it — continue</button></>);
    if (tier === 'adult') return W(<><Back /><Q icon="🔞" q="Confirm you're 18 or older" sub="Your birthday says you're an adult. Confirming unlocks companions with romantic and mature themes. Misrepresenting your age is a violation of our Terms." /><button className="bp" onClick={() => save('18+')} style={{ width: '100%', marginBottom: 10 }}>I confirm I'm 18 or older</button><p style={{ fontSize: 11, color: C.textDim, textAlign: 'center' }}>Not 18 yet? <button onClick={back} style={{ background: 'none', border: 'none', color: C.glow1, cursor: 'pointer', fontSize: 11, fontFamily: "'DM Sans',sans-serif", padding: 0 }}>Go back</button></p></>);
    // No usable birth date — fall back to a self-declared check.
    return W(<><Back /><Q icon="🔒" q="One quick check —" sub="Please confirm your age." /><Checks opts={[{ v: '18+', label: "I'm 18 or older", em: '✓' }, { v: 'under18', label: "I'm under 18", em: '✓' }]} sel={sel} onTog={(v) => save(v)} /></>);
  }

  if (sid === 'vibe') return W(<><Back /><Q icon="◈" q="What energy do you gravitate toward?" sub="Pick all that resonate." /><Checks opts={[{ v: 'calm', label: 'Calm & grounded', em: '🌿' }, { v: 'playful', label: 'Playful & witty', em: '⚡' }, { v: 'deep', label: 'Deep & introspective', em: '🌙' }, { v: 'warm', label: 'Warm & nurturing', em: '☀️' }, { v: 'chaotic', label: 'Chaotic & spontaneous', em: '🔥' }]} sel={sel} onTog={tog} /><button className="bp" onClick={() => save(sel)} style={{ marginTop: 12, width: '100%' }}>{sel.length ? `Continue (${sel.length})` : 'Skip'}</button></>);

  if (sid === 'communication') return W(<><Back /><Q icon="◆" q="How do you like to communicate?" sub="Select all that fit." /><Checks opts={[{ v: 'direct', label: 'Direct & honest', em: '🎯' }, { v: 'expressive', label: 'Expressive & emotional', em: '💕' }, { v: 'chill', label: 'Chill & easygoing', em: '😎' }, { v: 'thoughtful', label: 'Thoughtful & considered', em: '📝' }]} sel={sel} onTog={tog} /><button className="bp" onClick={() => save(sel)} style={{ marginTop: 12, width: '100%' }}>{sel.length ? `Continue (${sel.length})` : 'Skip'}</button></>);

  if (sid === 'occupation') return W(<><Back /><Q icon="💼" q="What do you do?" sub="Helps your companions understand your world." /><input autoFocus value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && txt.trim() && save(txt.trim())} placeholder="Designer, student, nurse..." style={inputStyle} /><button className="bp" disabled={!txt.trim()} onClick={() => save(txt.trim())} style={{ marginTop: 10, width: '100%' }}>Continue</button></>);

  if (sid === 'relationship') return W(<><Back /><Q icon="♡" q="Relationship situation?" sub="Pick all that apply." /><Checks opts={[{ v: 'single', label: 'Single', em: '🦋' }, { v: 'dating', label: 'Dating', em: '💫' }, { v: 'partnered', label: 'In a relationship', em: '💕' }, { v: 'married', label: 'Married', em: '💍' }, { v: 'complicated', label: "It's complicated", em: '🌀' }, { v: 'rather_not', label: 'Rather not say', em: '🤐' }]} sel={sel} onTog={tog} /><button className="bp" onClick={() => save(sel)} style={{ marginTop: 12, width: '100%' }}>{sel.length ? `Continue (${sel.length})` : 'Skip'}</button></>);

  if (sid === 'loveLang') return W(<><Back /><Q icon="❤️" q="What's your love language?" sub="Pick all that speak to you." /><Checks opts={[{ v: 'words', label: 'Words of affirmation', em: '💬' }, { v: 'quality', label: 'Quality time', em: '⏰' }, { v: 'acts', label: 'Acts of service', em: '🤝' }, { v: 'touch', label: 'Physical touch', em: '🤗' }, { v: 'gifts', label: 'Receiving gifts', em: '🎁' }]} sel={sel} onTog={tog} /><button className="bp" onClick={() => save(sel)} style={{ marginTop: 12, width: '100%' }}>{sel.length ? `Continue (${sel.length})` : 'Skip'}</button></>);

  if (sid === 'needs') return W(<><Back /><Q icon="✧" q="What do you wish you had more of?" sub="Select all that resonate." /><Checks opts={[{ v: 'encouragement', label: 'Someone who cheers me on', em: '🙌' }, { v: 'honesty', label: 'Honest, real talk', em: '💎' }, { v: 'fun', label: 'More laughter & fun', em: '😂' }, { v: 'perspective', label: 'Fresh perspectives', em: '🔮' }]} sel={sel} onTog={tog} /><button className="bp" onClick={() => save(sel)} style={{ marginTop: 12, width: '100%' }}>{sel.length ? `Continue (${sel.length})` : 'Skip'}</button></>);

  if (sid === 'socialId') return W(<><Back /><Q icon="❖" q="How would your closest friend describe you?" sub="Pick all that fit." /><Checks opts={[{ v: 'listener', label: 'The thoughtful listener', em: '👂' }, { v: 'entertainer', label: 'Life of the party', em: '🎭' }, { v: 'advisor', label: 'Go-to for advice', em: '🧭' }, { v: 'dreamer', label: 'Creative dreamer', em: '💭' }]} sel={sel} onTog={tog} /><button className="bp" onClick={() => save(sel)} style={{ marginTop: 12, width: '100%' }}>{sel.length ? `Continue (${sel.length})` : 'Skip'}</button></>);

  if (sid === 'activities') return W(<><Back /><Q icon="🎯" q="What do you like to do?" sub="Pick all your activities and hobbies." /><div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 12 }}><Checks opts={ACTIVITIES.map((a) => ({ v: a.id, label: a.label, em: a.em }))} sel={sel} onTog={tog} /></div><button className="bp" onClick={() => save(sel)} style={{ width: '100%' }}>{sel.length ? `Continue (${sel.length})` : 'Skip'}</button></>);

  if (sid === 'activitySubs') {
    const picked = (d.activities || []).map((id) => ACTIVITIES.find((a) => a.id === id)).filter(Boolean);
    if (fillSubs === null) return W(<><Back /><Q icon="🎯" q="Want to get specific?" sub="Drill down into your interests, or let your companions learn later." /><button className="bp" onClick={() => setFillSubs(true)} style={{ width: '100%', marginBottom: 8 }}>Fill out now</button><button className="bg2" onClick={() => save({})} style={{ width: '100%' }}>I'll tell my companions later</button></>);
    return W(<><Back /><Q icon="🎯" q="Drill down into your interests" sub="Check off what you're into within each category." /><div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>{picked.map((act) => <div key={act.id} style={{ marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 600, color: C.glow1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><span>{act.em}</span>{act.label}</div><Pills opts={act.subs} sel={subs[act.id] || []} onTog={(v) => togSub(act.id, v)} /></div>)}</div><button className="bp" onClick={() => save(subs)} style={{ marginTop: 10, width: '100%' }}>Continue</button></>);
  }

  if (sid === 'cuisineLove') return W(<><Back /><Q icon="🍽️" q="Cuisines you love?" sub="Pick all your favorites." /><div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 12 }}><Pills opts={CUISINES} sel={sel} onTog={tog} /></div><button className="bp" onClick={() => save(sel)} style={{ width: '100%' }}>{sel.length ? `Continue (${sel.length})` : 'Skip'}</button></>);

  if (sid === 'cuisineDislike') return W(<><Back /><Q icon="🚫" q="Cuisines you don't like?" sub="So companions know what NOT to suggest." /><div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 12 }}><Pills opts={CUISINES} sel={sel} onTog={tog} /></div><div style={{ display: 'flex', gap: 8 }}><button className="bg2" onClick={() => save([])} style={{ flex: 1 }}>None</button><button className="bp" onClick={() => save(sel)} style={{ flex: 1 }}>Continue{sel.length ? ` (${sel.length})` : ''}</button></div></>);

  if (sid === 'dietary') return W(<><Back /><Q icon="🥗" q="Dietary preferences?" sub="Select all that apply." /><Checks opts={DIETARY.map((x) => ({ v: x, label: x }))} sel={sel} onTog={tog} /><button className="bp" onClick={() => save(sel)} style={{ marginTop: 12, width: '100%' }}>{sel.length ? 'Continue' : 'Skip'}</button></>);

  if (sid === 'favMovies') return W(<><Back /><Q icon="🎬" q="Favorite movies or shows?" sub="Name a few." /><textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={3} placeholder="The Office, Spirited Away, Breaking Bad..." style={taStyle} /><button className="bp" onClick={() => save(txt.trim() || 'not specified')} style={{ marginTop: 10, width: '100%' }}>{txt.trim() ? 'Continue' : 'Skip'}</button></>);

  if (sid === 'favMusic') return W(<><Back /><Q icon="🎵" q="Favorite music artists?" sub="Who's on repeat?" /><textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={3} placeholder="SZA, Tyler the Creator, BTS..." style={taStyle} /><button className="bp" onClick={() => save(txt.trim() || 'not specified')} style={{ marginTop: 10, width: '100%' }}>{txt.trim() ? 'Continue' : 'Skip'}</button></>);

  return W(<div />);
}
