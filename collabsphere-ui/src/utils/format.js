export function initials(nameOrEmail) {
  const source = nameOrEmail || "Member";
  return source
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Split a stored post body into its visible text and any trailing media blob.
 * Posts persist attachments as a trailing `\n\n[media:{...json...}]` token
 * (base64 data). Stripping it here keeps that blob out of plain-text views.
 */
export function parsePostContent(rawContent) {
  if (!rawContent) return { text: "", media: null };
  const mediaRegex = /\n\n\[media:(\{[\s\S]*\})\]$/;
  const match = rawContent.match(mediaRegex);
  if (match) {
    try {
      const media = JSON.parse(match[1]);
      return { text: rawContent.replace(mediaRegex, ""), media };
    } catch {
      return { text: rawContent.replace(mediaRegex, ""), media: null };
    }
  }
  return { text: rawContent, media: null };
}

/**
 * Convert the lightweight BBCode used by the composer ([b]/[i]/[u]/[color]/
 * [font]) into safe HTML. Input is HTML-escaped first to prevent XSS, then a
 * fixed allow-list of tags is re-introduced. Returns an HTML string intended
 * for dangerouslySetInnerHTML.
 */
export function renderFormattedText(rawText) {
  if (!rawText) return "";
  let html = String(rawText)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br />")
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>")
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>")
    .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>");

  const colorMap = { green: "#2E7D52", teal: "#0F766E", amber: "#CB7E2F", red: "#D44C47" };
  html = html.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, (_m, c, t) => {
    const safe = /^#[0-9a-f]{3,8}$/i.test(c) ? c : (colorMap[c.toLowerCase()] || "inherit");
    return `<span style="color:${safe}">${t}</span>`;
  });

  const fontMap = {
    monospace: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
    geist: "var(--font-display)",
  };
  html = html.replace(/\[font=([^\]]+)\]([\s\S]*?)\[\/font\]/gi, (_m, f, t) => {
    const safe = fontMap[f.toLowerCase()] || "inherit";
    return `<span style="font-family:${safe}">${t}</span>`;
  });

  return html;
}

/** Plain-text preview: strip media + BBCode/HTML entirely (lists, search, meta). */
export function plainText(rawContent) {
  const { text } = parsePostContent(rawContent || "");
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\/?[a-z]+(=[^\]]+)?\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitize rich-text HTML from the composer to a safe allow-list:
 * only formatting tags + a narrow set of inline styles survive. Strips
 * scripts, event handlers, links/images, and any unknown tag (unwrapped,
 * keeping its text). Runs in the browser via the DOM.
 */
const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "SPAN", "FONT", "BR", "DIV", "P"]);
const ALLOWED_STYLE = ["color", "font-family", "font-weight", "font-style", "text-decoration"];

export function sanitizeHtml(html) {
  if (!html) return "";
  if (typeof document === "undefined") return String(html).replace(/<[^>]+>/g, "");
  const div = document.createElement("div");
  div.innerHTML = html;
  div.querySelectorAll("*").forEach((el) => {
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(...el.childNodes); // unwrap, keep content
      return;
    }
    [...el.attributes].forEach((attr) => {
      const n = attr.name.toLowerCase();
      if (n === "color" || n === "face") return; // legacy <font> attrs
      if (n === "style") {
        const out = ALLOWED_STYLE
          .map((k) => { const v = el.style.getPropertyValue(k); return v ? `${k}:${v}` : null; })
          .filter(Boolean)
          .join(";");
        if (out) el.setAttribute("style", out); else el.removeAttribute("style");
        return;
      }
      el.removeAttribute(attr.name);
    });
  });
  return div.innerHTML;
}

/**
 * Unified post renderer. New posts are sanitized HTML (from the rich editor);
 * legacy posts use BBCode or plain text. Returns an HTML string for
 * dangerouslySetInnerHTML.
 */
export function renderPostHtml(text) {
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return sanitizeHtml(text); // HTML (new)
  return renderFormattedText(text); // BBCode / plain (legacy) — already escaped
}

export function timeAgo(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
