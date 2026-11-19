import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { writeQuickVideo, getQuickVideo, markQuickVideoMade, getVideoResults, createQuickVideo } from '../../api';
import { BLANK, H, W, TOTAL, drawFrame, qrImage, recordQuickVideo } from '../../lib/quickVideo';
import { videoSupported } from '../../lib/adRender';
import { shareFile } from '../../lib/shareCard';

const LANGS = [['en', 'English'], ['pcm', 'Pidgin'], ['yo', 'Yorùbá'], ['ha', 'Hausa'], ['ig', 'Igbo']];
const IDEAS = ['Christmas data deals', 'Pay NEPA light bill in seconds', 'Get your own account number', 'Sell recharge cards from your phone', 'Turn extra airtime into cash'];
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const label = { display: 'block', fontSize: 13, color: 'var(--slate-400)', margin: '8px 0 4px' };

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function Field({ name, value, onChange, max = 60 }) {
  return (
    <>
      <label style={label}>{name}</label>
      <input value={value || ''} maxLength={max} onChange={(e) => onChange(e.target.value)} />
    </>
  );
}

// Ad Studio → ⚡ Quick video: idea → AI lines → the browser records an
// ~18-second brand video with its own QR tag; results per video.
export default function QuickVideoPanel() {
  const [params] = useSearchParams();
  const [idea, setIdea] = useState('');
  const [language, setLanguage] = useState('en');
  const [script, setScript] = useState(null);
  const [tag, setTag] = useState(null);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState(null);
  const [video, setVideo] = useState(null);
  const [copied, setCopied] = useState('');
  const [results, setResults] = useState(null);
  const preview = useRef(null);

  const loadResults = () => getVideoResults().then((r) => setResults(r.videos || [])).catch(() => setResults([]));
  useEffect(() => { loadResults(); }, []);

  // Opened from the AI assistant: ?tab=quick&tag=<tag>
  useEffect(() => {
    const t = params.get('tag');
    if (!t || t === tag?.tag) return;
    getQuickVideo(t).then((v) => { setTag(v); setScript(v.script); setIdea(v.label || ''); setLanguage(v.language || 'en'); setVideo(null); }).catch((e) => setMsg({ error: e.message }));
  }, [params]);

  // Live preview of the ending (with QR) or the scene being edited.
  useEffect(() => {
    if (!script || !preview.current) return;
    let alive = true;
    const url = tag?.link || 'https://www.zappipay.com.ng';
    qrImage(url).then((qr) => {
      if (!alive || !preview.current) return;
      const ctx = preview.current.getContext('2d');
      drawFrame(ctx, script, 8.6, qr, 'www.zappipay.com.ng');
    });
    return () => { alive = false; };
  }, [JSON.stringify(script), tag?.link]);

  const set = (part, key, value) => setScript((s) => ({ ...s, [part]: { ...s[part], [key]: value } }));
  const setPoint = (k, value) => setScript((s) => { const points = [...(s.offer.points || [])]; points[k] = value; return { ...s, offer: { ...s.offer, points } }; });

  async function write() {
    if (!idea.trim()) return setMsg({ error: 'Describe the video first.' });
    setBusy('write');
    setMsg(null);
    setVideo(null);
    try {
      const r = await writeQuickVideo({ idea, language });
      setScript(r.script);
      setTag(r);
    } catch (e) {
      setMsg({ error: e.message });
    } finally {
      setBusy('');
    }
  }

  function writeMyself() {
    setScript(JSON.parse(JSON.stringify(BLANK)));
    setTag(null);
    setVideo(null);
    setMsg(null);
  }

  async function make() {
    setBusy('make');
    setMsg(null);
    setProgress(0);
    try {
      let t = tag;
      if (!t) {
        t = await createQuickVideo({ idea: idea || script.opening.big, language, script });
        setTag(t);
      }
      const v = await recordQuickVideo(script, t.link, setProgress);
      setVideo({ ...v, url: URL.createObjectURL(v.blob), tag: t.tag });
      markQuickVideoMade(t.tag, script).then(loadResults).catch(() => {});
    } catch (e) {
      setMsg({ error: e.message });
    } finally {
      setBusy('');
    }
  }

  async function copyCaption() {
    try { await navigator.clipboard.writeText(script.caption || ''); setCopied('Copied ✓'); } catch { setCopied('Could not copy'); }
    setTimeout(() => setCopied(''), 1500);
  }

  const file = video ? `zappipay-${video.tag}.${video.ext}` : '';

  return (
    <div>
      <div className="card">
        <label style={label} htmlFor="qv-idea">Your idea</label>
        <textarea id="qv-idea" rows={3} value={idea} maxLength={300} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Christmas data deals for students, in Pidgin" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
          {IDEAS.map((x) => <button key={x} type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => setIdea(x)}>{x}</button>)}
        </div>
        <label style={label} htmlFor="qv-lang">Language</label>
        <select id="qv-lang" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" className="btn" style={{ width: 'auto' }} disabled={busy === 'write'} onClick={write}>{busy === 'write' ? 'Writing…' : script ? '✨ Write it again' : '✨ Write it with AI'}</button>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={writeMyself}>Write it myself</button>
        </div>
        {msg?.error && <p className="error" style={{ marginTop: 10 }}>{msg.error}</p>}
      </div>

      {script && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Your video (change anything)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'start' }}>
            <div>
              <h4 style={{ margin: '4px 0' }}>1. Opening</h4>
              <Field name="Big line" value={script.opening.big} onChange={(v) => set('opening', 'big', v)} max={40} />
              <Field name="Small line" value={script.opening.small} onChange={(v) => set('opening', 'small', v)} max={70} />
              <h4 style={{ margin: '14px 0 4px' }}>2. Offer</h4>
              <Field name="Service / offer" value={script.offer.title} onChange={(v) => set('offer', 'title', v)} max={30} />
              <Field name="Gold tag (optional)" value={script.offer.highlight} onChange={(v) => set('offer', 'highlight', v)} max={24} />
              {[0, 1, 2].map((k) => <Field key={k} name={`Point ${k + 1}`} value={script.offer.points?.[k]} onChange={(v) => setPoint(k, v)} max={40} />)}
              <h4 style={{ margin: '14px 0 4px' }}>3. Message</h4>
              <Field name="Title" value={script.message.title} onChange={(v) => set('message', 'title', v)} max={40} />
              <Field name="Text" value={script.message.text} onChange={(v) => set('message', 'text', v)} max={90} />
              <h4 style={{ margin: '14px 0 4px' }}>4. Ending (QR code + link)</h4>
              <Field name="Call to action" value={script.ending.cta} onChange={(v) => set('ending', 'cta', v)} max={40} />
              <label style={label}>Caption for your post</label>
              <textarea rows={3} value={script.caption || ''} maxLength={600} onChange={(e) => setScript((s) => ({ ...s, caption: e.target.value }))} />
              <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Check every line before posting — only true facts, no prices you don’t charge. {tag ? <>QR link: <b>{tag.link.replace(/^https:\/\//, '')}</b></> : 'The QR tag is made when you make the video.'}</p>
            </div>
            <div>
              <canvas ref={preview} width={W} height={H} style={{ width: 200, borderRadius: 12, display: 'block', background: '#000' }} aria-label="Preview of the offer scene" />
              <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Preview · {TOTAL} seconds · tall 9:16</p>
            </div>
          </div>
          {!videoSupported() && <p className="error">This browser can’t record videos. Use Chrome on Android or a computer.</p>}
          <button type="button" className="btn" style={{ width: 'auto', marginTop: 12 }} disabled={busy === 'make' || !videoSupported()} onClick={make}>
            {busy === 'make' ? `Recording… ${Math.round(progress * 100)}% — keep the screen on` : '🎬 Make the video'}
          </button>
        </div>
      )}

      {video && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Your video is ready</h3>
          <video src={video.url} controls playsInline style={{ width: '100%', maxWidth: 320, borderRadius: 12, background: '#000', display: 'block' }} />
          <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>{video.seconds} s · {video.ext.toUpperCase()} · QR tagged “{video.tag}”. Add music from the posting app’s own library.</p>
          {script.caption && <p style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{script.caption}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn" style={{ width: 'auto', background: '#16a34a' }} onClick={() => shareFile(video.blob, file, script.caption)}>Share</button>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => save(video.blob, file)}>Download ({video.ext.toUpperCase()})</button>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={copyCaption}>{copied || 'Copy caption'}</button>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy === 'make'} onClick={make}>Make it again</button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>📊 Which videos worked</h3>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 0 }}>People who opened the app from each video’s QR code or link, signed up, and bought. Boost the ones that bring buyers.</p>
        {!results ? <p>Loading…</p> : !results.length ? <p style={{ fontSize: 14 }}>No videos yet — make one above.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'left', color: 'var(--slate-400)' }}><th>Video</th><th>Visits</th><th>Sign-ups</th><th>Buyers</th><th>Sales</th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.tag} style={{ borderTop: '1px solid var(--slate-700, #334155)' }}>
                    <td style={{ padding: '6px 4px' }}><b>{r.tag}</b><br /><span style={{ color: 'var(--slate-400)' }}>{r.label}</span></td>
                    <td>{r.visits}</td><td>{r.signups}</td><td>{r.buyers}</td><td>{naira(r.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
