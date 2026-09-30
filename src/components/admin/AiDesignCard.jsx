import { useEffect, useState } from 'react';
import { renderAdSize } from '../../lib/adRender';
import { createAd } from '../../api';

// An advert the admin assistant designed, drawn at every size asked for.
export default function AiDesignCard({ design }) {
  const [previews, setPreviews] = useState({});
  const [msg, setMsg] = useState(null);
  const [placement, setPlacement] = useState('HOME');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try { await document.fonts?.load?.('700 40px Poppins'); } catch { /* ignore */ }
      for (const z of design.sizes) {
        const url = await renderAdSize(design, z.w, z.h, null, 'dataurl', 0.9);
        if (live) setPreviews((p) => ({ ...p, [`${z.w}x${z.h}`]: url }));
      }
    })();
    return () => { live = false; };
  }, [design]);

  async function download(z) {
    const blob = await renderAdSize(design, z.w, z.h, null, 'image/png');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zappipay-${design.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${z.w}x${z.h}.png`;
    a.click();
  }

  async function useInApp() {
    setBusy(true);
    setMsg(null);
    try {
      const size = placement === 'POPUP' ? { w: 1080, h: 1350 } : { w: 1200, h: 600 };
      const image = await renderAdSize(design, size.w, size.h, null, 'dataurl', 0.85);
      await createAd({ title: design.headline, body: design.subtext, buttonText: design.cta, linkUrl: design.link || '', placement, image, active: true });
      setMsg({ ok: true, text: 'Added to the app ✅ — manage it under In-app Ads.' });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 8, border: '1.5px solid var(--purple)', borderRadius: 12, padding: 12, maxWidth: 640 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>🎨 {design.headline}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {design.sizes.map((z) => {
          const src = previews[`${z.w}x${z.h}`];
          return (
            <div key={`${z.w}x${z.h}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {src ? <img src={src} alt={`${z.label} preview`} style={{ width: '100%', aspectRatio: `${z.w} / ${z.h}`, objectFit: 'contain', borderRadius: 8, background: 'var(--slate-900)' }} />
                : <div style={{ width: '100%', aspectRatio: `${z.w} / ${z.h}`, borderRadius: 8, background: 'var(--slate-900)' }} />}
              <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{z.label === `${z.w}×${z.h}` ? z.label : `${z.label} · ${z.w}×${z.h}`}</div>
              <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => download(z)}>⬇ Download</button>
            </div>
          );
        })}
      </div>
      {design.caption && <p style={{ fontSize: 13, background: 'var(--slate-900)', borderRadius: 8, padding: '8px 10px', margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{design.caption}</p>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
        {design.caption && <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} onClick={() => navigator.clipboard?.writeText(design.caption).then(() => setMsg({ ok: true, text: 'Caption copied.' }))}>Copy caption</button>}
        <select value={placement} onChange={(e) => setPlacement(e.target.value)} aria-label="Where in the app" style={{ width: 'auto', fontSize: 13 }}>
          <option value="HOME">In-app: top slider</option>
          <option value="BOTTOM">In-app: bottom banner</option>
          <option value="POPUP">In-app: pop-up</option>
        </select>
        <button type="button" className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }} disabled={busy} onClick={useInApp}>{busy ? 'Adding…' : 'Use in app'}</button>
      </div>
      {msg && <p style={{ fontSize: 13, margin: '8px 0 0', color: msg.ok ? 'var(--green-500)' : 'var(--red-500)' }}>{msg.text}</p>}
    </div>
  );
}
