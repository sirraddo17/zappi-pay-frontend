import { useState } from 'react';
import { getThemeChoice, setThemeChoice } from '../lib/theme';

const OPTIONS = [['dark', '🌙 Dark'], ['light', '☀️ Light'], ['system', '📱 Same as phone']];

// Profile → Appearance.
export default function ThemeToggle({ style }) {
  const [choice, setChoice] = useState(getThemeChoice);
  return (
    <div className="card" style={style}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Appearance</div>
      <div role="radiogroup" aria-label="Appearance" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {OPTIONS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={choice === k}
            className={choice === k ? 'btn' : 'btn btn-secondary'}
            style={{ width: 'auto', flex: '1 1 auto', padding: '8px 10px', fontSize: 13 }}
            onClick={() => { setChoice(k); setThemeChoice(k); }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
