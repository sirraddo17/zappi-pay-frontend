import { useEffect, useState } from 'react';
import { getFestivals, updateSettings } from '../../api';
import { READY_ADS } from '../../lib/readyAds';

const GROUP = { christian: '✝️', muslim: '🌙', national: '🇳🇬' };
const fmt = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

// Ad Studio: festival greetings (worked out for every year) and ready-made
// ads for the newer services. "Open" loads one into the editor below.
export default function FestivalPanel({ onOpen, openId }) {
  const [data, setData] = useState(null);
  const [all, setAll] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { getFestivals().then(setData).catch(() => setData({ festivals: [] })); }, []);
  useEffect(() => {
    const f = openId && data?.festivals?.find((x) => x.id === openId);
    if (f) onOpen(f.design);
  }, [openId, data]);

  async function toggle(v) {
    try { await updateSettings({ festivalGreetingsEnabled: v }); setData((d) => ({ ...d, enabled: v })); setMsg(v ? 'On — the app shows the greeting by itself on the day.' : 'Off — no greeting slides or reminders.'); } catch (e) { setMsg(e.message); }
  }
  const list = (data?.festivals || []).slice(0, all ? 40 : 4);
  const btn = { width: 'auto', padding: '5px 12px', fontSize: 13 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, margin: '0 0 16px' }}>
      <div className="card" style={{ margin: 0 }}>
        <b>🎉 Festival greetings</b>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 8px' }}>Ready for Christmas, Easter, New Year, Ramadan, both Eids, Islamic New Year, Eid-el-Maulud and national days. You get an alert a few days before; on the day the app shows the greeting slide by itself. Tap Open to download the pictures and copy the caption for social media.</p>
        {data && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 8 }}>
            <input type="checkbox" checked={data.enabled !== false} onChange={(e) => toggle(e.target.checked)} style={{ width: 'auto' }} /> Show greetings in the app automatically + remind me
          </label>
        )}
        {msg && <p style={{ fontSize: 12, color: 'var(--green-500)', margin: '0 0 8px' }}>{msg}</p>}
        {!data ? <p className="empty-state">Loading…</p> : list.map((f) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--slate-800)' }}>
            <span aria-hidden="true">{f.design?.emoji || GROUP[f.group]}</span>
            <div style={{ flex: 1, fontSize: 13 }}>
              <b>{f.name}</b>{f.live && <span style={{ color: 'var(--green-500)' }}> · showing in the app now</span>}
              <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>{fmt(f.date)} · {f.daysAway <= 0 ? 'today' : f.daysAway === 1 ? 'tomorrow' : `in ${f.daysAway} days`}{f.moon ? ' · may move a day (moon sighting)' : ''}</div>
            </div>
            <button type="button" className={openId === f.id ? 'btn' : 'btn btn-secondary'} style={btn} onClick={() => onOpen(f.design, f.id)}>Open</button>
          </div>
        ))}
        {data?.festivals?.length > 4 && <button type="button" onClick={() => setAll(!all)} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', padding: '6px 0 0', fontSize: 13 }}>{all ? 'Show less' : `Show the whole year (${data.festivals.length})`}</button>}
      </div>
      <div className="card" style={{ margin: 0 }}>
        <b>🆕 Ready-made ads — new services</b>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 8px' }}>Open one, then download the pictures, copy the caption, or tap “Use in the app”.</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {READY_ADS.map((a) => <button key={a.key} type="button" className={openId === a.key ? 'btn' : 'btn btn-secondary'} style={btn} onClick={() => onOpen(a, a.key)}>{a.emoji} {a.name}</button>)}
        </div>
      </div>
    </div>
  );
}
