import { useEffect, useState } from 'react';
import { getAdminAnalytics } from '../api';
import EarningsCalculator from './admin/EarningsCalculator';

function money(n) {
  return `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

const RANGES = [7, 30, 90];
const BAR = '#8b5cf6';

// Daily profit bars (one series, so no legend) with a hover tooltip on
// each bar. Negative days (refund-heavy) sit below a zero line.
function ProfitChart({ days }) {
  const [hover, setHover] = useState(null);
  const H = 180;
  const PADL = 8;
  const max = Math.max(1, ...days.map((d) => d.profit));
  const min = Math.min(0, ...days.map((d) => d.profit));
  const span = max - min || 1;
  const zeroY = (max / span) * H;
  const slot = 100 / days.length;
  const barW = Math.max(0.6, slot - (days.length > 40 ? 0.35 : 0.8));
  const labelEvery = days.length > 31 ? 15 : days.length > 10 ? 5 : 1;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 100 ${H + 22}`} preserveAspectRatio="none" style={{ width: '100%', height: H + 22, display: 'block', overflow: 'visible' }} role="img" aria-label="Profit per day">
        <line x1="0" x2="100" y1={zeroY} y2={zeroY} stroke="rgba(148,163,184,0.35)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
        {days.map((d, i) => {
          const h = (Math.abs(d.profit) / span) * H;
          const y = d.profit >= 0 ? zeroY - h : zeroY;
          const x = i * slot + (slot - barW) / 2;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
              <rect x={i * slot} y="0" width={slot} height={H} fill="transparent" />
              <rect x={x} y={y} width={barW} height={Math.max(h, d.profit ? 1 : 0)} rx="0.6" fill={BAR} opacity={hover === null || hover === i ? 1 : 0.45} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', position: 'relative', height: 16, fontSize: 11, color: 'var(--slate-400)', marginLeft: PADL }}>
        {days.map((d, i) => (i % labelEvery === 0 ? (
          <span key={d.date} style={{ position: 'absolute', left: `${i * slot}%` }}>
            {new Date(`${d.date}T12:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
          </span>
        ) : null))}
      </div>
      {hover !== null && days[hover] && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `min(max(${(hover + 0.5) * slot}% - 80px, 0px), calc(100% - 160px))`,
            width: 160,
            background: 'var(--slate-900, #0f172a)',
            border: '1px solid var(--slate-700, #334155)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {new Date(`${days[hover].date}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          <div>Profit: <strong>{money(days[hover].profit)}</strong></div>
          <div style={{ color: 'var(--slate-400)' }}>Sales: {money(days[hover].revenue)}</div>
          <div style={{ color: 'var(--slate-400)' }}>Orders: {days[hover].orders}</div>
        </div>
      )}
    </div>
  );
}

const INCOME = [
  ['vtpassCommission', 'VTpass commission', 'VTpass charges you less than face value'],
  ['purchaseMarkup', 'Your markup on purchases', 'Price paid − face value, after discounts & promo codes'],
  ['sendToBankFees', 'Send-to-bank fees', 'Fee you charge per transfer'],
  ['bankFundingFees', 'Bank-funding fees', 'Fee you keep from automatic funding'],
  ['airtimeToCashFees', 'Airtime-to-Cash fees', 'Kept as airtime on your line'],
];
const COSTS = [
  ['monnifyFundingFees', 'Monnify: bank funding', '1.5% (max ₦2,000) + VAT on each deposit'],
  ['monnifyPayoutFees', 'Monnify: send-to-bank', '₦10 / ₦20 / ₦40 + VAT per transfer'],
  ['rewards', 'Rewards paid', 'Cashback, referral, loyalty, contest prizes, coupons'],
];

// Every naira in and out, so the profit number isn't a mystery.
function Breakdown({ b, profit, exact, orders }) {
  const row = ([k, label, hint], sign) => {
    const v = Number(b[sign > 0 ? 'income' : 'costs']?.[k] || 0);
    if (!v && k !== 'vtpassCommission') return null;
    return (
      <tr key={k}>
        <td>{label}<div style={{ fontSize: 11, color: 'var(--slate-400)' }}>{hint}</div></td>
        <td style={{ textAlign: 'right', color: sign > 0 ? (v < 0 ? 'var(--red-500)' : 'var(--green-500)') : 'var(--red-500)', whiteSpace: 'nowrap' }}>{sign > 0 ? (v < 0 ? '−' : '+') : '−'}{money(Math.abs(v))}</td>
      </tr>
    );
  };
  return (
    <div className="card" style={{ margin: '0 0 12px' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Where your profit comes from</div>
      <table>
        <tbody>
          {INCOME.map((x) => row(x, 1))}
          {COSTS.map((x) => row(x, -1))}
          <tr><td><strong>Profit</strong></td><td style={{ textAlign: 'right' }}><strong>{money(profit)}</strong></td></tr>
        </tbody>
      </table>
      {orders > 0 && (
        <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '8px 0 0' }}>
          Commission is exact (from VTpass) on {exact} of {orders} orders; the rest use VTpass's published rates. Monnify fees use its published prices.
        </p>
      )}
    </div>
  );
}

export default function ProfitPanel() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    setData(null);
    getAdminAnalytics(range).then(setData).catch((err) => setError(err.message));
  }, [range]);

  const t = data?.totals;
  const tile = (label, value, sub) => (
    <div className="card stat-card" style={{ margin: 0 }}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '0 0 12px' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Profit</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {RANGES.map((r) => (
            <button key={r} type="button" className={r === range ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => setRange(r)}>
              {r} days
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!data && !error && <p className="empty-state">Loading…</p>}

      {data && (
        <>
          <div className="grid" style={{ marginBottom: 12 }}>
            {tile('Profit', money(t.profit), 'After VTpass commission, your fees, Monnify fees and rewards')}
            {tile('Sales', money(t.revenue), `${t.orders} successful order${t.orders === 1 ? '' : 's'}`)}
            {tile('Margin', t.revenue ? `${((t.purchaseProfit / t.revenue) * 100).toFixed(1)}%` : '—', 'Profit on purchases ÷ sales')}
            {tile('Failed orders', t.failedOrders, 'Refunded automatically')}
          </div>

          {data.breakdown && <Breakdown b={data.breakdown} profit={t.profit} exact={t.commissionExactOrders} orders={t.orders} />}

          <div className="card" style={{ margin: '0 0 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>Profit per day</div>
              <button type="button" onClick={() => setShowTable((v) => !v)} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', fontSize: 13 }}>
                {showTable ? 'Hide table' : 'Show as table'}
              </button>
            </div>
            <ProfitChart days={data.days} />
            {showTable && (
              <table style={{ marginTop: 12 }}>
                <thead><tr><th>Date</th><th>Orders</th><th>Sales</th><th>Profit</th></tr></thead>
                <tbody>
                  {[...data.days].reverse().filter((d) => d.orders || d.profit).map((d) => (
                    <tr key={d.date}><td>{d.date}</td><td>{d.orders}</td><td>{money(d.revenue)}</td><td>{money(d.profit)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ margin: 0 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>By service</div>
            {data.byService.length === 0 ? (
              <p className="empty-state">No sales in this period.</p>
            ) : (
              <table>
                <thead><tr><th>Service</th><th>Orders</th><th>Sales</th><th>VTpass commission</th><th>Your markup</th><th>Profit</th></tr></thead>
                <tbody>
                  {data.byService.map((s) => (
                    <tr key={s.service}>
                      <td>{s.service.charAt(0) + s.service.slice(1).toLowerCase()}</td>
                      <td>{s.orders}</td>
                      <td>{money(s.revenue)}</td>
                      <td>{money(s.commission)}</td>
                      <td>{money(s.margin)}</td>
                      <td><strong>{money(s.profit)}</strong></td>
                    </tr>
                  ))}
                  {t.transfers > 0 && (
                    <tr>
                      <td>Send to bank</td><td>{t.transfers}</td><td>{money(t.transferVolume)}</td><td>—</td><td>{money(t.transferFees)} fees</td><td><strong>{money(t.transferFees - (data.breakdown?.costs?.monnifyPayoutFees || 0))}</strong></td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <EarningsCalculator />
        </>
      )}
    </div>
  );
}
