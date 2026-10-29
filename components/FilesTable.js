'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { BUCKET_ID, storage } from '../lib/appwrite';
import { errorKey, useLang } from '../lib/i18n';
import { clearSummaries } from '../lib/summary-cache';
import { AlertIcon, CheckIcon, DocIcon, TrashIcon } from './Icons';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// One stored PDF. Owns its own delete flow: idle -> confirming -> deleting -> (row disappears) | error.
function DocRow({ file, isNew, onOpen, onDeleted }) {
  const { t, locale } = useLang();
  const uid = useId();
  const [phase, setPhase] = useState('idle'); // idle | confirming | deleting
  const [errKey, setErrKey] = useState(null);
  const cancelRef = useRef(null);
  const triggerRef = useRef(null);
  const returnFocus = useRef(false);

  // Move focus into the confirmation when it opens, and back to the trigger when it is cancelled.
  useEffect(() => {
    if (phase === 'confirming') cancelRef.current?.focus();
    if (phase === 'idle' && returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [phase]);

  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(file.$createdAt));

  function ask() {
    setErrKey(null);
    setPhase('confirming');
  }

  function cancel() {
    returnFocus.current = true;
    setPhase('idle');
  }

  async function confirmDelete() {
    setPhase('deleting');
    setErrKey(null);
    try {
      await storage.deleteFile({ bucketId: BUCKET_ID, fileId: file.$id });
    } catch (err) {
      setErrKey(errorKey(err, 'errDelete'));
      returnFocus.current = true;
      setPhase('idle');
      return;
    }
    // Summaries saved in this browser go with the PDF.
    clearSummaries(file.$id);
    // The parent re-reads the list; this row unmounts when the file is gone.
    onDeleted(file);
  }

  const busy = phase === 'deleting';

  return (
    <li className={`doc${isNew ? ' is-new' : ''}`}>
      <span className="doc-icon">
        <DocIcon />
      </span>

      <div className="doc-main">
        <p className="doc-name">
          {onOpen ? (
            <button type="button" className="doc-open" data-doc-id={file.$id} onClick={() => onOpen(file)}>
              {file.name}
            </button>
          ) : (
            file.name
          )}
        </p>
        <p className="doc-meta">
          <span>{formatSize(file.sizeOriginal)}</span>
          <span>{t('uploadedOn', { date })}</span>
        </p>
      </div>

      {phase === 'idle' && (
        <div className="doc-actions">
          <button
            ref={triggerRef}
            type="button"
            className="btn btn-ghost btn-sm is-danger"
            aria-label={t('deleteLabel', { name: file.name })}
            onClick={ask}
          >
            <TrashIcon />
            {t('deleteFile')}
          </button>
        </div>
      )}

      {phase !== 'idle' && (
        <div
          className="doc-confirm"
          role="group"
          aria-labelledby={`${uid}-q`}
          aria-busy={busy || undefined}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !busy) cancel();
          }}
        >
          <p id={`${uid}-q`}>{t('deleteConfirm', { name: file.name })}</p>
          <div className="doc-confirm-actions">
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={confirmDelete}>
              {busy ? t('deleting') : t('deleteYes')}
            </button>
            <button
              ref={cancelRef}
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={cancel}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {errKey && (
        <p className="notice notice-error" role="alert">
          <AlertIcon />
          <span>{t(errKey)}</span>
        </p>
      )}
    </li>
  );
}

// Props: status ('loading' | 'ready' | 'error'), files, newId, onRetry, onDeleted(file) (re-reads the list),
// and an optional onOpen(file): when given, each document's name becomes a button that calls it.
export default function FilesTable({ status, files, newId, onRetry, onOpen, onDeleted }) {
  const { t } = useLang();
  const headingRef = useRef(null);
  const [removedName, setRemovedName] = useState(null);

  // The confirmation is a passing message; let it go after a while.
  useEffect(() => {
    if (!removedName) return;
    const id = setTimeout(() => setRemovedName(null), 8000);
    return () => clearTimeout(id);
  }, [removedName]);

  async function handleDeleted(file) {
    setRemovedName(file.name);
    await onDeleted?.(file);
    // The row that held focus is gone; put focus on the section so keyboard users keep their place.
    headingRef.current?.focus();
  }

  return (
    <section className="block" aria-labelledby="stored-title">
      <div className="block-head">
        <h2 id="stored-title" ref={headingRef} tabIndex={-1}>
          {t('storedTitle')}
        </h2>
      </div>

      {removedName && (
        <p className="notice notice-ok" role="status">
          <CheckIcon />
          <span>{t('deleted', { name: removedName })}</span>
        </p>
      )}

      {status === 'loading' && (
        <div>
          <p className="visually-hidden" role="status">
            {t('loadingFiles')}
          </p>
          <div className="skeleton" aria-hidden="true" />
          <div className="skeleton" aria-hidden="true" />
        </div>
      )}

      {status === 'error' && (
        <div className="notice notice-error" role="alert">
          <AlertIcon />
          <span>{t('errList')}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
            {t('retry')}
          </button>
        </div>
      )}

      {status === 'ready' && files.length === 0 && (
        <div className="empty">
          <p className="empty-title">{t('emptyTitle')}</p>
          <p>{t('empty')}</p>
        </div>
      )}

      {status === 'ready' && files.length > 0 && (
        <ul className="doc-list">
          {files.map((file) => (
            <DocRow
              key={file.$id}
              file={file}
              isNew={file.$id === newId}
              onOpen={onOpen}
              onDeleted={handleDeleted}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
