'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { streamFromApi } from '../lib/api';
import { apiErrorKey, useLang } from '../lib/i18n';
import { summaryPrefsKey } from '../lib/prefs-schema';
import { usePrefs } from '../lib/prefs';
import { readSummary, writeSummary } from '../lib/summary-cache';
import { useFrameThrottle } from '../lib/useFrameThrottle';
import AiMarkdown from './AiMarkdown';
import PrefsLink from './PrefsLink';
import { AlertIcon, CheckIcon, CopyIcon, StopIcon } from './Icons';

const IDLE = { phase: 'idle', text: '', errKey: null, streamErr: null, at: null };

// The Summary tab. Phases: idle | streaming | done | partial (server cut it short) | stopped | error.
export default function SummaryPanel({ fileId, pageCount, activePage, onCite, onPageCount }) {
  const { t, lang, locale } = useLang();
  const labelId = useId();
  const { prefs, settled } = usePrefs();
  // A saved summary is only shown for the preferences it was written with.
  const prefsKey = summaryPrefsKey(prefs);
  // null = follow the interface language until the person picks (or a run starts).
  const [picked, setPicked] = useState(null);
  const sumLang = picked ?? lang;
  const [view, setView] = useState(IDLE);
  const [live, setLive] = useState('');
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed
  const abortRef = useRef(null);
  const textRef = useRef('');
  const copyTimer = useRef(0);

  const { push, flush, cancel } = useFrameThrottle(
    useCallback((text) => setView((v) => (v.phase === 'streaming' ? { ...v, text } : v)), []),
  );

  // Show a saved summary for this PDF, language and preferences if there is one. Waits until the
  // preferences have loaded (otherwise the cache key would be the default one), and never replaces
  // the screen while a request is running.
  useEffect(() => {
    if (!settled || abortRef.current) return;
    const saved = readSummary(fileId, sumLang, prefsKey);
    setView(saved ? { ...IDLE, phase: 'done', text: saved.text, at: saved.at } : IDLE);
    if (saved?.pageCount) onPageCount(saved.pageCount);
    setCopyState('idle');
    setLive('');
  }, [fileId, sumLang, prefsKey, settled, onPageCount]);

  // Leaving the document ends any request in flight.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      clearTimeout(copyTimer.current);
    },
    [],
  );

  async function run() {
    if (abortRef.current) return;
    const runLang = sumLang;
    const runKey = prefsKey;
    setPicked(runLang); // fixed for this run, even if the interface language changes meanwhile
    const ac = new AbortController();
    abortRef.current = ac;
    textRef.current = '';
    setCopyState('idle');
    setLive(t('sumStarted'));
    setView({ ...IDLE, phase: 'streaming' });

    try {
      const res = await streamFromApi(
        '/api/summarize',
        { fileId, lang: runLang },
        {
          signal: ac.signal,
          onText: (text) => {
            textRef.current = text;
            push(text);
          },
        },
      );
      cancel();
      if (res.pageCount) onPageCount(res.pageCount);
      if (res.streamError) {
        setLive('');
        setView({ ...IDLE, phase: 'partial', text: res.text, streamErr: res.streamError });
      } else if (!res.text.trim()) {
        setLive('');
        setView({ ...IDLE, phase: 'error', errKey: 'apiErr_model_error' });
      } else {
        const at = writeSummary(fileId, runLang, runKey, { text: res.text, pageCount: res.pageCount });
        setView({ ...IDLE, phase: 'done', text: res.text, at });
        setLive(t('sumDone'));
      }
    } catch (err) {
      cancel();
      setLive('');
      if (err?.name === 'AbortError') {
        const text = textRef.current;
        setView(text.trim() ? { ...IDLE, phase: 'stopped', text } : IDLE);
      } else {
        setView({ ...IDLE, phase: 'error', errKey: apiErrorKey(err) });
      }
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function copy() {
    clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(view.text);
      setCopyState('copied');
      setLive(t('copied'));
    } catch {
      setCopyState('failed');
    }
    copyTimer.current = setTimeout(() => setCopyState('idle'), 2500);
  }

  const streaming = view.phase === 'streaming';
  const hasText = view.text.trim().length > 0;
  const date = view.at ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(view.at)) : null;

  let runLabel = t('sumRun');
  let runClass = 'btn btn-primary';
  if (view.phase === 'done') {
    runLabel = t('sumRegen');
    runClass = 'btn btn-secondary';
  } else if (view.phase === 'partial' || view.phase === 'stopped') {
    runLabel = t('sumRegen');
  } else if (view.phase === 'error') {
    runLabel = t('retry');
  }

  return (
    <div className="dv-panel-body">
      <div className="dv-controls">
        <div className="dv-field">
          <span className="dv-label" id={labelId}>
            {t('sumLangLabel')}
          </span>
          <div className="lang" role="group" aria-labelledby={labelId}>
            <button
              type="button"
              lang="en"
              aria-pressed={sumLang === 'en'}
              disabled={streaming}
              onClick={() => setPicked('en')}
            >
              {t('optEnglish')}
            </button>
            <button
              type="button"
              lang="zh-HK"
              aria-pressed={sumLang === 'zh'}
              disabled={streaming}
              onClick={() => setPicked('zh')}
            >
              {t('optChinese')}
            </button>
          </div>
        </div>

        <div className="dv-actions">
          {streaming ? (
            <button type="button" className="btn btn-secondary" onClick={stop}>
              <StopIcon />
              {t('sumStop')}
            </button>
          ) : (
            <button type="button" className={runClass} onClick={run} disabled={!settled}>
              {runLabel}
            </button>
          )}
          {hasText && !streaming && (
            <button type="button" className="btn btn-ghost" onClick={copy}>
              {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
              {copyState === 'copied' ? t('copied') : t('copy')}
            </button>
          )}
        </div>
      </div>

      <p className="hint dv-prefs-line">
        {t('sumPrefsLine', { level: t(`level_${prefs.level}`), length: t(`length_${prefs.length}`) })}
        <span aria-hidden="true"> · </span>
        <PrefsLink label={t('prefsEditLabel')}>{t('prefsEdit')}</PrefsLink>
      </p>

      <p className="visually-hidden" role="status" aria-live="polite">
        {live}
      </p>

      {copyState === 'failed' && (
        <p className="notice notice-error" role="alert">
          <AlertIcon />
          <span>{t('copyFailed')}</span>
        </p>
      )}

      {view.phase === 'idle' && (
        <div className="empty">
          <p className="empty-title">{t('sumEmptyTitle')}</p>
          <p>{t('sumEmpty')}</p>
        </div>
      )}

      {streaming && !hasText && (
        <div aria-hidden="true">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}

      {hasText && (
        <div className="dv-result" lang={sumLang === 'zh' ? 'zh-HK' : 'en'} aria-busy={streaming || undefined}>
          <AiMarkdown
            text={view.text}
            streaming={streaming}
            pageCount={pageCount}
            activePage={activePage}
            onCite={onCite}
          />
        </div>
      )}

      {view.phase === 'partial' && (
        <p className="notice notice-error" role="alert">
          <AlertIcon />
          <span>{t(view.streamErr === 'truncated' ? 'streamTruncated' : 'streamModelError')}</span>
        </p>
      )}

      {view.phase === 'stopped' && (
        <p className="notice notice-info" role="status">
          <AlertIcon />
          <span>{t('sumStopped')}</span>
        </p>
      )}

      {view.phase === 'error' && (
        <p className="notice notice-error" role="alert">
          <AlertIcon />
          <span>{t(view.errKey)}</span>
        </p>
      )}

      {view.phase === 'done' && date && <p className="hint">{t('sumSaved', { date })}</p>}
    </div>
  );
}
