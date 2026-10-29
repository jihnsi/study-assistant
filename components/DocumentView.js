'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BUCKET_ID, storage } from '../lib/appwrite';
import { fetchPdfBlobUrl } from '../lib/api';
import { apiErrorKey, useLang } from '../lib/i18n';
import { readSummary } from '../lib/summary-cache';
import LanguageToggle from './LanguageToggle';
import PdfPane from './PdfPane';
import SummaryPanel from './SummaryPanel';
import AskPanel from './AskPanel';
import { AlertIcon, BackIcon, DocIcon, LockIcon } from './Icons';

const TABS = ['summary', 'ask'];

// The study panel: tabs, the trust notes, and the two tab panels. Both panels stay mounted so a
// running request and its text survive a tab switch.
function StudyPanel({ fileId, pageCount, activePage, onCite, onPageCount }) {
  const { t, lang } = useLang();
  const uid = useId();
  const [tab, setTab] = useState('summary');
  const tabRefs = useRef({});

  function onKeyDown(e) {
    const i = TABS.indexOf(tab);
    let next = null;
    if (e.key === 'ArrowRight') next = TABS[(i + 1) % TABS.length];
    else if (e.key === 'ArrowLeft') next = TABS[(i - 1 + TABS.length) % TABS.length];
    else if (e.key === 'Home') next = TABS[0];
    else if (e.key === 'End') next = TABS[TABS.length - 1];
    if (!next) return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="dv-study" aria-label={t('studyLabel')}>
      <div className="dv-study-head">
        <div className="tabs" role="tablist" aria-label={t('tabsLabel')} onKeyDown={onKeyDown}>
          {TABS.map((id) => (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${id}`}
              className="tab"
              aria-selected={tab === id}
              aria-controls={`${uid}-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
            >
              {t(id === 'summary' ? 'tabSummary' : 'tabAsk')}
            </button>
          ))}
        </div>
        <div className="dv-trust">
          <LockIcon />
          <p>
            {t('trustAnswers')}
            {lang === 'en' ? ' ' : ''}
            {t('trustSend')}
          </p>
        </div>
      </div>

      <div className="dv-scroll">
        <div
          role="tabpanel"
          id={`${uid}-panel-summary`}
          aria-labelledby={`${uid}-tab-summary`}
          hidden={tab !== 'summary'}
          className="dv-panel"
        >
          <SummaryPanel
            fileId={fileId}
            pageCount={pageCount}
            activePage={activePage}
            onCite={onCite}
            onPageCount={onPageCount}
          />
        </div>
        <div
          role="tabpanel"
          id={`${uid}-panel-ask`}
          aria-labelledby={`${uid}-tab-ask`}
          hidden={tab !== 'ask'}
          className="dv-panel dv-panel-ask"
        >
          <AskPanel fileId={fileId} pageCount={pageCount} activePage={activePage} onCite={onCite} />
        </div>
      </div>
    </section>
  );
}

// One open PDF: the original on one side, summary and questions on the other.
// Props: fileId; initialFile (the Appwrite file row, if the library already has it);
// onBack(); onMissing() when the file does not exist (the library shows the notice).
export default function DocumentView({ fileId, initialFile, onBack, onMissing }) {
  const { t } = useLang();
  const [file, setFile] = useState(initialFile && initialFile.$id === fileId ? initialFile : null);
  const [fileError, setFileError] = useState(false);
  const [fileTry, setFileTry] = useState(0);
  const [pdf, setPdf] = useState({ status: 'loading', url: null, errKey: null });
  const [pdfTry, setPdfTry] = useState(0);
  const [pageCount, setPageCount] = useState(null);
  const [jump, setJump] = useState({ page: null, n: 0 });
  const [pane, setPane] = useState('study'); // phone only: which side is showing
  const [announce, setAnnounce] = useState('');
  const titleRef = useRef(null);
  const pdfRef = useRef(null);
  const studyScroll = useRef(0);
  const paneRef = useRef('study');
  const missingRef = useRef(onMissing);

  useEffect(() => {
    missingRef.current = onMissing;
  });

  // Look the file up (needed when opened straight from the address bar).
  useEffect(() => {
    if (file) return;
    let cancelled = false;
    setFileError(false);
    storage
      .getFile({ bucketId: BUCKET_ID, fileId })
      .then((f) => !cancelled && setFile(f))
      .catch((err) => {
        if (cancelled) return;
        if (err?.code === 404) missingRef.current?.();
        else setFileError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [file, fileId, fileTry]);

  // Fetch the PDF as a blob URL for the viewer, and revoke it when we leave.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let url = null;
    setPdf({ status: 'loading', url: null, errKey: null });
    fetchPdfBlobUrl(fileId)
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        url = u;
        setPdf({ status: 'ready', url: u, errKey: null });
      })
      .catch((err) => {
        if (!cancelled) setPdf({ status: 'error', url: null, errKey: apiErrorKey(err) });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, fileId, pdfTry]);

  // A summary saved earlier already knows the page count.
  useEffect(() => {
    const known = readSummary(fileId, 'en')?.pageCount || readSummary(fileId, 'zh')?.pageCount;
    if (known) setPageCount(known);
  }, [fileId]);

  // Start at the top, with focus on the title so keyboard and screen-reader users land in the new view.
  const focused = useRef(false);
  useEffect(() => {
    if (!file || focused.current) return;
    focused.current = true;
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
  }, [file]);

  const onPageCount = useCallback((n) => setPageCount((cur) => (n && n !== cur ? n : cur)), []);

  const selectPane = useCallback((next) => {
    if (paneRef.current === next) return;
    if (paneRef.current === 'study') studyScroll.current = window.scrollY;
    paneRef.current = next;
    setPane(next);
    requestAnimationFrame(() => window.scrollTo(0, next === 'study' ? studyScroll.current : 0));
  }, []);

  // A citation chip: show that page of the PDF (on a phone, switch to the PDF first).
  const onCite = useCallback(
    (page) => {
      setJump((j) => ({ page, n: j.n + 1 }));
      setAnnounce(t('pdfShowing', { n: page }));
      selectPane('pdf');
      // On a phone the study panel (where focus was) is hidden by the switch; move focus to the PDF.
      if (window.matchMedia('(max-width: 899px)').matches) {
        requestAnimationFrame(() => pdfRef.current?.focus({ preventScroll: true }));
      }
    },
    [t, selectPane],
  );

  const pageText = pageCount ? (pageCount === 1 ? t('pageCountOne') : t('pageCountMany', { n: pageCount })) : null;

  return (
    <div className="dv" data-pane={pane}>
      <header className="bar dv-bar">
        <div className="dv-bar-inner">
          <button type="button" className="btn btn-secondary btn-sm dv-back" onClick={onBack} aria-label={t('docBackLabel')}>
            <BackIcon />
            {t('docBack')}
          </button>

          <div className="dv-title">
            {file ? (
              <>
                <h1 ref={titleRef} tabIndex={-1} title={file.name}>
                  {file.name}
                </h1>
                {pageText && <p className="dv-pages">{pageText}</p>}
              </>
            ) : (
              <h1 ref={titleRef} tabIndex={-1} className="dv-title-wait">
                <DocIcon />
                <span>{fileError ? t('docOpenError') : t('docOpening')}</span>
              </h1>
            )}
          </div>

          <div className="dv-tools">
            <LanguageToggle />
          </div>
        </div>
      </header>

      {!file && fileError && (
        <div className="dv-solo">
          <div className="notice notice-error" role="alert">
            <AlertIcon />
            <span>{t('apiErr_network')}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFileTry((n) => n + 1)}>
              {t('retry')}
            </button>
          </div>
        </div>
      )}

      {!file && !fileError && (
        <div className="dv-solo" aria-busy="true">
          <div className="skeleton" aria-hidden="true" />
        </div>
      )}

      {file && (
        <>
          <div className="dv-switch">
            <div className="seg" role="group" aria-label={t('paneSwitchLabel')}>
              <button type="button" aria-pressed={pane === 'study'} onClick={() => selectPane('study')}>
                {t('paneStudy')}
              </button>
              <button type="button" aria-pressed={pane === 'pdf'} onClick={() => selectPane('pdf')}>
                {t('panePdf')}
              </button>
            </div>
          </div>

          <div className="dv-body">
            <PdfPane
              ref={pdfRef}
              name={file.name}
              pdf={pdf}
              jump={jump}
              onRetry={() => setPdfTry((n) => n + 1)}
            />
            <StudyPanel
              fileId={fileId}
              pageCount={pageCount}
              activePage={jump.page}
              onCite={onCite}
              onPageCount={onPageCount}
            />
          </div>
        </>
      )}

      <p className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
