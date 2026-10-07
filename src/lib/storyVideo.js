// Ad Studio → 🎞️ Story video: joins scenes (photos, clips such as screen
// recordings or HeyGen videos, text cards and a logo ending) into one
// TikTok / Reels / Status video with captions, a voiceover and music.
// Everything happens in the browser: canvas + MediaRecorder + Web Audio.

import { THEMES, drawLogo, roundRect, videoSupported } from './adRender';

export const SIZES = {
  tall: { w: 720, h: 1280, label: 'Tall 9:16 — TikTok, Reels, Status' },
  hd: { w: 1080, h: 1920, label: 'Tall 9:16 HD (bigger file, needs a strong computer)' },
  square: { w: 1080, h: 1080, label: 'Square — Facebook / Instagram feed' },
};
export const KINDS = { photo: '🖼️ Photo', clip: '🎬 Video clip', card: '🟪 Text card', logo: '⭐ Logo ending' };
export const FADE = 0.3; // seconds of cross-fade between scenes

const font = (w, px) => `${w} ${px}px Poppins, "Segoe UI", Roboto, Arial, sans-serif`;
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);

export const sceneSeconds = (s) => Math.max(1, Math.min(20, Number(s.seconds) || 3));
export const totalSeconds = (scenes) => scenes.reduce((a, s) => a + sceneSeconds(s), 0);

// The 30-second "ZAPPI PAY is Easy" ad. Only things the app really does.
export const TEMPLATE = [
  { kind: 'photo', seconds: 3, caption: 'There was a time…', say: 'There was a time buying light meant queuing at the office.', prompt: 'Friendly Nigerian woman presenter in a bright modern studio looking at the camera' },
  { kind: 'photo', seconds: 3, caption: 'NEPA no dey wait 😅', say: 'And NEPA no dey wait for anybody.', prompt: 'Nigerian family living room in the evening, lights just went off, ceiling fan stopped, woman looking at her phone' },
  { kind: 'clip', seconds: 4, caption: 'Token in seconds ⚡', say: 'Now? Open ZAPPI PAY, pay, and your token lands in seconds.', prompt: 'Screen recording: ZAPPI PAY → Electricity → token' },
  { kind: 'photo', seconds: 4, caption: 'Airtime • Data • TV • Exam PINs', say: 'Airtime, data, DStv, GOtv, Startimes, even WAEC and JAMB PINs.', prompt: 'Young Nigerian man in a busy Lagos market phone stall smiling at his smartphone' },
  { kind: 'card', seconds: 3, title: 'Cashback', sub: 'on every purchase 💰', caption: '', say: 'And you earn cashback every time you buy.' },
  { kind: 'clip', seconds: 4, caption: 'Fund from any bank 🏦', say: 'Fund your wallet from any bank, straight to your own account number.', prompt: 'Screen recording: Wallet → your account number' },
  { kind: 'photo', seconds: 3, caption: 'Your PIN. Your money. 🔒', say: 'Every payment is protected with your PIN or fingerprint.', prompt: 'Close-up of a thumb on a smartphone fingerprint sensor, clean modern light' },
  { kind: 'photo', seconds: 3, caption: 'Print cards. Make profit.', say: 'Got a shop? Print recharge cards and make profit.', prompt: 'Friendly Nigerian woman in a small kiosk handing a printed recharge card to a smiling customer' },
  { kind: 'logo', seconds: 3, title: 'Pay bills the easy way', sub: 'www.zappipay.com.ng', caption: '', say: 'ZAPPI PAY. Pay bills the easy way.' },
];

export const voiceScript = (scenes) => scenes.map((s) => String(s.say || '').trim()).filter(Boolean).join(' ');

// --- media loading -------------------------------------------------------------

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That picture could not be opened.'));
    img.src = src;
  });
}

export function loadClip(src) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.onloadeddata = () => resolve(v);
    v.onerror = () => reject(new Error('That video could not be opened. Try an MP4.'));
    v.src = src;
  });
}

// --- drawing -------------------------------------------------------------------

function cover(ctx, el, W, H, zoom = 1, panX = 0, panY = 0) {
  const iw = el.videoWidth || el.naturalWidth || el.width;
  const ih = el.videoHeight || el.naturalHeight || el.height;
  if (!iw || !ih) return;
  const k = Math.max(W / iw, H / ih) * zoom;
  const w = iw * k;
  const h = ih * k;
  ctx.drawImage(el, (W - w) / 2 + panX * (w - W) / 2, (H - h) / 2 + panY * (h - H) / 2, w, h);
}

function gradient(ctx, W, H, theme, t) {
  const g = ctx.createLinearGradient(0, 0, W * (0.6 + 0.4 * Math.sin(t)), H);
  theme.stops.forEach((c, i) => g.addColorStop(i / (theme.stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function wrap(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function fitText(ctx, text, maxW, maxLines, start, weight = 800) {
  let px = start;
  let lines;
  for (; px > 14; px -= 2) {
    ctx.font = font(weight, px);
    lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) break;
  }
  ctx.font = font(weight, px);
  return { px, lines: lines || [] };
}

function watermark(ctx, W) {
  const s = Math.round(W * 0.075);
  const x = W - s - Math.round(W * 0.2);
  const y = Math.round(W * 0.04);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 8;
  drawLogo(ctx, x, y, s);
  ctx.font = font(800, Math.round(s * 0.42));
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('ZAPPI PAY', x + s * 1.1, y + s / 2);
  ctx.restore();
}

function caption(ctx, text, W, H, p) {
  if (!text) return;
  const maxW = W * 0.86;
  const { px, lines } = fitText(ctx, text, maxW, 3, Math.round(W * 0.068));
  const pop = 0.85 + 0.15 * ease(p / 0.25);
  const lh = px * 1.22;
  const baseY = H * 0.8 - ((lines.length - 1) * lh) / 2;
  ctx.save();
  ctx.translate(W / 2, baseY);
  ctx.scale(pop, pop);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, px * 0.16);
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.fillStyle = '#fff';
  lines.forEach((l, i) => {
    ctx.strokeText(l, 0, i * lh);
    ctx.fillText(l, 0, i * lh);
  });
  ctx.restore();
}

function card(ctx, s, W, H, p, theme) {
  gradient(ctx, W, H, theme, p * 2);
  const a = ease(p / 0.3);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const big = fitText(ctx, s.title || s.caption || '', W * 0.84, 2, Math.round(W * 0.16), 900);
  const y0 = H / 2 - (big.lines.length * big.px * 1.1) / 2 + (1 - a) * 40;
  ctx.fillStyle = '#fff';
  big.lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * big.px * 1.1));
  if (s.sub) {
    const sub = fitText(ctx, s.sub, W * 0.8, 2, Math.round(W * 0.06), 600);
    ctx.fillStyle = theme.accent;
    sub.lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + big.lines.length * big.px * 1.1 + sub.px * (0.4 + i * 1.2)));
  }
  ctx.restore();
}

function logoEnd(ctx, s, W, H, p, theme) {
  gradient(ctx, W, H, theme, 0.4);
  const a = ease(p / 0.35);
  const size = Math.round(Math.min(W, H) * 0.3 * (0.7 + 0.3 * a));
  ctx.save();
  ctx.globalAlpha = a;
  drawLogo(ctx, (W - size) / 2, H * 0.3 - size / 2, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = font(900, Math.round(W * 0.11));
  ctx.fillText('ZAPPI PAY', W / 2, H * 0.3 + size * 0.75);
  const t = fitText(ctx, s.title || '', W * 0.84, 2, Math.round(W * 0.06), 600);
  t.lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.3 + size * 0.75 + W * 0.11 + i * t.px * 1.2));
  if (s.sub) {
    ctx.font = font(800, Math.round(W * 0.05));
    const w = ctx.measureText(s.sub).width + W * 0.12;
    const h = W * 0.11;
    const y = H * 0.72;
    roundRect(ctx, (W - w) / 2, y, w, h, h / 2);
    ctx.fillStyle = theme.accent;
    ctx.fill();
    ctx.fillStyle = theme.ink;
    ctx.fillText(s.sub, W / 2, y + h / 2);
  }
  ctx.restore();
}

// One scene at progress p (0..1). media = loaded <img>/<video> or null.
export function drawScene(ctx, s, media, W, H, p, themeKey = 'purple', opts = {}) {
  const theme = THEMES[themeKey] || THEMES.purple;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (s.kind === 'logo') {
    logoEnd(ctx, s, W, H, p, theme);
  } else if (s.kind === 'card' || !media) {
    card(ctx, s.kind === 'card' ? s : { title: s.caption || ' ', sub: media || !opts.hint ? '' : '(add a picture or clip)' }, W, H, p, theme);
  } else {
    if (s.kind === 'photo') cover(ctx, media, W, H, 1.02 + 0.08 * p, 0.3 * (p - 0.5), 0.2 * (p - 0.5));
    else cover(ctx, media, W, H);
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (s.kind !== 'logo') {
    watermark(ctx, W);
    if (s.kind !== 'card' && media) caption(ctx, s.caption, W, H, p);
  }
  ctx.restore();
}

// --- recording -----------------------------------------------------------------

async function decode(actx, blob) {
  if (!blob) return null;
  try {
    return await actx.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error('The voice or music file could not be read. Try an MP3.');
  }
}

export async function audioSeconds(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const actx = new Ctx();
  try {
    const b = await decode(actx, blob);
    return b ? b.duration : 0;
  } finally {
    actx.close().catch(() => {});
  }
}

// scenes: [{kind, seconds, caption, title, sub, media: {type, url}}]
export async function recordStory({ scenes, size = 'tall', theme = 'purple', voice, music, musicVolume = 0.25, onProgress }) {
  if (!videoSupported()) throw new Error("This browser can't make videos. Use Chrome on a computer or Android.");
  if (!scenes.length) throw new Error('Add at least one scene.');
  const { w: W, h: H } = SIZES[size] || SIZES.tall;
  const loaded = await Promise.all(scenes.map((s) => {
    if (!s.media?.url || s.kind === 'card' || s.kind === 'logo') return null;
    return s.media.type === 'video' ? loadClip(s.media.url) : loadImage(s.media.url);
  }));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const total = totalSeconds(scenes);

  // Sound: voice once, music looped under it, faded out at the end.
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const actx = new Ctx();
  const dest = actx.createMediaStreamDestination();
  const [vBuf, mBuf] = await Promise.all([decode(actx, voice), decode(actx, music)]);
  const stream = canvas.captureStream(30);
  if (vBuf || mBuf) dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

  const types = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: W >= 1080 ? 8_000_000 : 5_000_000 } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((resolve) => { rec.onstop = resolve; });

  const starts = [];
  scenes.reduce((a, s) => { starts.push(a); return a + sceneSeconds(s); }, 0);
  const sceneAt = (t) => { let i = 0; while (i < scenes.length - 1 && t >= starts[i + 1]) i += 1; return i; };

  await actx.resume().catch(() => {});
  const t0 = actx.currentTime + 0.15;
  if (vBuf) {
    const src = actx.createBufferSource();
    src.buffer = vBuf;
    src.connect(dest);
    src.start(t0);
  }
  if (mBuf) {
    const src = actx.createBufferSource();
    const gain = actx.createGain();
    src.buffer = mBuf;
    src.loop = true;
    gain.gain.setValueAtTime(musicVolume, t0);
    gain.gain.setValueAtTime(musicVolume, t0 + Math.max(0, total - 1.2));
    gain.gain.linearRampToValueAtTime(0.0001, t0 + total);
    src.connect(gain).connect(dest);
    src.start(t0);
    src.stop(t0 + total + 0.1);
  }

  drawScene(ctx, scenes[0], loaded[0], W, H, 0, theme);
  rec.start(200);
  let current = -1;
  await new Promise((resolve) => {
    const tick = () => {
      const t = Math.max(0, actx.currentTime - t0);
      const i = sceneAt(t);
      if (i !== current) {
        const prev = loaded[current];
        if (prev?.pause) prev.pause();
        const m = loaded[i];
        if (m?.play) { m.currentTime = 0; m.play().catch(() => {}); }
        current = i;
      }
      const s = scenes[i];
      const local = t - starts[i];
      drawScene(ctx, s, loaded[i], W, H, clamp(local / sceneSeconds(s)), theme);
      // Cross-fade: the previous scene fades out over the first FADE seconds.
      if (i > 0 && local < FADE) {
        ctx.save();
        ctx.globalAlpha = 1 - local / FADE;
        drawScene(ctx, scenes[i - 1], loaded[i - 1], W, H, 1, theme);
        ctx.restore();
      }
      onProgress?.(clamp(t / total));
      if (t < total) setTimeout(tick, 1000 / 30);
      else resolve();
    };
    tick();
  });
  rec.stop();
  await done;
  loaded.forEach((m) => m?.pause?.());
  actx.close().catch(() => {});
  const type = (mimeType || 'video/webm').split(';')[0];
  return { blob: new Blob(chunks, { type }), ext: type === 'video/mp4' ? 'mp4' : 'webm' };
}
