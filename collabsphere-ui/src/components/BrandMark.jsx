/**
 * BrandMark — the single CollabSphere brand lockup used in the rail, top bar,
 * and mobile header. The orb app-icon (red planet + tilted blue ring on a cream
 * tile) plus an optional wordmark. One mark everywhere — no competing logos.
 */
export function BrandMark({ withName = true, size = 32 }) {
  return (
    <span className="brandmark">
      <img
        className="brandmark__icon"
        src="/icon.svg"
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
      />
      {withName && <span className="brandmark__name">CollabSphere</span>}
    </span>
  );
}
