import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReminders, stopReminder, setRemindersOff } from '../api';
import { buyAgainLink } from '../lib/repeat';

const ICON = { CABLE: '📺', DATA: '📶', INTERNET: '🌐' };

// Home page: "Your DStv expires in 3 days — Renew". Shows bills due in
// the next two weeks; hidden when there are none.
export default function RenewalsCard() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');

  function load() {
    getReminders().then(setData).catch(() => setData(null));
  }
  useEffect(load, []);

  const soon = (data?.upcoming || []).filter((r) => new Date(r.dueDate).getTime() - Date.now() < 14 * 86400000);
  if (msg) return <p style={{ margin: '12px 16px', fontSize: 13, color: 'var(--slate-400)' }}>{msg}</p>;
  if (!data || data.off || !soon.length) return null;

  async function stop(r) {
    await stopReminder(r.id).catch(() => {});
    load();
  }
  async function stopAll() {
    if (!window.confirm('Stop all renewal reminders? You can turn them back on in Notifications.')) return;
    await setRemindersOff(true).catch(() => {});
    setMsg('Renewal reminders are off. Turn them back on any time from Notifications.');
  }

  return (
    <div className="card" style={{ border: '1px solid var(--gold)' }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>⏰ Coming up for renewal</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {soon.map((r) => {
          const link = buyAgainLink({ service: r.service, provider: r.serviceID, recipient: r.billersCode, variationCode: r.variationCode });
          const urgent = new Date(r.dueDate).getTime() - Date.now() < 3 * 86400000;
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span aria-hidden="true" style={{ fontSize: 20 }}>{ICON[r.service] || '🔁'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
                <div style={{ fontSize: 12, color: urgent ? 'var(--gold)' : 'var(--slate-400)' }}>
                  {r.service === 'CABLE' ? 'Expires' : 'Ends'} {r.when} · {new Date(r.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              {link && <Link to={link} className="btn" style={{ width: 'auto', flexShrink: 0, padding: '6px 12px', fontSize: 13, textDecoration: 'none' }}>Renew</Link>}
              <button type="button" onClick={() => stop(r)} aria-label={`Stop reminding me about ${r.label}`} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: 18, cursor: 'pointer', padding: '0 2px' }}>×</button>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={stopAll} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: 12, padding: 0, marginTop: 10, cursor: 'pointer' }}>Stop renewal reminders</button>
    </div>
  );
}
