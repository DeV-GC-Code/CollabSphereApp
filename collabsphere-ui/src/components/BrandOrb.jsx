/**
 * BrandOrb — risograph print mark.
 * Two spot inks (coral + ultramarine), halftone shading, deliberate
 * mis-registration, pre-baked overprint plum. Pure SVG, no runtime blending.
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
          {/* halftone dot field, ink-coral */}
          <pattern id="riso-dots" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <circle cx="6.5" cy="6.5" r="2.5" fill="var(--ink-coral, #FF4B3E)" />
          </pattern>
          <pattern id="riso-dots-sm" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <circle cx="6.5" cy="6.5" r="1.2" fill="var(--ink-coral, #FF4B3E)" />
          </pattern>
          <clipPath id="riso-sphere">
            <circle cx="240" cy="240" r="158" />
          </clipPath>
        </defs>

        {/* ultramarine plate — printed slightly off-register */}
        <circle cx="252" cy="250" r="158" fill="var(--ink-blue, #2B3FE8)" opacity="0.92" />

        {/* coral plate (halftone sphere) */}
        <g clipPath="url(#riso-sphere)">
          <circle cx="240" cy="240" r="158" fill="var(--ink-coral, #FF4B3E)" />
          {/* lighter halftone zone top-left = paper showing through */}
          <circle cx="185" cy="180" r="150" fill="var(--paper, #F4EFE3)" />
          <circle cx="185" cy="180" r="150" fill="url(#riso-dots)" />
          <circle cx="150" cy="146" r="86" fill="var(--paper, #F4EFE3)" />
          <circle cx="150" cy="146" r="86" fill="url(#riso-dots-sm)" />
        </g>

        {/* overprint plum where the plates overlap (pre-baked, no blend) */}
        <path
          d="M 252 92 A 158 158 0 0 1 252 408 A 158 158 0 0 0 252 92 Z"
          fill="var(--ink-plum, #6B2A7A)"
          opacity="0.85"
        />

        {/* orbit ring — ultramarine, mis-registered */}
        <g transform="rotate(-16 240 240)">
          <ellipse cx="244" cy="246" rx="216" ry="74" fill="none"
            stroke="var(--ink-blue, #2B3FE8)" strokeWidth="5" />
          <ellipse cx="237" cy="240" rx="216" ry="74" fill="none"
            stroke="var(--ink-coral, #FF4B3E)" strokeWidth="2" opacity="0.9" />
          {/* riders on the ring */}
          <circle cx="36" cy="278" r="9" fill="var(--ink-coral, #FF4B3E)" />
          <circle cx="244" cy="320" r="11" fill="var(--ink, #18120E)" />
          <circle cx="450" cy="262" r="7" fill="var(--ink-blue, #2B3FE8)" />
        </g>

        {/* registration marks — print-shop detail */}
        <g stroke="var(--ink, #18120E)" strokeWidth="1.6" opacity="0.55">
          <path d="M 36 36 h 18 M 45 27 v 18" />
          <path d="M 426 444 h 18 M 435 435 v 18" />
          <circle cx="45" cy="36" r="6" fill="none" />
          <circle cx="435" cy="444" r="6" fill="none" />
        </g>
      </svg>
    </div>
  );
}
