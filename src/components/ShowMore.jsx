import { useEffect, useState } from 'react';

// Shows the first few items of a list, then "Show more" / "Show less"
// so long histories don't turn the page into an endless scroll.
export const FIRST_COUNT = 5;
const STEP = 10;

export function visibleSlice(items, shown) {
  return items.slice(0, shown);
}

export default function ShowMore({ total, shown, setShown, first = FIRST_COUNT }) {
  if (total <= first) return null;
  const remaining = total - shown;
  const btn = {
    background: 'none',
    border: '1px solid var(--purple, #7c3aed)',
    color: 'var(--purple, #7c3aed)',
    borderRadius: 999,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '12px 0 4px' }}>
      {remaining > 0 && (
        <button type="button" style={btn} onClick={() => setShown((s) => s + STEP)}>
          Show more ({remaining})
        </button>
      )}
      {shown > first && (
        <button type="button" style={{ ...btn, borderColor: 'var(--slate-600, #475569)', color: 'var(--slate-400)' }} onClick={() => setShown(first)}>
          Show less
        </button>
      )}
    </div>
  );
}

// Hook version: const logs = useShowMore(list, [filter]);
// then render logs.visible.map(...) and {logs.more} under the list.
// resetKeys: when any of them changes, it goes back to the first few.
export function useShowMore(items, resetKeys = [], first = FIRST_COUNT) {
  const [shown, setShown] = useState(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setShown(first), resetKeys);
  const list = items || [];
  return {
    visible: list.slice(0, shown),
    more: <ShowMore total={list.length} shown={shown} setShown={setShown} first={first} />,
  };
}
