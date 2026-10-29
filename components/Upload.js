'use client';

import { useRef, useState } from 'react';
import { ID, Permission, Role } from 'appwrite';
import { BUCKET_ID, MAX_PDF_BYTES, storage } from '../lib/appwrite';
import { errorKey, useLang } from '../lib/i18n';
import { AlertIcon, CheckIcon, LockIcon, UploadIcon } from './Icons';

export default function Upload({ user, onStored }) {
  const { t } = useLang();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  // idle | uploading { name, pct } | done { name } | error { key }
  const [state, setState] = useState({ phase: 'idle' });

  async function handleFile(file) {
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) return setState({ phase: 'error', key: 'errNotPdf' });
    if (file.size > MAX_PDF_BYTES) return setState({ phase: 'error', key: 'errTooLarge' });

    setState({ phase: 'uploading', name: file.name, pct: 0 });
    try {
      const me = Role.user(user.$id);
      const stored = await storage.createFile({
        bucketId: BUCKET_ID,
        fileId: ID.unique(),
        file,
        permissions: [Permission.read(me), Permission.update(me), Permission.delete(me)],
        onProgress: (p) =>
          setState((s) => (s.phase === 'uploading' ? { ...s, pct: Math.round(p.progress) } : s)),
      });
      setState({ phase: 'done', name: stored.name });
      onStored(stored);
    } catch (err) {
      setState({ phase: 'error', key: errorKey(err, 'errUpload') });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (state.phase === 'uploading') return;
    handleFile(event.dataTransfer.files?.[0]);
  }

  const uploading = state.phase === 'uploading';
  // Small files upload in one request, so no progress events arrive.
  const indeterminate = uploading && state.pct === 0;

  return (
    <section className="block" aria-labelledby="upload-title">
      <h2 id="upload-title">{t('uploadTitle')}</h2>

      <div
        className={`drop${dragging ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="drop-icon" aria-hidden="true">
          <UploadIcon />
        </span>
        <div className="drop-text">
          <p className="drop-title">{t('dropHere')}</p>
          <p className="hint">{t('uploadHelp')}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {t('choosePdf')}
        </button>
      </div>

      <div className="status" aria-live="polite">
        {uploading && (
          <>
            <p>{t('uploading', { name: state.name })}</p>
            <div
              className="progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={indeterminate ? undefined : state.pct}
              aria-label={t('uploading', { name: state.name })}
            >
              <div
                className="progress-fill"
                data-indeterminate={indeterminate ? '' : undefined}
                style={{ '--pct': `${state.pct}%` }}
              />
            </div>
          </>
        )}
        {state.phase === 'done' && (
          <p className="notice notice-ok">
            <CheckIcon />
            <span>{t('stored', { name: state.name })}</span>
          </p>
        )}
      </div>
      {state.phase === 'error' && (
        <p className="notice notice-error" role="alert">
          <AlertIcon />
          <span>{t(state.key)}</span>
        </p>
      )}

      <p className="privacy">
        <LockIcon />
        <span>{t('privacy')}</span>
      </p>
    </section>
  );
}
