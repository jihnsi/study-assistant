// The student's saved preferences and memories, read from their Appwrite account prefs with
// their own JWT (so Appwrite itself enforces whose data it is; there is no server API key).
// Stored under the `margin` key; see lib/prefs-schema.js.
//
// Nothing here throws. Preferences must never be a reason an AI request fails: a failed read
// means defaults.

import { ENDPOINT, PROJECT_ID } from '../appwrite.js';
import { normalizeMarginPrefs } from '../prefs-schema.js';

const TIMEOUT_MS = 8000;

function headers(jwt, json) {
  const h = { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-JWT': jwt };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function readPrefs(jwt) {
  try {
    const res = await fetch(`${ENDPOINT}/account/prefs`, {
      headers: headers(jwt, false),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// Resolves { prefs, margin }. prefs is the whole account prefs object (null if it could not be
// read); margin is always a valid, normalised preferences object.
export async function getProfile(jwt) {
  const prefs = await readPrefs(jwt);
  return { prefs, margin: normalizeMarginPrefs(prefs && prefs.margin) };
}

// Read-modify-write of the margin preferences. Appwrite replaces the whole prefs object on
// update, so the latest prefs are read first and every other key is kept. `change` receives the
// latest normalised margin and returns the next one, or null/undefined to leave things alone.
// Resolves true if the new value was saved.
export async function updateMargin(jwt, change) {
  const latest = await readPrefs(jwt);
  if (!latest) return false; // never write over prefs we could not read
  let next;
  try {
    next = change(normalizeMarginPrefs(latest.margin));
  } catch {
    return false;
  }
  if (!next) return false;
  const prefs = { ...latest, margin: normalizeMarginPrefs(next) };
  try {
    const res = await fetch(`${ENDPOINT}/account/prefs`, {
      method: 'PATCH',
      headers: headers(jwt, true),
      body: JSON.stringify({ prefs }),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) await res.body?.cancel().catch(() => {});
    return res.ok;
  } catch {
    return false;
  }
}

// Saves a whole new margin value (merged into the latest prefs). Resolves true/false.
export function saveMargin(jwt, nextMargin) {
  return updateMargin(jwt, () => nextMargin);
}
