// Finished summaries are kept in this browser so reopening a PDF does not call the AI again.
// Every access is wrapped: storage can be blocked, full or empty (private windows, cleared data).

const PREFIX = 'margin:summary:';

const keyFor = (fileId, lang) => `${PREFIX}${fileId}:${lang}`;

// Returns { text, pageCount, at } or null.
export function readSummary(fileId, lang) {
  try {
    const raw = localStorage.getItem(keyFor(fileId, lang));
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

// Returns the save time, or null when the browser would not store it.
export function writeSummary(fileId, lang, { text, pageCount }) {
  try {
    const at = Date.now();
    localStorage.setItem(keyFor(fileId, lang), JSON.stringify({ text, pageCount, at }));
    return at;
  } catch {
    // Not saved: the summary still shows, it just will not be there next time.
    return null;
  }
}

// Called when a PDF is deleted so its summary text does not linger in the browser.
export function clearSummaries(fileId) {
  try {
    for (const lang of ['en', 'zh']) localStorage.removeItem(keyFor(fileId, lang));
  } catch {
    // ignore
  }
}
