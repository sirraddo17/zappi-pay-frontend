import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOpenAiExtras, makeAdImage } from '../../api';

const SHAPES = [['square', 'Square'], ['tall', 'Tall (Status / story)'], ['wide', 'Wide (banner)']];
const IDEAS = ['Smiling market woman holding a phone in a busy Lagos market', 'Young man relaxing at home watching TV', 'Student with a phone at a university campus', 'Small shop owner selling recharge cards at a kiosk'];

// Ad Studio → ✨ AI background picture (paid, owner turns it on).
export default function AiPictureBox({ onPicture }) {
  const [st, setSt] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [shape, setShape] = useState('square');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => getOpenAiExtras().then((d) => setSt(d.images)).catch(() => setSt({ enabled: false }));
  useEffect(() => { load(); }, []);
  if (!st) return null;
  if (!st.ready) {
    return (
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>
        ✨ AI background pictures: {st.enabled && st.keySet ? 'this month’s budget is used up' : 'off'} — <Link to="/admin/settings" style={{ color: 'var(--purple)' }}>Settings → AI Assistant</Link>.
      </p>
    );
  }
  const price = st.prices[shape];

  async function go() {
    if (!window.confirm(`Make this picture? It costs about $${price.toFixed(3)} (${st.quality} quality).`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await makeAdImage({ prompt, shape });
      onPicture(r.image);
      setMsg({ ok: true, text: 'Done — it’s now the background. Make another to compare.' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const chip = (on) => ({ padding: '4px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: `1px solid ${on ? 'var(--purple)' : 'var(--slate-700)'}`, background: on ? 'rgba(134,59,255,0.18)' : 'transparent', color: 'var(--slate-100)' });
  return (
    <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'var(--slate-900)' }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>✨ Or make a background picture with AI</div>
      <textarea rows={2} maxLength={400} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the scene — people, place, mood. No text or logos needed; your headline goes on top." style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, fontFamily: 'inherit' }} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>{IDEAS.map((i) => <button key={i} type="button" style={chip(prompt === i)} onClick={() => setPrompt(i)}>{i}</button>)}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={shape} onChange={(e) => setShape(e.target.value)} style={{ width: 'auto', fontSize: 13 }} aria-label="Shape">{SHAPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <button type="button" className="btn" style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }} disabled={busy || prompt.trim().length < 4} onClick={go}>{busy ? 'Making… (up to a minute)' : `Make picture · ~$${price.toFixed(3)}`}</button>
        <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>This month ${st.monthUsd.toFixed(2)}{st.budgetUsd ? ` of $${st.budgetUsd}` : ''}</span>
      </div>
      {msg && <p style={{ color: msg.ok ? 'var(--green-500)' : 'var(--red-500)', fontSize: 13, margin: '6px 0 0' }}>{msg.text}</p>}
      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '6px 0 0' }}>AI-made picture of people who don’t exist. Some platforms ask you to label AI images — Meta/TikTok have an “AI-generated” toggle when posting.</p>
    </div>
  );
}
