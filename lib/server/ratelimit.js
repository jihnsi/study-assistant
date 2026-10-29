// Small per-user limiter (in memory, per server instance). Keeps one account from running up the
// model bill. The user id comes from the JWT payload; call this only after Appwrite has accepted
// the JWT, so the payload can be trusted.

import { ApiFail } from './errors.js';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 40;
const hits = new Map(); // userId -> number[] of timestamps

export function userIdFromJwt(jwt) {
  try {
    const payload = jwt.split('.')[1];
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const id = JSON.parse(json).userId;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

export function checkRate(jwt, now = Date.now()) {
  const id = userIdFromJwt(jwt);
  if (!id) return;
  const recent = (hits.get(id) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(id, recent);
    throw new ApiFail('rate_limited');
  }
  recent.push(now);
  hits.set(id, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
}
