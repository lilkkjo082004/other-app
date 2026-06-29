import React, { useState } from 'react';
import { C } from '../theme.js';
import { COMPANION_PRICE } from '../lib/entitlements.js';
import { unlockCompanion } from '../lib/purchase.js';
import Avatar from './Avatar.jsx';

// One-time unlock modal. Calls onClose(true) on success, onClose(false) otherwise.
export default function UnlockSheet({ companion, onClose }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const col = companion.color.primary;

  async function buy() {
    setProcessing(true);
    setError(null);
    try {
      const ok = await unlockCompanion(companion);
      if (ok) onClose(true);
      else { setProcessing(false); setError('Purchase did not complete. Please try again.'); }
    } catch (e) {
      setProcessing(false);
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <div onClick={() => !processing && onClose(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: C.card, borderTop: `1px solid ${C.border}`, borderRadius: '22px 22px 0 0', padding: '20px 24px 28px', textAlign: 'center', animation: 'fadeUp 0.3s both' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 20px' }} />
        <div style={{ width: 76, margin: '0 auto' }}><Avatar comp={companion} size={76} /></div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700, margin: '16px 0 8px' }}>Keep {companion.name} for good</h2>
        <p style={{ color: C.textSoft, fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>Unlock {companion.name} with a one-time purchase. Their memory, growth, and everything they've become with you come back — for good, no subscription.</p>
        {error && <p style={{ color: C.danger, fontSize: 12, marginBottom: 10 }}>{error}</p>}
        <button onClick={buy} disabled={processing} style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', cursor: processing ? 'default' : 'pointer', background: `linear-gradient(135deg,${C.glow1},${C.glow2})`, color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", boxShadow: `0 8px 24px rgba(124,91,245,0.35)`, opacity: processing ? 0.7 : 1 }}>
          {processing ? 'Unlocking…' : `Unlock · ${COMPANION_PRICE}`}
        </button>
        <button onClick={() => !processing && onClose(false)} style={{ marginTop: 8, background: 'none', border: 'none', color: C.textSoft, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Maybe later</button>
      </div>
    </div>
  );
}
