import { useEffect, useRef, useState } from 'react';
import { getVoiceStatus, transcribeVoice } from '../api';
import { getLang } from '../lib/i18n';

// 🎤 Talk instead of typing. Uses the better OpenAI voice when the owner
// has switched it on; otherwise (or if it fails) the phone's own free
// speech recognition. The words go into the message box so the customer
// can check them before sending.
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const SR_LANG = { en: 'en-NG', pcm: 'en-NG', yo: 'yo-NG', ha: 'ha-NG', ig: 'ig-NG' };
const canRecord = () => typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && navigator.mediaDevices?.getUserMedia;

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export default function VoiceButton({ onText, onNote, disabled }) {
  const [enhanced, setEnhanced] = useState(false);
  const [maxSeconds, setMaxSeconds] = useState(60);
  const [mode, setMode] = useState(''); // '', 'recording', 'listening', 'working'
  const [secs, setSecs] = useState(0);
  const rec = useRef(null);
  const recog = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    getVoiceStatus().then((s) => { setEnhanced(Boolean(s.enhanced) && canRecord()); if (s.maxSeconds) setMaxSeconds(Math.min(60, s.maxSeconds)); }).catch(() => setEnhanced(false));
    return () => { clearInterval(timer.current); rec.current?.stream?.getTracks().forEach((t) => t.stop()); recog.current?.abort?.(); };
  }, []);

  if (!enhanced && !SR) return null;

  function startFree(prefix = '') {
    if (!SR) { onNote?.('Voice is not supported on this phone. Please type instead.'); return; }
    const r = new SR();
    r.lang = SR_LANG[getLang()] || 'en-NG';
    r.interimResults = true;
    r.continuous = false;
    let final = '';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      onText(`${prefix}${final}${interim}`.trim());
    };
    r.onerror = (e) => { if (e.error === 'not-allowed') onNote?.('Allow the microphone to use voice.'); else if (e.error !== 'aborted' && e.error !== 'no-speech') onNote?.('Could not hear that. Try again or type.'); };
    r.onend = () => setMode('');
    recog.current = r;
    setMode('listening');
    try { r.start(); } catch { setMode(''); }
  }

  async function startRecording() {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onNote?.('Allow the microphone to use voice.');
      return;
    }
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    const mimeType = types.find((t) => window.MediaRecorder.isTypeSupported?.(t)) || '';
    const mr = new window.MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 24000 } : undefined);
    const chunks = [];
    const started = Date.now();
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      clearInterval(timer.current);
      stream.getTracks().forEach((t) => t.stop());
      const seconds = Math.round((Date.now() - started) / 1000);
      if (seconds < 1 || !chunks.length) { setMode(''); return; }
      setMode('working');
      try {
        const audio = await toDataUrl(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }));
        const r = await transcribeVoice({ audio, seconds, language: getLang() });
        if (r.text) onText(r.text); else onNote?.('Could not hear that. Try again.');
        setMode('');
      } catch (e) {
        setMode('');
        if (e.code === 'VOICE_OFF') setEnhanced(false);
        if (SR) { onNote?.('Using your phone’s voice typing instead — speak again.'); startFree(); } else onNote?.(e.message || 'Voice did not work. Please type.');
      }
    };
    rec.current = mr;
    mr.stream = stream;
    setSecs(0);
    setMode('recording');
    mr.start(250);
    timer.current = setInterval(() => {
      const s = Math.round((Date.now() - started) / 1000);
      setSecs(s);
      if (s >= maxSeconds) mr.state === 'recording' && mr.stop();
    }, 250);
  }

  function tap() {
    if (mode === 'recording') { rec.current?.state === 'recording' && rec.current.stop(); return; }
    if (mode === 'listening') { recog.current?.stop(); return; }
    if (mode === 'working') return;
    if (enhanced) startRecording(); else startFree();
  }

  const active = mode === 'recording' || mode === 'listening';
  return (
    <button
      type="button"
      onClick={tap}
      disabled={disabled || mode === 'working'}
      aria-label={active ? 'Stop recording' : 'Speak your message'}
      title={enhanced ? 'Speak (better voice)' : 'Speak'}
      style={{ flexShrink: 0, minWidth: 44, height: 40, borderRadius: 10, border: `1px solid ${active ? 'var(--red-500)' : 'var(--slate-700)'}`, background: active ? 'rgba(239,68,68,0.15)' : 'transparent', color: active ? 'var(--red-500)' : 'var(--slate-100)', cursor: 'pointer', fontSize: 16, padding: '0 8px', whiteSpace: 'nowrap' }}
    >
      {mode === 'working' ? '…' : mode === 'recording' ? `■ ${secs}s` : mode === 'listening' ? '■' : '🎤'}
    </button>
  );
}
