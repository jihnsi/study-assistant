// Shared request handling for the API routes.

import { ApiFail, errorResponse } from './errors.js';
import { isValidFileId } from './appwrite-file.js';

export function bearerJwt(request) {
  const header = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(\S+)$/i.exec(header);
  if (!m) throw new ApiFail('unauthorized');
  return m[1];
}

export async function readBody(request) {
  try {
    const body = await request.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch {
    // fall through
  }
  throw new ApiFail('bad_request');
}

export function validLang(lang) {
  if (lang !== 'en' && lang !== 'zh') throw new ApiFail('bad_request');
  return lang;
}

export function validFileId(id) {
  if (!isValidFileId(id)) throw new ApiFail('bad_request');
  return id;
}

export function streamResponse({ stream, pageCount }) {
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Page-Count': String(pageCount),
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Wraps a route body so any thrown ApiFail becomes the JSON error response.
export async function guarded(fn) {
  try {
    return await fn();
  } catch (err) {
    return errorResponse(err);
  }
}
