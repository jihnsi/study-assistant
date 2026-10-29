// Per-page text extraction with an in-memory LRU cache.
//
// The cache never bypasses permissions: getPdfPages always runs the Appwrite access check
// (getFileMeta with the caller's JWT) first, and only then looks at the cache.

import { extractText, getDocumentProxy } from 'unpdf';
import { downloadFile, getFileMeta } from './appwrite-file.js';
import { ApiFail } from './errors.js';

const CACHE_SIZE = 20;
const MAX_PAGES = 1000;
const MIN_TEXT_CHARS = 30; // fewer non-space characters than this in the whole file = no text layer

const cache = new Map(); // version -> { pages, pageCount }
const inflight = new Map(); // version -> Promise

const CJK = '\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef';
const CJK_GAP_RE = new RegExp(`([${CJK}]) +(?=[${CJK}])`, 'g');

// Some CJK fonts (e.g. Microsoft JhengHei) map common characters to Kangxi / CJK radical
// code points, so 目 and 一 extract as ⽬ and ⼀. NFKC maps those back; it is applied to
// these two blocks only, because NFKC on the whole text would also flatten things like x².
const RADICALS_RE = /[⺀-⻿⼀-⿟]/g;

export function normalizeText(raw) {
  const lines = String(raw)
    .replace(RADICALS_RE, (c) => c.normalize('NFKC'))
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/[ \t  -   ]+/g, ' ')
        .replace(CJK_GAP_RE, '$1')
        .trim(),
    );
  const out = [];
  for (const line of lines) {
    if (line === '' && (out.length === 0 || out[out.length - 1] === '')) continue;
    out.push(line);
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}

export async function extractPages(bytes) {
  let pdf;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch {
    // Corrupt, encrypted or not a PDF: there is no text we can read.
    throw new ApiFail('no_text');
  }
  try {
    if (pdf.numPages > MAX_PAGES) throw new ApiFail('bad_request');
    const { totalPages, text } = await extractText(pdf, { mergePages: false });
    const pages = text.map((t, i) => ({ page: i + 1, text: normalizeText(t) }));
    const chars = pages.reduce((n, p) => n + p.text.replace(/\s/g, '').length, 0);
    if (chars < MIN_TEXT_CHARS) throw new ApiFail('no_text');
    return { pages, pageCount: totalPages };
  } catch (err) {
    if (err instanceof ApiFail) throw err;
    throw new ApiFail('no_text');
  } finally {
    try {
      await pdf.destroy();
    } catch {
      // ignore
    }
  }
}

function remember(version, value) {
  cache.set(version, value);
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
}

// Returns { pages: [{ page, text }], pageCount, version }.
// `version` identifies this exact file contents for caches that sit on top (embeddings).
export async function getPdfPages(fileId, jwt) {
  const meta = await getFileMeta(fileId, jwt); // permission check, every time
  const { version } = meta;

  const hit = cache.get(version);
  if (hit) {
    cache.delete(version); // refresh LRU order
    cache.set(version, hit);
    return { ...hit, version };
  }

  let job = inflight.get(version);
  if (!job) {
    job = (async () => {
      const bytes = await downloadFile(fileId, jwt);
      const result = await extractPages(bytes);
      remember(version, result);
      return result;
    })().finally(() => inflight.delete(version));
    inflight.set(version, job);
  }
  const result = await job;
  return { ...result, version };
}
