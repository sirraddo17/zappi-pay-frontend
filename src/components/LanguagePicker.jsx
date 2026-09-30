import { LANGUAGES, getLang, setLang, useLang } from '../lib/i18n';

// Profile: pick English, Pidgin, Yorùbá, Hausa or Igbo.
export default function LanguagePicker({ style }) {
  const t = useLang();
  const lang = getLang();
  return (
    <div className="card" style={style}>
      <h2 style={{ marginTop: 0, fontSize: 16, marginBottom: 4 }}>🗣️ {t('Language')}</h2>
      <p style={{ color: 'var(--slate-400)', fontSize: 13, margin: '0 0 10px' }}>{t('Choose the language for the main screens. Some pages stay in English for now.')}</p>
      <div role="radiogroup" aria-label="Language" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={lang === l.code}
            onClick={() => setLang(l.code)}
            style={{ padding: '8px 14px', borderRadius: 999, fontSize: 14, cursor: 'pointer', border: `1px solid ${lang === l.code ? 'var(--purple)' : 'var(--slate-700)'}`, background: lang === l.code ? 'rgba(134,59,255,0.18)' : 'transparent', color: 'var(--slate-100)', fontWeight: lang === l.code ? 700 : 400 }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
