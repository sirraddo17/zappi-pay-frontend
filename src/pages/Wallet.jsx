import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import TestModeBanner from '../components/TestModeBanner';
import SavingsCard from '../components/SavingsCard';
import SpendingCard from '../components/SpendingCard';
import { Link, useSearchParams } from 'react-router-dom';
import { getWalletBalance, getWalletTransactions, submitFundRequest, getBankAccount, createBankAccount, checkBankPayments, redeemCoupon, startCardPayment, verifyCardPayment, getCashback } from '../api';
import useAutoRefresh from '../lib/useAutoRefresh';
import { useAuth } from '../context/AuthContext';
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

// Cashback is kept apart from the wallet and used at checkout.
function CashbackCard() {
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { getCashback().then(setD).catch(() => setD(null)); }, []);
  if (!d || !d.separate || (!(d.balance > 0) && !d.entries.length)) return null;
  const naira = (n) => `₦${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return (
    <div className="card" style={{ border: '1px solid rgba(16,185,129,0.35)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>🎁 Cashback</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green-500)' }}>{naira(d.balance)}</div>
        </div>
        <button type="button" onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', fontSize: 13 }}>{open ? 'Hide' : 'History'}</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '6px 0 0' }}>Switch on “Use cashback” when you buy to pay less — up to {d.maxPercent}% of each purchase. Cashback can’t be sent or withdrawn.</p>
      {open && d.entries.map((e) => (
        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderTop: '1px solid var(--slate-800)' }}>
          <span>{e.note}<br /><span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{new Date(e.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span></span>
          <b style={{ color: e.amount > 0 ? 'var(--green-500)' : 'var(--slate-300, #cbd5e1)' }}>{e.amount > 0 ? '+' : '−'}{naira(Math.abs(e.amount))}</b>
        </div>
      ))}
    </div>
  );
}

// Card / USSD top-up: the customer pays on Flutterwave's secure page and
// comes back here; the server confirms with Flutterwave before crediting.
function cardFee(amount, f) {
  let fee = Math.round(amount * f.cardFeePercent) / 100;
  if (f.cardFeeCap > 0) fee = Math.min(fee, f.cardFeeCap);
  return Math.max(0, Math.round(fee * 100) / 100);
}
function CardFunding({ funding }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const a = Number(amount);
  const fee = a > 0 ? cardFee(a, funding) : 0;
  const naira = (n) => `₦${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  async function pay(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await startCardPayment(a);
      window.location.assign(r.link);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }
  return (
    <form className="card" onSubmit={pay}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>💳 Pay with card or USSD</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -8 }}>Debit card (Verve, Mastercard, Visa) or your bank’s USSD code. You pay on Flutterwave’s secure page — ZAPPI PAY never sees your card details. Added to your wallet instantly.</p>
      {err && <p className="error-text" style={{ margin: '0 0 10px' }}>{err}</p>}
      <div className="field">
        <label htmlFor="cardAmt">Amount to add (₦)</label>
        <input id="cardAmt" type="number" inputMode="numeric" min={funding.minAmount} max={500000} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`At least ₦${Number(funding.minAmount).toLocaleString()}`} required />
      </div>
      {a > 0 && fee > 0 && (
        <div style={{ fontSize: 13, margin: '-4px 0 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-400)' }}><span>Card processing fee</span><span>+ {naira(fee)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>You pay</b><b>{naira(a + fee)}</b></div>
        </div>
      )}
      <button className="btn" type="submit" disabled={busy || !(a >= funding.minAmount)}>{busy ? 'Opening secure page…' : a > 0 ? `Pay ${naira(a + fee)}` : 'Pay'}</button>
    </form>
  );
}

// Personal account number(s): money sent here is added to the wallet
// automatically. First time, the customer verifies with BVN or NIN.
function BankFunding({ info, onCreated, onCredited, customerName }) {
  const [idType, setIdType] = useState('BVN');
  const [idNumber, setIdNumber] = useState('');
  const [dob, setDob] = useState('');
  const [consent, setConsent] = useState(false);
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
      const res = await createBankAccount({ idType, idNumber, ...(info.idMatch ? { consent, ...(info.hasDob ? {} : { dateOfBirth: dob }) } : {}) });
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
        {info.idMatch && (
          <>
            {!info.hasDob && (
              <div className="field">
                <label htmlFor="idDob">Date of birth (as on your {idType})</label>
                <input id="idDob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} required />
              </div>
            )}
            <p style={{ fontSize: 13, margin: '0 0 8px', padding: '8px 10px', borderRadius: 8, background: 'rgba(134,59,255,0.08)' }}>
              Your name <b>{customerName || 'on your profile'}</b> and date of birth must match your {idType} exactly. If your name is spelt differently, fix it in Profile first.
            </p>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, marginBottom: 10 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
              I agree that ZAPPI PAY can check my name and date of birth with my {idType} through its licensed payment partner.
            </label>
          </>
        )}
        <p style={{ color: 'var(--slate-400)', fontSize: 12 }}>
          Your {idType} is sent securely to our licensed payment partner only to create your account. ZappiPay does not store it.
        </p>
        <button className="btn" type="submit" disabled={busy || idNumber.length !== 11 || (info.idMatch && (!consent || (!info.hasDob && !dob)))}>
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
  const t = useLang();
  const { customer, refreshCustomer } = useAuth();
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
  const funding = appInfo?.funding || null;
  const [params, setParams] = useSearchParams();
  // Back from the card payment page: confirm it (a few tries, it can take a moment).
  useEffect(() => {
    const txRef = params.get('card');
    if (!txRef) return undefined;
    let tries = 0;
    let stop = false;
    setSuccessMessage('Confirming your card payment…');
    const check = () => verifyCardPayment(txRef).then((r) => {
      if (stop) return;
      if (r.status === 'PAID') {
        setSuccessMessage(`✅ ₦${Number(r.amount).toLocaleString()} added to your wallet.`);
        load();
        refreshCustomer?.();
        setParams({}, { replace: true });
      } else if (r.status === 'FAILED') {
        setSuccessMessage('');
        setError('The card payment was not completed. No money was added — you can try again.');
        setParams({}, { replace: true });
      } else if (tries++ < 6) {
        setTimeout(check, 5000);
      } else {
        setSuccessMessage('Still confirming with the bank. If you paid, it will be added automatically within a few minutes — you’ll get a notification.');
        setParams({}, { replace: true });
      }
    }).catch((e) => { if (!stop) { setSuccessMessage(''); setError(e.message); } });
    check();
    return () => { stop = true; };
  }, []);

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
        <h1>{t('Wallet')}</h1>
        <p>{t('Fund your wallet and track your transactions')}</p>
      </div>

      <TestModeBanner />

      <div className="card stat-card">
        <div className="label">{t('Wallet Balance')}</div>
        <div className="value">{fmtMoney(balance)}</div>
      </div>

      <CashbackCard />

      <SavingsCard onChanged={load} />

      {error && <p className="error-text">{error}</p>}
      {successMessage && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 16px 12px' }}>{successMessage}</p>}

      {funding?.card && <CardFunding funding={funding} />}

      {bankInfo && !autoFunding && !funding?.card && !manual && (
        <div className="card" style={{ fontSize: 14 }}>Wallet funding is paused for a short while. Please check back soon.</div>
      )}

      {autoFunding && (
        <BankFunding
          info={bankInfo}
          onCreated={(res) => { setBankInfo((prev) => ({ ...prev, accounts: res.accounts, kycType: res.kycType })); if (res.verified) refreshCustomer?.(); }}
          onCredited={load}
          customerName={customer?.name}
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
          <h2 style={{ margin: 0, fontSize: 16 }}>{t('Transaction History')}</h2>
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
