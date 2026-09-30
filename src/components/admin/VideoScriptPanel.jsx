import { useState } from 'react';
import { writeVideoScript } from '../../api';

const LANGS = [['en', 'English'], ['pcm', 'Pidgin'], ['yo', 'Yorùbá'], ['ha', 'Hausa'], ['ig', 'Igbo']];
const PLATFORMS = [['tiktok', 'TikTok'], ['reels', 'Instagram Reels'], ['status', 'WhatsApp Status'], ['facebook', 'Facebook'], ['shorts', 'YouTube Shorts']];
const TONES = [['friendly', 'Friendly'], ['funny', 'Funny'], ['hype', 'High energy'], ['calm', 'Calm & trusted']];
const IDEAS = ['Print recharge cards for shop owners', 'Send money to any bank — see the name first', 'Buy data in seconds, cashback every time', 'Turn extra airtime into cash', 'Pay light bill (NEPA) without stress', 'Invite friends and earn'];

async function copy(text, set) {
  try { await navigator.clipboard.writeText(text); set('Copied ✓'); } catch { set('Could not copy'); }
  setTimeout(() => set(''), 1500);
}

// Ad Studio → 🎬 Video script: the AI writes a script for an AI
// presenter (HeyGen / D-ID / CapCut) or a real person, for social media.
export default function VideoScriptPanel({ onHeygen }) {
  const [topic, setTopic] = useState('');
  const [seconds, setSeconds] = useState(30);
  const [language, setLanguage] = useState('pcm');
  const [platform, setPlatform] = useState('tiktok');
  const [tone, setTone] = useState('friendly');
  const [presenter, setPresenter] = useState('');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [s, setS] = useState(null);
  const [copied, setCopied] = useState('');

  async function go(e) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await writeVideoScript({ topic, seconds, language, platform, tone, presenter, extra });
      setS(d.script);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const all = s ? [s.title && `🎬 ${s.title}`, '', ...s.scenes.map((x) => `[${x.time}] ${x.visual}\n🗣 ${x.line}${x.onScreen ? `\n🔤 ${x.onScreen}` : ''}`), '', `Caption: ${s.caption}`, s.hashtags.join(' '), s.music && `Music: ${s.music}`].filter((x) => x !== false && x !== undefined).join('\n') : '';
  const chip = (on) => ({ padding: '5px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: `1px solid ${on ? 'var(--purple)' : 'var(--slate-700)'}`, background: on ? 'rgba(134,59,255,0.18)' : 'transparent', color: 'var(--slate-100)' });

  return (
    <div className="card" style={{ margin: '16px 0 0' }}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>🎬 Video script for social media</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -4 }}>
        The AI writes a short script for a talking presenter. Paste the presenter lines into HeyGen, D-ID or CapCut (AI presenter) — or read them yourself — then post on TikTok, Reels or Status. Uses your AI budget (about 1–2 US cents per script).
      </p>
      <form onSubmit={go}>
        <div className="field">
          <label htmlFor="vsTopic">What is the video about?</label>
          <input id="vsTopic" maxLength={300} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Print recharge cards for shop owners" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {IDEAS.map((i) => <button key={i} type="button" style={chip(topic === i)} onClick={() => setTopic(i)}>{i}</button>)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <div className="field"><label htmlFor="vsLen">Length</label><select id="vsLen" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>{[15, 30, 45, 60].map((n) => <option key={n} value={n}>{n} seconds</option>)}</select></div>
          <div className="field"><label htmlFor="vsLang">Language</label><select id="vsLang" value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="vsPlat">Where</label><select id="vsPlat" value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="vsTone">Tone</label><select id="vsTone" value={tone} onChange={(e) => setTone(e.target.value)}>{TONES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="vsPres">Presenter (optional)</label><input id="vsPres" maxLength={120} value={presenter} onChange={(e) => setPresenter(e.target.value)} placeholder="e.g. young woman in a small shop, Lagos" /></div>
        <div className="field"><label htmlFor="vsExtra">Anything else (optional)</label><input id="vsExtra" maxLength={400} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. mention agents pay less; end with our website" /></div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy || !topic.trim()}>{busy ? 'Writing…' : s ? 'Write another version' : 'Write the script'}</button>
      </form>

      {s && (
        <div style={{ borderTop: '1px solid var(--slate-700)', marginTop: 16, paddingTop: 12 }}>
          {s.title && <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{s.title}</h3>}
          {s.hook && <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--gold)' }}>Hook: {s.hook}</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {s.scenes.map((x, i) => (
              <div key={i} style={{ background: 'var(--slate-800)', borderRadius: 10, padding: 10, fontSize: 13 }}>
                <div style={{ color: 'var(--slate-400)', fontSize: 11 }}>{x.time} · {x.visual}</div>
                <div style={{ marginTop: 4 }}>🗣 {x.line}</div>
                {x.onScreen && <div style={{ marginTop: 4, color: 'var(--slate-300, #cbd5e1)' }}>🔤 {x.onScreen}</div>}
              </div>
            ))}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Presenter script (paste into HeyGen / D-ID)</label>
            <textarea readOnly value={s.presenterScript} rows={5} style={{ width: '100%', fontSize: 14 }} />
          </div>
          <p style={{ fontSize: 13, margin: '0 0 4px' }}><b>Caption:</b> {s.caption}</p>
          <p style={{ fontSize: 13, margin: '0 0 4px', color: 'var(--purple)' }}>{s.hashtags.join(' ')}</p>
          {s.music && <p style={{ fontSize: 12, margin: '0 0 4px', color: 'var(--slate-400)' }}>🎵 {s.music}</p>}
          {s.disclosure && <p style={{ fontSize: 12, margin: '0 0 8px', color: 'var(--slate-400)' }}>If you use an AI presenter, add: “{s.disclosure}”</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn" style={{ width: 'auto' }} onClick={() => copy(s.presenterScript, setCopied)}>Copy presenter lines</button>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => copy(`${s.caption}\n\n${s.hashtags.join(' ')}`, setCopied)}>Copy caption</button>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => copy(all, setCopied)}>Copy everything</button>
            {onHeygen && <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => onHeygen({ script: s.presenterScript, title: s.title, at: Date.now() })}>🎥 Make with HeyGen</button>}
            {copied && <span style={{ fontSize: 13, alignSelf: 'center', color: 'var(--green-500)' }}>{copied}</span>}
          </div>
          <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '10px 0 0' }}>Check every fact and price before posting. Use a stock AI presenter or your own face — never a celebrity or someone without their permission.</p>
        </div>
      )}
    </div>
  );
}
