// Client helper for the server-side AI endpoints (/api/summarize, /api/ask).
// Browser only: it mints Appwrite JWTs so the server can read the user's own files.

import { account, BUCKET_ID, ENDPOINT, PROJECT_ID } from './appwrite';
import { splitMarker } from './stream-marker.js';

export class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// Appwrite JWTs live 15 minutes; reuse one for 10.
const JWT_TTL_MS = 10 * 60 * 1000;
let cached = null; // { jwt, at }
let pending = null;

export async function getJwt({ force = false } = {}) {
  if (!force && cached && Date.now() - cached.at < JWT_TTL_MS) return cached.jwt;
  if (!pending) {
    pending = account
      .createJWT()
      .then((res) => {
        cached = { jwt: res.jwt, at: Date.now() };
        return res.jwt;
      })
      .catch(() => {
        cached = null;
        throw new ApiError('unauthorized', 401);
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

function isAbort(err) {
  return err && err.name === 'AbortError';
}

async function post(path, body, jwt, signal) {
  try {
    return await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new ApiError('network', 0);
  }
}

async function errorFrom(res) {
  let code = null;
  try {
    const data = await res.json();
    if (data && typeof data.error === 'string') code = data.error;
  } catch {
    // not JSON
  }
  return new ApiError(code || (res.status === 401 ? 'unauthorized' : 'server_error'), res.status);
}

// POSTs JSON and reads the streamed Markdown reply.
// Resolves { text, pageCount, streamError }. streamError is null, or "model_error" / "truncated"
// when the server had to stop mid-stream (text then holds the partial answer).
export async function streamFromApi(path, body, { onText, signal } = {}) {
  let res = await post(path, body, await getJwt(), signal);
  if (res.status === 401) {
    res = await post(path, body, await getJwt({ force: true }), signal);
  }
  if (!res.ok) throw await errorFrom(res);

  const header = res.headers.get('X-Page-Count');
  const parsed = header == null || header === '' ? NaN : Number(header);
  const pageCount = Number.isFinite(parsed) ? parsed : null;

  let raw = '';
  try {
    if (!res.body) {
      raw = await res.text();
      const shown = splitMarker(raw, false).text;
      if (onText && shown) onText(shown);
    } else {
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let lastShown = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const shown = splitMarker(raw, false).text;
        if (onText && shown !== lastShown) {
          lastShown = shown;
          onText(shown);
        }
      }
      raw += decoder.decode();
    }
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new ApiError('network', 0);
  }

  const { text, error } = splitMarker(raw, true);
  if (onText) onText(text);
  return { text, pageCount, streamError: error };
}

// Fetches the PDF with the user's JWT and returns a blob: URL for the viewer.
// The caller owns the URL and must revoke it with URL.revokeObjectURL.
export async function fetchPdfBlobUrl(fileId) {
  const jwt = await getJwt();
  let res;
  try {
    res = await fetch(`${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${encodeURIComponent(fileId)}/view`, {
      headers: { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-JWT': jwt },
    });
  } catch {
    throw new ApiError('network', 0);
  }
  if (!res.ok) {
    const code = res.status === 401 ? 'unauthorized' : res.status === 404 ? 'not_found' : 'server_error';
    throw new ApiError(code, res.status);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
