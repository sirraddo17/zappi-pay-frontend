import { useEffect, useState } from 'react';
import { getSettings, updateSettings, getFundingBanks } from '../../api';

const blank = () => ({ id: Math.random().toString(36).slice(2, 10), bankName: '', accountNumber: '', accountName: '', enabled: true });

// Business accounts for manual funding (several, each with an on/off
// switch) and the automatic-funding banks that can be paused while a
// bank's network is down. Switches save straight away.
export default function FundingAccountsPanel() {
  const [on, setOn] = useState(true);
  const [accounts, setAccounts] = useState(null);
  const [hidden, setHidden] = useState([]);
  const [banks, setBanks] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSettings().then((d) => {
      const s = d.settings || d;
      setOn(s.manualFundingEnabled !== false);
      const list = Array.isArray(s.manualAccounts) && s.manualAccounts.length ? s.manualAccounts
        : s.manualAccountNumber ? [{ id: 'main', bankName: s.manualBankName || '', accountNumber: s.manualAccountNumber, accountName: s.manualAccountName || '', enabled: true }] : [];
      setAccounts(list);
      setHidden(Array.isArray(s.hiddenFundingBanks) ? s.hiddenFundingBanks : []);
    }).catch((e) => setError(e.message));
    getFundingBanks().then((d) => setBanks(d.banks || [])).catch(() => {});
  }, []);

  async function save(patch, text) {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await updateSettings(patch);
      setMsg(text);
      setTimeout(() => setMsg(''), 3000);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const clean = (list) => list.filter((a) => a.bankName || a.accountNumber || a.accountName);
  const set = (i, k, v) => setAccounts((l) => l.map((a, j) => (j === i ? { ...a, [k]: v } : a)));

  async function toggleAccount(i) {
    const next = accounts.map((a, j) => (j === i ? { ...a, enabled: !a.enabled } : a));
    setAccounts(next);
    const a = next[i];
    if (!(await save({ manualAccounts: clean(next) }, `${a.bankName || 'Account'} is now ${a.enabled ? 'shown to' : 'hidden from'} customers.`))) setAccounts(accounts);
  }

  async function toggleBank(name) {
    const next = hidden.includes(name) ? hidden.filter((b) => b !== name) : [...hidden, name];
    setHidden(next);
    if (!(await save({ hiddenFundingBanks: next }, `${name} is now ${next.includes(name) ? 'hidden' : 'shown'} on customers' Wallet page.`))) setHidden(hidden);
  }

  if (accounts === null) return <p className="empty-state">{error || 'Loading funding accounts…'}</p>;
  const shownCount = accounts.filter((a) => a.enabled !== false && a.accountNumber).length;
  const allBanks = [...new Set([...banks.map((b) => b.name), ...hidden])];

  const sw = (active) => ({ width: 'auto', padding: '4px 12px', fontSize: 12, background: active ? 'var(--green-500)' : 'var(--slate-700, #334155)', color: '#fff', border: 'none', borderRadius: 999, cursor: 'pointer' });

  return (
    <div style={{ borderTop: '1px solid var(--slate-700)', margin: '8px 0 14px', paddingTop: 14 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Manual funding accounts</div>
      <p style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 0 }}>
        Backup business accounts customers can pay into (then submit for approval under Pending Funding). Add as many as you like and switch one off when its bank has network problems — customers only see the ones switched on.
      </p>
      {error && <p className="error-text" style={{ margin: '0 0 8px' }}>{error}</p>}
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '0 0 8px' }}>{msg}</p>}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input type="checkbox" checked={on} disabled={busy} onChange={async (e) => { const v = e.target.checked; setOn(v); if (!(await save({ manualFundingEnabled: v }, v ? 'Manual funding is on.' : 'Manual funding is off.'))) setOn(!v); }} style={{ width: 'auto' }} />
        Offer manual funding {on && <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>({shownCount} account{shownCount === 1 ? '' : 's'} showing)</span>}
      </label>
      {accounts.map((a, i) => (
        <div key={a.id} style={{ border: '1px solid var(--slate-700)', borderRadius: 10, padding: 10, marginBottom: 8, opacity: a.enabled === false ? 0.6 : 1 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input aria-label="Bank name" value={a.bankName} onChange={(e) => set(i, 'bankName', e.target.value)} placeholder="Bank, e.g. Moniepoint" style={{ flex: '1 1 140px' }} />
            <input aria-label="Account number" inputMode="numeric" maxLength={10} value={a.accountNumber} onChange={(e) => set(i, 'accountNumber', e.target.value.replace(/\D/g, ''))} placeholder="10-digit number" style={{ flex: '1 1 130px' }} />
            <input aria-label="Account name" value={a.accountName} onChange={(e) => set(i, 'accountName', e.target.value)} placeholder="Account name" style={{ flex: '2 1 180px' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" style={sw(a.enabled !== false)} disabled={busy} onClick={() => toggleAccount(i)}>
              {a.enabled !== false ? '● Showing' : '○ Hidden'}
            </button>
            <button type="button" disabled={busy} onClick={() => setAccounts((l) => l.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', fontSize: 12 }}>Remove</button>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={accounts.length >= 10} onClick={() => setAccounts((l) => [...l, blank()])}>+ Add account</button>
        <button type="button" className="btn" style={{ width: 'auto' }} disabled={busy} onClick={() => save({ manualAccounts: clean(accounts) }, 'Funding accounts saved.')}>{busy ? 'Saving…' : 'Save accounts'}</button>
      </div>

      <div style={{ fontWeight: 600, margin: '16px 0 4px' }}>Automatic funding banks (Monnify)</div>
      <p style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 0 }}>
        Customers' personal account numbers are spread across these banks. If one bank is down, hide it so customers only see the ones that work. If you hide them all, customers see the manual accounts above instead.
      </p>
      {allBanks.length === 0 ? (
        <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>No customer has a personal account number yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {allBanks.map((name) => {
            const isHidden = hidden.includes(name);
            const count = banks.find((b) => b.name === name)?.customers;
            return (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, opacity: isHidden ? 0.6 : 1 }}>{name}{count ? <span style={{ color: 'var(--slate-400)', fontSize: 12 }}> · {count} customer{count === 1 ? '' : 's'}</span> : null}</span>
                <button type="button" style={sw(!isHidden)} disabled={busy} onClick={() => toggleBank(name)}>{isHidden ? '○ Hidden' : '● Showing'}</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
