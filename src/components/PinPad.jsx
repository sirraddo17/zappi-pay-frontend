import { useEffect, useState } from 'react';

// Four PIN dots plus an on-screen number pad (and physical keyboard
// support). Calls onComplete(pin) once four digits are entered, then
// clears itself whenever `resetKey` changes (e.g. after a wrong PIN).
export default function PinPad({ onComplete, disabled = false, resetKey = 0, extraKey = null }) {
  const [digits, setDigits] = useState('');

  useEffect(() => {
    setDigits('');
  }, [resetKey]);

  function press(d) {
    if (disabled || digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) setTimeout(() => onComplete(next), 120);
  }

  function back() {
    if (disabled) return;
    setDigits((prev) => prev.slice(0, -1));
  }

  useEffect(() => {
    function onKey(e) {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const keyStyle = {
    height: 58,
    borderRadius: 14,
    border: '1px solid var(--slate-700)',
    background: 'var(--slate-800)',
    color: 'var(--slate-100)',
    fontSize: 22,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '8px 0 22px' }} aria-label={`${digits.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid var(--purple)',
              background: i < digits.length ? 'var(--purple)' : 'transparent',
              transition: 'background 0.1s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 300, margin: '0 auto' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" style={keyStyle} onClick={() => press(d)} disabled={disabled}>
            {d}
          </button>
        ))}
        {extraKey || <span />}
        <button type="button" style={keyStyle} onClick={() => press('0')} disabled={disabled}>
          0
        </button>
        <button type="button" style={{ ...keyStyle, fontSize: 18 }} onClick={back} disabled={disabled} aria-label="Delete">
          ⌫
        </button>
      </div>
    </div>
  );
}

export function FingerprintIcon({ size = 26, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 11c0 3.5-1 6.5-2.5 8.5" />
      <path d="M8.5 7.5A5 5 0 0 1 17 11c0 1.8-.2 3.6-.6 5.2" />
      <path d="M6 10a6.5 6.5 0 0 1 .8-3" />
      <path d="M6.2 14.5c.2-1.1.3-2.3.3-3.5" />
      <path d="M14.5 11c0 2.8-.5 5.6-1.5 8" />
      <path d="M9.5 11a2.5 2.5 0 0 1 5 0" />
      <path d="M4.5 5.5A9 9 0 0 1 21 11c0 1-.1 2-.2 3" />
    </svg>
  );
}
