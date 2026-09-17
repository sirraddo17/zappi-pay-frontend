import { useState } from 'react';

// A password-type input with a show/hide toggle. Used everywhere a
// password or API secret is entered — login, signup, change-password
// forms, and the VTpass key fields in Settings — so there's one
// place controlling how the toggle looks and behaves instead of it
// being reimplemented slightly differently five times.
export default function PasswordField({ id, value, onChange, required, minLength, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide value' : 'Show value'}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          color: 'var(--slate-400)',
          fontSize: 14,
        }}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
