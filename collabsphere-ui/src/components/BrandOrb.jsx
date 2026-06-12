/**
 * BrandOrb — calm clay brand mark.
 * A soft sphere on a gentle orbit with a few connection nodes:
 * "spheres + collaboration" read without noise. Pure SVG, theme-aware
 * via CSS custom properties, no texture or hard print artifacts.
 */
export function BrandOrb({ size = 420, className = "" }) {
  return (
    <div
      className={`brand-orb ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 480 480" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="orb-sphere" cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="var(--primary-light, #D0775F)" />
            <stop offset="62%" stopColor="var(--primary, #BD5D4C)" />
            <stop offset="100%" stopColor="var(--primary-strong, #9E4636)" />
          </radialGradient>
          <linearGradient id="orb-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent, #5E8B7E)" />
            <stop offset="100%" stopColor="var(--primary, #BD5D4C)" />
          </linearGradient>
        </defs>

        {/* soft orbit ring */}
        <g transform="rotate(-18 240 240)">
          <ellipse
            cx="240" cy="244" rx="214" ry="78"
            fill="none"
            stroke="url(#orb-ring)"
            strokeWidth="3"
            opacity="0.55"
          />
          {/* connection nodes riding the orbit */}
          <circle cx="33" cy="262" r="11" fill="var(--accent, #5E8B7E)" opacity="0.9" />
          <circle cx="447" cy="226" r="9" fill="var(--primary, #BD5D4C)" opacity="0.9" />
          <circle cx="246" cy="320" r="7" fill="var(--primary-light, #D0775F)" opacity="0.85" />
        </g>

        {/* the sphere */}
        <circle cx="240" cy="236" r="132" fill="url(#orb-sphere)" />
        {/* soft top-left highlight */}
        <ellipse cx="196" cy="190" rx="58" ry="44" fill="#FFFFFF" opacity="0.18" />
        {/* gentle inner contour */}
        <circle
          cx="240" cy="236" r="132"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.12"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
