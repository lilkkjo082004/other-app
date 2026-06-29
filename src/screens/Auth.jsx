import React, { useState } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { LegalLink } from './Legal.jsx';
import * as api from '../lib/api.js';

// Sign in / create account. On success, pulls the cloud session and hands it
// back via onAuthed(cloudState) (cloudState may be null for a brand-new account).
export default function Auth({ onAuthed, onBack }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const isSignup = mode === 'signup';

  async function submit() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (isSignup) await api.signup(email.trim().toLowerCase(), password);
      else await api.login(email.trim().toLowerCase(), password);
      const state = await api.pullState();
      onAuthed(state);
    } catch (e) {
      setBusy(false);
      setError(String(e.message || e));
    }
  }

  const inputStyle = { width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '13px 16px', fontSize: 15, color: C.text, outline: 'none', marginBottom: 10 };

  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 32 }}>
        <button onClick={onBack} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: C.textSoft, fontSize: 13, cursor: 'pointer', marginBottom: 20, fontFamily: "'DM Sans',sans-serif" }}>← Back</button>
        <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
        <p style={{ color: C.textSoft, fontSize: 13, marginBottom: 22, lineHeight: 1.5 }}>{isSignup ? 'Save your companions to the cloud so they follow you across devices.' : 'Sign in to bring your companions with you.'}</p>

        <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        <input type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder={isSignup ? 'Password (8+ characters)' : 'Password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} style={inputStyle} />

        {error && <p style={{ color: C.danger, fontSize: 12, margin: '2px 0 10px' }}>{error}</p>}

        <button className="bp" disabled={busy || !email.trim() || !password} onClick={submit} style={{ width: '100%', marginTop: 4 }}>
          {busy ? 'Just a moment…' : (isSignup ? 'Create account' : 'Sign in')}
        </button>

        <button onClick={() => { setError(null); setMode(isSignup ? 'login' : 'signup'); }} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 13, cursor: 'pointer', marginTop: 16, fontFamily: "'DM Sans',sans-serif" }}>
          {isSignup ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>

        {isSignup && (
          <p style={{ color: C.textDim, fontSize: 11, lineHeight: 1.6, marginTop: 18 }}>
            By creating an account you agree to our <LegalLink docKey="tos">Terms of Service</LegalLink>, <LegalLink docKey="privacy">Privacy Policy</LegalLink>, and <LegalLink docKey="disclaimer">Disclaimer</LegalLink>.
          </p>
        )}
      </div>
    </Shell>
  );
}
