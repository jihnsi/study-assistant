// Optional embeddings from Voyage AI, used only to pick relevant pages for long documents.
// Docs: https://docs.voyageai.com  (POST https://api.voyageai.com/v1/embeddings)
//
// Env (server only):
//   VOYAGE_API_KEY  optional; without it every function here returns null and callers fall back
//   VOYAGE_MODEL    default "voyage-4-lite" (cheapest current model, $0.02/M tokens, 200M free)
//   VOYAGE_RERANK_MODEL  default "rerank-3-lite"; see rerank() below
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

// ---------- reranking ----------
// Docs: https://docs.voyageai.com/docs/reranker  (POST https://api.voyageai.com/v1/rerank)
// A reranker reads the query together with each candidate page, so it judges relevance more
// precisely than embedding similarity. It is slower and costs more per page, so it only sees a
// shortlist. Limits for rerank-3-lite: query 8,000 tokens; query + one document 32,000 tokens;
// query tokens x documents + all document tokens 600,000; at most 1,000 documents.
//
// Env: VOYAGE_RERANK_MODEL  default "rerank-3-lite" (cheapest current reranker, $0.02/M tokens)

const RERANK_ENDPOINT = 'https://api.voyageai.com/v1/rerank';
const RERANK_TIMEOUT_MS = 15000;
const MAX_RERANK_DOCS = 100;
// 30 candidates x 4,000 characters is at most about 120K tokens even for Chinese, well under 600K.
const MAX_CHARS_PER_RERANK_DOC = 4000;
const MAX_RERANK_QUERY_CHARS = 3000;

function rerankModel() {
  return (process.env.VOYAGE_RERANK_MODEL || '').trim() || 'rerank-3-lite';
}

// Ranks `documents` (strings) against `query`. Returns [{ index, score }] best first, at most
// `topK` long, or null on any failure (missing key, network, rate limit, bad response).
export async function rerank(query, documents, topK) {
  const { apiKey } = config();
  if (!apiKey || !Array.isArray(documents) || documents.length === 0) return null;
  const docs = documents.slice(0, MAX_RERANK_DOCS).map((d) => {
    const t = String(d ?? '').slice(0, MAX_CHARS_PER_RERANK_DOC);
    return t.trim() ? t : '-';
  });
  const k = Math.max(1, Math.min(Number(topK) || docs.length, docs.length));
  try {
    const res = await fetch(RERANK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        query: String(query).slice(0, MAX_RERANK_QUERY_CHARS),
        documents: docs,
        model: rerankModel(),
        top_k: k,
        truncation: true,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(RERANK_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[voyage] rerank status', res.status);
      return null;
    }
    const data = await res.json();
    const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.results) ? data.results : null;
    if (!rows) return null;
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      const index = r?.index;
      const score = r?.relevance_score;
      if (!Number.isInteger(index) || index < 0 || index >= docs.length || seen.has(index)) continue;
      if (typeof score !== 'number' || !Number.isFinite(score)) continue;
      seen.add(index);
      out.push({ index, score });
    }
    if (out.length === 0) return null;
    return out.sort((a, b) => b.score - a.score).slice(0, k);
  } catch {
    console.error('[voyage] rerank request failed');
    return null;
  }
}
