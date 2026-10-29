'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { errorKey, useLang } from '../lib/i18n';
import { addMemory, forgetAllMemories, forgetMemory, loadMarginPrefs, saveMarginPrefs, updateMemory, usePrefs } from '../lib/prefs';
import { LENGTHS, LEVELS, MEMORY_MAX, MEMORY_TEXT_MAX } from '../lib/prefs-schema';
import LanguageToggle from './LanguageToggle';
import { AlertIcon, BackIcon, CheckIcon, TrashIcon } from './Icons';

// A segmented control for one setting, with a one-line description of the chosen option.
function Choice({ label, name, options, value, onChange }) {
  const uid = useId();
  return (
    <div className="pref">
      <p className="dv-label" id={`${uid}-label`}>
        {label}
      </p>
      <div
        className={`seg seg-${options.length}`}
        role="group"
        aria-labelledby={`${uid}-label`}
        aria-describedby={`${uid}-desc`}
      >
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="hint" id={`${uid}-desc`}>
        {options.find((o) => o.id === value)?.desc}
      </p>
    </div>
  );
}

// The Preferences view: how Margin explains, and the memory list (notes can be edited, added and deleted).
// Props: onBack(). Reads and writes Appwrite account prefs through lib/prefs.js, and tells the shared
// provider about every stored change so the document view uses the new values.
export default function Preferences({ onBack }) {
  const { t, locale } = useLang();
  const { apply } = usePrefs();
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });

  const uid = useId();
  const [phase, setPhase] = useState('loading'); // loading | ready | error
  const [saved, setSaved] = useState(null); // what is stored right now (settings and memories)
  const [draft, setDraft] = useState({ level: 'standard', length: 'short' });
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const [saveErr, setSaveErr] = useState(null);
  const [leaving, setLeaving] = useState(false); // "unsaved changes" notice after pressing Back
  const [pendingRemember, setPendingRemember] = useState(null);
  const [memErr, setMemErr] = useState(null);
  const [busyId, setBusyId] = useState(null); // memory id being forgotten, or 'all'
  const [confirmAll, setConfirmAll] = useState(false);
  const [live, setLive] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | a memory id
  const [noteText, setNoteText] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteErr, setNoteErr] = useState(null); // an i18n key

  const titleRef = useRef(null);
  const notesRef = useRef(null);
  const backRef = useRef(null);
  const stayRef = useRef(null);
  const cancelAllRef = useRef(null);
  const forgetAllRef = useRef(null);
  const addRef = useRef(null);
  const editorRef = useRef(null);
  const returnFocusTo = useRef(null); // 'add' | a memory id: where focus goes after the editor closes
  const returnToForgetAll = useRef(false);

  // Read the stored preferences (also refreshes the memory list: the server may have added notes).
  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const latest = await loadMarginPrefs();
      setSaved(latest);
      setDraft({ level: latest.level, length: latest.length });
      applyRef.current(latest);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Start at the top with focus on the title, so keyboard and screen-reader users land in the new view.
  useEffect(() => {
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  const dirty = !!saved && (draft.level !== saved.level || draft.length !== saved.length);

  useEffect(() => {
    if (!dirty) setLeaving(false);
  }, [dirty]);

  useEffect(() => {
    if (leaving) stayRef.current?.focus();
  }, [leaving]);

  useEffect(() => {
    if (confirmAll) cancelAllRef.current?.focus();
    else if (returnToForgetAll.current) {
      returnToForgetAll.current = false;
      forgetAllRef.current?.focus();
    }
  }, [confirmAll]);

  function edit(patch) {
    setDraft((d) => ({ ...d, ...patch }));
    setSaveState('idle');
    setSaveErr(null);
  }

  async function save(e) {
    e?.preventDefault();
    if (!dirty || saveState === 'saving') return;
    setSaveState('saving');
    setSaveErr(null);
    try {
      const next = await saveMarginPrefs({ level: draft.level, length: draft.length });
      setSaved(next);
      setDraft({ level: next.level, length: next.length });
      applyRef.current(next);
      setSaveState('saved');
    } catch (err) {
      setSaveErr(errorKey(err, 'errPrefsSave'));
      setSaveState('idle');
    }
  }

  function back() {
    if (dirty && !leaving) {
      setLeaving(true);
      return;
    }
    onBack();
  }

  async function toggleRemember() {
    if (pendingRemember !== null || !saved) return;
    const next = !saved.remember;
    setPendingRemember(next);
    setMemErr(null);
    try {
      const res = await saveMarginPrefs({ remember: next });
      setSaved(res);
      applyRef.current(res);
      setLive(t(next ? 'prefsRememberOn' : 'prefsRememberOff'));
    } catch (err) {
      setMemErr(errorKey(err, 'errPrefsMemory'));
    } finally {
      setPendingRemember(null);
    }
  }

  async function forget(id) {
    if (busyId) return;
    setBusyId(id);
    setMemErr(null);
    try {
      const res = id === 'all' ? await forgetAllMemories() : await forgetMemory(id);
      setSaved(res);
      applyRef.current(res);
      setConfirmAll(false);
      setLive(t(id === 'all' ? 'prefsForgotAll' : 'prefsForgotten'));
      // The row that held focus is gone; keep the keyboard user's place.
      requestAnimationFrame(() => notesRef.current?.focus());
    } catch (err) {
      setMemErr(errorKey(err, 'errPrefsForget'));
    } finally {
      setBusyId(null);
    }
  }

  function openEditor(id, text) {
    if (noteBusy) return;
    setEditing(id);
    setNoteText(text);
    setNoteErr(null);
  }

  function closeEditor() {
    if (noteBusy) return;
    returnFocusTo.current = editing === 'new' ? 'add' : editing;
    setEditing(null);
    setNoteErr(null);
  }

  async function saveNote(e) {
    e?.preventDefault();
    if (noteBusy || editing === null) return;
    if (!noteText.trim()) {
      setNoteErr('prefsNoteEmpty');
      editorRef.current?.focus();
      return;
    }
    const adding = editing === 'new';
    setNoteBusy(true);
    setNoteErr(null);
    try {
      const res = adding ? await addMemory(noteText) : await updateMemory(editing, noteText);
      setSaved(res);
      applyRef.current(res);
      setLive(t(adding ? 'prefsNoteAdded' : 'prefsNoteSaved'));
      returnFocusTo.current = adding ? 'add' : editing;
      setEditing(null);
    } catch (err) {
      setNoteErr(errorKey(err, 'errPrefsNote'));
    } finally {
      setNoteBusy(false);
    }
  }

  // The editor takes focus when it opens; when it closes, focus goes back to the control that opened it.
  useEffect(() => {
    if (editing !== null) {
      editorRef.current?.focus();
      return;
    }
    const target = returnFocusTo.current;
    returnFocusTo.current = null;
    if (!target) return;
    requestAnimationFrame(() => {
      const el = target === 'add' ? addRef.current : document.getElementById(`${uid}-edit-${target}`);
      (el || notesRef.current)?.focus();
    });
  }, [editing, uid]);

  function cancelAll() {
    returnToForgetAll.current = true;
    setConfirmAll(false);
  }

  const levelOptions = LEVELS.map((id) => ({ id, label: t(`level_${id}`), desc: t(`levelDesc_${id}`) }));
  const lengthOptions = LENGTHS.map((id) => ({ id, label: t(`length_${id}`), desc: t(`lengthDesc_${id}`) }));
  const remember = pendingRemember ?? saved?.remember ?? true;
  const notes = saved ? [...saved.memories].reverse() : []; // newest first
  const full = notes.length >= MEMORY_MAX;
  const sourceLabel = (src) => t(src === 'pdf' ? 'prefsSourcePdf' : src === 'you' ? 'prefsSourceYou' : 'prefsSourceAsk');
  const formatDate = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
  };
  const saving = saveState === 'saving';

  // The inline input shared by "Add a note" and "Edit". Enter saves, Escape cancels.
  const noteEditor = (
    <form className="mem-form" onSubmit={saveNote} noValidate>
      <div className="field">
        <label htmlFor={`${uid}-note-input`}>{t('prefsNoteField')}</label>
        <input
          id={`${uid}-note-input`}
          ref={editorRef}
          type="text"
          value={noteText}
          maxLength={MEMORY_TEXT_MAX}
          autoComplete="off"
          aria-describedby={`${uid}-note-hint`}
          aria-invalid={noteErr === 'prefsNoteEmpty' || undefined}
          onChange={(e) => {
            setNoteText(e.target.value);
            if (noteErr === 'prefsNoteEmpty') setNoteErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              closeEditor();
            }
          }}
        />
      </div>
      <p className="hint" id={`${uid}-note-hint`}>
        {t('prefsNoteHint', { max: MEMORY_TEXT_MAX })}
      </p>
      {noteErr && (
        <p className="notice notice-error" role="alert">
          <AlertIcon />
          <span>{t(noteErr)}</span>
        </p>
      )}
      <div className="mem-form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={noteBusy}>
          {noteBusy ? t('prefsSaving') : t('prefsNoteSave')}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={noteBusy} onClick={closeEditor}>
          {t('cancel')}
        </button>
      </div>
    </form>
  );

  return (
    <div className="prefs-shell">
      <a className="skip-link" href="#prefs-main">
        {t('skipToContent')}
      </a>
      <header className="bar">
        <div className="bar-inner">
          <button ref={backRef} type="button" className="btn btn-secondary btn-sm" onClick={back}>
            <BackIcon />
            {t('docBack')}
          </button>
          <LanguageToggle />
        </div>
      </header>

      <main className="page prefs" id="prefs-main">
        <div className="prefs-head">
          <h1 ref={titleRef} tabIndex={-1}>
            {t('prefsTitle')}
          </h1>
          <p className="prefs-intro">{t('prefsIntro')}</p>
        </div>

        {phase === 'loading' && (
          <div aria-busy="true">
            <p className="visually-hidden" role="status">
              {t('prefsLoading')}
            </p>
            <div className="skeleton" aria-hidden="true" />
            <div className="skeleton" aria-hidden="true" />
            <div className="skeleton" aria-hidden="true" />
          </div>
        )}

        {phase === 'error' && (
          <div className="notice notice-error" role="alert">
            <AlertIcon />
            <span>{t('errPrefsLoad')}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              {t('retry')}
            </button>
          </div>
        )}

        {phase === 'ready' && saved && (
          <>
            <form className="prefs-form" onSubmit={save} noValidate>
              <section className="block" aria-labelledby={`${uid}-explain`}>
                <h2 id={`${uid}-explain`}>{t('prefsExplainTitle')}</h2>
                <Choice
                  label={t('prefsLevelLabel')}
                  options={levelOptions}
                  value={draft.level}
                  onChange={(level) => edit({ level })}
                />
                <Choice
                  label={t('prefsLengthLabel')}
                  options={lengthOptions}
                  value={draft.length}
                  onChange={(length) => edit({ length })}
                />
              </section>

              <div className="prefs-save">
                {saveErr && (
                  <div className="notice notice-error" role="alert">
                    <AlertIcon />
                    <span>{t(saveErr)}</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={save}>
                      {t('retry')}
                    </button>
                  </div>
                )}

                {leaving && dirty && (
                  <div
                    className="notice notice-info"
                    role="alert"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setLeaving(false);
                        backRef.current?.focus();
                      }
                    }}
                  >
                    <AlertIcon />
                    <span>{t('prefsLeaveWarn')}</span>
                    <span className="prefs-leave">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
                        {t('prefsLeave')}
                      </button>
                      <button
                        ref={stayRef}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setLeaving(false)}
                      >
                        {t('prefsStay')}
                      </button>
                    </span>
                  </div>
                )}

                <div className="prefs-save-row">
                  <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>
                    {saving ? t('prefsSaving') : t('prefsSave')}
                  </button>
                  <p className={`prefs-saved${saveState === 'saved' ? ' is-shown' : ''}`} role="status" aria-live="polite">
                    {saveState === 'saved' && (
                      <>
                        <CheckIcon />
                        <span>{t('prefsSaved')}</span>
                      </>
                    )}
                  </p>
                  {dirty && saveState !== 'saved' && <p className="hint">{t('prefsUnsaved')}</p>}
                </div>
              </div>
            </form>

            <section className="block" aria-labelledby={`${uid}-memory`}>
              <h2 id={`${uid}-memory`}>{t('prefsMemoryTitle')}</h2>

              <button
                type="button"
                className="pref-switch"
                role="switch"
                aria-checked={remember}
                aria-labelledby={`${uid}-rem-label`}
                aria-describedby={`${uid}-rem-desc`}
                disabled={pendingRemember !== null}
                onClick={toggleRemember}
              >
                <span className="pref-switch-text">
                  <span className="pref-switch-label" id={`${uid}-rem-label`}>
                    {t('prefsRememberLabel')}
                  </span>
                  <span className="pref-switch-desc" id={`${uid}-rem-desc`}>
                    {t('prefsRememberDesc')}
                  </span>
                </span>
                <span className="switch-track" aria-hidden="true" />
              </button>

              <p className="pref-note">{t('prefsMemoryNote')}</p>
              {!remember && <p className="pref-note">{t('prefsMemoryOffNote')}</p>}

              {memErr && (
                <p className="notice notice-error" role="alert">
                  <AlertIcon />
                  <span>{t(memErr)}</span>
                </p>
              )}

              <div className="block-head pref-notes-head">
                <h3 id={`${uid}-notes`} ref={notesRef} tabIndex={-1}>
                  {t('prefsNotesTitle')}
                </h3>
                <p className="hint">{t('prefsNotesCount', { n: notes.length, max: MEMORY_MAX })}</p>
              </div>

              {editing === 'new' ? (
                <div className="mem-new">{noteEditor}</div>
              ) : (
                <div className="mem-add-row">
                  <button
                    ref={addRef}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={full || noteBusy || editing !== null}
                    aria-describedby={full ? `${uid}-full` : undefined}
                    onClick={() => openEditor('new', '')}
                  >
                    {t('prefsAdd')}
                  </button>
                  {full && (
                    <p className="hint" id={`${uid}-full`}>
                      {t('prefsFull', { max: MEMORY_MAX })}
                    </p>
                  )}
                </div>
              )}

              {notes.length === 0 && (
                <div className="empty">
                  <p className="empty-title">{t(remember ? 'prefsMemEmptyTitle' : 'prefsMemOffTitle')}</p>
                  <p>{t(remember ? 'prefsMemEmpty' : 'prefsMemOff')}</p>
                </div>
              )}

              {notes.length > 0 && (
                <ul className="doc-list mem-list" aria-labelledby={`${uid}-notes`}>
                  {notes.map((m) => {
                    const date = formatDate(m.at);
                    return (
                      <li className="mem" key={m.id}>
                        {editing === m.id ? (
                          <div className="mem-main">{noteEditor}</div>
                        ) : (
                          <>
                            <div className="mem-main">
                              <p className="mem-text">{m.text}</p>
                              <p className="doc-meta">
                                <span className="mem-source">{sourceLabel(m.source)}</span>
                                {date && t('prefsNotedOn', { date })}
                              </p>
                            </div>
                            <div className="mem-actions">
                              <button
                                id={`${uid}-edit-${m.id}`}
                                type="button"
                                className="btn btn-ghost btn-sm"
                                aria-label={t('prefsEditLabel', { text: m.text })}
                                disabled={busyId !== null || noteBusy || editing !== null}
                                onClick={() => openEditor(m.id, m.text)}
                              >
                                {t('prefsEdit')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm is-danger"
                                aria-label={t('prefsForgetLabel', { text: m.text })}
                                disabled={busyId !== null}
                                onClick={() => forget(m.id)}
                              >
                                <TrashIcon />
                                {t('prefsForget')}
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {notes.length > 0 && !confirmAll && (
                <div>
                  <button
                    ref={forgetAllRef}
                    type="button"
                    className="btn btn-ghost btn-sm is-danger pref-forget-all"
                    disabled={busyId !== null}
                    onClick={() => {
                      setMemErr(null);
                      setConfirmAll(true);
                    }}
                  >
                    <TrashIcon />
                    {t('prefsForgetAll')}
                  </button>
                </div>
              )}

              {notes.length > 0 && confirmAll && (
                <div
                  className="doc-confirm mem-confirm"
                  role="group"
                  aria-labelledby={`${uid}-all-q`}
                  aria-busy={busyId === 'all' || undefined}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && busyId === null) cancelAll();
                  }}
                >
                  <p id={`${uid}-all-q`}>{t('prefsForgetAllConfirm', { n: notes.length })}</p>
                  <div className="doc-confirm-actions">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={busyId !== null}
                      onClick={() => forget('all')}
                    >
                      {busyId === 'all' ? t('deleting') : t('prefsForgetAllYes')}
                    </button>
                    <button
                      ref={cancelAllRef}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busyId !== null}
                      onClick={cancelAll}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        <p className="visually-hidden" role="status" aria-live="polite">
          {live}
        </p>
      </main>
    </div>
  );
}
