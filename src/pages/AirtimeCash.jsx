import { SkeletonRows } from '../components/Skeleton';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAirtimeCashConfig, getMyAirtimeCashRequests, submitAirtimeCashRequest, getOrders } from '../api';
import useAutoRefresh from '../lib/useAutoRefresh';
import BottomNav from '../components/BottomNav';
import { useShowMore } from '../components/ShowMore';
import { SvcHero, Step, NetChips, Summary, Trust } from '../components/ServiceKit';
import { NETWORK_STYLE } from '../lib/network';

const STATUS_PILL = { PENDING: ['Checking', 'wait'], APPROVED: ['Paid', 'ok'], REJECTED: ['Declined', 'no'] };
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


// Step-by-step airtime transfer instructions for one network, with the
// code filled in (their PIN stays with them — they type it themselves).
function TransferHow({ net, amount }) {
  const t = net?.transfer;
  const [copied, setCopied] = useState(false);
  if (!t) return null;
  const amt = Number(amount) > 0 ? String(Math.round(Number(amount))) : 'AMOUNT';
  const filled = t.code ? t.code.replace('{to}', net.receivingNumber).replace('{amount}', amt) : null;
  // Dial button pre-types everything up to the PIN (only when the PIN comes last).
  const pre = filled && filled.endsWith('*{pin}#') ? filled.replace('{pin}#', '') : null;
  const shown = filled ? filled.replace('{pin}', 'PIN') : null;
  return (
    <div className="xfer-how">
      <div className="xfer-h"><b>How to send on {net.label}</b><span>{t.name}</span></div>
      {shown ? (
        <>
          <div className="xfer-code">{shown}</div>
          <div className="xfer-btns">
            {pre && Number(amount) > 0 && <a className="btn" href={`tel:${pre}`} style={{ textDecoration: 'none', textAlign: 'center' }}>📞 Dial now</a>}
            <button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard?.writeText(shown).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>{copied ? 'Copied ✓' : 'Copy code'}</button>
          </div>
          <p>Replace <b>PIN</b> with your {net.label} transfer PIN{pre ? ' — “Dial now” types the rest for you, just add your PIN and #' : ''}. {t.menu}</p>
        </>
      ) : <p style={{ marginTop: 0 }}>{t.menu} Send to <b style={{ color: 'var(--gold)' }}>{net.receivingNumber}</b>.</p>}
      <p className="xfer-small">First time? Your default transfer PIN is <b>{t.defaultPin}</b> — change it first: {t.changePin}. Limits: {t.limits}. Never share your PIN with anyone, including us.</p>
    </div>
  );
}

export default function AirtimeCash() {
  const { customer } = useAuth();
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState(null);
  const [requests, setRequests] = useState(null);
  const reqPage = useShowMore(requests);
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

  useAutoRefresh(loadRequests, Boolean(requests?.some((r) => r.status === 'PENDING')));

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
      <SvcHero icon="🔁" color="#0E7490" title="Airtime to Cash" sub="Bought airtime by mistake? Turn it back into wallet money." steps={['Tell us the airtime', 'Transfer it to our line', 'Cash lands in your wallet']} />

      {error && <p className="error-text">{error}</p>}

      {!config && !error && <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div>}

      {unavailable && (
        <div className="card" style={{ textAlign: 'center', padding: '22px 16px' }}>
          <div style={{ fontSize: 30 }} aria-hidden>⏸️</div>
          <b style={{ display: 'block', margin: '6px 0 4px' }}>Not available right now</b>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-400)' }}>Airtime to Cash is paused for the moment. Please check back later or contact support.</p>
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
            Once we confirm it has arrived, <strong>{naira(submitted.payoutAmount)}</strong> will be added to your wallet and you'll get a notification.
          </p>
          {(() => { const n = config?.networks?.find((x) => x.key === submitted.network); return n ? <TransferHow net={{ ...n, receivingNumber: submitted.receivingNumber || n.receivingNumber }} amount={submitted.amount} /> : null; })()}
        </div>
      )}

      {config && !unavailable && (
        <form className="card" onSubmit={handleSubmit}>
          {airtimeOrders.length > 0 && (
            <Step title="Which purchase was a mistake?" right="optional">
              <div className="ctry-list" style={{ maxHeight: 220, overflowY: 'auto' }}>
                {airtimeOrders.slice(0, 6).map((o) => {
                  const st = NETWORK_STYLE[o.provider];
                  const on = orderId === o.id;
                  return (
                    <button key={o.id} type="button" className="ctry-row" aria-pressed={on} onClick={() => setOrderId(on ? '' : o.id)} style={on ? { background: 'rgba(13,148,136,.15)', borderRadius: 10 } : undefined}>
                      <span className="hist-ico" style={{ width: 32, height: 32, borderRadius: '50%', fontSize: 8, background: st?.bg || 'var(--slate-700)', color: st?.fg || '#fff' }}>{st?.name?.slice(0, 4) || o.provider}</span>
                      <span style={{ fontSize: 14 }}>{o.recipient}<small style={{ display: 'block', fontSize: 11, color: 'var(--slate-400)' }}>{fmtDate(o.createdAt)}</small></span>
                      <span style={{ color: on ? 'var(--purple)' : undefined, fontWeight: 700 }}>{on ? '✓ ' : ''}{naira(o.costAmount ?? o.amount)}</span>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          <Step n={1} title="Network">
            <NetChips items={config.networks.map((n) => ({ key: n.key, net: n.key, label: n.label }))} value={network} onChange={setNetwork} />
          </Step>

          {selectedNetwork?.transfer && <div style={{ margin: '-6px 0 14px' }}><TransferHow net={selectedNetwork} amount={amount} /></div>}

          <Step n={2} title="Phone number the airtime is on">
            <input id="senderPhone" type="tel" inputMode="numeric" maxLength={11} value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="080…" required style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }} />
          </Step>

          <Step n={3} title="Airtime amount" right={`${naira(config.minAmount)} – ${naira(config.maxAmount)}`}>
            <div className="amt-big" style={{ border: '1.5px solid var(--slate-700)', borderRadius: 14, padding: '6px 0', background: 'var(--slate-900)' }}>
              <span>₦</span>
              <input id="amount" type="number" inputMode="numeric" min={config.minAmount} max={config.maxAmount} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required style={{ width: `${Math.max(1, String(amount || '0').length) + 0.6}ch` }} aria-label="Airtime amount" />
            </div>
          </Step>

          <div className="field">
            <label htmlFor="note">Note (optional)</label>
            <input id="note" type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. bought for the wrong number" />
          </div>

          {Number(amount) > 0 && (
            <Summary
              rows={[['Airtime value', naira(amount)], [`Service fee (${config.feePercent}%)`, `−${naira(fee)}`]]}
              totalLabel="You’ll receive"
              total={naira(payout)}
            />
          )}
          {selectedNetwork && Number(amount) > 0 && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 4px' }}>After you submit, you’ll transfer the airtime to our {selectedNetwork.label} line: <b style={{ color: 'var(--gold)' }}>{selectedNetwork.receivingNumber}</b> — we’ll show you the exact code.</p>}

          <button className="btn" type="submit" disabled={submitting} style={{ marginTop: 10 }}>
            {submitting ? 'Submitting…' : Number(amount) > 0 ? `Submit · get ${naira(payout)}` : 'Submit request'}
          </button>
          <Trust>A person checks every request. You’re paid as soon as the airtime arrives on our line.</Trust>
        </form>
      )}

      <div className="section-label">My requests</div>
      <div className="card">
        {requests === null ? (
          <p className="empty-state" style={{ margin: 0 }}>Loading…</p>
        ) : requests.length === 0 ? (
          <p className="empty-state" style={{ margin: 0 }}>No requests yet. They’ll show here with their status.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reqPage.visible.map((r) => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--slate-700)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>
                    {NETWORK_LABELS[r.network] || r.network} {naira(r.amount)} → {naira(r.payoutAmount)}
                  </span>
                  <span className={`pill ${STATUS_PILL[r.status]?.[1] || 'wait'}`}>{STATUS_PILL[r.status]?.[0] || r.status}</span>
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
            {reqPage.more}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
