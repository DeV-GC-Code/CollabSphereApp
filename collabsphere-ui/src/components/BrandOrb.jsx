/**
 * BrandOrb — the hero CollabSphere mark. Renders the same cream-tile app icon
 * (red planet + tilted blue ring on a soft tile) used as the favicon and brand
 * lockup, so the identity is identical everywhere. One mark, no variants.
 */
export function BrandOrb({ size = 220, className = "" }) {
  return (
    <div
      className={`brand-orb ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src="/icon.svg"
        width={size}
        height={size}
        alt=""
        style={{ width: "100%", height: "100%", display: "block", borderRadius: "22%" }}
      />
    </div>
  );
}
