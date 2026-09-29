import { useEffect, useState } from 'react';
import { getSavings, saveToSavings, withdrawSavings } from '../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const LABEL = { SAVINGS_IN: 'Moved in', SAVINGS_OUT: 'Moved to wallet', INTEREST: 'Interest' };

// Savings pocket on the Wallet page. Hidden while the owner has savings
// switched off — unless the customer still has money in it, so they
// can always move it back.
export default function SavingsCard({ onChanged }) {
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    getSavings().then(setData).catch(() => setData(null));
  }, []);

  if (!data || (!data.enabled && !(data.savingsBalance > 0))) return null;

  async function move(kind) {
    const n = Number(amount);
    if (!(n > 0)) {
      setErr('Enter an amount.');
      return;
    }
    setBusy(kind);
    setErr('');
    setMsg('');
    try {
      const d = await (kind === 'in' ? saveToSavings(n) : withdrawSavings(n));
      setData(d);
      setAmount('');
      setMsg(kind === 'in' ? `${naira(n)} moved to savings. It starts earning from tomorrow night.` : `${naira(n)} moved to your wallet.`);
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  const max = (kind) => setAmount(String(kind === 'in' ? Math.floor(data.walletBalance) : data.savingsBalance));

  return (
    <div className="card" style={{ border: '1px solid var(--purple)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>🐖 Savings</div>
          <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>
            {data.enabled ? `Earn ${data.ratePct}% a year, paid every night` : 'Interest is paused — move your money to your wallet any time'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{naira(data.savingsBalance)}</div>
          <div style={{ fontSize: 12, color: 'var(--green-500)' }}>Earned so far {naira(data.earned)}</div>
        </div>
      </div>
      {data.enabled && data.estimatedTomorrow > 0 && (
        <p style={{ fontSize: 13, margin: '8px 0 0' }}>About <b>{naira(data.estimatedTomorrow)}</b> tonight.</p>
      )}
      {err && <p className="error-text" style={{ margin: '8px 0 0' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '8px 0 0' }}>{msg}</p>}
      <div className="field" style={{ margin: '10px 0 8px' }}>
        <label htmlFor="sv-amt">Amount (₦)</label>
        <input id="sv-amt" type="number" inputMode="decimal" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" />
        <small style={{ color: 'var(--slate-400)' }}>
          {data.enabled && <><button type="button" onClick={() => max('in')} style={{ background: 'none', border: 'none', color: 'var(--purple)', padding: 0, cursor: 'pointer', fontSize: 12 }}>All wallet ({naira(data.walletBalance)})</button> · </>}
          <button type="button" onClick={() => max('out')} style={{ background: 'none', border: 'none', color: 'var(--purple)', padding: 0, cursor: 'pointer', fontSize: 12 }}>All savings</button>
        </small>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {data.enabled && <button type="button" className="btn" style={{ flex: 1 }} disabled={Boolean(busy)} onClick={() => move('in')}>{busy === 'in' ? 'Moving…' : 'Save'}</button>}
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} disabled={Boolean(busy) || data.savingsBalance <= 0} onClick={() => move('out')}>{busy === 'out' ? 'Moving…' : 'Move to wallet'}</button>
      </div>
      {data.enabled && (
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 0' }}>
          Interest is worked out each night on the lowest amount you kept in savings that day{data.minBalance > 0 ? `, from ${naira(data.minBalance)}` : ''}{data.maxBalance ? ` up to ${naira(data.maxBalance)}` : ''}. Move money back to your wallet any time — no fees, no lock.
        </p>
      )}
      {data.history?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={() => setShowHistory((v) => !v)} style={{ background: 'none', border: 'none', color: 'var(--purple)', padding: 0, cursor: 'pointer', fontSize: 13 }}>
            {showHistory ? 'Hide savings history' : 'Savings history'}
          </button>
          {showHistory && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: 13 }}>
              {data.history.slice(0, 10).map((t) => (
                <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--slate-700)' }}>
                  <span>{LABEL[t.type]} · {new Date(t.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                  <span style={{ color: t.type === 'SAVINGS_OUT' ? 'var(--slate-400)' : 'var(--green-500)' }}>{t.type === 'SAVINGS_OUT' ? '−' : '+'}{naira(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
