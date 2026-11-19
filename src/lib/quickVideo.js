// Ad Studio → ⚡ Quick video: draws 4 text scenes (opening, offer,
// message, ending with a QR code) in the ZAPPI PAY brand style and
// records them as an ~18-second tall video, all in the browser.

import QRCode from 'qrcode';
import { THEMES, drawLogo, roundRect, videoSupported } from './adRender';

export const W = 720;
export const H = 1280;
export const SCENES = [4, 5, 4, 5]; // seconds: opening, offer, message, ending
export const TOTAL = SCENES.reduce((a, b) => a + b, 0);
const FADE = 0.35;

const T = THEMES.teal;
const font = (w, px) => `${w} ${px}px Poppins, "Segoe UI", Roboto, Arial, sans-serif`;
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);

export const BLANK = {
  opening: { big: 'Data finish? No wahala', small: 'Top up any network in seconds' },
  offer: { title: 'Buy data', highlight: 'Instant', points: ['MTN, Airtel, Glo, T2mobile', 'Cashback on purchases', 'Auto refunds if it fails'] },
  message: { title: 'Fund from any bank', text: 'Send money to your own ZAPPI PAY account number' },
  ending: { cta: 'Download ZAPPI PAY today' },
  caption: 'Data finish? No wahala 😄 Top up any network in seconds with ZAPPI PAY. 👉 www.zappipay.com.ng #ZappiPay #BuyData',
};

function wrap(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Fits text into maxLines by shrinking the font; returns the line list.
function fitText(ctx, text, weight, px, maxW, maxLines) {
  let size = px;
  let lines;
  for (; size > 22; size -= 4) {
    ctx.font = font(weight, size);
    lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines) break;
  }
  return { lines, size };
}

function textBlock(ctx, text, { y, weight = 800, px = 64, color = '#fff', maxLines = 3, p = 1, delay = 0, lh = 1.18 }) {
  const a = ease((p - delay) / 0.25);
  if (a <= 0 || !text) return y;
  const { lines, size } = fitText(ctx, text, weight, px, W - 110, maxLines);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = font(weight, size);
  const shift = (1 - a) * 40;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y + shift + i * size * lh));
  ctx.restore();
  return y + lines.length * size * lh;
}

function background(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, T.stops[1]);
  g.addColorStop(0.45, T.stops[2]);
  g.addColorStop(1, T.stops[3]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Slow-moving soft circles so the video never looks frozen.
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(W * 0.85 + Math.sin(t * 0.6) * 30, H * 0.12, 180, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.1 + Math.cos(t * 0.5) * 30, H * 0.88, 230, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function brand(ctx) {
  drawLogo(ctx, W / 2 - 150, 90, 56);
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = font(800, 40);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('ZAPPI', W / 2 - 80, 118);
  const zw = ctx.measureText('ZAPPI ').width;
  ctx.fillStyle = T.accent;
  ctx.fillText('PAY', W / 2 - 80 + zw, 118);
  ctx.restore();
}

function footer(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = font(500, 18);
  ctx.textAlign = 'center';
  ctx.fillText('SIRRADDO GLOBAL LIMITED · RC 9939920', W / 2, H - 40);
  ctx.restore();
}

function pill(ctx, text, y, p) {
  const a = ease(p / 0.2);
  if (!text || a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = font(800, 30);
  const w = ctx.measureText(text).width + 56;
  roundRect(ctx, W / 2 - w / 2, y, w, 58, 29);
  ctx.fillStyle = T.accent;
  ctx.fill();
  ctx.fillStyle = T.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, y + 30);
  ctx.restore();
}

function scene(ctx, i, s, p, qr, link) {
  if (i === 0) {
    const y = textBlock(ctx, s.opening.big, { y: 430, px: 84, maxLines: 4, p });
    textBlock(ctx, s.opening.small, { y: y + 30, weight: 500, px: 38, color: 'rgba(255,255,255,0.85)', p, delay: 0.25 });
  } else if (i === 1) {
    pill(ctx, s.offer.highlight, 300, p);
    const y = textBlock(ctx, s.offer.title, { y: 400, px: 80, color: T.accent, maxLines: 2, p, delay: 0.05 });
    (s.offer.points || []).slice(0, 3).forEach((pt, k) => {
      const a = ease((p - 0.2 - k * 0.15) / 0.2);
      if (a <= 0 || !pt) return;
      const top = y + 50 + k * 120;
      ctx.save();
      ctx.globalAlpha = a;
      roundRect(ctx, 70 - (1 - a) * 60, top, W - 140, 96, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      ctx.fillStyle = T.accent;
      ctx.font = font(800, 40);
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', 104 - (1 - a) * 60, top + 50);
      const { lines, size } = fitText(ctx, pt, 700, 36, W - 260, 1);
      ctx.fillStyle = '#fff';
      ctx.font = font(700, size);
      ctx.fillText(lines[0] || '', 160 - (1 - a) * 60, top + 50);
      ctx.restore();
    });
  } else if (i === 2) {
    const y = textBlock(ctx, s.message.title, { y: 440, px: 72, maxLines: 3, p });
    textBlock(ctx, s.message.text, { y: y + 36, weight: 500, px: 40, color: 'rgba(255,255,255,0.88)', maxLines: 4, p, delay: 0.25 });
  } else {
    const y = textBlock(ctx, s.ending.cta, { y: 260, px: 62, maxLines: 2, p });
    const a = ease((p - 0.15) / 0.25);
    if (qr && a > 0) {
      const size = 340;
      const top = Math.max(y + 50, 470);
      ctx.save();
      ctx.globalAlpha = a;
      roundRect(ctx, W / 2 - size / 2 - 20, top - 20, size + 40, size + 40, 28);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.drawImage(qr, W / 2 - size / 2, top, size, size);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = font(600, 26);
      ctx.textAlign = 'center';
      ctx.fillText('Scan or visit', W / 2, top + size + 70);
      ctx.restore();
      pill(ctx, link, top + size + 100, (p - 0.3) / 0.7);
    }
  }
}

export function drawFrame(ctx, script, t, qr, link = 'www.zappipay.com.ng') {
  let start = 0;
  let i = 0;
  while (i < SCENES.length - 1 && t >= start + SCENES[i]) { start += SCENES[i]; i += 1; }
  const local = t - start;
  background(ctx, t);
  brand(ctx);
  scene(ctx, i, script, clamp(local / SCENES[i]), qr, link);
  if (i > 0 && local < FADE) {
    ctx.save();
    ctx.globalAlpha = 1 - local / FADE;
    background(ctx, t);
    brand(ctx);
    scene(ctx, i - 1, script, 1, qr, link);
    ctx.restore();
  }
  footer(ctx);
}

export async function qrImage(url) {
  const data = await QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: '#062A2E', light: '#ffffff' }, errorCorrectionLevel: 'M' });
  const img = new Image();
  img.src = data;
  await img.decode().catch(() => {});
  return img;
}

export async function recordQuickVideo(script, url, onProgress) {
  if (!videoSupported()) throw new Error("This browser can't make videos. Use Chrome on Android or a computer.");
  if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
  const qr = await qrImage(url);
  const link = url.replace(/^https?:\/\//, '').replace(/\/\?vt=.*/, '');
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = types.find((x) => MediaRecorder.isTypeSupported(x)) || '';
  const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 5_000_000 } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((resolve) => { rec.onstop = resolve; });
  drawFrame(ctx, script, 0, qr, link);
  rec.start(200);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      drawFrame(ctx, script, Math.min(t, TOTAL), qr, link);
      onProgress?.(clamp(t / TOTAL));
      if (t < TOTAL) setTimeout(tick, 1000 / 30); else resolve();
    };
    tick();
  });
  rec.stop();
  await done;
  const type = (mimeType || 'video/webm').split(';')[0];
  return { blob: new Blob(chunks, { type }), ext: type === 'video/mp4' ? 'mp4' : 'webm', seconds: TOTAL };
}
