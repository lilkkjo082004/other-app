import React from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { cap } from '../lib/zodiac.js';
import { trialDaysLeft } from '../lib/entitlements.js';

export default function Settings({ profile, comps, autoSpeak, trialStart, cloud, authed, email, onSignIn, onSignOut, onAutoSpeak, onSleepAll, onWakeAll, onReset, onBack }) {
  const living = comps.filter((c) => c.status !== 'deleted');
  const allAwake = living.length > 0 && living.every((c) => c.status === 'awake');

  const trialLabel = () => {
    if (!trialStart) return 'Free plan · one companion is yours forever';
    const left = trialDaysLeft(trialStart);
    if (left > 0) return `Trial active · ${left} ${left === 1 ? 'day' : 'days'} left`;
    return 'Trial ended · unpurchased companions have limited memory';
  };

  const section = (t) => <p style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>{t}</p>;
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 };

  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Settings</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 40px' }}>
        {section('You')}
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textSoft, fontSize: 13 }}>Name</span><span style={{ fontSize: 13, fontWeight: 500 }}>{profile.name}</span></div>
        {profile.astrology && <div style={{ ...card, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textSoft, fontSize: 13 }}>Stars</span><span style={{ fontSize: 13, fontWeight: 500 }}>{profile.astrology.westernData.sym} {cap(profile.astrology.western)}</span></div>}
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.textSoft, fontSize: 13 }}>Mode</span><span style={{ fontSize: 13, fontWeight: 500 }}>{profile.ageGroup === 'under18' ? 'Under 18 (friendship only)' : '18+'}</span></div>

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
              </>
            ) : (
              <button onClick={onSignIn} style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", border: `1px solid ${C.glow1}55`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: 13, color: C.glow1, fontWeight: 500 }}>Sign in / Create account</div><div style={{ fontSize: 11, color: C.textDim }}>Sync your companions across devices</div></div>
                <span style={{ color: C.glow1 }}>›</span>
              </button>
            )}
          </>
        )}

        <div style={{ height: 10 }} />
        {section('Voice')}
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 13 }}>Auto-speak</div><div style={{ fontSize: 11, color: C.textDim }}>Companions read messages aloud</div></div>
          <Toggle on={autoSpeak} onClick={() => onAutoSpeak(!autoSpeak)} />
        </div>

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
        {section('Data')}
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

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 44, height: 26, borderRadius: 50, border: 'none', cursor: 'pointer', background: on ? C.glow1 : C.border, position: 'relative', transition: 'background 0.2s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );
}
