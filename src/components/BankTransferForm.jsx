import { useEffect, useMemo, useState } from 'react';
import { getBankTransferConfig, getBanks, lookupBankAccount, sendBankTransfer, getBankTransfers } from '../api';
import PinConfirm from './PinConfirm';
import ShowMore, { FIRST_COUNT } from './ShowMore';

function money(n) {
  return `₦${Number(n || 0).toLocaleString()}`;
}

const STATUS_COLOR = { SUCCESS: 'var(--green-500)', PROCESSING: 'var(--orange, #f97316)', FAILED: 'var(--red-500)', REVERSED: 'var(--red-500)' };
const STATUS_LABEL = { SUCCESS: 'Sent', PROCESSING: 'Processing', FAILED: 'Failed · refunded', REVERSED: 'Reversed · refunded' };

// Send to any Nigerian bank account from the wallet.
export default function BankTransferForm({ onDone }) {
  const [config, setConfig] = useState(null);
  const [banks, setBanks] = useState([]);
  const [history, setHistory] = useState(null);
  const [shown, setShown] = useState(FIRST_COUNT);

  const [bankQuery, setBankQuery] = useState('');
  const [bank, setBank] = useState(null);
  const [pickingBank, setPickingBank] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [account, setAccount] = useState(null);
  const [checking, setChecking] = useState(false);
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  function loadHistory() {
    getBankTransfers().then((d) => setHistory(d.transfers)).catch(() => setHistory([]));
  }

  useEffect(() => {
    getBankTransferConfig()
      .then((c) => {
        setConfig(c);
        if (c.available) {
          getBanks().then((d) => setBanks(d.banks)).catch((err) => setError(err.message));
          loadHistory();
        }
      })
      .catch(() => setConfig({ available: false }));
  }, []);

  // Look up the account name as soon as a bank and 10 digits are in.
  useEffect(() => {
    setAccount(null);
    if (!bank || accountNumber.length !== 10) return;
    let cancelled = false;
    setChecking(true);
    setError('');
    lookupBankAccount(bank.code, accountNumber)
      .then((a) => !cancelled && setAccount(a))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [bank, accountNumber]);

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    return (q ? banks.filter((b) => b.name.toLowerCase().includes(q)) : banks).slice(0, 60);
  }, [banks, bankQuery]);

  // Up to 4 recent different recipients as quick picks.
  const recents = useMemo(() => {
    const seen = new Set();
    return (history || []).filter((t) => {
      const k = `${t.bankCode}-${t.accountNumber}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 4);
  }, [history]);

  if (config === null) return <div className="card" style={{ margin: '0 16px 90px' }}><p className="empty-state">Loading…</p></div>;
  if (!config.available) {
    return (
      <div className="card" style={{ margin: '0 16px 90px', textAlign: 'center' }}>
        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>
          Sending to other banks is coming soon. For now, you can send money instantly to any ZappiPay user.
        </p>
      </div>
    );
  }

  const amt = Number(amount || 0);
  const total = amt + Number(config.fee || 0);

  function pickRecent(t) {
    const b = banks.find((x) => x.code === t.bankCode) || { code: t.bankCode, name: t.bankName || t.bankCode };
    setBank(b);
    setBankQuery('');
    setAccountNumber(t.accountNumber);
    setError('');
    setSuccess('');
  }

  function review(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!account) return setError('Enter a valid account number first.');
    if (!(amt > 0)) return setError('Enter an amount to send.');
    if (config.min && amt < config.min) return setError(`The minimum transfer is ${money(config.min)}.`);
    if (config.max && amt > config.max) return setError(`The maximum per transfer is ${money(config.max)}.`);
    setConfirmOpen(true);
  }

  async function doSend(auth) {
    const res = await sendBankTransfer({ bankCode: bank.code, accountNumber, amount: amt, narration: narration.trim() || undefined, ...auth });
    setConfirmOpen(false);
    setSuccess(
      res.transfer.status === 'SUCCESS'
        ? `${money(amt)} sent to ${account.accountName}.`
        : `${money(amt)} to ${account.accountName} is processing. You'll get a notification when it lands — if it fails, your money comes straight back.`
    );
    setAmount('');
    setNarration('');
    setAccountNumber('');
    setAccount(null);
    loadHistory();
    onDone?.();
  }

  const box = { background: 'rgba(134,59,255,0.1)', border: '1px solid var(--purple, var(--orange))', borderRadius: 10, padding: 12, marginBottom: 16 };

  return (
    <>
      {error && <p className="error-text" style={{ margin: '0 16px 12px' }}>{error}</p>}
      {success && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 16px 12px' }}>{success}</p>}

      <form className="card" style={{ margin: '0 16px 16px' }} onSubmit={review}>
        {recents.length > 0 && !bank && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 6 }}>Recent</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {recents.map((t) => (
                <button key={t.id} type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 12, textAlign: 'left' }} onClick={() => pickRecent(t)}>
                  {t.accountName.split(' ').slice(0, 2).join(' ')}
                  <br />
                  <span style={{ color: 'var(--slate-400)' }}>{t.bankName || t.bankCode} · {t.accountNumber.slice(-4)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="bankSearch">Bank</label>
          {bank && !pickingBank ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, fontWeight: 600 }}>{bank.name}</div>
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => setPickingBank(true)}>
                Change
              </button>
            </div>
          ) : (
            <>
              <input id="bankSearch" type="text" placeholder="Search bank, e.g. GTBank, Opay, Access" value={bankQuery} onChange={(e) => setBankQuery(e.target.value)} autoComplete="off" />
              <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 6, border: '1px solid var(--slate-700, rgba(255,255,255,0.1))', borderRadius: 8 }}>
                {banks.length === 0 ? (
                  <p className="empty-state" style={{ margin: 8 }}>Loading banks…</p>
                ) : filteredBanks.length === 0 ? (
                  <p className="empty-state" style={{ margin: 8 }}>No bank matches “{bankQuery}”.</p>
                ) : (
                  filteredBanks.map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => { setBank(b); setPickingBank(false); setBankQuery(''); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'inherit', cursor: 'pointer', fontSize: 14 }}
                    >
                      {b.name}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="field">
          <label htmlFor="acctNo">Account number</label>
          <input id="acctNo" inputMode="numeric" maxLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="10 digits" required />
        </div>

        {checking && <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -6 }}>Checking account…</p>}
        {account && (
          <div style={box}>
            <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>Account name</div>
            <div style={{ fontWeight: 700 }}>{account.accountName}</div>
          </div>
        )}

        <div className="field">
          <label htmlFor="bankAmount">Amount (₦)</label>
          <input id="bankAmount" type="number" min={config.min || 1} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <small style={{ color: 'var(--slate-400)' }}>
            {config.fee > 0 ? `Fee ${money(config.fee)} · ` : 'No fee · '}
            {config.min ? `min ${money(config.min)}` : ''}{config.max ? ` · max ${money(config.max)} per transfer` : ''}
          </small>
        </div>
        <div className="field">
          <label htmlFor="narration">Description (optional)</label>
          <input id="narration" type="text" maxLength={60} value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="What's this for?" />
        </div>
        {amt > 0 && (
          <p style={{ fontSize: 14, margin: '0 0 12px' }}>
            Total from wallet: <strong>{money(total)}</strong>
          </p>
        )}
        <button className="btn" type="submit" disabled={!account || checking}>
          Continue
        </button>
      </form>

      <div className="card" style={{ margin: '0 16px 90px' }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Recent bank transfers</h2>
        {history === null ? (
          <p className="empty-state">Loading…</p>
        ) : history.length === 0 ? (
          <p className="empty-state">No bank transfers yet.</p>
        ) : (
          <>
            {history.slice(0, shown).map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.accountName}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{t.bankName || t.bankCode} · {t.accountNumber} · {new Date(t.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700 }}>{money(t.amount)}</div>
                  <div style={{ fontSize: 12, color: STATUS_COLOR[t.status] || 'var(--slate-400)' }}>{STATUS_LABEL[t.status] || t.status}</div>
                </div>
              </div>
            ))}
            <ShowMore total={history.length} shown={shown} setShown={setShown} />
          </>
        )}
      </div>

      <PinConfirm
        open={confirmOpen}
        summary={account ? `Send ${money(amt)} to ${account.accountName} (${bank?.name}). Total ${money(total)}.` : ''}
        onSubmit={doSend}
        onError={(err) => setError(err.message || 'Could not send the transfer.')}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
