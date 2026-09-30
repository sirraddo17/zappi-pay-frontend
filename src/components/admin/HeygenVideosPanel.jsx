import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHeygenStatus, getHeygenVideos, makeHeygenVideo, refreshHeygenVideo, attachHeygenVideo, getAdminAds } from '../../api';

const ASPECTS = [['9:16', 'Tall — TikTok / Reels / Status'], ['1:1', 'Square — feed'], ['16:9', 'Wide — YouTube / Facebook']];
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

// Ad Studio → 🎥 HeyGen videos. Hidden until HeyGen is set up.
export default function HeygenVideosPanel({ draft }) {
  const [st, setSt] = useState(null);
  const [videos, setVideos] = useState([]);
  const [script, setScript] = useState('');
  const [title, setTitle] = useState('');
  const [aspect, setAspect] = useState('9:16');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ads, setAds] = useState(null);
  const [attachFor, setAttachFor] = useState('');
  const box = useRef(null);

  const load = () => getHeygenVideos().then((d) => setVideos(d.videos)).catch(() => {});
  useEffect(() => {
    getHeygenStatus().then((s) => { setSt(s); if (s.keySet) load(); }).catch(() => setSt({ ready: false }));
  }, []);
  useEffect(() => {
    if (draft?.script) {
      setScript(draft.script);
      setTitle(draft.title || '');
      box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [draft]);
  // Check unfinished videos every 20 s.
  useEffect(() => {
    const pending = videos.filter((v) => v.status === 'PROCESSING' || v.status === 'PENDING');
    if (!pending.length) return undefined;
    const t = setTimeout(async () => {
      const fresh = await Promise.all(pending.map((v) => refreshHeygenVideo(v.id).then((d) => d.video).catch(() => v)));
      setVideos((list) => list.map((v) => fresh.find((f) => f.id === v.id) || v));
    }, 20000);
    return () => clearTimeout(t);
  }, [videos]);

  if (!st) return null;
  if (!st.ready) {
    return (
      <div className="card" style={{ margin: '16px 0 0', fontSize: 13, color: 'var(--slate-400)' }}>
        🎥 <b style={{ color: 'var(--slate-100)' }}>HeyGen videos</b> — turn the script into a presenter video right here. {st.keySet ? 'Turn HeyGen on' : 'Add your HeyGen API key'} in <Link to="/admin/settings" style={{ color: 'var(--purple)' }}>Settings → AI Assistant</Link> when you need it. Until then, paste the script on heygen.com.
      </div>
    );
  }

  const est = Math.max(0.25, words(script) / 150) * st.pricePerMinUsd;
  const secs = Math.round(Math.max(0.25, words(script) / 150) * 60);

  async function make(e) {
    e.preventDefault();
    if (!window.confirm(`Make this video on HeyGen? About ${secs}s, costs about $${est.toFixed(2)}.`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const d = await makeHeygenVideo({ script, title, aspect });
      setVideos((v) => [d.video, ...v]);
      setMsg({ ok: true, text: 'Started — HeyGen usually takes 2–10 minutes. It will appear below.' });
      getHeygenStatus().then(setSt).catch(() => {});
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function attach(v, adId) {
    if (!adId) return;
    try {
      await attachHeygenVideo(v.id, adId);
      setMsg({ ok: true, text: 'Added to the in-app advert. It shows only if “Show video adverts” is on (In-app Ads).' });
      setAttachFor('');
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  }

  return (
    <div className="card" style={{ margin: '16px 0 0' }} ref={box}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>🎥 HeyGen presenter videos</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, marginTop: -4 }}>This month: about ${st.monthUsd.toFixed(2)}{st.budgetUsd ? ` of $${st.budgetUsd}` : ''}. Uses your default presenter and voice (change in Settings → AI Assistant).</p>
      {msg && <p style={{ color: msg.ok ? 'var(--green-500)' : 'var(--red-500)', fontSize: 14 }}>{msg.text}</p>}
      <form onSubmit={make}>
        <div className="field"><label htmlFor="hgT">Title</label><input id="hgT" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Print cards — Pidgin" /></div>
        <div className="field">
          <label htmlFor="hgS">What the presenter says</label>
          <textarea id="hgS" rows={5} maxLength={1500} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Write it here, or tap “Make with HeyGen” on a script above." style={{ width: '100%', fontSize: 14 }} />
          <small style={{ color: 'var(--slate-400)' }}>{words(script)} words ≈ {secs}s · about ${est.toFixed(2)}</small>
        </div>
        <div className="field"><label htmlFor="hgA">Shape</label><select id="hgA" value={aspect} onChange={(e) => setAspect(e.target.value)}>{ASPECTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <button className="btn" type="submit" style={{ width: 'auto' }} disabled={busy || words(script) < 3}>{busy ? 'Starting…' : '🎥 Make video'}</button>
      </form>

      {videos.length > 0 && (
        <div style={{ borderTop: '1px solid var(--slate-700)', marginTop: 16, paddingTop: 12, display: 'grid', gap: 10 }}>
          {videos.map((v) => (
            <div key={v.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
              {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} /> : <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--slate-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{v.status === 'FAILED' ? '⚠️' : '⏳'}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{v.title}</b>
                <div style={{ color: v.status === 'COMPLETED' ? 'var(--green-500)' : v.status === 'FAILED' ? 'var(--red-500)' : 'var(--gold)', fontSize: 12 }}>
                  {v.status === 'COMPLETED' ? `Ready · ${Math.round(v.duration || 0)}s · $${(v.costUsd ?? v.estUsd).toFixed(2)}` : v.status === 'FAILED' ? `Failed: ${v.error || ''}` : 'Making… (checks every 20 s)'}
                  {' · '}{new Date(v.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                {v.status === 'COMPLETED' && v.videoUrl && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                    <a href={v.videoUrl} target="_blank" rel="noreferrer" className="btn" style={{ width: 'auto', padding: '4px 12px', fontSize: 12, textDecoration: 'none' }}>▶ Play / download</a>
                    {attachFor === v.id ? (
                      <select defaultValue="" onChange={(e) => attach(v, e.target.value)} style={{ width: 'auto', fontSize: 12 }}>
                        <option value="">{ads === null ? 'Loading adverts…' : 'Choose an in-app advert…'}</option>
                        {(ads || []).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                      </select>
                    ) : (
                      <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '4px 12px', fontSize: 12 }} onClick={() => { setAttachFor(v.id); if (ads === null) getAdminAds().then((d) => setAds(d.ads)).catch(() => setAds([])); }}>Use in an in-app advert</button>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>HeyGen’s link expires in 7 days — download it.</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
