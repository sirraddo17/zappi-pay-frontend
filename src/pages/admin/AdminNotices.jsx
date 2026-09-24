import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getAdminNotices, createNotice, setNoticeActive } from '../../api';

const SERVICES = ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION', 'INTERNET', 'BETTING'];

// Short service-status notices shown on the home screen (general) or on
// a service's Buy page, e.g. "MTN data is delayed — we're on it."
export default function AdminNotices() {
  const [notices, setNotices] = useState(null);
  const [message, setMessage] = useState('');
  const [service, setService] = useState('');
  const [level, setLevel] = useState('WARNING');
  const [hours, setHours] = useState('6');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    getAdminNotices().then((d) => setNotices(d.notices)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await createNotice({ message, service: service || null, level, hours: Number(hours || 0) });
      setMessage('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const live = (n) => n.active && (!n.expiresAt || new Date(n.expiresAt) > new Date());

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Service Notices</h1>
        <p>Tell customers about delays before they buy</p>
      </div>
      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      <form className="card" style={{ margin: '0 0 16px', maxWidth: 560 }} onSubmit={submit}>
        <div className="field">
          <label htmlFor="nm">Message</label>
          <input id="nm" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} placeholder="MTN data is delayed right now — it will arrive, please don't buy twice." required />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 150px' }}>
            <label htmlFor="ns">Show on</label>
            <select id="ns" value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">Home screen (everyone)</option>
              {SERVICES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()} page</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label htmlFor="nl">Type</label>
            <select id="nl" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="WARNING">⚠️ Warning</option>
              <option value="INFO">ℹ️ Info</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label htmlFor="nh">Hide after</label>
            <select id="nh" value={hours} onChange={(e) => setHours(e.target.value)}>
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">1 day</option>
              <option value="72">3 days</option>
              <option value="0">Until I turn it off</option>
            </select>
          </div>
        </div>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post notice'}</button>
      </form>

      {notices === null ? (
        <p className="empty-state">Loading…</p>
      ) : notices.length === 0 ? (
        <p className="empty-state">No notices yet.</p>
      ) : (
        notices.map((n) => (
          <div key={n.id} className="card" style={{ margin: '0 0 10px', opacity: live(n) ? 1 : 0.55 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <div>{n.level === 'WARNING' ? '⚠️' : 'ℹ️'} {n.message}</div>
                <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 4 }}>
                  {n.service ? `${n.service.charAt(0)}${n.service.slice(1).toLowerCase()} page` : 'Home screen'} · posted {new Date(n.createdAt).toLocaleString('en-NG')}
                  {n.expiresAt && ` · ${new Date(n.expiresAt) > new Date() ? 'hides' : 'hid'} ${new Date(n.expiresAt).toLocaleString('en-NG')}`}
                  {live(n) ? ' · LIVE' : ' · hidden'}
                </div>
              </div>
              {live(n) && (
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => setNoticeActive(n.id, false).then(load)}>
                  Hide now
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </AdminLayout>
  );
}
