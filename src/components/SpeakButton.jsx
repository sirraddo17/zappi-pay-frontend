import { useEffect, useState } from 'react';
import { getLang } from '../lib/i18n';

const LANG = { en: 'en-NG', pcm: 'en-NG', yo: 'yo-NG', ha: 'ha-NG', ig: 'ig-NG' };
let speakingId = null;

// 🔊 Reads a reply aloud with the phone's own voice (free, offline on
// most phones). Hidden where the browser has no speech support.
export default function SpeakButton({ text, id }) {
  const [on, setOn] = useState(false);
  const ok = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  useEffect(() => () => { if (speakingId === id) window.speechSynthesis?.cancel(); }, [id]);
  if (!ok || !text) return null;

  function toggle() {
    const s = window.speechSynthesis;
    if (on) { s.cancel(); setOn(false); return; }
    s.cancel();
    const u = new window.SpeechSynthesisUtterance(String(text).replace(/[*_#`]/g, '').replace(/₦/g, 'naira ').slice(0, 1500));
    const want = LANG[getLang()] || 'en-NG';
    const voices = s.getVoices() || [];
    const v = voices.find((x) => x.lang === want) || voices.find((x) => x.lang?.startsWith(want.slice(0, 2))) || voices.find((x) => /^en[-_](NG|GB)/.test(x.lang)) || null;
    if (v) u.voice = v;
    u.lang = v?.lang || 'en-NG';
    u.rate = 0.95;
    u.onend = () => setOn(false);
    u.onerror = () => setOn(false);
    speakingId = id;
    s.speak(u);
    setOn(true);
  }

  return (
    <button type="button" onClick={toggle} aria-label={on ? 'Stop reading' : 'Read aloud'} title={on ? 'Stop' : 'Read aloud'}
      style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 13, padding: '2px 4px', marginTop: 2 }}>
      {on ? '⏹ Stop' : '🔊 Listen'}
    </button>
  );
}
