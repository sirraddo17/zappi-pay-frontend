import { useState } from 'react';
import { planSocialWeek } from '../../api';

const LANGS = [['mix', 'English + a little Pidgin'], ['en', 'English'], ['pcm', 'Pidgin']];

async function copy(text, set) {
  try { await navigator.clipboard.writeText(text); set('Copied ✓'); } catch { set('Could not copy'); }
  setTimeout(() => set(''), 1500);
}

// Ad Studio → 📅 Plan my week: 7 days of posts. "Open in designer"
// loads that day's design into the studio above.
export default function WeekPlanPanel({ onOpen }) {
  const [focus, setFocus] = useState('');
  const [language, setLanguage] = useState('mix');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState(null);
  const [copied, setCopied] = useState('');

  async function go(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setDays((await planSocialWeek({ focus, language })).days);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ margin: '16px 0 0' }}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>📅 Plan my week</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -4 }}>The AI plans 7 days of posts — a design, caption and best time for each. Open any day in the designer above to download it. About 2–3 US cents per plan.</p>
      <form onSubmit={go} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '1 1 240px', margin: 0 }}>
          <label htmlFor="wpFocus">Focus this week (optional)</label>
          <input id="wpFocus" maxLength={300} value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. get shop owners to print cards" />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="wpLang">Language</label>
          <select id="wpLang" value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Planning…' : days ? 'Plan again' : 'Plan my week'}</button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {days && (
        <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          {days.map((d, i) => (
            <div key={i} style={{ background: 'var(--slate-800)', borderRadius: 10, padding: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <b>{d.day}</b>
                <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>{d.time} · {d.platform}{d.theme ? ` · ${d.theme}` : ''}</span>
              </div>
              <div style={{ marginTop: 4 }}>{d.design.emoji} <b>{d.design.headline}</b>{d.design.subtext ? ` — ${d.design.subtext}` : ''}</div>
              <div style={{ marginTop: 4, color: 'var(--slate-300, #cbd5e1)' }}>{d.caption}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <button type="button" className="btn" style={{ width: 'auto', padding: '4px 12px', fontSize: 12 }} onClick={() => onOpen?.(d.design)}>🎨 Open in designer</button>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 12px', fontSize: 12 }} onClick={() => copy(d.caption, setCopied)}>Copy caption</button>
              </div>
            </div>
          ))}
          {copied && <span style={{ fontSize: 13, color: 'var(--green-500)' }}>{copied}</span>}
          <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: 0 }}>Check every fact and price before posting. Fill in any [₦X] yourself.</p>
        </div>
      )}
    </div>
  );
}
