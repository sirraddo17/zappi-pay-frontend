import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { getSettings, updateSettings } from '../../api';

export default function AdminSettings() {
  const [vtpassMode, setVtpassMode] = useState('sandbox');
  const [vtpassApiKey, setVtpassApiKey] = useState('');
  const [vtpassSecretKey, setVtpassSecretKey] = useState('');
  const [vtpassPublicKey, setVtpassPublicKey] = useState('');
  const [markupPercent, setMarkupPercent] = useState('0');
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
        setMarkupPercent(String(s.markupPercent ?? 0));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
        markupPercent: Number(markupPercent),
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
          <input id="apiKey" type="password" value={vtpassApiKey} onChange={(e) => setVtpassApiKey(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="secretKey">Secret key</label>
          <input id="secretKey" type="password" value={vtpassSecretKey} onChange={(e) => setVtpassSecretKey(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="publicKey">Public key</label>
          <input id="publicKey" type="password" value={vtpassPublicKey} onChange={(e) => setVtpassPublicKey(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="markup">Markup (%)</label>
          <input id="markup" type="number" step="0.1" min="0" value={markupPercent} onChange={(e) => setMarkupPercent(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </AdminLayout>
  );
}
