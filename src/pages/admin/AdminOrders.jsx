import { Fragment, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getAdminOrders, getVtpassCodes, recheckAdminOrder, lookupAdminOrder, settleAdminOrder, reportOrderToVtpass, createEscalation } from '../../api';
import { useAdminAuth } from '../../context/AdminAuthContext';
import useAutoRefresh, { ADMIN_REFRESH } from '../../lib/useAutoRefresh';
import { useShowMore } from '../../components/ShowMore';

// Bet funding goes through Nomba (nb:) or ClubKonnect (ck:), not VTpass.
const isBet = (o) => /^(nb|ck):/.test(String(o.provider || ''));
const providerOf = (o) => (String(o.provider || '').startsWith('nb:') ? 'Nomba' : String(o.provider || '').startsWith('ck:') ? 'ClubKonnect' : 'VTpass');
// Token / PINs as the provider sent them (admin sees them even on held orders).
function deliverable(o) {
  const p = o.responsePayload || {};
  const token = p.purchased_code || p.mainToken || p.token || p.Token || p.content?.transactions?.purchased_code;
  if (token) return String(token).replace(/^Token\s*:\s*/i, '').trim();
  const cards = p.cards || p.tokens;
  if (Array.isArray(cards) && cards.length) return cards.map((c) => (typeof c === 'string' ? c : [c.Serial && `Serial ${c.Serial}`, c.Pin && `PIN ${c.Pin}`].filter(Boolean).join(' · '))).join('  |  ');
  return null;
}

function OrderDetails({ o }) {
  const [look, setLook] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const p = o.responsePayload || {};
  const t = p.content?.transactions || {};
  const code = deliverable(o);
  async function ask() {
    setBusy(true); setErr('');
    try { setLook(await lookupAdminOrder(o.id)); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const row = (k, v) => (v ? <div><span style={{ color: 'var(--slate-400)' }}>{k}:</span> <span style={{ wordBreak: 'break-all' }}>{v}</span></div> : null);
  return (
    <div style={{ width: '100%', textAlign: 'left', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {row('Customer', `${o.customer.name} · ${o.customer.phone}`)}
      {row('Provider', `${providerOf(o)} · ${o.provider}${o.variationCode ? ` · ${o.variationCode}` : ''}`)}
      {row('Our reference (request ID)', o.vtpassRequestId)}
      {row(`${providerOf(o)} transaction ID`, t.transactionId || p.id || null)}
      {row('Name on account', o.recipientName)}
      {code && <div style={{ padding: '6px 10px', border: '1px solid var(--gold)', borderRadius: 8 }}><strong>{o.service === 'ELECTRICITY' ? 'Token' : 'PINs / code'}:</strong> <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{code}</span>{o.status === 'SUCCESS' && <span style={{ color: 'var(--slate-400)' }}> — the customer also sees this in their order.</span>}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} disabled={busy || !o.vtpassRequestId} onClick={ask}>{busy ? 'Asking…' : `Ask ${providerOf(o)} now`}</button>
        <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>Read-only: shows what {providerOf(o)} says right now. Changes nothing.</span>
      </div>
      {err && <p className="error-text" style={{ margin: 0 }}>{err}</p>}
      {look && (
        <div style={{ padding: '6px 10px', border: '1px solid var(--slate-700)', borderRadius: 8 }}>
          <div><strong>{look.who} says: {look.providerStatus}</strong> (ours: {look.ourStatus})</div>
          {row('Transaction ID', look.transactionId)}
          {row('Product', look.productName)}
          {row('Number / meter', look.uniqueElement)}
          {row('Token', look.token)}
          {isBet(o) && <div style={{ color: 'var(--gold)' }}>To raise it, contact {look.who} support quoting reference {look.requestId}.</div>}
        </div>
      )}
      <details>
        <summary style={{ cursor: 'pointer', color: 'var(--slate-400)' }}>Provider's full reply</summary>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 11, maxHeight: 260, overflow: 'auto' }}>{JSON.stringify(look?.raw || p, null, 2)}</pre>
      </details>
    </div>
  );
}

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_COLORS = {
  SUCCESS: 'var(--green-500)',
  PENDING: 'var(--orange, #f97316)',
  FAILED: 'var(--red-500)',
  REFUNDED: 'var(--orange)',
};

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: '⏳ Pending' },
  { value: 'SUCCESS', label: '✓ Successful' },
  { value: 'FAILED', label: '✕ Failed' },
];

const SERVICE_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'AIRTIME', label: 'Airtime' },
  { value: 'DATA', label: 'Data' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'CABLE', label: 'Cable TV' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'INTERNET', label: 'Internet' },
  { value: 'BETTING', label: 'Bet Funding' },
  { value: 'INTERNATIONAL', label: 'International airtime' },
  { value: 'INSURANCE', label: 'Car insurance' },
];

const WHO = { customer: ['Customer', 'var(--slate-300)'], account: ['Your VTpass account', 'var(--red-500)'], provider: ['VTpass / biller', 'var(--gold)'], app: ['App request', 'var(--orange, #f97316)'], ok: ['Not a failure', 'var(--green-500)'] };

// Admin → Orders: every VTpass code in plain words.
function VtpassCodes() {
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { if (open && !codes) getVtpassCodes().then((d) => setCodes(d.codes)).catch(() => setCodes([])); }, [open, codes]);
  const rows = (codes || []).filter((c) => !q || `${c.code} ${c.text} ${c.meaning}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <details className="card" style={{ margin: '0 0 12px', fontSize: 13 }} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>📖 What VTpass codes mean</summary>
      <input type="search" placeholder="Search a code, e.g. 027" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: '10px 0' }} />
      {!codes ? <p className="empty-state">Loading…</p> : rows.map((c) => (
        <div key={c.code} style={{ padding: '8px 0', borderTop: '1px solid var(--slate-700)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <b><code>{c.code}</code> {c.text}</b>
            <span style={{ fontSize: 11, color: WHO[c.who]?.[1] }}>{WHO[c.who]?.[0] || c.who}</span>
          </div>
          <div style={{ color: 'var(--slate-300)', marginTop: 2 }}>{c.meaning}{c.fix && <> <b>Fix:</b> {c.fix}</>}</div>
        </div>
      ))}
    </details>
  );
}

export default function AdminOrders() {
  const { isOwner } = useAdminAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [params, setParams] = useSearchParams();
  const status = STATUS_TABS.some((t) => t.value === params.get('status')) ? params.get('status') : '';
  const [counts, setCounts] = useState(null);

  const [busy, setBusy] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [message, setMessage] = useState('');

  function load() {
    getAdminOrders({ status })
      .then((data) => { setOrders(data.orders); setCounts(data.counts || null); })
      .catch((err) => setError(err.message));
  }
  useEffect(() => { setOrders(null); load(); }, [status]);
  useAutoRefresh(load, true, ADMIN_REFRESH);

  async function reportVtpass(o) {
    const note = window.prompt(`What should VTpass check for ${o.service} ${o.recipient}? (e.g. "customer says token not received")`);
    if (!note) return;
    act(o, () => reportOrderToVtpass(o.id, note), (r) => r.message || 'reported to VTpass');
  }

  async function askRefund(o) {
    const reason = window.prompt('Why should this be refunded? What did you check? (the owner sees this)');
    if (!reason) return;
    if (!window.confirm('Confirm: the customer was debited and did NOT receive the service?')) return;
    act(o, () => createEscalation({ type: 'ORDER_REFUND', customerId: o.customer.id, orderId: o.id, reason, debitConfirmed: true }), (r) => (r.resolved ? r.message : `sent for approval (${r.escalation.ref}); the customer was told`));
  }

  async function act(o, fn, text) {
    setBusy(o.id);
    setError('');
    setMessage('');
    try {
      const r = await fn();
      setMessage(`${o.service} for ${o.recipient}: ${text(r)}`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const pendingCount = counts?.PENDING ?? (orders || []).filter((o) => o.status === 'PENDING').length;
  const tabCount = (v) => (counts ? (v ? counts[v] : counts.total) : null);

  const filtered = orders === null ? null : filter === 'ALL' ? orders : orders.filter((o) => o.service === filter);
  // Last 5 of the chosen service (or all), the rest behind "Show more".
  const page = useShowMore(filtered, [filter, status]);
  const countFor = (v) => (orders || []).filter((o) => v === 'ALL' || o.service === v).length;

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Orders</h1>
        <p>Every purchase across all customers — pick a status, then a service. The newest 5 show first; tap “Show more” for older ones.</p>
      </div>

      <VtpassCodes />
      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}
      {message && <p style={{ color: 'var(--green-500)', margin: '0 0 12px' }}>{message}</p>}
      {pendingCount > 0 && (
        <div className="card" style={{ margin: '0 0 12px', border: '1px solid var(--orange, #f97316)', fontSize: 14 }}>
          <strong>{pendingCount} order{pendingCount === 1 ? '' : 's'} waiting on VTpass.</strong> These are re-checked automatically and settled (or refunded) as soon as VTpass confirms. Use “Check now”, or settle by hand only after confirming with VTpass support.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {STATUS_TABS.map((t) => (
          <button key={t.label} type="button" onClick={() => setParams(t.value ? { status: t.value } : {})} className={t.value === status ? 'btn' : 'btn-secondary btn'} style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}>
            {t.label}{tabCount(t.value) != null ? ` (${tabCount(t.value)})` : ''}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {SERVICE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={f.value === filter ? 'btn' : 'btn-secondary btn'}
            style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }}
          >
            {f.label}{orders ? ` (${countFor(f.value)})` : ''}
          </button>
        ))}
      </div>

      <div className="card admin-table-wrap" style={{ margin: 0 }}>
        {filtered === null ? (
          <p className="empty-state">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No orders match this filter.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {page.visible.map((o) => (
                <Fragment key={o.id}>
                <tr>
                  <td>{o.customer.name}</td>
                  <td>{o.service}</td>
                  <td>{o.recipient}</td>
                  <td>{fmtMoney(o.amount)}</td>
                  <td style={{ color: STATUS_COLORS[o.status] || 'var(--slate-400)' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, textAlign: 'right', maxWidth: 230, marginLeft: 'auto' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>{o.status}</span>
                    <button type="button" onClick={() => setOpenId(openId === o.id ? null : o.id)} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', fontSize: 11, padding: 0 }}>{openId === o.id ? 'Hide details ▲' : 'Details ▼'}</button>
                    {o.status === 'FAILED' && o.vtpassReason && <div style={{ fontSize: 11, color: o.vtpassWho === 'account' ? 'var(--red-500)' : 'var(--slate-400)', marginTop: 2 }}>VTpass: {o.vtpassReason}</div>}
                    {o.status === 'PENDING' && o.held && <div style={{ fontSize: 11, color: 'var(--red-500)', marginTop: 2 }}>⚠ Held: VTpass gave PINs, then said failed. Not refunded — ask VTpass support first.</div>}
                    {o.status === 'PENDING' && !o.held && o.pinsGiven && <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>PINs/token already given</div>}
                    {o.status === 'SUCCESS' && !isBet(o) && (
                      <div style={{ marginTop: 4 }}>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => reportVtpass(o)}>
                          {o.vtpassEscalatedAt ? 'Reported ✓' : 'Report to VTpass'}
                        </button>
                      </div>
                    )}
                    {o.status === 'PENDING' && !isOwner && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => act(o, () => recheckAdminOrder(o.id), (r) => `status now ${r.status}`)}>Check now</button>
                        {!isBet(o) && <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => reportVtpass(o)}>Report to VTpass</button>}
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => askRefund(o)}>Ask admin to refund</button>
                      </div>
                    )}
                    {o.status === 'PENDING' && isOwner && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => act(o, () => recheckAdminOrder(o.id), (r) => `status now ${r.status}`)}>
                          Check now
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => window.confirm('Mark as DELIVERED? Only do this if VTpass confirmed it was delivered.') && act(o, () => settleAdminOrder(o.id, 'SUCCESS'), (r) => `marked ${r.status}`)}>
                          Delivered
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => window.confirm(o.pinsGiven ? 'WARNING: VTpass already gave PINs/token for this order. Refund ONLY if VTpass support confirmed in writing that they do not work. Mark as FAILED and refund?' : 'Mark as FAILED and refund the customer? Only do this if VTpass confirmed it was NOT delivered.') && act(o, () => settleAdminOrder(o.id, 'FAILED'), (r) => `marked ${r.status}, customer refunded`)}>
                          Failed + refund
                        </button>
                        {!isBet(o) && (
                          <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '2px 8px', fontSize: 11 }} disabled={busy === o.id} onClick={() => reportVtpass(o)}>
                            Report to VTpass
                          </button>
                        )}
                      </div>
                    )}
                  </div></td>
                  <td>{fmtDate(o.createdAt)}</td>
                </tr>
                {openId === o.id && (
                  <tr>
                    <td colSpan={6} data-nolabel=""><OrderDetails o={o} /></td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
        {page.more}
      </div>
    </AdminLayout>
  );
}
