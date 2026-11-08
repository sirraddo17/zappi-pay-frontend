import { SkeletonRows } from '../components/Skeleton';
import { naira } from '../lib/money';
import { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import TestModeBanner from '../components/TestModeBanner';
import SavingsCard from '../components/SavingsCard';
import SpendingCard from '../components/SpendingCard';
import { Link, useSearchParams } from 'react-router-dom';
import { getWalletBalance, getWalletTransactions, submitFundRequest, getPendingFundRequest, getBankAccount, createBankAccount, checkBankPayments, redeemCoupon, startCardPayment, verifyCardPayment, getCashback, getMyLimits } from '../api';
import useAutoRefresh from '../lib/useAutoRefresh';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import ShowMore, { FIRST_COUNT } from '../components/ShowMore';
import { useAppInfo } from '../components/ServiceNotices';

function fmtMoney(n) {
  return naira(n);
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
  // "Free from ₦X": deposits of at least X pay no fee.
  if (info.freeFrom > 0 && amount >= info.freeFrom) return 0;
  let fee = Math.round(amount * info.feePercent) / 100;
  if (info.feeCap > 0) fee = Math.min(fee, info.feeCap);
  return Math.max(0, Math.min(fee, amount));
}

// "I want ₦1,000 in my wallet" → how much to send so the fee is added
// on top instead of coming out of what they wanted.
function amountToSend(want, info) {
  if (info.freeFrom > 0 && want >= info.freeFrom) return want;
  const p = info.feePercent / 100;
  let n = Math.ceil(want / (1 - p));
  if (info.feeCap > 0 && fundingFee(n, info) >= info.feeCap) n = Math.ceil(want + info.feeCap);
  while (n - fundingFee(n, info) < want) n += 1;
  return n;
}

// Fee for one account number (each payment partner can have its own).
function feeOf(account, info) {
  return info.feeByProvider?.[account?.provider || 'monnify'] || { feePercent: info.feePercent, feeCap: info.feeCap, feeIsPassThrough: info.feeIsPassThrough };
}
function feeLabel(f) {
  return `${f.feePercent}%${f.feeCap > 0 ? ` (max ₦${Number(f.feeCap).toLocaleString()})` : ''}${f.freeFrom > 0 ? ` · free from ₦${Number(f.freeFrom).toLocaleString()}` : ''}`;
}

// "I want ₦X in my wallet": the exact amount to send to EACH account
// number, with that provider's own fee (some are free, e.g. GTBank).
function FundingHelper({ info, accounts }) {
  const [want, setWant] = useState('');
  const w = Number(want);
  const naira = (n) => `₦${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const rows = (accounts || []).map((a) => {
    const f = feeOf(a, info);
    const send = w > 0 ? (f.feePercent > 0 ? amountToSend(w, f) : w) : 0;
    return { a, f, send, fee: send && f.feePercent > 0 ? fundingFee(send, f) : 0 };
  });
  const anyPass = rows.some((r) => r.fee > 0 && r.f.feeIsPassThrough);
  return (
    <div style={{ background: 'rgba(13, 148, 136,0.08)', border: '1px solid var(--slate-700)', borderRadius: 10, padding: 12, margin: '10px 0' }}>
      <label htmlFor="want" style={{ fontSize: 13, fontWeight: 600 }}>How much do you want in your wallet?</label>
      <input id="want" type="number" inputMode="numeric" min="1" value={want} onChange={(e) => setWant(e.target.value)} placeholder="e.g. 1000" style={{ marginTop: 6 }} />
      {w > 0 && rows.map(({ a, f, send, fee }) => (
        <div key={a.accountNumber} style={{ fontSize: 13, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--slate-700)' }}>
          <div style={{ color: 'var(--slate-400)' }}>{a.bankName} · {a.accountNumber}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-400)' }}>
            <span>Bank processing fee{f.feePercent > 0 ? ` (${feeLabel(f)})` : ''}</span><span style={{ whiteSpace: 'nowrap', marginLeft: 8 }}>{fee > 0 ? `+ ${naira(fee)}` : f.freeFrom > 0 && send >= f.freeFrom ? 'Free 🎉' : 'No fee'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>Send exactly</b>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b style={{ fontSize: 18 }}>{naira(send)}</b><CopyButton text={String(send)} /></span>
          </div>
        </div>
      ))}
      {w > 0 && (
        <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '8px 0 0' }}>
          You'll get at least {naira(w)} in your wallet.{anyPass ? ' Banks and payment companies charge for receiving transfers — the fee covers that charge; ZAPPI PAY does not keep it.' : ''}
        </p>
      )}
    </div>
  );
}

// Cashback is kept apart from the wallet and used at checkout.
// While the real BVN/NIN check is not running (payment partner on test
// keys), say so plainly: the number is passed on but nothing is verified.
function IdCheckNotice({ info }) {
  if (info?.idMatch) return null;
  return (
    <p role="note" style={{ fontSize: 12, margin: '0 0 10px', padding: '8px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid #f59e0b' }}>
      🧪 <b>Test mode — ID check being integrated.</b> This screen is not verifying your identity yet. Please don’t enter a real BVN or NIN while the app shows test mode.
    </p>
  );
}

// Unverified accounts have a daily spending limit (₦20,000 by default).
function LimitNotice() {
  const [l, setL] = useState(null);
  useEffect(() => { getMyLimits().then(setL).catch(() => setL(null)); }, []);
  if (!l?.enabled || l.verified || l.custom) return null;
  const n = (v) => `₦${Number(v).toLocaleString()}`;
  return (
    <div className="card" role="note" style={{ border: '1px solid var(--gold)', fontSize: 13 }}>
      <b>Daily limit: {n(l.limit)}</b> for unverified accounts · {n(l.remaining)} left today.
      <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 4 }}>Purchases count towards it; refunds give the room back. Verify with your BVN or NIN (below) to raise it{l.verifiedLimit ? ` to ${n(l.verifiedLimit)} a day` : ''}.</div>
    </div>
  );
}

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
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '6px 0 0' }}>{d.rules || `Use cashback to pay up to ${d.maxPercent}% of a purchase. Cashback cannot be sent or withdrawn. It expires after ${d.expiryDays || 90} days.`} Switch on “Use cashback” when you buy.</p>
      {d.oldestExpiry && d.balance > 0 && (
        <p style={{ fontSize: 12, color: 'var(--gold)', margin: '4px 0 0' }}>{naira(d.oldestExpiryAmount)} expires on {new Date(d.oldestExpiry).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} — used first.</p>
      )}
      {open && d.entries.map((e) => (
        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderTop: '1px solid var(--slate-800)' }}>
          <span><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: { EARNED: 'var(--green-500)', USED: 'var(--slate-400)', RETURNED: 'var(--purple)', EXPIRED: 'var(--red-500)', REVERSED: 'var(--red-500)' }[e.type] || 'var(--slate-400)' }}>{{ EARNED: 'EARNED', USED: 'USED', RETURNED: 'RETURNED', EXPIRED: 'EXPIRED', ADJUSTMENT: 'ADJUSTED', REVERSED: 'TAKEN BACK' }[e.type] || ''}</span> {e.note}<br /><span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{new Date(e.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}{e.expiresAt && e.amount > 0 ? ` · expires ${new Date(e.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}</span></span>
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

// GTBank account number (through Squad): BVN only, checked strictly
// against name, date of birth and phone, so we ask for all of them. The
// phone must be the one registered with the BVN (often not the ZAPPI PAY
// login number); it is sent to Squad only and doesn't change the login.
const bvnPhoneOk = (p) => { const d = String(p || '').replace(/\D/g, ''); return /^0[789][01]\d{8}$/.test(d) || /^234[789][01]\d{8}$/.test(d); };
const SQUAD_MISMATCH = /match your BVN|invalid BVN|validation failure/i;
function SquadForm({ info, customerName, onCreated, addOn, onCancel }) {
  const [bvn, setBvn] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = bvn.length === 11 && gender && address.trim().length >= 5 && consent && (info.hasDob || dob) && bvnPhoneOk(phone);

  async function create(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await createBankAccount({ provider: 'squad', idType: 'BVN', idNumber: bvn, gender, address, consent, phone, ...(info.hasDob ? {} : { dateOfBirth: dob }) });
      setBvn('');
      onCreated(res);
    } catch (err) {
      if (SQUAD_MISMATCH.test(err.message || '')) {
        // Most often the phone isn't the one on the BVN: say so and go to it.
        setError('Squad couldn’t match your details. Most often the phone number isn’t the one registered with your BVN. Enter that number below (dial *565*0# to check) and try again. Also check your name, date of birth and gender are exactly as on your BVN.');
        setTimeout(() => document.getElementById('sqPhone')?.focus(), 50);
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={addOn ? '' : 'card'} onSubmit={create} style={addOn ? { borderTop: '1px solid var(--slate-800, rgba(255,255,255,0.08))', paddingTop: 12, marginTop: 8 } : undefined}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>{addOn ? 'Add a GTBank account number' : 'Get your personal account number'}</h2>
      <IdCheckNotice info={info} />
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -8 }}>
        A GTBank account number in your name. Any bank transfer to it goes straight into your wallet. It's a one-time setup; banks require your BVN for this.
      </p>
      {error && <p className="error-text" style={{ margin: '0 0 10px' }}>{error}</p>}
      <div className="field">
        <label htmlFor="sqBvn">Your BVN (11 digits)</label>
        <input id="sqBvn" inputMode="numeric" autoComplete="off" maxLength={11} value={bvn} onChange={(e) => setBvn(e.target.value.replace(/\D/g, ''))} required />
      </div>
      {!info.hasDob && (
        <div className="field">
          <label htmlFor="sqDob">Date of birth (as on your BVN)</label>
          <input id="sqDob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} required />
        </div>
      )}
      <div className="field">
        <label>Gender (as on your BVN)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['male', 'Male'], ['female', 'Female']].map(([v, l]) => (
            <button key={v} type="button" className={gender === v ? 'btn' : 'btn btn-secondary'} onClick={() => setGender(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="sqAddr">Home address</label>
        <input id="sqAddr" autoComplete="street-address" maxLength={200} placeholder="e.g. 12 Iwo Road, Ibadan" value={address} onChange={(e) => setAddress(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="sqPhone">Phone number registered with your BVN</label>
        <input id="sqPhone" inputMode="tel" autoComplete="off" maxLength={14} placeholder="e.g. 08031234567" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))} required aria-describedby="sqPhoneHint" />
        <small id="sqPhoneHint" style={{ color: 'var(--slate-400)', display: 'block', marginTop: 4 }}>
          Often <b>different</b> from the number you use for ZAPPI PAY. Not sure which line? Dial <b>*565*0#</b> from it: the line that shows your BVN is the right one. Used only for this check — your ZAPPI PAY number doesn’t change.
        </small>
        {phone && !bvnPhoneOk(phone) && <small className="error-text" style={{ display: 'block' }}>Enter an 11-digit Nigerian number, e.g. 08031234567.</small>}
      </div>
      <p style={{ fontSize: 13, margin: '0 0 8px', padding: '8px 10px', borderRadius: 8, background: 'rgba(13, 148, 136,0.08)' }}>
        Your name <b>{customerName || 'on your profile'}</b>, date of birth, gender and the phone number above must match your BVN exactly. If your name is spelt differently, fix it in Profile first.
      </p>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, marginBottom: 10 }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
        I agree that ZAPPI PAY can check my details with my BVN through its licensed payment partner.
      </label>
      <p style={{ color: 'var(--slate-400)', fontSize: 12 }}>
        Your BVN is sent securely to our licensed payment partner only to create your account. ZAPPI PAY doesn’t keep your BVN — only a one-way code, so one BVN can’t open two accounts.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" type="submit" disabled={busy || !ready}>{busy ? 'Creating…' : 'Get My Account Number'}</button>
        {onCancel && <button className="btn btn-secondary" type="button" disabled={busy} onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

// Another personal account number (BVN or NIN), added next to the ones
// the customer already has.
function AddAccountForm({ info, customerName, onCreated, onCancel }) {
  const [idType, setIdType] = useState('BVN');
  const [idNumber, setIdNumber] = useState('');
  const [dob, setDob] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function create(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await createBankAccount({ provider: 'nomba', idType, idNumber, ...(info.idMatch ? { consent, ...(info.hasDob ? {} : { dateOfBirth: dob }) } : {}) });
      setIdNumber('');
      onCreated(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={create} style={{ borderTop: '1px solid var(--slate-800, rgba(255,255,255,0.08))', paddingTop: 12, marginTop: 8 }}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>Add another account number</h2>
      <IdCheckNotice info={info} />
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -8 }}>One more personal account number, so you have a backup if a bank is having network issues. Money sent to it goes straight into your wallet.</p>
      {error && <p className="error-text" style={{ margin: '0 0 10px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['BVN', 'NIN'].map((t) => (
          <button key={t} type="button" className={idType === t ? 'btn' : 'btn btn-secondary'} onClick={() => setIdType(t)}>{t}</button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="addId">Your {idType} (11 digits)</label>
        <input id="addId" inputMode="numeric" autoComplete="off" maxLength={11} value={idNumber} onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))} required />
      </div>
      {info.idMatch && (
        <>
          {!info.hasDob && (
            <div className="field">
              <label htmlFor="addDob">Date of birth (as on your {idType})</label>
              <input id="addDob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} required />
            </div>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, marginBottom: 10 }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
            I agree that ZAPPI PAY can check my name ({customerName || 'on my profile'}) and date of birth with my {idType} through its licensed payment partner.
          </label>
        </>
      )}
      <p style={{ color: 'var(--slate-400)', fontSize: 12 }}>Your {idType} is sent securely to our licensed payment partner only to create your account. ZAPPI PAY doesn’t keep your {idType} — only a one-way code, so one {idType} can’t open two accounts.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" type="submit" disabled={busy || idNumber.length !== 11 || (info.idMatch && (!consent || (!info.hasDob && !dob)))}>{busy ? 'Creating…' : 'Get My Account Number'}</button>
        <button className="btn btn-secondary" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
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
  const [addGtb, setAddGtb] = useState(false);
  const [addMore, setAddMore] = useState(false);

  const accountFees = (info.accounts || []).map((a) => feeOf(a, info));
  const sameFee = accountFees.every((f) => f.feePercent === accountFees[0]?.feePercent && f.feeCap === accountFees[0]?.feeCap && f.feeIsPassThrough === accountFees[0]?.feeIsPassThrough);
  const one = accountFees[0] || feeOf(null, info);
  const feeText = !sameFee
    ? 'A small bank processing fee applies to each transfer — it’s shown under each account number.'
    : one.feePercent > 0
      ? `A ${feeLabel(one)} bank processing fee applies to each transfer${one.feeIsPassThrough ? ' — it goes to our licensed payment partner for handling your transfer, not to ZAPPI PAY' : ''}.`
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

  if (!info.accounts && info.provider === 'squad') {
    return <SquadForm info={info} customerName={customerName} onCreated={onCreated} />;
  }

  if (!info.accounts) {
    return (
      <form className="card" onSubmit={create}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Get your personal account number</h2>
        <IdCheckNotice info={info} />
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
            <p style={{ fontSize: 13, margin: '0 0 8px', padding: '8px 10px', borderRadius: 8, background: 'rgba(13, 148, 136,0.08)' }}>
              Your name <b>{customerName || 'on your profile'}</b> and date of birth must match your {idType} exactly. If your name is spelt differently, fix it in Profile first.
            </p>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, marginBottom: 10 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
              I agree that ZAPPI PAY can check my name and date of birth with my {idType} through its licensed payment partner.
            </label>
          </>
        )}
        <p style={{ color: 'var(--slate-400)', fontSize: 12 }}>
          Your {idType} is sent securely to our licensed payment partner only to create your account. ZAPPI PAY doesn’t keep your {idType} — only a one-way code, so one {idType} can’t open two accounts.
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
            <div style={{ fontSize: 12, color: 'var(--slate-300, #cbd5e1)', fontWeight: 600 }}>{a.displayName || a.accountName}</div>
            {a.bankShowsName && a.bankShowsName !== a.displayName && (
              <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>Your bank app shows: <b>{a.bankShowsName}</b></div>
            )}
            {/sirraddo/i.test(a.displayName || a.bankShowsName || '') && (
              <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>This is the name the sender’s bank app shows. SIRRADDO GLOBAL is the company that runs ZAPPI PAY, so it’s still your wallet.</div>
            )}
            {!sameFee && <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>Fee: {feeOf(a, info).feePercent > 0 ? feeLabel(feeOf(a, info)) : 'none'}</div>}
          </div>
          <CopyButton text={a.accountNumber} />
        </div>
      ))}
      {info.accounts.length > 0 && accountFees.some((f) => f.feePercent > 0) && <FundingHelper info={info} accounts={info.accounts} />}
      {error && <p className="error-text" style={{ margin: '8px 0' }}>{error}</p>}
      {message && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '8px 0' }}>{message}</p>}
      {info.accounts.length > 0 && <button className="btn btn-secondary" type="button" style={{ marginTop: 8 }} disabled={busy} onClick={check}>
        {busy ? 'Checking…' : 'I\'ve sent money — check now'}
      </button>}
      {info.squadAddable && !addGtb && (
        <button className="btn btn-secondary" type="button" style={{ marginTop: 8, marginLeft: 8 }} onClick={() => setAddGtb(true)}>Add a GTBank account number</button>
      )}
      {info.squadAddable && addGtb && (
        <SquadForm info={info} customerName={customerName} addOn onCancel={() => setAddGtb(false)} onCreated={(res) => { setAddGtb(false); onCreated({ ...res, squadAddable: false }); }} />
      )}
      {info.nombaAddable && !addMore && !addGtb && (
        <button className="btn btn-secondary" type="button" style={{ marginTop: 8, marginLeft: 8 }} onClick={() => setAddMore(true)}>Add another account number</button>
      )}
      {info.nombaAddable && addMore && (
        <AddAccountForm info={info} customerName={customerName} onCancel={() => setAddMore(false)} onCreated={(res) => { setAddMore(false); onCreated({ ...res, nombaAddable: false }); }} />
      )}
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

// Shown while a business-account transfer is being checked by support.
function ManualWaitCard({ req, waitMinutes }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const end = new Date(req.createdAt).getTime() + waitMinutes * 60000;
  const left = Math.max(0, end - now);
  const late = left === 0;
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  const pct = Math.min(100, Math.round((1 - left / (waitMinutes * 60000)) * 100));
  return (
    <div className="card" role="status" style={{ borderLeft: `4px solid ${late ? 'var(--gold, #FFB830)' : 'var(--purple)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{late ? '⏳ Taking longer than usual' : '🔎 Checking your transfer'}</div>
          <div style={{ color: 'var(--slate-400)', fontSize: 13 }}>
            ₦{Number(req.amount).toLocaleString()}{req.reference ? ` · ref ${req.reference}` : ''}
          </div>
        </div>
        {!late && <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{mm}:{String(ss).padStart(2, '0')}</div>}
      </div>
      {!late && <div style={{ height: 6, borderRadius: 3, background: 'var(--slate-700, #334155)', marginTop: 10, overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--purple)' }} /></div>}
      <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: '10px 0 0' }}>
        {late
          ? 'Support has been alerted and will confirm it as soon as possible. Please don’t send the money again — you’ll get a notification the moment it’s added.'
          : 'Our team is confirming it in our bank. It’s added to your wallet automatically the moment it’s confirmed — you can leave this page.'}
      </p>
    </div>
  );
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
  const [pendingReq, setPendingReq] = useState(null); // { request, waitMinutes }

  function load() {
    Promise.all([getWalletBalance(), getWalletTransactions()])
      .then(([b, t]) => {
        setBalance(b.walletBalance);
        setTransactions(t.transactions);
      })
      .catch((err) => setError(err.message));
    getPendingFundRequest().then((d) => setPendingReq(d.request ? d : null)).catch(() => {});
  }

  useEffect(load, []);
  // Funding waiting for approval updates on its own; a bank transfer to
  // the personal account shows up when the push arrives or on return.
  useAutoRefresh(load, Boolean(pendingReq || transactions?.some((t) => t.status === 'PENDING')));
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
      setSuccessMessage('');
      load();
    } catch (err) {
      setError(err.message || 'Could not submit funding request.');
    } finally {
      setSubmitting(false);
    }
  }

  const manualList = appInfo?.manualAccounts?.length ? appInfo.manualAccounts : appInfo?.manualFunding ? [{ id: '', ...appInfo.manualFunding }] : [];
  const manual = manualList[0] || null;
  const rules = appInfo?.manualRules || null;
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(13, 148, 136,0.1)', border: `${picked ? 2 : 1}px solid ${picked ? 'var(--gold, #FFB830)' : 'var(--purple)'}`, borderRadius: 10, padding: 12, marginBottom: 10, cursor: manualList.length > 1 ? 'pointer' : 'default' }}
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
          {rules && (
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 8px' }}>
              {rules.verifiedOnly ? 'For BVN/NIN-verified customers. ' : ''}{rules.maxAmount > 0 ? `Up to ₦${Number(rules.maxAmount).toLocaleString()} per request. ` : ''}We check our bank and add it — usually within {rules.waitMinutes} minutes in working hours.
            </p>
          )}
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

      <LimitNotice />
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
          onCreated={(res) => { setBankInfo((prev) => ({ ...prev, accounts: res.accounts, kycType: res.kycType, ...(res.squadAddable === false || prev?.provider === 'squad' ? { squadAddable: false } : {}), ...(res.nombaAddable === false || prev?.provider === 'nomba' ? { nombaAddable: false } : {}) })); if (res.verified) refreshCustomer?.(); }}
          onCredited={load}
          customerName={customer?.name}
        />
      )}

      {pendingReq?.request && <ManualWaitCard req={pendingReq.request} waitMinutes={pendingReq.waitMinutes} />}

      {!manual || pendingReq?.request ? null : autoFunding && !(bankInfo?.accounts && bankInfo.accounts.length === 0 && bankInfo.pausedCount > 0) ? (
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
          <div style={{ margin: '0 16px' }}><SkeletonRows rows={3} /></div>
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
