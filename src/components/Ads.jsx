import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAds, adImageUrl, clickAd } from '../api';
import { cached } from '../lib/cache';

const SEEN_KEY = 'zappipay_popup_ads_seen';

function seenList() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  } catch {
    return [];
  }
}
function markSeen(id) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seenList(), id].slice(-50)));
  } catch {
    // ignore
  }
}

function useAds() {
  const [ads, setAds] = useState([]);
  useEffect(() => {
    cached('ads', getAds, (d) => setAds(d.ads || []), 24 * 3600 * 1000).catch(() => {});
  }, []);
  return ads;
}

function useOpenAd() {
  const navigate = useNavigate();
  return (ad) => {
    clickAd(ad.id);
    if (!ad.linkUrl) return;
    if (ad.linkUrl.startsWith('/')) navigate(ad.linkUrl);
    else window.open(ad.linkUrl, '_blank', 'noopener');
  };
}

function AdSlide({ ad, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(ad)}
      style={{ flex: '0 0 100%', scrollSnapAlign: 'center', border: 'none', padding: 0, background: 'var(--slate-800)', borderRadius: 16, overflow: 'hidden', cursor: ad.linkUrl ? 'pointer' : 'default', textAlign: 'left', color: 'inherit' }}
      aria-label={ad.title}
    >
      {ad.hasImage ? (
        <img src={adImageUrl(ad)} alt={ad.title} loading="lazy" style={{ display: 'block', width: '100%', aspectRatio: '2 / 1', objectFit: 'cover' }} />
      ) : (
        <div style={{ padding: 16, background: 'linear-gradient(135deg, #863bff, #5b1fc4)', color: '#fff', minHeight: 110 }}>
          <b style={{ fontSize: 16 }}>{ad.title}</b>
          {ad.body && <div style={{ fontSize: 13, marginTop: 4, opacity: 0.95 }}>{ad.body}</div>}
          {ad.buttonText && <div style={{ marginTop: 10, display: 'inline-block', background: '#FFB830', color: '#2a0b66', fontWeight: 700, fontSize: 13, padding: '6px 12px', borderRadius: 999 }}>{ad.buttonText}</div>}
        </div>
      )}
    </button>
  );
}

// Home-screen slider of adverts/announcements (swipe, auto-advances).
export function AdsCarousel() {
  const ads = useAds().filter((a) => a.placement === 'HOME' || a.placement === 'BOTH');
  const open = useOpenAd();
  const track = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (ads.length < 2) return undefined;
    const t = setInterval(() => {
      const el = track.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % ads.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  if (!ads.length) return null;
  return (
    <div style={{ margin: '16px 16px 0' }}>
      <div
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollSnapType: 'x mandatory', borderRadius: 16, scrollbarWidth: 'none' }}
      >
        {ads.map((ad) => <AdSlide key={ad.id} ad={ad} onOpen={open} />)}
      </div>
      {ads.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {ads.map((a, i) => <span key={a.id} style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, background: i === index ? 'var(--purple)' : 'var(--slate-600, #475569)', transition: 'width .2s' }} />)}
        </div>
      )}
    </div>
  );
}

// A one-time pop-up for a big announcement (shown once per advert).
export function AdPopup() {
  const ads = useAds();
  const open = useOpenAd();
  const [ad, setAd] = useState(null);

  useEffect(() => {
    const seen = new Set(seenList());
    const next = ads.find((a) => (a.placement === 'POPUP' || a.placement === 'BOTH') && !seen.has(a.id));
    if (!next) return undefined;
    const t = setTimeout(() => setAd(next), 1200);
    return () => clearTimeout(t);
  }, [ads]);

  if (!ad) return null;
  function close() {
    markSeen(ad.id);
    setAd(null);
  }
  return (
    <div role="dialog" aria-label={ad.title} onClick={(e) => e.target === e.currentTarget && close()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(420px, 100%)', background: 'var(--slate-800)', borderRadius: 18, overflow: 'hidden', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <button type="button" aria-label="Close" onClick={close} style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 20, cursor: 'pointer', zIndex: 1 }}>×</button>
        {ad.hasImage && <img src={adImageUrl(ad)} alt="" style={{ display: 'block', width: '100%', maxHeight: '55vh', objectFit: 'cover' }} />}
        <div style={{ padding: 16 }}>
          <b style={{ fontSize: 18 }}>{ad.title}</b>
          {ad.body && <p style={{ fontSize: 14, color: 'var(--slate-300, #cbd5e1)', margin: '6px 0 0' }}>{ad.body}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {ad.linkUrl && (
              <button type="button" className="btn" onClick={() => { close(); open(ad); }}>
                {ad.buttonText || 'Check it out'}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={close}>{ad.linkUrl ? 'Later' : 'OK'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
