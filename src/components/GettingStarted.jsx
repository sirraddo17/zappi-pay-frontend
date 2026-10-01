import { useState } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'zappipay_getting_started_hidden';
export function hiddenBefore() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

// Home → "Getting started" checklist for new customers (until their
// first purchase). "Ask the assistant" opens the Help chat.
export default function GettingStarted({ customer, balance, funded, onHide }) {
  const [hidden, setHidden] = useState(hiddenBefore);
  if (hidden || !customer) return null;
  const steps = [
    { done: funded || Number(balance) > 0, label: 'Fund your wallet', hint: 'Get your own account number and transfer from any bank.', to: '/wallet' },
    { done: Boolean(customer.hasPin), label: 'Create your transaction PIN', hint: 'You need it to confirm payments.', to: '/security' },
    { done: Boolean(customer.username), label: 'Choose a username', hint: 'Friends can send you money with it — it’s also your referral code.', to: '/refer' },
    { done: false, label: 'Make your first purchase', hint: 'Airtime or data is a good start.', to: '/buy/airtime' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  function hide() {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setHidden(true);
    onHide?.();
  }
  return (
    <div className="card" style={{ marginTop: 16, border: '1px solid var(--purple, #863bff)', background: 'rgba(134,59,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <b style={{ flex: 1, fontSize: 15 }}>👋 Getting started · {doneCount}/4</b>
        <button type="button" onClick={hide} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 12 }}>Hide</button>
      </div>
      <div style={{ height: 6, background: 'var(--slate-800)', borderRadius: 4, margin: '8px 0 10px' }}>
        <div style={{ width: `${(doneCount / 4) * 100}%`, height: '100%', background: 'var(--purple, #863bff)', borderRadius: 4 }} />
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {steps.map((s) => (
          <Link key={s.label} to={s.to} style={{ display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none', color: 'inherit', opacity: s.done ? 0.6 : 1 }}>
            <span style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: s.done ? 'var(--green-500, #22c55e)' : 'transparent', border: s.done ? 'none' : '1px solid var(--slate-500, #64748b)', color: '#fff' }}>{s.done ? '✓' : ''}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14, textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</span>
              {!s.done && <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>{s.hint}</span>}
            </span>
            {!s.done && <span style={{ color: 'var(--slate-400)' }}>›</span>}
          </Link>
        ))}
      </div>
      <button type="button" className="btn btn-secondary" style={{ width: 'auto', marginTop: 10, padding: '6px 14px', fontSize: 13 }} onClick={() => window.dispatchEvent(new CustomEvent('zappipay:ask', { detail: { text: 'Help me get started' } }))}>
        💬 Ask the assistant
      </button>
    </div>
  );
}
