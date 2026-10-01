import { useEffect, useState } from 'react';
import { getOpenAiExtras, setOpenAiExtras } from '../../api';

const VOICE_LABEL = { coral: 'Coral — warm, female', nova: 'Nova — bright, female', shimmer: 'Shimmer — soft, female', sage: 'Sage — calm', alloy: 'Alloy — neutral', ballad: 'Ballad — gentle, male', ash: 'Ash — clear, male', echo: 'Echo — steady, male', onyx: 'Onyx — deep, male', fable: 'Fable — storyteller' };
const QUALITY = [['low', 'Low — cheapest (about 1–2¢)'], ['medium', 'Medium — good for social posts (about 4–6¢)'], ['high', 'High — best detail (about 17–25¢)']];

// Settings → AI Assistant: natural voice for chat replies + AI pictures
// for Ad Studio. Both OFF by default, each with its own monthly budget.
export default function OpenAiExtrasPanel() {
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    getOpenAiExtras().then((x) => {
      setD(x);
      setF({ ttsEnabled: x.tts.enabled, ttsVoice: x.tts.voice, ttsMonthlyBudgetUsd: String(x.tts.budgetUsd), ttsDailyLimit: String(x.tts.dailyLimit), adImagesEnabled: x.images.enabled, adImageQuality: x.images.quality, adImageMonthlyBudgetUsd: String(x.images.budgetUsd) });
    }).catch((e) => setMsg({ ok: false, text: e.message }));
  }
  useEffect(load, []);
  if (!f) return msg ? <p className="error-text">{msg.text}</p> : null;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const x = await setOpenAiExtras({ ...f, ttsMonthlyBudgetUsd: Number(f.ttsMonthlyBudgetUsd), ttsDailyLimit: Number(f.ttsDailyLimit), adImageMonthlyBudgetUsd: Number(f.adImageMonthlyBudgetUsd) });
      setD(x);
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const row = { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 };
  return (
    <form className="card" style={{ margin: 0, maxWidth: 620 }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>🗣️ Natural voice & 🖼️ AI pictures (OpenAI)</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -4 }}>Both use the OpenAI key from the Voice notes panel above{d.keySet ? ' ✓' : ' (not added yet)'}. Each has its own monthly budget — when it runs out, the feature quietly stops until next month.</p>
      {msg && <p style={{ color: msg.ok ? 'var(--green-500)' : 'var(--red-500)', fontSize: 14 }}>{msg.text}</p>}

      <div style={{ fontWeight: 600, margin: '6px 0' }}>Natural voice for Help chat replies</div>
      <label style={row}><input type="checkbox" checked={f.ttsEnabled} onChange={set('ttsEnabled')} style={{ width: 'auto' }} /> “🔊 Listen” uses a natural AI voice (English & Pidgin)</label>
      <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '-4px 0 10px' }}>About $0.015 per 1,000 characters — a typical reply costs under half a US cent. Yorùbá, Hausa and Igbo (and anything over budget) use the phone’s free voice. This month: ${d.tts.monthUsd.toFixed(3)} · {d.tts.replies} replies.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <div className="field"><label htmlFor="ttsV">Voice</label><select id="ttsV" value={f.ttsVoice} onChange={set('ttsVoice')}>{d.tts.voices.map((v) => <option key={v} value={v}>{VOICE_LABEL[v] || v}</option>)}</select></div>
        <div className="field"><label htmlFor="ttsB">Monthly budget (US$)</label><input id="ttsB" type="number" min="0" step="0.5" value={f.ttsMonthlyBudgetUsd} onChange={set('ttsMonthlyBudgetUsd')} /></div>
        <div className="field"><label htmlFor="ttsD">Per customer per day</label><input id="ttsD" type="number" min="1" max="500" value={f.ttsDailyLimit} onChange={set('ttsDailyLimit')} /></div>
      </div>

      <div style={{ fontWeight: 600, margin: '10px 0 6px' }}>AI background pictures in Ad Studio</div>
      <label style={row}><input type="checkbox" checked={f.adImagesEnabled} onChange={set('adImagesEnabled')} style={{ width: 'auto' }} /> Let me make photo-style backgrounds from a description</label>
      <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '-4px 0 10px' }}>You confirm the price before each picture. No brand logos, real or famous people. This month: ${d.images.monthUsd.toFixed(2)} · {d.images.images} pictures.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <div className="field"><label htmlFor="imgQ">Quality</label><select id="imgQ" value={f.adImageQuality} onChange={set('adImageQuality')}>{QUALITY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor="imgB">Monthly budget (US$)</label><input id="imgB" type="number" min="0" step="0.5" value={f.adImageMonthlyBudgetUsd} onChange={set('adImageMonthlyBudgetUsd')} /></div>
      </div>
      <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
