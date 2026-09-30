import { useState } from 'react';
import { request } from '../api';
import { useAuth } from '../context/AuthContext';

// Only these app endpoints can be called from an assistant card.
const ALLOWED = [
  ['PATCH', /^\/api\/schedules\/[\w-]+$/],
  ['DELETE', /^\/api\/schedules\/[\w-]+$/],
  ['PUT', /^\/api\/reminders\/settings$/],
  ['POST', /^\/api\/security\/sessions\/logout-others$/],
  ['POST', /^\/api\/security\/freeze$/],
  ['POST', /^\/api\/airtime-cash\/requests$/],
  ['PUT', /^\/api\/family\/[\w-]+$/],
  ['POST', /^\/api\/family\/[\w-]+\/send-now$/],
  ['PUT', /^\/api\/agent\/book\/[\w-]+$/],
];

// Something the help assistant got ready (pause a repeat, log out other
// phones, freeze the account…). Nothing happens until the customer taps
// the button; freezing also needs their password.
export default function ChatActionCard({ card }) {
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const r = card.request || {};
  const allowed = ALLOWED.some(([m, re]) => m === r.method && re.test(r.path));

  async function go() {
    if (!allowed) return;
    if (card.danger && !window.confirm(`${card.title}?`)) return;
    setBusy(true);
    setState(null);
    try {
      const body = card.confirm === 'PASSWORD' ? { ...(r.body || {}), password } : r.body;
      await request(r.path, { method: r.method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setState({ ok: true });
      window.dispatchEvent(new Event('zp-refresh'));
      if (card.logsOut) setTimeout(() => logout(), 2500);
    } catch (e) {
      setState({ error: e.message });
    } finally {
      setBusy(false);
    }
  }

  if (state?.ok) return <div style={{ marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid var(--green-500)', fontSize: 13 }}>✅ {card.doneText || 'Done.'}</div>;

  return (
    <div style={{ marginTop: 6, padding: 12, borderRadius: 12, border: `1px solid ${card.danger ? 'var(--red-500)' : 'var(--purple)'}`, background: card.danger ? 'rgba(239,68,68,0.08)' : 'rgba(134,59,255,0.08)' }}>
      <div style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 4 }}>Please check before you confirm</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{card.icon} {card.title}</div>
      {(card.lines || []).map(([k, v], i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, marginTop: 4 }}>
          <span style={{ color: 'var(--slate-400)' }}>{k}</span><span style={{ textAlign: 'right' }}>{v}</span>
        </div>
      ))}
      {card.confirm === 'PASSWORD' && (
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" aria-label="Your password" style={{ marginTop: 10, fontSize: 14 }} />
      )}
      {state?.error && <div className="error-text" style={{ fontSize: 12, marginTop: 6 }}>{state.error}</div>}
      <button type="button" className="btn" style={{ marginTop: 10, padding: '8px 12px', fontSize: 14, background: card.danger ? 'var(--red-500)' : undefined }} disabled={busy || !allowed || (card.confirm === 'PASSWORD' && !password)} onClick={go}>
        {busy ? 'Please wait…' : card.button || 'Confirm'}
      </button>
    </div>
  );
}
