import { useEffect, useState } from 'react';
import { getBvnAutofill, saveBvnAutofill } from '../../api';

// Owner: "Verify with BVN" auto-fill switch (Off / Testers only / On), the
// identity provider and its key (never shown again after saving), and how
// many lookups were made this month (each is paid to the provider).
// No <form> here: it sits inside the Settings form.
export default function BvnAutofillPanel() {
  const [d, setD] = useState(null);
  const [key, setKey] = useState('');
  const [appId, setAppId] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => { getBvnAutofill().then(setD).catch((e) => setMsg({ ok: false, text: e.message })); }, []);
  async function save(body, ok) {
    setBusy(true); setMsg(null);
    try { setD(await saveBvnAutofill(body)); setKey(''); setAppId(''); setMsg({ ok: true, text: ok }); } catch (e) { setMsg({ ok: false, text: e.message }); } finally { setBusy(false); }
  }
  if (!d) return <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>{msg?.text || 'Loading BVN auto-fill…'}</p>;
  const isTest = d.provider === 'test';
  return (
    <div className="card" style={{ margin: '14px 0', padding: 12, border: '1px solid var(--slate-700)' }}>
      <b>🪪 BVN auto-fill — “Verify with BVN”</b>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 8px' }}>
        On Wallet → Get your account number, the customer enters their BVN and agrees; the identity provider sends a code to the phone linked to that BVN. Only after the right code are their first, middle and last name and date of birth filled in and locked (they can’t change them; support can). Then the account number is made as usual. While this is Off, the normal name + date-of-birth check above is used. The BVN is never stored.
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {[['OFF', 'Off'], ['TESTERS', 'Testers only'], ['ON', 'On for everyone']].map(([m, l]) => (
          <button key={m} type="button" className={d.mode === m ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} disabled={busy || d.mode === m} onClick={() => save({ mode: m }, `BVN auto-fill: ${l}.`)}>{l}</button>
        ))}
      </div>
      <div className="field" style={{ margin: '0 0 8px' }}>
        <label htmlFor="bvnProv">Identity provider</label>
        <select id="bvnProv" value={d.provider} disabled={busy} onChange={(e) => save({ provider: e.target.value }, 'Provider saved.')}>
          {d.providers.map((p) => <option key={p.key} value={p.key} disabled={!p.implemented}>{p.name}{p.implemented ? '' : ' — not built yet'}</option>)}
        </select>
        {isTest && <small style={{ color: 'var(--gold)', display: 'block', marginTop: 4 }}>TEST provider: works only in “Testers only” (testers from Admin → New features). Any BVN, code 123456, sample names. Customers never get it.</small>}
      </div>
      {!isTest && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0, flex: '1 1 200px' }}>
            <label htmlFor="bvnKey">API key</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input id="bvnKey" type={show ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={key} onChange={(e) => setKey(e.target.value.trim())} placeholder={d.keySet ? `Saved (${d.keyHint})` : 'Paste the key'} style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} onClick={() => setShow((v) => !v)}>{show ? '🙈' : '👁'}</button>
            </div>
          </div>
          <div className="field" style={{ margin: 0, flex: '1 1 160px' }}>
            <label htmlFor="bvnApp">App ID (if the provider has one)</label>
            <input id="bvnApp" value={appId} onChange={(e) => setAppId(e.target.value.trim())} placeholder={d.appIdSet ? 'Saved' : ''} />
          </div>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={busy || (!key && !appId)} onClick={() => save({ ...(key ? { apiKey: key } : {}), ...(appId ? { appId } : {}) }, 'Keys saved.')}>Save keys</button>
        </div>
      )}
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '10px 0 0' }}>
        This month: <b>{d.month.lookups}</b> lookup{d.month.lookups === 1 ? '' : 's'} started ({d.month.paidLookups} paid with a real provider), <b>{d.month.confirmed}</b> confirmed. Each lookup is paid to the identity provider, even if the customer never enters the code. Limits: 3 starts and 5 code tries per customer a day, 10 starts per network a day.
      </p>
      {msg && <p style={{ fontSize: 13, margin: '6px 0 0', color: msg.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{msg.text}</p>}
    </div>
  );
}
