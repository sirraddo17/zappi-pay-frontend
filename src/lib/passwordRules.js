// Same rules the server enforces (lib/identity.js on the backend).
export function passwordChecks(pw) {
  const p = String(pw || '');
  return [
    { label: 'At least 8 characters', ok: p.length >= 8 },
    { label: 'A capital letter (A–Z)', ok: /[A-Z]/.test(p) },
    { label: 'A small letter (a–z)', ok: /[a-z]/.test(p) },
    { label: 'A number (0–9)', ok: /[0-9]/.test(p) },
    { label: 'A special character (@ # $ ! % …)', ok: /[^A-Za-z0-9]/.test(p) },
  ];
}

export function passwordIsStrong(pw) {
  return passwordChecks(pw).every((c) => c.ok);
}

// Keep this list identical to SECURITY_QUESTIONS on the server.
export const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  'What was the name of your first school?',
  'In which town or city were you born?',
  'What was the name of your first pet?',
  'What is the name of your best childhood friend?',
  'What was your first phone brand?',
  'What is your favourite food?',
];

// Latest birth date allowed in the date picker (10 years ago).
export function maxDob() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 10);
  return d.toISOString().slice(0, 10);
}
