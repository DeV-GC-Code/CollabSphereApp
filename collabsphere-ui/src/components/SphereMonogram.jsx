/**
 * SphereMonogram — a sphere's identity: its first letter on a deterministic
 * warm/jade/honey ink. Makes each sphere read as a distinct "room" instead of
 * the same hub glyph repeated everywhere.
 */
const INKS = ["persimmon", "jade", "honey", "clay", "plum", "deep-teal"];

export function sphereInk(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return INKS[h % INKS.length];
}

export function SphereMonogram({ name = "", size = 44 }) {
  return (
    <span
      className={`sphere-mono sphere-mono--${sphereInk(name)}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}
