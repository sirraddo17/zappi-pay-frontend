import { useEffect, useState } from 'react';
import PasswordField from '../../components/PasswordField';
import AdminLayout from '../../components/AdminLayout';
import { getSettings, updateSettings } from '../../api';

const SERVICES = ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION'];

export default function AdminSettings() {
  const [vtpassMode, setVtpassMode] = useState('sandbox');
  const [vtpassApiKey, setVtpassApiKey] = useState('');
  const [vtpassSecretKey, setVtpassSecretKey] = useState('');
  const [vtpassPublicKey, setVtpassPublicKey] = useState('');
  const [markupByService, setMarkupByService] = useState(
    Object.fromEntries(SERVICES.map((s) => [s, '0']))
  );
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function setMarkupFor(service, value) {
    setMarkupByService((prev) => ({ ...prev, [service]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
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
            <label htmlFor={`markup-${service}`}>{service.charAt(0) + service.slice(1).toLowerCase()}</label>
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

        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </AdminLayout>
  );
}
