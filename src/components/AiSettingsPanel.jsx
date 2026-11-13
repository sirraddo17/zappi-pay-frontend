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
  const [chatBuyOn, setChatBuyOn] = useState(true);
  const [adminOn, setAdminOn] = useState(false);
  const [briefOn, setBriefOn] = useState(true);
  const [translateOn, setTranslateOn] = useState(true);
  const [customerModel, setCustomerModel] = useState('claude-haiku-4-5');
  const [adminModel, setAdminModel] = useState('claude-sonnet-5');
  const [dailyLimit, setDailyLimit] = useState('20');
  const [budget, setBudget] = useState('10');
  const [usage, setUsage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [test, setTest] = useState(null);
  // Google Gemini: key, models, and which provider each assistant tries first.
  const [gKeySet, setGKeySet] = useState(false);
  const [gKeyHint, setGKeyHint] = useState('');
  const [gKey, setGKey] = useState('');
  const [showG, setShowG] = useState(false);
  const [showC, setShowC] = useState(false);
  const [gCustModel, setGCustModel] = useState('gemini-3.8-flash');
  const [gAdminModel, setGAdminModel] = useState('gemini-3.8-flash');
  const [custProvider, setCustProvider] = useState('gemini');
  const [adminProvider, setAdminProvider] = useState('gemini');

  function apply(s) {
    setKeySet(Boolean(s.aiApiKeySet));
    setKeyHint(s.aiApiKeyHint || '');
    setCustomerOn(Boolean(s.aiCustomerEnabled));
    setChatBuyOn(s.aiChatBuyEnabled !== false);
    setAdminOn(Boolean(s.aiAdminEnabled));
    setBriefOn(s.aiBriefingEnabled !== false);
    setTranslateOn(s.aiTranslateBroadcasts !== false);
    setCustomerModel(s.aiCustomerModel || 'claude-haiku-4-5');
    setAdminModel(s.aiAdminModel || 'claude-sonnet-5');
    setGKeySet(Boolean(s.geminiApiKeySet || s.geminiFromEnv));
    setGKeyHint(s.geminiApiKeyHint || (s.geminiFromEnv ? 'server settings' : ''));
    setGCustModel(s.geminiCustomerModel || 'gemini-3.8-flash');
    setGAdminModel(s.geminiAdminModel || 'gemini-3.8-flash');
    setCustProvider(s.aiCustomerProvider || 'gemini');
    setAdminProvider(s.aiAdminProvider || 'gemini');
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
        ...(gKey.trim() ? { geminiApiKey: gKey.trim() } : {}),
        geminiCustomerModel: gCustModel.trim(),
        geminiAdminModel: gAdminModel.trim(),
        aiCustomerProvider: custProvider,
        aiAdminProvider: adminProvider,
        aiCustomerEnabled: customerOn,
        aiChatBuyEnabled: chatBuyOn,
        aiAdminEnabled: adminOn,
        aiBriefingEnabled: briefOn,
        aiTranslateBroadcasts: translateOn,
        aiCustomerModel: customerModel.trim(),
        aiAdminModel: adminModel.trim(),
        aiCustomerDailyLimit: Number(dailyLimit),
        aiMonthlyBudgetUsd: Number(budget),
        ...extra,
      });
      apply(d.settings);
      setApiKey('');
      setGKey('');
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function runTest(model, provider) {
    setTest({ running: true });
    try {
      const r = await testAiConnection(model, provider);
      setTest({ ok: true, text: `${r.provider === 'gemini' ? 'Gemini' : 'Claude'} connected ✓ (${r.model})${r.note ? ` — ${r.note}` : ''}` });
      getAiUsage().then(setUsage).catch(() => {});
    } catch (err) {
      setTest({ ok: false, text: err.message });
    }
  }

  if (!loaded) return <p className="empty-state">{msg?.text || 'Loading…'}</p>;

  const pct = usage && usage.budgetUsd > 0 ? Math.min(100, Math.round((usage.monthUsd / usage.budgetUsd) * 100)) : null;

  return (
    <form className="card" style={{ margin: 0, maxWidth: 520 }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>AI Assistant (Gemini + Claude)</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -4 }}>
        Answers customer questions in the Help chat (using their own orders and wallet) and your business questions under AI Assistant. It can only look things up; it can never move money or change anything.
      </p>
      {msg && <p style={{ color: msg.ok ? 'var(--green-500)' : 'var(--red-500)', fontSize: 14 }}>{msg.text}</p>}

      <div className="card" style={{ margin: '0 0 12px', padding: 12, background: 'rgba(13,148,136,0.06)' }}>
        <b style={{ fontSize: 14 }}>Google Gemini</b>
        <div className="field" style={{ marginTop: 6 }}>
          <label htmlFor="gKey">Gemini API key</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input id="gKey" type={showG ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={gKey} onChange={(e) => setGKey(e.target.value.trim())} placeholder={gKeySet ? `Saved (${gKeyHint}) — paste a new one to replace` : 'AIza… or AQ.…'} style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} onClick={() => setShowG((v) => !v)} aria-label={showG ? 'Hide key' : 'Show key'}>{showG ? '🙈 Hide' : '👁 Show'}</button>
          </div>
          <small style={{ color: 'var(--slate-400)' }}>
            From aistudio.google.com → Get API key. Set a budget/limit in Google Cloud billing too.{' '}
            {gKeySet && !gKeyHint.startsWith('server') && (
              <button type="button" onClick={(e) => { if (window.confirm('Remove the Gemini key? The assistant will use Claude only.')) save(e, { geminiApiKeyClear: true }); }} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', padding: 0, fontSize: 12 }}>Remove key</button>
            )}
          </small>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 180px', margin: 0 }}><label htmlFor="gCm">Gemini model — customers</label><input id="gCm" value={gCustModel} onChange={(e) => setGCustModel(e.target.value)} /></div>
          <div className="field" style={{ flex: '1 1 180px', margin: 0 }}><label htmlFor="gAm">Gemini model — admin</label><input id="gAm" value={gAdminModel} onChange={(e) => setGAdminModel(e.target.value)} /></div>
        </div>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto', marginTop: 8 }} disabled={!gKeySet || test?.running} onClick={() => runTest(gCustModel, 'gemini')}>Test Gemini</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <div className="field" style={{ flex: '1 1 200px', margin: 0 }}>
            <label htmlFor="pCust">Customer chat answers with</label>
            <select id="pCust" value={custProvider} onChange={(e) => setCustProvider(e.target.value)}>
              <option value="gemini">Gemini first, Claude if busy</option>
              <option value="claude">Claude first, Gemini if busy</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 200px', margin: 0 }}>
            <label htmlFor="pAdmin">Admin &amp; support assistant answers with</label>
            <select id="pAdmin" value={adminProvider} onChange={(e) => setAdminProvider(e.target.value)}>
              <option value="gemini">Gemini first, Claude if busy</option>
              <option value="claude">Claude first, Gemini if busy</option>
            </select>
          </div>
        </div>
        <small style={{ color: 'var(--slate-400)', display: 'block', marginTop: 6 }}>If the first one is busy, out of credit or failing, the other answers by itself (only providers with a saved key are used). The monthly budget below covers both.</small>
      </div>

      <div className="field">
        <label htmlFor="aiKey">Claude API key</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input id="aiKey" type={showC ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={apiKey} onChange={(e) => setApiKey(e.target.value.trim())} placeholder={keySet ? `Saved (${keyHint}) — paste a new one to replace` : 'sk-ant-…'} style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} onClick={() => setShowC((v) => !v)} aria-label={showC ? 'Hide key' : 'Show key'}>{showC ? '🙈 Hide' : '👁 Show'}</button>
        </div>
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
      {customerOn && (
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 0 8px 26px', fontSize: 14 }}>
          <input type="checkbox" checked={chatBuyOn} onChange={(e) => setChatBuyOn(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
          <span>Buy &amp; send by chat — the assistant can prepare airtime, data and electricity purchases (“₦500 MTN to Mum”) and transfers to ZAPPI PAY users or any bank (“send ₦2,000 to 0123456789 GTBank”), checking the real account name. The customer checks a card and confirms with their PIN; the AI never pays or sends by itself.</span>
        </label>
      )}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input type="checkbox" checked={adminOn} onChange={(e) => setAdminOn(e.target.checked)} style={{ width: 'auto' }} />
        Admin assistant (AI Assistant page + “Draft with AI” on support tickets)
      </label>
      {adminOn && (
        <>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 0 8px 26px', fontSize: 14 }}>
            <input type="checkbox" checked={briefOn} onChange={(e) => setBriefOn(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
            <span>✨ Morning briefing — a short AI summary of what matters today at the top of the daily email, plus a push notification.</span>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 0 12px 26px', fontSize: 14 }}>
            <input type="checkbox" checked={translateOn} onChange={(e) => setTranslateOn(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
            <span>🗣️ Translate broadcasts — customers who use Pidgin, Yorùbá, Hausa or Igbo get your messages in their language.</span>
          </label>
        </>
      )}

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
              {Object.entries(usage.byType).map(([k, v]) => `${k === 'CUSTOMER' ? 'Customers' : k === 'ADMIN' ? 'Admin' : k === 'VOICE' ? 'Voice' : 'Tests'}: ${v.messages} ($${v.usd.toFixed(2)})`).join(' · ')}
            </div>
          )}
          <div style={{ color: 'var(--slate-400)', fontSize: 11, marginTop: 4 }}>Estimate only; your Google AI Studio / Anthropic console show the real bill.</div>
        </div>
      )}
    </form>
  );
}
