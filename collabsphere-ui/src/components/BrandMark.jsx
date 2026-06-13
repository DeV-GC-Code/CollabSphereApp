/**
 * BrandMark — the single CollabSphere brand lockup used in the rail and
 * mobile header. Refined persimmon disc + the white/red app icon, with an
 * optional wordmark in Fraunces. One mark everywhere, no competing logos.
 */
export function BrandMark({ withName = true, size = 34 }) {
  return (
    <span className="brandmark">
      <span className="brandmark__disc" style={{ width: size, height: size }}>
        <img src="/icon.png" alt="" aria-hidden="true" />
      </span>
      {withName && <span className="brandmark__name">CollabSphere</span>}
    </span>
  );
}
