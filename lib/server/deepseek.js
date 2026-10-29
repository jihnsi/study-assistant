// DeepSeek chat completions (OpenAI-compatible) over fetch.
// Docs: https://api-docs.deepseek.com  (POST {base}/chat/completions, SSE when stream: true,
// final event "data: [DONE]").
//
// Env (server only, never NEXT_PUBLIC_):
//   DEEPSEEK_API_KEY   required
//   DEEPSEEK_MODEL     default "deepseek-flash"
//   DEEPSEEK_BASE_URL  default "https://api.deepseek.com"

import { ApiFail } from './errors.js';
import { errorMarker } from '../stream-marker.js';

const TEMPERATURE = 0.3;
const CONNECT_TIMEOUT_MS = 45000; // time to first response headers
const COMPLETE_TIMEOUT_MS = 55000;

export function getConfig() {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  const model = (process.env.DEEPSEEK_MODEL || '').trim() || 'deepseek-flash';
  const baseUrl = ((process.env.DEEPSEEK_BASE_URL || '').trim() || 'https://api.deepseek.com').replace(/\/+$/, '');
  return { apiKey, model, baseUrl };
}

export function isConfigured() {
  return getConfig().apiKey !== '';
}

// ---------- SSE parsing ----------

// Incremental parser for a "text/event-stream" body. Feed it raw byte chunks in any split:
// lines and multibyte characters may be cut anywhere. Returns events:
//   { type: 'text', text }  { type: 'finish', reason }  { type: 'error' }  { type: 'done' }
export class SseParser {
  constructor() {
    this.decoder = new TextDecoder('utf-8');
    this.buffer = '';
    this.done = false;
  }

  push(chunk) {
    this.buffer += typeof chunk === 'string' ? chunk : this.decoder.decode(chunk, { stream: true });
    const events = [];
    let nl;
    while ((nl = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, nl).replace(/\r$/, '');
      this.buffer = this.buffer.slice(nl + 1);
      this.#line(line, events);
    }
    return events;
  }

  flush() {
    const events = [];
    this.buffer += this.decoder.decode();
    if (this.buffer) {
      this.#line(this.buffer.replace(/\r$/, ''), events);
      this.buffer = '';
    }
    return events;
  }

  #line(line, events) {
    if (this.done) return;
    // Blank lines separate events; lines starting with ":" are comments (keep-alives).
    if (line === '' || line.startsWith(':')) return;
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (data === '') return;
    if (data === '[DONE]') {
      this.done = true;
      events.push({ type: 'done' });
      return;
    }
    let obj;
    try {
      obj = JSON.parse(data);
    } catch {
      return; // partial or unknown line: ignore
    }
    if (obj && obj.error) {
      events.push({ type: 'error' });
      return;
    }
    const choice = obj && Array.isArray(obj.choices) ? obj.choices[0] : null;
    if (!choice) return;
    const text = choice.delta && choice.delta.content;
    if (typeof text === 'string' && text !== '') events.push({ type: 'text', text });
    if (choice.finish_reason) events.push({ type: 'finish', reason: choice.finish_reason });
  }
}

// ---------- HTTP ----------

function mapStatus(status) {
  if (status === 429) return new ApiFail('rate_limited');
  // 401 bad key, 402 no balance, 400/422 bad request we built, 5xx upstream trouble.
  return new ApiFail('model_error');
}

function requestBody(messages, { stream, maxTokens, json, temperature }) {
  const { model } = getConfig();
  const body = { model, messages, stream: !!stream, temperature: temperature ?? TEMPERATURE, max_tokens: maxTokens };
  // JSON output mode: the prompt must mention "json" and show the shape (DeepSeek docs).
  if (json) body.response_format = { type: 'json_object' };
  // DeepSeek V4 models think by default (slow, and temperature has no effect). Study answers
  // do not need it. Older names such as deepseek-chat are already non-thinking.
  if (/^deepseek-(flash|v4)/.test(model)) body.thinking = { type: 'disabled' };
  return body;
}

async function cancelBody(res) {
  try {
    await res.body?.cancel();
  } catch {
    // ignore
  }
}

async function post(messages, { stream, maxTokens, signal, timeoutMs, json, temperature }) {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey) throw new ApiFail('not_configured');
  // The timer covers the wait for response headers (and, for non-streamed calls, the whole reply).
  // A streamed answer may then run on; a timeout signal passed to fetch would also cut the body.
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(requestBody(messages, { stream, maxTokens, json, temperature })),
        cache: 'no-store',
        signal: combined,
      });
    } catch (err) {
      if (signal && signal.aborted) throw err;
      throw new ApiFail('model_error');
    }
    if (res.ok) {
      if (stream) clearTimeout(timer);
      return res;
    }
    // One quick retry for transient upstream trouble.
    if ((res.status === 500 || res.status === 503) && attempt === 0) {
      await cancelBody(res);
      await new Promise((r) => setTimeout(r, 700));
      continue;
    }
    console.error('[deepseek] upstream status', res.status);
    await cancelBody(res);
    throw mapStatus(res.status);
  }
}

// Non-streamed call; resolves the full reply text. Options: json (JSON output mode),
// temperature, timeoutMs.
export async function completeChat(
  messages,
  { maxTokens = 2000, signal, json = false, temperature, timeoutMs = COMPLETE_TIMEOUT_MS } = {},
) {
  const res = await post(messages, { stream: false, maxTokens, signal, timeoutMs, json, temperature });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new ApiFail('model_error');
  }
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof text !== 'string' || text.trim() === '') throw new ApiFail('model_error');
  return text;
}

// Streamed call. Rejects with ApiFail if DeepSeek refuses the request (so the route can still
// answer with a JSON error). Otherwise resolves a ReadableStream of UTF-8 bytes holding just the
// answer text. If the model fails after output has started, the stream ends with an error marker
// line (see lib/stream-marker.js) instead of erroring.
export async function streamChat(messages, { maxTokens = 4000, signal } = {}) {
  const res = await post(messages, { stream: true, maxTokens, signal, timeoutMs: CONNECT_TIMEOUT_MS });
  if (!res.body) throw new ApiFail('model_error');
  return sseToTextStream(res.body);
}

// Turns an upstream SSE body into a stream of UTF-8 answer bytes. Exported for tests.
export function sseToTextStream(upstream) {
  const encoder = new TextEncoder();
  const reader = upstream.getReader();
  const parser = new SseParser();
  let sawFinish = false;

  return new ReadableStream({
    async pull(controller) {
      // Loop until something is enqueued or the stream ends, so pull never returns without progress.
      for (;;) {
        let read;
        try {
          read = await reader.read();
        } catch {
          controller.enqueue(encoder.encode(errorMarker('model_error')));
          controller.close();
          return;
        }
        const events = read.done ? parser.flush() : parser.push(read.value);
        let out = '';
        let marker = null;
        let finished = read.done;
        for (const ev of events) {
          if (ev.type === 'text') out += ev.text;
          else if (ev.type === 'finish') {
            sawFinish = true;
            if (ev.reason === 'length') marker = 'truncated';
            else if (ev.reason !== 'stop') marker = marker || 'model_error';
          } else if (ev.type === 'error') marker = 'model_error';
          else if (ev.type === 'done') finished = true;
        }
        if (finished && !sawFinish && !marker) marker = 'model_error'; // cut off without a finish reason
        if (out) controller.enqueue(encoder.encode(out));
        if (marker) controller.enqueue(encoder.encode(errorMarker(marker)));
        if (finished || marker) {
          if (!read.done) reader.cancel().catch(() => {});
          controller.close();
          return;
        }
        if (out) return;
      }
    },
    cancel(reason) {
      return reader.cancel(reason).catch(() => {});
    },
  });
}
