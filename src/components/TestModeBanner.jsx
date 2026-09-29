import { useAppInfo } from './ServiceNotices';

// Shown to everyone while the app runs on test (sandbox) keys, so
// visitors (e.g. payment partners reviewing the app) know no real
// money or real airtime moves yet. Disappears automatically when
// Admin → Settings switches VTpass and Monnify to live.
export default function TestModeBanner({ style }) {
  const info = useAppInfo();
  if (!info?.testMode) return null;
  return (
    <div
      role="status"
      style={{
        margin: '12px 16px',
        padding: '10px 12px',
        borderRadius: 12,
        fontSize: 13,
        lineHeight: 1.45,
        display: 'flex',
        gap: 8,
        background: 'rgba(245,158,11,0.12)',
        border: '1px solid #f59e0b',
        color: 'inherit',
        ...style,
      }}
    >
      <span aria-hidden="true">🧪</span>
      <span>
        <b>Test mode.</b> ZAPPI PAY is still being tested — payments, airtime, data and bills here are not real yet, and no real money is charged or sent. We'll announce when we go live.
      </span>
    </div>
  );
}
