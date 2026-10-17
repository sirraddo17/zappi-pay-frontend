import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getGoLive, removeTestNumbers } from '../../api';

// Admin → Go-live check: everything that must be right before real
// customers use the app, with a light for each — and a tool to remove
// test (sandbox) account numbers from customers.
const LIGHT = { ok: ['✅', 'var(--green-500)'], warn: ['🟠', 'var(--gold)'], bad: ['🔴', 'var(--red-500)'], info: ['ℹ️', 'var(--slate-400)'] };

export default function AdminGoLive() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [which, setWhich] = useState('');
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setErr('');
    setBusy(true);
    try { setD(await getGoLive()); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);

  async function remove() {
    setMsg(null);
    setBusy(true);
    try {
      const r = await removeTestNumbers(which, confirm);
      setMsg({ ok: true, text: r.message });
      setWhich('');
      setConfirm('');
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }

  const groups = d ? [...new Set(d.checks.map((c) => c.group))] : [];
  const testTotal = d ? d.accounts.reduce((s, a) => s + a.test, 0) : 0;

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>🚦 Go-live check</h1>
        <p>Everything that must be right before real customers use the app. Fix the reds; ambers are worth a look.</p>
      </div>

      {err && <p className="error-text">{err}</p>}
      {!d && !err && <p className="empty-state">Checking every partner…</p>}

      {d && (
        <>
          <div className="card" style={{ margin: '0 0 16px', maxWidth: 680, borderColor: d.ready ? 'var(--green-500)' : 'var(--red-500)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: d.ready ? 'var(--green-500)' : 'var(--red-500)' }}>
              {d.ready ? '✅ Ready — nothing blocking' : `🔴 ${d.counts.bad} thing${d.counts.bad === 1 ? '' : 's'} to fix before launch`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>
              {d.counts.ok} fine · {d.counts.warn} to check · {d.counts.bad} to fix · checked {new Date(d.at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', marginTop: 10 }} disabled={busy} onClick={load}>{busy ? 'Checking…' : '↻ Check again'}</button>
          </div>

          {groups.map((g) => (
            <div key={g} className="card" style={{ margin: '0 0 16px', maxWidth: 680 }}>
              <b style={{ fontSize: 15 }}>{g}</b>
              {d.checks.filter((c) => c.group === g).map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: i ? '1px solid var(--slate-800)' : 'none' }}>
                  <span aria-hidden="true" style={{ fontSize: 16 }}>{LIGHT[c.status][0]}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, color: c.status === 'bad' ? 'var(--red-500)' : undefined }}>{c.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--slate-300)' }}>{c.detail}</div>
                    {c.fix && <div style={{ fontSize: 12, color: LIGHT[c.status][1], marginTop: 2 }}>→ {c.fix}</div>}
                  </div>
                  {c.link && <Link to={c.link} className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 12, alignSelf: 'center', textDecoration: 'none', whiteSpace: 'nowrap' }}>Open</Link>}
                </div>
              ))}
            </div>
          ))}

          <div className="card" style={{ margin: '0 0 16px', maxWidth: 680 }}>
            <b style={{ fontSize: 15 }}>🧹 Remove test account numbers</b>
            <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 8px' }}>
              Numbers made while a partner was on sandbox keys. Removing them lets those customers get a real number on the Wallet page. Wallet balances are not touched. Do this before (or right after) you switch that partner to Live. Money sent later to a removed number won’t reach the customer’s wallet automatically, so tell anyone who saved one.
            </p>
            {d.accounts.map((a) => (
              <div key={a.provider} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--slate-800)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{a.name} <span style={{ fontSize: 12, color: a.mode === 'live' ? 'var(--green-500)' : 'var(--gold)' }}>· {a.mode}</span></div>
                  <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{a.customers} customer{a.customers === 1 ? '' : 's'} · <b style={{ color: a.test ? 'var(--red-500)' : undefined }}>{a.test} test</b>{a.unknownAge ? ` · ${a.unknownAge} unlabelled (made before labels — check them)` : ''}</div>
                </div>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} disabled={busy || !a.test} onClick={() => { setWhich(a.provider); setConfirm(''); setMsg(null); }}>Remove {a.test || ''}</button>
              </div>
            ))}
            {testTotal > 1 && <button type="button" className="btn btn-secondary" style={{ width: 'auto', marginTop: 8 }} disabled={busy} onClick={() => { setWhich('all'); setConfirm(''); setMsg(null); }}>Remove all {testTotal} test numbers</button>}
            {which && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid var(--red-500)' }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>Remove {which === 'all' ? 'all test numbers' : `the ${d.accounts.find((a) => a.provider === which)?.name} test numbers`}? Type <b>REMOVE</b> to confirm.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input aria-label="Type REMOVE" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="REMOVE" style={{ flex: 1 }} />
                  <button type="button" className="btn" style={{ width: 'auto' }} disabled={busy || confirm.trim().toUpperCase() !== 'REMOVE'} onClick={remove}>Remove</button>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy} onClick={() => setWhich('')}>Cancel</button>
                </div>
              </div>
            )}
            {msg && <p style={{ fontSize: 13, margin: '10px 0 0', color: msg.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{msg.text}</p>}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
