import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAds, adImageUrl, adVideoUrl, clickAd, recordAdView } from '../api';
import { useLite } from '../lib/lite';
import { cached } from '../lib/cache';
import { useAppInfo } from './ServiceNotices';

const FEST_BG = { green: 'linear-gradient(135deg, #10b981, #047857)', red: 'linear-gradient(135deg, #ef4444, #991b1b)', gold: 'linear-gradient(135deg, #f59e0b, #b45309)', dark: 'linear-gradient(135deg, #334155, #0f172a)', blue: 'linear-gradient(135deg, #2563eb, #1e40af)', purple: 'linear-gradient(135deg, #863bff, #5b1fc4)' };

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
    if (!ad.builtIn) clickAd(ad.id);
    if (!ad.linkUrl) return;
    if (ad.linkUrl.startsWith('/')) navigate(ad.linkUrl);
    else window.open(ad.linkUrl, '_blank', 'noopener');
  };
}

function AdSlide({ ad, onOpen }) {
  const lite = useLite();
  return (
    <button
      type="button"
      onClick={() => onOpen(ad)}
      style={{ flex: '0 0 100%', scrollSnapAlign: 'center', border: 'none', padding: 0, background: 'var(--slate-800)', borderRadius: 16, overflow: 'hidden', cursor: ad.linkUrl ? 'pointer' : 'default', textAlign: 'left', color: 'inherit' }}
      aria-label={ad.title}
    >
      {ad.hasVideo && !lite ? (
        <video src={adVideoUrl(ad)} poster={ad.hasImage ? adImageUrl(ad) : undefined} autoPlay muted loop playsInline preload="metadata" aria-label={ad.title} style={{ display: 'block', width: '100%', aspectRatio: '2 / 1', objectFit: 'cover', background: '#000' }} />
      ) : ad.hasImage ? (
        <img src={adImageUrl(ad)} alt={ad.title} loading="lazy" style={{ display: 'block', width: '100%', aspectRatio: '2 / 1', objectFit: 'cover' }} />
      ) : (
        <div style={{ padding: 16, background: ad.bg || 'linear-gradient(135deg, #863bff, #5b1fc4)', color: '#fff', minHeight: 110, position: 'relative', overflow: 'hidden' }}>
          {ad.emoji && <span aria-hidden="true" style={{ position: 'absolute', right: 14, bottom: 6, fontSize: 64, opacity: 0.9 }}>{ad.emoji}</span>}
          <b style={{ fontSize: 16, display: 'block', paddingRight: ad.emoji ? 70 : 0 }}>{ad.title}</b>
          {ad.body && <div style={{ fontSize: 13, marginTop: 4, opacity: 0.95, paddingRight: ad.emoji ? 70 : 0 }}>{ad.body}</div>}
          {ad.buttonText && <div style={{ marginTop: 10, display: 'inline-block', background: '#FFB830', color: '#2a0b66', fontWeight: 700, fontSize: 13, padding: '6px 12px', borderRadius: 999 }}>{ad.buttonText}</div>}
        </div>
      )}
    </button>
  );
}

// Home-screen slider of adverts/announcements (swipe, auto-advances).
// placement "HOME" = top slider (HOME/BOTH ads); "BOTTOM" = the slider
// at the bottom of the home screen, which falls back to built-in tips
// when the admin hasn't added any.
// Counts an advert as seen once per app open (for tap rate in admin).
const viewed = new Set();
function countView(ad) {
  if (!ad?.id || ad.builtIn || viewed.has(ad.id) || /^(tip|fest)/.test(String(ad.id))) return;
  viewed.add(ad.id);
  recordAdView(ad.id).catch(() => {});
}

export function AdsCarousel({ placement = 'HOME', fallback = [] }) {
  const all = useAds();
  const info = useAppInfo();
  const mine = all.filter((a) => (placement === 'BOTTOM' ? a.placement === 'BOTTOM' : a.placement === 'HOME' || a.placement === 'BOTH'));
  // Festival greeting (Christmas, Eid, New Year…) leads the top slider on the day.
  const fest = placement !== 'BOTTOM' && info?.festival ? [{ id: `fest-${info.festival.id}`, builtIn: true, title: info.festival.title, body: info.festival.body, emoji: info.festival.emoji, bg: FEST_BG[info.festival.theme] || FEST_BG.purple }] : [];
  const ads = [...fest, ...(mine.length ? mine : fallback)];
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

  useEffect(() => {
    countView(ads[index]);
  }, [index, ads.length]);

  if (!ads.length) return null;
  return (
    <div style={{ margin: placement === 'BOTTOM' ? '14px 16px 8px' : '16px 16px 0' }}>
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
  const lite = useLite();
  const open = useOpenAd();
  const [ad, setAd] = useState(null);

  useEffect(() => {
    const seen = new Set(seenList());
    const next = ads.find((a) => (a.placement === 'POPUP' || a.placement === 'BOTH') && !seen.has(a.id));
    if (!next) return undefined;
    const t = setTimeout(() => { setAd(next); countView(next); }, 1200);
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
        {ad.hasVideo && !lite ? (
          <video src={adVideoUrl(ad)} poster={ad.hasImage ? adImageUrl(ad) : undefined} autoPlay muted playsInline controls preload="metadata" style={{ display: 'block', width: '100%', maxHeight: '55vh', objectFit: 'contain', background: '#000' }} />
        ) : ad.hasImage && <img src={adImageUrl(ad)} alt="" style={{ display: 'block', width: '100%', maxHeight: '55vh', objectFit: 'cover' }} />}
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

// Shown in the bottom slider until the admin adds BOTTOM adverts.
export const DEFAULT_BOTTOM_SLIDES = [
  { id: 'tip-refer', builtIn: true, title: 'Invite friends, earn cash', body: 'Share your code — you earn when they join and buy.', buttonText: 'Refer & Earn', linkUrl: '/refer', emoji: '🎁', bg: 'linear-gradient(135deg, #863bff, #5b1fc4)' },
  { id: 'tip-a2c', builtIn: true, title: 'Airtime to Cash', body: 'Bought too much airtime? Turn it back into wallet money.', buttonText: 'Convert now', linkUrl: '/airtime-cash', emoji: '🔁', bg: 'linear-gradient(135deg, #0ea5a4, #0f766e)' },
  { id: 'tip-bulk', builtIn: true, title: 'Bulk airtime & data', body: 'Top up up to 50 numbers at once — family, staff, customers.', buttonText: 'Try bulk', linkUrl: '/bulk', emoji: '📶', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { id: 'tip-gift', builtIn: true, title: 'Gift data or airtime', body: 'Send data or airtime to someone with a nice gift card and your message.', buttonText: 'Send a gift', linkUrl: '/buy/data', emoji: '🎁', bg: 'linear-gradient(135deg, #2563eb, #1d4ed8)' },
];
