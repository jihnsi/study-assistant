'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { streamFromApi } from '../lib/api';
import { apiErrorKey, useLang } from '../lib/i18n';
import { useFrameThrottle } from '../lib/useFrameThrottle';
import AiMarkdown from './AiMarkdown';
import { AlertIcon, SendIcon, StopIcon } from './Icons';

const MAX_QUESTION = 2000;
const WARN_AT = 1800;
const HISTORY_TURNS = 6;
const STARTERS = ['starter1', 'starter2', 'starter3'];
// Trying again cannot fix these.
const NOT_RETRYABLE = ['apiErr_no_text', 'apiErr_not_configured', 'apiErr_not_found', 'apiErr_unauthorized'];

// One turn: { id, q, a, phase, errKey, streamErr }.
// phase: streaming | done | partial (server cut it short) | stopped | error
let nextId = 1;

function historyFrom(turns) {
  const done = turns.filter((x) => x.phase === 'done' && x.a.trim());
  return done
    .flatMap((x) => [
      { role: 'user', content: x.q },
      { role: 'assistant', content: x.a },
    ])
    .slice(-HISTORY_TURNS);
}

// The Ask tab: a conversation scoped to this PDF. Answers are written in the interface language.
export default function AskPanel({ fileId, pageCount, activePage, onCite }) {
  const { t, lang } = useLang();
  const fieldId = useId();
  const hintId = useId();
  const [turns, setTurns] = useState([]);
  const turnsRef = useRef([]);
  const [draft, setDraft] = useState('');
  const [live, setLive] = useState('');
  const abortRef = useRef(null);
  const areaRef = useRef(null);
  const lastTurnRef = useRef(null);
  const scrollOnAdd = useRef(false);

  const update = useCallback((fn) => {
    turnsRef.current = fn(turnsRef.current);
    setTurns(turnsRef.current);
  }, []);

  const patchStreaming = useCallback(
    (id, patch) => update((all) => all.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    [update],
  );

  const streamingId = useRef(null);
  const { push, flush, cancel } = useFrameThrottle(
    useCallback(
      (text) => {
        if (streamingId.current != null) patchStreaming(streamingId.current, { a: text });
      },
      [patchStreaming],
    ),
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  // Grow the textarea with its content, up to a limit.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 168)}px`;
  }, [draft]);

  // Bring a new question into view; the answer then streams in beneath it.
  useEffect(() => {
    if (!scrollOnAdd.current) return;
    scrollOnAdd.current = false;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    lastTurnRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }, [turns.length]);

  const busy = turns.some((x) => x.phase === 'streaming');

  async function ask(question, base = turnsRef.current) {
    const q = question.trim();
    if (!q || q.length > MAX_QUESTION || abortRef.current) return;
    const id = nextId++;
    const history = historyFrom(base);
    const ac = new AbortController();
    abortRef.current = ac;
    streamingId.current = id;
    scrollOnAdd.current = true;
    update(() => [...base, { id, q, a: '', phase: 'streaming', errKey: null, streamErr: null }]);
    setLive(t('askStarted'));

    try {
      const res = await streamFromApi(
        '/api/ask',
        { fileId, lang, question: q, history },
        { signal: ac.signal, onText: push },
      );
      cancel();
      if (res.streamError) {
        patchStreaming(id, { a: res.text, phase: 'partial', streamErr: res.streamError });
        setLive('');
      } else if (!res.text.trim()) {
        patchStreaming(id, { a: '', phase: 'error', errKey: 'apiErr_model_error' });
        setLive('');
      } else {
        patchStreaming(id, { a: res.text, phase: 'done' });
        setLive(t('askDone'));
      }
    } catch (err) {
      cancel();
      setLive('');
      if (err?.name === 'AbortError') {
        // Keep whatever had arrived; the notice says it is incomplete. It is left out of the history.
        patchStreaming(id, { phase: 'stopped' });
      } else {
        patchStreaming(id, { phase: 'error', errKey: apiErrorKey(err) });
      }
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      if (streamingId.current === id) streamingId.current = null;
    }
  }

  function submit() {
    const q = draft.trim();
    if (!q || q.length > MAX_QUESTION || busy) return;
    setDraft('');
    ask(q);
  }

  function onKeyDown(e) {
    // Enter sends; Shift+Enter is a new line. While an IME is composing (Chinese input), Enter confirms the text.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      submit();
    }
  }

  function retry() {
    const all = turnsRef.current;
    const last = all[all.length - 1];
    if (!last || busy) return;
    ask(last.q, all.slice(0, -1));
  }

  function clearChat() {
    if (busy) return;
    update(() => []);
    setLive('');
    areaRef.current?.focus();
  }

  const left = MAX_QUESTION - draft.length;
  const lastIndex = turns.length - 1;

  return (
    <div className="dv-panel-body dv-ask">
      <p className="visually-hidden" role="status" aria-live="polite">
        {live}
      </p>

      <div className="dv-thread">
        {turns.length === 0 ? (
          <div className="dv-intro">
            <div className="empty">
              <p className="empty-title">{t('askTitle')}</p>
              <p>{t('askEmpty')}</p>
            </div>
            <div>
              <p className="dv-label" id={`${fieldId}-try`}>
                {t('askTry')}
              </p>
              <ul className="dv-starters" aria-labelledby={`${fieldId}-try`}>
                {STARTERS.map((key) => (
                  <li key={key}>
                    <button type="button" className="btn btn-secondary dv-starter" onClick={() => ask(t(key))}>
                      {t(key)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <ol className="dv-turns" aria-label={t('askThread')}>
            {turns.map((turn, i) => {
              const streaming = turn.phase === 'streaming';
              return (
                <li key={turn.id} className="dv-turn" ref={i === lastIndex ? lastTurnRef : null}>
                  <div className="dv-q">
                    <span className="visually-hidden">{t('askLabel')}: </span>
                    {turn.q}
                  </div>

                  <div className="dv-a" aria-busy={streaming || undefined}>
                    <h3 className="visually-hidden">{t('askAnswerLabel')}</h3>
                    {streaming && !turn.a && (
                      <div aria-hidden="true">
                        <div className="skeleton skeleton-sm" />
                        <div className="skeleton skeleton-sm" />
                      </div>
                    )}
                    {turn.a.trim() && (
                      <AiMarkdown
                        text={turn.a}
                        streaming={streaming}
                        pageCount={pageCount}
                        activePage={activePage}
                        onCite={onCite}
                      />
                    )}

                    {turn.phase === 'partial' && (
                      <p className="notice notice-error" role="alert">
                        <AlertIcon />
                        <span>{t(turn.streamErr === 'truncated' ? 'streamTruncated' : 'streamModelError')}</span>
                      </p>
                    )}
                    {turn.phase === 'stopped' && (
                      <p className="notice notice-info" role="status">
                        <AlertIcon />
                        <span>{t('askStopped')}</span>
                        {i === lastIndex && !busy && !turn.a.trim() && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
                            {t('askRetry')}
                          </button>
                        )}
                      </p>
                    )}
                    {turn.phase === 'error' && (
                      <p className="notice notice-error" role="alert">
                        <AlertIcon />
                        <span>{t(turn.errKey)}</span>
                        {i === lastIndex && !busy && !NOT_RETRYABLE.includes(turn.errKey) && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
                            {t('askRetry')}
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <form
        className="dv-composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="visually-hidden" htmlFor={fieldId}>
          {t('askLabel')}
        </label>
        <div className="dv-composer-row">
          <textarea
            id={fieldId}
            ref={areaRef}
            className="dv-input"
            rows={1}
            maxLength={MAX_QUESTION}
            value={draft}
            placeholder={t('askPlaceholder')}
            aria-describedby={hintId}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {busy ? (
            <button type="button" className="btn btn-secondary dv-send" onClick={() => abortRef.current?.abort()}>
              <StopIcon />
              {t('askStop')}
            </button>
          ) : (
            <button type="submit" className="btn btn-primary dv-send" disabled={!draft.trim()}>
              <SendIcon />
              {t('askSend')}
            </button>
          )}
        </div>
        <div className="dv-composer-foot">
          <p className="hint dv-keys" id={hintId}>
            {left <= MAX_QUESTION - WARN_AT ? t('askLeft', { n: left }) : t('askHint')}
          </p>
          {turns.length > 0 && !busy && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearChat}>
              {t('askClear')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
