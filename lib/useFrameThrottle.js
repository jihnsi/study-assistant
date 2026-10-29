'use client';

import { useCallback, useEffect, useRef } from 'react';

// Streamed text arrives in many small chunks; re-rendering Markdown for each one is wasteful.
// push(value) delivers only the latest value, at most once per animation frame.
// flush() delivers it now (call it when the stream ends) and cancel() drops anything pending.
export function useFrameThrottle(apply) {
  const applyRef = useRef(apply);
  const latest = useRef(null);
  const frame = useRef(0);

  useEffect(() => {
    applyRef.current = apply;
  });

  const cancel = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    latest.current = null;
  }, []);

  const push = useCallback((value) => {
    latest.current = { value };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const pending = latest.current;
      latest.current = null;
      if (pending) applyRef.current(pending.value);
    });
  }, []);

  const flush = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    const pending = latest.current;
    latest.current = null;
    if (pending) applyRef.current(pending.value);
  }, []);

  useEffect(() => cancel, [cancel]);

  return { push, flush, cancel };
}
