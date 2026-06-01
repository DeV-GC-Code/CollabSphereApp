const KEY = "cs_saved";

export function loadSavedPosts() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function loadSavedIds() {
  return new Set(loadSavedPosts().map((p) => p.id));
}

export function toggleSaved(post) {
  const existing = loadSavedPosts();
  const idx = existing.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    existing.splice(idx, 1);
    localStorage.setItem(KEY, JSON.stringify(existing));
    return false;
  }
  localStorage.setItem(KEY, JSON.stringify([{ ...post, _savedAt: Date.now() }, ...existing]));
  return true;
}
