// Shimmering placeholders shown while something loads.
export function Skeleton({ h = 16, w = '100%', r = 12, style }) {
  return <div className="skel" aria-hidden="true" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

export function SkeletonRows({ rows = 3, h = 52 }) {
  return (
    <div role="status" aria-label="Loading" style={{ display: 'grid', gap: 10, padding: '4px 0' }}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} h={h} />)}
    </div>
  );
}
