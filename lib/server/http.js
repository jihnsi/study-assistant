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

// extraHeaders: optional extra response headers, for example { 'X-Memory': 'on' }.
export function streamResponse({ stream, pageCount, memory }, extraHeaders = {}) {
  return new Response(stream, {
    status: 200,
    headers: {
      ...(memory ? { 'X-Memory': memory } : {}),
      ...extraHeaders,
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

// Passes a byte stream through unchanged while collecting its text. `done` resolves with the
// full text once the stream has ended normally, or with null if it errored or the reader
// cancelled (the client went away). Used to hand the finished answer to the memory step.
export function tapStream(stream, maxChars = 30000) {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let text = '';
  let settle;
  const done = new Promise((resolve) => {
    settle = resolve;
  });
  const out = new ReadableStream({
    async pull(controller) {
      let r;
      try {
        r = await reader.read();
      } catch (err) {
        settle(null);
        controller.error(err);
        return;
      }
      if (r.done) {
        text += decoder.decode();
        settle(text);
        controller.close();
        return;
      }
      if (text.length < maxChars) text += decoder.decode(r.value, { stream: true });
      controller.enqueue(r.value);
    },
    cancel(reason) {
      settle(null);
      return reader.cancel(reason).catch(() => {});
    },
  });
  return { stream: out, done };
}
