// Draws a square "I won!" picture for a referral-contest winner to share
// on WhatsApp Status, Instagram etc. Returns a PNG Blob.
const ORDINAL = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function drawWinnerCard({ contestTitle, rank, prize, friends, code, link }) {
  const S = 1080;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d');

  const g = ctx.createRadialGradient(S * 0.85, S * 0.1, 50, S * 0.5, S * 0.5, S);
  g.addColorStop(0, '#a46bff');
  g.addColorStop(0.35, '#863bff');
  g.addColorStop(0.75, '#5b1fc4');
  g.addColorStop(1, '#2a0b66');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  const font = (w, px) => `${w} ${px}px Poppins, "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = font(700, 40);
  ctx.fillText('ZAPPI PAY', S / 2, 110);
  ctx.fillStyle = '#FFB830';
  ctx.font = font(600, 30);
  ctx.fillText('REFERRAL CONTEST WINNER', S / 2, 160);

  ctx.font = `200px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.fillText(rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🎉', S / 2, 400);

  ctx.fillStyle = '#fff';
  ctx.font = font(700, 76);
  ctx.fillText(`I came ${ORDINAL(rank)}!`, S / 2, 520);
  ctx.fillStyle = '#FFB830';
  ctx.font = font(700, 110);
  ctx.fillText(`₦${Number(prize).toLocaleString('en-NG')}`, S / 2, 650);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = font(500, 36);
  const title = String(contestTitle || '').slice(0, 42);
  ctx.fillText(`${title} · ${friends} friend${friends === 1 ? '' : 's'} joined`, S / 2, 715);

  roundRect(ctx, 140, 790, S - 280, 170, 36);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = font(600, 36);
  ctx.fillText(code ? `Join with my code: ${code}` : 'Join ZAPPI PAY', S / 2, 860);
  ctx.fillStyle = '#FFB830';
  ctx.font = font(700, 38);
  ctx.fillText(String(link || 'zappipay.com.ng').replace(/^https?:\/\//, ''), S / 2, 920);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = font(400, 26);
  ctx.fillText('Airtime · Data · Electricity · TV · Exam PINs', S / 2, 1030);

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

export async function shareWinnerCard(details) {
  const blob = await drawWinnerCard(details);
  const file = new File([blob], 'zappipay-contest-win.png', { type: 'image/png' });
  const text = `I won ₦${Number(details.prize).toLocaleString('en-NG')} in the ZAPPI PAY referral contest! 🏆 ${details.code ? `Join with my code ${details.code}: ` : ''}${details.link}`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: 'ZAPPI PAY' });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zappipay-contest-win.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
