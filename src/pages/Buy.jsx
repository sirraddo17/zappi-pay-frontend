import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVtpassServices, getVtpassVariations, verifyBillersCode, purchase, getPricing, getBeneficiaries, checkPromo } from '../api';
import { cached } from '../lib/cache';
import PinConfirm from '../components/PinConfirm';
import ServiceNotices, { useAppInfo } from '../components/ServiceNotices';

// Maps the URL slug to what the backend Order.service enum expects, the
// VTpass category identifier used to fetch that service's provider list,
// and enough per-service quirks (does it need a data-plan-style
// variation? a prepaid/postpaid type? live name verification?) to drive
// one shared form instead of five near-duplicate pages.
const SERVICE_CONFIG = {
  airtime: {
    label: 'Airtime',
    backendService: 'AIRTIME',
    identifier: 'airtime',
    needsVariation: false,
    needsType: false,
    canVerify: false,
    recipientLabel: 'Phone number',
    recipientPlaceholder: '080…',
  },
  data: {
    label: 'Data',
    backendService: 'DATA',
    identifier: 'data',
    needsVariation: true,
    needsType: false,
    canVerify: false,
    recipientLabel: 'Phone number',
    recipientPlaceholder: '080…',
  },
  electricity: {
    label: 'Electricity',
    backendService: 'ELECTRICITY',
    identifier: 'electricity-bill',
    needsVariation: false,
    needsType: true,
    canVerify: true,
    recipientLabel: 'Meter number',
    recipientPlaceholder: 'Meter number',
  },
  cable: {
    label: 'Cable TV',
    backendService: 'CABLE',
    identifier: 'tv-subscription',
    needsVariation: true,
    needsType: false,
    canVerify: true,
    recipientLabel: 'Smartcard / IUC number',
    recipientPlaceholder: 'Smartcard number',
  },
  education: {
    label: 'Education',
    backendService: 'EDUCATION',
    identifier: 'education',
    needsVariation: true,
    needsType: false,
    canVerify: false,
    recipientLabel: 'Profile ID (if any)',
    recipientPlaceholder: 'Leave blank if none',
  },
  internet: {
    label: 'Internet',
    backendService: 'INTERNET',
    identifier: 'other-services',
    filterServiceIds: ['spectranet', 'smile-direct', 'swift-4g', 'ipnx'],
    needsVariation: true,
    needsType: false,
    canVerify: false,
    recipientLabel: 'Account / MAC ID',
    recipientPlaceholder: 'Account or MAC ID',
  },
  betting: {
    label: 'Bet Funding',
    backendService: 'BETTING',
    identifier: 'other-services',
    filterServiceIds: ['bet9ja', 'betking', 'sportybet', 'bangbet', '1xbet', 'nairabet', 'merrybet'],
    needsVariation: false,
    needsType: false,
    canVerify: true,
    recipientLabel: 'Betting account ID',
    recipientPlaceholder: 'Your account ID on the platform',
  },
};

// Display-only mirror of computePrice() in the backend's
// lib/pricing.js: VTpass price + markup, then minus any discount,
// rounded to whole naira at each step. The backend recomputes this
// itself on purchase, so this only has to match, not be trusted.
function priceFor(base, service, pricing) {
  const markup = Number(pricing?.markupPercentByService?.[service] || 0);
  const discountPct = Math.min(100, Math.max(0, Number(pricing?.discountPercentByService?.[service] || 0)));
  const markedUp = Math.round(Number(base || 0) * (1 + markup / 100));
  const discount = Math.round(markedUp * (discountPct / 100));
  return { markedUp, discount, discountPct, total: Math.max(0, markedUp - discount) };
}

function naira(n) {
  return `₦${Number(n).toLocaleString()}`;
}

export default function Buy() {
  const { service: slug } = useParams();
  const navigate = useNavigate();
  const { customer, refreshCustomer } = useAuth();
  const config = SERVICE_CONFIG[slug];
  // Airtime and data top up a phone number directly — the recipient
  // IS the phone, so asking for it twice (once as "recipient", once
  // as a separate "your phone number" field defaulted from the
  // account's own number) is confusing and, worse, silently sends
  // the wrong number to VTpass if they don't match. Services with a
  // separate account identifier (meter number, smartcard, profile)
  // still need both.
  const isPhoneService = config?.recipientLabel === 'Phone number';

  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState('');
  const [variations, setVariations] = useState([]);
  const [variationCode, setVariationCode] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [billType, setBillType] = useState('prepaid');
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [verifiedName, setVerifiedName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [slow, setSlow] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchParams] = useSearchParams();
  // A plan to select once the provider's plans have loaded — set from
  // a "Buy again" link (?variation=...).
  const pendingVariation = useRef(searchParams.get('variation') || '');
  const [saved, setSaved] = useState([]);
  const [saveIt, setSaveIt] = useState(false);
  const [nickname, setNickname] = useState('');
  const [repeatOn, setRepeatOn] = useState(false);
  const [frequency, setFrequency] = useState('MONTHLY');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);
  const appInfo = useAppInfo();

  useEffect(() => {
    getPricing().then(setPricing).catch(() => setPricing(null));
  }, []);

  // Pre-fill from a "Buy again" / saved-number link.
  useEffect(() => {
    const p = searchParams.get('provider');
    const r = searchParams.get('recipient');
    const a = searchParams.get('amount');
    const m = searchParams.get('meterType');
    if (p) setProviderId(p);
    if (r) setRecipient(r);
    if (a) setCustomAmount(a);
    if (m === 'prepaid' || m === 'postpaid') setBillType(m);
    pendingVariation.current = searchParams.get('variation') || '';
  }, [slug, searchParams]);

  useEffect(() => {
    if (!config) return;
    getBeneficiaries(config.backendService)
      .then((d) => setSaved(d.beneficiaries || []))
      .catch(() => setSaved([]));
  }, [slug]);

  function useSaved(b) {
    setProviderId(b.serviceID);
    setRecipient(b.billersCode);
    if (b.meterType) setBillType(b.meterType);
    setVerifiedName('');
    setSaveIt(false);
  }

  const alreadySaved = saved.some((b) => b.serviceID === providerId && b.billersCode === recipient.trim());

  useEffect(() => {
    if (!config) return;
    // Networks/billers show instantly from the last visit, then refresh.
    let shown = false;
    cached(`services:${config.identifier}`, () => getVtpassServices(config.identifier), (data) => {
      shown = true;
      const list = Array.isArray(data.content) ? data.content : [];
      setProviders(config.filterServiceIds ? list.filter((p) => config.filterServiceIds.includes(p.serviceID)) : list);
    }, 24 * 60 * 60 * 1000).catch((err) => { if (!shown) setError(err.message); });
  }, [slug]);

  useEffect(() => {
    setVariationCode('');
    setVariations([]);
    setVerifiedName('');
    if (!providerId || !config?.needsVariation) return;
    // Plans show instantly from the last visit (kept up to 6 hours),
    // then refresh. The price is always re-checked when paying.
    let shown = false;
    let active = true;
    cached(`plans:${providerId}`, () => getVtpassVariations(providerId), (data) => {
      if (!active) return;
      shown = true;
      const list = Array.isArray(data.content?.varations || data.content?.variations) ? (data.content?.varations || data.content?.variations) : [];
      setVariations(list);
      // Keep the chosen plan if it still exists in the fresh list.
      setVariationCode((code) => (code && list.some((v) => v.variation_code === code) ? code : ''));
      if (pendingVariation.current && list.some((v) => v.variation_code === pendingVariation.current)) {
        setVariationCode(pendingVariation.current);
      }
    }, 6 * 60 * 60 * 1000)
      .then(() => { pendingVariation.current = ''; })
      .catch((err) => { if (!shown && active) setError(err.message); });
    return () => { active = false; };
  }, [providerId]);

  async function handleVerify(silent = false) {
    if (!config.canVerify || !providerId || !recipient) return;
    setVerifying(true);
    setVerifiedName('');
    setError('');
    try {
      const data = await verifyBillersCode(providerId, recipient, config.needsType ? billType : undefined);
      setVerifiedName(data.content?.Customer_Name || data.content?.customerName || 'Verified');
    } catch (err) {
      if (!silent) setError('Could not verify this number — double-check it before continuing.');
    } finally {
      setVerifying(false);
    }
  }

  // Check the meter / decoder / account name as soon as the number
  // looks complete, instead of waiting for the customer to tap Verify.
  const autoVerified = useRef('');
  useEffect(() => {
    if (!config?.canVerify || !providerId || verifying || verifiedName) return undefined;
    const code = recipient.trim();
    if (!/^\d{10,13}$/.test(code)) return undefined;
    const key = `${providerId}|${code}|${billType}`;
    if (autoVerified.current === key) return undefined;
    const t = setTimeout(() => {
      autoVerified.current = key;
      handleVerify(true);
    }, 700);
    return () => clearTimeout(t);
  }, [recipient, providerId, billType, verifiedName]);

  const selectedVariation = variations.find((v) => v.variation_code === variationCode);
  const amount = config?.needsVariation ? Number(selectedVariation?.variation_amount || 0) : Number(customAmount || 0);
  // amount stays VTpass's own price (what the backend expects to
  // receive); price.total is what the wallet will actually be charged.
  const price = priceFor(amount, config?.backendService, pricing);
  const discountPct = price.discountPct;
  const promoDiscount = promo ? Math.min(promo.discount, price.total) : 0;
  const payTotal = Math.max(0, price.total - promoDiscount);
  const cashbackPct = Number(appInfo?.cashback?.[config?.backendService] || 0);

  // A code checked for one amount/service must be re-checked if either changes.
  useEffect(() => {
    if (promo && (promo.forAmount !== price.total || promo.forService !== config?.backendService)) {
      setPromo(null);
      setPromoMsg('');
    }
  }, [price.total, config?.backendService]);

  async function applyPromo() {
    setPromoMsg('');
    if (!promoInput.trim() || !price.total) return;
    try {
      const r = await checkPromo(promoInput.trim(), config.backendService, price.total);
      setPromo({ ...r, forAmount: price.total, forService: config.backendService });
      setPromoMsg(`${r.code} applied — you save ${naira(r.discount)}.`);
    } catch (err) {
      setPromo(null);
      setPromoMsg(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    // Phone is never a separate field the person fills in anymore —
    // for airtime/data the recipient they typed IS the phone; for
    // everything else (meter, smartcard, profile) VTpass's phone
    // parameter is just a contact/notification number, and using
    // the account's own number for that is correct, not a guess.
    const phoneToSend = isPhoneService ? recipient : (customer?.phone || phone);
    if (!providerId || !recipient || !phoneToSend || !amount) {
      setError('Please fill in every field.');
      return;
    }
    setConfirmOpen(true);
  }

  // Runs once the customer has entered their PIN / used biometrics.
  // Errors bubble back to PinConfirm, which keeps PIN mistakes in the
  // sheet and passes everything else to setError below.
  async function doPurchase(auth) {
    const phoneToSend = isPhoneService ? recipient : (customer?.phone || phone);
    setSubmitting(true);
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 6000);
    try {
      await purchase({
        service: config.backendService,
        serviceID: providerId,
        variationCode: config.needsVariation ? variationCode : undefined,
        billersCode: recipient.trim(),
        phone: phoneToSend.trim(),
        amount,
        meterType: config.needsType ? billType : undefined,
        promoCode: promo ? promo.code : undefined,
        saveBeneficiary: saveIt && !alreadySaved ? { nickname: nickname.trim() || undefined } : undefined,
        repeat: repeatOn ? { frequency, nickname: nickname.trim() || undefined } : undefined,
        ...auth,
      });
      await refreshCustomer();
      setConfirmOpen(false);
      navigate('/orders');
    } catch (err) {
      if (/refunded/i.test(err.message || '')) refreshCustomer().catch(() => {});
      throw err;
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setSubmitting(false);
      // If the customer already went to Orders, update it now.
      window.dispatchEvent(new Event('zp-refresh'));
    }
  }

  if (!config) {
    return (
      <div className="app-shell">
        <div className="page-header">
          <h1>Unknown service</h1>
        </div>
        <Link to="/" className="btn" style={{ margin: '0 16px', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="page-header">
        <Link to="/" style={{ color: 'var(--purple, var(--orange))', textDecoration: 'none', fontSize: 14 }}>
          &larr; Back
        </Link>
        <h1>Buy {config.label}</h1>
        <p>Pay from your wallet balance</p>
      </div>

      <ServiceNotices service={config.backendService} />

      {discountPct > 0 && (
        <div
          className="card"
          style={{ background: 'rgba(255,184,48,0.12)', border: '1px solid var(--gold)', padding: '10px 14px', fontSize: 14, fontWeight: 600 }}
        >
          {pricing?.agentPricing
            ? `⭐ Agent price: ${discountPct}% off ${config.label} — applied automatically.`
            : `🎉 ${discountPct}% off all ${config.label} purchases right now — applied automatically.`}
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {saved.length > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ fontSize: 13, color: 'var(--slate-400)', marginBottom: 6 }}>Saved</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {saved.map((b) => {
              const active = b.serviceID === providerId && b.billersCode === recipient.trim();
              const prov = providers.find((p) => p.serviceID === b.serviceID)?.name || b.serviceID;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => useSaved(b)}
                  style={{
                    flexShrink: 0,
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: `1px solid ${active ? 'var(--purple)' : 'var(--slate-700)'}`,
                    background: active ? 'rgba(134,59,255,0.18)' : 'var(--slate-800)',
                    color: 'var(--slate-100)',
                    cursor: 'pointer',
                    maxWidth: 180,
                  }}
                >
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.nickname || b.billersCode}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--slate-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.nickname ? `${b.billersCode} · ` : ''}{prov}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="provider">{config.label} provider</label>
          <select id="provider" value={providerId} onChange={(e) => setProviderId(e.target.value)} required>
            <option value="">Select…</option>
            {providers.map((p) => (
              <option key={p.serviceID} value={p.serviceID}>{p.name}</option>
            ))}
          </select>
        </div>

        {config.needsType && (
          <div className="field">
            <label htmlFor="billType">Meter type</label>
            <select id="billType" value={billType} onChange={(e) => setBillType(e.target.value)}>
              <option value="prepaid">Prepaid</option>
              <option value="postpaid">Postpaid</option>
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="recipient">{config.recipientLabel}</label>
          <input
            id="recipient"
            type="text"
            value={recipient}
            onChange={(e) => { setRecipient(e.target.value); setVerifiedName(''); }}
            placeholder={config.recipientPlaceholder}
            required={slug !== 'education'}
          />
          {config.canVerify && (
            <button
              type="button"
              className="btn-secondary btn"
              style={{ marginTop: 8 }}
              onClick={() => handleVerify()}
              disabled={verifying || !providerId || !recipient}
            >
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
          )}
          {verifiedName && <p style={{ color: 'var(--green-500)', fontSize: 13, margin: '6px 0 0' }}>{verifiedName}</p>}
        </div>

        {config.needsVariation ? (
          <div className="field">
            <label htmlFor="variation">{slug === 'data' ? 'Data plan' : slug === 'cable' ? 'Package' : 'Exam type'}</label>
            <select id="variation" value={variationCode} onChange={(e) => setVariationCode(e.target.value)} required>
              <option value="">Select…</option>
              {variations.map((v) => (
                <option key={v.variation_code} value={v.variation_code}>
                  {v.name} — {naira(priceFor(v.variation_amount, config.backendService, pricing).total)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="amount">Amount (₦)</label>
            <input id="amount" type="number" min="50" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} required />
          </div>
        )}

        
        {amount > 0 && (
          <div style={{ margin: '0 0 12px' }}>
            {price.discount > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--slate-400)' }}>
                  <span>Price</span>
                  <span style={{ textDecoration: 'line-through' }}>{naira(price.markedUp)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--green-500)', margin: '4px 0' }}>
                  <span>Discount ({discountPct}%)</span>
                  <span>−{naira(price.discount)}</span>
                </div>
              </>
            )}
            {promoDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--green-500)', margin: '4px 0' }}>
                <span>Promo {promo.code}</span>
                <span>−{naira(promoDiscount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
              <span>Total</span>
              <span>{naira(payTotal)}</span>
            </div>
            {cashbackPct > 0 && payTotal > 0 && (
              <div style={{ fontSize: 13, color: 'var(--green-500)', marginTop: 4 }}>
                + {cashbackPct}% cashback (about {naira(Math.floor(payTotal * cashbackPct) / 100)}) back to your wallet
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              {!promoOpen && !promo ? (
                <button type="button" onClick={() => setPromoOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--purple)', cursor: 'pointer', padding: 0, fontSize: 14 }}>
                  Have a promo code?
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="Promo code" aria-label="Promo code" style={{ flex: 1 }} />
                  {promo ? (
                    <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => { setPromo(null); setPromoInput(''); setPromoMsg(''); }}>Remove</button>
                  ) : (
                    <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={applyPromo}>Apply</button>
                  )}
                </div>
              )}
              {promoMsg && <p style={{ fontSize: 13, margin: '6px 0 0', color: promo ? 'var(--green-500)' : 'var(--red-500)' }}>{promoMsg}</p>}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--slate-700)', paddingTop: 12, margin: '4px 0 14px' }}>
          {!alreadySaved && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={saveIt} onChange={(e) => setSaveIt(e.target.checked)} style={{ width: 'auto' }} />
              Save this {config.recipientLabel.toLowerCase().replace(/ \(.*\)/, '')} for next time
            </label>
          )}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={repeatOn} onChange={(e) => setRepeatOn(e.target.checked)} style={{ width: 'auto' }} />
            Repeat this purchase automatically
          </label>
          {repeatOn && (
            <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} aria-label="How often">
                <option value="DAILY">Every day</option>
                <option value="WEEKLY">Every week (same day)</option>
                <option value="MONTHLY">Every month (same date)</option>
              </select>
              <p style={{ color: 'var(--slate-400)', fontSize: 12, margin: '6px 0 0' }}>
                We'll buy it from your wallet at about this time {frequency === 'DAILY' ? 'every day' : frequency === 'WEEKLY' ? 'every week' : 'every month'}
                {config.needsVariation ? ', at the plan\'s price on the day' : ''}. Pause or cancel any time under Saved &amp; Scheduled.
              </p>
            </div>
          )}
          {(saveIt || repeatOn) && (
            <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} placeholder="Nickname (optional), e.g. Mum's line" aria-label="Nickname" />
            </div>
          )}
        </div>

        <button className="btn" type="submit" disabled={submitting || !amount}>
          {submitting ? 'Processing…' : `Pay ${naira(payTotal)}${repeatOn ? ' & schedule' : ''}`}
        </button>
      </form>

      <PinConfirm
        open={confirmOpen}
        summary={`Pay ${naira(payTotal)} · ${config.label} for ${recipient.trim()}`}
        notice={slow && (
          <div style={{ background: 'rgba(255,184,48,0.1)', border: '1px solid var(--gold)', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
            ⏳ The network is taking a little longer than usual. You can leave this page. Your order keeps processing, and if it fails you're refunded automatically.
            <div style={{ marginTop: 8 }}>
              <Link to="/orders" style={{ color: 'var(--purple)', fontWeight: 600 }}>Go to Orders →</Link>
            </div>
          </div>
        )}
        onSubmit={doPurchase}
        onError={(err) => setError(err.message || 'Purchase failed.')}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
