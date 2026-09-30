import { useEffect, useState } from 'react';
import { getHeygenStatus, updateHeygenSettings, getHeygenAvatars, getHeygenVoices } from '../../api';

// Settings → AI Assistant → 🎥 HeyGen. Optional: stays off until a key
// is saved and the switch is on. The key is never shown again.
export default function HeygenSettingsPanel() {
  const [st, setSt] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [on, setOn] = useState(false);
  const [budget, setBudget] = useState('10');
  const [price, setPrice] = useState('1');
  const [avatarId, setAvatarId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [avatars, setAvatars] = useState(null);
  const [voices, setVoices] = useState(null);
  const [q, setQ] = useState('');
  const [vq, setVq] = useState('');
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  function apply(s) {
    setSt(s);
    setOn(s.enabled);
    setBudget(String(s.budgetUsd));
    setPrice(String(s.pricePerMinUsd));
    setAvatarId(s.avatarId || '');
    setVoiceId(s.voiceId || '');
  }
  function loadLists() {
    getHeygenAvatars().then((d) => setAvatars(d.avatars)).catch((e) => setMsg({ ok: false, text: e.message }));
    getHeygenVoices().then((d) => setVoices(d.voices)).catch(() => {});
  }
  useEffect(() => {
    getHeygenStatus().then((s) => { apply(s); if (s.keySet) loadLists(); }).catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);

  async function save(e, extra = {}) {
    e?.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const s = await updateHeygenSettings({ ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}), enabled: on, budgetUsd: Number(budget), pricePerMinUsd: Number(price), avatarId, voiceId, ...extra });
      const hadKey = st?.keySet;
      apply(s);
      setApiKey('');
      setMsg({ ok: true, text: 'Saved.' });
      if (s.keySet && !hadKey) loadLists();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (!st) return <p className="empty-state">{msg?.text || 'Loading…'}</p>;
  const pct = st.budgetUsd > 0 ? Math.min(100, Math.round((st.monthUsd / st.budgetUsd) * 100)) : null;
  const shownAvatars = (avatars || []).filter((a) => !q || `${a.name} ${a.gender || ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  const shownVoices = (voices || []).filter((v) => !vq || `${v.name} ${v.language || ''} ${v.gender || ''}`.toLowerCase().includes(vq.toLowerCase())).slice(0, 200);

  return (
    <form className="card" style={{ margin: 0, maxWidth: 560 }} onSubmit={save}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>🎥 HeyGen presenter videos (optional)</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -4 }}>
        Lets Ad Studio and the AI assistant turn a script into a real-looking talking-presenter video. HeyGen charges you directly (about $1 per minute of video on pay-as-you-go). Leave it off until you need it — the free script writer works without it.
      </p>
      {msg && <p style={{ color: msg.ok ? 'var(--green-500)' : 'var(--red-500)', fontSize: 14 }}>{msg.text}</p>}

      <div className="field">
        <label htmlFor="hgKey">HeyGen API key</label>
        <input id="hgKey" type="password" autoComplete="new-password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={st.keySet ? `Saved (${st.keyHint}) — paste a new one to replace` : 'From app.heygen.com → Settings → API'} />
        <small style={{ color: 'var(--slate-400)' }}>
          Set a spending limit in your HeyGen account too.{' '}
          {st.keySet && <button type="button" onClick={(e) => { if (window.confirm('Remove the HeyGen key? Video making will stop.')) save(e, { apiKeyClear: true, enabled: false }); }} style={{ background: 'none', border: 'none', color: 'var(--red-500)', cursor: 'pointer', padding: 0, fontSize: 12 }}>Remove key</button>}
        </small>
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} style={{ width: 'auto' }} />
        Turn on HeyGen videos
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label htmlFor="hgBudget">Monthly budget (US$)</label>
          <input id="hgBudget" type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <small style={{ color: 'var(--slate-400)' }}>No new videos once reached. 0 = no app limit.</small>
        </div>
        <div className="field">
          <label htmlFor="hgPrice">Your HeyGen price per minute ($)</label>
          <input id="hgPrice" type="number" min="0.1" step="0.1" value={price} onChange={(e) => setPrice(e.target.value)} />
          <small style={{ color: 'var(--slate-400)' }}>For cost estimates. Check your HeyGen plan.</small>
        </div>
      </div>

      {st.keySet && (
        <>
          <div className="field">
            <label htmlFor="hgQ">Default presenter</label>
            {avatars === null ? <small style={{ color: 'var(--slate-400)' }}>Loading presenters…</small> : (
              <>
                <input id="hgQ" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search presenters (name, female, male)" style={{ marginBottom: 8 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                  {shownAvatars.map((a) => (
                    <button key={a.id} type="button" onClick={() => setAvatarId(a.id)} title={a.name} style={{ padding: 4, borderRadius: 10, cursor: 'pointer', background: 'var(--slate-800)', border: `2px solid ${avatarId === a.id ? 'var(--purple)' : 'transparent'}`, color: 'var(--slate-100)', fontSize: 11 }}>
                      {a.preview ? <img src={a.preview} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, display: 'block' }} /> : <div style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🧑🏾</div>}
                      <span style={{ display: 'block', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                    </button>
                  ))}
                </div>
                {!shownAvatars.length && <small style={{ color: 'var(--slate-400)' }}>No presenters found.</small>}
              </>
            )}
          </div>
          <div className="field">
            <label htmlFor="hgVq">Default voice</label>
            <input id="hgVq" value={vq} onChange={(e) => setVq(e.target.value)} placeholder="Search voices (e.g. Nigerian, English, female)" style={{ marginBottom: 6 }} />
            <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
              <option value="">{voices === null ? 'Loading…' : 'Choose a voice…'}</option>
              {shownVoices.map((v) => <option key={v.id} value={v.id}>{v.name}{v.language ? ` · ${v.language}` : ''}{v.gender ? ` · ${v.gender}` : ''}</option>)}
            </select>
            {voiceId && voices?.find((v) => v.id === voiceId)?.preview && <audio src={voices.find((v) => v.id === voiceId).preview} controls style={{ width: '100%', marginTop: 6 }} />}
          </div>
        </>
      )}

      <button className="btn" type="submit" style={{ width: 'auto' }} disabled={saving}>{saving ? 'Saving…' : 'Save HeyGen settings'}</button>

      {st.keySet && (
        <div style={{ borderTop: '1px solid var(--slate-700)', marginTop: 16, paddingTop: 12, fontSize: 14 }}>
          This month: about <strong>${st.monthUsd.toFixed(2)}</strong>{st.budgetUsd > 0 ? ` of $${st.budgetUsd}` : ''}
          {pct !== null && <div style={{ height: 6, background: 'var(--slate-700)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? 'var(--red-500)' : 'var(--purple)' }} /></div>}
          <div style={{ color: 'var(--slate-400)', fontSize: 11, marginTop: 4 }}>Estimate only; your HeyGen account shows the real bill.</div>
        </div>
      )}
    </form>
  );
}
