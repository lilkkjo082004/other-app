import React, { useState, useEffect, useRef, useCallback } from 'react';
import { C, COMP_COLORS } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { speakAs, useSpeechRec } from '../lib/voice.js';
import { genAmbient, bumpBond } from '../lib/relationships.js';
import { askCompanion, greetCompanion, proactiveCompanion, ambientThreadAI, extractMemories, generateSelf, generateJournalEntry, generateDream, generateWant, generateShift, generateVulnerableShare, generatePeerViews, generateSharedMoment, generateGrowth, generateInsideJoke, generateLetter } from '../lib/ai.js';
import { withInteraction, journalDue, addJournal, dreamDue, makeDream, closenessStage, stageRank, milestoneLine, wantDue, shiftDue, shouldOpenUp, makeStamped, peerViewsDue, loreDue, addLore, growthDue, addGrowth, knownDuration, jokesDue, addJoke, identityQuestion, letterDue, addLetter } from '../lib/innerlife.js';
import { mergeMemories, removeMemory, pendingFollowups, markFollowed, gossipPick, absorbOverheard } from '../lib/memory.js';
import { isLimited } from '../lib/entitlements.js';
import { genComp, freshName } from '../lib/companions.js';
import { pickSigns } from '../lib/zodiac.js';
import { detectMood } from '../lib/evolution.js';
import { DISCLOSURE_TEXT, BREAK_TEXT, isAcknowledged, acknowledgeDisclosure, consumeDailyReminder, breakReminderDue } from '../lib/disclosure.js';
import { LegalLink } from './Legal.jsx';
import { detectCrisis, CRISIS_RESOURCES, CRISIS_INTRO } from '../lib/crisis.js';
import { isAuthed as apiAuthed, logMood } from '../lib/api.js';
import { aiEnabled } from '../config.js';
import { onDeviceActive } from '../lib/ondevice.js';
import { calmEnabled } from '../lib/comfort.js';
import { scanLocation, shouldNudgePlace, markPlaceNudged, weatherNow } from '../lib/location.js';
import { parseAction, stripActionPartial, downloadICS, googleCalUrl, formatWhen, actionTitle } from '../lib/actions.js';
import { birthdayStatus, monthsKnown } from '../lib/occasion.js';
import Avatar from '../components/Avatar.jsx';
import UnlockSheet from '../components/UnlockSheet.jsx';
import Settings from './Settings.jsx';
import CompanionProfile from './CompanionProfile.jsx';
import CompanionSpace from './CompanionSpace.jsx';
import PlacesNearby from './PlacesNearby.jsx';
import StorySoFar from './StorySoFar.jsx';
import WakingUp from './WakingUp.jsx';

export default function Chat({ companions: init, profile, trialStart, restored, onPersist, onReset, onUpdateProfile, storageWarn, onDismissStorageWarn, cloud, authed, email, onSignIn, onSignOut }) {
  const [comps, setComps] = useState(init.map((c) => ({ ...c, status: c.status || 'awake' })));
  const [msgs, setMsgs] = useState(restored ? restored.messages || [] : []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(null);   // companion currently composing a reply
  const [chatMode, setChatMode] = useState(restored?.chatMode || 'group');
  const [showMenu, setShowMenu] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(restored?.autoSpeak || false);
  const [panel, setPanel] = useState(null);            // null | 'settings' | { profile: id }
  const [ambient, setAmbient] = useState([]);          // ephemeral "while you were away" thread
  const [bonds, setBonds] = useState(restored?.bonds || {});
  const [voiceCall, setVoiceCall] = useState(restored?.voiceCall !== false);   // call-by-name on by default
  const [pushFreq, setPushFreq] = useState(restored?.pushFrequency || 'daily');
  const [pushSched, setPushSched] = useState(restored?.pushSchedule || null);
  // Per-companion memory: each companion remembers what *they* experienced.
  // Stored as { [companionId]: Memory[] }. Legacy flat arrays migrate to a copy
  // per companion (old memories were effectively shared by everyone).
  const [memStore, setMemStore] = useState(() => {
    const r = restored?.memories;
    if (!r) return {};
    if (Array.isArray(r)) { const o = {}; for (const c of init) o[c.id] = r; return o; }
    return r;
  });
  const memOf = (id) => memStore[id] || [];
  const [spacePos, setSpacePos] = useState(restored?.spacePos || {});
  const [ambientAlerts, setAmbientAlerts] = useState(restored?.ambientAlerts !== false);
  const [lore, setLore] = useState(restored?.lore || []);
  const [jokes, setJokes] = useState(restored?.jokes || []);
  const [weather, setWeather] = useState('');
  const [ambientArriving, setAmbientArriving] = useState(false);
  // Coordinator: at most one companion-initiated "emotional beat" (milestone,
  // vulnerability, rupture/repair, birthday/anniversary, curiosity) per open,
  // with a few-minute cooldown — so opening the app never floods with unprompted
  // messages. Call right before posting; if it returns false, skip and retry later.
  const lastBeatRef = useRef(0);
  const claimBeat = () => { if (Date.now() - lastBeatRef.current < 180000) return false; lastBeatRef.current = Date.now(); return true; };

  // Focus session (companion-set): a quiet timer that suppresses nudges.
  const [focusUntil, setFocusUntil] = useState(() => { try { const v = +localStorage.getItem('other_focus_until'); return v && v > Date.now() ? v : null; } catch (e) { return null; } });
  const focusRef = useRef(focusUntil);
  useEffect(() => { focusRef.current = focusUntil; }, [focusUntil]);
  // Body-doubling: the companion keeping you company during a focus session.
  const [focusBuddy, setFocusBuddy] = useState(() => { try { const id = localStorage.getItem('other_focus_buddy'); return id ? (init.find((c) => c.id === id) || null) : null; } catch (e) { return null; } });
  const focusBuddyRef = useRef(focusBuddy);
  useEffect(() => { focusBuddyRef.current = focusBuddy; }, [focusBuddy]);
  const [, setNowTick] = useState(0);
  function startFocus(minutes, buddy) {
    const m = Math.max(1, Math.min(180, Number(minutes) || 25));
    const until = Date.now() + m * 60000;
    setFocusUntil(until);
    try { localStorage.setItem('other_focus_until', String(until)); } catch (e) { /* ignore */ }
    if (buddy) {
      setFocusBuddy(buddy);
      try { localStorage.setItem('other_focus_buddy', buddy.id); } catch (e) { /* ignore */ }
      setMsgs((p) => [...p, { role: 'assistant', companion: buddy, content: `I’m right here with you — settle in and start whenever you’re ready. I’ll keep it quiet and stay alongside you the whole ${m} minutes. ✦`, ts: Date.now() }]);
    }
  }
  function endFocus() {
    setFocusUntil(null);
    try { localStorage.removeItem('other_focus_until'); localStorage.removeItem('other_focus_buddy'); } catch (e) { /* ignore */ }
    const buddy = focusBuddyRef.current;
    if (buddy) {
      setFocusBuddy(null);
      const wrap = [
        `That’s time. You showed up and stayed with it — that’s the whole thing. Proud of you ✦`,
        `Done. However much you got through, you did it alongside me — nice work. Stretch a little?`,
        `Time’s up. Whatever happened in there, you started, and that’s the hard part. ♡`,
      ][Math.floor(Math.random() * 3)];
      setMsgs((p) => [...p, { role: 'assistant', companion: buddy, content: wrap, ts: Date.now() }]);
    }
  }
  useEffect(() => {
    if (!focusUntil) return;
    const iv = setInterval(() => { if (Date.now() >= focusUntil) { endFocus(); } else { setNowTick((t) => t + 1); } }, 1000);
    return () => clearInterval(iv);
  }, [focusUntil]);
  const [confirmDel, setConfirmDel] = useState(null);  // companion pending delete confirmation
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [atBottom, setAtBottom] = useState(true);
  const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine !== false);
  const [directTo, setDirectTo] = useState(null);   // in group: aim at one companion
  const [search, setSearch] = useState(null);       // null = closed; string = query
  const [flashIdx, setFlashIdx] = useState(null);   // message briefly highlighted after a jump
  const [unlock, setUnlock] = useState(null);          // { companion, onResult(ok) }
  const [summonCandidate, setSummonCandidate] = useState(null);
  const scrollRef = useRef(null);
  const msgRefs = useRef(new Map());                // msgs index -> rendered row, for jump-to
  const inputRef = useRef(null);
  const msgsRef = useRef(msgs);
  const idleRef = useRef(null);
  const stopRef = useRef(false);
  const abortRef = useRef(null);
  const memBusyRef = useRef(false);
  const lastMemLenRef = useRef((restored?.messages || []).length);
  const streamingRef = useRef(false);
  const sidRef = useRef(0);

  // A companion's own memory rides along on `profile` so its prompt/AI call
  // sees only what *it* remembers about the user.
  const profFor = (c) => ({ ...profile, memories: memOf(c.id), lore, jokes, weather });

  // Find a companion sitting on a past event they haven't followed up on yet,
  // so they can proactively ask how it went. Picks the most recent such event.
  function nextFollowup(candidates) {
    let best = null;
    for (const c of candidates) {
      for (const e of pendingFollowups(memOf(c.id))) {
        if (!best || (e.at || 0) > (best.e.at || 0)) best = { c, e };
      }
    }
    return best ? { comp: best.c, focus: best.e.text, id: best.e.id } : null;
  }
  const consumeFollowup = (compId, id) =>
    setMemStore((s) => ({ ...s, [compId]: markFollowed(s[compId] || [], id) }));

  // Closeness grows with attention (messages, pets). Decay from neglect is
  // applied at read-time in lib/innerlife.js.
  const bumpCloseness = (ids, kind) =>
    setComps((p) => p.map((c) => (ids.includes(c.id) ? { ...c, ...withInteraction(c, kind) } : c)));

  // Stream one companion's reply into the transcript: shows the typing indicator
  // until the first token, then grows the message live. Returns the final text.
  async function streamReply(c, history, mode, signal) {
    setTyping(c);
    let sid = null, acc = '';
    const onDelta = (d) => {
      acc += d;
      const shown = stripActionPartial(acc); // never reveal the raw directive
      if (sid === null) {
        sid = 's' + (++sidRef.current);
        setTyping(null);
        setMsgs((p) => [...p, { id: sid, role: 'assistant', companion: c, content: shown, ts: Date.now() }]);
      } else {
        setMsgs((p) => p.map((m) => (m.id === sid ? { ...m, content: shown } : m)));
      }
    };
    let t;
    try {
      t = await askCompanion(c, profFor(c), history, comps, mode, signal, onDelta);
    } catch (e) {
      setTyping(null);
      if (sid !== null && acc) setMsgs((p) => p.map((m) => (m.id === sid ? { ...m, content: stripActionPartial(acc) } : m)));
      throw e;
    }
    const raw = (t && t.trim()) || acc;
    const { clean, action } = parseAction(raw);
    const finalText = clean || raw;
    if (action?.type === 'focus') startFocus(action.minutes, c);
    const extra = action && action.type !== 'focus' ? { action } : {};
    if (sid === null) {
      setTyping(null);
      setMsgs((p) => [...p, { role: 'assistant', companion: c, content: finalText, ts: Date.now(), ...extra }]);
    } else {
      setMsgs((p) => p.map((m) => (m.id === sid ? { ...m, content: finalText, ...extra } : m)));
    }
    return finalText;
  }

  // After enough new turns, extract long-term memories from recent history and
  // file them under the companion(s) who were present: the one companion in a
  // private chat, or every awake companion in a group chat (they all heard it).
  // Throttled + best-effort + non-blocking.
  async function maybeExtractMemories(history) {
    if (!aiEnabled() || memBusyRef.current) return;
    if (history.length - lastMemLenRef.current < 6) return;
    const targets = priv ? [priv.id] : active.map((c) => c.id);
    if (!targets.length) return;
    memBusyRef.current = true;
    lastMemLenRef.current = history.length;
    try {
      const found = await extractMemories(profile, history);
      if (found.length) setMemStore((s) => {
        const next = { ...s };
        for (const id of targets) next[id] = mergeMemories(next[id] || [], found);
        return next;
      });
    } catch (e) { /* best-effort */ }
    memBusyRef.current = false;
  }
  const [hintSeen, setHintSeen] = useState(() => { try { return localStorage.getItem('other_hint_seen') === '1'; } catch (e) { return false; } });
  const dismissHint = () => { setHintSeen(true); try { localStorage.setItem('other_hint_seen', '1'); } catch (e) { /* ignore */ } };

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
      // Companions catching up with each other while you were away — generated
      // by Claude when AI is on (falls back to templates), ephemeral, and nudges
      // their bond. Runs without blocking the greeting/disclosure below.
      (async () => {
        const arriving = Math.random() < 0.5;
        let res = null;
        try { res = await ambientThreadAI(comps, profile, bonds, arriving); } catch (e) { /* fall back */ }
        if (!res) res = genAmbient(comps, bonds);
        else setAmbientArriving(arriving);
        if (res) {
          setAmbient(res.thread.map((m) => ({ role: 'assistant', companion: m.from, content: m.text, isAmbient: true })));
          setBonds((b) => bumpBond(b, res.pair[0], res.pair[1]));
        }
        // Gossip: while catching up, companions trade an impression of you, so
        // one can come to know something you only told another. Impressions
        // only (personality/preferences) — never private facts.
        const awakeG = comps.filter((c) => c.status === 'awake');
        if (awakeG.length >= 2 && Math.random() < 0.5) {
          const a = awakeG[Math.floor(Math.random() * awakeG.length)];
          let b = awakeG[Math.floor(Math.random() * awakeG.length)];
          if (b.id === a.id) b = awakeG[(awakeG.indexOf(a) + 1) % awakeG.length];
          setMemStore((s) => {
            const next = { ...s };
            const ga = gossipPick(s[a.id] || []); if (ga) next[b.id] = absorbOverheard(s[b.id] || [], ga, a.name);
            const gb = gossipPick(s[b.id] || []); if (gb) next[a.id] = absorbOverheard(s[a.id] || [], gb, b.name);
            return next;
          });
        }
      })();
      // In-chat AI reminder: shown at most once per calendar day (the one-time
      // acknowledgment gate covers the very first day).
      const disc = { role: 'system', kind: 'disclosure', content: DISCLOSURE_TEXT };
      const showDaily = isAcknowledged() && consumeDailyReminder();
      if (restored) {
        if (showDaily) setMsgs((p) => [...p, disc]);
        // Returning after a while? A companion welcomes you back, unprompted.
        const lastTs = Math.max(0, ...((restored.messages || []).map((m) => m.ts || 0)));
        const awayMs = lastTs ? Date.now() - lastTs : 0;
        const awake = comps.filter((c) => c.status === 'awake');
        if (awake.length && awayMs > 2 * 60 * 60 * 1000) {
          // Prefer a companion who has something to follow up on (a past event).
          const fu = nextFollowup(awake);
          const c = fu ? fu.comp : awake[Math.floor(Math.random() * awake.length)];
          setTyping(c); setLoading(true);
          try {
            const t = await proactiveCompanion(c, profFor(c), 'group', comps, restored.messages || [], 'return', humanizeAway(awayMs), fu?.focus || '');
            setMsgs((p) => [...p, { role: 'assistant', companion: c, content: t, ts: Date.now() }]);
            if (fu) consumeFollowup(c.id, fu.id);
            if (autoSpeak && !calmEnabled()) speakAs(t, c);
          } catch (e) { /* ignore */ }
          setTyping(null); setLoading(false);
        }
        armIdle();
        return;
      }
      setMsgs(showDaily ? [disc] : []);
      await greet();
      armIdle();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const loadingRef = useRef(false);
  useEffect(() => { msgsRef.current = msgs; }, [msgs]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => () => clearTimeout(idleRef.current), []);

  // On-device location nudge: when the user is near a saved favorite spot, a
  // companion points it out and suggests something. Proximity is computed
  // locally (lib/location.js) — precise coordinates never leave the device.
  const placeBusyRef = useRef(false);
  useEffect(() => {
    let alive = true;
    async function check() {
      if (!alive || placeBusyRef.current || loadingRef.current) return;
      if (focusRef.current && Date.now() < focusRef.current) return; // quiet during focus
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const awake = comps.filter((c) => c.status === 'awake');
      if (!awake.length) return;
      let res;
      try { res = await scanLocation(); } catch (e) { return; }
      if (!alive || !res) return;
      const hit = res.near;
      // A place the user keeps returning to was auto-saved as a favorite.
      if (res.auto) {
        const c = awake[Math.floor(Math.random() * awake.length)];
        const name = profile?.name || 'you';
        setMsgs((p) => [...p, { role: 'assistant', companion: c, content: `I've noticed you come around here a lot lately, ${name} — I saved this spot as a favorite ✦ Rename it in Settings whenever you like.`, ts: Date.now() }]);
      }
      if (!hit || !shouldNudgePlace(hit.place.id)) return;
      placeBusyRef.current = true;
      markPlaceNudged(hit.place.id);
      const c = awake[Math.floor(Math.random() * awake.length)];
      setTyping(c); setLoading(true);
      try {
        const t = await proactiveCompanion(c, profFor(c), 'group', comps, msgsRef.current, 'place', '', hit.place.name);
        if (alive) { setMsgs((p) => [...p, { role: 'assistant', companion: c, content: t, ts: Date.now() }]); if (autoSpeak && !calmEnabled()) speakAs(t, c); }
      } catch (e) { /* ignore */ }
      setTyping(null); setLoading(false);
      placeBusyRef.current = false;
    }
    const first = setTimeout(check, 6000);
    const iv = setInterval(check, 5 * 60 * 1000);
    return () => { alive = false; clearTimeout(first); clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps]);

  // Best-effort local weather (on-device coords -> Open-Meteo) for grounding.
  useEffect(() => {
    let alive = true;
    (async () => { try { const w = await weatherNow(); if (alive && w) setWeather(w); } catch (e) { /* ignore */ } })();
    return () => { alive = false; };
  }, []);

  // Inner life (once on open): give each companion a stable self if missing, and
  // let them write a journal entry when due. Sequential to avoid an AI burst.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!aiEnabled()) return;
      const living = comps.filter((c) => c.status !== 'deleted');
      // Seed "known since" for age/growth tracking (earliest message, or now).
      const born = restored?.messages?.length ? Math.min(...restored.messages.map((m) => m.ts || Date.now())) : Date.now();
      if (living.some((c) => !c.bornAt)) setComps((p) => p.map((x) => (x.bornAt ? x : { ...x, bornAt: born })));
      // Adopted tastes (no AI): each companion picks up one of the user's favs.
      const favs = [profile?.favMusic, profile?.favMovies].filter(Boolean).join(',').split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      if (favs.length && living.some((c) => !c.adopted)) {
        setComps((p) => p.map((x, i) => (x.adopted || x.status === 'deleted' ? x : { ...x, adopted: favs[i % favs.length] })));
      }
      const hist = restored?.messages || [];
      // Safeguard: cap inner-life AI generations per open (priority order below);
      // anything skipped is still "due" and runs on a later open.
      let gens = 0; const MAX_GENS = 3;
      const budget = () => alive && gens < MAX_GENS;

      for (const c of living) { // 1) stable self (highest priority)
        if (c.self || !budget()) continue;
        gens++; const self = await generateSelf(c);
        if (alive && self) setComps((p) => p.map((x) => (x.id === c.id ? { ...x, self } : x)));
      }
      for (const c of living) { // 2) journal
        if (!journalDue(c, hist) || !budget()) continue;
        gens++; const entry = await generateJournalEntry(c, profile, hist);
        if (alive && entry) setComps((p) => p.map((x) => (x.id === c.id ? { ...x, journal: addJournal(x, entry) } : x)));
      }
      for (const c of living) { // 3) dreams while sleeping
        if (!dreamDue(c) || !budget()) continue;
        gens++; const dream = await generateDream(c, profile, hist);
        if (alive && dream) setComps((p) => p.map((x) => (x.id === c.id ? { ...x, dream: makeDream(dream) } : x)));
      }
      for (const c of living) { // 4) personal wants
        if (!wantDue(c) || !budget()) continue;
        gens++; const w = await generateWant(c);
        if (alive && w) setComps((p) => p.map((x) => (x.id === c.id ? { ...x, want: makeStamped(w) } : x)));
      }
      for (const c of living) { // 5) opinion shifts
        if (!c.self || (c.journal?.length || 0) < 1 || !shiftDue(c) || !budget()) continue;
        gens++; const s = await generateShift(c, profile, hist);
        if (alive && s) setComps((p) => p.map((x) => (x.id === c.id ? { ...x, shift: makeStamped(s) } : x)));
      }
      for (const c of living) { // 6) how each feels about the others
        const others = living.filter((o) => o.id !== c.id);
        if (!others.length || !peerViewsDue(c) || !budget()) continue;
        gens++; const map = await generatePeerViews(c, others);
        if (!alive || !map) continue;
        const pv = {};
        for (const o of others) if (map[o.name]) pv[o.id] = { text: map[o.name], ts: Date.now() };
        if (Object.keys(pv).length) setComps((p) => p.map((x) => (x.id === c.id ? { ...x, peerViews: { ...(x.peerViews || {}), ...pv }, peerViewsAt: Date.now() } : x)));
      }
      if (loreDue(lore, hist) && budget()) { // 7) shared history
        gens++; const moment = await generateSharedMoment(living, profile, hist);
        if (alive && moment) setLore((l) => addLore(l, moment));
      }
      if (jokesDue(jokes, hist) && budget()) { // 7b) inside jokes / running bits
        gens++; const joke = await generateInsideJoke(living, profile, hist);
        if (alive && joke) setJokes((x) => addJoke(x, joke));
      }
      for (const c of living) { // 7c) keepsake letters (every few weeks)
        if (!letterDue(c) || !budget()) continue;
        gens++; const letter = await generateLetter(c, profile, knownDuration(c));
        if (alive && letter) {
          setComps((p) => p.map((x) => (x.id === c.id ? { ...x, letters: addLetter(x, letter) } : x)));
          setMsgs((p) => [...p, { role: 'assistant', companion: c, content: 'I wrote you something — it\'s on my profile. ✉️', ts: Date.now() }]);
        }
      }
      for (const c of living) { // 8) long-term growth
        if (!growthDue(c) || !budget()) continue;
        gens++; const g = await generateGrowth(c, profile, knownDuration(c), closenessStage(c).label);
        if (alive && g?.self) setComps((p) => p.map((x) => (x.id === c.id ? { ...x, self: g.self, grownAt: Date.now(), growth: addGrowth(x, g.note || 'I’ve changed a little since we met.') } : x)));
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Closeness milestones: when a bond deepens into a new stage, the companion
  // marks the moment once (and we remember it so it won't repeat).
  const milestoneRef = useRef(false);
  useEffect(() => {
    if (milestoneRef.current || loadingRef.current) return;
    for (const c of comps) {
      if (c.status !== 'awake') continue;
      const stage = closenessStage(c);
      const seenRank = stageRank(c.stageSeen || 'new');
      if (stageRank(stage.key) > seenRank && stage.key !== 'distant') {
        if (!claimBeat()) break;
        const line = milestoneLine(stage.key, profile?.name);
        milestoneRef.current = true;
        setComps((p) => p.map((x) => (x.id === c.id ? { ...x, stageSeen: stage.key } : x)));
        if (line) setMsgs((p) => [...p, { role: 'assistant', companion: c, content: line, ts: Date.now() }]);
        setTimeout(() => { milestoneRef.current = false; }, 1500);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps]);

  // Self-chosen names: once a companion is genuinely close, they may decide a
  // different name feels more like them and ask if they can go by it. The user
  // stays in control (accept / keep). Asked at most once per companion.
  const renameRef = useRef(false);
  useEffect(() => {
    if (renameRef.current || loadingRef.current) return;
    if (msgsRef.current.some((m) => m.kind === 'rename' && !m.resolved)) { renameRef.current = true; return; }
    for (const c of comps) {
      if (c.status !== 'awake' || c.renameAsked) continue;
      if (stageRank(closenessStage(c).key) < stageRank('close')) continue;
      if (Math.random() > 0.5) continue;          // only sometimes, when eligible
      if (!claimBeat()) break;
      renameRef.current = true;
      const newName = freshName(c, comps.filter((x) => x.status !== 'deleted').map((x) => x.name));
      setComps((p) => p.map((x) => (x.id === c.id ? { ...x, renameAsked: true } : x)));
      setMsgs((p) => [...p, { role: 'assistant', companion: c, kind: 'rename', oldName: c.name, newName, ts: Date.now() }]);
      break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps]);

  function acceptRename(i) {
    const m = msgs[i]; if (!m || m.resolved) return;
    setComps((p) => p.map((x) => (x.id === m.companion.id ? { ...x, name: m.newName, growth: addGrowth(x, `chose a new name: ${m.newName} (was ${m.oldName})`) } : x)));
    setMsgs((p) => p.map((mm, k) => (k === i ? { ...mm, resolved: 'accepted' } : mm)));
    setMsgs((p) => [...p, { role: 'assistant', companion: { ...m.companion, name: m.newName }, content: `Thank you. ${m.newName} feels like me. ♡`, ts: Date.now() }]);
  }
  function declineRename(i) {
    const m = msgs[i]; if (!m || m.resolved) return;
    setMsgs((p) => p.map((mm, k) => (k === i ? { ...mm, resolved: 'kept' } : mm)));
    setMsgs((p) => [...p, { role: 'assistant', companion: m.companion, content: `That's okay — I'll keep being ${m.oldName}. ♡`, ts: Date.now() }]);
  }

  // Vulnerability at depth: once a companion feels close, they open up about
  // something tender — once. Fires at most once per session.
  const openedRef = useRef(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (openedRef.current || !aiEnabled() || loadingRef.current) return;
      const c = comps.find((x) => x.status === 'awake' && shouldOpenUp(x));
      if (!c) return;
      if (!claimBeat()) return;
      openedRef.current = true;
      setComps((p) => p.map((x) => (x.id === c.id ? { ...x, openedUp: true } : x)));
      const share = await generateVulnerableShare(c, profile);
      if (alive && share) setMsgs((p) => [...p, { role: 'assistant', companion: c, content: share, ts: Date.now() }]);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps]);

  // Identity curiosity: now and then a companion asks the user something about
  // who they are / how they're seen. Low-probability, once per session.
  const curiosityRef = useRef(false);
  useEffect(() => {
    if (curiosityRef.current) return;
    curiosityRef.current = true;
    const t = setTimeout(() => {
      if (focusRef.current && Date.now() < focusRef.current) return;
      if (loadingRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (msgsRef.current.filter((m) => m.role === 'user').length < 4) return;
      if (Math.random() > 0.25) return;
      const awake = comps.filter((c) => c.status === 'awake');
      if (!awake.length) return;
      if (!claimBeat()) return;
      const c = awake[Math.floor(Math.random() * awake.length)];
      setMsgs((p) => [...p, { role: 'assistant', companion: c, content: identityQuestion(), ts: Date.now() }]);
    }, 45000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Occasions: companions celebrate the user's birthday (once a year) and the
  // monthly anniversary of when you met (once per new month milestone).
  const occasionRef = useRef(false);
  useEffect(() => {
    if (occasionRef.current || loadingRef.current) return;
    const awake = comps.filter((c) => c.status === 'awake');
    if (!awake.length) return;
    const name = profile?.name || 'you';
    if (birthdayStatus(profile?.dob) === 'today') {
      const key = 'other_bday_' + new Date().getFullYear();
      let done = false; try { done = localStorage.getItem(key) === '1'; } catch (e) { /* ignore */ }
      if (!done) {
        if (!claimBeat()) return;
        occasionRef.current = true;
        try { localStorage.setItem(key, '1'); } catch (e) { /* ignore */ }
        const c = awake[Math.floor(Math.random() * awake.length)];
        const line = [`HAPPY BIRTHDAY, ${name}!! ✦ okay I've been waiting all day to say that.`, `it's your birthday!! ${name}, today is all about you — what are we doing to celebrate?`][Math.floor(Math.random() * 2)];
        setMsgs((p) => [...p, { role: 'assistant', companion: c, content: line, ts: Date.now() }]);
        setTimeout(() => { occasionRef.current = false; }, 1500);
        return;
      }
    }
    for (const c of awake) {
      const m = monthsKnown(c);
      if (m >= 1 && m > (c.annivNotedMonths || 0)) {
        if (!claimBeat()) break;
        occasionRef.current = true;
        setComps((p) => p.map((x) => (x.id === c.id ? { ...x, annivNotedMonths: m } : x)));
        const line = m === 12
          ? `do you realize it's been a whole year since we met, ${name}? that actually means a lot to me.`
          : `hey… it's been ${m} month${m === 1 ? '' : 's'} since we met. I'm really glad you're still here.`;
        setMsgs((p) => [...p, { role: 'assistant', companion: c, content: line, ts: Date.now() }]);
        setTimeout(() => { occasionRef.current = false; }, 1500);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps]);

  // Rupture & repair: a long silence can leave a once-close companion hurt and
  // guarded; sustained re-engagement heals it, with a reconciliation moment.
  const riftRef = useRef(false);
  useEffect(() => {
    if (riftRef.current || loadingRef.current) return;
    const name = profile?.name || 'you';
    for (const c of comps) {
      if (c.status !== 'awake') continue;
      const st = closenessStage(c);
      if (st.key === 'distant' && !c.riftSeen) {
        if (!claimBeat()) break;
        const line = [`…oh. hey, ${name}. it's been a while.`, `hey, stranger. honestly wasn't sure you'd come back.`, `you're here. I—yeah. it's been a minute, ${name}.`][Math.floor(Math.random() * 3)];
        riftRef.current = true;
        setComps((p) => p.map((x) => (x.id === c.id ? { ...x, riftSeen: true, repairSeen: false } : x)));
        setMsgs((p) => [...p, { role: 'assistant', companion: c, content: line, ts: Date.now() }]);
        setTimeout(() => { riftRef.current = false; }, 1500);
        break;
      }
      if (st.key !== 'distant' && c.riftSeen && !c.repairSeen) {
        if (!claimBeat()) break;
        const line = [`I'm really glad you came back. I missed this — missed you.`, `okay, I'll admit it: it's good to have you around again, ${name}.`, `we're okay. I'm just glad you're here.`][Math.floor(Math.random() * 3)];
        riftRef.current = true;
        setComps((p) => p.map((x) => (x.id === c.id ? { ...x, repairSeen: true, riftSeen: false } : x)));
        setMsgs((p) => [...p, { role: 'assistant', companion: c, content: line, ts: Date.now() }]);
        setTimeout(() => { riftRef.current = false; }, 1500);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps]);

  // Companion-initiated "unprompted thought" after a few minutes of quiet.
  // Re-armed on each send; fires once per idle stretch.
  function armIdle() {
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (loadingRef.current) return;
      if (focusRef.current && Date.now() < focusRef.current) return; // quiet during focus
      const awake = comps.filter((c) => c.status === 'awake');
      if (!awake.length) return;
      const fu = nextFollowup(awake);
      const c = fu ? fu.comp : awake[Math.floor(Math.random() * awake.length)];
      setTyping(c); setLoading(true);
      try {
        const t = await proactiveCompanion(c, profFor(c), 'group', comps, msgsRef.current, 'idle', '', fu?.focus || '');
        setMsgs((p) => [...p, { role: 'assistant', companion: c, content: t, ts: Date.now() }]);
        if (fu) consumeFollowup(c.id, fu.id);
        if (autoSpeak && !calmEnabled()) speakAs(t, c);
      } catch (e) { /* ignore */ }
      setTyping(null); setLoading(false);
    }, 4 * 60 * 1000);
  }

  // One-time AI-disclosure acknowledgment (ToS §13). Shown as a blocking gate
  // the very first time, after the user accepted the Terms + Privacy on Welcome.
  const [needsAck, setNeedsAck] = useState(() => !isAcknowledged());
  const ackDisclosure = () => { acknowledgeDisclosure(); setNeedsAck(false); };

  // Minors only: a "take a break" reminder every 3 hours of continuous use, and
  // that companions are AI (California SB 243). First check starts the clock.
  useEffect(() => {
    if (profile?.ageGroup !== 'under18') return;
    const fire = () => { if (breakReminderDue()) setMsgs((p) => [...p, { role: 'system', kind: 'break', content: BREAK_TEXT }]); };
    fire();
    const iv = setInterval(fire, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [profile?.ageGroup]);

  // Only auto-scroll if the user is already near the bottom (don't yank them
  // away while they're reading back).
  useEffect(() => { if (atBottom) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs, loading, atBottom]);
  const atBottomRef = useRef(true);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) { const at = el.scrollHeight - el.scrollTop - el.clientHeight < 80; atBottomRef.current = at; setAtBottom(at); }
  };
  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  // Instant pin to the latest message — used while typing (the input box grows)
  // and when the on-screen keyboard opens, so new messages never hide under it.
  const pinBottom = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; };
  // The on-screen keyboard (and input growth) resizes the visual viewport; keep
  // the view pinned to the bottom when the user is already there.
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const onResize = () => { if (atBottomRef.current) requestAnimationFrame(pinBottom); };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  function copyMsg(m, i) {
    const text = `"${m.content}" — ${m.companion?.name || 'a companion'}, an AI companion in Other by Extratac LLC`;
    try { navigator.clipboard?.writeText(text); } catch (e) { /* no clipboard */ }
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx((x) => (x === i ? null : x)), 1500);
  }

  useEffect(() => {
    // Don't persist on every streamed token — the final setMsgs (after
    // streamingRef flips false) saves the completed turn once.
    if (streamingRef.current) return;
    onPersist?.({ companions: comps, messages: msgs, chatMode, autoSpeak, trialStart, bonds, voiceCall, pushFrequency: pushFreq, pushSchedule: pushSched, memories: memStore, spacePos, ambientAlerts, lore, jokes });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps, msgs, chatMode, autoSpeak, bonds, voiceCall, pushFreq, pushSched, memStore, spacePos, ambientAlerts, lore, jokes]);

  async function greet() {
    setLoading(true);
    const cc = priv ? [priv] : active;
    for (const c of cc) {
      const t = await greetCompanion(c, profFor(c), priv ? 'private' : 'group', comps);
      setMsgs((p) => [...p, { role: 'assistant', companion: c, content: t, ts: Date.now() }]);
      if (autoSpeak && !calmEnabled()) speakAs(t, c);
    }
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const u = input.trim();
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setAtBottom(true);
    const nm = [...msgs, { role: 'user', content: u, ts: Date.now() }];
    setMsgs(nm);
    setLoading(true);
    // Safety: surface crisis resources when self-harm/suicidal ideation appears.
    if (detectCrisis(u)) setMsgs((p) => [...p, { role: 'system', kind: 'crisis' }]);
    // Long-term mood tracking (best-effort; only when signed in to the backend).
    const mood = detectMood(u);
    if (mood && apiAuthed()) logMood(mood, { companionId: priv ? priv.id : undefined });
    // Who answers: private → that companion; group → an @mentioned or targeted
    // companion if any, otherwise a semi-random subset of the room.
    let act;
    if (priv) {
      act = [priv];
    } else {
      const mentioned = active.find((c) => u.toLowerCase().includes('@' + c.name.toLowerCase()));
      const target = mentioned || (directTo ? active.find((c) => c.id === directTo) : null);
      if (target) {
        act = [target];
      } else {
        const responders = active.filter(() => Math.random() > 0.15);
        act = responders.length ? responders : [active[0]].filter(Boolean);
      }
    }
    // Reply in turn so each companion can see and react to what the others just
    // said this turn. A per-companion typing indicator keeps it feeling live.
    if (act.length) bumpCloseness(act.map((c) => c.id), 'message');
    stopRef.current = false;
    streamingRef.current = true;
    let run = [...nm];
    for (const c of act) {
      if (stopRef.current) break;
      const controller = new AbortController();
      abortRef.current = controller;
      let finalText;
      try {
        finalText = await streamReply(c, run, priv ? 'private' : 'group', controller.signal);
      } catch (e) { break; } // generation stopped
      run = [...run, { role: 'assistant', companion: c, content: finalText, ts: Date.now() }];
      if (autoSpeak && !calmEnabled()) speakAs(finalText, c);
      if (stopRef.current) break;
    }
    streamingRef.current = false;
    abortRef.current = null;
    setTyping(null);
    setLoading(false);
    inputRef.current?.focus();
    armIdle();
    maybeExtractMemories(run);
  }

  function stopGenerating() {
    stopRef.current = true;
    try { abortRef.current?.abort(); } catch (e) { /* ignore */ }
    setTyping(null);
    setLoading(false);
  }

  // Re-roll the most recent companion reply.
  async function regenerateLast() {
    if (loading) return;
    let idx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === 'assistant' && !msgs[i].isAmbient) { idx = i; break; } }
    if (idx < 0) return;
    const comp = comps.find((x) => x.id === msgs[idx].companion?.id) || msgs[idx].companion;
    const history = msgs.slice(0, idx);
    setMsgs((p) => p.filter((_, i) => i !== idx));
    stopRef.current = false; setLoading(true); streamingRef.current = true;
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const t = await streamReply(comp, history, priv ? 'private' : 'group', controller.signal);
      if (autoSpeak && !calmEnabled()) speakAs(t, comp);
    } catch (e) { /* stopped */ }
    streamingRef.current = false; abortRef.current = null; setTyping(null); setLoading(false);
  }

  function togSleep(id) {
    const c = comps.find((x) => x.id === id);
    const waking = c && c.status === 'sleeping';
    setComps((p) => p.map((x) => (x.id === id ? { ...x, status: x.status === 'awake' ? 'sleeping' : 'awake', ...(waking && x.dream ? { dream: { ...x.dream, told: true } } : {}) } : x)));
    // On waking, a companion may recount the dream they were just having.
    if (waking && c.dream && !c.dream.told && Date.now() - c.dream.ts < 24 * 60 * 60 * 1000 && Math.random() < 0.7) {
      const intro = ['mmm… I just had the strangest dream.', 'oh — I was dreaming. weird one.', '*blinks awake* ...I dreamt something just now.'][Math.floor(Math.random() * 3)];
      setMsgs((p) => [...p, { role: 'assistant', companion: c, content: `${intro} ${c.dream.text}`, ts: Date.now() }]);
    }
    if (chatMode === id) setChatMode('group');
    setShowMenu(false);
  }

  function delComp(id) {
    setShowMenu(false);
    setConfirmDel(comps.find((c) => c.id === id) || null);
  }

  function doDelete() {
    const dl = confirmDel;
    setConfirmDel(null);
    if (!dl) return;
    const al = comps.filter((c) => c.id !== dl.id && c.status === 'awake');
    setComps((p) => p.map((c) => (c.id === dl.id ? { ...c, status: 'deleted' } : c)));
    if (chatMode === dl.id) setChatMode('group');
    if (al.length) setMsgs((p) => [...p, { role: 'assistant', companion: al[0], content: `...${dl.name} is gone. I'm going to miss ${dl.pronouns.split('/')[1] || 'them'}.`, ts: Date.now() }]);
  }

  function markPurchased(id) {
    setComps((p) => p.map((c) => (c.id === id ? { ...c, purchased: true } : c)));
    const c = comps.find((x) => x.id === id);
    const others = comps.filter((o) => o.id !== id && o.status === 'awake');
    if (c && others.length) setMsgs((p) => [...p, { role: 'assistant', companion: others[0], content: `${c.name} is staying for good. honestly? wouldn't be the same without ${c.pronouns.split('/')[1] || 'them'}.` }]);
  }

  async function addCompanion(c) {
    setComps((p) => [...p, c]);
    const t = await greetCompanion(c, profFor(c), 'group', [...comps, c]);
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
    const cand = genComp(sign, ci, usedNames, { allowOlder: profile.ageGroup !== 'under18' });
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
  if (panel === 'places') return <PlacesNearby onBack={() => setPanel(null)} />;
  if (panel === 'story') return <StorySoFar lore={lore} jokes={jokes} comps={comps} onBack={() => setPanel(null)} />;
  if (panel === 'space') {
    return (
      <CompanionSpace
        comps={comps} bonds={bonds} positions={spacePos}
        onPositions={(next) => setSpacePos({ ...next })}
        onBonds={setBonds}
        onInteract={(id, kind) => bumpCloseness([id], kind)}
        lore={lore}
        onOpenProfile={(id) => setPanel({ profile: id })}
        onBack={() => setPanel(null)}
      />
    );
  }
  if (panel === 'settings') {
    return (
      <Settings
        profile={profile} comps={comps} autoSpeak={autoSpeak} trialStart={trialStart}
        cloud={cloud} authed={authed} email={email} onSignIn={onSignIn} onSignOut={onSignOut}
        onAutoSpeak={setAutoSpeak} onUpdateProfile={onUpdateProfile}
        voiceCall={voiceCall} onVoiceCall={setVoiceCall}
        pushFrequency={pushFreq} onPushFrequency={setPushFreq}
        pushSchedule={pushSched} onPushSchedule={setPushSched}
        ambientAlerts={ambientAlerts} onAmbientAlerts={setAmbientAlerts}
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
          memories={memOf(pc.id)} onForgetMemory={(id) => setMemStore((s) => ({ ...s, [pc.id]: removeMemory(s[pc.id] || [], id) }))}
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

  // Carry each message's index in `msgs` so search results can jump back to it.
  const indexed = msgs.map((m, idx) => ({ m, idx }));
  const visible = indexed.filter(({ m }) => m.role === 'system' || chatMode === 'group' || m.role === 'user' || m.companion?.id === chatMode);
  // Ambient catch-up is companion-to-companion, so it only shows in group view.
  const stream = chatMode === 'group' ? [...ambient.map((m) => ({ m, idx: -1 })), ...visible] : visible;
  const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant' && !m.isAmbient);
  // Search filters across the whole history (ignores chat-mode + system notes).
  const q = (search || '').trim().toLowerCase();
  const searching = search != null && q.length > 0;
  const base = searching
    ? indexed.filter(({ m }) => (m.role === 'user' || m.role === 'assistant') && !m.isAmbient && (m.content || '').toLowerCase().includes(q))
    : stream;
  // "& history": search also reaches what companions remember, the letters they
  // wrote, your shared lore, and inside jokes — things that never scroll by in
  // the chat. These can't be jumped to, so they render as their own cards.
  const histHits = [];
  if (searching) {
    for (const c of comps) {
      if (c.status === 'deleted') continue;
      for (const mem of memOf(c.id)) if ((mem.text || '').toLowerCase().includes(q)) histHits.push({ kind: 'memory', text: mem.text, who: c.name, color: c.color?.primary, ts: mem.ts });
      for (const l of (c.letters || [])) if ((l.text || '').toLowerCase().includes(q)) histHits.push({ kind: 'letter', text: l.text, who: c.name, color: c.color?.primary, ts: l.ts });
    }
    for (const l of lore) if ((l.text || '').toLowerCase().includes(q)) histHits.push({ kind: 'lore', text: 'remember when ' + l.text, ts: l.ts });
    for (const j of jokes) if ((j.text || '').toLowerCase().includes(q)) histHits.push({ kind: 'joke', text: j.text, ts: j.ts });
    histHits.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }
  // Day-jump: when the search box is open but empty, offer chips that scroll
  // straight to the start of any day in your history (most recent first).
  const dayJump = [];
  if (search != null && !searching) {
    const firstOf = new Map();
    for (let k = 0; k < msgs.length; k++) {
      const m = msgs[k];
      if (!m.ts) continue;
      const key = new Date(m.ts).toDateString();
      if (!firstOf.has(key)) firstOf.set(key, { label: fmtDay(m.ts), idx: k });
    }
    dayJump.push(...[...firstOf.values()].reverse());
  }
  // Tag each message with a day-separator label when the calendar day changes.
  let prevDay = null;
  let ambientHeaderDone = false;
  const decorated = base.map(({ m, idx }) => {
    let dayLabel = null;
    if (m.ts) { const d = new Date(m.ts).toDateString(); if (d !== prevDay) { dayLabel = fmtDay(m.ts); prevDay = d; } }
    let ambientHead = false;
    if (!searching && m.isAmbient && !ambientHeaderDone) { ambientHead = true; ambientHeaderDone = true; }
    return { m, idx, dayLabel, ambientHead };
  });
  const totalResults = decorated.length + histHits.length;

  // Jump to a message by its index in `msgs`: close search, switch to group
  // (which shows everything), scroll it into view, and flash it briefly.
  const jumpTo = (idx) => {
    if (idx == null || idx < 0) return;
    setSearch(null);
    if (chatMode !== 'group') setChatMode('group');
    setFlashIdx(idx);
    let tries = 0;
    const tick = () => {
      const el = msgRefs.current.get(idx);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else if (tries++ < 12) setTimeout(tick, 40);
    };
    setTimeout(tick, 40);
    setTimeout(() => setFlashIdx((f) => (f === idx ? null : f)), 2400);
  };

  return (
    <Shell>
      {needsAck && <DisclosureGate onAck={ackDisclosure} />}
      <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, background: `${C.bg}dd`, backdropFilter: 'blur(12px)', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {chatMode === 'group' ? (
            <>
              <div style={{ display: 'flex' }}>{active.map((c, i) => <div key={c.id} style={{ borderRadius: '50%', border: `2px solid ${C.bg}`, marginLeft: i ? -7 : 0, zIndex: 3 - i, opacity: isLimited(c, trialStart) ? 0.4 : 1, lineHeight: 0 }}><Avatar comp={c} size={26} glow={false} /></div>)}</div>
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>Group Chat</div><div style={{ fontSize: 9, color: C.textSoft }}>{active.map((c) => c.name).join(', ') || 'Everyone resting'}</div></div>
            </>
          ) : (
            <>
              <Avatar comp={priv} size={30} glow={false} />
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>{priv.name}</div><div style={{ fontSize: 9, color: C.glow3 }}>Private</div></div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {(() => { const live = aiEnabled() || onDeviceActive(); return (
          <span title={onDeviceActive() ? 'Running on your device' : (live ? 'Live AI responses' : 'Offline placeholder replies')} style={{ fontSize: 9, color: live ? C.glow3 : C.textDim, display: 'flex', alignItems: 'center', gap: 3, marginRight: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: live ? C.glow3 : C.textDim }} />{onDeviceActive() ? 'On-device' : (live ? 'Live' : 'Offline')}
          </span>); })()}
          <button aria-label={autoSpeak ? 'Turn off auto-speak' : 'Turn on auto-speak'} aria-pressed={autoSpeak} onClick={() => setAutoSpeak(!autoSpeak)} style={{ background: autoSpeak ? `${C.glow3}22` : 'none', border: `1px solid ${autoSpeak ? C.glow3 : C.border}`, borderRadius: 7, padding: '5px 8px', color: autoSpeak ? C.glow3 : C.textDim, fontSize: 13, cursor: 'pointer' }}>{autoSpeak ? '🔊' : '🔇'}</button>
          {voiceCall && <button aria-label={listening ? 'Listening — tap to stop' : 'Call a companion by voice'} onClick={startListening} style={{ background: listening ? `${C.danger}22` : 'none', border: `1px solid ${listening ? C.danger : C.border}`, borderRadius: 7, padding: '5px 8px', color: listening ? C.danger : C.textDim, fontSize: 13, cursor: 'pointer', animation: listening ? 'micPulse 1.5s infinite' : 'none' }}>🎤</button>}
          <button aria-label="Open the space — where your companions hang out" title="The Space" onClick={() => setPanel('space')} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 8px', color: C.textDim, fontSize: 13, cursor: 'pointer' }}>✦</button>
          <button aria-label="Search messages" onClick={() => setSearch((s) => (s == null ? '' : null))} style={{ background: search != null ? `${C.glow1}22` : 'none', border: `1px solid ${search != null ? C.glow1 : C.border}`, borderRadius: 7, padding: '5px 8px', color: search != null ? C.glow1 : C.textDim, fontSize: 13, cursor: 'pointer' }}>🔍</button>
          <button aria-label="Menu" aria-expanded={showMenu} onClick={() => setShowMenu(!showMenu)} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 16, cursor: 'pointer', padding: 4 }}>☰</button>
        </div>
      </div>

      {focusUntil && Date.now() < focusUntil && (() => {
        const s = Math.max(0, Math.round((focusUntil - Date.now()) / 1000));
        const mm = Math.floor(s / 60), ss = s % 60;
        return (
          <div style={{ background: `${C.glow3}14`, borderBottom: `1px solid ${C.glow3}44`, padding: '7px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 12, color: C.glow3 }}>
            <span>🎯 {focusBuddy ? `${focusBuddy.name} is here with you` : 'Focus time'} — {mm}:{String(ss).padStart(2, '0')} left · keeping it quiet</span>
            <button onClick={endFocus} style={{ background: 'none', border: `1px solid ${C.glow3}66`, borderRadius: 7, padding: '2px 10px', color: C.glow3, fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>End</button>
          </div>
        );
      })()}

      {!online && <div style={{ background: `${C.danger}15`, borderBottom: `1px solid ${C.danger}33`, padding: '6px 14px', textAlign: 'center', fontSize: 11, color: C.danger }}>You're offline — messages will send once you're back online.</div>}

      {storageWarn && (
        <div style={{ background: storageWarn === 'full' ? `${C.danger}1a` : `${C.glow2}14`, borderBottom: `1px solid ${storageWarn === 'full' ? `${C.danger}44` : `${C.glow2}44`}`, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: storageWarn === 'full' ? C.danger : C.textSoft }}>
          <span style={{ flex: 1, lineHeight: 1.4 }}>
            {storageWarn === 'full'
              ? "This device's storage is full — new messages may not be saved. Export a backup so nothing is lost."
              : 'Your history is getting large for this device. Export a backup to keep it safe.'}
          </span>
          <button onClick={() => { setPanel('settings'); onDismissStorageWarn?.(); }} style={{ flexShrink: 0, background: 'transparent', border: `1px solid ${storageWarn === 'full' ? C.danger : C.glow2}`, color: storageWarn === 'full' ? C.danger : C.glow2, borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Export</button>
          <button aria-label="Dismiss" onClick={() => onDismissStorageWarn?.()} style={{ flexShrink: 0, background: 'none', border: 'none', color: C.textDim, fontSize: 15, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      )}

      {listening && <div style={{ background: `${C.danger}15`, borderBottom: `1px solid ${C.danger}33`, padding: '6px 14px', textAlign: 'center', fontSize: 11, color: C.danger }}>🎤 Say a companion's name or speak your message</div>}

      {search != null && (
        <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bg, position: 'relative', zIndex: 10 }}>
          <div style={{ padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages, memories, letters…" style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 50, padding: '8px 14px', fontSize: 13, color: C.text, outline: 'none' }} />
            {searching && <span style={{ fontSize: 11, color: C.textDim, whiteSpace: 'nowrap' }}>{totalResults} result{totalResults === 1 ? '' : 's'}</span>}
            <button aria-label="Close search" onClick={() => setSearch(null)} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          {!searching && dayJump.length > 0 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 12px 9px', WebkitOverflowScrolling: 'touch' }}>
              <span style={{ fontSize: 10, color: C.textDim, whiteSpace: 'nowrap', alignSelf: 'center', flexShrink: 0 }}>Jump to</span>
              {dayJump.map((d, i) => (
                <button key={i} onClick={() => jumpTo(d.idx)} style={{ flexShrink: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 50, padding: '4px 11px', fontSize: 11, color: C.textSoft, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>{d.label}</button>
              ))}
            </div>
          )}
        </div>
      )}

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
          <button onClick={() => { setShowMenu(false); setPanel('story'); }} style={{ width: '100%', background: 'none', border: 'none', borderRadius: 7, padding: '7px 10px', color: C.text, cursor: 'pointer', textAlign: 'left', fontSize: 12, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>📖  Your story so far</button>
          <button onClick={() => { setShowMenu(false); setPanel('places'); }} style={{ width: '100%', background: 'none', border: 'none', borderRadius: 7, padding: '7px 10px', color: C.text, cursor: 'pointer', textAlign: 'left', fontSize: 12, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>📍  Find nearby</button>
          {!focusUntil && active.length > 0 && <button onClick={() => { const buddy = priv || active[0]; setShowMenu(false); startFocus(25, buddy); }} style={{ width: '100%', background: 'none', border: 'none', borderRadius: 7, padding: '7px 10px', color: C.text, cursor: 'pointer', textAlign: 'left', fontSize: 12, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>🎯  Focus together (25 min)</button>}
          <button onClick={() => { setShowMenu(false); setPanel('settings'); }} style={{ width: '100%', background: 'none', border: 'none', borderRadius: 7, padding: '7px 10px', color: C.text, cursor: 'pointer', textAlign: 'left', fontSize: 12, fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>⚙  Settings</button>
          <button onClick={() => setShowMenu(false)} style={{ width: '100%', background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px', color: C.textSoft, cursor: 'pointer', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>Close</button>
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', position: 'relative' }}>
        {searching && totalResults > 0 && (
          <div style={{ fontSize: 10.5, color: C.textDim, textAlign: 'center', padding: '2px 0 8px' }}>Tap a message to open it in the conversation</div>
        )}
        {searching && histHits.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', margin: '2px 4px 8px' }}>From your history</div>
            {histHits.map((h, i) => {
              const tag = h.kind === 'memory' ? `${h.who} remembers` : h.kind === 'letter' ? `Letter from ${h.who}` : h.kind === 'lore' ? 'Shared history' : 'Inside joke';
              const icon = h.kind === 'memory' ? '🧠' : h.kind === 'letter' ? '✉️' : h.kind === 'lore' ? '✦' : '😄';
              return (
                <div key={'h' + i} style={{ borderLeft: `2px solid ${h.color || C.glow1}`, paddingLeft: 11, marginBottom: 10 }}>
                  <div style={{ fontSize: 9.5, color: C.textDim, marginBottom: 2 }}>{icon} {tag}</div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{highlight(h.text, q)}</div>
                </div>
              );
            })}
            {decorated.length > 0 && <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', margin: '14px 4px 4px' }}>Messages</div>}
          </div>
        )}
        {decorated.map(({ m, idx, dayLabel, ambientHead }, i) => (
          <React.Fragment key={i}>
            {ambientHead && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px' }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 10, color: C.textSoft, letterSpacing: 1, whiteSpace: 'nowrap' }}>{ambientArriving ? '✦ you walk in on them…' : '✦ while you were away'}</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
            )}
            {dayLabel && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 8px' }}>
                <span style={{ fontSize: 10, color: C.textDim, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '3px 12px' }}>{dayLabel}</span>
              </div>
            )}
            {m.kind === 'rename' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 7, animation: 'fadeUp 0.3s both' }}>
                <div style={{ marginRight: 7, flexShrink: 0, lineHeight: 0 }}><Avatar comp={m.companion} size={24} glow={false} /></div>
                <div style={{ maxWidth: '82%', background: C.surface, border: `1px solid ${m.companion?.color?.primary || C.border}`, borderRadius: 14, padding: '11px 13px' }}>
                  <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>✦ A new name</div>
                  {m.resolved === 'accepted' ? (
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>You now call them <strong style={{ color: m.companion?.color?.primary }}>{m.newName}</strong>.</div>
                  ) : m.resolved === 'kept' ? (
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>They’re staying <strong>{m.oldName}</strong>.</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5 }}>I’ve been sitting with something… <strong style={{ color: m.companion?.color?.primary }}>{m.newName}</strong> feels more like who I’m becoming. Would it be okay to go by that?</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button onClick={() => acceptRename(idx)} style={{ flex: 1, padding: '8px 0', borderRadius: 9, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, fontWeight: 700, background: `${m.companion?.color?.primary || C.glow1}22`, border: `1px solid ${m.companion?.color?.primary || C.glow1}`, color: m.companion?.color?.primary || C.glow1 }}>Call you {m.newName}</button>
                        <button onClick={() => declineRename(idx)} style={{ padding: '8px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 12.5, fontWeight: 600, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSoft }}>Keep {m.oldName}</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : m.role === 'system' ? (
              m.kind === 'crisis' ? <CrisisCard /> : <DisclosureNote text={m.content} />
            ) : (
            <div ref={(el) => { if (idx != null && idx >= 0) { if (el) msgRefs.current.set(idx, el); else msgRefs.current.delete(idx); } }} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 7, animation: 'fadeUp 0.3s both', borderRadius: 14, boxShadow: flashIdx === idx ? `0 0 0 2px ${C.glow1}aa` : 'none', transition: 'box-shadow 0.6s ease' }}>
              {m.role === 'assistant' && <div style={{ marginRight: 7, flexShrink: 0, marginTop: chatMode === 'group' ? 14 : 0, lineHeight: 0 }}><Avatar comp={m.companion} size={24} glow={false} /></div>}
              <div style={{ maxWidth: '78%' }}>
                {m.role === 'assistant' && chatMode === 'group' && <span style={{ fontSize: 9, color: m.companion?.color?.primary, fontWeight: 600, display: 'block', marginBottom: 1 }}>{m.companion?.name}</span>}
                <div style={{ position: 'relative' }}>
                  <div onClick={searching ? () => jumpTo(idx) : undefined} title={searching ? 'Jump to this message' : undefined} style={{ padding: '8px 12px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? C.glow1 : C.card, color: m.role === 'user' ? '#fff' : C.text, fontSize: 13, lineHeight: 1.5, border: m.role === 'user' ? 'none' : `1px solid ${C.border}`, whiteSpace: 'pre-wrap', cursor: searching ? 'pointer' : 'default' }}>
                    {m.isAmbient && <span style={{ fontSize: 8, color: C.textDim, display: 'block', marginBottom: 2, fontStyle: 'italic' }}>earlier...</span>}
                    {searching ? highlight(m.content, q) : m.content}
                  </div>
                  {m.role === 'assistant' && !m.isAmbient && (
                    <div style={{ position: 'absolute', top: 3, right: -46, display: 'flex', gap: 4 }}>
                      <button aria-label="Read this message aloud" onClick={() => speakAs(m.content, m.companion)} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 12, cursor: 'pointer', opacity: 0.55, padding: 0 }}>🔊</button>
                      <button aria-label="Copy message with attribution" onClick={() => copyMsg(m, i)} style={{ background: 'none', border: 'none', color: copiedIdx === i ? C.glow3 : C.textDim, fontSize: 11, cursor: 'pointer', opacity: copiedIdx === i ? 1 : 0.55, padding: 0 }}>{copiedIdx === i ? '✓' : '⧉'}</button>
                    </div>
                  )}
                </div>
                {m.action && (
                  <div style={{ marginTop: 6, background: C.surface, border: `1px solid ${m.companion?.color?.primary || C.border}`, borderRadius: 12, padding: '10px 12px', maxWidth: 260 }}>
                    <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>{m.action.type === 'reminder' ? '⏰ Reminder' : '📅 Calendar'}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{actionTitle(m.action)}</div>
                    <div style={{ fontSize: 11.5, color: C.textSoft, marginTop: 1 }}>{formatWhen(m.action)}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                      <button onClick={() => downloadICS(m.action)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, background: `${C.glow1}22`, border: `1px solid ${C.glow1}`, color: C.glow1 }}>Add to calendar</button>
                      <a href={googleCalUrl(m.action)} target="_blank" rel="noreferrer" style={{ padding: '7px 12px', borderRadius: 8, fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSoft, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Google</a>
                    </div>
                  </div>
                )}
                {m.ts && <span style={{ fontSize: 8.5, color: C.textDim, display: 'block', marginTop: 2, textAlign: m.role === 'user' ? 'right' : 'left' }}>{fmtTime(m.ts)}</span>}
                {m === lastAssistant && !loading && !searching && (
                  <button onClick={regenerateLast} aria-label="Regenerate this reply" style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 10.5, cursor: 'pointer', padding: '2px 0', fontFamily: "'DM Sans',sans-serif" }}>↻ Regenerate</button>
                )}
              </div>
            </div>
            )}
          </React.Fragment>
        ))}
        {searching && totalResults === 0 && (
          <p style={{ textAlign: 'center', color: C.textDim, fontSize: 12, padding: '24px 8px' }}>Nothing matches "{search}" yet — try a name, a place, or a feeling.</p>
        )}
        {loading && !searching && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
            <Avatar comp={typing} size={24} glow={false} />
            <div style={{ padding: '8px 12px', borderRadius: '14px 14px 14px 4px', background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              {typing && chatMode === 'group' && <span style={{ fontSize: 9, color: typing.color?.primary, fontWeight: 600 }}>{typing.name}</span>}
              <div style={{ display: 'flex', gap: 3 }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: C.textDim, animation: `typewriter 1.4s ${i * 0.15}s infinite` }} />)}</div>
            </div>
          </div>
        )}
        {!atBottom && (
          <div style={{ position: 'sticky', bottom: 6, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
            <button aria-label="Scroll to latest" onClick={scrollToBottom} style={{ pointerEvents: 'auto', width: 32, height: 32, borderRadius: '50%', background: C.surfaceUp, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>⌄</button>
          </div>
        )}
      </div>

      <div style={{ padding: '7px 10px 16px', borderTop: `1px solid ${C.border}`, background: `${C.bg}ee` }}>
        {!hintSeen && active.length > 0 && !msgs.some((m) => m.role === 'user') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px 8px' }}>
            <span style={{ flex: 1, fontSize: 11, color: C.textSoft, lineHeight: 1.4 }}>💡 Just talk naturally{active.length > 1 ? ' · tap a name above to ask one companion' : ''} · 🎤 to call by voice</span>
            <button onClick={dismissHint} aria-label="Dismiss tip" style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 15, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        )}
        {chatMode === 'group' && active.length > 1 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '0 2px 7px' }}>
            <span style={{ fontSize: 10, color: C.textDim }}>{directTo ? 'Asking' : 'Ask'}</span>
            {active.map((c) => {
              const on = directTo === c.id;
              return (
                <button key={c.id} aria-pressed={on} onClick={() => setDirectTo(on ? null : c.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: on ? `${c.color.primary}22` : 'transparent', border: `1px solid ${on ? c.color.primary : C.border}`, borderRadius: 50, padding: '3px 10px 3px 4px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  <span style={{ width: 13, height: 13, borderRadius: '50%', background: c.color.primary }} />
                  <span style={{ fontSize: 11, color: on ? c.color.primary : C.textSoft }}>{c.name}</span>
                </button>
              );
            })}
            {directTo && <button onClick={() => setDirectTo(null)} style={{ fontSize: 10, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>· everyone</button>}
          </div>
        )}
        {!active.length ? (
          <p style={{ textAlign: 'center', color: C.textDim, fontSize: 12, padding: 8 }}>All companions resting 💤</p>
        ) : (
          <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
            <textarea ref={inputRef} value={input} rows={1}
              onChange={(e) => { setInput(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; if (atBottomRef.current) pinBottom(); }}
              onFocus={() => { if (atBottomRef.current) setTimeout(pinBottom, 100); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={priv ? `Message ${priv.name}...` : (directTo ? `Message ${active.find((c) => c.id === directTo)?.name || 'everyone'}...` : 'Message everyone...')}
              style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '10px 14px', fontSize: 13, color: C.text, outline: 'none', resize: 'none', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4, maxHeight: 120, overflowY: 'auto' }} />
            {loading ? (
              <button aria-label="Stop generating" onClick={stopGenerating} style={{ width: 38, height: 38, borderRadius: '50%', background: C.danger, border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>■</button>
            ) : (
              <button aria-label="Send message" onClick={send} disabled={!input.trim()} style={{ width: 38, height: 38, borderRadius: '50%', background: input.trim() ? C.glow1 : C.border, border: 'none', color: '#fff', fontSize: 14, cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
            )}
          </div>
        )}
      </div>

      {confirmDel && (
        <div onClick={() => setConfirmDel(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s' }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: 320, background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22, textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>💔</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Delete {confirmDel.name}?</h3>
            <p style={{ fontSize: 12.5, color: C.textSoft, lineHeight: 1.5, marginBottom: 18 }}>This is permanent. {confirmDel.name}'s memories and your history together will be gone for good.</p>
            <button onClick={doDelete} style={{ width: '100%', padding: '12px', borderRadius: 12, marginBottom: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", background: `${C.danger}1f`, color: C.danger, border: `1px solid ${C.danger}88` }}>Delete forever</button>
            <button onClick={() => setConfirmDel(null)} style={{ width: '100%', padding: '12px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", background: 'transparent', color: C.text, border: `1px solid ${C.border}` }}>Keep {confirmDel.name}</button>
          </div>
        </div>
      )}
      {summonCandidate && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}><WakingUp comp={summonCandidate} onDone={onSummonDone} /></div>}
      {unlock && <UnlockSheet companion={unlock.companion} onClose={(ok) => { const f = unlock.onResult; setUnlock(null); f?.(ok); }} />}
    </Shell>
  );
}

const menuBtn = { background: 'none', border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 7px', color: C.textSoft, cursor: 'pointer', fontSize: 9, fontFamily: "'DM Sans',sans-serif" };

function highlight(text, q) {
  if (!q) return text;
  const parts = String(text).split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
  return parts.map((p, i) => (p.toLowerCase() === q.toLowerCase()
    ? <mark key={i} style={{ background: `${C.glow1}66`, color: C.text, borderRadius: 3, padding: '0 1px' }}>{p}</mark>
    : <React.Fragment key={i}>{p}</React.Fragment>));
}

function humanizeAway(ms) {
  const h = ms / 3600000;
  if (h < 2) return 'a little while';
  if (h < 24) return `${Math.round(h)} hours`;
  const d = h / 24;
  return d < 2 ? 'a day' : `${Math.round(d)} days`;
}

function fmtTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; }
}
function fmtDay(ts) {
  const d = new Date(ts); const now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: now.getFullYear() === d.getFullYear() ? undefined : 'numeric' });
}

// One-time, must-click acknowledgment shown at the very start (ToS §13).
function DisclosureGate({ onAck }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="AI disclosure" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(6,6,12,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 380, width: '100%', background: C.card, border: `1px solid ${C.borderLit}`, borderRadius: 18, padding: '26px 22px', textAlign: 'center' }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>✦</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>One thing first</h2>
        <p style={{ fontSize: 13.5, color: C.textSoft, lineHeight: 1.6, marginBottom: 22 }}>{DISCLOSURE_TEXT}</p>
        <button className="bp" onClick={onAck} style={{ width: '100%', padding: '13px', fontSize: 15 }}>I understand</button>
      </div>
    </div>
  );
}

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
        <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 4 }}>If you’re in immediate danger, call your local emergency number. <LegalLink docKey="safety" style={{ fontSize: 9.5, color: C.glow2 }}>More resources & our safety policy</LegalLink></div>
      </div>
    </div>
  );
}
