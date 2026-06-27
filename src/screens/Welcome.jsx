import React, { useState, useEffect } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { LegalLink } from './Legal.jsx';

export default function Welcome({ onStart, onSignIn }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShown(true), 150); return () => clearTimeout(t); }, []);
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 32, textAlign: 'center', opacity: shown ? 1 : 0, transform: shown ? 'none' : 'translateY(20px)', transition: 'all 0.9s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width: 90, height: 90, borderRadius: '50%', background: `linear-gradient(135deg,${C.glow1},${C.glow2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, animation: 'pulse 4s ease-in-out infinite', boxShadow: '0 0 60px rgba(124,91,245,0.3)', marginBottom: 40 }}>✦</div>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 500, letterSpacing: 4, textTransform: 'uppercase', color: C.glow1, marginBottom: 16 }}>Introducing</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 52, fontWeight: 700, margin: '0 0 16px', letterSpacing: -1 }}>Other</h1>
        <p style={{ color: C.textSoft, fontSize: 16, lineHeight: 1.7, maxWidth: 320, marginBottom: 48 }}>Companions who choose their own names, form their own opinions, and grow alongside you.</p>
        <button className="bp" onClick={onStart} style={{ padding: '16px 52px', fontSize: 16 }}>Begin ✦</button>
        {onSignIn && (
          <button onClick={onSignIn} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 13, cursor: 'pointer', marginTop: 22, fontFamily: "'DM Sans',sans-serif" }}>
            Have an account? <span style={{ color: C.glow1 }}>Sign in</span>
          </button>
        )}
        <p style={{ color: C.textDim, fontSize: 11, lineHeight: 1.6, maxWidth: 300, marginTop: 28 }}>
          By continuing you agree to our <LegalLink docKey="tos">Terms of Service</LegalLink> and <LegalLink docKey="privacy">Privacy Policy</LegalLink>.
        </p>
      </div>
    </Shell>
  );
}
