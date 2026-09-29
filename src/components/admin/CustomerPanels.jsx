import { useState } from 'react';
import { adminVerifyIdentity, adminClearSecurityDetails, setCustomerAgent, rejectAgent } from '../../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const RESULT = {
  MATCH: ['✅ Matches', 'var(--green-500)'],
  NO_MATCH: ['❌ Does not match', 'var(--red-500)'],
  NOT_SET: ['— Customer has not set this', 'var(--slate-400)'],
};

// Before helping someone who says they own this account (WhatsApp,
// phone, email), ask them these and type what THEY say. The app only
// answers match / no match — staff never see the real answers.
export function IdentityCheck({ customer, orders, walletTransactions, onChanged }) {
  const [dob, setDob] = useState('');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const lastOrder = orders.find((o) => o.status === 'SUCCESS');
  const lastFund = walletTransactions.find((t) => t.type === 'FUND' && t.status === 'APPROVED');

  async function check(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const r = await adminVerifyIdentity(customer.id, { dateOfBirth: dob || undefined, answer: answer || undefined });
      setResult(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function clearDetails() {
    if (!window.confirm(`Reset ${customer.name}'s date of birth and security question? Only do this after you are sure it's really them (e.g. they typed a wrong date at signup). They will be asked to set them again.`)) return;
    try {
      await adminClearSecurityDetails(customer.id);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  }

  const passed = result && Object.values(result.result).filter((v) => v === 'MATCH').length;
  const failed = result && Object.values(result.result).some((v) => v === 'NO_MATCH');

  return (
    <details className="card" style={{ margin: '0 0 16px' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>🛡️ Check it's really them (before helping)</summary>
      <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>
        Ask the person the questions below and type <b>their</b> answers. Don't read anything out to them.
        {!customer.hasDob && !customer.hasSecurityAnswer && ' This customer has not set a date of birth or security question yet — use the other checks.'}
      </p>
      {error && <p className="error-text" style={{ margin: '0 0 8px' }}>{error}</p>}
      <form onSubmit={check} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '1 1 170px', margin: 0 }}>
          <label htmlFor="ic-dob">Date of birth they give {customer.hasDob ? '' : '(not set)'}</label>
          <input id="ic-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled={!customer.hasDob} />
        </div>
        <div className="field" style={{ flex: '2 1 240px', margin: 0 }}>
          <label htmlFor="ic-ans">{customer.securityQuestion ? `Ask: “${customer.securityQuestion}”` : 'Security answer (not set)'}</label>
          <input id="ic-ans" value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={!customer.hasSecurityAnswer} autoComplete="off" placeholder="What they answer" />
        </div>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy || (!dob && !answer)}>{busy ? 'Checking…' : 'Check'}</button>
      </form>
      {result && (
        <div style={{ marginTop: 10, fontSize: 14 }}>
          {result.result.dob && <div style={{ color: RESULT[result.result.dob][1] }}>Date of birth: {RESULT[result.result.dob][0]}</div>}
          {result.result.answer && <div style={{ color: RESULT[result.result.answer][1] }}>Security answer: {RESULT[result.result.answer][0]}</div>}
          <div style={{ marginTop: 6, fontWeight: 700, color: failed ? 'var(--red-500)' : passed ? 'var(--green-500)' : 'var(--slate-400)' }}>
            {failed ? '⚠️ Something did not match — do not reset the password, change details or move money.' : passed ? 'Looks like the owner. Confirm one of the checks below too for big requests.' : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{result.checksLeft} check{result.checksLeft === 1 ? '' : 's'} left in the next 15 minutes.</div>
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 13 }}>
        <b>Other quick checks</b> (ask first, then compare):
        <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: 'var(--slate-300, #cbd5e1)' }}>
          <li>Registered phone number: ends in <b>{String(customer.phone).slice(-4)}</b> — are they messaging from it?</li>
          {customer.email && <li>Email on the account: {customer.email.replace(/^(.).*(@.*)$/, '$1•••$2')}</li>}
          {lastOrder && <li>Last purchase: {lastOrder.service.toLowerCase()} {naira(lastOrder.amount)} on {new Date(lastOrder.createdAt).toLocaleDateString('en-NG')}</li>}
          {lastFund && <li>Last manual funding: {naira(lastFund.amount)} on {new Date(lastFund.createdAt).toLocaleDateString('en-NG')}</li>}
          <li>Wallet balance (roughly): {naira(customer.walletBalance)}</li>
          <li>For money problems, ask for a screenshot of their bank alert.</li>
        </ul>
      </div>
      {(customer.hasDob || customer.hasSecurityAnswer) && (
        <button type="button" onClick={clearDetails} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', padding: 0, fontSize: 12 }}>
          Reset their date of birth & security question
        </button>
      )}
    </details>
  );
}

// Agent status with approve / decline and what they bought so far.
export function AgentPanel({ customer, orders, onChanged }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = !customer.isAgent && customer.agentRequestedAt;
  const ok = orders.filter((o) => o.status === 'SUCCESS');
  const since30 = ok.filter((o) => Date.now() - new Date(o.createdAt).getTime() < 30 * 86400000);
  const sum = (list) => list.reduce((s, o) => s + Number(o.amount || 0), 0);

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      setRejecting(false);
      setReason('');
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ margin: '0 0 16px', border: pending ? '1px solid var(--gold, #f5b82e)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <strong>{customer.isAgent ? '⭐ Agent' : pending ? '⏳ Agent application' : 'Regular customer'}</strong>
          {customer.agentBusinessName && <span style={{ color: 'var(--slate-400)', fontSize: 13 }}> · {customer.agentBusinessName}</span>}
          {customer.agentShopAddress && <div style={{ fontSize: 13, marginTop: 2 }}>📍 {customer.agentShopAddress}</div>}
          {pending && <div style={{ fontSize: 13, color: 'var(--orange, #f97316)' }}>Applied on {new Date(customer.agentRequestedAt).toLocaleDateString('en-NG')}</div>}
          {!pending && !customer.isAgent && customer.agentRejectedAt && (
            <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Declined {new Date(customer.agentRejectedAt).toLocaleDateString('en-NG')}{customer.agentRejectReason ? ` — ${customer.agentRejectReason}` : ''}</div>
          )}
          {pending && (
            <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 4 }}>
              Purchases: {ok.length} successful ({naira(sum(ok))}) · last 30 days {since30.length} ({naira(sum(since30))}) · {customer.kycType ? '✓ BVN/NIN verified' : 'not verified'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={customer.isAgent ? 'btn btn-secondary' : 'btn'} style={{ width: 'auto' }} disabled={busy} onClick={() => run(() => setCustomerAgent(customer.id, !customer.isAgent))}>
            {customer.isAgent ? 'Remove agent status' : pending ? 'Approve as agent' : 'Make agent'}
          </button>
          {pending && !rejecting && (
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', color: 'var(--red-500)' }} disabled={busy} onClick={() => setRejecting(true)}>Decline</button>
          )}
        </div>
      </div>
      {error && <p className="error-text" style={{ margin: '8px 0 0' }}>{error}</p>}
      {rejecting && (
        <div style={{ marginTop: 10 }}>
          <div className="field">
            <label htmlFor="ag-reason">Reason (the customer will see this)</label>
            <input id="ag-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Not enough purchases yet — keep buying and apply again" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" style={{ width: 'auto', background: 'var(--red-500)' }} disabled={busy} onClick={() => run(() => rejectAgent(customer.id, reason))}>{busy ? 'Declining…' : 'Decline application'}</button>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
