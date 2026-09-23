import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVtpassServices, getVtpassVariations, verifyBillersCode, purchase, getPricing } from '../api';
import PinConfirm from '../components/PinConfirm';

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
  const [pricing, setPricing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    getPricing().then(setPricing).catch(() => setPricing(null));
  }, []);

  useEffect(() => {
    if (!config) return;
    getVtpassServices(config.identifier)
      .then((data) => {
        const list = Array.isArray(data.content) ? data.content : [];
        setProviders(config.filterServiceIds ? list.filter((p) => config.filterServiceIds.includes(p.serviceID)) : list);
      })
      .catch((err) => setError(err.message));
  }, [slug]);

  useEffect(() => {
    setVariationCode('');
    setVariations([]);
    setVerifiedName('');
    if (!providerId || !config?.needsVariation) return;
    getVtpassVariations(providerId)
      .then((data) => setVariations(Array.isArray(data.content?.varations || data.content?.variations) ? (data.content?.varations || data.content?.variations) : []))
      .catch((err) => setError(err.message));
  }, [providerId]);

  async function handleVerify() {
    if (!config.canVerify || !providerId || !recipient) return;
    setVerifying(true);
    setVerifiedName('');
    setError('');
    try {
      const data = await verifyBillersCode(providerId, recipient, config.needsType ? billType : undefined);
      setVerifiedName(data.content?.Customer_Name || data.content?.customerName || 'Verified');
    } catch (err) {
      setError('Could not verify this number — double-check it before continuing.');
    } finally {
      setVerifying(false);
    }
  }

  const selectedVariation = variations.find((v) => v.variation_code === variationCode);
  const amount = config?.needsVariation ? Number(selectedVariation?.variation_amount || 0) : Number(customAmount || 0);
  // amount stays VTpass's own price (what the backend expects to
  // receive); price.total is what the wallet will actually be charged.
  const price = priceFor(amount, config?.backendService, pricing);
  const discountPct = price.discountPct;

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
    try {
      await purchase({
        service: config.backendService,
        serviceID: providerId,
        variationCode: config.needsVariation ? variationCode : undefined,
        billersCode: recipient.trim(),
        phone: phoneToSend.trim(),
        amount,
        ...auth,
      });
      await refreshCustomer();
      setConfirmOpen(false);
      navigate('/orders');
    } catch (err) {
      if (/refunded/i.test(err.message || '')) refreshCustomer().catch(() => {});
      throw err;
    } finally {
      setSubmitting(false);
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

      {discountPct > 0 && (
        <div
          className="card"
          style={{ background: 'rgba(255,184,48,0.12)', border: '1px solid var(--gold)', padding: '10px 14px', fontSize: 14, fontWeight: 600 }}
        >
          🎉 {discountPct}% off all {config.label} purchases right now — applied automatically.
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

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
              onClick={handleVerify}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
              <span>Total</span>
              <span>{naira(price.total)}</span>
            </div>
          </div>
        )}

        <button className="btn" type="submit" disabled={submitting || !amount}>
          {submitting ? 'Processing…' : `Pay ${naira(price.total)}`}
        </button>
      </form>

      <PinConfirm
        open={confirmOpen}
        summary={`Pay ${naira(price.total)} · ${config.label} for ${recipient.trim()}`}
        onSubmit={doPurchase}
        onError={(err) => setError(err.message || 'Purchase failed.')}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
