import React, { useState, useEffect, useRef } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { cap } from '../lib/zodiac.js';
import { trialDaysLeft } from '../lib/entitlements.js';
import { pushConfigured, pushSupported, isSubscribed, enablePush, disablePush, testPush, localNotify } from '../lib/push.js';
import { locationSupported, locationEnabled, locationLabel, requestLocation, setLabel, clearLocation, getFavPlaces, addCurrentAsFavorite, removeFavPlace } from '../lib/location.js';
import { deleteAccount, fetchEntitlement, enableCalendarFeed } from '../lib/api.js';
import { googleCalendarConfigured, googleConnected, connectGoogle, disconnectGoogle, shareWithCompanions, setShareWithCompanions } from '../lib/gcal.js';
import { MANAGE_URL } from '../config.js';
import { onDeviceSupported, onDeviceEnabled, setOnDeviceEnabled, preloadEngine, setProgressHandler, ON_DEVICE_LABEL } from '../lib/ondevice.js';
import { supportsLocalTts, localVoiceEnabled, setLocalVoiceEnabled, warmLocalTts, speakLocal } from '../lib/localtts.js';
import { voiceVolume, setVoiceVolume } from '../lib/voicevol.js';
import { speakAs, stopSpeaking } from '../lib/voice.js';
import { calmEnabled, setCalm } from '../lib/comfort.js';
import { loadSession, saveSession } from '../lib/storage.js';
import { downloadReadableExport } from '../lib/dataexport.js';
import { AMBIANCES, currentAmbiance, setAmbiance, playAmbiance, stopAmbiance, isCustom, listCustom, addCustom, removeCustom, ambianceVolume, setAmbianceVolume } from '../lib/ambiance.js';
import { LegalLink } from './Legal.jsx';
import Paywall from '../components/Paywall.jsx';
import ProfileEdit from './ProfileEdit.jsx';

export default function Settings({ profile, comps, autoSpeak, trialStart, cloud, authed, email, onSignIn, onSignOut, onAutoSpeak, onUpdateProfile, voiceCall, onVoiceCall, pushFrequency, onPushFrequency, pushSchedule, onPushSchedule, ambientAlerts, onAmbientAlerts, onSleepAll, onWakeAll, onReset, onBack }) {
  const [editing, setEditing] = useState(false);
  const [ent, setEnt] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const premium = !!ent?.active;
  const loadEnt = () => fetchEntitlement().then(setEnt).catch(() => {});
  useEffect(() => { loadEnt(); }, [authed]);

  const [calm, setCalmState] = useState(calmEnabled());
  const toggleCalm = () => { const v = !calm; setCalm(v); setCalmState(v); };
  const [amb, setAmb] = useState(currentAmbiance());
  const [ambVol, setAmbVol] = useState(ambianceVolume());
  const [customSounds, setCustomSounds] = useState([]);
  const [ambErr, setAmbErr] = useState(null);
  const ambFileRef = useRef(null);
  useEffect(() => { listCustom().then(setCustomSounds).catch(() => {}); }, []);
  // Ambiance previews here play as you pick; stop them when you leave Settings so
  // the sound only lingers where it belongs — in The Space.
  useEffect(() => () => stopAmbiance(), []);
  const chooseAmb = (k) => { setAmb(k); setAmbiance(k); if (k === 'off') stopAmbiance(); else playAmbiance(k); };
  async function uploadAmb(file) {
    setAmbErr(null);
    try { const c = await addCustom(file); const list = await listCustom(); setCustomSounds(list); chooseAmb(`custom:${c.id}`); }
    catch (e) { setAmbErr(String(e.message || e)); }
  }
  async function deleteAmb(id) {
    await removeCustom(id);
    const list = await listCustom(); setCustomSounds(list);
    if (amb === `custom:${id}`) chooseAmb('off');
  }
  const odSupported = onDeviceSupported();
  const [odOn, setOdOn] = useState(onDeviceEnabled());
  const [odProg, setOdProg] = useState(null);  // { pct, text, error } | null
  const [odReady, setOdReady] = useState(false);
  async function toggleOnDevice() {
    if (odOn) { setOnDeviceEnabled(false); setOdOn(false); setOdProg(null); setOdReady(false); return; }
    setOnDeviceEnabled(true); setOdOn(true); setOdReady(false); setOdProg({ pct: 0, text: 'Preparing…' });
    setProgressHandler((p) => setOdProg({ pct: Math.round((p.progress || 0) * 100), text: p.text || 'Downloading model…' }));
    try { await preloadEngine(); setOdReady(true); setOdProg(null); }
    catch (e) { setOdProg({ pct: 0, text: 'Could not load the on-device model on this device.', error: true }); }
  }
  // On-device neural voice (free, no server). First enable downloads the model.
  const lvSupported = supportsLocalTts();
  const [lvOn, setLvOn] = useState(localVoiceEnabled());
  const [lvProg, setLvProg] = useState(null);   // { pct, text, error } | null
  const [lvReady, setLvReady] = useState(false);
  async function toggleLocalVoice() {
    if (lvOn) { setLocalVoiceEnabled(false); setLvOn(false); setLvProg(null); setLvReady(false); return; }
    setLocalVoiceEnabled(true); setLvOn(true); setLvReady(false); setLvProg({ pct: 0, text: 'Downloading voice…' });
    try {
      await warmLocalTts((pct) => setLvProg({ pct, text: 'Downloading voice…' }));
      setLvReady(true); setLvProg(null);
      // A little hello so they hear it worked.
      speakLocal("Hi — this is my real voice now.", comps.find((c) => c.status === 'awake') || 0).catch(() => {});
    } catch (e) {
      setLocalVoiceEnabled(false); setLvOn(false);
      setLvProg({ pct: 0, text: 'Could not load the on-device voice on this device.', error: true });
    }
  }
  const living = comps.filter((c) => c.status !== 'deleted');
  const allAwake = living.length > 0 && living.every((c) => c.status === 'awake');
  const [vVol, setVVol] = useState(voiceVolume());
  const previewVol = () => { stopSpeaking(); speakAs('This is how loud I am now.', living.find((c) => c.status === 'awake') || 0); };

  const showPush = pushConfigured() && pushSupported() && authed;
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState(null);
  useEffect(() => {
    if (showPush) isSubscribed().then(setPushOn).catch(() => {});
  }, [showPush]);
  async function togglePush() {
    if (pushBusy) return;
    setPushErr(null); setPushBusy(true);
    try {
      if (pushOn) { await disablePush(); setPushOn(false); }
      else { await enablePush(); setPushOn(true); if (!pushSchedule) saveTimes(['09:00']); }
    } catch (e) { setPushErr(String(e.message || e)); }
    setPushBusy(false);
  }
  // Check-in schedule: user-chosen wall-clock times in their own timezone.
  const localTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };
  const times = pushSchedule?.times || [];
  const [newTime, setNewTime] = useState('09:00');
  // Merge-preserve the rest of the schedule (quiet hours, tone) when saving.
  const savePush = (patch) => onPushSchedule?.({
    times: [...new Set(times)].sort(), tz: localTz(),
    quietStart: pushSchedule?.quietStart || '', quietEnd: pushSchedule?.quietEnd || '',
    tone: pushSchedule?.tone || 'standard',
    types: pushSchedule?.types || {},
    ...patch,
  });
  // Notification-type switches (default on). Event/task reminders and check-ins
  // are independently toggleable; the cron honors these on the synced schedule.
  const pushTypes = pushSchedule?.types || {};
  const typeOn = (k) => pushTypes[k] !== false;
  const saveType = (k, v) => savePush({ types: { ...pushTypes, [k]: v } });
  const saveTimes = (next) => savePush({ times: [...new Set(next)].sort() });
  const addTime = () => { if (/^\d{2}:\d{2}$/.test(newTime) && !times.includes(newTime)) saveTimes([...times, newTime]); };
  const removeTime = (t) => saveTimes(times.filter((x) => x !== t));
  const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); const ap = h < 12 ? 'AM' : 'PM'; return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`; };

  const [pushTest, setPushTest] = useState(null);
  const [testBusy, setTestBusy] = useState(false);
  async function runPushTest() {
    if (testBusy) return;
    setPushTest(null); setTestBusy(true);
    let local = false;
    try { local = await localNotify(); } catch (e) { /* ignore */ }
    let result;
    try { result = await testPush(); }
    catch (e) { result = { ok: false, message: String(e.message || e) }; }
    setPushTest({ ...result, local });
    setTestBusy(false);
  }

  // Calendar: Google (browser OAuth) + Apple (webcal subscription feed).
  const [gcalOn, setGcalOn] = useState(googleConnected());
  const [gcalShare, setGcalShare] = useState(shareWithCompanions());
  const [gcalBusy, setGcalBusy] = useState(false);
  const [gcalErr, setGcalErr] = useState(null);
  async function toggleGoogle() {
    if (gcalBusy) return;
    setGcalErr(null);
    if (gcalOn) { disconnectGoogle(); setGcalOn(false); return; }
    setGcalBusy(true);
    try { await connectGoogle(); setGcalOn(true); }
    catch (e) { setGcalErr('Google sign-in was cancelled or failed.'); }
    setGcalBusy(false);
  }
  const toggleGcalShare = () => { const v = !gcalShare; setShareWithCompanions(v); setGcalShare(v); };
  const [feedUrl, setFeedUrl] = useState(null);   // https URL from the backend
  const [feedBusy, setFeedBusy] = useState(false);
  const [feedErr, setFeedErr] = useState(null);
  const [feedCopied, setFeedCopied] = useState(false);
  const webcalUrl = feedUrl ? feedUrl.replace(/^https?:/, 'webcal:') : '';
  async function getFeed() {
    if (feedBusy) return;
    setFeedErr(null); setFeedBusy(true);
    try { const d = await enableCalendarFeed(); setFeedUrl(d.url); }
    catch (e) { setFeedErr(String(e.message || e)); }
    setFeedBusy(false);
  }
  async function copyFeed() {
    try { await navigator.clipboard.writeText(webcalUrl); setFeedCopied(true); setTimeout(() => setFeedCopied(false), 1600); }
    catch (e) { setFeedErr('Couldn’t copy — long-press the link instead.'); }
  }

  const [locOn, setLocOn] = useState(locationEnabled());
  const [locArea, setLocArea] = useState(locationLabel());
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState(null);
  const [locManual, setLocManual] = useState(false);
  const [locInput, setLocInput] = useState('');
  async function useMyLocation() {
    if (locBusy) return;
    setLocErr(null); setLocBusy(true);
    try {
      await requestLocation();
      setLocOn(true); setLocArea(locationLabel()); setLocManual(false);
    } catch (e) { setLocErr(String(e.message || e)); }
    setLocBusy(false);
  }
  function saveManual() {
    if (!locInput.trim()) return;
    setLabel(locInput.trim());
    setLocOn(true); setLocArea(locationLabel()); setLocManual(false); setLocInput(''); setLocErr(null);
  }
  function turnOffLocation() {
    clearLocation();
    setLocOn(false); setLocArea(null); setLocManual(false); setLocErr(null);
  }

  // Favorite places (on-device): saved spots for proximity nudges.
  const [favs, setFavs] = useState(getFavPlaces());
  const [favName, setFavName] = useState('');
  const [favBusy, setFavBusy] = useState(false);
  const [favErr, setFavErr] = useState(null);
  async function addFav() {
    if (favBusy) return;
    setFavErr(null); setFavBusy(true);
    try { await addCurrentAsFavorite(favName); setFavs(getFavPlaces()); setFavName(''); }
    catch (e) { setFavErr(String(e.message || e)); }
    setFavBusy(false);
  }
  function delFav(id) { removeFavPlace(id); setFavs(getFavPlaces()); }

  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState(null);
  async function removeAccount() {
    try { if (!window.confirm('Permanently delete your account and ALL of your data from our servers? This cannot be undone.')) return; } catch (e) { /* headless */ }
    setDelErr(null); setDelBusy(true);
    try {
      await deleteAccount();
      onSignOut?.();   // clear the local token/email
      onReset?.();     // wipe this device and return to the start
    } catch (e) { setDelErr(String(e.message || e)); setDelBusy(false); }
  }

  const fileRef = useRef(null);
  const [impErr, setImpErr] = useState(null);
  function exportData() {
    setImpErr(null);
    try {
      const data = loadSession() || {};
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `other-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setImpErr('Export failed'); }
  }
  function importData(file) {
    if (!file) return;
    setImpErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(reader.result);
        if (!s || !Array.isArray(s.companions)) throw new Error('That doesn’t look like an Other backup.');
        if (!window.confirm('Restore this backup? It replaces the data on this device.')) return;
        saveSession(s);
        window.location.reload();
      } catch (e) { setImpErr(String(e.message || e)); }
    };
    reader.readAsText(file);
  }

  const trialLabel = () => {
    if (!trialStart) return 'Free plan · one companion is yours forever';
    const left = trialDaysLeft(trialStart);
    if (left > 0) return `Trial active · ${left} ${left === 1 ? 'day' : 'days'} left`;
    return 'Trial ended · unpurchased companions have limited memory';
  };

  const section = (t) => <p style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>{t}</p>;
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 };

  if (editing) return <ProfileEdit profile={profile} onSave={(u) => { onUpdateProfile?.(u); setEditing(false); }} onBack={() => setEditing(false)} />;

  return (
    <Shell fill>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Settings</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 40px' }}>
        {section('You')}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: '50%', border: `1px solid ${C.border}`, background: profile.photo ? `center/cover no-repeat url(${profile.photo})` : C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSoft, fontSize: 18, fontWeight: 600, overflow: 'hidden' }}>
            {!profile.photo && (profile.name || '?').trim().charAt(0).toUpperCase()}
          </div>
          <div><div style={{ fontSize: 14, fontWeight: 600 }}>{profile.name}</div>{profile.occupation && <div style={{ fontSize: 11.5, color: C.textDim }}>{profile.occupation}</div>}</div>
        </div>
        {profile.astrology && <div style={{ ...card, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textSoft, fontSize: 13 }}>Stars</span><span style={{ fontSize: 13, fontWeight: 500 }}>{profile.astrology.westernData.sym} {cap(profile.astrology.western)}</span></div>}
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textSoft, fontSize: 13 }}>Mode</span><span style={{ fontSize: 13, fontWeight: 500 }}>{profile.ageGroup === 'under18' ? 'Under 18 (friendship only)' : (profile.ageVerified ? '18+ · verified' : '18+')}</span></div>
        {onUpdateProfile && (
          <button onClick={() => setEditing(true)} style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", border: `1px solid ${C.glow1}55`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div style={{ fontSize: 13, color: C.glow1, fontWeight: 500 }}>Edit profile</div><div style={{ fontSize: 11, color: C.textDim }}>Update your details & preferences anytime</div></div>
            <span style={{ color: C.glow1 }}>›</span>
          </button>
        )}

        {cloud && (
          <>
            <div style={{ height: 10 }} />
            {section('Account')}
            {authed ? (
              <>
                <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div style={{ fontSize: 13 }}>{email || 'Signed in'}</div><div style={{ fontSize: 11, color: C.textDim }}>Synced across your devices</div></div>
                  <span style={{ fontSize: 11, color: C.glow3 }}>● Synced</span>
                </div>
                <button onClick={onSignOut} style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer', color: C.text, fontFamily: "'DM Sans',sans-serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div style={{ fontSize: 13 }}>Sign out</div><div style={{ fontSize: 11, color: C.textDim }}>Keeps this device's copy; stops syncing</div></div>
                  <span style={{ color: C.textDim }}>›</span>
                </button>
                <button onClick={removeAccount} disabled={delBusy} style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer', border: `1px solid ${C.danger}33`, fontFamily: "'DM Sans',sans-serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div style={{ fontSize: 13, color: C.danger }}>{delBusy ? 'Deleting…' : 'Delete account'}</div><div style={{ fontSize: 11, color: C.textDim }}>Erase your account and all server data permanently</div></div>
                  <span style={{ color: C.danger }}>›</span>
                </button>
                {delErr && <div style={{ fontSize: 11, color: C.danger, margin: '0 2px 8px' }}>{delErr}</div>}
              </>
            ) : (
              <button onClick={onSignIn} style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", border: `1px solid ${C.glow1}55`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: 13, color: C.glow1, fontWeight: 500 }}>Sign in / Create account</div><div style={{ fontSize: 11, color: C.textDim }}>Sync your companions across devices</div></div>
                <span style={{ color: C.glow1 }}>›</span>
              </button>
            )}
          </>
        )}

        {showPush && (
          <>
            <div style={{ height: 10 }} />
            {section('Notifications')}
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, paddingRight: 10 }}>
                <div style={{ fontSize: 13 }}>Push notifications</div>
                <div style={{ fontSize: 11, color: C.textDim }}>Let your companions reach you when the app is closed</div>
                {pushErr && <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>{pushErr}</div>}
              </div>
              <Toggle on={pushOn} onClick={togglePush} label="Push notifications" />
            </div>
            {pushOn && (
              <div style={{ ...card }}>
                <div style={{ fontSize: 11, color: C.textDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>What to send</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13 }}>Event & task reminders</div><div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>A companion pings you before calendar events, reminders, and tasks you asked them to remember — even when the app is closed.</div></div>
                  <Toggle on={typeOn('events')} onClick={() => saveType('events', !typeOn('events'))} label="Event & task reminders" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13 }}>Companion check-ins</div><div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>Warm "thinking of you" notes, follow-ups, and nudges to come check on them.</div></div>
                  <Toggle on={typeOn('checkins')} onClick={() => saveType('checkins', !typeOn('checkins'))} label="Companion check-ins" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13 }}>Habit reminders</div><div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>For habits with the 🔔 turned on, a companion nudges you at the habit's time — even when the app is closed. (Daily &amp; specific-weekday habits.)</div></div>
                  <Toggle on={typeOn('habits')} onClick={() => saveType('habits', !typeOn('habits'))} label="Habit reminders" />
                </div>
              </div>
            )}
            {pushOn && (
              <div style={{ ...card }}>
                <button onClick={runPushTest} disabled={testBusy} aria-label="Send a test notification" style={{ width: '100%', padding: '10px 0', borderRadius: 9, cursor: testBusy ? 'default' : 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 13, background: 'transparent', border: `1px solid ${C.glow1}`, color: C.glow1, fontWeight: 600, opacity: testBusy ? 0.6 : 1 }}>
                  {testBusy ? 'Sending…' : 'Send a test notification'}
                </button>
                {pushTest && (
                  <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
                    <div style={{ color: pushTest.ok ? C.glow1 : C.danger }}>
                      {pushTest.ok ? '✓ ' : '⚠ '}{pushTest.message}
                    </div>
                    {pushTest.ok && pushTest.local && (
                      <div style={{ color: C.textDim, marginTop: 6 }}>
                        Two test notifications were sent — one shown directly by this browser, one through the server. How many actually appeared on your screen?
                      </div>
                    )}
                    {pushTest.ok && !pushTest.local && (
                      <div style={{ color: C.textDim, marginTop: 6 }}>
                        (Couldn’t show a direct browser test — notification permission may be off for this site.)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {pushOn && (
              <div style={{ ...card }}>
                <div style={{ fontSize: 13, marginBottom: 2 }}>Check-in times</div>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 12 }}>When your companions reach out, in your local time. Add as many as you like.</div>
                {times.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>No times set — your companions will stay quiet until you add one.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {times.map((t) => (
                      <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 8px 6px 12px', borderRadius: 999, background: `${C.glow1}1e`, border: `1px solid ${C.glow1}`, color: C.glow1, fontSize: 12.5, fontWeight: 600 }}>
                        {fmtTime(t)}
                        <button aria-label={`Remove ${fmtTime(t)}`} onClick={() => removeTime(t)} style={{ background: 'none', border: 'none', color: C.glow1, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="New check-in time"
                    style={{ flex: 1, padding: '9px 10px', borderRadius: 9, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'DM Sans',sans-serif", fontSize: 13, colorScheme: 'dark' }} />
                  <button onClick={addTime} aria-label="Add check-in time" style={{ padding: '9px 18px', borderRadius: 9, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, background: `${C.glow1}22`, border: `1px solid ${C.glow1}`, color: C.glow1 }}>Add</button>
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 10 }}>Times are checked about every 15 minutes, so a check-in may arrive a few minutes after the time you set.</div>
              </div>
            )}
            {pushOn && onAmbientAlerts && (
              <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, paddingRight: 10 }}>
                  <div style={{ fontSize: 13 }}>Conversation alerts</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>Sometimes ping you when your companions are chatting with each other</div>
                </div>
                <Toggle on={ambientAlerts !== false} onClick={() => onAmbientAlerts(!(ambientAlerts !== false))} />
              </div>
            )}
            {pushOn && (
              <div style={{ ...card }}>
                <div style={{ fontSize: 13, marginBottom: 2 }}>Quiet hours</div>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 12 }}>No check-ins during this window (your local time). Great for sleep.</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="time" aria-label="Quiet hours start" value={pushSchedule?.quietStart || ''} onChange={(e) => savePush({ quietStart: e.target.value })} style={{ flex: 1, padding: '9px 10px', borderRadius: 9, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'DM Sans',sans-serif", fontSize: 13, colorScheme: 'dark' }} />
                  <span style={{ fontSize: 12, color: C.textDim }}>to</span>
                  <input type="time" aria-label="Quiet hours end" value={pushSchedule?.quietEnd || ''} onChange={(e) => savePush({ quietEnd: e.target.value })} style={{ flex: 1, padding: '9px 10px', borderRadius: 9, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'DM Sans',sans-serif", fontSize: 13, colorScheme: 'dark' }} />
                  {(pushSchedule?.quietStart || pushSchedule?.quietEnd) && <button onClick={() => savePush({ quietStart: '', quietEnd: '' })} aria-label="Clear quiet hours" style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 16, cursor: 'pointer' }}>×</button>}
                </div>
              </div>
            )}
            {pushOn && (
              <div style={{ ...card }}>
                <div style={{ fontSize: 13, marginBottom: 10 }}>Tone</div>
                <div style={{ display: 'flex', gap: 7 }}>
                  {[['gentle', 'Gentle'], ['standard', 'Standard'], ['chatty', 'Chatty']].map(([k, lbl]) => {
                    const on = (pushSchedule?.tone || 'standard') === k;
                    return <button key={k} onClick={() => savePush({ tone: k })} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: `1px solid ${on ? C.glow1 : C.border}`, background: on ? `${C.glow1}1f` : 'transparent', color: on ? C.glow1 : C.textSoft, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{lbl}</button>;
                  })}
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>How often and how warmly your companions reach out.</div>
              </div>
            )}
          </>
        )}

        <div style={{ height: 10 }} />
        {section('Voice')}
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 13 }}>Auto-speak</div><div style={{ fontSize: 11, color: C.textDim }}>Companions read messages aloud</div></div>
          <Toggle on={autoSpeak} onClick={() => onAutoSpeak(!autoSpeak)} />
        </div>
        <div style={{ ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div><div style={{ fontSize: 13 }}>Voice volume</div><div style={{ fontSize: 11, color: C.textDim }}>How loud your companions speak</div></div>
            <span style={{ fontSize: 11, color: C.textSoft, minWidth: 34, textAlign: 'right' }}>{Math.round(vVol * 100)}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span aria-hidden style={{ fontSize: 13 }}>🔈</span>
            <input type="range" min="0" max="1" step="0.05" value={vVol} aria-label="Voice volume"
              onChange={(e) => { const v = parseFloat(e.target.value); setVVol(v); setVoiceVolume(v); }}
              onPointerUp={previewVol}
              style={{ flex: 1, accentColor: C.glow1, cursor: 'pointer' }} />
            <span aria-hidden style={{ fontSize: 13 }}>🔊</span>
          </div>
        </div>
        {onVoiceCall && (
          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, paddingRight: 10 }}><div style={{ fontSize: 13 }}>Call by name</div><div style={{ fontSize: 11, color: C.textDim }}>Tap the mic to open a companion by voice</div></div>
            <Toggle on={voiceCall !== false} onClick={() => onVoiceCall(!(voiceCall !== false))} />
          </div>
        )}
        {lvSupported && (
          <div style={{ ...card }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>Realistic voice (on device)</div>
                <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4 }}>Free & private, runs on your device — sounds far more human than the built-in voice. First time downloads ~80MB, then works offline.</div>
              </div>
              <Toggle on={lvOn} onClick={toggleLocalVoice} label="Realistic voice" />
            </div>
            {lvProg && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: lvProg.error ? C.danger : C.textSoft, marginBottom: 6 }}>{lvProg.text}{!lvProg.error && lvProg.pct ? ` · ${lvProg.pct}%` : ''}</div>
                {!lvProg.error && <div style={{ height: 6, borderRadius: 4, background: C.surfaceUp, overflow: 'hidden' }}><div style={{ width: `${lvProg.pct}%`, height: '100%', background: C.glow1, transition: 'width 0.3s' }} /></div>}
              </div>
            )}
            {lvReady && <div style={{ fontSize: 11, color: C.glow3, marginTop: 10 }}>✓ Realistic voice ready — pick each companion’s voice on their profile.</div>}
          </div>
        )}

        <div style={{ height: 10 }} />
        {section('Location')}
        {locOn ? (
          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 13 }}>{locArea || 'Your area'}</div><div style={{ fontSize: 11, color: C.textDim }}>Companions can suggest local ideas</div></div>
              <button onClick={turnOffLocation} style={{ background: 'none', border: 'none', color: C.danger, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Turn off</button>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
              {locationSupported() && <button onClick={useMyLocation} disabled={locBusy} style={{ background: 'none', border: 'none', color: C.glow1, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", padding: 0 }}>{locBusy ? 'Updating…' : 'Update location'}</button>}
              <button onClick={() => { setLocManual(true); setLocInput(locArea || ''); }} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", padding: 0 }}>Edit area</button>
            </div>
            {locErr && <div style={{ fontSize: 11, color: C.danger, marginTop: 8 }}>{locErr}</div>}
          </div>
        ) : (
          <div style={{ ...card }}>
            <div style={{ fontSize: 13 }}>Share your location</div>
            <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5, marginTop: 2 }}>Let companions tailor suggestions to where you are. Your precise location stays on this device — only a general area is used.</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
              {locationSupported() && <button className="bp" onClick={useMyLocation} disabled={locBusy} style={{ padding: '8px 16px', fontSize: 12 }}>{locBusy ? 'Locating…' : 'Use my location'}</button>}
              <button onClick={() => { setLocManual(true); setLocInput(''); }} style={{ background: 'none', border: 'none', color: C.glow1, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Enter manually</button>
            </div>
            {locErr && <div style={{ fontSize: 11, color: C.danger, marginTop: 8 }}>{locErr}</div>}
          </div>
        )}
        {locManual && (
          <div style={{ ...card, display: 'flex', gap: 8 }}>
            <input value={locInput} onChange={(e) => setLocInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveManual()} placeholder="City, region (e.g. Atlanta, GA)" style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.text, outline: 'none' }} />
            <button onClick={saveManual} style={{ background: C.glow1, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, padding: '0 14px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Save</button>
          </div>
        )}

        {locOn && (
          <div style={{ ...card }}>
            <div style={{ fontSize: 13 }}>Favorite places</div>
            <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5, marginTop: 2 }}>Save spots you love. When you're near one, a companion may nudge you with an idea — proximity is checked entirely on your device; coordinates never leave it.</div>
            {favs.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {favs.map((f) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 10px' }}>
                    <span style={{ fontSize: 12.5 }}>📍 {f.name}</span>
                    <button onClick={() => delFav(f.id)} aria-label={`Remove ${f.name}`} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 15, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {locationSupported() ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input value={favName} onChange={(e) => setFavName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addFav()} placeholder="Name this spot (e.g. The Coffee Place)" style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, color: C.text, outline: 'none' }} />
                <button onClick={addFav} disabled={favBusy} style={{ background: `${C.glow1}22`, border: `1px solid ${C.glow1}`, borderRadius: 8, color: C.glow1, fontSize: 13, fontWeight: 600, padding: '0 14px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>{favBusy ? 'Saving…' : 'Add here'}</button>
              </div>
            ) : <div style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>This device can't access location.</div>}
            {favErr && <div style={{ fontSize: 11, color: C.danger, marginTop: 8 }}>{favErr}</div>}
          </div>
        )}

        <div style={{ height: 10 }} />
        {section('Calendar')}
        {googleCalendarConfigured() ? (
          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>Google Calendar</div>
                <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>{gcalOn ? 'Connected — companion plans can be added with one tap.' : 'Connect to add companion plans & reminders with one tap.'}</div>
              </div>
              {gcalOn
                ? <button onClick={toggleGoogle} style={{ background: 'none', border: 'none', color: C.danger, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>Disconnect</button>
                : <button className="bp" onClick={toggleGoogle} disabled={gcalBusy} style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>{gcalBusy ? 'Connecting…' : 'Connect'}</button>}
            </div>
            {gcalErr && <div style={{ fontSize: 11, color: C.danger, marginTop: 8 }}>{gcalErr}</div>}
            {gcalOn && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>Companions can see upcoming events</div>
                  <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>Your next few events (titles & times only) so they can ask about your day. Read on this device, never stored on our servers.</div>
                </div>
                <Toggle on={gcalShare} onClick={toggleGcalShare} label="Companions can see upcoming events" />
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...card }}>
            <div style={{ fontSize: 13 }}>Google Calendar</div>
            <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5, marginTop: 2 }}>Not available on this build yet — companion event cards still offer a Google Calendar link and .ics files that open in any calendar app.</div>
          </div>
        )}
        {cloud && authed ? (
          <div style={{ ...card }}>
            <div style={{ fontSize: 13 }}>Apple Calendar & others</div>
            <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5, marginTop: 2 }}>Subscribe to your Other feed — companion plans, your birthday, and companion anniversaries appear automatically in Apple Calendar, Google Calendar, or Outlook.</div>
            {feedUrl ? (
              <div style={{ marginTop: 10 }}>
                <a href={webcalUrl} style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 9, background: `${C.glow1}22`, border: `1px solid ${C.glow1}`, color: C.glow1, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>Open in calendar app</a>
                <button onClick={copyFeed} style={{ marginLeft: 10, background: 'none', border: 'none', color: feedCopied ? C.glow3 : C.textSoft, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{feedCopied ? '✓ Copied' : 'Copy link'}</button>
                <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 8, wordBreak: 'break-all', lineHeight: 1.5 }}>{webcalUrl}</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 6, lineHeight: 1.5 }}>On iPhone: tap the button above. Elsewhere: paste the link into “Add calendar → From URL.” Anyone with this link can see the feed — keep it private.</div>
              </div>
            ) : (
              <button onClick={getFeed} disabled={feedBusy} style={{ marginTop: 10, padding: '8px 16px', borderRadius: 9, background: 'transparent', border: `1px solid ${C.glow1}`, color: C.glow1, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{feedBusy ? 'Setting up…' : 'Get my calendar link'}</button>
            )}
            {feedErr && <div style={{ fontSize: 11, color: C.danger, marginTop: 8 }}>{feedErr}</div>}
          </div>
        ) : (
          <div style={{ ...card }}>
            <div style={{ fontSize: 13 }}>Apple Calendar & others</div>
            <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5, marginTop: 2 }}>{cloud ? 'Sign in to get a personal calendar feed you can subscribe to in Apple Calendar. ' : ''}Companion event cards always offer .ics files that open in any calendar app.</div>
          </div>
        )}

        <div style={{ height: 10 }} />
        {section('Companions')}
        <button onClick={allAwake ? onSleepAll : onWakeAll} style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer', color: C.text, fontFamily: "'DM Sans',sans-serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 13 }}>{allAwake ? 'Put everyone to sleep' : 'Wake everyone'}</div><div style={{ fontSize: 11, color: C.textDim }}>{allAwake ? 'Quiet the whole room' : 'Bring everyone back'}</div></div>
          <span style={{ color: C.textDim }}>›</span>
        </button>

        <div style={{ height: 10 }} />
        {section('Plan')}
        <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ fontSize: 16 }}>✦</span><span style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.4 }}>{trialLabel()}</span></div>

        <div style={{ height: 10 }} />
        {section('Other Plus')}
        {premium ? (
          <div style={{ ...card }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: MANAGE_URL ? 10 : 0 }}>
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: `${C.glow2}1f`, border: `1px solid ${C.glow2}66`, fontSize: 11, color: C.glow2, fontWeight: 700 }}>✦ Plus</span>
              <span style={{ fontSize: 12.5, color: C.textSoft }}>Active — premium model unlocked</span>
            </div>
            {MANAGE_URL && <a href={MANAGE_URL} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: C.glow1, textDecoration: 'none' }}>Manage subscription ›</a>}
          </div>
        ) : (
          <button onClick={() => setShowPaywall(true)} style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${C.glow2}55` }}>
            <div><div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>Upgrade to Other Plus</div><div style={{ fontSize: 11, color: C.textDim }}>Smarter companions, unlimited messages, natural voice</div></div>
            <span style={{ color: C.glow2, fontWeight: 700 }}>›</span>
          </button>
        )}

        <div style={{ height: 10 }} />
        {section('Comfort')}
        <div style={{ ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: C.text }}>Calm Mode</div>
              <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4 }}>Low stimulation — stops background motion, dims the visuals, and mutes auto-speak.</div>
            </div>
            <Toggle on={calm} onClick={toggleCalm} label="Calm Mode" />
          </div>
        </div>
        <div style={{ ...card }}>
          <div style={{ fontSize: 13, marginBottom: 2 }}>Ambiance</div>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 12 }}>A soft ambient soundscape for The Space — ours, or upload your own.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {AMBIANCES.map((a) => {
              const on = amb === a.key;
              return <button key={a.key} onClick={() => chooseAmb(a.key)} style={{ background: on ? `${C.glow1}22` : C.surfaceUp, border: `1px solid ${on ? C.glow1 : C.border}`, color: on ? C.glow1 : C.textSoft, borderRadius: 50, padding: '7px 13px', fontSize: 12.5, fontWeight: on ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{a.em} {a.label}</button>;
            })}
            {customSounds.map((s) => {
              const k = `custom:${s.id}`; const on = amb === k;
              return (
                <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: on ? `${C.glow1}22` : C.surfaceUp, border: `1px solid ${on ? C.glow1 : C.border}`, borderRadius: 50, padding: '5px 8px 5px 13px' }}>
                  <button onClick={() => chooseAmb(k)} style={{ background: 'none', border: 'none', color: on ? C.glow1 : C.textSoft, fontSize: 12.5, fontWeight: on ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", padding: 0, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎵 {s.name}</button>
                  <button aria-label={`Remove ${s.name}`} onClick={() => deleteAmb(s.id)} style={{ background: 'none', border: 'none', color: on ? C.glow1 : C.textDim, fontSize: 15, lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}>×</button>
                </span>
              );
            })}
            <button onClick={() => ambFileRef.current?.click()} style={{ background: 'transparent', border: `1px dashed ${C.border}`, color: C.textSoft, borderRadius: 50, padding: '7px 13px', fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>＋ Upload your own</button>
          </div>
          <input ref={ambFileRef} type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadAmb(f); }} style={{ display: 'none' }} />
          {ambErr && <div style={{ fontSize: 11, color: C.danger, marginTop: 8 }}>{ambErr}</div>}
          {amb !== 'off' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <span style={{ fontSize: 13 }} aria-hidden>🔈</span>
              <input type="range" min="0" max="1" step="0.05" value={ambVol} aria-label="Ambiance volume"
                onChange={(e) => { const v = parseFloat(e.target.value); setAmbVol(v); setAmbianceVolume(v); }}
                style={{ flex: 1, accentColor: C.glow1, cursor: 'pointer' }} />
              <span style={{ fontSize: 13 }} aria-hidden>🔊</span>
            </div>
          )}
          <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 8 }}>Plays in The Space. Your uploads stay on this device (up to 20 MB each) and loop softly.</div>
        </div>

        <div style={{ height: 10 }} />
        {section('On-device AI')}
        <div style={{ ...card }}>
          {!odSupported ? (
            <div style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.5 }}>This browser can’t run AI on-device (it needs WebGPU). Try Chrome or Edge on desktop, or Chrome on Android.</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, color: C.text }}>Run AI on my device</div>
                  <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4 }}>Free & private — works offline. First time downloads ~2GB; replies are a bit slower.</div>
                </div>
                <Toggle on={odOn} onClick={toggleOnDevice} label="Run AI on my device" />
              </div>
              {odProg && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: odProg.error ? C.danger : C.textSoft, marginBottom: 6 }}>{odProg.text}{!odProg.error && odProg.pct ? ` · ${odProg.pct}%` : ''}</div>
                  {!odProg.error && <div style={{ height: 6, borderRadius: 4, background: C.surfaceUp, overflow: 'hidden' }}><div style={{ width: `${odProg.pct}%`, height: '100%', background: C.glow1, transition: 'width 0.3s' }} /></div>}
                </div>
              )}
              {odReady && <div style={{ fontSize: 11, color: C.glow3, marginTop: 10 }}>✓ {ON_DEVICE_LABEL} ready — companions now reply on your device.</div>}
            </>
          )}
        </div>

        <div style={{ height: 10 }} />
        {section('Legal')}
        <div style={{ ...card }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}><LegalLink docKey="tos" style={{ textDecoration: 'none', color: C.text }}>Terms of Service ›</LegalLink></div>
          <div style={{ fontSize: 13, marginBottom: 4 }}><LegalLink docKey="privacy" style={{ textDecoration: 'none', color: C.text }}>Privacy Policy ›</LegalLink></div>
          <div style={{ fontSize: 13, marginBottom: 4 }}><LegalLink docKey="disclaimer" style={{ textDecoration: 'none', color: C.text }}>Disclaimer & Terms of Use ›</LegalLink></div>
          <div style={{ fontSize: 13 }}><LegalLink docKey="safety" style={{ textDecoration: 'none', color: C.text }}>Crisis Resources & Safety ›</LegalLink></div>
        </div>

        <div style={{ height: 10 }} />
        {section('Data')}
        <div style={{ ...card, display: 'flex', gap: 8 }}>
          <button onClick={exportData} style={{ flex: 1, background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px', color: C.text, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>⬇ Export backup</button>
          <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px', color: C.text, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>⬆ Import backup</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={(e) => importData(e.target.files?.[0])} style={{ display: 'none' }} />
        </div>
        {impErr && <div style={{ fontSize: 11, color: C.danger, margin: '0 2px 8px' }}>{impErr}</div>}
        <p style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5, margin: '0 2px 8px' }}>Download your companions & history as a file, or restore from one. Works without an account.</p>
        <button onClick={() => { try { downloadReadableExport(loadSession() || {}); } catch (e) { setImpErr('Export failed'); } }} style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 13, fontWeight: 500 }}>📄 Download my data (readable)</div><div style={{ fontSize: 11, color: C.textDim }}>Profile, chats, journals, moods & more as a document (vault excluded)</div></div>
          <span style={{ color: C.textSoft }}>›</span>
        </button>

        <button onClick={onReset} style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer', border: `1px solid ${C.danger}44`, fontFamily: "'DM Sans',sans-serif", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 13, color: C.danger, fontWeight: 500 }}>Reset everything</div><div style={{ fontSize: 11, color: C.textDim }}>Wipe your profile, companions, and all history</div></div>
          <span style={{ color: C.danger }}>›</span>
        </button>
        <p style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5, marginTop: 12 }}>Everything is stored locally on your device. Other never keeps your personal data on a server.</p>
        <p style={{ fontSize: 11, color: C.textDim, marginTop: 12 }}>Other · Extratac LLC</p>
      </div>
      {showPaywall && <Paywall premium={premium} uid={ent?.uid} email={email} onRefresh={loadEnt} onClose={() => setShowPaywall(false)} />}
    </Shell>
  );
}

function Toggle({ on, onClick, label }) {
  return (
    <button role="switch" aria-checked={!!on} aria-label={label} onClick={onClick} style={{ width: 44, height: 26, borderRadius: 50, border: 'none', cursor: 'pointer', background: on ? C.glow1 : C.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );
}
