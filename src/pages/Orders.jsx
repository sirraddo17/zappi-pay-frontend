import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, getEpinBatches, getWalletTransactions } from '../api';
import { isCredit, txLabel, typeLabel, isPurchaseDebit } from '../lib/txMeta';
import useAutoRefresh from '../lib/useAutoRefresh';
import RateExperience from '../components/RateExperience';
import BottomNav from '../components/BottomNav';
import ShowMore, { FIRST_COUNT } from '../components/ShowMore';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_PILL = { SUCCESS: ['Successful', 'ok'], APPROVED: ['Successful', 'ok'], PENDING: ['Pending', 'wait'], FAILED: ['Failed', 'no'], REFUNDED: ['Refunded', 'no'], REJECTED: ['Rejected', 'no'] };
const SERVICE_ICON = { AIRTIME: '📞', DATA: '📶', ELECTRICITY: '💡', CABLE: '📺', EDUCATION: '🎓', INTERNET: '🌐', BETTING: '🏆', INTERNATIONAL: '🌍', INSURANCE: '🚗', 'RECHARGE CARDS': '🖨️' };
const pretty = (s) => String(s || '').charAt(0) + String(s || '').slice(1).toLowerCase();
const TABS = [['ALL', 'All'], ['BUY', 'Purchases'], ['IN', 'Money in'], ['OUT', 'Money out']];

export default function Orders() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(FIRST_COUNT);
  const [tab, setTab] = useState('ALL');
  const [rate, setRate] = useState(null);

  // Everything in one list: purchases (with their receipts), recharge
  // card batches, and every wallet movement (funding, transfers, refunds,
  // cashback…). Purchase debits are skipped — the purchase itself is shown.
  function load() {
    Promise.all([getOrders(), getEpinBatches().catch(() => ({ batches: [] })), getWalletTransactions().catch(() => ({ transactions: [] }))])
      .then(([data, cards, wallet]) => {
        const orders = (data.orders || []).map((o) => ({ key: `o${o.id}`, kind: 'BUY', link: `/orders/${o.id}`, icon: SERVICE_ICON[o.service] || '🧾', title: pretty(o.service), sub: o.recipient, amount: Number(o.amount), credit: false, status: o.status, at: o.createdAt, raw: o }));
        const batches = (cards.batches || []).map((b) => ({
          key: `b${b.id}`, kind: 'BUY', link: `/print-cards/${b.id}`, icon: '🖨️', title: 'Recharge cards',
          sub: `${b.status === 'SUCCESS' ? b.delivered : b.quantity} × ₦${Number(b.value).toLocaleString()} ${b.networkLabel}`,
          amount: b.amount - (b.refunded || 0) || b.amount, credit: false, status: b.status === 'FAILED' ? 'REFUNDED' : b.status, at: b.createdAt,
        }));
        const tx = (wallet.transactions || []).filter((t) => !isPurchaseDebit(t)).map((t) => {
          const credit = isCredit(t.type);
          return { key: `t${t.id}`, kind: credit ? 'IN' : 'OUT', link: `/transactions/${t.id}`, icon: credit ? '⬇️' : '⬆️', title: typeLabel(t.type), sub: t.type === 'FUND' ? 'Wallet funding' : txLabel(t), amount: Number(t.amount), credit, status: t.status, at: t.createdAt };
        });
        setItems([...orders, ...batches, ...tx].sort((x, y) => new Date(y.at) - new Date(x.at)));
        setRate((data.orders || [])[0] || null);
        setError('');
      })
      .catch((err) => { if (!items) setError(err.message); });
  }

  useEffect(load, []);
  // Pending purchases switch to Successful / Refunded on their own.
  useAutoRefresh(load, Boolean(items?.some((o) => o.kind === 'BUY' && o.status === 'PENDING')));
  const list = (items || []).filter((x) => tab === 'ALL' || x.kind === tab);

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>History</h1>
        <p>Every purchase and wallet transaction — tap one for its receipt</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      {rate && <RateExperience order={rate} maxAgeMs={30 * 60 * 1000} />}

      <div className="plan-tabs" role="tablist" style={{ margin: '0 16px 10px' }}>
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={`plan-tab${tab === k ? ' on' : ''}`} onClick={() => { setTab(k); setShown(FIRST_COUNT); }}>{l}</button>)}
      </div>

      {items === null ? (
        <div style={{ margin: '0 16px' }}><SkeletonRows rows={4} /></div>
      ) : list.length === 0 ? (
        <p className="empty-state">{tab === 'ALL' ? 'No transactions yet. Fund your wallet and make your first purchase — it shows up here.' : 'Nothing here yet.'}</p>
      ) : (
        <>
          <div className="card" style={{ padding: 0 }}>
            {list.slice(0, shown).map((o) => {
              const [label, tone] = STATUS_PILL[o.status] || [pretty(o.status), 'wait'];
              return (
                <Link to={o.link} className="hist-row" key={o.key}>
                  <span className="hist-ico" style={{ fontSize: 18, background: o.credit ? 'rgba(34,197,94,.13)' : 'var(--slate-900)' }}>{o.icon}</span>
                  <span className="hist-main"><b>{o.title}</b><small>{o.sub ? `${o.sub} · ` : ''}{fmtDate(o.at)}</small></span>
                  <span style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <b style={{ display: 'block', fontSize: 14, color: o.credit ? 'var(--green-500)' : undefined }}>{o.credit ? '+' : '−'}{fmtMoney(o.amount)}</b>
                    {label !== 'Successful' && <span className={`pill ${tone}`} style={{ marginTop: 3 }}>{label}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
          <div style={{ margin: '0 16px' }}>
            <ShowMore total={list.length} shown={shown} setShown={setShown} />
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
