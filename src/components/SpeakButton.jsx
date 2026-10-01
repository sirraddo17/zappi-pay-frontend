import { useEffect, useRef, useState } from 'react';
import { getLang } from '../lib/i18n';
import { getVoiceStatus, speakText } from '../api';

const LANG = { en: 'en-NG', pcm: 'en-NG', yo: 'yo-NG', ha: 'ha-NG', ig: 'ig-NG' };
let stopCurrent = null;
let natural = null; // promise, asked once per app session
let naturalInfo = null; // its answer, so a tap can decide without waiting
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

function loadNatural() {
  if (!natural) natural = getVoiceStatus().catch(() => ({ natural: false })).then((s) => { naturalInfo = s || { natural: false }; return naturalInfo; });
  return natural;
}
const naturalFor = (lang) => Boolean(naturalInfo?.natural && (naturalInfo.languages || []).includes(lang));

// 🔊 Reads a reply aloud. Uses the natural AI voice when the owner has
// turned it on (English/Pidgin); otherwise, or if it fails, the phone's
// own free voice.
export default function SpeakButton({ text }) {
  const [state, setState] = useState('idle'); // idle | loading | playing
  const audioRef = useRef(null);
  const phoneOk = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  useEffect(() => { loadNatural(); return () => { if (stopCurrent && audioRef.current) stopCurrent(); }; }, []);
  if (!text) return null;

  function stop() {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); audioRef.current = null; }
    setState('idle');
  }

  function phoneVoice() {
    if (!phoneOk) { setState('idle'); return; }
    const s = window.speechSynthesis;
    const u = new window.SpeechSynthesisUtterance(String(text).replace(/[*_#`]/g, '').replace(/₦/g, 'naira ').slice(0, 1500));
    const want = LANG[getLang()] || 'en-NG';
    const voices = s.getVoices() || [];
    const v = voices.find((x) => x.lang === want) || voices.find((x) => x.lang?.startsWith(want.slice(0, 2))) || voices.find((x) => /^en[-_](NG|GB)/.test(x.lang)) || null;
    if (v) u.voice = v;
    u.lang = v?.lang || 'en-NG';
    u.rate = 0.95;
    u.onend = () => setState('idle');
    u.onerror = () => setState('idle');
    s.speak(u);
    setState('playing');
  }

  async function play() {
    if (state !== 'idle') { stop(); return; }
    stopCurrent?.();
    stopCurrent = stop;
    window.speechSynthesis?.cancel();
    const lang = getLang();
    if (naturalFor(lang)) {
      // Start the audio element inside the tap so phones allow playback.
      const a = new Audio(SILENT);
      a.play().catch(() => {});
      audioRef.current = a;
      setState('loading');
      try {
        const blob = await speakText(text, lang);
        if (audioRef.current !== a) return; // stopped meanwhile
        a.src = URL.createObjectURL(blob);
        a.onended = () => stop();
        await a.play();
        setState('playing');
        return;
      } catch {
        audioRef.current = null; // fall back to the phone's voice
      }
    }
    phoneVoice();
  }

  return (
    <button type="button" onClick={play} aria-label={state === 'idle' ? 'Read aloud' : 'Stop reading'} title={state === 'idle' ? 'Read aloud' : 'Stop'}
      style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 13, padding: '2px 4px', marginTop: 2 }}>
      {state === 'loading' ? '⏳ Loading…' : state === 'playing' ? '⏹ Stop' : '🔊 Listen'}
    </button>
  );
}
