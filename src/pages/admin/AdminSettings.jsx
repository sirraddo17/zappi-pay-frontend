import { useEffect, useState } from 'react';
import PasswordField from '../../components/PasswordField';
import AdminLayout from '../../components/AdminLayout';
import AiSettingsPanel from '../../components/AiSettingsPanel';
import VoiceSettingsPanel from '../../components/admin/VoiceSettingsPanel';
import HeygenSettingsPanel from '../../components/admin/HeygenSettingsPanel';
import OpenAiExtrasPanel from '../../components/admin/OpenAiExtrasPanel';
import BackupCodesPanel from '../../components/admin/BackupCodesPanel';
import IntlAirtimeToggle from '../../components/admin/IntlAirtimeToggle';
import VtpassSelfTest from '../../components/admin/VtpassSelfTest';
import ReceiptInvitePanel from '../../components/admin/ReceiptInvitePanel';
import EpinSettingsPanel from '../../components/admin/EpinSettingsPanel';
import FundingAccountsPanel from '../../components/admin/FundingAccountsPanel';
import RewardGuardPanel from '../../components/admin/RewardGuardPanel';
import SavingsPanel from '../../components/admin/SavingsPanel';
import MaintenancePanel from '../../components/admin/MaintenancePanel';
import DeliveryPromisePanel from '../../components/admin/DeliveryPromisePanel';
import ShopsPanel from '../../components/admin/ShopsPanel';
import RewardSplitPanel from '../../components/admin/RewardSplitPanel';
import { getSettings, updateSettings, changeAdminPassword, testMonnifyConnection, getMonnifyOverview, resetMonnifyAccounts, sendTestDailySummary } from '../../api';

const SERVICES = ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION', 'INTERNET', 'BETTING', 'INTERNATIONAL', 'INSURANCE'];

// Each tab is its own form with its own Save button, and only sends
// the fields that belong to it — PATCH /admin/settings already
// accepts partial updates, so saving discounts can never overwrite
// the VTpass keys (or vice versa) with stale values from another tab.
const TABS = [
  { key: 'maintenance', label: '🛠️ Maintenance & alerts' },
  { key: 'split', label: '🎁 Rewards split' },
  { key: 'vtpass', label: 'VTpass' },
  { key: 'monnify', label: 'Monnify' },
  { key: 'markup', label: 'Markup' },
  { key: 'discount', label: 'Discounts' },
  { key: 'limits', label: 'Limits' },
  { key: 'airtimeCash', label: 'Airtime to Cash' },
  { key: 'referral', label: 'Referrals' },
  { key: 'cashback', label: 'Cashback' },
  { key: 'promise', label: '⚡ Delivery promise' },
  { key: 'shops', label: '🏪 Agent shops' },
  { key: 'epins', label: '🖨️ ClubKonnect' },
  { key: 'agents', label: 'Agents' },
  { key: 'loyalty', label: 'Loyalty Points' },
  { key: 'savings', label: 'Savings (interest)' },
  { key: 'alerts', label: 'Alerts & Limits' },
  { key: 'security', label: 'Security' },
  { key: 'ai', label: 'AI Assistant' },
  { key: 'password', label: 'My Password' },
];

const A2C_NETWORKS = [
  { key: 'mtn', label: 'MTN' },
  { key: 'glo', label: 'Glo' },
  { key: 'airtel', label: 'Airtel' },
  { key: 'etisalat', label: '9mobile' },
];

function serviceLabel(s) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function toServiceMap(stored) {
  return Object.fromEntries(SERVICES.map((svc) => [svc, String(stored?.[svc] ?? 0)]));
}

function toNumberMap(values) {
  return Object.fromEntries(SERVICES.map((svc) => [svc, Number(values[svc] || 0)]));
}

function Status({ state }) {
  if (state?.error) return <p className="error-text" style={{ margin: '0 0 12px' }}>{state.error}</p>;
  if (state?.success) return <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 12px' }}>{state.success}</p>;
  return null;
}

function SectionHeader({ title, hint }) {
  return (
    <>
      <h2 style={{ marginTop: 0, fontSize: 16, marginBottom: 4 }}>{title}</h2>
      {hint && <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0, marginBottom: 12 }}>{hint}</p>}
    </>
  );
}

export default function AdminSettings() {
  const [tab, setTab] = useState('vtpass');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [vtpassMode, setVtpassMode] = useState('sandbox');
  const [vtpassApiKey, setVtpassApiKey] = useState('');
  const [vtpassSecretKey, setVtpassSecretKey] = useState('');
  const [vtpassPublicKey, setVtpassPublicKey] = useState('');
  const [markupByService, setMarkupByService] = useState(toServiceMap({}));
  const [markupCapByService, setMarkupCapByService] = useState({});
  const [discountByService, setDiscountByService] = useState(toServiceMap({}));
  const [monnifyMode, setMonnifyMode] = useState('sandbox');
  const [monnifyApiKey, setMonnifyApiKey] = useState('');
  const [monnifySecretKey, setMonnifySecretKey] = useState('');
  const [monnifyContractCode, setMonnifyContractCode] = useState('');
  const [monnifyTest, setMonnifyTest] = useState(null);
  const [resetText, setResetText] = useState('');
  const [resetState, setResetState] = useState(null);
  const [accountsCount, setAccountsCount] = useState(null);
  const [walletAccount, setWalletAccount] = useState('');
  const [btEnabled, setBtEnabled] = useState(false);
  const [btFee, setBtFee] = useState('0');
  const [btFeeMid, setBtFeeMid] = useState('');
  const [btFeeHigh, setBtFeeHigh] = useState('');
  const [btMin, setBtMin] = useState('100');
  const [btMax, setBtMax] = useState('50000');
  const [btDaily, setBtDaily] = useState('200000');
  const [minFundingAmount, setMinFundingAmount] = useState('100');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('50');
  const [bankFeePercent, setBankFeePercent] = useState('0');
  const [bankFeeCap, setBankFeeCap] = useState('0');

  const [a2cEnabled, setA2cEnabled] = useState(false);
  const [a2cFee, setA2cFee] = useState('20');
  const [a2cMin, setA2cMin] = useState('500');
  const [a2cNumbers, setA2cNumbers] = useState({});

  const [loyOn, setLoyOn] = useState(false);
  const [loyPer100, setLoyPer100] = useState('1');
  const [loyValue, setLoyValue] = useState('0.5');
  const [loyMin, setLoyMin] = useState('200');
  const [fraudOn, setFraudOn] = useState(true);
  const [fraudAmount, setFraudAmount] = useState('20000');
  const [fraudHours, setFraudHours] = useState('24');
  const [twoFactor, setTwoFactor] = useState(false);
  const [idMatch, setIdMatch] = useState(false);
  const [attackOn, setAttackOn] = useState(true);
  const [summaryOn, setSummaryOn] = useState(false);
  const [summaryTest, setSummaryTest] = useState(null);
  const [agentOn, setAgentOn] = useState(false);
  const [agentByService, setAgentByService] = useState(toServiceMap({}));
  const [cbEnabled, setCbEnabled] = useState(false);
  const [splitOn, setSplitOn] = useState(false);
  const [cbByService, setCbByService] = useState(toServiceMap({}));
  const [cbMax, setCbMax] = useState('500');
  const [alertsOn, setAlertsOn] = useState(false);
  const [adminPushOn, setAdminPushOn] = useState(true);
  const [adminEmailOn, setAdminEmailOn] = useState(true);
  const [feedbackOn, setFeedbackOn] = useState(true);
  const [spotterOn, setSpotterOn] = useState(true);
  const [monthlyOn, setMonthlyOn] = useState(true);
  const [agentWeeklyOn, setAgentWeeklyOn] = useState(true);
  const [limitsOn, setLimitsOn] = useState(false);
  const [limitUnverified, setLimitUnverified] = useState('50000');
  const [limitVerified, setLimitVerified] = useState('1000000');
  const [whatsapp, setWhatsapp] = useState('');
  const [manualOn, setManualOn] = useState(true);
  const [manualBank, setManualBank] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [manualName, setManualName] = useState('');
  const [refEnabled, setRefEnabled] = useState(false);
  const [refBonus, setRefBonus] = useState('100');
  const [refMin, setRefMin] = useState('500');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // One saving flag + status message per tab, so a success message on
  // one tab doesn't linger when you switch to another.
  const [saving, setSaving] = useState('');
  const [status, setStatus] = useState({});

  useEffect(() => {
    getSettings()
      .then((data) => {
        const s = data.settings;
        setVtpassMode(s.vtpassMode);
        setVtpassApiKey(s.vtpassApiKey || '');
        setVtpassSecretKey(s.vtpassSecretKey || '');
        setVtpassPublicKey(s.vtpassPublicKey || '');
        setMarkupByService(toServiceMap(s.markupPercentByService));
        setMarkupCapByService(Object.fromEntries(Object.entries(s.markupCapByService || {}).map(([k, v]) => [k, String(v)])));
        setDiscountByService(toServiceMap(s.discountPercentByService));
        setMonnifyMode(s.monnifyMode || 'sandbox');
        setMonnifyApiKey(s.monnifyApiKey || '');
        setMonnifySecretKey(s.monnifySecretKey || '');
        setMonnifyContractCode(s.monnifyContractCode || '');
        setWalletAccount(s.monnifyWalletAccount || '');
        setBtEnabled(Boolean(s.bankTransferEnabled));
        setBtFee(String(s.bankTransferFee ?? 0));
        setBtFeeMid(s.bankTransferFeeMid == null ? '' : String(s.bankTransferFeeMid));
        setBtFeeHigh(s.bankTransferFeeHigh == null ? '' : String(s.bankTransferFeeHigh));
        setBtMin(String(s.bankTransferMin ?? 100));
        setBtMax(String(s.bankTransferMax ?? 50000));
        setBtDaily(String(s.bankTransferDailyMax ?? 200000));
        setMinFundingAmount(String(s.minFundingAmount ?? 100));
        setMinPurchaseAmount(String(s.minPurchaseAmount ?? 50));
        setBankFeePercent(String(s.bankFundingFeePercent ?? 0));
        setBankFeeCap(String(s.bankFundingFeeCap ?? 0));
        setA2cEnabled(Boolean(s.airtimeToCashEnabled));
        setA2cFee(String(s.airtimeToCashFeePercent ?? 20));
        setA2cMin(String(s.airtimeToCashMinAmount ?? 500));
        setA2cNumbers(s.airtimeToCashNumbers || {});
        setLoyOn(Boolean(s.loyaltyEnabled));
        setLoyPer100(String(s.loyaltyPointsPer100 ?? 1));
        setLoyValue(String(s.loyaltyPointValue ?? 0.5));
        setLoyMin(String(s.loyaltyMinRedeem ?? 200));
        setFraudOn(s.fraudHoldEnabled !== false);
        setFraudAmount(String(s.fraudHoldAmount ?? 20000));
        setFraudHours(String(s.fraudHoldHours ?? 24));
        setTwoFactor(Boolean(s.adminTwoFactorEnabled));
        setIdMatch(Boolean(s.idMatchEnabled));
        setAttackOn(s.attackWatchEnabled !== false);
        setSummaryOn(Boolean(s.dailySummaryEnabled));
        setAgentOn(Boolean(s.agentPricingEnabled));
        setAgentByService(toServiceMap(s.agentDiscountPercentByService));
        setCbEnabled(Boolean(s.cashbackEnabled));
        setSplitOn(Boolean(s.rewardSplitEnabled));
        setCbByService(toServiceMap(s.cashbackPercentByService));
        setCbMax(String(s.cashbackMaxPerOrder ?? 500));
        setAlertsOn(Boolean(s.emailAlertsEnabled));
        setAdminPushOn(s.adminAlertPush !== false);
        setAdminEmailOn(s.adminAlertEmail !== false);
        setFeedbackOn(s.feedbackPromptEnabled !== false);
        setSpotterOn(s.problemSpotterEnabled !== false);
        setMonthlyOn(s.monthlySummaryEnabled !== false);
        setAgentWeeklyOn(s.agentWeeklyEnabled !== false);
        setLimitsOn(Boolean(s.kycLimitsEnabled));
        setLimitUnverified(String(s.dailyLimitUnverified ?? 50000));
        setLimitVerified(String(s.dailyLimitVerified ?? 1000000));
        setWhatsapp(s.supportWhatsapp || '');
        setManualOn(s.manualFundingEnabled !== false);
        setManualBank(s.manualBankName || '');
        setManualNumber(s.manualAccountNumber || '');
        setManualName(s.manualAccountName || '');
        setRefEnabled(Boolean(s.referralEnabled));
        setRefBonus(String(s.referralBonusAmount ?? 100));
        setRefMin(String(s.referralMinPurchase ?? 500));
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function save(key, payload, successText) {
    setStatus((prev) => ({ ...prev, [key]: null }));
    setSaving(key);
    try {
      await updateSettings(payload);
      setStatus((prev) => ({ ...prev, [key]: { success: successText } }));
    } catch (err) {
      setStatus((prev) => ({ ...prev, [key]: { error: err.message || 'Could not save.' } }));
    } finally {
      setSaving('');
    }
  }

  function saveVtpass(e) {
    e.preventDefault();
    save('vtpass', { vtpassMode, vtpassApiKey, vtpassSecretKey, vtpassPublicKey }, 'VTpass settings saved.');
  }

  function saveMonnify(e) {
    e.preventDefault();
    setMonnifyTest(null);
    save('monnify', { monnifyMode, monnifyApiKey, monnifySecretKey, monnifyContractCode }, 'Monnify settings saved. Tap "Test connection" to check them.');
  }

  useEffect(() => {
    if (tab === 'monnify') getMonnifyOverview().then((o) => setAccountsCount(o.accountsCount ?? 0)).catch(() => {});
  }, [tab]);

  async function runReset() {
    setResetState({ running: true });
    try {
      const r = await resetMonnifyAccounts();
      setResetState({ success: `Cleared ${r.cleared} customer account number${r.cleared === 1 ? '' : 's'}. Customers will get new ones the next time they open Wallet.` });
      setResetText('');
      setAccountsCount(0);
    } catch (err) {
      setResetState({ error: err.message });
    }
  }

  function saveBankTransfers(e) {
    e.preventDefault();
    if (btEnabled && !walletAccount.trim()) {
      setStatus((prev) => ({ ...prev, bankTransfers: { error: 'Enter your Monnify wallet account number before turning this on.' } }));
      return;
    }
    save(
      'bankTransfers',
      {
        monnifyWalletAccount: walletAccount,
        bankTransferEnabled: btEnabled,
        bankTransferFee: Number(btFee || 0),
        bankTransferFeeMid: btFeeMid === '' ? null : Number(btFeeMid),
        bankTransferFeeHigh: btFeeHigh === '' ? null : Number(btFeeHigh),
        bankTransferMin: Number(btMin || 0),
        bankTransferMax: Number(btMax || 0),
        bankTransferDailyMax: Number(btDaily || 0),
      },
      btEnabled ? 'Saved — customers can now send to banks.' : 'Saved. Send to Bank is off for customers.'
    );
  }

  async function runMonnifyTest() {
    setMonnifyTest({ running: true });
    try {
      setMonnifyTest(await testMonnifyConnection());
    } catch (err) {
      setMonnifyTest({ ok: false, error: err.message });
    }
  }

  function saveMarkup(e) {
    e.preventDefault();
    const caps = Object.fromEntries(Object.entries(markupCapByService).map(([k, v]) => [k, Number(v || 0)]).filter(([, v]) => v > 0));
    save('markup', { markupPercentByService: toNumberMap(markupByService), markupCapByService: caps }, 'Markup saved.');
  }

  function saveDiscount(e) {
    e.preventDefault();
    const bad = SERVICES.find((svc) => {
      const n = Number(discountByService[svc] || 0);
      return !Number.isFinite(n) || n < 0 || n > 100;
    });
    if (bad) {
      setStatus((prev) => ({ ...prev, discount: { error: `Discount for ${serviceLabel(bad)} must be between 0 and 100.` } }));
      return;
    }
    save('discount', { discountPercentByService: toNumberMap(discountByService) }, 'Discounts saved — live for customers now.');
  }

  function saveLimits(e) {
    e.preventDefault();
    save(
      'limits',
      {
        minFundingAmount: Number(minFundingAmount || 0),
        minPurchaseAmount: Number(minPurchaseAmount || 0),
        bankFundingFeePercent: Number(bankFeePercent || 0),
        bankFundingFeeCap: Number(bankFeeCap || 0),
      },
      'Limits saved.'
    );
  }

  function saveAirtimeCash(e) {
    e.preventDefault();
    const fee = Number(a2cFee || 0);
    if (!Number.isFinite(fee) || fee < 0 || fee >= 100) {
      setStatus((prev) => ({ ...prev, airtimeCash: { error: 'Fee must be at least 0 and below 100.' } }));
      return;
    }
    const hasNumber = A2C_NETWORKS.some((n) => String(a2cNumbers[n.key] || '').trim());
    if (a2cEnabled && !hasNumber) {
      setStatus((prev) => ({ ...prev, airtimeCash: { error: 'Add at least one receiving number before turning this on.' } }));
      return;
    }
    save(
      'airtimeCash',
      {
        airtimeToCashEnabled: a2cEnabled,
        airtimeToCashFeePercent: fee,
        airtimeToCashMinAmount: Number(a2cMin || 0),
        airtimeToCashNumbers: Object.fromEntries(A2C_NETWORKS.map((n) => [n.key, String(a2cNumbers[n.key] || '').trim()])),
      },
      'Airtime to Cash settings saved.'
    );
  }

  function saveLoyalty(e) {
    e.preventDefault();
    save('loyalty', { loyaltyEnabled: loyOn, loyaltyPointsPer100: Number(loyPer100 || 0), loyaltyPointValue: Number(loyValue || 0), loyaltyMinRedeem: Number(loyMin || 1) }, 'Loyalty settings saved.');
  }

  function saveSecurity(e) {
    e.preventDefault();
    save(
      'security',
      {
        fraudHoldEnabled: fraudOn,
        fraudHoldAmount: Number(fraudAmount || 0),
        fraudHoldHours: Number(fraudHours || 24),
        adminTwoFactorEnabled: twoFactor,
        idMatchEnabled: idMatch,
        attackWatchEnabled: attackOn,
        dailySummaryEnabled: summaryOn,
      },
      'Security settings saved.'
    );
  }

  async function runSummaryTest() {
    setSummaryTest({ running: true });
    try {
      const r = await sendTestDailySummary();
      setSummaryTest({ ok: r.sent > 0, text: r.sent > 0 ? `Sent to ${r.sent} admin email${r.sent === 1 ? '' : 's'}.` : 'No email was sent — check your Resend setup.' });
    } catch (err) {
      setSummaryTest({ ok: false, text: err.message });
    }
  }

  function saveAgents(e) {
    e.preventDefault();
    const bad = SERVICES.find((svc) => { const n = Number(agentByService[svc] || 0); return !Number.isFinite(n) || n < 0 || n > 50; });
    if (bad) {
      setStatus((prev) => ({ ...prev, agents: { error: `Agent discount for ${serviceLabel(bad)} must be between 0 and 50%.` } }));
      return;
    }
    save('agents', { agentPricingEnabled: agentOn, agentDiscountPercentByService: toNumberMap(agentByService) }, 'Agent pricing saved.');
  }

  function saveCashback(e) {
    e.preventDefault();
    const bad = SERVICES.find((svc) => { const n = Number(cbByService[svc] || 0); return !Number.isFinite(n) || n < 0 || n > 20; });
    if (bad) {
      setStatus((prev) => ({ ...prev, cashback: { error: `Cashback for ${serviceLabel(bad)} must be between 0 and 20%.` } }));
      return;
    }
    save('cashback', { cashbackEnabled: cbEnabled, cashbackPercentByService: toNumberMap(cbByService), cashbackMaxPerOrder: Number(cbMax || 0) }, 'Cashback settings saved.');
  }

  function saveAlerts(e) {
    e.preventDefault();
    save(
      'alerts',
      {
        emailAlertsEnabled: alertsOn,
        adminAlertPush: adminPushOn,
        adminAlertEmail: adminEmailOn,
        feedbackPromptEnabled: feedbackOn,
        problemSpotterEnabled: spotterOn,
        monthlySummaryEnabled: monthlyOn,
        agentWeeklyEnabled: agentWeeklyOn,
        kycLimitsEnabled: limitsOn,
        dailyLimitUnverified: Number(limitUnverified || 0),
        dailyLimitVerified: Number(limitVerified || 0),
        supportWhatsapp: whatsapp,
      },
      'Saved.'
    );
  }

  function saveReferral(e) {
    e.preventDefault();
    const bonus = Number(refBonus);
    const min = Number(refMin);
    if (!Number.isFinite(bonus) || bonus < 0 || !Number.isFinite(min) || min < 0) {
      setStatus((prev) => ({ ...prev, referral: { error: 'Amounts must be 0 or more.' } }));
      return;
    }
    if (refEnabled && bonus <= 0) {
      setStatus((prev) => ({ ...prev, referral: { error: 'Set a bonus above ₦0 before turning referrals on.' } }));
      return;
    }
    save('referral', { referralEnabled: refEnabled, referralBonusAmount: bonus, referralMinPurchase: min }, 'Referral settings saved.');
  }

  async function savePassword(e) {
    e.preventDefault();
    setStatus((prev) => ({ ...prev, password: null }));
    setSaving('password');
    try {
      await changeAdminPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setStatus((prev) => ({ ...prev, password: { success: 'Password changed.' } }));
    } catch (err) {
      setStatus((prev) => ({ ...prev, password: { error: err.message || 'Could not change password.' } }));
    } finally {
      setSaving('');
    }
  }

  function saveButton(key, label) {
    return (
      <button className="btn" type="submit" disabled={saving === key}>
        {saving === key ? 'Saving…' : label}
      </button>
    );
  }

  const cardStyle = { margin: 0, maxWidth: 480 };

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Settings</h1>
        <p>Pick a section — each one saves on its own</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={t.key === tab ? 'btn' : 'btn-secondary btn'}
            style={{ width: 'auto', padding: '6px 14px', fontSize: 13 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && tab !== 'password' && <p className="empty-state">Loading…</p>}
      {!loading && loadError && tab !== 'password' && (
        <p className="error-text" style={{ margin: '0 0 12px' }}>{loadError}</p>
      )}

      {!loading && !loadError && tab === 'vtpass' && (
        <form className="card" style={cardStyle} onSubmit={saveVtpass}>
          <SectionHeader title="VTpass Connection" hint="Mode and API keys used for every purchase." />
          <Status state={status.vtpass} />
          <div className="field">
            <label htmlFor="mode">VTpass mode</label>
            <select id="mode" value={vtpassMode} onChange={(e) => setVtpassMode(e.target.value)}>
              <option value="sandbox">Sandbox (test)</option>
              <option value="live">Live</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="apiKey">API key</label>
            <PasswordField id="apiKey" value={vtpassApiKey} onChange={(e) => setVtpassApiKey(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="secretKey">Secret key</label>
            <PasswordField id="secretKey" value={vtpassSecretKey} onChange={(e) => setVtpassSecretKey(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="publicKey">Public key</label>
            <PasswordField id="publicKey" value={vtpassPublicKey} onChange={(e) => setVtpassPublicKey(e.target.value)} />
          </div>
          {saveButton('vtpass', 'Save VTpass Settings')}
        </form>
      )}
      {!loading && !loadError && tab === 'vtpass' && <><VtpassSelfTest /><IntlAirtimeToggle /></>}

      {!loading && !loadError && tab === 'monnify' && (
        <form className="card" style={cardStyle} onSubmit={saveMonnify}>
          <SectionHeader
            title="Monnify Connection"
            hint="Keys for customers' personal account numbers (automatic bank-transfer funding). Copy them from Monnify → Developer → API Keys & Contracts. Save first, then Test connection."
          />
          <Status state={status.monnify} />
          <div className="field">
            <label htmlFor="monnifyMode">Monnify mode</label>
            <select id="monnifyMode" value={monnifyMode} onChange={(e) => setMonnifyMode(e.target.value)}>
              <option value="sandbox">Sandbox (test) — keys start with MK_TEST_</option>
              <option value="live">Live — keys start with MK_PROD_</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="monnifyApiKey">API key</label>
            <PasswordField id="monnifyApiKey" value={monnifyApiKey} onChange={(e) => setMonnifyApiKey(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="monnifySecretKey">Secret key</label>
            <PasswordField id="monnifySecretKey" value={monnifySecretKey} onChange={(e) => setMonnifySecretKey(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="monnifyContractCode">Contract code</label>
            <input id="monnifyContractCode" value={monnifyContractCode} onChange={(e) => setMonnifyContractCode(e.target.value)} />
          </div>
          <p style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 0 }}>
            Webhook URL to set in Monnify (Transaction completion): https://zappi-pay-backend.onrender.com/api/webhooks/monnify
          </p>
          {monnifyTest && !monnifyTest.running && (
            <div style={{ margin: '0 0 12px', fontSize: 14 }}>
              {monnifyTest.ok ? (
                <p style={{ color: 'var(--green-500)', margin: 0 }}>Connected to Monnify ({monnifyTest.mode}). Keys are working.</p>
              ) : (
                <>
                  <p className="error-text" style={{ margin: 0 }}>Not connected: {monnifyTest.error}</p>
                  {(monnifyTest.hints || []).map((h) => (
                    <p key={h} style={{ color: 'var(--orange, #f97316)', margin: '4px 0 0' }}>{h}</p>
                  ))}
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {saveButton('monnify', 'Save Monnify Settings')}
            <button type="button" className="btn btn-secondary" disabled={monnifyTest?.running} onClick={runMonnifyTest}>
              {monnifyTest?.running ? 'Testing…' : 'Test connection'}
            </button>
          </div>
        </form>
      )}

      {!loading && !loadError && tab === 'monnify' && (
        <form className="card" style={{ ...cardStyle, marginTop: 16 }} onSubmit={saveBankTransfers}>
          <SectionHeader
            title="Send to Bank"
            hint="Customers send money from their wallet to any bank account. It's paid out from your Monnify wallet, so keep that wallet funded."
          />
          <Status state={status.bankTransfers} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input type="checkbox" checked={btEnabled} onChange={(e) => setBtEnabled(e.target.checked)} style={{ width: 'auto' }} />
            Allow customers to send to banks
          </label>
          <div className="field">
            <label htmlFor="walletAccount">Monnify wallet account number</label>
            <input id="walletAccount" inputMode="numeric" value={walletAccount} onChange={(e) => setWalletAccount(e.target.value)} placeholder="From Monnify → Developer → API Keys & Contracts" />
          </div>
          <div className="field">
            <label htmlFor="btFee">Fee for transfers under ₦10,000 (₦)</label>
            <input id="btFee" type="number" min="0" step="1" value={btFee} onChange={(e) => setBtFee(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>Charged to the customer on top of the amount. Monnify charges you ₦10.75 (incl. VAT) here.</small>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: '1 1 200px' }}>
              <label htmlFor="btFeeMid">Fee ₦10,000 – ₦49,999 (₦)</label>
              <input id="btFeeMid" type="number" min="0" step="1" value={btFeeMid} onChange={(e) => setBtFeeMid(e.target.value)} placeholder="Same as above" />
              <small style={{ color: 'var(--slate-400)' }}>Monnify charges you ₦21.50.</small>
            </div>
            <div className="field" style={{ flex: '1 1 200px' }}>
              <label htmlFor="btFeeHigh">Fee ₦50,000 and above (₦)</label>
              <input id="btFeeHigh" type="number" min="0" step="1" value={btFeeHigh} onChange={(e) => setBtFeeHigh(e.target.value)} placeholder="Same as above" />
              <small style={{ color: 'var(--slate-400)' }}>Monnify charges you ₦43.</small>
            </div>
          </div>
          <div className="field">
            <label htmlFor="btMin">Minimum per transfer (₦)</label>
            <input id="btMin" type="number" min="0" step="1" value={btMin} onChange={(e) => setBtMin(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="btMax">Maximum per transfer (₦)</label>
            <input id="btMax" type="number" min="0" step="1" value={btMax} onChange={(e) => setBtMax(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="btDaily">Daily limit per customer (₦)</label>
            <input id="btDaily" type="number" min="0" step="1" value={btDaily} onChange={(e) => setBtDaily(e.target.value)} />
          </div>
          <p style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 0 }}>
            In Monnify → Developer → Webhook URLs, put the same webhook URL in the Disbursement box too.
          </p>
          {saveButton('bankTransfers', 'Save Send to Bank Settings')}
        </form>
      )}

      {!loading && !loadError && tab === 'monnify' && (
        <div className="card" style={{ ...cardStyle, marginTop: 16, border: '1px solid var(--red-500)' }}>
          <SectionHeader
            title="Going live: reset account numbers"
            hint="Account numbers created in Sandbox don't work in Live. After switching the mode above to Live (and testing the connection), clear them here. Each customer just enters their BVN/NIN again next time they open Wallet and gets real account numbers. Wallet balances are not touched."
          />
          <p style={{ fontSize: 14, margin: '0 0 10px' }}>
            Customers with account numbers now: <strong>{accountsCount ?? '…'}</strong>
          </p>
          <Status state={resetState?.running ? null : resetState} />
          <div className="field">
            <label htmlFor="resetText">Type RESET to confirm</label>
            <input id="resetText" value={resetText} onChange={(e) => setResetText(e.target.value.toUpperCase())} autoComplete="off" />
          </div>
          <button type="button" className="btn btn-secondary" disabled={resetText !== 'RESET' || resetState?.running} onClick={runReset}>
            {resetState?.running ? 'Clearing…' : 'Clear all account numbers'}
          </button>
        </div>
      )}

      {!loading && !loadError && tab === 'markup' && (
        <form className="card" style={cardStyle} onSubmit={saveMarkup}>
          <SectionHeader title="Markup per service (%)" hint="Added on top of VTpass's own price for that service. Set a maximum so big bills (e.g. DStv Premium) don't get an expensive charge — e.g. 1% but never more than ₦100." />
          <Status state={status.markup} />
          {SERVICES.map((service) => {
            const pct = Number(markupByService[service] || 0);
            const cap = Number(markupCapByService[service] || 0);
            const on = (amt) => Math.round(cap > 0 ? Math.min((amt * pct) / 100, cap) : (amt * pct) / 100);
            return (
              <div key={service} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div className="field" style={{ flex: '1 1 160px', margin: 0 }}>
                    <label htmlFor={`markup-${service}`}>{serviceLabel(service)} (%)</label>
                    <input
                      id={`markup-${service}`}
                      type="number"
                      step="0.1"
                      min="0"
                      value={markupByService[service]}
                      onChange={(e) => setMarkupByService((prev) => ({ ...prev, [service]: e.target.value }))}
                    />
                  </div>
                  <div className="field" style={{ flex: '1 1 160px', margin: 0 }}>
                    <label htmlFor={`markupcap-${service}`}>Max per purchase (₦)</label>
                    <input
                      id={`markupcap-${service}`}
                      type="number"
                      step="1"
                      min="0"
                      placeholder="No maximum"
                      value={markupCapByService[service] || ''}
                      onChange={(e) => setMarkupCapByService((prev) => ({ ...prev, [service]: e.target.value }))}
                    />
                  </div>
                </div>
                {pct > 0 && (
                  <small style={{ color: 'var(--slate-400)' }}>
                    Customer pays extra: ₦{on(1000).toLocaleString()} on ₦1,000 · ₦{on(10000).toLocaleString()} on ₦10,000 · ₦{on(30000).toLocaleString()} on ₦30,000
                  </small>
                )}
              </div>
            );
          })}
          {saveButton('markup', 'Save Markup')}
        </form>
      )}

      {!loading && !loadError && tab === 'discount' && <RewardGuardPanel />}
      {!loading && !loadError && tab === 'discount' && (
        <form className="card" style={cardStyle} onSubmit={saveDiscount}>
          <SectionHeader
            title="Discount per service (%)"
            hint={'Taken off the marked-up price automatically on every purchase of that service. Customers see a "% OFF" badge on the dashboard and the discounted total before paying. Set to 0 to end a discount.'}
          />
          <Status state={status.discount} />
          {SERVICES.map((service) => {
            const markup = Number(markupByService[service] || 0);
            const discount = Number(discountByService[service] || 0);
            // Net effect on ₦100 of VTpass price — below 100 means this
            // service is now being sold under what VTpass charges us.
            const net = Math.round(100 * (1 + markup / 100)) * (1 - discount / 100);
            return (
              <div className="field" key={service}>
                <label htmlFor={`discount-${service}`}>{serviceLabel(service)}</label>
                <input
                  id={`discount-${service}`}
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={discountByService[service]}
                  onChange={(e) => setDiscountByService((prev) => ({ ...prev, [service]: e.target.value }))}
                />
                {discount > 0 && net < 100 && (
                  <p style={{ color: 'var(--orange)', fontSize: 12, margin: '4px 0 0' }}>
                    Heads up: this discount is bigger than the {markup}% markup, so {serviceLabel(service)} sells below VTpass cost.
                  </p>
                )}
              </div>
            );
          })}
          {saveButton('discount', 'Save Discounts')}
        </form>
      )}

      {!loading && !loadError && tab === 'limits' && (
        <form className="card" style={cardStyle} onSubmit={saveLimits}>
          <SectionHeader title="Limits & fees" hint="Smallest amounts customers can fund or spend, and the fee on automatic bank transfer funding." />
          <Status state={status.limits} />
          <div className="field">
            <label htmlFor="minFundingAmount">Minimum funding amount (₦)</label>
            <input id="minFundingAmount" type="number" step="1" min="0" value={minFundingAmount} onChange={(e) => setMinFundingAmount(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="minPurchaseAmount">Minimum purchase amount (₦)</label>
            <input id="minPurchaseAmount" type="number" step="1" min="0" value={minPurchaseAmount} onChange={(e) => setMinPurchaseAmount(e.target.value)} />
          </div>
          <FundingAccountsPanel />
          <div className="field">
            <label htmlFor="bankFeePercent">Bank transfer funding fee (%)</label>
            <input id="bankFeePercent" type="number" step="0.01" min="0" max="10" value={bankFeePercent} onChange={(e) => setBankFeePercent(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>Kept from money customers send to their personal account number. 0 = free.</small>
          </div>
          <div className="field">
            <label htmlFor="bankFeeCap">Maximum fee per transfer (₦)</label>
            <input id="bankFeeCap" type="number" step="1" min="0" value={bankFeeCap} onChange={(e) => setBankFeeCap(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>0 = no maximum.</small>
          </div>
          {saveButton('limits', 'Save Limits')}
        </form>
      )}

      {!loading && !loadError && tab === 'airtimeCash' && (
        <form className="card" style={cardStyle} onSubmit={saveAirtimeCash}>
          <SectionHeader
            title="Airtime to Cash"
            hint="Customers transfer airtime to your line for that network, then you approve it in Admin → Airtime to Cash and their wallet is credited minus the fee. Only networks with a number filled in can be chosen."
          />
          <Status state={status.airtimeCash} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={a2cEnabled} onChange={(e) => setA2cEnabled(e.target.checked)} style={{ width: 'auto' }} />
            Accept Airtime to Cash requests
          </label>
          <div className="field">
            <label htmlFor="a2cFee">Service fee (%)</label>
            <input id="a2cFee" type="number" step="0.1" min="0" max="99" value={a2cFee} onChange={(e) => setA2cFee(e.target.value)} />
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '4px 0 0' }}>
              e.g. at {Number(a2cFee || 0)}%, ₦1,000 airtime pays out ₦{Math.floor(1000 * (1 - Number(a2cFee || 0) / 100)).toLocaleString()}.
            </p>
          </div>
          <div className="field">
            <label htmlFor="a2cMin">Minimum airtime amount (₦)</label>
            <input id="a2cMin" type="number" step="1" min="0" value={a2cMin} onChange={(e) => setA2cMin(e.target.value)} />
          </div>
          <h3 style={{ fontSize: 14, margin: '4px 0 8px' }}>Receiving numbers</h3>
          {A2C_NETWORKS.map((n) => (
            <div className="field" key={n.key}>
              <label htmlFor={`a2c-${n.key}`}>{n.label}</label>
              <input
                id={`a2c-${n.key}`}
                type="tel"
                inputMode="numeric"
                maxLength={11}
                value={a2cNumbers[n.key] || ''}
                onChange={(e) => setA2cNumbers((prev) => ({ ...prev, [n.key]: e.target.value }))}
                placeholder="Leave blank to not accept this network"
              />
            </div>
          ))}
          {saveButton('airtimeCash', 'Save Airtime to Cash')}
        </form>
      )}

      {!loading && !loadError && tab === 'loyalty' && (
        <form className="card" style={cardStyle} onSubmit={saveLoyalty}>
          <SectionHeader title="Loyalty points" hint="Customers earn points on every successful purchase and turn them into wallet credit. It's a cost to you, so keep the reward small." />
          <Status state={status.loyalty} />
          {splitOn && <p style={{ fontSize: 13, background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green-500)', borderRadius: 10, padding: '8px 12px', margin: '0 0 12px' }}>🎁 The Rewards split is on, so points earned come from your Rewards split share (points per ₦100 below is not used; point value still is). Keep this switched on to take part; change amounts under <b>🎁 Rewards split</b>.</p>}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input type="checkbox" checked={loyOn} onChange={(e) => setLoyOn(e.target.checked)} style={{ width: 'auto' }} />
            Give loyalty points
          </label>
          <div className="field">
            <label htmlFor="loyPer100">Points earned per ₦100 spent</label>
            <input id="loyPer100" type="number" step="0.1" min="0" value={loyPer100} onChange={(e) => setLoyPer100(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="loyValue">Value of 1 point when redeemed (₦)</label>
            <input id="loyValue" type="number" step="0.01" min="0" value={loyValue} onChange={(e) => setLoyValue(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="loyMin">Minimum points to redeem</label>
            <input id="loyMin" type="number" min="1" value={loyMin} onChange={(e) => setLoyMin(e.target.value)} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 0 }}>
            With these numbers a customer gets back about <strong>{((Number(loyPer100 || 0) * Number(loyValue || 0))).toFixed(2)}%</strong> of what they spend
            (₦{((10000 / 100) * Number(loyPer100 || 0) * Number(loyValue || 0)).toLocaleString()} on every ₦10,000).
          </p>
          {saveButton('loyalty', 'Save Loyalty Settings')}
        </form>
      )}

      {!loading && !loadError && tab === 'security' && (
        <form className="card" style={cardStyle} onSubmit={saveSecurity}>
          <SectionHeader title="Security" />
          <Status state={status.security} />

          <div style={{ fontWeight: 600, marginBottom: 4 }}>Fraud check on bank transfers</div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input type="checkbox" checked={fraudOn} onChange={(e) => setFraudOn(e.target.checked)} style={{ width: 'auto' }} />
            Hold large transfers for my review
          </label>
          <div className="field">
            <label htmlFor="fraudAmount">Hold transfers of at least (₦)</label>
            <input id="fraudAmount" type="number" min="0" value={fraudAmount} onChange={(e) => setFraudAmount(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="fraudHours">…made within this many hours of signup, a PIN/password change or a new-device login</label>
            <input id="fraudHours" type="number" min="1" max="720" value={fraudHours} onChange={(e) => setFraudHours(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>Held transfers wait under Bank Transfers → Held. You'll get an email for each one.</small>
          </div>

          <div style={{ borderTop: '1px solid var(--slate-700)', margin: '14px 0', paddingTop: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Two-step admin login</div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <input type="checkbox" checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} style={{ width: 'auto' }} />
              Email a 6-digit code on every admin login
            </label>
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: 0 }}>
              You can switch this off here at any time. Admins can tick “Trust this device for 30 days”. Test that your admin email receives messages (e.g. with the summary test below) before turning this on. If email stops working, log in with a backup code below; last resort: ADMIN_2FA_DISABLED = 1 on Render turns it off.
            </p>
            <BackupCodesPanel />
          </div>

          <div style={{ borderTop: '1px solid var(--slate-700)', margin: '14px 0', paddingTop: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Attack watch</div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <input type="checkbox" checked={attackOn} onChange={(e) => setAttackOn(e.target.checked)} style={{ width: 'auto' }} />
              Automatically block addresses that scan for weak spots, guess passwords or forge logins
            </label>
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 14px' }}>
              Blocks are short (15 minutes to a day) and you're alerted. Warning signs are always recorded — see 🛡️ Security. When off, you're only alerted. Addresses in SECURITY_ALLOW_IPS on Render are never blocked.
            </p>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Check name & date of birth with BVN/NIN</div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <input type="checkbox" checked={idMatch} onChange={(e) => setIdMatch(e.target.checked)} style={{ width: 'auto' }} />
              Before giving an account number, check the customer’s name and date of birth match their BVN/NIN
            </label>
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: 0 }}>
              Uses Monnify verification: about ₦10 per BVN check and ₦60 per NIN check (from your Monnify wallet). Up to 3 tries per customer a day. After a match, the customer can’t change their name or date of birth. Turn this on only with Monnify LIVE keys — test mode can’t check real IDs.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--slate-700)', margin: '14px 0', paddingTop: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Daily summary email</div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input type="checkbox" checked={summaryOn} onChange={(e) => setSummaryOn(e.target.checked)} style={{ width: 'auto' }} />
              Email admins yesterday's numbers at 7am
            </label>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={summaryTest?.running} onClick={runSummaryTest}>
              {summaryTest?.running ? 'Sending…' : 'Send me a summary now'}
            </button>
            {summaryTest && !summaryTest.running && (
              <p style={{ fontSize: 13, margin: '6px 0 0', color: summaryTest.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{summaryTest.text}</p>
            )}
          </div>

          {saveButton('security', 'Save Security Settings')}
        </form>
      )}

      {!loading && !loadError && tab === 'agents' && (
        <form className="card" style={cardStyle} onSubmit={saveAgents}>
          <SectionHeader
            title="Agent / reseller pricing"
            hint="Approved agents get this extra % off each service, on top of any normal discount. Customers apply from their Profile; you approve them on the Overview or their customer page. Keep it below your markup so you still make a profit."
          />
          <Status state={status.agents} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input type="checkbox" checked={agentOn} onChange={(e) => setAgentOn(e.target.checked)} style={{ width: 'auto' }} />
            Open agent accounts (show "Become an agent" to customers)
          </label>
          {SERVICES.map((service) => (
            <div className="field" key={service}>
              <label htmlFor={`ag-${service}`}>{serviceLabel(service)} — extra % off for agents</label>
              <input id={`ag-${service}`} type="number" step="0.1" min="0" max="50" value={agentByService[service]} onChange={(e) => setAgentByService((m) => ({ ...m, [service]: e.target.value }))} />
            </div>
          ))}
          {saveButton('agents', 'Save Agent Pricing')}
        </form>
      )}

      {!loading && !loadError && tab === 'cashback' && (
        <form className="card" style={cardStyle} onSubmit={saveCashback}>
          <SectionHeader title="Cashback" hint="After a successful purchase, this % of the price goes back into the customer's wallet. It comes out of your profit — keep it below your markup." />
          <Status state={status.cashback} />
          {splitOn && <p style={{ fontSize: 13, background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green-500)', borderRadius: 10, padding: '8px 12px', margin: '0 0 12px' }}>🎁 The Rewards split is on, so cashback amounts come from your Rewards split share (the % below is not used). Keep this switched on to take part; change amounts under <b>🎁 Rewards split</b>.</p>}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input type="checkbox" checked={cbEnabled} onChange={(e) => setCbEnabled(e.target.checked)} style={{ width: 'auto' }} />
            Give cashback
          </label>
          {SERVICES.map((service) => (
            <div className="field" key={service}>
              <label htmlFor={`cb-${service}`}>{serviceLabel(service)} (%)</label>
              <input id={`cb-${service}`} type="number" step="0.1" min="0" max="20" value={cbByService[service]} onChange={(e) => setCbByService((m) => ({ ...m, [service]: e.target.value }))} />
            </div>
          ))}
          <div className="field">
            <label htmlFor="cbMax">Maximum cashback per purchase (₦)</label>
            <input id="cbMax" type="number" min="0" value={cbMax} onChange={(e) => setCbMax(e.target.value)} />
          </div>
          {saveButton('cashback', 'Save Cashback')}
        </form>
      )}

      {!loading && !loadError && tab === 'alerts' && (
        <form className="card" style={cardStyle} onSubmit={saveAlerts}>
          <SectionHeader title="Alerts, limits & support" />
          <Status state={status.alerts} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input type="checkbox" checked={alertsOn} onChange={(e) => setAlertsOn(e.target.checked)} style={{ width: 'auto' }} />
            Send email alerts (money in/out, new logins)
          </label>
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 14px' }}>
            Uses your Resend email setup. Resend's free plan allows 100 emails a day — upgrade Resend before you have many customers.
          </p>
          <div style={{ fontWeight: 600, margin: '4px 0 6px' }}>Alerts to me (admin)</div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input type="checkbox" checked={adminPushOn} onChange={(e) => setAdminPushOn(e.target.checked)} style={{ width: 'auto' }} />
            Push notifications to the admin app
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input type="checkbox" checked={adminEmailOn} onChange={(e) => setAdminEmailOn(e.target.checked)} style={{ width: 'auto' }} />
            Email to admin addresses
          </label>
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 14px' }}>
            For new support messages, transfers needing your Monnify OTP or held for review, funding and Airtime-to-Cash requests, deletion/agent requests, orders stuck over 15 minutes, low ratings and contest results. Turn on push per device with “Turn on alerts” in the menu.
          </p>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <input type="checkbox" checked={feedbackOn} onChange={(e) => setFeedbackOn(e.target.checked)} style={{ width: 'auto' }} />
            Ask customers to rate their purchase (and share their referral link when happy)
          </label>
          <div style={{ fontWeight: 600, margin: '4px 0 6px' }}>Automatic helpers (free — no AI cost)</div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input type="checkbox" checked={spotterOn} onChange={(e) => setSpotterOn(e.target.checked)} style={{ width: 'auto' }} />
            Problem spotter — alert me when a provider keeps failing (and prepare a notice + pause card)
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input type="checkbox" checked={monthlyOn} onChange={(e) => setMonthlyOn(e.target.checked)} style={{ width: 'auto' }} />
            Monthly money summary to customers (first days of the month)
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <input type="checkbox" checked={agentWeeklyOn} onChange={(e) => setAgentWeeklyOn(e.target.checked)} style={{ width: 'auto' }} />
            Weekly shop report to agents (Mondays)
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input type="checkbox" checked={limitsOn} onChange={(e) => setLimitsOn(e.target.checked)} style={{ width: 'auto' }} />
            Daily spending limits by verification level
          </label>
          <div className="field">
            <label htmlFor="limU">Not verified — daily limit (₦)</label>
            <input id="limU" type="number" min="0" value={limitUnverified} onChange={(e) => setLimitUnverified(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="limV">Verified with BVN/NIN — daily limit (₦)</label>
            <input id="limV" type="number" min="0" value={limitVerified} onChange={(e) => setLimitVerified(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>Covers purchases, ZappiPay transfers and bank transfers per day.</small>
          </div>
          <div className="field">
            <label htmlFor="wa">Support WhatsApp number</label>
            <input id="wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="e.g. 08012345678" />
            <small style={{ color: 'var(--slate-400)' }}>The number customers reach from "Chat on WhatsApp" in Profile and the help chat. Leave empty to keep the current number (08134209037).</small>
          </div>
          {saveButton('alerts', 'Save')}
        </form>
      )}

      {!loading && !loadError && tab === 'referral' && <ReceiptInvitePanel />}
      {!loading && !loadError && tab === 'referral' && (
        <form className="card" style={cardStyle} onSubmit={saveReferral}>
          <SectionHeader
            title="Referral program"
            hint="Each customer's username is their referral code. When someone signs up with a code and completes a first successful purchase of at least the minimum below, the referrer's wallet is credited the bonus — once per referred customer."
          />
          <Status state={status.referral} />
          {splitOn && <p style={{ fontSize: 13, background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green-500)', borderRadius: 10, padding: '8px 12px', margin: '0 0 12px' }}>🎁 The Rewards split is on, so referral bonuses are paid from the referral pool (a bonus waits if the pool is short). Keep this switched on to take part; change amounts under <b>🎁 Rewards split</b>.</p>}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={refEnabled} onChange={(e) => setRefEnabled(e.target.checked)} style={{ width: 'auto' }} />
            Pay referral bonuses
          </label>
          <div className="field">
            <label htmlFor="refBonus">Bonus per referral (₦)</label>
            <input id="refBonus" type="number" step="1" min="0" value={refBonus} onChange={(e) => setRefBonus(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="refMin">Referred customer's first purchase must be at least (₦)</label>
            <input id="refMin" type="number" step="1" min="0" value={refMin} onChange={(e) => setRefMin(e.target.value)} />
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '4px 0 0' }}>
              A higher minimum makes it harder for people to farm bonuses with fake accounts. Keep the bonus below your margin on that purchase.
            </p>
          </div>
          {saveButton('referral', 'Save Referral Settings')}
        </form>
      )}

      {!loading && !loadError && tab === 'epins' && <EpinSettingsPanel />}
      {!loading && !loadError && tab === 'ai' && (<div style={{ display: 'grid', gap: 16 }}><AiSettingsPanel /><VoiceSettingsPanel /><OpenAiExtrasPanel /><HeygenSettingsPanel /></div>)}
      {!loading && !loadError && tab === 'savings' && <SavingsPanel />}
      {!loading && !loadError && tab === 'maintenance' && <MaintenancePanel />}
      {!loading && !loadError && tab === 'promise' && <DeliveryPromisePanel />}
      {!loading && !loadError && tab === 'shops' && <ShopsPanel />}
      {!loading && !loadError && tab === 'split' && <RewardSplitPanel />}

      {tab === 'password' && (
        <form className="card" style={cardStyle} onSubmit={savePassword}>
          <SectionHeader title="Change My Password" />
          <Status state={status.password} />
          <div className="field">
            <label htmlFor="currentPassword">Current password</label>
            <PasswordField id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <PasswordField id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
          </div>
          {saveButton('password', 'Change Password')}
        </form>
      )}
    </AdminLayout>
  );
}
