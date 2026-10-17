import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PasswordField from '../../components/PasswordField';
import AdminLayout from '../../components/AdminLayout';
import AiSettingsPanel from '../../components/AiSettingsPanel';
import VoiceSettingsPanel from '../../components/admin/VoiceSettingsPanel';
import HeygenSettingsPanel from '../../components/admin/HeygenSettingsPanel';
import OpenAiExtrasPanel from '../../components/admin/OpenAiExtrasPanel';
import BackupCodesPanel from '../../components/admin/BackupCodesPanel';
import IntlAirtimeToggle from '../../components/admin/IntlAirtimeToggle';
import VtpassSelfTest from '../../components/admin/VtpassSelfTest';
import FundingMethodsPanel from '../../components/admin/FundingMethodsPanel';
import SquadPanel from '../../components/admin/SquadPanel';
import NombaPanel from '../../components/admin/NombaPanel';
import PaymentPartnersPanel from '../../components/admin/PaymentPartnersPanel';
import ReceiptInvitePanel from '../../components/admin/ReceiptInvitePanel';
import EpinSettingsPanel from '../../components/admin/EpinSettingsPanel';
import FundingAccountsPanel from '../../components/admin/FundingAccountsPanel';
import RewardGuardPanel from '../../components/admin/RewardGuardPanel';
import SavingsPanel from '../../components/admin/SavingsPanel';
import MaintenancePanel from '../../components/admin/MaintenancePanel';
import DeliveryPromisePanel from '../../components/admin/DeliveryPromisePanel';
import ShopsPanel from '../../components/admin/ShopsPanel';
import RewardSplitPanel from '../../components/admin/RewardSplitPanel';
import SafePricingPanel from '../../components/admin/SafePricingPanel';
import ReferralProgressPanel from '../../components/admin/ReferralProgressPanel';
import { getSettings, updateSettings, changeAdminPassword, testMonnifyConnection, getMonnifyOverview, resetMonnifyAccounts, sendTestDailySummary } from '../../api';

// Lowest VTpass commission per service (% of the sale) — MTN for airtime
// and data, Jos for light. Mirrors lib/earnings.js. Exam PINs pay a flat ₦
// per PIN, too small a share on big registrations to count on.
const LOWEST_COMMISSION = { AIRTIME: 3, DATA: 3, ELECTRICITY: 0.9, CABLE: 1.5, EDUCATION: 0, INTERNET: 5, BETTING: 0, INTERNATIONAL: 0, INSURANCE: 0 };
const MONNIFY_FEE = 1.6125; // 1.5% + VAT on wallet funding
const SERVICES = ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION', 'INTERNET', 'BETTING', 'INTERNATIONAL', 'INSURANCE'];

// Each tab is its own form with its own Save button, and only sends
// the fields that belong to it — PATCH /admin/settings already
// accepts partial updates, so saving discounts can never overwrite
// the VTpass keys (or vice versa) with stale values from another tab.
const TABS = [
  { key: 'maintenance', label: '🛠️ Maintenance & alerts' },
  { key: 'split', label: '🎁 Rewards split' },
  { key: 'vtpass', label: 'VTpass' },
  { key: 'monnify', label: 'Wallet funding & payment partners' },
  { key: 'markup', label: 'Markup' },
  { key: 'discount', label: 'Discounts' },
  { key: 'limits', label: 'Limits' },
  { key: 'airtimeCash', label: 'Airtime to Cash' },
  { key: 'referral', label: 'Referrals' },
  { key: 'cashback', label: 'Cashback' },
  { key: 'promise', label: '⚡ Delivery promise' },
  { key: 'shops', label: '🏪 Agent shops' },
  { key: 'epins', label: '🖨️ ClubKonnect & Bet Funding' },
  { key: 'agents', label: 'Agents' },
  { key: 'loyalty', label: 'Loyalty Points' },
  { key: 'savings', label: 'Savings (interest)' },
  { key: 'alerts', label: 'Alerts & Limits' },
  { key: 'security', label: 'Security' },
  { key: 'ai', label: 'AI Assistant' },
  { key: 'password', label: 'My Password' },
];

// Sections inside a menu, so long menus show one part at a time.
const SUBTABS = {
  vtpass: [['connection', '🔌 Connection'], ['test', '🧪 Self-test'], ['intl', '🌍 International airtime']],
  monnify: [['overview', '🤝 Overview'], ['monnify', 'Monnify'], ['squad', 'Squad (GTBank)'], ['nomba', 'Nomba'], ['flutterwave', 'Flutterwave (card)']],
  markup: [['rates', '📈 Markup per service'], ['safe', '✅ Safe pricing check']],
  discount: [['discounts', '🏷️ Discounts'], ['guard', '🛡️ Giveaway safety limit']],
  limits: [['amounts', '⬇️ Minimum amounts'], ['manual', '🏦 Manual funding accounts'], ['fees', '💸 Monnify funding fee']],
  referral: [['settings', '🎁 Referral rewards'], ['receipt', '🧾 Invite on receipts'], ['progress', '👥 Invited friends']],
  alerts: [['customers', '📣 Customer alerts'], ['admin', '🔔 Alerts to me'], ['helpers', '🤖 Automatic helpers'], ['limits', '🚦 Daily spending limits'], ['support', '💬 Support WhatsApp']],
  security: [['fraud', '🕵️ Fraud check'], ['login', '🔐 Two-step login'], ['attack', '🛡️ Attack watch'], ['id', '🪪 BVN/NIN check'], ['summary', '📊 Daily summary']],
  ai: [['assistant', '🤖 AI Assistant'], ['voice', '🎤 Voice notes'], ['openai', '🗣️ Natural voice & pictures'], ['heygen', '🎥 Presenter videos']],
};

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
  const [subTab, setSubTab] = useState({});
  // Links like /admin/settings?tab=security&sub=login (e.g. from the AI
  // assistant) open that menu and section.
  const [params] = useSearchParams();
  useEffect(() => {
    const t = params.get('tab');
    if (!t || !TABS.some((x) => x.key === t)) return;
    setTab(t);
    const sb = params.get('sub');
    if (sb && SUBTABS[t]?.some(([k]) => k === sb)) setSubTab((x) => ({ ...x, [t]: sb }));
  }, [params]);
  const sub = (t) => subTab[t] || SUBTABS[t]?.[0][0];
  const partnerTab = sub('monnify');
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
  const [lightMin, setLightMin] = useState('1000');
  const [bankFeePercent, setBankFeePercent] = useState('0');
  const [bankFeeCap, setBankFeeCap] = useState('0');

  const [a2cEnabled, setA2cEnabled] = useState(false);
  const [a2cFee, setA2cFee] = useState('20');
  const [a2cMin, setA2cMin] = useState('500');
  const [a2cMax, setA2cMax] = useState('50000');
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
  const [splitPct, setSplitPct] = useState(30);
  const [cbByService, setCbByService] = useState(toServiceMap({}));
  const [cbMax, setCbMax] = useState('500');
  const [cbSeparate, setCbSeparate] = useState(true);
  const [cbUsePct, setCbUsePct] = useState('20');
  const [alertsOn, setAlertsOn] = useState(false);
  const [recoveryOn, setRecoveryOn] = useState(true);
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
  const [refTarget, setRefTarget] = useState('0');
  const [refWelcome, setRefWelcome] = useState('0');
  const [refMilestones, setRefMilestones] = useState([]);
  const [refBoostAmt, setRefBoostAmt] = useState('0');
  const [refBoostTarget, setRefBoostTarget] = useState('0');
  const [refBoostUntil, setRefBoostUntil] = useState('');
  const [refTicker, setRefTicker] = useState(true);

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
        setLightMin(String(s.electricityMinAmount ?? 1000));
        setBankFeePercent(String(s.bankFundingFeePercent ?? 0));
        setBankFeeCap(String(s.bankFundingFeeCap ?? 0));
        setA2cEnabled(Boolean(s.airtimeToCashEnabled));
        setA2cFee(String(s.airtimeToCashFeePercent ?? 20));
        setA2cMin(String(s.airtimeToCashMinAmount ?? 500));
        setA2cMax(String(s.airtimeToCashMaxAmount ?? 50000));
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
        setSplitPct(Number(s.rewardSplitPct ?? 30));
        setCbByService(toServiceMap(s.cashbackPercentByService));
        setCbMax(String(s.cashbackMaxPerOrder ?? 500));
        setCbSeparate(s.cashbackSeparate !== false);
        setCbUsePct(String(s.cashbackUseMaxPercent ?? 20));
        setAlertsOn(Boolean(s.emailAlertsEnabled));
        setRecoveryOn(s.recoveryNoticesEnabled !== false);
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
        setRefTarget(String(Number(s.referralSpendTarget ?? 0)));
        setRefWelcome(String(Number(s.referralWelcomeBonus ?? 0)));
        setRefMilestones(Array.isArray(s.referralMilestones) ? s.referralMilestones.map((m) => ({ count: String(m.count), bonus: String(m.bonus) })) : []);
        setRefBoostAmt(String(Number(s.referralBoostAmount ?? 0)));
        setRefBoostTarget(String(Number(s.referralBoostTarget ?? 0)));
        setRefBoostUntil(s.referralBoostUntil ? new Date(new Date(s.referralBoostUntil).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
        setRefTicker(s.referralTickerEnabled !== false);
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
        electricityMinAmount: Number(lightMin || 0),
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
        airtimeToCashMaxAmount: Number(a2cMax || 0),
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
    save('cashback', { cashbackEnabled: cbEnabled, cashbackPercentByService: toNumberMap(cbByService), cashbackMaxPerOrder: Number(cbMax || 0), cashbackSeparate: cbSeparate, cashbackUseMaxPercent: Number(cbUsePct || 20) }, 'Cashback settings saved.');
  }

  function saveAlerts(e) {
    e.preventDefault();
    save(
      'alerts',
      {
        emailAlertsEnabled: alertsOn,
        recoveryNoticesEnabled: recoveryOn,
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

  // Lowest % you keep per sale across the services that count toward a
  // referral target (after discounts, Monnify's fee and the rewards split),
  // and on MTN airtime/data. Used to suggest safe spend targets.
  function referralRates() {
    const pct = splitOn ? splitPct : 0;
    const keptOn = (svc) => {
      const earn = Number(markupByService[svc] || 0) + LOWEST_COMMISSION[svc] - Math.max(0, MONNIFY_FEE - Number(bankFeePercent || 0));
      return earn - Math.max(Number(discountByService[svc] || 0), (earn * pct) / 100);
    };
    return { lowest: Math.min(...['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'INTERNET'].map(keptOn)), mtn: Math.min(keptOn('AIRTIME'), keptOn('DATA')) };
  }
  const safeTargetFor = (amount) => (referralRates().lowest > 0 ? Math.ceil(amount / (referralRates().lowest / 100) / 500) * 500 : null);

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
    save('referral', {
      referralEnabled: refEnabled, referralBonusAmount: bonus, referralMinPurchase: min, referralSpendTarget: Math.max(0, Number(refTarget || 0)),
      referralWelcomeBonus: Math.max(0, Number(refWelcome || 0)),
      referralMilestones: refMilestones.map((m) => ({ count: Number(m.count), bonus: Number(m.bonus) })).filter((m) => m.count >= 2 && m.bonus > 0),
      referralBoostAmount: Math.max(0, Number(refBoostAmt || 0)), referralBoostTarget: Math.max(0, Number(refBoostTarget || 0)),
      referralBoostUntil: refBoostUntil ? new Date(refBoostUntil).toISOString() : null,
      referralTickerEnabled: refTicker,
    }, 'Referral settings saved.');
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

      {!loading && !loadError && SUBTABS[tab] && (
        <div role="tablist" aria-label="Sections" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 16px', maxWidth: 640, paddingTop: 12, borderTop: '1px solid var(--slate-800)' }}>
          {SUBTABS[tab].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={sub(tab) === k} className={sub(tab) === k ? 'btn' : 'btn btn-secondary'} style={{ width: 'auto', padding: '8px 14px' }} onClick={() => setSubTab((x) => ({ ...x, [tab]: k }))}>{l}</button>
          ))}
        </div>
      )}

      {!loading && !loadError && tab === 'vtpass' && sub('vtpass') === 'connection' && (
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
      {!loading && !loadError && tab === 'vtpass' && sub('vtpass') === 'test' && <VtpassSelfTest />}
      {!loading && !loadError && tab === 'vtpass' && sub('vtpass') === 'intl' && <IntlAirtimeToggle />}

      {!loading && !loadError && tab === 'monnify' && partnerTab === 'overview' && <PaymentPartnersPanel />}
      {!loading && !loadError && tab === 'monnify' && partnerTab === 'monnify' && <FundingMethodsPanel only="monnify" />}
      {!loading && !loadError && tab === 'monnify' && partnerTab === 'squad' && <SquadPanel />}
      {!loading && !loadError && tab === 'monnify' && partnerTab === 'nomba' && <NombaPanel />}
      {!loading && !loadError && tab === 'monnify' && partnerTab === 'flutterwave' && <FundingMethodsPanel only="flutterwave" />}
      {!loading && !loadError && tab === 'monnify' && partnerTab === 'monnify' && (
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

      {!loading && !loadError && tab === 'monnify' && partnerTab === 'monnify' && (
        <form className="card" style={{ ...cardStyle, marginTop: 16 }} onSubmit={saveBankTransfers}>
          <SectionHeader
            title="Send to Bank"
            hint="Customers send money from their wallet to any bank account. These switches, fees and limits apply whichever partner sends the transfer (chosen in Overview). The wallet account below is only for Monnify."
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

      {!loading && !loadError && tab === 'monnify' && partnerTab === 'monnify' && (
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

      {!loading && !loadError && tab === 'markup' && sub('markup') === 'safe' && <SafePricingPanel onApplied={() => window.location.reload()} />}
      {!loading && !loadError && tab === 'markup' && sub('markup') === 'rates' && (
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
                      step="0.01"
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

      {!loading && !loadError && tab === 'discount' && sub('discount') === 'guard' && <RewardGuardPanel />}
      {!loading && !loadError && tab === 'discount' && sub('discount') === 'discounts' && (
        <form className="card" style={cardStyle} onSubmit={saveDiscount}>
          <SectionHeader
            title="Discount per service (%)"
            hint={'Taken off the marked-up price automatically on every purchase of that service. Customers see a "% OFF" badge on the dashboard and the discounted total before paying. Set to 0 to end a discount.'}
          />
          <Status state={status.discount} />
          {SERVICES.map((service) => {
            const markup = Number(markupByService[service] || 0);
            const discount = Number(discountByService[service] || 0);
            // What you really earn on this service (% of the sale): your
            // markup + VTpass commission at the lowest-paying provider −
            // Monnify's fee not covered by the bank-funding fee.
            const margin = markup + LOWEST_COMMISSION[service] - Math.max(0, MONNIFY_FEE - Number(bankFeePercent || 0));
            const agentTotal = discount + (agentOn ? Number(agentByService[service] || 0) : 0);
            const keep = (n) => Math.round((margin - n) * 100) / 100;
            return (
              <div className="field" key={service}>
                <label htmlFor={`discount-${service}`}>{serviceLabel(service)}</label>
                <input
                  id={`discount-${service}`}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discountByService[service]}
                  onChange={(e) => setDiscountByService((prev) => ({ ...prev, [service]: e.target.value }))}
                />
                {discount > 0 && (keep(discount) < 0 || keep(agentTotal) < 0) ? (
                  <p style={{ color: 'var(--orange)', fontSize: 12, margin: '4px 0 0' }}>
                    Heads up: {keep(discount) < 0 ? `${discount}% off` : `${agentTotal}% off for agents`} is more than you earn on {serviceLabel(service)} (about {Math.round(margin * 100) / 100}% at the lowest-paying provider, after Monnify's fee) — these sales lose money.
                  </p>
                ) : discount > 0 ? (
                  <p style={{ color: 'var(--green-500)', fontSize: 12, margin: '4px 0 0' }}>
                    You still keep about {keep(discount)}% per sale{agentOn && agentTotal > discount ? ` (${keep(agentTotal)}% on agent sales)` : ''}, before cashback and points.
                  </p>
                ) : null}
              </div>
            );
          })}
          {saveButton('discount', 'Save Discounts')}
        </form>
      )}

      {!loading && !loadError && tab === 'limits' && sub('limits') === 'manual' && <div className="card" style={{ margin: 0, maxWidth: 480 }}><FundingAccountsPanel /></div>}
      {!loading && !loadError && tab === 'limits' && sub('limits') !== 'manual' && (
        <form className="card" style={cardStyle} onSubmit={saveLimits}>
          <SectionHeader title="Limits & fees" hint="Smallest amounts customers can fund or spend, and the fee on automatic bank transfer funding." />
          <Status state={status.limits} />
{sub('limits') === 'amounts' && <>
          <div className="field">
            <label htmlFor="minFundingAmount">Minimum funding amount (₦)</label>
            <input id="minFundingAmount" type="number" step="1" min="0" value={minFundingAmount} onChange={(e) => setMinFundingAmount(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="minPurchaseAmount">Minimum purchase amount (₦)</label>
            <input id="minPurchaseAmount" type="number" step="1" min="0" value={minPurchaseAmount} onChange={(e) => setMinPurchaseAmount(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="lightMin">Minimum electricity purchase (₦)</label>
            <input id="lightMin" type="number" step="1" min="0" max="100000" value={lightMin} onChange={(e) => setLightMin(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>Electricity companies reject very small tokens. Customers can’t pay less than this; if the meter check shows a higher minimum for that company, that one is used.</small>
          </div>
</>}
          {sub('limits') === 'fees' && <>
          <div className="field">
            <label htmlFor="bankFeePercent">Bank transfer funding fee (%) — Monnify account numbers</label>
            <input id="bankFeePercent" type="number" step="0.01" min="0" max="10" value={bankFeePercent} onChange={(e) => setBankFeePercent(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>Kept from money customers send to their personal account number. 0 = free.</small>
          </div>
          <div className="field">
            <label htmlFor="bankFeeCap">Maximum fee per transfer (₦)</label>
            <input id="bankFeeCap" type="number" step="1" min="0" value={bankFeeCap} onChange={(e) => setBankFeeCap(e.target.value)} />
            <small style={{ color: 'var(--slate-400)' }}>0 = no maximum.</small>
          </div>
</>}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label htmlFor="a2cMin">Minimum per request (₦)</label>
              <input id="a2cMin" type="number" step="1" min="50" value={a2cMin} onChange={(e) => setA2cMin(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="a2cMax">Maximum per request (₦)</label>
              <input id="a2cMax" type="number" step="1" min={Number(a2cMin || 0)} max="500000" value={a2cMax} onChange={(e) => setA2cMax(e.target.value)} />
            </div>
          </div>
          {Number(a2cMax) < Number(a2cMin) && <p className="error-text" style={{ margin: '-6px 0 10px', fontSize: 12 }}>The maximum must be at least the minimum.</p>}
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '-6px 0 12px' }}>Customers can only request amounts between these. Set the maximum to what you can comfortably pay out (up to ₦500,000).</p>
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
          {splitOn ? (
            <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 0 }}>
              Points now come from the Rewards split, so the amount depends on each purchase. Example: MTN ₦1,000 with {splitPct}% given back gives about ₦{(30 * splitPct / 100 * 0.2).toFixed(1)} in points = <strong>{Math.floor((30 * splitPct / 100 * 0.2) / Math.max(0.01, Number(loyValue || 0)))} points</strong> at ₦{Number(loyValue || 0)} each (any part too small for a whole point goes to cashback). Customers can redeem from {Number(loyMin || 0).toLocaleString()} points = ₦{(Number(loyMin || 0) * Number(loyValue || 0)).toLocaleString()}.
            </p>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 0 }}>
              With these numbers a customer gets back about <strong>{((Number(loyPer100 || 0) * Number(loyValue || 0))).toFixed(2)}%</strong> of what they spend
              (₦{((10000 / 100) * Number(loyPer100 || 0) * Number(loyValue || 0)).toLocaleString()} on every ₦10,000).
            </p>
          )}
          {saveButton('loyalty', 'Save Loyalty Settings')}
        </form>
      )}

      {!loading && !loadError && tab === 'security' && (
        <form className="card" style={cardStyle} onSubmit={saveSecurity}>
          <SectionHeader title="Security" />
          <Status state={status.security} />

{sub('security') === 'fraud' && <>
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

</>}
                    {sub('security') === 'login' && (
          <div style={{ margin: '0 0 14px' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <input type="checkbox" checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} style={{ width: 'auto' }} />
              Email a 6-digit code on every admin login
            </label>
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: 0 }}>
              You can switch this off here at any time. Admins can tick “Trust this device for 30 days”. Test that your admin email receives messages (e.g. with the summary test below) before turning this on. If email stops working, log in with a backup code below; last resort: ADMIN_2FA_DISABLED = 1 on Render turns it off.
            </p>
            <BackupCodesPanel />
          </div>
          )}

          {sub('security') === 'attack' && (
          <div style={{ margin: '0 0 14px' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <input type="checkbox" checked={attackOn} onChange={(e) => setAttackOn(e.target.checked)} style={{ width: 'auto' }} />
              Automatically block addresses that scan for weak spots, guess passwords or forge logins
            </label>
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 14px' }}>
              Blocks are short (15 minutes to a day) and you're alerted. Warning signs are always recorded — see 🛡️ Security. When off, you're only alerted. Addresses in SECURITY_ALLOW_IPS on Render are never blocked.
            </p>
          </div>
          )}
          {sub('security') === 'id' && (
          <div style={{ margin: '0 0 14px' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <input type="checkbox" checked={idMatch} onChange={(e) => setIdMatch(e.target.checked)} style={{ width: 'auto' }} />
              Before giving an account number, check the customer’s name and date of birth match their BVN/NIN
            </label>
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: 0 }}>
              Uses Monnify verification: about ₦10 per BVN check and ₦60 per NIN check (from your Monnify wallet). Up to 3 tries per customer a day. After a match, the customer can’t change their name or date of birth. Turn this on only with Monnify LIVE keys — test mode can’t check real IDs.
            </p>
            {idMatch && monnifyMode !== 'live' && <p style={{ color: 'var(--red-500)', fontSize: 13, margin: '8px 0 0' }}>⚠ Monnify is in test mode, so every check fails and customers can’t get account numbers. Switch Monnify to live, or untick this and save.</p>}
          </div>
          )}

          {sub('security') === 'summary' && (
          <div style={{ margin: '0 0 14px' }}>
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
          )}

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
              <input id={`ag-${service}`} type="number" step="0.01" min="0" max="50" value={agentByService[service]} onChange={(e) => setAgentByService((m) => ({ ...m, [service]: e.target.value }))} />
            </div>
          ))}
          {saveButton('agents', 'Save Agent Pricing')}
        </form>
      )}

      {!loading && !loadError && tab === 'cashback' && (
        <form className="card" style={cardStyle} onSubmit={saveCashback}>
          <SectionHeader title="Cashback" hint="After a successful purchase, this % of the price is given back as cashback. It comes out of your profit — keep it below your markup." />
          <Status state={status.cashback} />
          {splitOn && <p style={{ fontSize: 13, background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green-500)', borderRadius: 10, padding: '8px 12px', margin: '0 0 12px' }}>🎁 The Rewards split is on, so cashback amounts come from your Rewards split share (the % below is not used). Keep this switched on to take part; change amounts under <b>🎁 Rewards split</b>.</p>}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input type="checkbox" checked={cbEnabled} onChange={(e) => setCbEnabled(e.target.checked)} style={{ width: 'auto' }} />
            Give cashback
          </label>
          {SERVICES.map((service) => (
            <div className="field" key={service}>
              <label htmlFor={`cb-${service}`}>{serviceLabel(service)} (%)</label>
              <input id={`cb-${service}`} type="number" step="0.01" min="0" max="20" value={cbByService[service]} onChange={(e) => setCbByService((m) => ({ ...m, [service]: e.target.value }))} />
            </div>
          ))}
          <div className="field">
            <label htmlFor="cbMax">Maximum cashback per purchase (₦)</label>
            <input id="cbMax" type="number" min="0" value={cbMax} onChange={(e) => setCbMax(e.target.value)} />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '4px 0 12px' }}>
            <input type="checkbox" checked={cbSeparate} onChange={(e) => setCbSeparate(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
            <span>Keep cashback in its own balance (like OPay)<br /><span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Customers switch on “Use cashback” at checkout to pay less. It can’t be sent or withdrawn — only used on purchases. Off = cashback goes straight into the wallet.</span></span>
          </label>
          {cbSeparate && (
            <div className="field">
              <label htmlFor="cbUse">Cashback a customer can use per purchase (% of the price)</label>
              <input id="cbUse" type="number" min="1" max="100" value={cbUsePct} onChange={(e) => setCbUsePct(e.target.value)} />
              <small style={{ color: 'var(--slate-400)' }}>e.g. 20% → on a ₦1,000 purchase at most ₦200 comes from cashback; the rest stays for next time.</small>
            </div>
          )}
          {saveButton('cashback', 'Save Cashback')}
        </form>
      )}

      {!loading && !loadError && tab === 'alerts' && (
        <form className="card" style={cardStyle} onSubmit={saveAlerts}>
          <SectionHeader title="Alerts, limits & support" />
          <Status state={status.alerts} />
{sub('alerts') === 'customers' && <>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input type="checkbox" checked={alertsOn} onChange={(e) => setAlertsOn(e.target.checked)} style={{ width: 'auto' }} />
            Send email alerts (money in/out, new logins)
          </label>
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 14px' }}>
            Uses your Resend email setup. Resend's free plan allows 100 emails a day — upgrade Resend before you have many customers.
          </p>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <input type="checkbox" checked={recoveryOn} onChange={(e) => setRecoveryOn(e.target.checked)} style={{ width: 'auto' }} />
            Tell customers when a failed service is working again
          </label>
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 14px' }}>
            When a purchase, bank transfer or send fails because of a partner or system problem, the customer gets a polite “it’s working again — sorry” notice (with a link to try again) as soon as the next one goes through. Customer mistakes (wrong number, low balance) never trigger it. Once per customer per day, within 48 hours.
          </p>
</>}
          {sub('alerts') === 'customers' && <>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <input type="checkbox" checked={feedbackOn} onChange={(e) => setFeedbackOn(e.target.checked)} style={{ width: 'auto' }} />
            Ask customers to rate their purchase (and share their referral link when happy)
          </label>
</>}
{sub('alerts') === 'admin' && <>
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
</>}
          {sub('alerts') === 'helpers' && <>
          <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 8px' }}>Free — no AI cost.</p>
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
</>}
          {sub('alerts') === 'limits' && <>
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
</>}
          {sub('alerts') === 'support' && <>
          <div className="field">
            <label htmlFor="wa">Support WhatsApp number</label>
            <input id="wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="e.g. 08012345678" />
            <small style={{ color: 'var(--slate-400)' }}>The number customers reach from "Chat on WhatsApp" in Profile and the help chat. Leave empty to keep the current number (08134209037).</small>
          </div>
</>}
                    {saveButton('alerts', 'Save')}
        </form>
      )}

      {!loading && !loadError && tab === 'referral' && sub('referral') === 'receipt' && <ReceiptInvitePanel />}
      {!loading && !loadError && tab === 'referral' && sub('referral') === 'settings' && (
        <form className="card" style={cardStyle} onSubmit={saveReferral}>
          <SectionHeader
            title="Referral program"
            hint="Each customer's username is their referral code. When someone signs up with a code and completes a first successful purchase of at least the minimum below, the referrer's wallet is credited the bonus — once per referred customer. While the Rewards split is on, the bonus is paid from the referral pool or once the friend's own purchases have covered it (what you kept from them reaches the bonus), so a bigger bonus can't cost more than the friend brings in — it just takes a few more of their purchases. As a guide, with 40% given back, each ₦100 of bonus takes about ₦5,500 of the friend's MTN airtime/data."
          />
          <Status state={status.referral} />
          {splitOn && <p style={{ fontSize: 13, background: 'rgba(34,197,94,0.1)', border: '1px solid var(--green-500)', borderRadius: 10, padding: '8px 12px', margin: '0 0 12px' }}>🎁 The Rewards split is on, so a referral bonus is paid from the referral pool, or as soon as the friend's own purchases have covered it. Keep this switched on to take part.</p>}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={refEnabled} onChange={(e) => setRefEnabled(e.target.checked)} style={{ width: 'auto' }} />
            Pay referral bonuses
          </label>
          <div className="field">
            <label htmlFor="refBonus">Bonus per referral (₦)</label>
            <input id="refBonus" type="number" step="1" min="0" value={refBonus} onChange={(e) => setRefBonus(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="refTarget">Pay the bonus when the friend has spent this much in total (₦) — 0 = off</label>
            <input id="refTarget" type="number" step="500" min="0" value={refTarget} onChange={(e) => setRefTarget(e.target.value)} />
            {(() => {
              // Safe target: the spend your profit covers the bonus on, at the
              // lowest-earning counted service (light), and on airtime/data.
              const b = Number(refBonus || 0);
              if (!(b > 0)) return null;
              // The friend's welcome cashback is covered by the same spend.
              const cost = b + (cbSeparate ? Number(refWelcome || 0) : 0);
              const { lowest, mtn } = referralRates();
              if (!(lowest > 0)) return <p style={{ color: 'var(--orange)', fontSize: 12, margin: '4px 0 0' }}>Some services earn you nothing after discounts — fix pricing first.</p>;
              const round = (n) => Math.ceil(n / 500) * 500;
              const safe = round(cost / (lowest / 100));
              const airtime = round(cost / (mtn / 100));
              const t = Number(refTarget || 0);
              return (
                <div style={{ fontSize: 13, marginTop: 8, padding: '8px 12px', borderRadius: 10, border: `1px solid ${t >= safe ? 'var(--green-500)' : 'var(--gold)'}`, background: t >= safe ? 'rgba(34,197,94,0.08)' : 'rgba(255,184,48,0.08)' }}>
                  {t > 0 ? "Customers see:" : "With a target, customers see:"} "Get ₦{b.toLocaleString()} when your friend spends ₦{(t > 0 ? t : safe).toLocaleString()} in total". Paid instantly when they reach it; airtime, data, internet, TV and light count (not bet funding or exam PINs).<br />
                  <b>Safe target: ₦{safe.toLocaleString()}</b> — covers the bonus{cost > b ? ` and the friend's ₦${(cost - b).toLocaleString()} welcome cashback` : ''} even if they only buy light. If they mostly buy airtime/data, ₦{airtime.toLocaleString()} would do.
                  {t > 0 && t < safe && <div style={{ color: 'var(--orange)', marginTop: 4 }}>⚠️ Below the safe target — a friend who only buys light could cost you more than they bring in.</div>}
                  {t !== safe && <div style={{ marginTop: 6 }}><button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => setRefTarget(String(safe))}>Use ₦{safe.toLocaleString()}</button></div>}
                </div>
              );
            })()}
          </div>
          <div className="field" style={Number(refTarget || 0) > 0 ? { display: 'none' } : undefined}>
            <label htmlFor="refMin">Referred customer's first purchase must be at least (₦)</label>
            <input id="refMin" type="number" step="1" min="0" value={refMin} onChange={(e) => setRefMin(e.target.value)} />
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '4px 0 0' }}>
              A higher minimum makes it harder for people to farm bonuses with fake accounts. Keep the bonus below your margin on that purchase.
            </p>
            {splitOn && !(Number(refTarget || 0) > 0) && (() => {
              // Smallest first purchase whose profit alone covers the bonus,
              // so it's paid instantly (worked out on MTN airtime/data, the
              // lowest-paying network).
              const svc = Number(discountByService.DATA || 0) > Number(discountByService.AIRTIME || 0) ? 'DATA' : 'AIRTIME';
              const earn = Number(markupByService[svc] || 0) + LOWEST_COMMISSION[svc] - Math.max(0, MONNIFY_FEE - Number(bankFeePercent || 0));
              const kept = earn - Math.max(Number(discountByService[svc] || 0), (earn * splitPct) / 100);
              const b = Number(refBonus || 0);
              if (!(b > 0) || !(kept > 0)) return null;
              const instant = Math.ceil(b / (kept / 100) / 500) * 500;
              const ok = Number(refMin || 0) >= instant;
              return (
                <div style={{ fontSize: 13, marginTop: 8, padding: '8px 12px', borderRadius: 10, border: `1px solid ${ok ? 'var(--green-500)' : 'var(--gold)'}`, background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(255,184,48,0.08)' }}>
                  <b>⚡ Instant payout:</b> a first airtime/data purchase of <b>₦{instant.toLocaleString()}</b> or more covers a ₦{b.toLocaleString()} bonus by itself (you keep about {Math.round(kept * 100) / 100}% per sale), so it's paid straight away. {ok ? 'Your minimum already does this ✓' : 'With a lower minimum, the bonus is paid after a few more of their purchases instead.'} Other services pay less, so after a light or TV purchase it may need one or two more.
                  {!ok && <div style={{ marginTop: 6 }}><button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => setRefMin(String(instant))}>Use ₦{instant.toLocaleString()} as the minimum</button></div>}
                </div>
              );
            })()}
          </div>
          <div style={{ borderTop: '1px solid var(--slate-700)', margin: '16px 0', paddingTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>🎁 Welcome bonus for the friend</div>
            <div className="field">
              <label htmlFor="refWelcome">Cashback the invited friend gets after verifying BVN/NIN (₦) — 0 = off</label>
              <input id="refWelcome" type="number" step="10" min="0" max="10000" value={refWelcome} onChange={(e) => setRefWelcome(e.target.value)} />
              <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '4px 0 0' }}>
                Goes into their cashback balance — only spendable on purchases (up to the "cashback per purchase" %), never withdrawn or sent. Once per person; BVN/NIN can't be reused, so fake accounts gain little. {!cbSeparate && <b style={{ color: 'var(--orange)' }}>Needs "Keep cashback in its own balance" on (Cashback tab) — it's off, so no welcome bonus is paid.</b>} The safe target above includes it.
              </p>
            </div>

            <div style={{ fontWeight: 700, margin: '14px 0 8px' }}>🏆 Milestone bonuses for the referrer</div>
            <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '0 0 8px' }}>Extra money when this many of their friends have earned them a bonus. Paid from the referral pool (Rewards split), so it never costs more than was set aside — if the pool is short it waits and pays later.</p>
            {refMilestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <input aria-label="Friends" type="number" min="2" step="1" value={m.count} onChange={(e) => setRefMilestones((l) => l.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))} style={{ width: 90 }} />
                <span style={{ fontSize: 13 }}>friends →</span>
                <input aria-label="Extra bonus" type="number" min="0" step="50" value={m.bonus} onChange={(e) => setRefMilestones((l) => l.map((x, j) => (j === i ? { ...x, bonus: e.target.value } : x)))} style={{ width: 110 }} />
                <span style={{ fontSize: 13 }}>₦ extra</span>
                <button type="button" className="btn btn-secondary" style={{ padding: '2px 10px' }} onClick={() => setRefMilestones((l) => l.filter((_, j) => j !== i))} aria-label="Remove milestone">✕</button>
              </div>
            ))}
            {refMilestones.length < 6 && (
              <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => setRefMilestones((l) => [...l, l.length === 0 ? { count: '3', bonus: '200' } : l.length === 1 ? { count: '5', bonus: '500' } : { count: String(Number(l[l.length - 1].count || 5) + 5), bonus: '1000' }])}>+ Add milestone</button>
            )}

            <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>🔥 Boost week</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="refBoostAmt">Boosted bonus (₦)</label>
                <input id="refBoostAmt" type="number" min="0" step="10" value={refBoostAmt} onChange={(e) => setRefBoostAmt(e.target.value)} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="refBoostTarget">Boost spend target (₦)</label>
                <input id="refBoostTarget" type="number" min="0" step="500" value={refBoostTarget} onChange={(e) => setRefBoostTarget(e.target.value)} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="refBoostUntil">Ends</label>
                <input id="refBoostUntil" type="datetime-local" value={refBoostUntil} onChange={(e) => setRefBoostUntil(e.target.value)} />
              </div>
            </div>
            {(() => {
              const amt = Number(refBoostAmt || 0);
              if (!(amt > 0)) return <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '6px 0 0' }}>Set a bonus and an end date to run a boost — customers see a countdown on Refer &amp; Earn. Leave at 0 for no boost.</p>;
              const safe = safeTargetFor(amt + (cbSeparate ? Number(refWelcome || 0) : 0));
              const t = Number(refBoostTarget || 0);
              const live = refBoostUntil && new Date(refBoostUntil) > new Date();
              return (
                <p style={{ fontSize: 12, margin: '6px 0 0', color: t > 0 && safe && t < safe ? 'var(--orange)' : 'var(--slate-400)' }}>
                  {live ? `Running until ${new Date(refBoostUntil).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}.` : 'Not running (no future end date).'} Safe target for ₦{amt.toLocaleString()}: <b>₦{safe ? safe.toLocaleString() : '—'}</b>
                  {safe && t !== safe && <button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12, marginLeft: 6 }} onClick={() => setRefBoostTarget(String(safe))}>Use it</button>}
                  {t > 0 && safe && t < safe && ' ⚠️ below the safe target.'}
                  {refBoostUntil && <button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12, marginLeft: 6 }} onClick={() => setRefBoostUntil('')}>End boost</button>}
                </p>
              );
            })()}

            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, margin: '16px 0 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={refTicker} onChange={(e) => setRefTicker(e.target.checked)} style={{ width: 'auto' }} />
              Show a live ticker of real referral payouts (names masked, e.g. "Ad*** earned ₦100")
            </label>
          </div>
          {saveButton('referral', 'Save Referral Settings')}
        </form>
      )}
      {!loading && !loadError && tab === 'referral' && sub('referral') === 'progress' && <ReferralProgressPanel />}

      {!loading && !loadError && tab === 'epins' && <EpinSettingsPanel />}
      {!loading && !loadError && tab === 'ai' && sub('ai') === 'assistant' && <AiSettingsPanel />}
      {!loading && !loadError && tab === 'ai' && sub('ai') === 'voice' && <VoiceSettingsPanel />}
      {!loading && !loadError && tab === 'ai' && sub('ai') === 'openai' && <OpenAiExtrasPanel />}
      {!loading && !loadError && tab === 'ai' && sub('ai') === 'heygen' && <HeygenSettingsPanel />}
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
