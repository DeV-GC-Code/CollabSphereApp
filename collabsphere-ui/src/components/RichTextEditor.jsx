import { useCallback, useRef } from "react";

/**
 * RichTextEditor — a lightweight WYSIWYG composer. Bold / Italic / Underline /
 * Color / Font apply live to the selected text (no raw BBCode brackets). Output
 * is HTML (sanitized on publish). Uncontrolled: the parent reads/clears via the
 * passed `editorRef` and gets updates through onChange({ html, text }).
 *
 * Selection is preserved across toolbar interactions: buttons use mousedown
 * preventDefault so focus never leaves the editor, and the dropdowns restore the
 * last saved range before applying — so color/font work on the prior selection.
 */
const COLORS = [
  { label: "Default", value: "" },
  { label: "Green", value: "#2E7D52" },
  { label: "Teal", value: "#0F766E" },
  { label: "Amber", value: "#CB7E2F" },
  { label: "Red", value: "#D44C47" },
  { label: "Blue", value: "#1A6DC2" },
];
const FONTS = [
  { label: "Sans", value: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { label: "Mono", value: "JetBrains Mono, ui-monospace, monospace" },
  { label: "Serif", value: "Georgia, Cambria, 'Times New Roman', serif" },
];

export function RichTextEditor({ editorRef, onChange, onSubmit, placeholder }) {
  const savedRange = useRef(null);

  const saveSel = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }, [editorRef]);

  const restoreSel = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
  }, [editorRef]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el || !onChange) return;
    onChange({ html: el.innerHTML, text: (el.innerText || "").replace(/ /g, " ").trim() });
  }, [editorRef, onChange]);

  const exec = useCallback((cmd, val = null) => {
    restoreSel();
    document.execCommand(cmd, false, val);
    saveSel();
    emit();
  }, [restoreSel, saveSel, emit]);

  const onColor = (e) => {
    const v = e.target.value;
    e.target.value = "";
    if (v) exec("foreColor", v); else exec("removeFormat");
  };
  const onFont = (e) => {
    const v = e.target.value;
    e.target.value = "";
    if (v) exec("fontName", v);
  };

  const stop = (e) => e.preventDefault(); // keep selection/focus on the editor

  return (
    <div className="rte">
      <div className="composer__format-bar rte__bar">
        <button type="button" className="format-btn" title="Bold (⌘B)" onMouseDown={stop} onClick={() => exec("bold")}>
          <strong>B</strong>
        </button>
        <button type="button" className="format-btn" title="Italic (⌘I)" onMouseDown={stop} onClick={() => exec("italic")}>
          <em>I</em>
        </button>
        <button type="button" className="format-btn" title="Underline (⌘U)" onMouseDown={stop} onClick={() => exec("underline")}>
          <u>U</u>
        </button>

        <div className="format-separator" />

        <select className="format-select" defaultValue="" onMouseDown={saveSel} onChange={onColor} aria-label="Text color">
          <option value="" disabled>Color</option>
          {COLORS.map((c) => <option key={c.label} value={c.value}>{c.label}</option>)}
        </select>

        <select className="format-select" defaultValue="" onMouseDown={saveSel} onChange={onFont} aria-label="Font">
          <option value="" disabled>Font</option>
          {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>

        <button type="button" className="format-btn rte__clear" title="Clear formatting" onMouseDown={stop} onClick={() => exec("removeFormat")}>
          ⌫
        </button>
      </div>

      <div
        ref={editorRef}
        className="rte__area"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Write a post"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={emit}
        onKeyUp={saveSel}
        onMouseUp={saveSel}
        onBlur={saveSel}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); onSubmit?.(); }
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") { e.preventDefault(); exec("bold"); }
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") { e.preventDefault(); exec("italic"); }
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") { e.preventDefault(); exec("underline"); }
        }}
      />
    </div>
  );
}
