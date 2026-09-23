import { useEffect, useState } from 'react';
import PasswordField from '../../components/PasswordField';
import AdminLayout from '../../components/AdminLayout';
import { getSettings, updateSettings, changeAdminPassword } from '../../api';

const SERVICES = ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION', 'INTERNET', 'BETTING'];

function serviceLabel(s) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export default function AdminSettings() {
  const [vtpassMode, setVtpassMode] = useState('sandbox');
  const [vtpassApiKey, setVtpassApiKey] = useState('');
  const [vtpassSecretKey, setVtpassSecretKey] = useState('');
  const [vtpassPublicKey, setVtpassPublicKey] = useState('');
  const [markupByService, setMarkupByService] = useState(
    Object.fromEntries(SERVICES.map((s) => [s, '0']))
  );
  const [discountByService, setDiscountByService] = useState(
    Object.fromEntries(SERVICES.map((s) => [s, '0']))
  );
  const [minFundingAmount, setMinFundingAmount] = useState('100');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('50');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    getSettings()
      .then((data) => {
        const s = data.settings;
        setVtpassMode(s.vtpassMode);
        setVtpassApiKey(s.vtpassApiKey || '');
        setVtpassSecretKey(s.vtpassSecretKey || '');
        setVtpassPublicKey(s.vtpassPublicKey || '');
        const stored = s.markupPercentByService || {};
        setMarkupByService(Object.fromEntries(SERVICES.map((svc) => [svc, String(stored[svc] ?? 0)])));
        const storedDiscount = s.discountPercentByService || {};
        setDiscountByService(Object.fromEntries(SERVICES.map((svc) => [svc, String(storedDiscount[svc] ?? 0)])));
        setMinFundingAmount(String(s.minFundingAmount ?? 100));
        setMinPurchaseAmount(String(s.minPurchaseAmount ?? 50));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function setMarkupFor(service, value) {
    setMarkupByService((prev) => ({ ...prev, [service]: value }));
  }

  function setDiscountFor(service, value) {
    setDiscountByService((prev) => ({ ...prev, [service]: value }));
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setChangingPassword(true);
    try {
      await changeAdminPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSuccess('Password changed.');
    } catch (err) {
      setPasswordError(err.message || 'Could not change password.');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    const badDiscount = SERVICES.find((svc) => {
      const n = Number(discountByService[svc] || 0);
      return !Number.isFinite(n) || n < 0 || n > 100;
    });
    if (badDiscount) {
      setError(`Discount for ${serviceLabel(badDiscount)} must be between 0 and 100.`);
      return;
    }
    setSaving(true);
    try {
      await updateSettings({
        vtpassMode,
        vtpassApiKey,
        vtpassSecretKey,
        vtpassPublicKey,
        markupPercentByService: Object.fromEntries(
          SERVICES.map((svc) => [svc, Number(markupByService[svc] || 0)])
        ),
        discountPercentByService: Object.fromEntries(
          SERVICES.map((svc) => [svc, Number(discountByService[svc] || 0)])
        ),
        minFundingAmount: Number(minFundingAmount || 0),
        minPurchaseAmount: Number(minPurchaseAmount || 0),
      });
      setSuccessMessage('Settings saved.');
    } catch (err) {
      setError(err.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <p className="empty-state">Loading…</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="page-header" style={{ padding: 0, marginBottom: 16 }}>
        <h1>Settings</h1>
        <p>VTpass credentials and pricing</p>
      </div>

      {error && <p className="error-text" style={{ margin: '0 0 12px' }}>{error}</p>}
      {successMessage && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 12px' }}>{successMessage}</p>}

      <form className="card" style={{ margin: 0, maxWidth: 480 }} onSubmit={handleSubmit}>
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

        <h2 style={{ fontSize: 15, marginBottom: 4 }}>Markup per service (%)</h2>
        <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          Added on top of VTpass's own price for that service.
        </p>
        {SERVICES.map((service) => (
          <div className="field" key={service}>
            <label htmlFor={`markup-${service}`}>{serviceLabel(service)}</label>
            <input
              id={`markup-${service}`}
              type="number"
              step="0.1"
              min="0"
              value={markupByService[service]}
              onChange={(e) => setMarkupFor(service, e.target.value)}
            />
          </div>
        ))}

        <h2 style={{ fontSize: 15, marginBottom: 4 }}>Discount per service (%)</h2>
        <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          Taken off the marked-up price automatically on every purchase of that service. Customers see a
          "% OFF" badge on the dashboard and the discounted total before paying. Set to 0 to end a discount.
        </p>
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
                onChange={(e) => setDiscountFor(service, e.target.value)}
              />
              {discount > 0 && net < 100 && (
                <p style={{ color: 'var(--orange)', fontSize: 12, margin: '4px 0 0' }}>
                  Heads up: this discount is bigger than the markup, so {serviceLabel(service)} sells below VTpass cost.
                </p>
              )}
            </div>
          );
        })}

        <div className="field">
          <label htmlFor="minFundingAmount">Minimum funding amount (₦)</label>
          <input
            id="minFundingAmount"
            type="number"
            step="1"
            min="0"
            value={minFundingAmount}
            onChange={(e) => setMinFundingAmount(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="minPurchaseAmount">Minimum purchase amount (₦)</label>
          <input
            id="minPurchaseAmount"
            type="number"
            step="1"
            min="0"
            value={minPurchaseAmount}
            onChange={(e) => setMinPurchaseAmount(e.target.value)}
          />
        </div>

        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      <form className="card" style={{ margin: 0, maxWidth: 480 }} onSubmit={handlePasswordChange}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Change My Password</h2>
        {passwordError && <p className="error-text" style={{ margin: '0 0 12px' }}>{passwordError}</p>}
        {passwordSuccess && <p style={{ color: 'var(--green-500)', fontSize: 14, margin: '0 0 12px' }}>{passwordSuccess}</p>}
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <PasswordField id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <div className="field">
          <label htmlFor="newPassword">New password</label>
          <PasswordField id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
        </div>
        <button className="btn" type="submit" disabled={changingPassword}>
          {changingPassword ? 'Saving…' : 'Change Password'}
        </button>
      </form>
    </AdminLayout>
  );
}
