import React, { useState } from 'react';
import { C } from '../theme.js';
import { Shell } from '../components/ui.jsx';
import { LEGAL_DOCS } from '../data/legal.js';

// Minimal markdown renderer for the legal docs: ## / ### headings, "- " bullet
// groups, blank-line paragraphs, and **bold** inline. No dependencies.
function inline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color: C.text }}>{p.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

function renderMd(md) {
  const lines = md.split('\n');
  const out = [];
  let bullets = null;
  const flush = () => {
    if (bullets) {
      out.push(
        <ul key={'ul' + out.length} style={{ margin: '0 0 12px', paddingLeft: 20, color: C.textSoft, fontSize: 13.5, lineHeight: 1.6 }}>
          {bullets.map((b, i) => <li key={i} style={{ marginBottom: 6 }}>{inline(b)}</li>)}
        </ul>
      );
      bullets = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('- ')) { (bullets ||= []).push(line.slice(2)); continue; }
    flush();
    if (!line.trim()) continue;
    if (line.startsWith('### ')) {
      out.push(<h3 key={out.length} style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '18px 0 6px' }}>{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      out.push(<h2 key={out.length} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: C.text, margin: '26px 0 8px' }}>{line.slice(3)}</h2>);
    } else {
      out.push(<p key={out.length} style={{ margin: '0 0 12px', color: C.textSoft, fontSize: 13.5, lineHeight: 1.65 }}>{inline(line)}</p>);
    }
  }
  flush();
  return out;
}

export default function Legal({ docKey = 'tos', onBack }) {
  const doc = LEGAL_DOCS[docKey] || LEGAL_DOCS.tos;
  return (
    <Shell>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textSoft, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{doc.title}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px 48px' }}>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase', color: C.glow1, margin: '0 0 4px' }}>Other · AI Companion App</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 700, margin: '0 0 4px' }}>{doc.title}</h1>
        {doc.effective && <p style={{ fontSize: 12, color: C.textDim, margin: '0 0 18px' }}>Effective {doc.effective} · Operated by Extratac LLC</p>}
        {renderMd(doc.md)}
      </div>
    </Shell>
  );
}

// Drop-in inline link that opens a legal doc as a full-screen overlay. Works
// anywhere (Welcome, Auth, Settings) without touching app-level routing.
export function LegalLink({ docKey = 'tos', children, style }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'none', border: 'none', padding: 0, color: C.glow1, fontSize: 'inherit', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", textDecoration: 'underline', ...style }}
      >
        {children || LEGAL_DOCS[docKey]?.title}
      </button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
          <Legal docKey={docKey} onBack={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
