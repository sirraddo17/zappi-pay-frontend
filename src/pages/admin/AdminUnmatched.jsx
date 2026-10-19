import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { getUnmatchedPayments, assignUnmatchedPayment, closeUnmatchedPayment, getCustomerList } from '../../api';

// Admin → 💸 Unmatched payments: bank payments a partner confirmed on an
// account number no customer owns any more (old test number, deleted
// account, reset). Nothing was credited — credit the right customer, or
// record that it was sent back to the payer.
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const when = (d) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const TABS = [['OPEN', 'Waiting'], ['ASSIGNED', 'Credited'], ['RETURNED', 'Sent back'], ['IGNORED', 'Ignored']];

function Assign({ p, onDone }) {
  const [q, setQ] = useState(p.suggested && !p.suggested.deletedAt ? p.suggested.phone : '');
  const [list, setList] = useState([]);
  const [pick, setPick] = useState(p.suggested && !p.suggested.deletedAt ? p.suggested : null);
  const [fee, setFee] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (q.trim().length < 3) { setList([]); return undefined; }
    const t = setTimeout(() => getCustomerList({ view: 'active', q: q.trim() }).then((r) => setList(r.customers || [])).catch(() => setList([])), 350);
    return () => clearTimeout(t);
  }, [q]);
  async function go() {
    if (!pick) return;
    if (!window.confirm(`Credit ${naira(p.amount)}${fee ? ' (minus the normal funding fee)' : ''} to ${pick.name} (${pick.phone})?`)) return;
    setBusy(true); setErr('');
    try { await assignUnmatchedPayment(p.id, { customerId: pick.id, chargeFee: fee, note }); onDone(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div style={{ marginTop: 10, padding: 10, border: '1px solid var(--slate-700)', borderRadius: 10 }}>
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor={`q-${p.id}`}>Find the customer (phone, name or username)</label>
        <input id={`q-${p.id}`} value={q} onChange={(e) => { setQ(e.target.value); setPick(null); }} placeholder="e.g. 0803…" />
      </div>
      {!pick && list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {list.slice(0, 6).map((c) => (
            <button key={c.id} type="button" className="btn btn-secondary" style={{ width: 'auto', textAlign: 'left', padding: '6px 10px', fontSize: 13 }} onClick={() => setPick(c)}>{c.name} · {c.phone}</button>
          ))}
        </div>
      )}
      {pick && <p style={{ margin: '8px 0', fontSize: 13 }}>Credit to <strong>{pick.name}</strong> ({pick.phone})</p>}
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, margin: '6px 0' }}>
        <input type="checkbox" checked={fee} onChange={(e) => setFee(e.target.checked)} style={{ width: 'auto' }} /> Take the normal funding fee for {p.providerName}
      </label>
      <div className="field" style={{ margin: '6px 0' }}>
        <label htmlFor={`n-${p.id}`}>Note (how you confirmed it's theirs)</label>
        <input id={`n-${p.id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. sent receipt on WhatsApp, name matches" />
      </div>
      {err && <p className="error-text">{err}</p>}
      <button type="button" className="btn" style={{ width: 'auto' }} disabled={!pick || busy} onClick={go}>{busy ? 'Crediting…' : 'Credit this customer'}</button>
    </div>
  );
}

export default function AdminUnmatched() {
  const { isOwner } = useAdminAuth();
  const [tab, setTab] = useState('OPEN');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);
  const load = () => { setErr(''); getUnmatchedPayments(tab).then(setD).catch((e) => setErr(e.message)); };
  useEffect(load, [tab]);

  async function close(p, status) {
    const note = window.prompt(status === 'RETURNED' ? `How did you send ${naira(p.amount)} back to ${p.payerName || 'the payer'}? (bank, account, reference)` : 'Why can this be ignored? (e.g. sandbox test money)', '');
    if (note === null) return;
    try { await closeUnmatchedPayment(p.id, status, note); load(); } catch (e) { setErr(e.message); }
  }

  return (
    <AdminLayout>
      <h1>💸 Unmatched payments</h1>
      <p style={{ color: 'var(--slate-400)', marginTop: 4 }}>Bank payments that arrived on an account number no customer owns now — an old test number, a deleted account, or numbers removed in a reset. They were <strong>not</strong> added to any wallet. Confirm who sent it, then credit the right customer, or send it back to the payer and record it here.</p>
      {d && tab === 'OPEN' && d.open.count > 0 && <p style={{ fontWeight: 600 }}>{d.open.count} waiting · {naira(d.open.amount)}</p>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
        {TABS.map(([k, l]) => <button key={k} type="button" className={k === tab ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {err && <p className="error-text">{err}</p>}
      {!d && !err && <p className="empty-state">Loading…</p>}
      {d && d.payments.length === 0 && <p className="empty-state">{tab === 'OPEN' ? 'Nothing waiting — every bank payment reached a customer.' : 'Nothing here.'}</p>}
      {d && d.payments.map((p) => (
        <div key={p.id} className="card" style={{ margin: '0 0 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{naira(p.amount)}</div>
              <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>{p.providerName} · {when(p.createdAt)}{p.accountNumber ? ` · to account ${p.accountNumber}` : ''}</div>
              <div style={{ fontSize: 13 }}>From: {p.payerName || 'unknown sender'}{p.payerAccount ? ` (${p.payerAccount}${p.payerBank ? `, bank ${p.payerBank}` : ''})` : ''}</div>
              <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Ref: {p.providerRef}</div>
              {p.suggested && (
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  This number used to belong to <Link to={`/admin/customers/${p.suggested.id}`}>{p.suggested.name}</Link>{p.suggested.deletedAt ? ' — account deleted, so send it back to the payer' : ` (${p.suggested.phone})`}.
                </div>
              )}
              {p.provider === 'nomba' && p.status === 'OPEN' && <div style={{ fontSize: 12, color: 'var(--gold)' }}>Nomba payments are re-checked with Nomba before crediting.</div>}
              {p.customer && <div style={{ fontSize: 13, marginTop: 4 }}>Credited to <Link to={`/admin/customers/${p.customer.id}`}>{p.customer.name}</Link></div>}
              {p.note && <div style={{ fontSize: 13, marginTop: 4 }}>Note: {p.note}</div>}
            </div>
            {p.status === 'OPEN' && isOwner && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <button type="button" className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => setOpen(open === p.id ? null : p.id)}>Credit a customer</button>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => close(p, 'RETURNED')}>I sent it back</button>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => close(p, 'IGNORED')}>Ignore (test)</button>
              </div>
            )}
          </div>
          {p.status === 'OPEN' && !isOwner && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '6px 0 0' }}>Only the owner can credit or close this. Use “Request admin approval” on the customer's page if you know whose it is.</p>}
          {open === p.id && <Assign p={p} onDone={() => { setOpen(null); load(); }} />}
        </div>
      ))}
    </AdminLayout>
  );
}
