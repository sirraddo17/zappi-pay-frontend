import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getVtpassServices, getVtpassVariations, verifyBillersCode, purchase } from '../api';

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
};

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

  useEffect(() => {
    if (!config) return;
    getVtpassServices(config.identifier)
      .then((data) => setProviders(data.content || []))
      .catch((err) => setError(err.message));
  }, [slug]);

  useEffect(() => {
    setVariationCode('');
    setVariations([]);
    setVerifiedName('');
    if (!providerId || !config?.needsVariation) return;
    getVtpassVariations(providerId)
      .then((data) => setVariations(data.content?.varations || data.content?.variations || []))
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
    setSubmitting(true);
    try {
      const order = await purchase({
        service: config.backendService,
        serviceID: providerId,
        variationCode: config.needsVariation ? variationCode : undefined,
        billersCode: recipient.trim(),
        phone: phoneToSend.trim(),
        amount,
      });
      await refreshCustomer();
      navigate('/orders');
    } catch (err) {
      setError(err.message || 'Purchase failed.');
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
        <h1>Buy {config.label}</h1>
        <p>Pay from your wallet balance</p>
      </div>

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
                  {v.name} — ₦{Number(v.variation_amount).toLocaleString()}
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
          <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 12px' }}>Total: ₦{amount.toLocaleString()}</p>
        )}

        <button className="btn" type="submit" disabled={submitting || !amount}>
          {submitting ? 'Processing…' : `Pay ₦${amount.toLocaleString()}`}
        </button>
      </form>
    </div>
  );
}
