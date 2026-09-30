import { GIFT_THEMES } from '../lib/giftThemes';

// Theme chips + message box, used on the Buy page and on a receipt.
export default function GiftForm({ theme, setTheme, message, setMessage }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div role="radiogroup" aria-label="Gift card style" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {Object.entries(GIFT_THEMES).map(([k, t]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={theme === k}
            onClick={() => setTheme(k)}
            style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: `1px solid ${theme === k ? 'var(--purple)' : 'var(--slate-700)'}`, background: theme === k ? 'rgba(134,59,255,0.18)' : 'transparent', color: 'var(--slate-100)' }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
      <div className="field" style={{ margin: 0 }}>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={160} rows={2} placeholder="Add a message (optional), e.g. Happy birthday, sis!" aria-label="Gift message" style={{ fontFamily: "inherit", fontSize: 14, width: "100%", boxSizing: "border-box", background: "var(--slate-900, #0f1628)", color: "var(--slate-100)", border: "1px solid var(--slate-700)", borderRadius: 10, padding: "10px 12px", resize: "vertical" }} />
      </div>
      <small style={{ display: 'block', marginTop: 4, color: 'var(--slate-400)' }}>They get a gift card link you can send on WhatsApp. {160 - message.length} characters left.</small>
    </div>
  );
}
