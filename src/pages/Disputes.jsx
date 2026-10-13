import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDisputes, getDispute, getDisputeSends, reportDispute, returnDispute, claimDispute, cancelDispute } from '../api';
import PinConfirm from '../components/PinConfirm';
import BottomNav from '../components/BottomNav';
import { SvcHero, Summary, naira } from '../components/ServiceKit';
import { SkeletonRows } from '../components/Skeleton';

// More → Wrong transfer: report money sent by mistake, answer a request
// as the recipient, follow the status, print a statement.

const STATUS = {
  AWAITING_RECIPIENT: ['Waiting for the recipient', 'wait'],
  RECIPIENT_DISPUTES: ['Under review by ZAPPI PAY', 'wait'],
  RETURNED: ['Returned', 'ok'],
  RESOLVED_SENDER: ['Returned after review', 'ok'],
  RESOLVED_RECIPIENT: ['Kept by the recipient after review', 'no'],
  REVERSED_SYSTEM: ['Reversed (system error)', 'ok'],
  EXPIRED: ['Hold ended — not returned', 'no'],
  CANCELLED: ['Cancelled', 'no'],
  RECALL_REQUESTED: ['Recall requested', 'wait'],
  RECALL_SENT: ['Sent to the receiving bank', 'wait'],
  RECOVERED: ['Recovered', 'ok'],
  NOT_RECOVERED: ['Not recovered', 'no'],
};
const when = (d) => (d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const Pill = ({ s }) => <span className={`pill ${STATUS[s]?.[1] || 'wait'}`}>{STATUS[s]?.[0] || s}</span>;

function List() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { getDisputes().then(setD).catch((e) => setErr(e.message)); }, []);
  return (
    <>
      <SvcHero icon="↩️" color="#b45309" title="Wrong transfer" sub="Sent money to the wrong person or account? Report it here and follow what happens." steps={['Report the transfer', 'We hold it & ask them', 'Returned or reviewed']} />
      {err && <p className="error-text" style={{ margin: '0 16px' }}>{err}</p>}
      <div style={{ margin: '0 16px 12px' }}><Link to="/disputes/new" className="btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>＋ Report a wrong transfer</Link></div>
      {d?.waiting?.length > 0 && (
        <div className="card" style={{ border: '1px solid var(--gold)' }}>
          <b>⚠️ Someone says they sent you money by mistake</b>
          {d.waiting.map((w) => <Link key={w.id} to={`/disputes/${w.id}`} className="hist-row" style={{ padding: '10px 0' }}><span className="hist-main"><b>{naira(w.amount)}</b><small>{w.held > 0 ? `${naira(w.held)} on hold` : 'Nothing on hold'} · answer by {new Date(w.holdUntil).toLocaleDateString('en-NG')}</small></span></Link>)}
        </div>
      )}
      <div className="section-label">My reports and requests</div>
      {!d ? <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div> : !d.disputes.length ? <p className="empty-state">Nothing here. Always check the name before you confirm a transfer.</p> : (
        <div className="card" style={{ padding: 0 }}>
          {d.disputes.map((x) => (
            <Link key={x.id} to={`/disputes/${x.id}`} className="hist-row">
              <span className="hist-ico" style={{ background: x.role === 'SENDER' ? 'rgba(45,212,191,.15)' : 'rgba(245,184,46,.15)', color: x.role === 'SENDER' ? 'var(--purple)' : 'var(--gold)' }}>{x.kind === 'BANK' ? '🏦' : x.role === 'SENDER' ? '↗' : '↙'}</span>
              <span className="hist-main"><b>{naira(x.amount)} {x.role === 'SENDER' ? `to ${x.recipient.name || '—'}` : `from ${x.sender.name}`}</b><small>{when(x.createdAt)}</small></span>
              <Pill s={x.status} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function New() {
  const navigate = useNavigate();
  const [sends, setSends] = useState(null);
  const [pick, setPick] = useState(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { getDisputeSends().then((d) => setSends(d.sends)).catch((e) => setErr(e.message)); }, []);
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const r = await reportDispute(pick.kind === 'BANK' ? { bankTransferId: pick.id, reason } : { transferId: pick.id, reason }); navigate(`/disputes/${r.id}`, { replace: true }); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  return (
    <>
      <SvcHero back="/disputes" backLabel="Wrong transfer" icon="↩️" color="#b45309" title="Report a wrong transfer" sub="Pick the transfer that went to the wrong person or account (last 30 days)." />
      {err && <p className="error-text" style={{ margin: '0 16px' }}>{err}</p>}
      <form className="card" onSubmit={submit}>
        <div className="svc-step-h">Which transfer?</div>
        {!sends ? <SkeletonRows rows={3} /> : !sends.length ? <p className="empty-state" style={{ margin: 0 }}>No transfers in the last 30 days.</p> : (
          <div className="ctry-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {sends.map((x) => (
              <button key={x.kind + x.id} type="button" className="ctry-row" disabled={Boolean(x.disputeId)} onClick={() => setPick(x)} style={pick?.id === x.id ? { background: 'rgba(13,148,136,.15)', borderRadius: 10 } : x.disputeId ? { opacity: 0.5 } : undefined}>
                <span className="hist-ico" style={{ width: 34, height: 34, background: 'var(--slate-800)' }}>{x.kind === 'BANK' ? '🏦' : '👤'}</span>
                <span style={{ fontSize: 14, minWidth: 0 }}>{x.to}<small style={{ display: 'block', fontSize: 11, color: 'var(--slate-400)' }}>{x.detail} · {when(x.at)}{x.disputeId ? ' · already reported' : ''}</small></span>
                <span style={{ fontWeight: 700, color: pick?.id === x.id ? 'var(--purple)' : undefined }}>{pick?.id === x.id ? '✓ ' : ''}{naira(x.amount)}</span>
              </button>
            ))}
          </div>
        )}
        {pick && (
          <>
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="dr">What happened?</label>
              <textarea id="dr" className="num-ta" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={pick.kind === 'BANK' ? 'e.g. I typed one digit wrong in the account number' : 'e.g. I picked the wrong username'} required style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div className="noreverse" style={{ marginBottom: 10 }}>
              <b>What happens next</b>
              <span>{pick.kind === 'BANK'
                ? 'We ask the receiving bank, through our payment partner, to recall the money. The bank must ask its customer for consent, so it can take a few days. Anything recovered comes back to your wallet.'
                : `We hold the amount still in ${pick.to}’s wallet for up to 14 days and ask them to return it. If they say it’s theirs, ZAPPI PAY reviews both sides.`}</span>
            </div>
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending…' : `Report ${naira(pick.amount)} to ${pick.to}`}</button>
          </>
        )}
      </form>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 16px' }}>Report as soon as you notice — the sooner, the more likely the money is still there.</p>
    </>
  );
}

function Detail({ id }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [pin, setPin] = useState(false);
  const [reply, setReply] = useState('');
  const [showReply, setShowReply] = useState(false);
  const load = () => getDispute(id).then((r) => setD(r.dispute)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  if (!d) return <>{err ? <p className="error-text" style={{ margin: 16 }}>{err}</p> : <div style={{ margin: 16 }}><SkeletonRows rows={4} /></div>}</>;
  const sender = d.role === 'SENDER';
  const open = ['AWAITING_RECIPIENT', 'RECIPIENT_DISPUTES', 'RECALL_REQUESTED', 'RECALL_SENT'].includes(d.status);
  const rows = [
    ['Status', STATUS[d.status]?.[0] || d.status],
    ['Amount sent', naira(d.amount)],
    ['Sent on', when(d.sentAt)],
    [d.kind === 'BANK' ? 'Sent to' : sender ? 'Sent to' : 'Sent by', d.kind === 'BANK' ? `${d.recipient.name} · ${d.recipient.bank || ''} ${d.recipient.account || ''}` : sender ? `${d.recipient.name}${d.recipient.username ? ` (@${d.recipient.username})` : ''}` : d.sender.name],
    d.kind === 'WALLET' && ['On hold', naira(d.held)],
    d.kind === 'WALLET' && open && d.holdUntil && ['Hold ends', when(d.holdUntil)],
    d.recovered > 0 && ['Returned to sender', naira(d.recovered), 'good'],
    ['Reported on', when(d.createdAt)],
    ['Reference', d.reference],
    d.reason && ['Reason given', d.reason],
    d.recipientReply && ['Recipient says', d.recipientReply],
    d.adminNote && ['ZAPPI PAY note', d.adminNote],
  ].filter(Boolean);
  return (
    <>
      <style>{'@media print { .no-print, .bottom-nav, .chat-fab { display: none !important; } body, .app-shell { background: #fff !important; color: #111 !important; } .confirm-sum { border-color: #999 !important; background: #fff !important; } .confirm-row b, .confirm-row span { color: #111 !important; } }'}</style>
      <div className="no-print"><SvcHero back="/disputes" backLabel="Wrong transfer" icon="↩️" color="#b45309" title={sender ? 'Your wrong-transfer report' : 'Money sent to you by mistake?'} sub={sender ? 'We’ll update you at every step.' : `${d.sender.name} says this money was sent to you by mistake.`} /></div>
      {err && <p className="error-text" style={{ margin: '0 16px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', margin: '0 16px', fontSize: 14 }}>{msg}</p>}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><b>ZAPPI PAY — wrong transfer statement</b><Pill s={d.status} /></div>
        <Summary rows={rows} />
        <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '6px 0 0' }}>Generated {when(new Date())}. This statement records the transfer and the steps ZAPPI PAY has taken under the CBN rules on erroneous transfers.</p>
      </div>

      {!sender && d.status === 'AWAITING_RECIPIENT' && (
        <div className="card no-print" style={{ border: '1px solid var(--gold)' }}>
          <b>What would you like to do?</b>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '0 0 10px' }}>If this money wasn’t meant for you, please return it. If it was (for example, payment for something), tell us why and ZAPPI PAY will review both sides. {d.held > 0 && `${naira(d.held)} stays on hold until then — the rest of your wallet is untouched.`}</p>
          <button type="button" className="btn" onClick={() => setPin(true)}>↩️ Return {naira(d.amount)}</button>
          {!showReply ? <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setShowReply(true)}>This money is mine</button> : (
            <form style={{ marginTop: 10 }} onSubmit={async (e) => { e.preventDefault(); setErr(''); try { await claimDispute(id, reply); setMsg('Thanks — ZAPPI PAY will review both sides and let you know.'); load(); } catch (e2) { setErr(e2.message); } }}>
              <textarea className="num-ta" rows={3} maxLength={500} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Why is this money yours? e.g. payment for goods I delivered on…" required style={{ width: '100%', boxSizing: 'border-box' }} />
              <button className="btn" type="submit" style={{ marginTop: 8 }}>Send to ZAPPI PAY</button>
            </form>
          )}
          {d.amount > d.held && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 0' }}>Returning takes the {naira(d.held)} on hold plus up to {naira(d.amount - d.held)} from your wallet, only because you agree to it.</p>}
        </div>
      )}

      <div className="card no-print" style={{ display: 'grid', gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>🖨️ Download / print statement</button>
        {sender && ['AWAITING_RECIPIENT', 'RECIPIENT_DISPUTES', 'RECALL_REQUESTED'].includes(d.status) && <button type="button" onClick={async () => { if (!window.confirm('Withdraw this report? Any hold is released.')) return; try { await cancelDispute(id); setMsg('Report withdrawn.'); load(); } catch (e) { setErr(e.message); } }} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', fontSize: 13 }}>Withdraw my report</button>}
        {sender && ['EXPIRED', 'RESOLVED_RECIPIENT', 'NOT_RECOVERED'].includes(d.status) && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>Next step: take this statement to the police to get a police extract, and swear an affidavit. Your bank or a court can then order the money returned.</p>}
      </div>

      <PinConfirm
        open={pin}
        title="Return the money"
        details={{ rows: [['To', d.sender.name], ['From hold', naira(d.held)], d.amount > d.held && ['From your wallet', `up to ${naira(d.amount - d.held)}`]].filter(Boolean), total: naira(d.amount) }}
        onSubmit={async (auth) => { const r = await returnDispute(id, auth); setPin(false); setMsg(`Returned ${naira(r.returned)} — thank you for being honest. 🙏`); load(); }}
        onError={(e) => setErr(e.message)}
        onClose={() => setPin(false)}
      />
    </>
  );
}

export default function Disputes() {
  const { id } = useParams();
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      {id === 'new' ? <New /> : id ? <Detail id={id} /> : <List />}
      <BottomNav />
    </div>
  );
}
