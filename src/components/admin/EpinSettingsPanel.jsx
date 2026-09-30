import { useEffect, useState } from 'react';
import { getAdminEpins, updateAdminEpins, resolveAdminEpin } from '../../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

// Settings → Recharge Cards: ClubKonnect keys, prices and stuck batches.
// The API key is never shown again after saving (only its last 4).
export default function EpinSettingsPanel() {
  const [d, setD] = useState(null);
  const [userId, setUserId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [on, setOn] = useState(false);
  const [cust, setCust] = useState('0');
  const [agent, setAgent] = useState('2');
  const [supplier, setSupplier] = useState('5');
  const [daily, setDaily] = useState('300');
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  function apply(o) {
    setD(o);
    setUserId(o.userId || '');
    setOn(o.enabled);
    setCust(String(o.customerDiscountPct));
    setAgent(String(o.agentDiscountPct));
    setSupplier(String(o.supplierDiscountPct));
    setDaily(String(o.dailyCards));
  }
  const load = () => getAdminEpins().then(apply).catch((e) => setMsg({ ok: false, text: e.message }));
  useEffect(() => { load(); }, []);

  async function save(e, extra = {}) {
    e?.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      apply(await updateAdminEpins({
        ckUserId: userId.trim(),
        ...(apiKey.trim() ? { ckApiKey: apiKey.trim() } : {}),
        ckEnabled: on,
        epinSupplierDiscountPct: Number(supplier),
        epinCustomerDiscountPct: Number(cust),
        epinAgentDiscountPct: Number(agent),
        epinDailyCards: Number(daily),
        ...extra,
      }));
      setApiKey('');
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function act(b, action) {
    if (action === 'refund' && !window.confirm(`Refund ${naira(b.amount)} to the customer? Only do this after checking on ClubKonnect that these PINs were NOT delivered.`)) return;
    try {
      const r = await resolveAdminEpin(b.id, action);
      setMsg({ ok: true, text: `Batch is now ${r.status}.` });
      load();
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  }

  if (!d) return <p className="empty-state">{msg?.text || 'Loading…'}</p>;

  const example = (v, pct) => naira(v * (1 - Number(pct || 0) / 100));
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      <form className="card" style={{ margin: 0 }} onSubmit={save}>
        <h2 style={{ marginTop: 0, fontSize: 17 }}>🖨️ Recharge card printing (ClubKonnect)</h2>
        <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -4 }}>
          Customers and agents buy MTN, Glo, Airtel and T2mobile airtime PINs (₦100 / ₦200 / ₦500) from their wallet and print them as cards. Money is taken first and refunded automatically if ClubKonnect can’t deliver.
        </p>
        {msg && <p style={{ color: msg.ok ? 'var(--green-500)' : 'var(--red-500)', fontSize: 14 }}>{msg.text}</p>}

        <div style={{ background: 'var(--slate-800)', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12 }}>
          ClubKonnect wallet:{' '}
          {d.balance !== null ? <strong style={{ color: d.balance < 5000 ? 'var(--gold)' : 'var(--green-500)' }}>{naira(d.balance)}</strong> : <span style={{ color: 'var(--slate-400)' }}>{d.balanceError || 'save your keys to see it'}</span>}
          {d.balance !== null && d.balance < 5000 && <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>Low — fund it on clubkonnect.com so orders don’t fail.</div>}
          <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 6 }}>Last 30 days: {d.last30.cards.toLocaleString()} cards · sales {naira(d.last30.sales)} · est. profit {naira(d.last30.estProfit)}</div>
        </div>

        <div className="field">
          <label htmlFor="ckUser">ClubKonnect UserID</label>
          <input id="ckUser" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="e.g. CK100123456" autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="ckKey">API key</label>
          <input id="ckKey" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={d.keySet ? `Saved (${d.keyHint || 'server'}) — paste a new one to replace` : 'Paste from clubkonnect.com → API Docs'} />
          <small style={{ color: 'var(--slate-400)' }}>
            Both are on clubkonnect.com → API Docs (“Your credentials”).{' '}
            {d.keyHint && <button type="button" onClick={(e) => { if (window.confirm('Remove the saved key? Card printing will stop.')) save(e, { ckApiKeyClear: true, ckEnabled: false }); }} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', padding: 0, fontSize: 12 }}>Remove key</button>}
          </small>
        </div>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} style={{ width: 'auto' }} />
          Turn on “Print Cards” for customers
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="epSup">ClubKonnect gives you (%)</label>
            <input id="epSup" type="number" min="0" max="50" step="0.1" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>For profit figures. Check your rate on ClubKonnect.</small>
          </div>
          <div className="field">
            <label htmlFor="epDaily">Cards per customer per day</label>
            <input id="epDaily" type="number" min="1" max="5000" value={daily} onChange={(e) => setDaily(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="epCust">Customer discount (%)</label>
            <input id="epCust" type="number" min="0" max="50" step="0.1" value={cust} onChange={(e) => setCust(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>₦100 card costs {example(100, cust)}</small>
          </div>
          <div className="field">
            <label htmlFor="epAgent">Agent discount (%)</label>
            <input id="epAgent" type="number" min="0" max="50" step="0.1" value={agent} onChange={(e) => setAgent(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>₦100 card costs {example(100, agent)}</small>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 0 }}>Your profit per ₦100 card ≈ {naira(Number(supplier) - Number(cust))} (customers) / {naira(Number(supplier) - Number(agent))} (agents). Discounts can’t go above what ClubKonnect gives you.</p>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </form>

      {d.pending.length > 0 && (
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>⏳ Waiting for ClubKonnect ({d.pending.length})</h3>
          <p style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: -4 }}>These are re-checked automatically. Refund only after confirming on ClubKonnect that the PINs were not delivered (search the reference).</p>
          {d.pending.map((b) => (
            <div key={b.id} style={{ borderTop: '1px solid var(--slate-700)', padding: '8px 0', fontSize: 13 }}>
              <div><strong>{b.quantity} × {naira(b.value)} {b.networkLabel}</strong> · {naira(b.amount)} · {new Date(b.createdAt).toLocaleString('en-NG')}</div>
              <div style={{ color: 'var(--slate-400)', fontSize: 12 }}>Ref {b.requestId} · {b.providerStatus || '—'}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => act(b, 'recheck')}>Check again</button>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12, color: 'var(--red-500)' }} onClick={() => act(b, 'refund')}>Refund customer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {d.recent.length > 0 && (
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Recent orders</h3>
          {d.recent.map((b) => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderTop: '1px solid var(--slate-700)', padding: '6px 0', fontSize: 13 }}>
              <span>{b.status === 'SUCCESS' ? b.delivered : b.quantity} × {naira(b.value)} {b.networkLabel}<span style={{ display: 'block', color: 'var(--slate-400)', fontSize: 11 }}>{new Date(b.createdAt).toLocaleString('en-NG')} · {b.requestId}</span></span>
              <span style={{ textAlign: 'right' }}>{naira(b.amount - b.refunded)}<span style={{ display: 'block', fontSize: 11, color: b.status === 'SUCCESS' ? 'var(--green-500)' : b.status === 'FAILED' ? 'var(--red-500)' : 'var(--gold)' }}>{b.status === 'FAILED' ? 'Refunded' : b.status === 'PENDING' ? 'Waiting' : 'Delivered'}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
