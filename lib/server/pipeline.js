// The two AI jobs: summarise a PDF, answer a question about it.
// Both resolve { stream, pageCount } where stream is a ReadableStream of UTF-8 answer bytes.
// Access to the file is checked (with the caller's JWT) before anything else happens.

import { completeChat, isConfigured, streamChat } from './deepseek.js';
import { ApiFail } from './errors.js';
import { getPdfPages } from './pdf.js';
import { checkRate } from './ratelimit.js';
import { askMessages, cleanHistory, combineMessages, notesMessages, summaryMessages } from './prompts.js';
import { choosePages, groupPages, PAGE_CHAR_BUDGET, totalCost } from './select.js';

const MAP_CONCURRENCY = 4;

// Checked only after Appwrite has accepted the JWT, so callers who are not signed in learn nothing about our setup.
function requireModel() {
  if (!isConfigured()) throw new ApiFail('not_configured');
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function summarize({ fileId, jwt, lang, signal }) {
  const { pages, pageCount } = await getPdfPages(fileId, jwt);
  requireModel();
  checkRate(jwt);

  if (totalCost(pages) <= PAGE_CHAR_BUDGET) {
    const stream = await streamChat(summaryMessages(lang, pages), { maxTokens: 4000, signal });
    return { stream, pageCount };
  }

  // Too long for one request: condense groups of pages into cited notes, then combine.
  const groups = groupPages(pages);
  const notes = await mapLimit(groups, MAP_CONCURRENCY, async (group) => {
    const text = await completeChat(notesMessages(lang, group), { maxTokens: 1800, signal });
    return { range: `${group[0].page}-${group[group.length - 1].page}`, text: text.trim() };
  });
  const stream = await streamChat(combineMessages(lang, notes), { maxTokens: 4000, signal });
  return { stream, pageCount };
}

export async function ask({ fileId, jwt, lang, question, history, signal }) {
  const { pages, pageCount, version } = await getPdfPages(fileId, jwt);
  requireModel();
  checkRate(jwt);

  const turns = cleanHistory(history);
  // A follow-up such as "explain that more" has little to match on, so rank pages by the
  // previous question as well.
  const lastUser = [...turns].reverse().find((m) => m.role === 'user');
  const query = lastUser ? `${lastUser.content}\n${question}` : question;

  const chosen = await choosePages(pages, query, version);
  const stream = await streamChat(askMessages(lang, chosen, turns, question), { maxTokens: 2500, signal });
  return { stream, pageCount };
}
