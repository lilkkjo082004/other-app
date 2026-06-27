import React, { useState } from 'react';
import { getUserAstro, pickSigns } from './lib/zodiac.js';
import { genComp } from './lib/companions.js';
import { loadSession, saveSession, clearSession } from './lib/storage.js';
import Welcome from './screens/Welcome.jsx';
import Onboarding from './screens/Onboarding.jsx';
import ZodiacReveal from './screens/ZodiacReveal.jsx';
import CompanionPreference from './screens/CompanionPreference.jsx';
import WakingUp from './screens/WakingUp.jsx';
import CompanionSelect from './screens/CompanionSelect.jsx';
import Chat from './screens/Chat.jsx';

// Resume only if there's a saved session with at least one living companion.
const saved = loadSession();
const resumable = saved && Array.isArray(saved.companions) && saved.companions.some((c) => c.status !== 'deleted');

export default function App() {
  const [screen, setScreen] = useState(resumable ? 'chat' : 'welcome');
  const [profile, setProfile] = useState(resumable ? saved.profile : null);
  const [allC, setAllC] = useState([]);
  const [wI, setWI] = useState(0);
  const [selC, setSelC] = useState(resumable ? saved.companions : []);
  const [restored, setRestored] = useState(
    resumable ? { messages: saved.messages, chatMode: saved.chatMode, autoSpeak: saved.autoSpeak } : null
  );

  const handleOB = (a) => {
    const astro = getUserAstro(a.dob);
    setProfile({ ...a, astrology: astro });
    setScreen('zodiac');
  };

  const handlePref = (r) => {
    const signs = pickSigns(profile.astrology.western);
    const used = [];
    const cs = signs.map((s, i) => {
      const c = genComp(s, i, used);
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
    saveSession({ profile, ...chatState });
  };

  const reset = () => {
    clearSession();
    setProfile(null);
    setSelC([]);
    setAllC([]);
    setRestored(null);
    setScreen('welcome');
  };

  if (screen === 'chat') return <Chat companions={selC} profile={profile} restored={restored} onPersist={persist} onReset={reset} />;
  if (screen === 'welcome') return <Welcome onStart={() => setScreen('onboarding')} />;
  if (screen === 'onboarding') return <Onboarding onComplete={handleOB} />;
  if (screen === 'zodiac') return <ZodiacReveal profile={profile} onContinue={() => setScreen('preference')} />;
  if (screen === 'preference') return <CompanionPreference onChoice={handlePref} ageGroup={profile?.ageGroup} />;
  if (screen === 'waking') return <WakingUp comp={allC[wI]} key={wI} onDone={() => (wI < allC.length - 1 ? setWI(wI + 1) : setScreen('select'))} />;
  if (screen === 'select') return <CompanionSelect comps={allC} onSelect={(s) => { setSelC(s); setRestored(null); setScreen('chat'); }} />;
  return null;
}
