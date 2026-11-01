import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getLedger, getRefunds } from '../../api';

// Admin → 📒 Ledger: every wallet credit and debit (read-only — records
// are never edited or deleted; corrections are new rows), and Refunds:
// automatic and manual, showing that cash back + cashback back = what
// the order took.
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const when = (d) => new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
const TYPES = ['', 'FUND', 'DEBIT', 'REFUND', 'CASHBACK', 'REFERRAL_BONUS', 'LOYALTY', 'DELIVERY_BONUS', 'SHOP_COMMISSION', 'TRANSFER_IN', 'TRANSFER_OUT', 'AIRTIME_CASH', 'BILL_PAY'];
const CREDIT = /^(FUND|REFUND|CASHBACK|REFERRAL_BONUS|LOYALTY|CONTEST_PRIZE|COUPON|CHALLENGE_REWARD|DELIVERY_BONUS|SHOP_COMMISSION|TRANSFER_IN|AIRTIME_CASH|INTEREST|SAVINGS_OUT|.*_IN|DISPUTE_RELEASE|REWARD)$/;

function Ledger() {
  const [type, setType] = useState('');
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { setD(null); getLedger({ type, days }).then(setD).catch((e) => setErr(e.message)); }, [type, days]);
  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 'auto' }} aria-label="Type">
          {TYPES.map((t) => <option key={t} value={t}>{t ? t.replace(/_/g, ' ').toLowerCase() : 'All types'}</option>)}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 'auto' }} aria-label="Period">
          {[7, 30, 90].map((n) => <option key={n} value={n}>Last {n} days</option>)}
        </select>
      </div>
      {err && <p className="error-text">{err}</p>}
      {!d && !err && <p className="empty-state">Loading…</p>}
      {d && (
        <>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '0 0 10px' }}>🔒 {d.note}</p>
          {d.totals.length > 0 && (
            <div className="card" style={{ margin: '0 0 12px', fontSize: 13 }}>
              <b>Totals (approved, last {d.days} days)</b>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 6 }}>
                {d.totals.map((t) => <span key={t.type}>{t.type.replace(/_/g, ' ').toLowerCase()}: {naira(t.amount)} ({t.count})</span>)}
              </div>
            </div>
          )}
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'left', color: 'var(--slate-400)' }}><th style={{ padding: 8 }}>When</th><th>Customer</th><th>Type</th><th>Amount</th><th>Status</th><th>Note</th></tr></thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--slate-800)' }}>
                    <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{when(r.createdAt)}</td>
                    <td>{r.customer ? <Link to={`/admin/customers/${r.customerId}`}>{r.customer.name}</Link> : '—'}</td>
                    <td>{r.type.replace(/_/g, ' ').toLowerCase()}{r.manual ? ' · manual' : ''}</td>
                    <td style={{ whiteSpace: 'nowrap', color: CREDIT.test(r.type) ? 'var(--green-500)' : undefined }}>{CREDIT.test(r.type) ? '+' : '−'}{naira(r.amount)}</td>
                    <td>{r.status.toLowerCase()}</td>
                    <td style={{ color: 'var(--slate-400)', maxWidth: 280 }}>{r.note || r.reference || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.rows.length === 0 && <p className="empty-state">Nothing in this period.</p>}
          </div>
        </>
      )}
    </>
  );
}

function Refunds() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { getRefunds(30).then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="error-text">{err}</p>;
  if (!d) return <p className="empty-state">Loading…</p>;
  return (
    <>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '0 0 10px' }}>Failed purchases are refunded automatically. Manual refunds go through an approval request with a reason (support asks, the owner approves). Each refund returns exactly what the order took: cash to the wallet + any cashback used.</p>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', color: 'var(--slate-400)' }}><th style={{ padding: 8 }}>When</th><th>Customer</th><th>Order</th><th>Cash back</th><th>Cashback back</th><th>Order paid</th><th>How</th><th>Reason</th></tr></thead>
          <tbody>
            {d.rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--slate-800)' }}>
                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{when(r.createdAt)}</td>
                <td>{r.customer?.name || '—'}</td>
                <td>{r.order ? <Link to={`/admin/orders?status=FAILED${r.order.isTest ? '&mode=test' : ''}`}>{r.order.service.toLowerCase()} · {r.order.provider}</Link> : '—'}{r.order?.isTest ? ' 🧪' : ''}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{naira(r.cash)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.cashbackReturned ? naira(r.cashbackReturned) : '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.orderPaid !== null ? naira(r.orderPaid) : '—'}{r.adds === true ? ' ✓' : r.adds === false ? ' ⚠' : ''}</td>
                <td>{r.how}{r.requestRef ? ` (${r.requestRef})` : ''}</td>
                <td style={{ color: 'var(--slate-400)', maxWidth: 260 }}>{r.reason || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {d.rows.length === 0 && <p className="empty-state">No refunds in the last {d.days} days.</p>}
      </div>
      <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>✓ = cash back + cashback back equals what the order took (partial refunds of bulk exam PINs show the part refunded).</p>
    </>
  );
}

export default function AdminLedger() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'refunds' ? 'refunds' : 'ledger';
  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 12 }}>
        <h1>📒 Ledger &amp; refunds</h1>
        <p>Every wallet credit and debit, and every refund — read-only.</p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" className={tab === 'ledger' ? 'btn' : 'btn-secondary btn'} style={{ width: 'auto' }} onClick={() => setParams({})}>Wallet ledger</button>
        <button type="button" className={tab === 'refunds' ? 'btn' : 'btn-secondary btn'} style={{ width: 'auto' }} onClick={() => setParams({ tab: 'refunds' })}>Refunds</button>
      </div>
      {tab === 'ledger' ? <Ledger /> : <Refunds />}
    </AdminLayout>
  );
}
