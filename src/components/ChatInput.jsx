import React, { useState, useRef, useEffect } from 'react';
import { C } from '../theme.js';

// The chat's message composer, extracted into its own component so typing only
// re-renders this tiny tree — NOT the whole transcript (which made every
// keystroke re-render hundreds of message bubbles on long histories).
//
// The draft text lives here. The parent gets it only on send/ask-room, and can
// reach in (set text from voice input, focus after a reply) via `apiRef`.
export default function ChatInput({ apiRef, placeholder, loading, canAskRoom, onSend, onAskRoom, onStop, onPickPhoto, scrollRef, atBottomRef }) {
  const [text, setText] = useState('');
  const taRef = useRef(null);

  // Imperative surface for the parent (voice dictation, refocus after replies).
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      setText: (t) => { setText(t); requestAnimationFrame(grow); },
      focus: () => taRef.current?.focus(),
      clear,
    };
    return () => { if (apiRef.current) apiRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef]);

  const grow = () => {
    const el = taRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
  };
  const pinBottom = () => {
    const el = scrollRef?.current;
    if (el && atBottomRef?.current) el.scrollTop = el.scrollHeight;
  };
  function clear() {
    setText('');
    if (taRef.current) taRef.current.style.height = 'auto';
  }
  function submit() {
    const t = text.trim();
    if (!t || loading) return;
    clear();
    onSend(t);
  }
  function askRoom() {
    const t = text.trim();
    if (!t || loading) return;
    clear();
    onAskRoom(t);
  }

  const has = !!text.trim();
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
      <button aria-label="Share a photo" title="Share a photo" onClick={onPickPhoto} disabled={loading} style={{ width: 38, height: 38, borderRadius: '50%', background: 'transparent', border: `1px solid ${C.border}`, color: loading ? C.textDim : C.textSoft, fontSize: 16, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📷</button>
      {canAskRoom && <button aria-label="Ask the room — everyone weighs in" title="Ask the room" onClick={askRoom} disabled={loading || !has} style={{ width: 38, height: 38, borderRadius: '50%', background: 'transparent', border: `1px solid ${C.border}`, color: (loading || !has) ? C.textDim : C.textSoft, fontSize: 15, cursor: (loading || !has) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🗣</button>}
      <textarea ref={taRef} value={text} rows={1}
        onChange={(e) => { setText(e.target.value); grow(); pinBottom(); }}
        onFocus={() => { if (atBottomRef?.current) setTimeout(pinBottom, 100); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        placeholder={placeholder}
        style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '10px 14px', fontSize: 13, color: C.text, outline: 'none', resize: 'none', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4, maxHeight: 120, overflowY: 'auto' }} />
      {loading ? (
        <button aria-label="Stop generating" onClick={onStop} style={{ width: 38, height: 38, borderRadius: '50%', background: C.danger, border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>■</button>
      ) : (
        <button aria-label="Send message" onClick={submit} disabled={!has} style={{ width: 38, height: 38, borderRadius: '50%', background: has ? C.glow1 : C.border, border: 'none', color: '#fff', fontSize: 14, cursor: has ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
      )}
    </div>
  );
}
