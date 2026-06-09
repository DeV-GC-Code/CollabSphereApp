/**
 * BrandOrb — crisp, lightweight brand visual.
 * Pure SVG + CSS (no canvas, no per-frame JS). Respects prefers-reduced-motion.
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
          <radialGradient id="orb-halo" cx="50%" cy="46%" r="50%">
            <stop offset="0%" stopColor="rgba(59,130,246,0.32)" />
            <stop offset="60%" stopColor="rgba(37,99,235,0.12)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0)" />
          </radialGradient>
          <radialGradient id="orb-fill" cx="34%" cy="26%" r="82%">
            <stop offset="0%" stopColor="#BFDBFE" />
            <stop offset="28%" stopColor="#60A5FA" />
            <stop offset="62%" stopColor="#2563EB" />
            <stop offset="88%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#172554" />
          </radialGradient>
          <radialGradient id="orb-gloss" cx="32%" cy="20%" r="42%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <linearGradient id="orb-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7DD3FC" />
            <stop offset="55%" stopColor="rgba(96,165,250,0.65)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0.08)" />
          </linearGradient>
          <linearGradient id="orb-ring-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(165,243,252,0.7)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0.05)" />
          </linearGradient>
        </defs>

        {/* ambient halo */}
        <circle cx="240" cy="240" r="236" fill="url(#orb-halo)" />

        {/* back half of outer ring (behind sphere) */}
        <g transform="rotate(-18 240 240)">
          <path
            d="M 18 240 A 222 84 0 0 1 462 240"
            fill="none"
            stroke="url(#orb-ring-2)"
            strokeWidth="1.6"
            opacity="0.5"
          />
        </g>

        {/* sphere */}
        <circle cx="240" cy="240" r="168" fill="url(#orb-fill)" />
        <circle cx="240" cy="240" r="168" fill="url(#orb-gloss)" />
        {/* subtle inner rim light */}
        <circle
          cx="240" cy="240" r="167"
          fill="none"
          stroke="rgba(191,219,254,0.45)"
          strokeWidth="1.4"
        />

        {/* front half of outer ring (in front of sphere) */}
        <g className="brand-orb__ring" transform="rotate(-18 240 240)">
          <path
            d="M 462 240 A 222 84 0 0 1 18 240"
            fill="none"
            stroke="url(#orb-ring)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* connection nodes riding the ring */}
          <g className="brand-orb__node">
            <circle cx="62" cy="278" r="10" fill="rgba(125,211,252,0.28)" />
            <circle cx="62" cy="278" r="4.5" fill="#E0F2FE" />
          </g>
          <g className="brand-orb__node brand-orb__node--d2">
            <circle cx="240" cy="324" r="13" fill="rgba(59,130,246,0.30)" />
            <circle cx="240" cy="324" r="5.5" fill="#FFFFFF" />
          </g>
          <g className="brand-orb__node brand-orb__node--d3">
            <circle cx="430" cy="270" r="9" fill="rgba(125,211,252,0.26)" />
            <circle cx="430" cy="270" r="4" fill="#BAE6FD" />
          </g>
        </g>

        {/* secondary thin ring */}
        <g transform="rotate(26 240 240)">
          <ellipse
            cx="240" cy="240" rx="206" ry="64"
            fill="none"
            stroke="url(#orb-ring-2)"
            strokeWidth="1.1"
            opacity="0.55"
          />
        </g>

        {/* floating satellite dots */}
        <circle className="brand-orb__sat" cx="404" cy="106" r="7" fill="#7DD3FC" />
        <circle className="brand-orb__sat brand-orb__sat--d2" cx="84" cy="120" r="5" fill="#93C5FD" />
        <circle className="brand-orb__sat brand-orb__sat--d3" cx="416" cy="372" r="4.5" fill="#60A5FA" />
      </svg>
    </div>
  );
}
