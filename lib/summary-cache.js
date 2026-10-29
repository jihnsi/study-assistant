// Finished summaries are kept in this browser so reopening a PDF does not call the AI again.
// Every access is wrapped: storage can be blocked, full or empty (private windows, cleared data).
//
// Key: margin:summary:<fileId>:<lang>:<prefsKey>. prefsKey is summaryPrefsKey(prefs) from
// lib/prefs-schema.js (level and length), so a summary written before the student
// changed those is never shown afterwards. Keys from before this existed (no prefsKey) are never read
// and are cleaned up the next time that PDF's summary is saved or the PDF is deleted.

const PREFIX = 'margin:summary:';

const filePrefix = (fileId) => `${PREFIX}${fileId}:`;
const keyFor = (fileId, lang, prefsKey) => `${filePrefix(fileId)}${lang}:${prefsKey}`;

// All stored keys that belong to one PDF (every language and every preferences variant, old format too).
function keysForFile(fileId) {
  const prefix = filePrefix(fileId);
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k);
  }
  return keys;
}

// Returns { text, pageCount, at } or null.
export function readSummary(fileId, lang, prefsKey) {
  try {
    const raw = localStorage.getItem(keyFor(fileId, lang, prefsKey));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.text !== 'string' || !data.text.trim()) return null;
    return {
      text: data.text,
      pageCount: Number.isFinite(data.pageCount) ? data.pageCount : null,
      at: Number.isFinite(data.at) ? data.at : null,
    };
  } catch {
    return null;
  }
}

// The page count of this PDF if any saved summary (whatever its preferences) recorded it.
export function readPageCount(fileId) {
  try {
    for (const k of keysForFile(fileId)) {
      const n = JSON.parse(localStorage.getItem(k) || 'null')?.pageCount;
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    // ignore
  }
  return null;
}

// Returns the save time, or null when the browser would not store it. Only the newest summary per
// PDF and language is kept, so changing preferences does not pile up old copies.
export function writeSummary(fileId, lang, prefsKey, { text, pageCount }) {
  try {
    const at = Date.now();
    const mine = keyFor(fileId, lang, prefsKey);
    const sameLang = `${filePrefix(fileId)}${lang}`;
    for (const k of keysForFile(fileId)) {
      if (k !== mine && (k === sameLang || k.startsWith(`${sameLang}:`))) localStorage.removeItem(k);
    }
    localStorage.setItem(mine, JSON.stringify({ text, pageCount, at }));
    return at;
  } catch {
    // Not saved: the summary still shows, it just will not be there next time.
    return null;
  }
}

// Called when a PDF is deleted so its summaries (all languages and variants) do not linger in the browser.
export function clearSummaries(fileId) {
  try {
    for (const k of keysForFile(fileId)) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}
