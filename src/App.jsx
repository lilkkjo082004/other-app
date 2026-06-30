import React, { useState, useEffect } from 'react';
import { getUserAstro, pickSigns } from './lib/zodiac.js';
import { genComp } from './lib/companions.js';
import { loadSession, saveSession, clearSession, STORAGE_SOFT_LIMIT } from './lib/storage.js';
import { cloudEnabled } from './config.js';
import { withAgeVerification } from './lib/age.js';
import * as api from './lib/api.js';
import Welcome from './screens/Welcome.jsx';
import Onboarding from './screens/Onboarding.jsx';
import ZodiacReveal from './screens/ZodiacReveal.jsx';
import CompanionPreference from './screens/CompanionPreference.jsx';
import WakingUp from './screens/WakingUp.jsx';
import CompanionSelect from './screens/CompanionSelect.jsx';
import Chat from './screens/Chat.jsx';
import Auth from './screens/Auth.jsx';

const hasLiving = (s) => s && Array.isArray(s.companions) && s.companions.some((c) => c.status !== 'deleted');

// Resume from local storage if there's a session with at least one living companion.
const saved = loadSession();
const resumable = hasLiving(saved);

export default function App() {
  const [screen, setScreen] = useState(resumable ? 'chat' : 'welcome');
  const [profile, setProfile] = useState(resumable ? withAgeVerification(saved.profile) : null);
  const [allC, setAllC] = useState([]);
  const [wI, setWI] = useState(0);
  const [selC, setSelC] = useState(resumable ? saved.companions : []);
  const [trialStart, setTrialStart] = useState(resumable ? (saved.trialStart || null) : null);
  const [restored, setRestored] = useState(
    resumable ? { messages: saved.messages, chatMode: saved.chatMode, autoSpeak: saved.autoSpeak, bonds: saved.bonds, voiceCall: saved.voiceCall, pushFrequency: saved.pushFrequency, pushSchedule: saved.pushSchedule, memories: saved.memories, spacePos: saved.spacePos, ambientAlerts: saved.ambientAlerts, lore: saved.lore, jokes: saved.jokes } : null
  );
  const [authed, setAuthed] = useState(api.isAuthed());
  const [email, setEmailState] = useState(api.getEmail());
  const [storageWarn, setStorageWarn] = useState(null);   // 'full' | 'near' | null

  // Returning authed users: pull the cloud session and resume from it.
  useEffect(() => {
    if (!cloudEnabled() || !api.isAuthed()) return;
    (async () => {
      try {
        const s = await api.pullState();
        if (hasLiving(s)) applyState(s);
      } catch (e) { /* offline / token expired — stay local */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyState(s) {
    setProfile(withAgeVerification(s.profile));
    setSelC(s.companions || []);
    setTrialStart(s.trialStart || null);
    setRestored({ messages: s.messages || [], chatMode: s.chatMode || 'group', autoSpeak: !!s.autoSpeak, bonds: s.bonds || {}, voiceCall: s.voiceCall, pushFrequency: s.pushFrequency, pushSchedule: s.pushSchedule, memories: s.memories || [], spacePos: s.spacePos || {}, ambientAlerts: s.ambientAlerts, lore: s.lore || [], jokes: s.jokes || [] });
    setScreen('chat');
  }

  const handleOB = (a) => {
    const astro = getUserAstro(a.dob);
    setProfile(withAgeVerification({ ...a, astrology: astro }));
    setScreen('zodiac');
  };

  const handlePref = (r) => {
    const signs = pickSigns(profile.astrology.western);
    const used = [];
    const allowOlder = profile.ageGroup !== 'under18';
    const cs = signs.map((s, i) => {
      const c = genComp(s, i, used, { allowOlder });
      used.push(c.name);
      if (r.mode === 'builder') c.builderTraits = r.builderTraits;
      if (r.freeText) c.freeText = r.freeText;
      return c;
    });
    setAllC(cs);
    setWI(0);
    setScreen('waking');
  };

  const persist = (chatState) => {
    if (!profile) return;
    const session = { profile, ...chatState };
    const r = saveSession(session);
    setStorageWarn(!r.ok ? 'full' : (r.bytes > STORAGE_SOFT_LIMIT ? 'near' : null));
    if (cloudEnabled() && api.isAuthed()) api.pushState(session).catch(() => {});
  };

  // Edit the profile after onboarding. Re-derives astrology when the birthday
  // changes, re-locks the age gate, and persists immediately (local + cloud).
  function updateProfile(updates) {
    let np = { ...profile, ...updates };
    if (updates.dob && updates.dob !== profile?.dob) np.astrology = getUserAstro(updates.dob);
    np = withAgeVerification(np);
    setProfile(np);
    const session = { ...(loadSession() || {}), profile: np };
    saveSession(session);
    if (cloudEnabled() && api.isAuthed()) api.pushState(session).catch(() => {});
  }

  const reset = () => {
    clearSession();
    setProfile(null);
    setSelC([]);
    setAllC([]);
    setTrialStart(null);
    setRestored(null);
    setScreen('welcome');
  };

  // After a successful sign-in/up: prefer cloud state; else push up the local
  // session if there is one; else start fresh.
  function onAuthed(cloudState) {
    setAuthed(true);
    setEmailState(api.getEmail());
    if (hasLiving(cloudState)) { applyState(cloudState); return; }
    const local = loadSession();
    if (hasLiving(local)) { api.pushState(local).catch(() => {}); applyState(local); return; }
    setScreen(profile ? 'chat' : 'welcome');
  }

  function signOut() {
    api.logout();
    setAuthed(false);
    setEmailState('');
  }

  const accountProps = {
    cloud: cloudEnabled(),
    authed,
    email,
    onSignIn: () => setScreen('auth'),
    onSignOut: signOut,
  };

  if (screen === 'auth') return <Auth onAuthed={onAuthed} onBack={() => setScreen(profile ? 'chat' : 'welcome')} />;
  if (screen === 'chat') return <Chat companions={selC} profile={profile} trialStart={trialStart} restored={restored} onPersist={persist} onReset={reset} onUpdateProfile={updateProfile} storageWarn={storageWarn} onDismissStorageWarn={() => setStorageWarn(null)} {...accountProps} />;
  if (screen === 'welcome') return <Welcome onStart={() => setScreen('onboarding')} onSignIn={cloudEnabled() ? () => setScreen('auth') : undefined} />;
  if (screen === 'onboarding') return <Onboarding onComplete={handleOB} />;
  if (screen === 'zodiac') return <ZodiacReveal profile={profile} onContinue={() => setScreen('preference')} />;
  if (screen === 'preference') return <CompanionPreference onChoice={handlePref} ageGroup={profile?.ageGroup} />;
  if (screen === 'waking') return <WakingUp comp={allC[wI]} key={wI} onDone={() => (wI < allC.length - 1 ? setWI(wI + 1) : setScreen('select'))} />;
  if (screen === 'select') return <CompanionSelect comps={allC} onSelect={(s) => {
    // First chosen companion is free forever; any extras start a 14-day trial.
    s.forEach((c, i) => { c.purchased = i === 0; });
    setTrialStart(s.length > 1 ? Date.now() : null);
    setSelC(s);
    setRestored(null);
    setScreen('chat');
  }} />;
  return null;
}
