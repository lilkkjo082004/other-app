import React, { useState, useEffect, useRef } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { cap } from '../lib/zodiac.js';
import { trialDaysLeft } from '../lib/entitlements.js';
import { pushConfigured, pushSupported, isSubscribed, enablePush, disablePush, testPush, localNotify } from '../lib/push.js';
import { locationSupported, locationEnabled, locationLabel, requestLocation, setLabel, clearLocation } from '../lib/location.js';
import { deleteAccount } from '../lib/api.js';
import { loadSession, saveSession } from '../lib/storage.js';
import { LegalLink } from './Legal.jsx';
import ProfileEdit from './ProfileEdit.jsx';

export default function Settings({ profile, comps, autoSpeak, trialStart, cloud, authed, email, onSignIn, onSignOut, onAutoSpeak, onUpdateProfile, voiceCall, onVoiceCall, pushFrequency, onPushFrequency, onSleepAll, onWakeAll, onReset, onBack }) {
  const [editing, setEditing] = useState(false);
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
      else { await enablePush(); setPushOn(true); }
    } catch (e) { setPushErr(String(e.message || e)); }
    setPushBusy(false);
  }
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
            {pushOn && onPushFrequency && (
              <div style={{ ...card }}>
                <div style={{ fontSize: 13, marginBottom: 2 }}>How often</div>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>How chatty your companions get</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 'daily', l: 'Daily' }, { v: 'few', l: 'A few/week' }, { v: 'off', l: 'Off' }].map((o) => {
                    const on = (pushFrequency || 'daily') === o.v;
                    return (
                      <button key={o.v} onClick={() => onPushFrequency(o.v)} style={{ flex: 1, padding: '8px 0', borderRadius: 9, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 12, background: on ? `${C.glow1}22` : 'transparent', border: `1px solid ${on ? C.glow1 : C.border}`, color: on ? C.glow1 : C.textSoft, fontWeight: on ? 600 : 400 }}>{o.l}</button>
                    );
                  })}
                </div>
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
        {section('Legal')}
        <div style={{ ...card }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}><LegalLink docKey="tos" style={{ textDecoration: 'none', color: C.text }}>Terms of Service ›</LegalLink></div>
          <div style={{ fontSize: 13 }}><LegalLink docKey="privacy" style={{ textDecoration: 'none', color: C.text }}>Privacy Policy ›</LegalLink></div>
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
