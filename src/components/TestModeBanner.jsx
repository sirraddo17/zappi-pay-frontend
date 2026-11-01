import { useAppInfo } from './ServiceNotices';

// Shown while any partner customers use is still on test (sandbox) keys.
// The server builds the text from each partner's real state, so it never
// says a live service is not real (e.g. "Airtime, data and bills are
// live. Wallet funding … uses test money"). Disappears by itself when
// everything is live.
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
        <b>Test mode.</b> {info.testModeText || 'Some parts of ZAPPI PAY still use test money.'}
      </span>
    </div>
  );
}
