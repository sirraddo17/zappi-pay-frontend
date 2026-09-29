import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAgentInfo, requestAgentAccount } from '../api';

const label = (s) => s.charAt(0) + s.slice(1).toLowerCase();

// "Become an agent" — resellers buy at cheaper agent prices once an
// admin approves them. Hidden unless the admin has agent pricing on.
export default function AgentCard() {
  const { refreshCustomer } = useAuth();
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    getAgentInfo().then(setInfo).catch(() => setInfo(null));
  }
  useEffect(load, []);

  if (!info || (!info.enabled && !info.isAgent)) return null;
  const rates = Object.entries(info.rates || {}).filter(([, v]) => Number(v) > 0);
  const rateText = rates.map(([s, v]) => `${label(s)} ${v}%`).join(' · ');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await requestAgentAccount(name, address);
      load();
      refreshCustomer?.();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ margin: '0 0 16px', border: info.isAgent ? '1px solid var(--gold, #f5b82e)' : undefined }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {info.isAgent ? '⭐ You are a ZappiPay agent' : 'Become a ZappiPay agent'}
      </div>
      {info.isAgent ? (
        <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>
          Agent prices are applied automatically when you buy{rateText ? `: extra ${rateText} off` : ''}.
        </p>
      ) : info.agentRequestedAt ? (
        <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>
          Request received for <strong>{info.agentBusinessName}</strong>{info.agentShopAddress ? ` (${info.agentShopAddress})` : ''}. We'll review it and notify you.
        </p>
      ) : (
        <>
          {info.agentRejectedAt && (
            <p style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--orange, #f97316)' }}>
              Your last application was not approved{info.agentRejectReason ? `: ${info.agentRejectReason}` : '.'}
              {Date.now() - new Date(info.agentRejectedAt).getTime() < 7 * 86400000 ? ' You can apply again 7 days after it was declined.' : ' You can apply again now.'}
            </p>
          )}
          <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0 }}>
            Sell airtime, data and bills to your customers and buy at cheaper agent prices{rateText ? ` — ${rateText} extra off` : ''}.
          </p>
          {!open ? (
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>Apply to be an agent</button>
          ) : (
            <form onSubmit={submit}>
              {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
              <div className="field">
                <label htmlFor="agentName">Business or shop name</label>
                <input id="agentName" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="e.g. Ade Phones & Accessories" />
              </div>
              <div className="field">
                <label htmlFor="agentAddr">Shop address</label>
                <textarea id="agentAddr" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} required placeholder="e.g. Shop 12, Bodija Market, Bodija, Ibadan, Oyo State" style={{ width: '100%', boxSizing: 'border-box' }} />
                <small style={{ color: 'var(--slate-400)' }}>Street, area, town and state. We may visit or call to confirm.</small>
              </div>
              <button type="submit" className="btn" disabled={busy || !name.trim() || address.trim().length < 10}>{busy ? 'Sending…' : 'Send application'}</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
