import React, { useState } from 'react';
import { C } from '../theme.js';
import { CHECKOUT_URL, MANAGE_URL, PLUS_PRICE, billingEnabled } from '../config.js';
import { isAuthed } from '../lib/api.js';

// "Other Plus" subscription paywall. Entitlement is verified server-side (the
// /ai model is chosen by tier), so this is purely the upgrade/manage UX. Real
// checkout opens the configured hosted page (Stripe / RevenueCat) carrying the
// user id + email; until CHECKOUT_URL is set, upgrade is shown but disabled.
const PLUS_PERKS = [
  'Smarter companions (premium model)',
  'Unlimited messages',
  'All three companions',
  'Natural (lifelike) voices',
  'Priority responses',
];

function checkoutHref(uid, email) {
  try {
    const u = new URL(CHECKOUT_URL);
    if (uid) u.searchParams.set('client_reference_id', uid);
    if (email) u.searchParams.set('prefilled_email', email);
    return u.toString();
  } catch (e) { return CHECKOUT_URL; }
}

export default function Paywall({ premium, uid, email, onRefresh, onClose }) {
  const [launched, setLaunched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const canBuy = billingEnabled() && isAuthed();

  async function refresh() {
    setRefreshing(true);
    try { await onRefresh?.(); } finally { setRefreshing(false); }
  }

  return (
    <div onClick={() => onClose?.()} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: C.card, borderTop: `1px solid ${C.border}`, borderRadius: '22px 22px 0 0', padding: '20px 24px 28px', textAlign: 'center', animation: 'fadeUp 0.3s both' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 18px' }} />

        {premium ? (
          <>
            <div style={{ fontSize: 34 }}>✦</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700, margin: '8px 0 6px' }}>You’re on Other Plus</h2>
            <p style={{ color: C.textSoft, fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>Your companions are running on the premium model, with everything unlocked. Thank you for supporting Other ♡</p>
            {MANAGE_URL && <a href={MANAGE_URL} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', padding: '13px', borderRadius: 14, background: C.surfaceUp, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Manage subscription</a>}
            <button onClick={refresh} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{refreshing ? 'Refreshing…' : 'Refresh status'}</button>
          </>
        ) : (
          <>
            <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: `${C.glow2}1f`, border: `1px solid ${C.glow2}66`, fontSize: 11, color: C.glow2, fontWeight: 700, letterSpacing: 1 }}>OTHER PLUS</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 25, fontWeight: 700, margin: '12px 0 4px' }}>Go deeper with your companions</h2>
            <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 16 }}>{PLUS_PRICE}</div>
            <div style={{ textAlign: 'left', margin: '0 auto 18px', maxWidth: 280 }}>
              {PLUS_PERKS.map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, fontSize: 13.5, color: C.text }}>
                  <span style={{ color: C.glow2, fontWeight: 700 }}>✓</span>{p}
                </div>
              ))}
            </div>

            {!isAuthed() && <p style={{ color: C.textDim, fontSize: 12, marginBottom: 10 }}>Create an account or sign in first so your subscription follows you across devices.</p>}
            {isAuthed() && !billingEnabled() && <p style={{ color: C.textDim, fontSize: 12, marginBottom: 10 }}>Subscriptions aren’t available just yet — check back soon.</p>}

            {canBuy ? (
              <a href={checkoutHref(uid, email)} target="_blank" rel="noreferrer" onClick={() => setLaunched(true)}
                style={{ display: 'block', textDecoration: 'none', padding: '15px', borderRadius: 14, background: `linear-gradient(135deg,${C.glow1},${C.glow2})`, color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 8px 24px rgba(124,91,245,0.35)' }}>
                Upgrade · {PLUS_PRICE}
              </a>
            ) : (
              <button disabled style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: C.border, color: C.textDim, fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'default' }}>Upgrade · {PLUS_PRICE}</button>
            )}

            {launched && (
              <button onClick={refresh} style={{ marginTop: 10, width: '100%', padding: '12px', borderRadius: 12, background: C.surfaceUp, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{refreshing ? 'Checking…' : 'I’ve upgraded — refresh'}</button>
            )}
            <button onClick={refresh} style={{ marginTop: 8, background: 'none', border: 'none', color: C.textSoft, fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>{refreshing ? 'Restoring…' : 'Restore purchase'}</button>
            <div style={{ height: 4 }} />
            <button onClick={() => onClose?.()} style={{ marginTop: 6, background: 'none', border: 'none', color: C.textDim, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Maybe later</button>
          </>
        )}
      </div>
    </div>
  );
}
