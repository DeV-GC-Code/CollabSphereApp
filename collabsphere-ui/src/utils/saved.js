const KEY = "cs_saved";

export function loadSavedPosts() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function loadSavedIds() {
  return new Set(loadSavedPosts().map((p) => p.id));
}

function persist(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    return true;
  } catch {
    // Quota exceeded (saved posts can carry base64 media). Drop oldest
    // entries until it fits rather than throwing and breaking the UI.
    const trimmed = items.slice();
    while (trimmed.length > 1) {
      trimmed.pop();
      try { localStorage.setItem(KEY, JSON.stringify(trimmed)); return true; } catch { /* keep trimming */ }
    }
    return false;
  }
}

export function toggleSaved(post) {
  const existing = loadSavedPosts();
  const idx = existing.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    existing.splice(idx, 1);
    persist(existing);
    return false;
  }
  persist([{ ...post, _savedAt: Date.now() }, ...existing]);
  return true;
}
