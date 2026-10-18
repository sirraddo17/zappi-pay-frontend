import { useEffect, useState } from 'react';
import { getPartnerAccounts, savePartnerAccounts } from '../../api';

// Your own accounts with a partner: the one you FUND (top up the
// partner wallet) and the one the partner PAYS INTO (settlement).
// partner = 'vtpass' | 'monnify' | … shows just that partner;
// partner = 'all' shows every partner together (read + edit).
const ROLE_COLOR = { TOPUP: 'var(--gold)', SETTLEMENT: 'var(--green-500)', BOTH: 'var(--purple, #a78bfa)' };
const ROLE_ICON = { TOPUP: '⬆️', SETTLEMENT: '⬇️', BOTH: '↕️' };
const blank = (partner) => ({ partner: partner === 'all' ? '' : partner, role: '', bankName: '', accountNumber: '', accountName: '', note: '' });

export default function PartnerAccountsCard({ partner = 'all' }) {
  const [d, setD] = useState(null);
  const [form, setForm] = useState(null); // { index | null, ...fields }
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const load = () => getPartnerAccounts().then(setD).catch((e) => setMsg({ ok: false, text: e.message }));
  useEffect(() => { load(); }, []);

  if (!d) return <div className="card" style={{ margin: '0 0 16px', maxWidth: 640 }}>{msg ? <p className="error-text">{msg.text}</p> : 'Loading partner accounts…'}</div>;
  const saved = d.accounts.filter((a) => a.source === 'saved');
  const shown = d.accounts.filter((a) => partner === 'all' || a.partner === partner);
  const title = partner === 'all' ? 'Your partner accounts' : `Your ${d.partners[partner] || partner} accounts`;

  async function persist(next, okText) {
    setBusy(true);
    setMsg(null);
    try {
      setD(await savePartnerAccounts(next.map(({ id, partner: p, role, bankName, accountNumber, accountName, note }) => ({ id, partner: p, role, bankName, accountNumber, accountName, note }))));
      setMsg({ ok: true, text: okText });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    const { index, ...fields } = form;
    const next = [...saved];
    if (index === null) next.push(fields);
    else next[index] = { ...next[index], ...fields };
    if (await persist(next, 'Saved.')) setForm(null);
  }
  const copy = (n) => { navigator.clipboard?.writeText(n).then(() => { setCopied(n); setTimeout(() => setCopied(''), 1500); }).catch(() => {}); };
  const input = { width: '100%', boxSizing: 'border-box' };

  return (
    <div className="card" style={{ margin: '0 0 16px', maxWidth: 640 }}>
      <b>🏦 {title}</b>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 8px' }}>
        <span style={{ color: ROLE_COLOR.TOPUP }}>⬆️ Fund</span> = you send money in to top up this partner’s wallet. <span style={{ color: ROLE_COLOR.SETTLEMENT }}>⬇️ Receiving</span> = the partner pays money out to you here.
      </p>

      {shown.length === 0 && <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>No accounts saved yet.</p>}
      {shown.map((a) => {
        const idx = saved.findIndex((x) => x.id === a.id);
        return (
          <div key={a.id} style={{ padding: '10px 0', borderTop: '1px solid var(--slate-800)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLOR[a.role] }}>{ROLE_ICON[a.role]} {a.roleName}{partner === 'all' ? ` · ${a.partnerName}` : ''}</div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>{a.accountNumber}</div>
                <div style={{ fontSize: 13 }}>{a.bankName}{a.accountName ? ` · ${a.accountName}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => copy(a.accountNumber)}>{copied === a.accountNumber ? 'Copied ✓' : 'Copy'}</button>
                {idx >= 0 && <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} disabled={busy} onClick={() => { setMsg(null); setForm({ index: idx, ...saved[idx] }); }}>Edit</button>}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 4 }}>{a.whatItDoes}</div>
            {a.note && <div style={{ fontSize: 12, color: 'var(--slate-300)', marginTop: 2 }}>📝 {a.note}</div>}
          </div>
        );
      })}

      {!form && <button type="button" className="btn btn-secondary" style={{ width: 'auto', marginTop: 8 }} disabled={busy} onClick={() => { setMsg(null); setForm({ index: null, ...blank(partner) }); }}>＋ Add an account</button>}

      {form && (
        <form onSubmit={submit} style={{ borderTop: '1px solid var(--slate-800)', marginTop: 8, paddingTop: 10 }}>
          <b style={{ fontSize: 14 }}>{form.index === null ? 'Add an account' : 'Edit account'}</b>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {partner === 'all' && (
              <div className="field" style={{ flex: '1 1 160px' }}>
                <label htmlFor="pa-partner">Partner</label>
                <select id="pa-partner" value={form.partner} onChange={(e) => setForm((f) => ({ ...f, partner: e.target.value }))} required style={input}>
                  <option value="">Choose…</option>
                  {Object.entries(d.partners).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
            <div className="field" style={{ flex: '1 1 160px' }}>
              <label htmlFor="pa-role">What is it for?</label>
              <select id="pa-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} required style={input}>
                <option value="">Choose…</option>
                <option value="TOPUP">⬆️ Fund (I top up this partner)</option>
                <option value="SETTLEMENT">⬇️ Receiving (partner pays me here)</option>
                <option value="BOTH">↕️ Both</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: '1 1 160px' }}><label htmlFor="pa-num">Account number</label><input id="pa-num" inputMode="numeric" maxLength={14} value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/[^\d ]/g, '') }))} required style={input} /></div>
            <div className="field" style={{ flex: '1 1 160px' }}><label htmlFor="pa-bank">Bank</label><input id="pa-bank" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="e.g. Nombank MFB" required style={input} /></div>
          </div>
          <div className="field"><label htmlFor="pa-name">Account name (optional)</label><input id="pa-name" value={form.accountName} onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))} placeholder="e.g. SIRRADDO GLOBAL LIMITED" style={input} /></div>
          <div className="field"><label htmlFor="pa-note">Note (optional)</label><input id="pa-note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. fund with transfer narration ZAPPI" style={input} /></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="btn" style={{ width: 'auto' }} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy} onClick={() => setForm(null)}>Cancel</button>
            {form.index !== null && (
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', color: 'var(--red-500)' }} disabled={busy}
                onClick={async () => { if (await persist(saved.filter((_, i) => i !== form.index), 'Removed.')) setForm(null); }}>Remove</button>
            )}
          </div>
        </form>
      )}
      {msg && <p style={{ fontSize: 13, margin: '8px 0 0', color: msg.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{msg.text}</p>}
      {partner !== 'all' && <p style={{ fontSize: 11, color: 'var(--slate-500, #64748b)', margin: '8px 0 0' }}>All partners’ accounts together: Wallet funding & payment partners → Overview.</p>}
    </div>
  );
}
