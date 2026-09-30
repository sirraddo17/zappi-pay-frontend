import { useEffect, useState } from 'react';
import { getSettings, updateSettings, getAdminVoiceStatus } from '../../api';

// Settings → AI Assistant → Voice notes. The phone's own voice typing is
// always on for customers (free). This switches the better OpenAI voice
// on or off; when it's off, over budget or failing, the free one is used.
export default function VoiceSettingsPanel() {
  const [s, setS] = useState(null);
  const [st, setSt] = useState(null);
  const [key, setKey] = useState('');
  const [on, setOn] = useState(false);
  const [budget, setBudget] = useState('5');
  const [daily, setDaily] = useState('20');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function load() {
    getSettings().then((d) => {
      const x = d.settings || d;
      setS(x);
      setOn(Boolean(x.voiceAiEnabled));
      setBudget(String(Number(x.voiceMonthlyBudgetUsd ?? 5)));
      setDaily(String(x.voiceDailyLimit ?? 20));
    }).catch((e) => setMsg({ ok: false, text: e.message }));
    getAdminVoiceStatus().then(setSt).catch(() => {});
  }
  useEffect(load, []);
  if (!s) return null;

  async function save(e, extra = {}) {
    e?.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await updateSettings({ voiceAiEnabled: on, voiceMonthlyBudgetUsd: Number(budget), voiceDailyLimit: Number(daily), ...(key.trim() ? { openaiApiKey: key.trim() } : {}), ...extra });
      setKey('');
      setMsg({ ok: true, text: on ? 'Saved — customers now get the better voice (with the free one as backup).' : 'Saved — customers use their phone’s free voice typing.' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const pct = st && st.budgetUsd > 0 ? Math.min(100, Math.round((st.monthUsd / st.budgetUsd) * 100)) : null;
  return (
    <form className="card" style={{ margin: '16px 0 0', maxWidth: 520 }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>🎤 Voice notes</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -4 }}>
        Customers can tap 🎤 in the Help chat and speak instead of typing. <b>The phone’s own voice typing is always on and free</b> (good for English; weaker for Pidgin, Yorùbá, Hausa and Igbo). Turn on the better voice below for much more accurate results with Nigerian accents and languages.
      </p>
      {msg && <p style={{ color: msg.ok ? 'var(--green-500)' : 'var(--red-500)', fontSize: 14 }}>{msg.text}</p>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, fontWeight: 600 }}>
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} style={{ width: 'auto' }} /> Better voice (OpenAI) — about $0.003 per minute
      </label>
      <div className="field">
        <label htmlFor="oaKey">OpenAI API key</label>
        <input id="oaKey" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={s.openaiApiKeySet ? `Saved (${s.openaiApiKeyHint}) — paste a new one to replace` : 'sk-…'} />
        <small style={{ color: 'var(--slate-400)' }}>
          From platform.openai.com → API keys. Set a monthly limit there too.{' '}
          {s.openaiApiKeySet && <button type="button" onClick={(e) => window.confirm('Remove the OpenAI key? Customers will use the free phone voice.') && save(e, { openaiApiKeyClear: true, voiceAiEnabled: false })} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', padding: 0, fontSize: 12 }}>Remove key</button>}
        </small>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: '1 1 160px' }}>
          <label htmlFor="vBudget">Monthly budget ($)</label>
          <input id="vBudget" type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <small style={{ color: 'var(--slate-400)' }}>$5 ≈ 1,600 minutes. 0 = no limit.</small>
        </div>
        <div className="field" style={{ flex: '1 1 160px' }}>
          <label htmlFor="vDaily">Voice notes per customer per day</label>
          <input id="vDaily" type="number" min="1" value={daily} onChange={(e) => setDaily(e.target.value)} />
          <small style={{ color: 'var(--slate-400)' }}>After this, the free voice is used.</small>
        </div>
      </div>
      <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Saving…' : 'Save voice settings'}</button>
      {st && (
        <div style={{ borderTop: '1px solid var(--slate-700)', marginTop: 14, paddingTop: 10, fontSize: 14 }}>
          This month: {st.notes} voice note{st.notes === 1 ? '' : 's'} · about <b>${st.monthUsd.toFixed(3)}</b>{st.budgetUsd > 0 ? ` of $${st.budgetUsd}` : ''}
          {pct !== null && <div style={{ height: 6, background: 'var(--slate-700)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? 'var(--red-500)' : 'var(--purple)' }} /></div>}
          {st.enabled && !st.keySet && <div style={{ color: 'var(--gold)', fontSize: 12, marginTop: 6 }}>Better voice is on but no key is saved — customers are using the free voice.</div>}
        </div>
      )}
    </form>
  );
}
