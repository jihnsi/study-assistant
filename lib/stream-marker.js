// Shared by the server (writes the marker) and lib/api.js (strips it).
//
// If the model fails after the response has started, the HTTP status can no longer change.
// The server ends the text stream with this line instead:
//
//   \n\n[[MARGIN_ERROR:<code>]]
//
// <code> is "model_error" (upstream failed or cut off) or "truncated" (hit the output limit).

export const MARKER_PREFIX = '\n\n[[MARGIN_ERROR:';
export const MARKER_SUFFIX = ']]';

export function errorMarker(code) {
  return `${MARKER_PREFIX}${code}${MARKER_SUFFIX}`;
}

const MARKER_RE = /\n\n\[\[MARGIN_ERROR:([a-z_]+)\]\]\s*$/;

// Splits streamed text into visible text and an optional stream error code.
// With final=false it also holds back a trailing partial marker so it never flashes on screen.
export function splitMarker(text, final = false) {
  const m = MARKER_RE.exec(text);
  if (m) return { text: text.slice(0, m.index), error: m[1] };
  if (!final) {
    const max = Math.min(text.length, MARKER_PREFIX.length - 1);
    for (let k = max; k >= 1; k--) {
      if (text.endsWith(MARKER_PREFIX.slice(0, k))) return { text: text.slice(0, -k), error: null };
    }
    const open = text.lastIndexOf(MARKER_PREFIX);
    if (open !== -1 && !text.includes(MARKER_SUFFIX, open)) {
      return { text: text.slice(0, open), error: null };
    }
  }
  return { text, error: null };
}
