import { useEffect, useState } from 'react';
import { getSessions, endSession, endOtherSessions } from '../api';
import { useAuth } from '../context/AuthContext';

const METHOD = { PASSWORD: 'password', SIGNUP: 'sign-up', PIN: 'PIN', FINGERPRINT: 'fingerprint / Face ID' };

function ago(d) {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 15) return 'Active now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

// Security page: where you're logged in, with "log out" per device.
export default function SessionsCard() {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function load() {
    getSessions().then(setData).catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  async function end(s) {
    if (!window.confirm(`Log out ${s.label}?`)) return;
    setBusy(s.id);
    setErr('');
    try {
      await endSession(s.id);
      setMsg(`${s.label} has been logged out.`);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  async function endOthers() {
    if (!window.confirm('Log out of every other phone and browser? You stay logged in here.')) return;
    setBusy('all');
    setErr('');
    try {
      const r = await endOtherSessions();
      if (!r.keptCurrent) {
        logout();
        return;
      }
      setMsg('All your other devices have been logged out.');
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  const list = data?.sessions || [];
  const others = list.filter((s) => !s.current);
  return (
    <div className="card">
      <h2 style={{ marginTop: 0, fontSize: 16 }}>📱 Where you’re logged in</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -6 }}>If you see a phone or browser you don’t recognise, log it out and change your password.</p>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '0 0 8px' }}>{msg}</p>}
      {data === null ? <p className="empty-state">Loading…</p> : (
        <div style={{ display: 'grid', gap: 2 }}>
          {!list.some((s) => s.current) && (
            <div style={{ fontSize: 13, color: 'var(--slate-400)', padding: '8px 0', borderBottom: '1px solid var(--slate-700)' }}>This device (logged in before this list existed)</div>
          )}
          {list.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--slate-700)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {s.label}
                  {s.current && <span style={{ marginLeft: 6, fontSize: 11, padding: '2px 6px', borderRadius: 6, background: 'var(--green-500)', color: '#0f1628', fontWeight: 700 }}>This device</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>
                  {ago(s.lastSeenAt)} · logged in with {METHOD[s.method] || s.method} on {new Date(s.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              {!s.current && (
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '5px 10px', fontSize: 12, color: 'var(--red-500)', whiteSpace: 'nowrap', flexShrink: 0 }} disabled={Boolean(busy)} onClick={() => end(s)}>
                  {busy === s.id ? '…' : 'Log out'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {(others.length > 0 || (data && !list.some((s) => s.current))) && (
        <button type="button" className="btn btn-secondary" style={{ marginTop: 12, color: 'var(--red-500)' }} disabled={Boolean(busy)} onClick={endOthers}>
          {busy === 'all' ? 'Logging out…' : 'Log out all other devices'}
        </button>
      )}
    </div>
  );
}
