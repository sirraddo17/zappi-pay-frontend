import { useEffect, useState } from 'react';
import { getSettings, updateSettings, testAiConnection, getAiUsage } from '../api';

// Settings → AI Assistant. The saved key is never shown again — only
// its last 4 characters.
export default function AiSettingsPanel() {
  const [loaded, setLoaded] = useState(false);
  const [keySet, setKeySet] = useState(false);
  const [keyHint, setKeyHint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [customerOn, setCustomerOn] = useState(false);
  const [adminOn, setAdminOn] = useState(false);
  const [customerModel, setCustomerModel] = useState('claude-haiku-4-5');
  const [adminModel, setAdminModel] = useState('claude-sonnet-5');
  const [dailyLimit, setDailyLimit] = useState('20');
  const [budget, setBudget] = useState('10');
  const [usage, setUsage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [test, setTest] = useState(null);

  function apply(s) {
    setKeySet(Boolean(s.aiApiKeySet));
    setKeyHint(s.aiApiKeyHint || '');
    setCustomerOn(Boolean(s.aiCustomerEnabled));
    setAdminOn(Boolean(s.aiAdminEnabled));
    setCustomerModel(s.aiCustomerModel || 'claude-haiku-4-5');
    setAdminModel(s.aiAdminModel || 'claude-sonnet-5');
    setDailyLimit(String(s.aiCustomerDailyLimit ?? 20));
    setBudget(String(Number(s.aiMonthlyBudgetUsd ?? 10)));
  }

  useEffect(() => {
    getSettings().then((d) => { apply(d.settings); setLoaded(true); }).catch((err) => setMsg({ ok: false, text: err.message }));
    getAiUsage().then(setUsage).catch(() => {});
  }, []);

  async function save(e, extra = {}) {
    e?.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const d = await updateSettings({
        ...(apiKey.trim() ? { aiApiKey: apiKey.trim() } : {}),
        aiCustomerEnabled: customerOn,
        aiAdminEnabled: adminOn,
        aiCustomerModel: customerModel.trim(),
        aiAdminModel: adminModel.trim(),
        aiCustomerDailyLimit: Number(dailyLimit),
        aiMonthlyBudgetUsd: Number(budget),
        ...extra,
      });
      apply(d.settings);
      setApiKey('');
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function runTest(model) {
    setTest({ running: true });
    try {
      const r = await testAiConnection(model);
      setTest({ ok: true, text: `Connected ✓ (${r.model})` });
      getAiUsage().then(setUsage).catch(() => {});
    } catch (err) {
      setTest({ ok: false, text: err.message });
    }
  }

  if (!loaded) return <p className="empty-state">{msg?.text || 'Loading…'}</p>;

  const pct = usage && usage.budgetUsd > 0 ? Math.min(100, Math.round((usage.monthUsd / usage.budgetUsd) * 100)) : null;

  return (
    <form className="card" style={{ margin: 0, maxWidth: 520 }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>AI Assistant (Claude)</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -4 }}>
        Answers customer questions in the Help chat (using their own orders and wallet) and your business questions under AI Assistant. It can only look things up; it can never move money or change anything.
      </p>
      {msg && <p style={{ color: msg.ok ? 'var(--green-500)' : 'var(--red-500)', fontSize: 14 }}>{msg.text}</p>}

      <div className="field">
        <label htmlFor="aiKey">Claude API key</label>
        <input id="aiKey" type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={keySet ? `Saved (${keyHint}) — paste a new one to replace` : 'sk-ant-…'} />
        <small style={{ color: 'var(--slate-400)' }}>
          From console.anthropic.com → API Keys. Set a monthly spend limit there too.{' '}
          {keySet && (
            <button type="button" onClick={(e) => { if (window.confirm('Remove the saved key? The assistant will stop working.')) save(e, { aiApiKeyClear: true, aiCustomerEnabled: false, aiAdminEnabled: false }); }} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', padding: 0, fontSize: 12 }}>
              Remove key
            </button>
          )}
        </small>
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input type="checkbox" checked={customerOn} onChange={(e) => setCustomerOn(e.target.checked)} style={{ width: 'auto' }} />
        Customer assistant (Help chat in the app)
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input type="checkbox" checked={adminOn} onChange={(e) => setAdminOn(e.target.checked)} style={{ width: 'auto' }} />
        Admin assistant (AI Assistant page + “Draft with AI” on support tickets)
      </label>

      <div className="field">
        <label htmlFor="aiDaily">Messages per customer per day</label>
        <input id="aiDaily" type="number" min="1" max="500" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
        <small style={{ color: 'var(--slate-400)' }}>After this, the chat switches to the built-in quick answers until tomorrow.</small>
      </div>
      <div className="field">
        <label htmlFor="aiBudget">Monthly budget (US$)</label>
        <input id="aiBudget" type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} />
        <small style={{ color: 'var(--slate-400)' }}>The assistant pauses for the rest of the month once estimated usage reaches this. 0 = no app limit.</small>
      </div>

      <details style={{ marginBottom: 12 }}>
        <summary style={{ cursor: 'pointer', fontSize: 14 }}>Models (advanced)</summary>
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="aiCm">Customer model (fast and cheap)</label>
          <input id="aiCm" value={customerModel} onChange={(e) => setCustomerModel(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="aiAm">Admin model (smarter)</label>
          <input id="aiAm" value={adminModel} onChange={(e) => setAdminModel(e.target.value)} />
        </div>
        <small style={{ color: 'var(--slate-400)' }}>Defaults: claude-haiku-4-5 for customers, claude-sonnet-5 for admin. Use “Test” after changing.</small>
      </details>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={saving}>{saving ? 'Saving…' : 'Save AI Settings'}</button>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} disabled={!keySet || test?.running} onClick={() => runTest(customerModel)}>
          {test?.running ? 'Testing…' : 'Test connection'}
        </button>
      </div>
      {test && !test.running && <p style={{ fontSize: 13, margin: '8px 0 0', color: test.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{test.text}</p>}
      {!keySet && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '8px 0 0' }}>Save a key first, then test.</p>}

      {usage && (
        <div style={{ borderTop: '1px solid var(--slate-700)', marginTop: 16, paddingTop: 12, fontSize: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>This month</div>
          <div>{usage.monthMessages.toLocaleString()} AI replies · about <strong>${usage.monthUsd.toFixed(2)}</strong>{usage.budgetUsd > 0 ? ` of $${usage.budgetUsd}` : ''} · {usage.todayMessages} today</div>
          {pct !== null && (
            <div style={{ height: 6, background: 'var(--slate-700)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? 'var(--red-500)' : 'var(--purple)' }} />
            </div>
          )}
          {usage.byType && (
            <div style={{ color: 'var(--slate-400)', fontSize: 12, marginTop: 6 }}>
              {Object.entries(usage.byType).map(([k, v]) => `${k === 'CUSTOMER' ? 'Customers' : k === 'ADMIN' ? 'Admin' : 'Tests'}: ${v.messages} ($${v.usd.toFixed(2)})`).join(' · ')}
            </div>
          )}
          <div style={{ color: 'var(--slate-400)', fontSize: 11, marginTop: 4 }}>Estimate only; your Anthropic console shows the real bill.</div>
        </div>
      )}
    </form>
  );
}
