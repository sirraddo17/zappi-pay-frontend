import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getReconciliation, downloadExport, getFundsGuard, setFundsGuard, isDemoMode, getComplianceSummary, saveComplianceThresholds, downloadCompliance } from '../../api';
import { useAppInfo } from '../../components/ServiceNotices';

const naira = (n) => (n === null || n === undefined ? '—' : `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const LAGOS = 60 * 60 * 1000;
const ymd = (d) => new Date(d.getTime() + LAGOS).toISOString().slice(0, 10);

function Row({ label, value, hint, strong, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--slate-700)' }}>
      <div>
        <div style={{ fontWeight: strong ? 700 : 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{hint}</div>}
      </div>
      <div style={{ fontWeight: strong ? 700 : 600, whiteSpace: 'nowrap', color }}>{value}</div>
    </div>
  );
}

const EXPORTS = [
  ['orders', 'Purchases', 'Every airtime, data, bill and PIN purchase with what the customer paid and what VTpass charged.'],
  ['transactions', 'Wallet transactions', 'Every wallet credit and debit: funding, refunds, cashback, rewards, transfers.'],
  ['bank-transfers', 'Send to bank', 'Payouts to bank accounts with fees and status.'],
  ['customers', 'Customers', 'Customers who joined in the period, with wallet balances.'],
];

// Customer-funds guard (rules promised to Monnify): customer money stays
// ring-fenced, bank transfers pause if it isn't fully covered, and
// sending money needs BVN/NIN.
function FundsGuardCard() {
  const [g, setG] = useState(null);
  const [err, setErr] = useState('');
  const demo = isDemoMode();
  const appInfo = useAppInfo();
  const sendToBankOn = Boolean(appInfo?.bankTransfer);
  const load = () => getFundsGuard().then(setG).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  if (err) return <p className="error-text" style={{ margin: '0 0 12px' }}>{err}</p>;
  if (!g) return null;
  const ok = g.status === 'OK';
  return (
    <div id="funds-guard" className="card" style={{ margin: '0 0 16px', border: `1px solid ${!g.enabled || demo ? 'var(--slate-700, #334155)' : ok ? 'var(--green-500)' : 'var(--red-500)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>🛡️ Customer-funds guard</h2>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
          <input type="checkbox" checked={g.enabled} style={{ width: 'auto' }} onChange={(e) => { if (!e.target.checked && !window.confirm('Turn off the guard? Bank transfers will no longer pause when customer money isn’t covered, and unverified customers could send money. Only do this for an emergency fix.')) return; setFundsGuard(e.target.checked).then(setG).catch((x) => setErr(x.message)); }} />
          On
        </label>
      </div>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 10px' }}>Your Monnify wallet alone must always hold at least everything customers are owed — fund VTpass from your own money (it isn’t counted). Only what’s above customer balances in Monnify is yours to move out (it includes what you’ve already spent on VTpass for customers’ purchases, plus profit). If Monnify ever falls short, bank transfers pause by themselves and you’re alerted. Sending money needs BVN/NIN, with daily limits by level.</p>
      {!g.enabled ? <div style={{ fontSize: 14, color: 'var(--gold)' }}>⚠️ The guard is OFF — switch it back on as soon as possible.</div> : (
        <>
          <Row label="Customers are owed (real customers)" value={naira(g.owed)} hint={`Wallets, cashback, savings and transfers on their way.${g.testAccountsNotCounted > 0 ? ` ${naira(g.testAccountsNotCounted)} in accounts marked “Test account” isn’t counted (sandbox money).` : ''} Only LIVE partner wallets count as money held — sandbox balances never do.`} />
          {/* Demo / screenshot mode: sandbox balances and the "Short by" line are left out (they are test money, not real). */}
          {!demo && <Row label="Monnify wallet" value={g.monnify === null ? '—' : naira(g.monnify)} hint="VTpass isn’t counted — it’s funded from your own money" />}
          {!demo && <Row label="Customer money covered by Monnify" value={ok ? '✅ Yes' : g.status === 'SHORT' ? `❌ Short by ${naira(g.shortBy)}` : '⚠️ Couldn’t read Monnify'} />}
          <Row
            label="Bank transfers (guard)"
            value={g.transfersPaused ? '⏸️ Paused to protect customers' : '▶️ Not paused'}
            hint={g.transfersPaused ? 'Payouts are held until customer money is covered again.' : sendToBankOn ? 'The guard is not blocking payouts.' : 'The guard is not blocking anything. Send to Bank is off for customers, so no payouts go out anyway.'}
          />
          {!demo && <Row label="Free in Monnify wallet" value={g.monnifyFree === null ? '—' : naira(g.monnifyFree)} hint="Monnify balance minus transfers on their way out" />}
          {!demo && <Row label="Yours to move out of Monnify" value={<b style={{ color: 'var(--green-500)' }}>{naira(g.safeToWithdraw)}</b>} hint="To your bank or to top up VTpass — never move more than this" />}
          {g.errors?.length > 0 && <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 6 }}>{g.errors.join(' · ')}</div>}
        </>
      )}
    </div>
  );
}

// Owner: monthly compliance summary (SCUML / NFIU, partner due diligence).
// A draft to review — nothing is filed or sent. Test orders and test
// accounts are kept out of the real figures.
const lastMonth = () => { const d = new Date(Date.now() + LAGOS); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); };
const k2n = (k) => naira((k || 0) / 100);
function ComplianceCard() {
  const [month, setMonth] = useState(lastMonth);
  const [s, setS] = useState(null);
  const [single, setSingle] = useState('');
  const [daily, setDaily] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    setS(null); setErr('');
    getComplianceSummary(month).then((r) => { setS(r); setSingle(String(r.thresholds.singleFundingKobo / 100)); setDaily(String(r.thresholds.dailyFundingKobo / 100)); }).catch((e) => setErr(e.message));
  }, [month]);
  async function save() {
    setBusy('save'); setErr(''); setMsg('');
    try { await saveComplianceThresholds(Number(single), Number(daily)); setMsg('Saved.'); setS(await getComplianceSummary(month)); } catch (e) { setErr(e.message); } finally { setBusy(''); }
  }
  async function download() {
    setBusy('dl'); setErr('');
    try { await downloadCompliance(month); } catch (e) { setErr(e.message); } finally { setBusy(''); }
  }
  return (
    <div id="compliance" className="card" style={{ maxWidth: 720, margin: '0 0 16px' }}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>🧾 Compliance summary (SCUML / NFIU, partner due diligence)</h2>
      <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '0 0 10px' }}>A draft for you to review — ZAPPI PAY doesn’t file or send any report. Test orders and test accounts are kept out of the real figures. Ask the AI Assistant “compliance summary for last month” for a written version.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
        <div className="field" style={{ margin: 0, flex: '1 1 150px' }}>
          <label htmlFor="cs-month">Month</label>
          <input id="cs-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={Boolean(busy) || !s} onClick={download}>{busy === 'dl' ? 'Preparing…' : 'Download CSV'}</button>
      </div>
      {err && <p className="error-text" style={{ margin: '0 0 8px' }}>{err}</p>}
      {!s && !err && <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>Loading…</p>}
      {s && (
        <>
          <Row label="Funding inflows (real)" value={k2n(s.real.fundingInflows.totalKobo)} hint={`${s.real.fundingInflows.count} payments`} />
          <Row label="Purchases (real)" value={k2n(s.real.purchases.totalKobo)} hint={`${s.real.purchases.count} successful`} />
          <Row label="Refunds (real)" value={k2n(s.real.refunds.totalKobo)} hint={`${s.real.refunds.count} refunds`} />
          <Row label="Large fundings" value={`${s.largeSingleFunding.count} single · ${s.largeDailyFunding.count} daily`} hint="At or above the thresholds below" />
          <Row label="Freezes · risk flags · scam reports" value={`${s.accountsFrozen.byStaff} · ${s.riskFlags.raised} · ${s.scamReports.count}`} />
          <Row label="Same BVN/NIN refused · unmatched still open" value={`${s.duplicateIdBlocked.attempts} · ${s.unmatchedPayments.stillOpenNow.count}`} />
          <Row label="Test (kept apart)" value={k2n(s.test.fundingInflows.totalKobo)} hint={`funding from ${s.test.testAccounts} test accounts; ${s.test.purchases.count} test purchases`} color="var(--slate-400)" />
        </>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12 }}>
        <div className="field" style={{ margin: 0, flex: '1 1 160px' }}>
          <label htmlFor="cs-single">Single funding at or above (₦)</label>
          <input id="cs-single" type="number" min="1000" value={single} onChange={(e) => setSingle(e.target.value)} />
        </div>
        <div className="field" style={{ margin: 0, flex: '1 1 160px' }}>
          <label htmlFor="cs-daily">Funding in one day at or above (₦)</label>
          <input id="cs-daily" type="number" min="1000" value={daily} onChange={(e) => setDaily(e.target.value)} />
        </div>
        <button type="button" className="btn" style={{ width: 'auto' }} disabled={Boolean(busy)} onClick={save}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
      </div>
      {msg && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '6px 0 0' }}>{msg}</p>}
    </div>
  );
}

export default function AdminMoney() {
  const [data, setData] = useState(null);
  const [other, setOther] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const now = new Date();
  const [from, setFrom] = useState(`${ymd(now).slice(0, 8)}01`);
  const [to, setTo] = useState(ymd(now));
  const [dl, setDl] = useState('');
  const [dlErr, setDlErr] = useState('');

  function load() {
    setBusy(true);
    setErr('');
    getReconciliation(Number(other) || 0).then(setData).catch((e) => setErr(e.message)).finally(() => setBusy(false));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function exportCsv(kind) {
    setDl(kind);
    setDlErr('');
    try {
      await downloadExport(kind, from, to);
    } catch (e) {
      setDlErr(e.message);
    } finally {
      setDl('');
    }
  }

  // Test accounts (sandbox money only) are left out of the owed side when
  // the server sends that view, so test money never looks like a shortfall.
  const real = data?.real || null;
  const st = real ? real.status : data?.status;
  const diff = real ? real.difference : data?.difference;
  const demo = isDemoMode();
  const sandbox = (k) => Boolean(data?.have?.modes && data.have.modes[k] !== 'live');
  const banner = demo && st !== 'OK'
    ? { bg: 'rgba(255,184,48,0.08)', border: 'var(--slate-700, #334155)', text: 'Test mode: payment partners are on sandbox (test money), so their balances are not shown here.' }
    : st === 'OK'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'var(--green-500)', text: `✅ Covered. You have ${naira(diff)} more than you owe customers — that's your earnings and float.` }
    : st === 'SHORT'
      ? { bg: 'rgba(239,68,68,0.12)', border: 'var(--red-500)', text: `⚠️ Short by ${naira(-diff)}. Your VTpass + Monnify money is less than what customers have in their wallets. Top up, or check for money held elsewhere (add it below).` }
      : { bg: 'rgba(255,184,48,0.12)', border: 'var(--gold)', text: '⚠️ Couldn’t read every balance, so this check isn’t complete — see the errors below.' };

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Money check</h1>
        <p>Compares what you owe customers with the money you actually hold. Check it daily, like banks do. Figures are live.</p>
      </div>

      {err && <p className="error-text" style={{ margin: '0 0 12px' }}>{err}</p>}
      {data && (
        <div style={{ maxWidth: 720 }}>
          <div className="card" style={{ margin: '0 0 16px', background: banner.bg, border: `1px solid ${banner.border}`, fontSize: 14 }}>{banner.text}</div>
          <FundsGuardCard />

          <div id="owed" className="card" style={{ margin: '0 0 16px' }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>What you owe customers</h2>
            {((real && real.parts) || data.owed.parts || [
              { key: 'wallets', label: 'Customer wallets', amount: data.owed.wallets },
              { key: 'cashback', label: 'Unexpired cashback (spendable on purchases)', amount: data.owed.cashback || 0 },
              { key: 'savings', label: 'Customer savings', amount: data.owed.savings || 0 },
              { key: 'pendingTransfers', label: 'Bank transfers not yet paid out', amount: data.owed.pendingTransfers },
              { key: 'heldForDisputes', label: 'Held for wrong-transfer reports', amount: data.owed.heldForDisputes || 0 },
            ]).map((p) => (
              <Row key={p.key} label={p.label} value={naira(p.amount)} hint={p.key === 'wallets' ? `${(real ? real.customers : data.owed.customers).toLocaleString()} customers` : p.key === 'pendingTransfers' ? `${data.owed.pendingTransferCount} waiting (held, OTP or processing) — already taken from wallets` : p.key === 'cashback' ? 'Not cash — can only pay part of a purchase' : undefined} />
            ))}
            {real && real.testAccounts.count > 0 && (
              <Row label="Test accounts (sandbox money) — not counted" value={naira(real.testAccounts.total)} hint={`${real.testAccounts.count} account${real.testAccounts.count === 1 ? '' : 's'} marked “Test account” on the customer page`} color="var(--slate-400)" />
            )}
            <Row label={real ? 'Total owed (real customers)' : 'Total owed'} value={naira(real ? real.owed : data.owed.total)} strong />
          </div>

          <div id="held" className="card" style={{ margin: '0 0 16px' }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Money you hold</h2>
            <Row label="VTpass wallet" value={data.have.vtpass === null ? 'Unavailable' : naira(data.have.vtpass)} hint={`${data.have.vtpassError || 'Pays for every purchase'}${data.have.modes && data.have.modes.vtpass !== 'live' ? ' · SANDBOX (test money) — not counted' : ''}`} color={data.have.vtpass === null ? 'var(--gold)' : undefined} />
            {!(demo && sandbox('monnify')) && <Row label="Monnify wallet" value={data.have.monnify === null ? 'Unavailable' : naira(data.have.monnify)} hint={`${data.have.monnifyError || 'Receives funding, pays out bank transfers'}${data.have.modes && data.have.modes.monnify !== 'live' ? ' · SANDBOX (test money) — not counted' : ''}`} color={data.have.monnify === null ? 'var(--gold)' : undefined} />}
            {!(demo && sandbox('squad')) && (data.have.squad !== undefined && (data.have.squad !== null || data.have.squadError)) && (
              <Row label="Squad wallet" value={data.have.squad === null ? 'Unavailable' : naira(data.have.squad)} hint={`${data.have.squadError || 'GTBank account-number payments; pays out bank transfers when Squad is chosen'}${data.have.modes && data.have.modes.squad !== 'live' ? ' · SANDBOX (test money) — not counted' : ''}`} color={data.have.squad === null ? 'var(--gold)' : undefined} />
            )}
            {!(demo && sandbox('nomba')) && (data.have.nomba !== undefined && (data.have.nomba !== null || data.have.nombaError)) && (
              <Row label="Nomba wallet" value={data.have.nomba === null ? 'Unavailable' : naira(data.have.nomba)} hint={`${data.have.nombaError || 'Nombank account-number payments; pays out bank transfers when Nomba is chosen'}${data.have.modes && data.have.modes.nomba !== 'live' ? ' · SANDBOX (test money) — not counted' : ''}`} color={data.have.nomba === null ? 'var(--gold)' : undefined} />
            )}
            <Row label="Other money (you typed)" value={naira(data.have.other)} hint="e.g. business bank account where manual funding lands" />
            <Row label="Total held" value={naira(data.have.total)} strong hint={data.have.sandboxNote || undefined} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="field" style={{ margin: 0, flex: '1 1 200px' }}>
                <label htmlFor="mc-other">Money in your business bank account (₦, optional)</label>
                <input id="mc-other" type="number" min="0" value={other} onChange={(e) => setOther(e.target.value)} placeholder="0" />
              </div>
              <button type="button" className="btn" style={{ width: 'auto' }} disabled={busy} onClick={load}>{busy ? 'Checking…' : 'Check again'}</button>
            </div>
          </div>

          {!demo && <div className="card" style={{ margin: '0 0 16px' }}>
            <Row label="Difference (held − owed)" value={naira(diff)} strong color={diff >= 0 ? 'var(--green-500)' : 'var(--red-500)'} />
            <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 8 }}>
              Also good to know: {data.info.pendingOrderCount} purchase(s) still pending with VTpass ({naira(data.info.pendingOrders)}), {data.info.pendingFundingCount} manual funding request(s) waiting ({naira(data.info.pendingFunding)}).
              {data.info.negativeWallets > 0 && <b style={{ color: 'var(--red-500)' }}> {data.info.negativeWallets} wallet(s) are below ₦0 — look into these.</b>}
              {' '}Monnify can take up to a day to settle new funding into your wallet, so a small gap right after busy periods is normal.
            </div>
          </div>}
        </div>
      )}
      {!data && !err && <p className="empty-state">Checking balances…</p>}

      {!isDemoMode() && <ComplianceCard />}

      <div id="exports" className="card" style={{ maxWidth: 720, margin: '0 0 16px' }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>📥 Download for your accountant (Excel / CSV)</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <div className="field" style={{ margin: 0, flex: '1 1 150px' }}>
            <label htmlFor="ex-from">From</label>
            <input id="ex-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0, flex: '1 1 150px' }}>
            <label htmlFor="ex-to">To</label>
            <input id="ex-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {dlErr && <p className="error-text" style={{ margin: '0 0 8px' }}>{dlErr}</p>}
        <div style={{ display: 'grid', gap: 8 }}>
          {EXPORTS.map(([kind, label, hint]) => (
            <div key={kind} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--slate-700)', paddingBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{hint}</div>
              </div>
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', whiteSpace: 'nowrap' }} disabled={Boolean(dl)} onClick={() => exportCsv(kind)}>{dl === kind ? 'Preparing…' : 'Download'}</button>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>Opens in Excel or Google Sheets. Times are Nigerian time. Up to 20,000 rows per file — use a shorter date range if you have more.</p>
      </div>
    </AdminLayout>
  );
}
