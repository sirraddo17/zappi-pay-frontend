import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBeneficiaries, deleteBeneficiary, renameBeneficiary, getSchedules, updateSchedule, deleteSchedule } from '../api';
import BottomNav from '../components/BottomNav';
import { beneficiaryLink, SERVICE_LABEL, FREQUENCY_LABEL } from '../lib/repeat';

function fmtWhen(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function Saved() {
  const [schedules, setSchedules] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');

  function load() {
    getSchedules().then((d) => setSchedules(d.schedules || [])).catch((e) => setError(e.message));
    getBeneficiaries().then((d) => setBeneficiaries(d.beneficiaries || [])).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function act(id, fn) {
    setBusyId(id);
    setError('');
    try {
      await fn();
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  }

  const small = { width: 'auto', padding: '6px 10px', fontSize: 12 };

  return (
    <div className="app-shell">
      <div className="page-header">
        <Link to="/" style={{ color: 'var(--purple, var(--orange))', textDecoration: 'none', fontSize: 14 }}>
          &larr; Back
        </Link>
        <h1>Saved &amp; Scheduled</h1>
        <p>Your saved numbers and automatic top-ups</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Scheduled top-ups</h2>
        {schedules === null ? (
          <p className="empty-state">Loading…</p>
        ) : schedules.length === 0 ? (
          <p style={{ color: 'var(--slate-400)', fontSize: 14, margin: 0 }}>
            None yet. When buying, tick <b>Repeat this purchase automatically</b> — great for monthly DStv/GOtv or weekly data.
          </p>
        ) : (
          schedules.map((s, i) => (
            <div key={s.id} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--slate-700)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {s.nickname || `${SERVICE_LABEL[s.service] || s.service} · ${s.billersCode}`}
                  </div>
                  <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 2 }}>
                    {FREQUENCY_LABEL[s.frequency]} · {s.variationCode ? 'plan' : `₦${Number(s.amount).toLocaleString()}`} · {s.serviceID}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: s.active ? 'var(--slate-100)' : 'var(--gold)' }}>
                    {s.active ? `Next: ${fmtWhen(s.nextRunAt)}` : 'Paused'}
                    {s.lastStatus === 'FAILED' && s.lastError && <span style={{ color: 'var(--red-500)' }}> · Last try failed: {s.lastError}</span>}
                    {s.lastStatus === 'SUCCESS' && s.lastRunAt && <span style={{ color: 'var(--green-500)' }}> · Last ran {fmtWhen(s.lastRunAt)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn-secondary btn"
                    style={small}
                    disabled={busyId === s.id}
                    onClick={() => act(s.id, () => updateSchedule(s.id, { active: !s.active }))}
                  >
                    {s.active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn"
                    style={{ ...small, color: 'var(--red-500)' }}
                    disabled={busyId === s.id}
                    onClick={() => act(s.id, () => deleteSchedule(s.id))}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '10px 0 0' }}>
          Keep enough in your wallet before each date. A top-up that fails 3 times in a row is paused and you'll get a notification.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Saved numbers</h2>
        {beneficiaries === null ? (
          <p className="empty-state">Loading…</p>
        ) : beneficiaries.length === 0 ? (
          <p style={{ color: 'var(--slate-400)', fontSize: 14, margin: 0 }}>
            None yet. When buying, tick <b>Save this number for next time</b>.
          </p>
        ) : (
          beneficiaries.map((b, i) => (
            <div key={b.id} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--slate-700)' : 'none' }}>
              {editing === b.id ? (
                <form
                  style={{ display: 'flex', gap: 6 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(b.id, () => renameBeneficiary(b.id, editName)).then(() => setEditing(null));
                  }}
                >
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={40} placeholder="Nickname" aria-label="Nickname" />
                  <button type="submit" className="btn" style={small}>Save</button>
                  <button type="button" className="btn-secondary btn" style={small} onClick={() => setEditing(null)}>Cancel</button>
                </form>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{b.nickname || b.billersCode}</div>
                    <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>
                      {SERVICE_LABEL[b.service]} · {b.nickname ? `${b.billersCode} · ` : ''}{b.serviceID}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {beneficiaryLink(b) && (
                      <Link to={beneficiaryLink(b)} className="btn" style={{ ...small, textDecoration: 'none' }}>
                        Buy
                      </Link>
                    )}
                    <button type="button" className="btn-secondary btn" style={small} onClick={() => { setEditing(b.id); setEditName(b.nickname || ''); }}>
                      Rename
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn"
                      style={{ ...small, color: 'var(--red-500)' }}
                      disabled={busyId === b.id}
                      onClick={() => act(b.id, () => deleteBeneficiary(b.id))}
                      aria-label={`Delete ${b.nickname || b.billersCode}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
