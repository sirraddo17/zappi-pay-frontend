import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAirtimeCashConfig, getMyAirtimeCashRequests, submitAirtimeCashRequest, getOrders } from '../api';
import BottomNav from '../components/BottomNav';

const STATUS_COLORS = { PENDING: 'var(--orange)', APPROVED: 'var(--green-500)', REJECTED: '#ef4444' };
const NETWORK_LABELS = { mtn: 'MTN', glo: 'Glo', airtel: 'Airtel', etisalat: '9mobile' };

function naira(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Same rounding as the backend's computePayout(): always down, so
// the quote shown here is never more than what actually gets paid.
function payoutFor(amount, feePercent) {
  return Math.max(0, Math.floor(Number(amount || 0) * (1 - Number(feePercent || 0) / 100)));
}

export default function AirtimeCash() {
  const { customer } = useAuth();
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState(null);
  const [requests, setRequests] = useState(null);
  const [airtimeOrders, setAirtimeOrders] = useState([]);

  const [orderId, setOrderId] = useState(searchParams.get('order') || '');
  const [network, setNetwork] = useState('');
  const [senderPhone, setSenderPhone] = useState(customer?.phone || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  function loadRequests() {
    getMyAirtimeCashRequests()
      .then((data) => setRequests(data.requests || []))
      .catch(() => setRequests([]));
  }

  useEffect(() => {
    getAirtimeCashConfig()
      .then(setConfig)
      .catch((err) => setError(err.message));
    loadRequests();
    getOrders()
      .then((data) => setAirtimeOrders((data.orders || []).filter((o) => o.service === 'AIRTIME' && o.status === 'SUCCESS').slice(0, 20)))
      .catch(() => {});
  }, []);

  // Picking one of their airtime purchases fills in the network,
  // number and amount from that order (costAmount is the airtime
  // value actually delivered, before our markup/discount).
  useEffect(() => {
    const order = airtimeOrders.find((o) => o.id === orderId);
    if (!order) return;
    if (NETWORK_LABELS[order.provider]) setNetwork(order.provider);
    setSenderPhone(order.recipient);
    setAmount(String(Math.round(Number(order.costAmount ?? order.amount))));
  }, [orderId, airtimeOrders]);

  const selectedNetwork = config?.networks?.find((n) => n.key === network);
  const payout = config ? payoutFor(amount, config.feePercent) : 0;
  const fee = Number(amount || 0) - payout;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!network || !senderPhone || !amount) {
      setError('Please fill in the network, phone number and amount.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await submitAirtimeCashRequest({
        network,
        senderPhone: senderPhone.trim(),
        amount: Number(amount),
        orderId: orderId || undefined,
        note: note.trim() || undefined,
      });
      setSubmitted({ ...data.request, receivingNumber: data.receivingNumber });
      setOrderId('');
      setAmount('');
      setNote('');
      loadRequests();
    } catch (err) {
      setError(err.message || 'Could not submit your request.');
    } finally {
      setSubmitting(false);
    }
  }

  const unavailable = config && (!config.enabled || config.networks.length === 0);

  return (
    <div className="app-shell">
      <div className="page-header">
        <Link to="/" style={{ color: 'var(--purple, var(--orange))', textDecoration: 'none', fontSize: 14 }}>
          &larr; Back
        </Link>
        <h1>Airtime to Cash</h1>
        <p>Bought airtime by mistake? Turn it back into wallet cash.</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      {!config && !error && <p className="empty-state">Loading…</p>}

      {unavailable && (
        <div className="card">
          <p style={{ margin: 0 }}>Airtime to Cash isn't available right now. Please check back later or contact support.</p>
        </div>
      )}

      {submitted && (
        <div className="card" style={{ border: '1px solid var(--gold)', background: 'rgba(255,184,48,0.1)' }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Next step: send the airtime</h2>
          <p style={{ fontSize: 14, margin: '0 0 8px' }}>
            Transfer <strong>{naira(submitted.amount)}</strong> {NETWORK_LABELS[submitted.network]} airtime from{' '}
            <strong>{submitted.senderPhone}</strong> to:
          </p>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1, margin: '0 0 8px' }}>{submitted.receivingNumber}</div>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>
            Use your network's Share &amp; Sell / airtime transfer option. Once we confirm it has arrived,{' '}
            <strong>{naira(submitted.payoutAmount)}</strong> will be added to your wallet and you'll get a notification.
          </p>
        </div>
      )}

      {config && !unavailable && (
        <form className="card" onSubmit={handleSubmit}>
          {airtimeOrders.length > 0 && (
            <div className="field">
              <label htmlFor="orderId">Which purchase was a mistake? (optional)</label>
              <select id="orderId" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                <option value="">Not linked to a purchase</option>
                {airtimeOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {(NETWORK_LABELS[o.provider] || o.provider)} · {o.recipient} · {naira(o.costAmount ?? o.amount)} · {fmtDate(o.createdAt)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="network">Network</label>
            <select id="network" value={network} onChange={(e) => setNetwork(e.target.value)} required>
              <option value="">Select…</option>
              {config.networks.map((n) => (
                <option key={n.key} value={n.key}>{n.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="senderPhone">Phone number the airtime is on</label>
            <input id="senderPhone" type="tel" inputMode="numeric" maxLength={11} value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="080…" required />
          </div>

          <div className="field">
            <label htmlFor="amount">Airtime amount (₦)</label>
            <input
              id="amount"
              type="number"
              min={config.minAmount}
              max={config.maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '4px 0 0' }}>
              Between {naira(config.minAmount)} and {naira(config.maxAmount)}.
            </p>
          </div>

          <div className="field">
            <label htmlFor="note">Note (optional)</label>
            <input id="note" type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. bought for the wrong number" />
          </div>

          {Number(amount) > 0 && (
            <div style={{ margin: '0 0 12px', fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-400)' }}>
                <span>Airtime value</span>
                <span>{naira(amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-400)', margin: '4px 0' }}>
                <span>Service fee ({config.feePercent}%)</span>
                <span>−{naira(fee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                <span>You'll receive</span>
                <span>{naira(payout)}</span>
              </div>
              {selectedNetwork && (
                <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>
                  After submitting, you'll transfer the airtime to our {selectedNetwork.label} line: {selectedNetwork.receivingNumber}
                </p>
              )}
            </div>
          )}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      )}

      <div className="section-label">My Requests</div>
      <div className="card">
        {requests === null ? (
          <p className="empty-state" style={{ margin: 0 }}>Loading…</p>
        ) : requests.length === 0 ? (
          <p className="empty-state" style={{ margin: 0 }}>No requests yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map((r) => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--slate-700)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>
                    {NETWORK_LABELS[r.network] || r.network} {naira(r.amount)} → {naira(r.payoutAmount)}
                  </span>
                  <span style={{ color: STATUS_COLORS[r.status], fontWeight: 600, fontSize: 13 }}>{r.status}</span>
                </div>
                <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 2 }}>
                  From {r.senderPhone} · {fmtDate(r.createdAt)}
                </div>
                {r.adminNote && (
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {r.status === 'REJECTED' ? 'Reason: ' : 'Note: '}
                    {r.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
