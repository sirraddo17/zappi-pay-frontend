import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import ShowMore, { FIRST_COUNT } from '../../components/ShowMore';
import { getAdminWaitlist, getWaitlistPhones, emailWaitlist, removeWaitlistEntry, downloadWaitlistCsv } from '../../api';

const LABEL = { airtime: 'Airtime', data: 'Data', electricity: 'Electricity', cable: 'Cable TV', exam: 'Exam PINs', betting: 'Bet funding', transfer: 'Send money', savings: 'Savings' };

export default function AdminWaitlist() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [shown, setShown] = useState(FIRST_COUNT * 2);
  const [q, setQ] = useState('');
  const [mail, setMail] = useState({ open: false, subject: 'ZAPPI PAY is live 🎉', message: 'You asked us to tell you when ZAPPI PAY launches. It’s live now: buy airtime, data, electricity and cable TV in seconds at https://zappipay.com.ng' });

  const load = () => getAdminWaitlist().then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function run(label, fn) {
    setBusy(label); setError(''); setNote('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(''); }
  }

  const copyPhones = () => run('phones', async () => {
    const { phones } = await getWaitlistPhones();
    await navigator.clipboard.writeText(phones.join('\n'));
    setNote(`${phones.length} phone numbers copied. Paste them into SMS, Tickets & Bills → Bulk SMS.`);
  });
  const sendEmails = () => run('email', async () => {
    const r = await emailWaitlist({ subject: mail.subject, message: mail.message });
    setNote(`Emailed ${r.sent}.${r.failed.length ? ` ${r.failed.length} failed.` : ''}${r.left ? ` ${r.left} still to go: tap Send again.` : ' Everyone with an email has been told.'}`);
    load();
  });
  const remove = (id) => run('rm' + id, async () => { await removeWaitlistEntry(id); load(); });

  const list = (data?.entries || []).filter((r) => !q || `${r.name} ${r.phone} ${r.email || ''}`.toLowerCase().includes(q.toLowerCase()));
  const top = Object.entries(data?.byInterest || {}).sort((a, b) => b[1] - a[1]);

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>📝 Launch waitlist</h1>
        <p>People who asked to be told when ZAPPI PAY launches (form on the welcome page while test mode is on)</p>
      </div>
      {error && <p className="error-text">{error}</p>}
      {note && <p className="card" style={{ margin: '0 0 12px', fontSize: 14 }}>{note}</p>}
      {data && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div className="card stat" style={{ margin: 0, flex: '1 1 140px' }}><div className="label">On the list</div><div className="value">{data.total}</div></div>
          <div className="card stat" style={{ margin: 0, flex: '1 1 140px' }}><div className="label">With email</div><div className="value">{data.withEmail}</div></div>
          <div className="card stat" style={{ margin: 0, flex: '1 1 140px' }}><div className="label">Already emailed</div><div className="value">{data.notified}</div></div>
          {top.length > 0 && (
            <div className="card" style={{ margin: 0, flex: '2 1 240px', fontSize: 13 }}>
              <div className="label" style={{ marginBottom: 6 }}>Most wanted</div>
              {top.map(([k, n]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{LABEL[k] || k}</span><b>{n}</b></div>)}
            </div>
          )}
        </div>
      )}
      <div className="admin-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="btn" style={{ width: 'auto', padding: '8px 14px' }} disabled={!!busy || !data?.total} onClick={() => run('csv', downloadWaitlistCsv)}>{busy === 'csv' ? 'Downloading…' : '⬇️ Download CSV'}</button>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={!!busy || !data?.total} onClick={copyPhones}>{busy === 'phones' ? 'Copying…' : '📋 Copy phone numbers'}</button>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={!!busy || !data?.waitingEmail} onClick={() => setMail((m) => ({ ...m, open: !m.open }))}>✉️ Email launch news ({data?.waitingEmail || 0})</button>
      </div>
      {mail.open && (
        <div className="card" style={{ margin: '0 0 14px' }}>
          {!data?.emailReady && <p className="error-text" style={{ marginTop: 0 }}>Email isn’t set up on the server yet (RESEND_API_KEY and EMAIL_FROM), so this can’t send.</p>}
          <label className="label" htmlFor="wl-subject" style={{ display: 'block', marginBottom: 4 }}>Subject</label>
          <input id="wl-subject" value={mail.subject} maxLength={120} onChange={(e) => setMail((m) => ({ ...m, subject: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
          <label className="label" htmlFor="wl-msg" style={{ display: 'block', margin: '10px 0 4px' }}>Message (each person’s first name is added at the top)</label>
          <textarea id="wl-msg" rows={5} value={mail.message} maxLength={2000} onChange={(e) => setMail((m) => ({ ...m, message: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, font: 'inherit', fontSize: 14, background: 'var(--slate-800, #1e293b)', color: 'inherit', border: '1px solid var(--slate-700)' }} />
          <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>Sends to up to 100 people each tap, only to people not emailed before. Send this only once ZAPPI PAY is really live.</p>
          <button type="button" className="btn" style={{ width: 'auto', padding: '8px 14px' }} disabled={!!busy || !data?.emailReady} onClick={sendEmails}>{busy === 'email' ? 'Sending…' : (() => { const n = Math.min(100, data?.waitingEmail || 0); return `Send to ${n} ${n === 1 ? 'person' : 'people'}`; })()}</button>
        </div>
      )}
      <input placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      {data === null ? <p className="empty-state">Loading…</p> : list.length === 0 ? <p className="empty-state">{data.total ? 'No match.' : 'Nobody yet. Share the welcome page (zappipay.com.ng) while test mode is on.'}</p> : (
        <>
          {list.slice(0, shown).map((r) => (
            <div key={r.id} className="card" style={{ margin: '0 0 8px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 14, minWidth: 0 }}>
                <b>{r.name}</b> · {r.phone}{r.email ? ` · ${r.email}` : ''}
                <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>
                  {new Date(r.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {r.interests?.length ? ` · ${r.interests.map((i) => LABEL[i] || i).join(', ')}` : ''}
                  {r.source ? ` · from ${r.source}` : ''}
                  {r.notifiedAt ? ' · ✉️ emailed' : ''}
                </div>
              </div>
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} disabled={!!busy} onClick={() => remove(r.id)}>Remove</button>
            </div>
          ))}
          <ShowMore total={list.length} shown={shown} setShown={setShown} first={FIRST_COUNT * 2} />
        </>
      )}
    </AdminLayout>
  );
}
