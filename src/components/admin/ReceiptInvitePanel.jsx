import { useEffect, useState } from 'react';
import { getAdminReceiptInvite, setAdminReceiptInvite } from '../../api';

// Settings → Referrals: every receipt a customer downloads or shares
// carries their invite link + QR code, so receipts double as invites.
export default function ReceiptInvitePanel() {
  const [d, setD] = useState(null);
  const [on, setOn] = useState(true);
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getAdminReceiptInvite().then((x) => { setD(x); setOn(x.enabled); setMsg(x.message); }).catch((e) => setNote({ ok: false, text: e.message })); }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setNote(null);
    try {
      const x = await setAdminReceiptInvite({ enabled: on, message: msg });
      setD(x);
      setMsg(x.message);
      setNote({ ok: true, text: 'Saved.' });
    } catch (err) {
      setNote({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (!d) return <p className="empty-state">{note?.text || 'Loading…'}</p>;
  return (
    <form className="card" style={{ margin: '0 0 16px', maxWidth: 560 }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>🧾 Invite on receipts</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -4 }}>
        Every receipt a customer downloads or shares (purchases and bank transfers) gets a box at the bottom with their referral link, a QR code of it and a short invite — so whoever receives the receipt can join with their code. Customers without a username yet get a general link to zappipay.com.ng.
      </p>
      {note && <p style={{ color: note.ok ? 'var(--green-500)' : 'var(--red-500)', fontSize: 14 }}>{note.text}</p>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} style={{ width: 'auto' }} />
        Add the sender’s invite link + QR code to receipts
      </label>
      <div className="field">
        <label htmlFor="riMsg">Invite message (optional)</label>
        <input id="riMsg" maxLength={120} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={d.defaultMessage} />
        <small style={{ color: 'var(--slate-400)' }}>Leave empty to use: “{d.defaultMessage}”. Don’t promise a bonus here unless Referrals are on.</small>
      </div>
      <button className="btn" type="submit" style={{ width: 'auto' }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
