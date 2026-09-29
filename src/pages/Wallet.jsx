import { useEffect, useState } from 'react';
import TestModeBanner from '../components/TestModeBanner';
import SavingsCard from '../components/SavingsCard';
import SpendingCard from '../components/SpendingCard';
import { Link } from 'react-router-dom';
import { getWalletBalance, getWalletTransactions, submitFundRequest, getBankAccount, createBankAccount, checkBankPayments, redeemCoupon } from '../api';
import useAutoRefresh from '../lib/useAutoRefresh';
import BottomNav from '../components/BottomNav';
import ShowMore, { FIRST_COUNT } from '../components/ShowMore';
import { useAppInfo } from '../components/ServiceNotices';

function fmtMoney(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary"
      style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// Same fee rule as the server (lib/monnify.js computeFee).
function fundingFee(amount, info) {
  let fee = Math.round(amount * info.feePercent) / 100;
  if (info.feeCap > 0) fee = Math.min(fee, info.feeCap);
  return Math.max(0, Math.min(fee, amount));
}

// "I want ₦1,000 in my wallet" → how much to send so the fee is added
// on top instead of coming out of what they wanted.
function amountToSend(want, info) {
  const p = info.feePercent / 100;
  let n = Math.ceil(want / (1 - p));
  if (info.feeCap > 0 && fundingFee(n, info) >= info.feeCap) n = Math.ceil(want + info.feeCap);
  while (n - fundingFee(n, info) < want) n += 1;
  return n;
}

function FundingHelper({ info }) {
  const [want, setWant] = useState('');
  const w = Number(want);
  const send = w > 0 ? amountToSend(w, info) : 0;
  const fee = send ? fundingFee(send, info) : 0;
  const naira = (n) => `₦${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return (
    <div style={{ background: 'rgba(134,59,255,0.08)', border: '1px solid var(--slate-700)', borderRadius: 10, padding: 12, margin: '10px 0' }}>
      <label htmlFor="want" style={{ fontSize: 13, fontWeight: 600 }}>How much do you want in your wallet?</label>
      <input id="want" type="number" inputMode="numeric" min="1" value={want} onChange={(e) => setWant(e.target.value)} placeholder="e.g. 1000" style={{ marginTop: 6 }} />
      {send > 0 && (
        <div style={{ fontSize: 13, marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Amount for your wallet</span><span>{naira(w)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-400)' }}>
            <span>Bank processing fee{info.feeIsPassThrough ? ' (paid to our payment partner)' : ''}</span><span style={{ whiteSpace: 'nowrap', marginLeft: 8 }}>+ {naira(fee)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--slate-700)', marginTop: 6, paddingTop: 6 }}>
            <b>Send exactly</b>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b style={{ fontSize: 18 }}>{naira(send)}</b><CopyButton text={String(send)} /></span>
          </div>
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '6px 0 0' }}>
            You'll get at least {naira(w)} in your wallet.{info.feeIsPassThrough ? ' Banks and payment companies charge for receiving transfers — this fee covers that charge; ZAPPI PAY does not keep it.' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

// Personal account number(s): money sent here is added to the wallet
// automatically. First time, the customer verifies with BVN or NIN.
function BankFunding({ info, onCreated, onCredited }) {
  const [idType, setIdType] = useState('BVN');
  const [idNumber, setIdNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const feeText = info.feePercent > 0
    ? `A ${info.feePercent}% bank processing fee${info.feeCap > 0 ? ` (max ₦${Number(info.feeCap).toLocaleString()})` : ''} applies to each transfer${info.feeIsPassThrough ? ' — it goes to our licensed payment partner for handling your transfer, not to ZAPPI PAY' : ''}.`
    : 'No fee.';

  async function create(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await createBankAccount({ idType, idNumber });
      setIdNumber('');
      onCreated(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await checkBankPayments();
      if (res.credited > 0) {
        setMessage(`₦${Number(res.amount).toLocaleString()} added to your wallet.`);
        onCredited();
      } else {
        setMessage('No new payment yet. Transfers usually arrive within a minute or two — you\'ll get a notification when it lands.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!info.accounts) {
    return (
      <form className="card" onSubmit={create}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Get your personal account number</h2>
        <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -8 }}>
          Any bank transfer to it goes straight into your wallet — no need to wait for approval. It's a one-time setup; banks require your BVN or NIN for this.
        </p>
        {error && <p className="error-text" style={{ margin: '0 0 10px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['BVN', 'NIN'].map((t) => (
            <button key={t} type="button" className={idType === t ? 'btn' : 'btn btn-secondary'} onClick={() => setIdType(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="idNumber">Your {idType} (11 digits)</label>
          <input
            id="idNumber"
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>
        <p style={{ color: 'var(--slate-400)', fontSize: 12 }}>
          Your {idType} is sent securely to our licensed payment partner only to create your account. ZappiPay does not store it.
        </p>
        <button className="btn" type="submit" disabled={busy || idNumber.length !== 11}>
          {busy ? 'Creating…' : 'Get My Account Number'}
        </button>
      </form>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, fontSize: 16 }}>Fund by bank transfer</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -8 }}>
        Transfer any amount from any bank app to your account below. It's added to your wallet automatically. {feeText}
      </p>
      {info.accounts.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--gold)', margin: '8px 0' }}>
          ⚠️ Your bank account{info.pausedCount > 1 ? 's are' : ' is'} temporarily unavailable because of bank network issues. Please use the business account below for now — we'll switch it back on as soon as it's fixed.
        </p>
      )}
      {info.pausedCount > 0 && info.accounts.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0' }}>Some of your account numbers are hidden for now because that bank is having network issues. Use the one{info.accounts.length > 1 ? 's' : ''} below.</p>
      )}
      {info.accounts.map((a) => (
        <div key={a.accountNumber} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid var(--slate-800, rgba(255,255,255,0.08))' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{a.bankName}</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>{a.accountNumber}</div>
            <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{a.accountName}</div>
          </div>
          <CopyButton text={a.accountNumber} />
        </div>
      ))}
      {info.feePercent > 0 && info.accounts.length > 0 && <FundingHelper info={info} />}
      {error && <p className="error-text" style={{ margin: '8px 0' }}>{error}</p>}
      {message && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '8px 0' }}>{message}</p>}
      {info.accounts.length > 0 && <button className="btn btn-secondary" type="button" style={{ marginTop: 8 }} disabled={busy} onClick={check}>
        {busy ? 'Checking…' : 'I\'ve sent money — check now'}
      </button>}
    </div>
  );
}

// Wallet gift coupons from promotions (e.g. "WELCOME500").
function CouponBox({ onRedeemed }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const r = await redeemCoupon(code.trim());
      setMsg(`🎉 ₦${Number(r.amount).toLocaleString()} added to your wallet!`);
      setCode('');
      onRedeemed();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="card">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--purple)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 14 }}>🎟️ Have a coupon code?</button>
      ) : (
        <form onSubmit={submit}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Redeem a coupon</h2>
          {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
          {msg && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 8px' }}>{msg}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <input aria-label="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME500" maxLength={20} autoCapitalize="characters" style={{ flex: 1 }} />
            <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy || code.trim().length < 3}>{busy ? '…' : 'Redeem'}</button>
          </div>
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '6px 0 0' }}>Discount codes for airtime, data and bills are entered when you buy.</p>
        </form>
      )}
    </div>
  );
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bankInfo, setBankInfo] = useState(null);
  const [shownTx, setShownTx] = useState(FIRST_COUNT);
  const [paidTo, setPaidTo] = useState('');

  function load() {
    Promise.all([getWalletBalance(), getWalletTransactions()])
      .then(([b, t]) => {
        setBalance(b.walletBalance);
        setTransactions(t.transactions);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);
  // Funding waiting for approval updates on its own; a bank transfer to
  // the personal account shows up when the push arrives or on return.
  useAutoRefresh(load, Boolean(transactions?.some((t) => t.status === 'PENDING')));
  useEffect(() => {
    getBankAccount().then(setBankInfo).catch(() => setBankInfo(null));
  }, []);

  const autoFunding = Boolean(bankInfo?.available);
  const appInfo = useAppInfo();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (manualList.length > 1 && !paidTo) {
      setError('Choose the account you sent the money to.');
      return;
    }
    setSubmitting(true);
    try {
      await submitFundRequest({ amount: Number(amount), reference: reference.trim() || undefined, note: note.trim() || undefined, accountId: paidTo || undefined });
      setAmount('');
      setReference('');
      setNote('');
      setSuccessMessage('Funding request submitted. It will reflect once approved.');
      load();
    } catch (err) {
      setError(err.message || 'Could not submit funding request.');
    } finally {
      setSubmitting(false);
    }
  }

  const manualList = appInfo?.manualAccounts?.length ? appInfo.manualAccounts : appInfo?.manualFunding ? [{ id: '', ...appInfo.manualFunding }] : [];
  const manual = manualList[0] || null;
  const manualForm = (
      <form onSubmit={handleSubmit} style={autoFunding ? { marginTop: 12 } : undefined}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>{autoFunding ? 'Manual funding' : 'Fund Wallet'}</h2>
          <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -8 }}>
            {manualList.length > 1
              ? 'Transfer to any one of the accounts below (if one bank is slow, use another), then tick the one you used and submit for approval.'
              : 'Transfer to the account below, then submit the details for approval.'}
          </p>
          {manualList.map((m) => {
            const picked = manualList.length > 1 && paidTo === m.id;
            return (
              <div
                key={m.id || m.accountNumber}
                onClick={() => manualList.length > 1 && setPaidTo(m.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(134,59,255,0.1)', border: `${picked ? 2 : 1}px solid ${picked ? 'var(--gold, #FFB830)' : 'var(--purple)'}`, borderRadius: 10, padding: 12, marginBottom: 10, cursor: manualList.length > 1 ? 'pointer' : 'default' }}
              >
                {manualList.length > 1 && (
                  <input type="radio" name="paidTo" aria-label={`I paid into ${m.bankName}`} checked={picked} onChange={() => setPaidTo(m.id)} style={{ width: 'auto', margin: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{m.bankName}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>{m.accountNumber}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{m.accountName}</div>
                </div>
                <CopyButton text={m.accountNumber} />
              </div>
            );
          })}
          <div style={{ height: 4 }} />
          <div className="field">
            <label htmlFor="amount">Amount (₦)</label>
            <input id="amount" type="number" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="reference">Transfer reference (optional)</label>
            <input id="reference" type="text" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="note">Note (optional)</label>
            <input id="note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. sent from GTBank" />
          </div>
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Funding Request'}
          </button>
        </form>
  );

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>Wallet</h1>
        <p>Fund your wallet and track your transactions</p>
      </div>

      <TestModeBanner />

      <div className="card stat-card">
        <div className="label">Wallet Balance</div>
        <div className="value">{fmtMoney(balance)}</div>
      </div>

      <SavingsCard onChanged={load} />

      {error && <p className="error-text">{error}</p>}
      {successMessage && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 16px 12px' }}>{successMessage}</p>}

      {autoFunding && (
        <BankFunding
          info={bankInfo}
          onCreated={(res) => setBankInfo((prev) => ({ ...prev, accounts: res.accounts, kycType: res.kycType }))}
          onCredited={load}
        />
      )}

      {!manual ? null : autoFunding && !(bankInfo?.accounts && bankInfo.accounts.length === 0 && bankInfo.pausedCount > 0) ? (
        <details className="card">
          <summary style={{ cursor: 'pointer', fontSize: 14 }}>Other way: send to our business account for manual approval</summary>
          {manualForm}
        </details>
      ) : (
        <div className="card">{manualForm}</div>
      )}

      <CouponBox onRedeemed={load} />

      <SpendingCard />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Transaction History</h2>
          <Link to="/statement" style={{ color: 'var(--purple)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>Statement (PDF) ›</Link>
        </div>
        <div style={{ height: 12 }} />
        {transactions === null ? (
          <p className="empty-state">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="empty-state">No transactions yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, shownTx).map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.createdAt)}</td>
                  <td>{String(t.type).replace(/_/g, ' ')}</td>
                  <td>{fmtMoney(t.amount)}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {transactions && (
          <ShowMore total={transactions.length} shown={shownTx} setShown={setShownTx} />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
