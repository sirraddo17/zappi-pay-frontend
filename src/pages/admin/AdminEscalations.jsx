import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useShowMore } from '../../components/ShowMore';
import { getEscalations, approveEscalation, rejectEscalation, getSettings, updateSettings } from '../../api';
import useAutoRefresh, { ADMIN_REFRESH } from '../../lib/useAutoRefresh';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const STATUS = [['PENDING', 'Waiting'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'], ['ALL', 'All']];

function dueText(dueAt) {
  const ms = new Date(dueAt).getTime() - Date.now();
  const h = Math.round(Math.abs(ms) / 3600000);
  if (ms < 0) return { text: `Overdue by ${h || 1}h`, late: true };
  return { text: h < 1 ? 'Due within the hour' : `Due in ${h}h`, late: false };
}

function Checks({ c }) {
  if (!c) return null;
  const item = (ok, label) => <li style={{ color: ok ? 'var(--green-500)' : 'var(--slate-400)' }}>{ok ? '✓' : '○'} {label}</li>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: 12, display: 'grid', gap: 2 }}>
      {item(c.identityVerified, 'Staff confirmed it’s really the customer')}
      {c.appIdentityCheck && (
        <li style={{ color: c.appIdentityCheck.dob === 'NO_MATCH' || c.appIdentityCheck.answer === 'NO_MATCH' ? 'var(--red-500)' : 'var(--green-500)' }}>
          App identity check: date of birth {String(c.appIdentityCheck.dob || 'not asked').toLowerCase().replace('_', ' ')}, answer {String(c.appIdentityCheck.answer || 'not asked').toLowerCase().replace('_', ' ')}
        </li>
      )}
      {item(c.debitConfirmed, 'Staff confirmed the debit and no delivery')}
      {c.vtpassStatus && <li>VTpass status when requested: <b>{c.vtpassStatus}</b></li>}
      {c.staffNote && <li>Note: {c.staffNote}</li>}
    </ul>
  );
}

function OwnerSettings() {
  const [hours, setHours] = useState('24');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    getSettings().then((d) => { const s = d.settings || d; setHours(String(s.escalationHours ?? 24)); setEmail(s.vtpassSupportEmail || ''); }).catch(() => {});
  }, []);
  async function save(e) {
    e.preventDefault();
    try {
      await updateSettings({ escalationHours: Number(hours), vtpassSupportEmail: email });
      setMsg('Saved.');
    } catch (err) {
      setMsg(err.message);
    }
  }
  return (
    <details className="card" style={{ margin: '0 0 16px' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>⚙️ Response time & VTpass email</summary>
      <form onSubmit={save} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
        <div className="field" style={{ margin: 0, flex: '1 1 180px' }}>
          <label htmlFor="esc-h">Customers are told to expect an answer within (hours)</label>
          <input id="esc-h" type="number" min="1" max="168" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0, flex: '2 1 240px' }}>
          <label htmlFor="esc-v">“Report to VTpass” emails go to</label>
          <input id="esc-v" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="support@vtpass.com" />
        </div>
        <button className="btn" type="submit" style={{ width: 'auto' }}>Save</button>
      </form>
      {msg && <p style={{ fontSize: 13, margin: '8px 0 0' }}>{msg}</p>}
    </details>
  );
}

export default function AdminEscalations() {
  const { isOwner } = useAdminAuth();
  const [status, setStatus] = useState('PENDING');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [secret, setSecret] = useState(null);
  const [notes, setNotes] = useState({});

  function load(quiet) {
    getEscalations(status).then(setData).catch((e) => !quiet && setError(e.message));
  }
  useEffect(() => { setData(null); load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoRefresh(() => load(true), true, ADMIN_REFRESH);
  const page = useShowMore(data?.escalations, [status]);

  async function act(e, approve) {
    setBusy(e.id);
    setError('');
    try {
      if (approve) {
        if (!window.confirm(`Approve: ${data.types[e.type]}${e.amount ? ` ${naira(e.amount)}` : ''} for ${e.customer?.name}?`)) return;
        const r = await approveEscalation(e.id, notes[e.id]);
        if (r.temporaryPassword) setSecret({ name: e.customer?.name, phone: e.customer?.phone, ...r });
      } else {
        await rejectEscalation(e.id, notes[e.id]);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>{isOwner ? 'Approvals' : 'My requests'}</h1>
        <p>{isOwner ? 'Sensitive actions support staff asked you to approve. Approving carries the action out straight away.' : 'Requests you sent to an admin. The customer was told it’s being reviewed and when to expect an answer.'}</p>
      </div>
      {isOwner && <OwnerSettings />}
      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}

      {secret && (
        <div className="card" style={{ margin: '0 0 16px', border: '1px solid var(--gold, #f5b82e)' }}>
          <strong>Temporary password for {secret.name}</strong>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1, margin: '6px 0' }}>{secret.temporaryPassword}</div>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>Send it to {secret.phone} (e.g. WhatsApp). It works for 24 hours and they must choose a new password when they log in. It won’t be shown again.</p>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto', marginTop: 8 }} onClick={() => { navigator.clipboard?.writeText(secret.temporaryPassword); }}>Copy</button>
          <button type="button" onClick={() => setSecret(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}>Done</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {STATUS.map(([k, label]) => (
          <button key={k} type="button" className={status === k ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }} onClick={() => setStatus(k)}>
            {label}{k === 'PENDING' && data?.pendingCount ? ` (${data.pendingCount})` : ''}
          </button>
        ))}
      </div>

      {data === null ? <p className="empty-state">Loading…</p> : data.escalations.length === 0 ? <p className="empty-state">Nothing here.</p> : (
        <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
          {page.visible.map((e) => {
            const due = dueText(e.dueAt);
            const open = e.status === 'PENDING' || e.status === 'PROCESSING';
            return (
              <div key={e.id} className="card" style={{ margin: 0, borderLeft: `4px solid ${open ? (due.late ? 'var(--red-500)' : 'var(--gold, #f5b82e)') : e.status === 'APPROVED' ? 'var(--green-500)' : 'var(--slate-600)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <b>{data.types[e.type]}</b>{e.amount ? ` · ${naira(e.amount)}` : ''} · <Link to={`/admin/customers/${e.customerId}`} style={{ color: 'var(--purple)' }}>{e.customer?.name || 'Customer'}</Link>
                    <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{e.ref} · by {e.createdByName} · {new Date(e.createdAt).toLocaleString('en-NG')}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: open ? (due.late ? 'var(--red-500)' : 'var(--gold)') : 'var(--slate-400)' }}>
                    {open ? due.text : `${e.status === 'APPROVED' ? 'Approved' : 'Rejected'} by ${e.reviewedByName || 'admin'}`}
                  </span>
                </div>
                {e.order && (
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Purchase: {e.order.service.toLowerCase()} {naira(e.order.amount)} for {e.order.recipient} · {new Date(e.order.createdAt).toLocaleString('en-NG')} · now <b>{e.order.status}</b> · VTpass ref {e.order.vtpassRequestId}
                  </div>
                )}
                <p style={{ fontSize: 14, margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{e.reason}</p>
                <Checks c={e.checks} />
                {e.result && <div style={{ fontSize: 13, marginTop: 6, color: 'var(--green-500)' }}>Result: {e.result}</div>}
                {e.reviewNote && <div style={{ fontSize: 13, marginTop: 4 }}>Admin note: {e.reviewNote}</div>}
                {isOwner && e.status === 'PENDING' && (
                  <div style={{ marginTop: 10 }}>
                    <input aria-label="Note" value={notes[e.id] || ''} onChange={(ev) => setNotes((n) => ({ ...n, [e.id]: ev.target.value }))} placeholder="Note (required to reject)" style={{ marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn" style={{ width: 'auto' }} disabled={busy === e.id} onClick={() => act(e, true)}>Approve</button>
                      <button type="button" className="btn btn-secondary" style={{ width: 'auto', color: 'var(--red-500)' }} disabled={busy === e.id} onClick={() => act(e, false)}>Reject</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {page.more}
        </div>
      )}
    </AdminLayout>
  );
}
