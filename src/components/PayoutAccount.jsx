import { useEffect, useState } from 'react';
import { getPayout, savePayout, getBankList } from '../api';
import PinConfirm from './PinConfirm';

// "Where should payments go?" — the receiver's own bank account for
// direct pay (dues, spray, pay-me links). Only shows when direct pay is on.
export default function PayoutAccount({ purpose = 'payments', compact = false }) {
  const [d, setD] = useState(null);
  const [edit, setEdit] = useState(false);
  const [banks, setBanks] = useState([]);
  const [f, setF] = useState({ bankCode: '', accountNumber: '' });
  const [pin, setPin] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const load = () => getPayout().then(setD).catch(() => setD(null));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (edit && !banks.length) getBankList().then((x) => setBanks(x.banks || [])).catch(() => {}); }, [edit]);
  if (!d?.on) return null;
  const acct = d.account;
  return (
    <div className="card payout-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <b>🏦 Where your {purpose} go</b>
        {acct && !edit && <button type="button" className="mini-btn" onClick={() => setEdit(true)}>Change</button>}
      </div>
      {acct && !edit ? (
        <p style={{ margin: '6px 0 0', fontSize: 14 }}>{acct.accountName} · {acct.accountNumber}<br /><small style={{ color: 'var(--slate-400)' }}>Paid straight into this account by our payment partner (usually the next working day).</small></p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setErr(''); setPin(true); }} style={{ marginTop: 8 }}>
          {!compact && <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '0 0 8px' }}>People pay by card or transfer and the money goes straight into your bank account. Add the account in your own name.</p>}
          <div className="field"><label htmlFor="poB">Bank</label><select id="poB" value={f.bankCode} onChange={(e) => setF({ ...f, bankCode: e.target.value })} required><option value="">Choose bank…</option>{banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select></div>
          <div className="field"><label htmlFor="poA">Account number</label><input id="poA" inputMode="numeric" maxLength={10} value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value.replace(/\D/g, '') })} required /></div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn" type="submit">Save bank account</button>{acct && <button type="button" className="btn btn-secondary" onClick={() => setEdit(false)}>Cancel</button>}</div>
        </form>
      )}
      {err && <p className="error-text">{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '6px 0 0' }}>{msg}</p>}
      <PinConfirm open={pin} title="Confirm bank account" summary="Save this bank account to receive payments"
        onSubmit={async (auth) => { const r = await savePayout({ ...f, ...auth }); setPin(false); setEdit(false); setMsg(`Saved ✓ — ${r.account.accountName}`); load(); }}
        onError={(e) => setErr(e.message)} onClose={() => setPin(false)} />
    </div>
  );
}

// Sends the customer to Monnify's payment page when an API answered with a checkout.
export function goToCheckout(res) {
  if (res?.checkout && res.checkoutUrl) { window.location.href = res.checkoutUrl; return true; }
  return false;
}
