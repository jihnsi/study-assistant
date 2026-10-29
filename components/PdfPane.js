'use client';

import { forwardRef } from 'react';
import { useLang } from '../lib/i18n';
import { AlertIcon, ExternalIcon } from './Icons';

// The original PDF in the browser's own viewer. `pdf` is { status: 'loading' | 'ready' | 'error', url, errKey }.
// `jump` is { page, n }: n changes on every citation click, and the viewer is re-created at that page
// so a second click on the same page still moves it back.
const PdfPane = forwardRef(function PdfPane({ name, pdf, jump, onRetry }, ref) {
  const { t } = useLang();
  const src = pdf.url ? (jump.page ? `${pdf.url}#page=${jump.page}` : pdf.url) : null;

  return (
    <section className="dv-pdf" aria-label={t('pdfBarLabel')} tabIndex={-1} ref={ref}>
      <div className="dv-pdf-bar">
        <p className="dv-label">{t('pdfBarLabel')}</p>
        {src && (
          <a className="btn btn-ghost btn-sm" href={src} target="_blank" rel="noopener">
            <ExternalIcon />
            {t('pdfOpenTab')}
          </a>
        )}
      </div>

      <div className="dv-frame">
        {pdf.status === 'loading' && (
          <div className="dv-frame-state">
            <p className="visually-hidden" role="status">
              {t('pdfLoading')}
            </p>
            <div className="skeleton dv-skeleton-page" aria-hidden="true" />
          </div>
        )}

        {pdf.status === 'error' && (
          <div className="dv-frame-state">
            <div className="notice notice-error" role="alert">
              <AlertIcon />
              <span>{t(pdf.errKey)}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
                {t('retry')}
              </button>
            </div>
          </div>
        )}

        {src && <iframe key={jump.n} className="dv-iframe" src={src} title={t('pdfFrameTitle', { name })} />}
      </div>

      {src && <p className="hint dv-phone-hint">{t('pdfPhoneHint')}</p>}
    </section>
  );
});

export default PdfPane;
