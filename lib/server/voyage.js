// Optional embeddings from Voyage AI, used only to pick relevant pages for long documents.
// Docs: https://docs.voyageai.com  (POST https://api.voyageai.com/v1/embeddings)
//
// Env (server only):
//   VOYAGE_API_KEY  optional; without it every function here returns null and callers fall back
//   VOYAGE_MODEL    default "voyage-4-lite" (cheapest current model, $0.02/M tokens, 200M free)
//
// Every failure (missing key, network, rate limit, bad response) returns null. Nothing here throws.

const ENDPOINT = 'https://api.voyageai.com/v1/embeddings';
const TIMEOUT_MS = 20000;
const MAX_INPUTS_PER_BATCH = 128;
// Stay well inside Voyage's per-request token limit, for Chinese text too.
const MAX_CHARS_PER_BATCH = 90000;
const MAX_CHARS_PER_PAGE = 6000;
const CACHE_SIZE = 10;

const pageCache = new Map(); // version -> Float32Array[] (one per page, in order)

function config() {
  return {
    apiKey: (process.env.VOYAGE_API_KEY || '').trim(),
    model: (process.env.VOYAGE_MODEL || '').trim() || 'voyage-4-lite',
  };
}

export function isVoyageConfigured() {
  return config().apiKey !== '';
}

async function embed(texts, inputType) {
  const { apiKey, model } = config();
  if (!apiKey) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ input: texts, model, input_type: inputType }),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[voyage] status', res.status);
      return null;
    }
    const data = await res.json();
    if (!data || !Array.isArray(data.data) || data.data.length !== texts.length) return null;
    const sorted = [...data.data].sort((a, b) => a.index - b.index);
    const out = sorted.map((d) => Float32Array.from(d.embedding));
    return out.every((v) => v.length > 0) ? out : null;
  } catch {
    console.error('[voyage] request failed');
    return null;
  }
}

// Groups inputs into batches within Voyage's per-request limits. Exported for tests.
export function makeBatches(texts) {
  const batches = [];
  let current = [];
  let chars = 0;
  texts.forEach((t, i) => {
    if (current.length && (current.length >= MAX_INPUTS_PER_BATCH || chars + t.length > MAX_CHARS_PER_BATCH)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(i);
    chars += t.length;
  });
  if (current.length) batches.push(current);
  return batches;
}

// Embeds every page (cached per file version). Returns Float32Array[] or null.
export async function embedPages(version, pages) {
  if (!isVoyageConfigured()) return null;
  const hit = pageCache.get(version);
  if (hit && hit.length === pages.length) {
    pageCache.delete(version);
    pageCache.set(version, hit);
    return hit;
  }
  // Empty pages cannot be embedded; send a placeholder and ignore the result for them.
  const texts = pages.map((p) => (p.text.trim() ? p.text.slice(0, MAX_CHARS_PER_PAGE) : '-'));
  const vectors = new Array(pages.length);
  for (const batch of makeBatches(texts)) {
    const res = await embed(batch.map((i) => texts[i]), 'document');
    if (!res) return null;
    batch.forEach((pageIndex, k) => {
      vectors[pageIndex] = res[k];
    });
  }
  pageCache.set(version, vectors);
  while (pageCache.size > CACHE_SIZE) pageCache.delete(pageCache.keys().next().value);
  return vectors;
}

// Embeds a question. Returns Float32Array or null.
export async function embedQuery(text) {
  const res = await embed([text.slice(0, MAX_CHARS_PER_PAGE)], 'query');
  return res ? res[0] : null;
}

export function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
