'use client';

import { useLang } from '../lib/i18n';
import { AlertIcon, DocIcon } from './Icons';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesTable({ status, files, newId, onRetry }) {
  const { t, locale } = useLang();
  const when = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <section className="block" aria-labelledby="stored-title">
      <h2 id="stored-title">{t('storedTitle')}</h2>

      {status === 'loading' && <p className="hint">{t('loadingFiles')}</p>}

      {status === 'error' && (
        <div className="notice notice-error" role="alert">
          <AlertIcon />
          <span>{t('errList')}</span>
          <button type="button" className="btn btn-quiet" onClick={onRetry}>
            {t('retry')}
          </button>
        </div>
      )}

      {status === 'ready' && files.length === 0 && <p className="empty">{t('empty')}</p>}

      {status === 'ready' && files.length > 0 && (
        // Explicit roles keep this a table for screen readers when the phone layout changes its display.
        <table className="files" role="table">
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                {t('colName')}
              </th>
              <th scope="col" role="columnheader" className="num">
                {t('colSize')}
              </th>
              <th scope="col" role="columnheader">
                {t('colUploaded')}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {files.map((file) => (
              <tr key={file.$id} role="row" className={file.$id === newId ? 'is-new' : undefined}>
                <th scope="row" role="rowheader">
                  <div className="file-cell">
                    <DocIcon />
                    <span>{file.name}</span>
                  </div>
                </th>
                <td role="cell" className="num">
                  {formatSize(file.sizeOriginal)}
                </td>
                <td role="cell" className="when">
                  {when.format(new Date(file.$createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
