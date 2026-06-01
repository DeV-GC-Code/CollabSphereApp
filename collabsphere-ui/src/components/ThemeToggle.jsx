import { useTheme } from "../auth/ThemeContext.jsx";
import { Icons } from "./Icons.jsx";

export function ThemeToggle({ className = "" }) {
  const { toggle, isDark } = useTheme();
  return (
    <button
      className={`icon-button theme-toggle ${className}`}
      onClick={toggle}
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Icons.Sun /> : <Icons.Moon />}
    </button>
  );
}
