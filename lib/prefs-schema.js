// The shape of Margin's per-user preferences and memories, shared by the browser and the server.
// Stored in the Appwrite account's prefs under the `margin` key (account prefs are private to the
// user and capped at 64 KB). Appwrite replaces the whole prefs object on update, so always merge:
// { ...currentPrefs, margin: normalizeMarginPrefs(next) }.

export const LEVELS = ['beginner', 'standard', 'advanced'];
export const LENGTHS = ['short', 'detailed'];
export const MEMORY_MAX = 50;
// Where a remembered note came from: a question in Ask, a PDF the student summarised, or typed by the student.
export const MEMORY_SOURCES = ['ask', 'pdf', 'you'];
export const MEMORY_TEXT_MAX = 200;

export const DEFAULT_MARGIN_PREFS = Object.freeze({
  v: 1,
  level: 'standard',
  length: 'short',
  remember: true,
  memories: [],
});

function cleanText(value, max) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

// Returns a valid preferences object from anything (missing, old or tampered data included).
// An `about` field from earlier versions is dropped: memory notes (including ones the student adds) replace it.
export function normalizeMarginPrefs(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const memories = Array.isArray(r.memories) ? r.memories : [];
  const seen = new Set();
  return {
    v: 1,
    level: LEVELS.includes(r.level) ? r.level : DEFAULT_MARGIN_PREFS.level,
    length: LENGTHS.includes(r.length) ? r.length : DEFAULT_MARGIN_PREFS.length,
    remember: r.remember !== false,
    memories: memories
      .map((m) => ({
        id: typeof m?.id === 'string' && /^[a-z0-9]{1,16}$/i.test(m.id) ? m.id : '',
        text: cleanText(m?.text, MEMORY_TEXT_MAX),
        at: typeof m?.at === 'string' ? m.at.slice(0, 32) : '',
        source: MEMORY_SOURCES.includes(m?.source) ? m.source : 'ask',
      }))
      .filter((m) => m.id && m.text && !seen.has(m.id) && seen.add(m.id))
      .slice(-MEMORY_MAX),
  };
}

// Short stable fingerprint of the settings that change how a summary is written (level and length;
// not memories),
// used in client cache keys so a cached summary is not reused after the student changes them.
export function summaryPrefsKey(prefs) {
  const p = normalizeMarginPrefs(prefs);
  const s = `${p.level}|${p.length}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `${p.level[0]}${p.length[0]}${(h >>> 0).toString(36)}`;
}

export function newMemoryId() {
  return Math.random().toString(36).slice(2, 10) || 'm0';
}
