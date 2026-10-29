'use client';

// Browser side of Margin's preferences and memories (see lib/prefs-schema.js for the shape).
// Everything lives in the Appwrite account's prefs under the `margin` key. Appwrite replaces the WHOLE
// prefs object on update, and the server adds memories while the student asks questions, so every write
// here re-reads the latest prefs first and changes only what it owns:
//   saveMarginPrefs  -> level / length / remember (never touches memories)
//   addMemory        -> adds a note typed by the student (source 'you')
//   updateMemory     -> changes the text of one note (keeps its id, date and source)
//   forgetMemory     -> removes one memory
//   forgetAllMemories-> empties the memory list
// All of them return the normalized `margin` prefs that were stored, and throw the Appwrite error
// (map it with errorKey from lib/i18n.js).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { account } from './appwrite';
import { DEFAULT_MARGIN_PREFS, MEMORY_MAX, MEMORY_TEXT_MAX, newMemoryId, normalizeMarginPrefs } from './prefs-schema';

const SETTING_KEYS = ['level', 'length', 'remember'];

async function readLatest() {
  const all = (await account.getPrefs()) || {};
  return { all, margin: normalizeMarginPrefs(all.margin) };
}

async function write(all, margin) {
  const next = normalizeMarginPrefs(margin);
  await account.updatePrefs({ prefs: { ...all, margin: next } });
  return next;
}

export async function loadMarginPrefs() {
  const { margin } = await readLatest();
  return margin;
}

// `patch` may hold any of level, length, remember. Other fields are ignored.
export async function saveMarginPrefs(patch) {
  const { all, margin } = await readLatest();
  const changes = {};
  for (const key of SETTING_KEYS) if (patch && key in patch) changes[key] = patch[key];
  return write(all, { ...margin, ...changes });
}

const cleanNote = (text) => (typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, MEMORY_TEXT_MAX) : '');

// Adds a note the student wrote. Throws (code 409) when the list is already full or the text is empty.
export async function addMemory(text) {
  const clean = cleanNote(text);
  const { all, margin } = await readLatest();
  if (!clean || margin.memories.length >= MEMORY_MAX) {
    throw Object.assign(new Error('Cannot add this note'), { code: 409, type: 'memory_rejected' });
  }
  const note = { id: newMemoryId(), text: clean, at: new Date().toISOString(), source: 'you' };
  return write(all, { ...margin, memories: [...margin.memories, note] });
}

// Changes one note's text; its id, date and source stay. A note that no longer exists is left alone.
export async function updateMemory(id, text) {
  const clean = cleanNote(text);
  if (!clean) throw Object.assign(new Error('Empty note'), { code: 409, type: 'memory_rejected' });
  const { all, margin } = await readLatest();
  return write(all, { ...margin, memories: margin.memories.map((m) => (m.id === id ? { ...m, text: clean } : m)) });
}

export async function forgetMemory(id) {
  const { all, margin } = await readLatest();
  return write(all, { ...margin, memories: margin.memories.filter((m) => m.id !== id) });
}

export async function forgetAllMemories() {
  const { all, margin } = await readLatest();
  return write(all, { ...margin, memories: [] });
}

// ---- Shared state for the signed-in app ----------------------------------------------------------
// Library mounts one provider so the document view (summary cache key, the Ask tab's note) and the
// Preferences view read the same values. `openPrefs` is the navigation helper Library owns.

const PrefsContext = createContext(null);

export function PrefsProvider({ openPrefs, children }) {
  const [prefs, setPrefs] = useState(DEFAULT_MARGIN_PREFS);
  // loading | ready | error. `ready` and `error` both mean "stop waiting": on error the defaults apply.
  const [status, setStatus] = useState('loading');

  const reload = useCallback(async () => {
    try {
      const latest = await loadMarginPrefs();
      setPrefs(latest);
      setStatus('ready');
      return latest;
    } catch {
      setStatus((s) => (s === 'loading' ? 'error' : s));
      return null;
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      prefs,
      status,
      settled: status !== 'loading',
      apply: (next) => {
        setPrefs(normalizeMarginPrefs(next));
        setStatus('ready');
      },
      reload,
      openPrefs: openPrefs || (() => {}),
    }),
    [prefs, status, reload, openPrefs],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return ctx;
}
