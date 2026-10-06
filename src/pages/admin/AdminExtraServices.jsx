import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { getAdminExtraServices, saveExtraServicesConfig, reviewSmsSender, adminStopTicketEvent, resolveBill } from '../../api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const btn = { width: 'auto', padding: '5px 12px', fontSize: 13 };
const when = (d) => new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminExtraServices() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [keys, setKeys] = useState({ smsPublicKey: '', smsSecretKey: '' });
  const load = () => getAdminExtraServices().then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  async function save(patch, ok = 'Saved.') {
    setErr(''); setMsg('');
    try { await saveExtraServicesConfig(patch); setMsg(ok); load(); } catch (e) { setErr(e.message); }
  }
  const num = (label, key, val, w = 120) => <label key={key} style={{ display: 'grid', gap: 2, fontSize: 13 }}>{label}<input type="number" defaultValue={val} onBlur={(e) => Number(e.target.value) !== Number(val) && save({ [key]: Number(e.target.value) })} style={{ width: w }} /></label>;
  return (
    <AdminLayout>
      <h1 style={{ marginTop: 0 }}>📩 SMS, Tickets & Bills</h1>
      <p style={{ color: 'var(--slate-400)', fontSize: 14, marginTop: -6 }}>Settings for Bulk SMS, Event tickets and More bills. Switch each one Off / Testers only / On in <Link to="/admin/features" style={{ color: 'var(--purple)' }}>🧩 New features</Link>.</p>
      {err && <p className="error-text">{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 14 }}>{msg}</p>}
      {!d ? <p>Loading…</p> : (
        <>
          <div className="card" style={{ margin: '0 0 16px' }}>
            <b>📩 Bulk SMS</b>
            <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 8px' }}>Uses VTpass Messaging (messaging.vtpass.com) — a separate account from your VTpass bills account. Buy SMS units there and copy the keys from its dashboard (Keys column → eye icon). Keys: {d.sms.config.keysSet ? <b style={{ color: 'var(--green-500)' }}>saved ✓</b> : <b style={{ color: 'var(--gold)' }}>not set</b>}</p>
            <form onSubmit={(e) => { e.preventDefault(); if (!keys.smsPublicKey && !keys.smsSecretKey) return; save(keys, 'SMS keys saved.').then(() => setKeys({ smsPublicKey: '', smsSecretKey: '' })); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: 2, fontSize: 13 }}>Public key (VT_PK_…)<input value={keys.smsPublicKey} onChange={(e) => setKeys({ ...keys, smsPublicKey: e.target.value })} autoComplete="off" style={{ width: 240 }} /></label>
              <label style={{ display: 'grid', gap: 2, fontSize: 13 }}>Secret key (VT_SK_…)<input type="password" value={keys.smsSecretKey} onChange={(e) => setKeys({ ...keys, smsSecretKey: e.target.value })} autoComplete="new-password" style={{ width: 240 }} /></label>
              <button type="submit" className="btn" style={btn}>Save keys</button>
            </form>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              {num('Price per SMS page (₦)', 'smsPricePerPage', d.sms.config.pricePerPage)}
              {num('DND price per page (₦)', 'smsDndPricePerPage', d.sms.config.dndPricePerPage)}
              {num('Max numbers per send', 'smsMaxRecipients', d.sms.config.maxRecipients)}
              <label style={{ display: 'grid', gap: 2, fontSize: 13 }}>Default sender name<input defaultValue={d.sms.config.defaultSender} maxLength={11} onBlur={(e) => e.target.value !== d.sms.config.defaultSender && save({ smsDefaultSender: e.target.value })} style={{ width: 130 }} /></label>
            </div>
            <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Set your price above what VTpass charges you per unit. The default sender name must be registered on VTpass Messaging too.</p>
            <b style={{ display: 'block', marginTop: 10 }}>Sender name requests ({d.sms.pending.length})</b>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 6px' }}>Register the name on VTpass Messaging first, then approve. Reject anything that looks like a bank, network, government agency or another company.</p>
            {d.sms.pending.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--slate-800)', fontSize: 14 }}>
                <span><b>{p.name}</b> — {p.purpose}<br /><small style={{ color: 'var(--slate-400)' }}>{p.customer?.name} · {p.customer?.phone}</small></span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn" style={btn} onClick={() => reviewSmsSender(p.id, { approve: true }).then(load).catch((e) => setErr(e.message))}>Approve</button>
                  <button type="button" className="btn btn-secondary" style={btn} onClick={() => { const note = window.prompt('Reason (shown to the customer):', 'Looks like another company’s name'); if (note !== null) reviewSmsSender(p.id, { approve: false, note }).then(load).catch((e) => setErr(e.message)); }}>Reject</button>
                </span>
              </div>
            ))}
            {d.sms.batches.length > 0 && <details style={{ marginTop: 10 }}><summary style={{ cursor: 'pointer', fontSize: 14 }}>Recent sends ({d.sms.batches.length})</summary>{d.sms.batches.map((b) => <div key={b.id} style={{ fontSize: 13, padding: '5px 0', borderTop: '1px solid var(--slate-800)' }}>{b.sender} → {b.recipients} · {naira(b.cost - b.refunded)} · {b.status} · {when(b.createdAt)}<br /><span style={{ color: 'var(--slate-400)' }}>{b.message}</span></div>)}</details>}
          </div>

          <div className="card" style={{ margin: '0 0 16px' }}>
            <b>🎟️ Event tickets</b>
            <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 8px' }}>Buyers pay through Monnify checkout and the ticket money is split straight to the organiser’s bank (Monnify sub-account). Ask Monnify support to enable sub-accounts on your account. Your booking fee must cover Monnify’s fee.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {num('Booking fee per ticket (₦)', 'ticketFeeFlat', d.tickets.feeFlat, 150)}
              {num('+ % of ticket price', 'ticketFeePercent', d.tickets.feePercent)}
            </div>
            <div style={{ fontSize: 14, margin: '10px 0' }}>{d.tickets.totals.tickets} paid tickets · {naira(d.tickets.totals.fees)} booking fees earned</div>
            {d.tickets.events.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--slate-800)', fontSize: 14 }}>
                <span><b>{e.title}</b> · {when(e.startsAt)}<br /><small style={{ color: 'var(--slate-400)' }}>{e.organiser?.name} ({e.organiser?.phone}) · {e.sold} sold · {naira(e.money)} to organiser · {e.status}</small></span>
                {e.status === 'ON_SALE' && <button type="button" className="btn btn-secondary" style={btn} onClick={() => window.confirm(`Stop ticket sales for “${e.title}”?`) && adminStopTicketEvent(e.id).then(load).catch((x) => setErr(x.message))}>Stop sales</button>}
              </div>
            ))}
          </div>

          <div className="card" style={{ margin: '0 0 16px' }}>
            <b>🧾 More bills (Flutterwave Bills)</b>
            <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 8px' }}>Paid from your Flutterwave balance — keep it funded, and whitelist your server’s IP in Flutterwave if asked. Uses the Flutterwave keys in Admin → Settings → Wallet funding (Monnify & Flutterwave).</p>
            {num('Service fee per bill (₦)', 'billsFee', d.bills.config.fee)}
            <b style={{ display: 'block', marginTop: 12, fontSize: 14 }}>Categories customers can see</b>
            {Array.isArray(d.bills.categories) ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {d.bills.categories.map((c) => (
                  <label key={c.code} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, padding: '4px 10px', borderRadius: 999, border: '1px solid var(--slate-700, #475569)' }}>
                    <input type="checkbox" checked={!c.hidden} onChange={(e) => save({ billsHiddenCategories: e.target.checked ? d.bills.config.hidden.filter((x) => x !== c.code) : [...d.bills.config.hidden, c.code] })} style={{ width: 'auto' }} />{c.name}
                  </label>
                ))}
              </div>
            ) : <p style={{ fontSize: 13, color: 'var(--gold)' }}>Couldn’t load categories from Flutterwave: {d.bills.categories?.error}</p>}
            <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Airtime, data, TV and internet are hidden by default because VTpass already covers them.</p>
            {d.bills.recent.length > 0 && <b style={{ display: 'block', marginTop: 10, fontSize: 14 }}>Recent bills</b>}
            {d.bills.recent.map((b) => (
              <div key={b.reference} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--slate-800)', fontSize: 13 }}>
                <span>{b.biller} · {b.item} · {b.customer}<br /><small style={{ color: 'var(--slate-400)' }}>{naira(b.amount)} + {naira(b.fee)} · {when(b.createdAt)} · {b.reference}</small></span>
                {b.status === 'PENDING' ? (
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn" style={btn} onClick={() => window.confirm('Mark as PAID? Only do this after checking it succeeded in your Flutterwave dashboard.') && resolveBill(b.reference, 'SUCCESS').then(load).catch((e) => setErr(e.message))}>Paid</button>
                    <button type="button" className="btn btn-secondary" style={btn} onClick={() => window.confirm('Mark as FAILED and refund the customer?') && resolveBill(b.reference, 'FAILED').then(load).catch((e) => setErr(e.message))}>Failed — refund</button>
                  </span>
                ) : <span style={{ color: b.status === 'SUCCESS' ? 'var(--green-500)' : 'var(--red-500)' }}>{b.status.toLowerCase()}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
