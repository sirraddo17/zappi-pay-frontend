import { useState } from 'react';
import { setLite, useLite, shouldSuggestLite, dismissLiteSuggestion } from '../lib/lite';

// Profile: Lite mode switch.
export default function LiteToggle({ style }) {
  const lite = useLite();
  return (
    <label className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', ...style }}>
      <span style={{ flex: 1 }}>
        <b style={{ display: 'block', fontSize: 15 }}>🪶 Lite mode (data saver)</b>
        <span style={{ fontSize: 13, color: 'var(--slate-400)' }}>Hides ads and promos, turns off animations and checks for updates less often. Good for slow networks.</span>
      </span>
      <input type="checkbox" checked={lite} onChange={(e) => setLite(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--purple)' }} aria-label="Lite mode" />
    </label>
  );
}

// Home: "Slow network? Turn on Lite mode" — shown once, only when the
// phone reports data saver or a 2G connection.
export function LiteSuggestion() {
  const [show, setShow] = useState(() => shouldSuggestLite());
  if (!show) return null;
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
      <span style={{ fontSize: 20 }} aria-hidden="true">🪶</span>
      <span style={{ flex: 1, fontSize: 13 }}><b>Slow network?</b> Lite mode uses less data and loads faster.</span>
      <button type="button" className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => { setLite(true); setShow(false); }}>Turn on</button>
      <button type="button" aria-label="No thanks" onClick={() => { dismissLiteSuggestion(); setShow(false); }} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: 18, cursor: 'pointer' }}>×</button>
    </div>
  );
}
