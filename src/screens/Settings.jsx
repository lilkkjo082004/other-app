import React, { useState, useEffect, useRef } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { cap } from '../lib/zodiac.js';
import { trialDaysLeft } from '../lib/entitlements.js';
import { pushConfigured, pushSupported, isSubscribed, enablePush, disablePush, testPush, localNotify } from '../lib/push.js';
import { locationSupported, locationEnabled, locationLabel, requestLocation, setLabel, clearLocation, getFavPlaces, addCurrentAsFavorite, removeFavPlace } from '../lib/location.js';
import { deleteAccount, fetchEntitlement } from '../lib/api.js';
import { MANAGE_URL } from '../config.js';
import { loadSession, saveSession } from '../lib/storage.js';
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
  const living = comps.filter((c) => c.status !== 'deleted');
  const allAwake = living.length > 0 && living.every((c) => c.status === 'awake');

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
  const saveTimes = (next) => onPushSchedule?.({ times: [...new Set(next)].sort(), tz: localTz() });
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
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button aria-label="Back" onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Settings</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 40px' }}>
        {section('You')}
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textSoft, fontSize: 13 }}>Name</span><span style={{ fontSize: 13, fontWeight: 500 }}>{profile.name}</span></div>
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
                <div style={{ fontSize: 13 }}>Companion check-ins</div>
                <div style={{ fontSize: 11, color: C.textDim }}>Let your companions reach out during the day</div>
                {pushErr && <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>{pushErr}</div>}
              </div>
              <Toggle on={pushOn} onClick={togglePush} />
            </div>
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
          </>
        )}

        <div style={{ height: 10 }} />
        {section('Voice')}
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 13 }}>Auto-speak</div><div style={{ fontSize: 11, color: C.textDim }}>Companions read messages aloud</div></div>
          <Toggle on={autoSpeak} onClick={() => onAutoSpeak(!autoSpeak)} />
        </div>
        {onVoiceCall && (
          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, paddingRight: 10 }}><div style={{ fontSize: 13 }}>Call by name</div><div style={{ fontSize: 11, color: C.textDim }}>Tap the mic to open a companion by voice</div></div>
            <Toggle on={voiceCall !== false} onClick={() => onVoiceCall(!(voiceCall !== false))} />
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
