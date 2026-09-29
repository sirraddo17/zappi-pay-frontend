import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../api';

const SERVICES = [['AIRTIME', 'Airtime'], ['DATA', 'Data'], ['ELECTRICITY', 'Electricity'], ['CABLE', 'Cable TV'], ['EDUCATION', 'Exam PINs'], ['INTERNET', 'Internet'], ['BETTING', 'Betting']];

// Settings → Maintenance: pause purchases during a VTpass outage.
export default function MaintenancePanel() {
  const [all, setAll] = useState(false);
  const [services, setServices] = useState([]);
  const [message, setMessage] = useState('');
  const [alertsOn, setAlertsOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    getSettings().then((d) => {
      const s = d.settings || d;
      setAll(Boolean(s.purchasesPaused));
      setServices(Array.isArray(s.pausedServices) ? s.pausedServices : []);
      setMessage(s.maintenanceMessage || '');
      setAlertsOn(s.errorAlertsEnabled !== false);
    }).catch((e) => setErr(e.message));
  }, []);

  const toggle = (k) => setServices((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));

  async function save(e) {
    e.preventDefault();
    if (all && !window.confirm('Pause ALL purchases now? Customers won’t be able to buy anything until you switch it back on.')) return;
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await updateSettings({ purchasesPaused: all, pausedServices: services, maintenanceMessage: message, errorAlertsEnabled: alertsOn });
      setMsg(all ? 'All purchases are paused.' : services.length ? `Paused: ${services.map((k) => SERVICES.find(([x]) => x === k)?.[1]).join(', ')}.` : 'Everything is running normally.');
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  const anyPaused = all || services.length > 0;
  return (
    <form className="card" style={{ maxWidth: 640, border: anyPaused ? '1px solid var(--red-500)' : undefined }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 16, marginBottom: 4 }}>🛠️ Maintenance mode</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0 }}>
        Pause buying during a VTpass outage or while you fix something, so customers see a clear message instead of failed purchases. Wallets, funding, transfers and history keep working. Scheduled top-ups wait and run once you switch it back on.
      </p>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {msg && <p style={{ color: anyPaused ? 'var(--gold)' : 'var(--green-500)', fontSize: 13, margin: '0 0 8px' }}>{msg}</p>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, fontWeight: 600 }}>
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} style={{ width: 'auto' }} /> Pause ALL purchases
      </label>
      {!all && (
        <>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Or pause only some services:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {SERVICES.map(([k, l]) => (
              <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, padding: '6px 10px', borderRadius: 8, border: `1px solid ${services.includes(k) ? 'var(--red-500)' : 'var(--slate-700)'}` }}>
                <input type="checkbox" checked={services.includes(k)} onChange={() => toggle(k)} style={{ width: 'auto' }} /> {l}
              </label>
            ))}
          </div>
        </>
      )}
      <div className="field">
        <label htmlFor="mt-msg">Message for customers (optional)</label>
        <input id="mt-msg" value={message} maxLength={200} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Electricity is paused while IBEDC is down. Back soon — your wallet is safe." />
      </div>
      <div style={{ borderTop: '1px solid var(--slate-700)', margin: '6px 0 12px', paddingTop: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 }}>
          <input type="checkbox" checked={alertsOn} onChange={(e) => setAlertsOn(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span><b>Error alerts by email</b><br /><span style={{ color: 'var(--slate-400)', fontSize: 13 }}>Email owners if the server crashes, if 10+ requests fail in 10 minutes, or if VTpass fails 5+ purchases in 15 minutes. At most one email per problem per hour.</span></span>
        </label>
      </div>
      <button className="btn" type="submit" style={{ width: 'auto', background: anyPaused ? 'var(--red-500)' : undefined }} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
