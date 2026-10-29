// Fitting a long document into the model's context: page budget, grouping for map-reduce,
// and choosing the most relevant pages for a question (Voyage embeddings, else lexical).

import { cosine, embedPages, embedQuery } from './voyage.js';

// Characters of page text sent in one model request. About 100K characters is well inside the
// context window for English; Chinese text uses more tokens per character, so this is a cap,
// not a target.
export const PAGE_CHAR_BUDGET = 100000;
// Map-reduce reads at most this many groups; a longer document is sampled evenly by page.
export const MAX_GROUPS = 12;

const TAG_COST = 24; // <page n="123"></page> plus a newline

export function pageCost(p) {
  return p.text.length + TAG_COST;
}

export function totalCost(pages) {
  return pages.reduce((n, p) => n + pageCost(p), 0);
}

function clip(p, budget) {
  const max = budget - TAG_COST;
  return p.text.length > max ? { ...p, text: p.text.slice(0, max) } : p;
}

// ---------- grouping (summaries of long documents) ----------

// Splits pages, in order, into groups that each fit the budget. Empty pages are dropped.
// If that needs more than MAX_GROUPS groups, pages are sampled evenly to fit.
export function groupPages(pages, budget = PAGE_CHAR_BUDGET, maxGroups = MAX_GROUPS) {
  const all = pages.filter((p) => p.text.trim() !== '').map((p) => clip(p, budget));
  let usable = all;
  let groups = pack(usable, budget);
  // Too long even for maxGroups groups: keep an evenly spaced sample of the pages, thinning
  // further until the packing fits.
  let keepRatio = Math.min(1, (budget * maxGroups) / Math.max(totalCost(all), 1));
  while (groups.length > maxGroups && keepRatio > 0.01) {
    keepRatio *= 0.9;
    const keep = Math.max(1, Math.floor(all.length * keepRatio));
    usable = Array.from({ length: keep }, (_, i) => all[Math.floor((i * all.length) / keep)]);
    groups = pack(usable, budget);
  }
  return groups;
}

function pack(pages, budget) {
  const groups = [];
  let current = [];
  let used = 0;
  for (const p of pages) {
    const c = pageCost(p);
    if (current.length && used + c > budget) {
      groups.push(current);
      current = [];
      used = 0;
    }
    current.push(p);
    used += c;
  }
  if (current.length) groups.push(current);
  return groups;
}

// ---------- lexical ranking (works for English and Chinese) ----------

const STOPWORDS = new Set(
  (
    'a an and are as at be but by can do does for from has have how i in is it its of on or ' +
    'that the this to was were what when where which who why will with you your about into ' +
    'than then there these they their them we our not no if so such also any all each more most'
  ).split(' '),
);

const CJK_RUN = /[぀-ヿ㐀-䶿一-鿿豈-﫿]+/g;
const WORD = /[a-z0-9]+/g;

// English words (lowercased, no stopwords) plus character bigrams for CJK runs.
// A lone CJK character becomes a unigram so one-character queries still match.
export function tokenize(text) {
  const lower = String(text).toLowerCase();
  const terms = [];
  for (const m of lower.matchAll(WORD)) {
    const w = m[0];
    if (w.length >= 2 && !STOPWORDS.has(w)) terms.push(w);
  }
  for (const m of lower.matchAll(CJK_RUN)) {
    const run = Array.from(m[0]);
    if (run.length === 1) terms.push(run[0]);
    else for (let i = 0; i < run.length - 1; i++) terms.push(run[i] + run[i + 1]);
  }
  return terms;
}

// BM25 score of every page against the query. Returns number[] aligned with `pages`.
export function lexicalScores(pages, query) {
  const queryTerms = [...new Set(tokenize(query))];
  const docs = pages.map((p) => {
    const tf = new Map();
    const terms = tokenize(p.text);
    for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
    return { tf, len: terms.length };
  });
  const n = docs.length;
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(n, 1) || 1;
  const k1 = 1.2;
  const b = 0.75;
  const idf = new Map();
  for (const t of queryTerms) {
    let df = 0;
    for (const d of docs) if (d.tf.has(t)) df++;
    idf.set(t, Math.log(1 + (n - df + 0.5) / (df + 0.5)));
  }
  return docs.map((d) => {
    let score = 0;
    for (const t of queryTerms) {
      const f = d.tf.get(t);
      if (!f) continue;
      score += idf.get(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / avgLen)));
    }
    return score;
  });
}

// ---------- choosing pages for a question ----------

// Fills the budget with the highest-scoring pages, then returns them in page order.
export function fillBudget(pages, scores, budget = PAGE_CHAR_BUDGET) {
  const order = pages
    .map((p, i) => i)
    .filter((i) => pages[i].text.trim() !== '')
    .sort((a, b) => scores[b] - scores[a] || a - b);
  const chosen = [];
  let used = 0;
  for (const i of order) {
    const p = clip(pages[i], budget);
    const c = pageCost(p);
    if (used + c > budget) continue;
    chosen.push(p);
    used += c;
  }
  return chosen.sort((a, b) => a.page - b.page);
}

// Returns pages to send for a question. Within budget: all pages. Over budget: the most relevant
// ones, ranked by Voyage embeddings when available, otherwise by lexical score.
export async function choosePages(pages, query, version, budget = PAGE_CHAR_BUDGET) {
  if (totalCost(pages) <= budget) return pages;
  let scores = null;
  const [vectors, q] = await Promise.all([embedPages(version, pages), embedQuery(query)]);
  if (vectors && q) scores = vectors.map((v) => cosine(v, q));
  if (!scores) scores = lexicalScores(pages, query);
  return fillBudget(pages, scores, budget);
}
