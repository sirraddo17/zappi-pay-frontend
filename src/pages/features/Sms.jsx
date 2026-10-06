import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSms, sendSms, requestSmsSender } from '../../api';
import PinConfirm from '../../components/PinConfirm';
import BottomNav from '../../components/BottomNav';
import { naira } from '../../components/circles/shared';

// Same rules as the server (lib/bulkSms.js) so the price shows as you type.
const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
function pagesFor(text) {
  let len = 0;
  for (const ch of text) {
    if (GSM.includes(ch)) len += 1;
    else if ('^{}\\[~]|€'.includes(ch)) len += 2;
    else { const n = [...text].length; return { unicode: true, chars: n, pages: n <= 70 ? 1 : Math.ceil(n / 67) }; }
  }
  return { unicode: false, chars: len, pages: len <= 160 ? 1 : Math.ceil(len / 153) };
}
function countNumbers(text) {
  const seen = new Set();
  for (const r of String(text).split(/[\s,;]+/)) {
    let n = r.replace(/[^\d]/g, '');
    if (/^0\d{10}$/.test(n)) n = `234${n.slice(1)}`;
    if (/^234[789][01]\d{8}$/.test(n)) seen.add(n);
  }
  return seen.size;
}
const STATUS = { SENT: ['✅ sent', 'var(--green-500)'], PARTIAL: ['⚠ some failed', 'var(--gold)'], FAILED: ['❌ failed — refunded', 'var(--red-500)'], SENDING: ['⏳ sending', 'var(--gold)'] };

export default function Sms() {
  const [d, setD] = useState(null);
  const [f, setF] = useState({ sender: '', recipients: '', message: '', dnd: false });
  const [pin, setPin] = useState(false);
  const [ask, setAsk] = useState(false);
  const [sf, setSf] = useState({ name: '', purpose: '' });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const load = () => getSms().then((x) => { setD(x); setF((y) => ({ ...y, sender: y.sender || x.defaultSender })); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const p = useMemo(() => pagesFor(f.message), [f.message]);
  const n = useMemo(() => countNumbers(f.recipients), [f.recipients]);
  if (!d) return <div className="app-shell">{err ? <p className="error-text" style={{ margin: 16 }}>{err}</p> : <p className="empty-state">Loading…</p>}</div>;
  const price = f.dnd ? d.dndPricePerPage : d.pricePerPage;
  const cost = n * p.pages * price;
  const approved = d.senders.filter((s) => s.status === 'APPROVED');
  function importFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((t) => setF((x) => ({ ...x, recipients: `${x.recipients ? `${x.recipients}\n` : ''}${t}` })));
  }
  return (
    <div className="app-shell" style={{ paddingBottom: 90 }}>
      <div className="page-header"><Link to="/more" style={{ color: 'var(--purple)', textDecoration: 'none', fontSize: 14 }}>← Back</Link><h1>📩 Bulk SMS</h1><p>Send sales alerts, reminders and announcements to your customers or members. Pay only for what you send.</p></div>
      {err && <p className="error-text" style={{ margin: '0 16px' }}>{err}</p>}
      {msg && <p style={{ color: 'var(--green-500)', margin: '0 16px', fontSize: 14 }}>{msg}</p>}
      <form className="card" onSubmit={(e) => { e.preventDefault(); setErr(''); setMsg(''); if (!n) { setErr('Add at least one valid Nigerian phone number.'); return; } setPin(true); }}>
        <div className="field"><label htmlFor="sS">Sender name</label>
          <select id="sS" value={f.sender} onChange={(e) => setF({ ...f, sender: e.target.value })}>
            <option value={d.defaultSender}>{d.defaultSender}</option>
            {approved.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <button type="button" onClick={() => setAsk(!ask)} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', padding: '4px 0', fontSize: 13 }}>＋ Use my own business name</button>
        </div>
        <div className="field"><label htmlFor="sR">Phone numbers (one per line or separated by commas)</label>
          <textarea id="sR" rows={4} value={f.recipients} onChange={(e) => setF({ ...f, recipients: e.target.value })} placeholder={'08031234567\n08131234567'} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          <small style={{ color: 'var(--slate-400)' }}>{n} valid number{n === 1 ? '' : 's'} · <label style={{ color: 'var(--purple)', cursor: 'pointer' }}>import a CSV/text file<input type="file" accept=".csv,.txt" onChange={importFile} style={{ display: 'none' }} /></label></small>
        </div>
        <div className="field"><label htmlFor="sM">Message</label>
          <textarea id="sM" rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} maxLength={918} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          <small style={{ color: p.pages > 6 ? 'var(--red-500)' : 'var(--slate-400)' }}>{p.chars} characters · {p.pages} SMS page{p.pages === 1 ? '' : 's'}{p.unicode ? ' (emoji/special characters use more pages)' : ''}</small>
        </div>
        <label style={{ display: 'flex', gap: 8, fontSize: 14, alignItems: 'flex-start' }}><input type="checkbox" checked={f.dnd} onChange={(e) => setF({ ...f, dnd: e.target.checked })} style={{ width: 'auto', marginTop: 3 }} /> Also reach numbers on DND (Do-Not-Disturb) — {naira(d.dndPricePerPage)} per page instead of {naira(d.pricePerPage)}</label>
        <div style={{ fontSize: 15, margin: '10px 0' }}>Cost: <b>{naira(cost)}</b> <small style={{ color: 'var(--slate-400)' }}>({n} × {p.pages} page{p.pages === 1 ? '' : 's'} × {naira(price)})</small></div>
        <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Only send to people who know you. No scams, no messages asking for PINs, OTPs or BVN. Numbers that fail are refunded automatically.</p>
        <button className="btn" type="submit" disabled={!n || !f.message.trim() || p.pages > 6}>Send to {n} number{n === 1 ? '' : 's'}</button>
      </form>
      {ask && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); setErr(''); requestSmsSender(sf).then(() => { setMsg('Sent for approval ✓ — we’ll notify you.'); setAsk(false); setSf({ name: '', purpose: '' }); load(); }).catch((x) => setErr(x.message)); }}>
          <b>Request a sender name</b>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 8px' }}>3–11 letters or numbers, your own business name (no bank, network or government names). Approval usually takes 1–3 working days.</p>
          <div className="field"><label htmlFor="sN">Sender name</label><input id="sN" maxLength={11} value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} placeholder="e.g. MAMAPUT" required /></div>
          <div className="field"><label htmlFor="sP">What will you use it for?</label><input id="sP" maxLength={200} value={sf.purpose} onChange={(e) => setSf({ ...sf, purpose: e.target.value })} placeholder="e.g. Sales alerts for my shop customers" required /></div>
          <button className="btn" type="submit">Request</button>
        </form>
      )}
      {d.senders.length > 0 && <div className="card"><b>My sender names</b>{d.senders.map((s) => <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderTop: '1px solid var(--slate-800)' }}><span>{s.name}</span><span style={{ color: s.status === 'APPROVED' ? 'var(--green-500)' : s.status === 'REJECTED' ? 'var(--red-500)' : 'var(--gold)' }}>{s.status === 'APPROVED' ? '✅ approved' : s.status === 'REJECTED' ? `not approved${s.note ? `: ${s.note}` : ''}` : '⏳ waiting'}</span></div>)}</div>}
      {d.history.length > 0 && (
        <div className="card">
          <b>Sent messages</b>
          {d.history.map((h) => { const [t, c] = STATUS[h.status] || [h.status, 'inherit']; return <div key={h.id} style={{ padding: '8px 0', borderTop: '1px solid var(--slate-800)', fontSize: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.message}</span><span style={{ color: c, whiteSpace: 'nowrap' }}>{t}</span></div><small style={{ color: 'var(--slate-400)' }}>{h.sender} · {h.sent}/{h.recipients} sent · {naira(h.cost - h.refunded)} · {new Date(h.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</small></div>; })}
        </div>
      )}
      <PinConfirm open={pin} summary={`Send ${p.pages}-page SMS to ${n} number${n === 1 ? '' : 's'} as ${f.sender} · ${naira(cost)}`}
        onSubmit={async (auth) => { const r = await sendSms({ ...f, ...auth }); setPin(false); setMsg(r.status === 'SENT' ? `Sent to ${r.sent} number${r.sent === 1 ? '' : 's'} ✓` : r.status === 'PARTIAL' ? `Sent to ${r.sent}; ${r.failed} failed and ${naira(r.refunded)} was refunded.` : `It didn’t go through — ${naira(r.refunded)} was refunded.`); if (r.status !== 'FAILED') setF((x) => ({ ...x, message: '' })); load(); }}
        onError={(e) => setErr(e.message)} onClose={() => setPin(false)} />
      <BottomNav />
    </div>
  );
}
