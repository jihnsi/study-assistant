'use client';

import { usePrefs } from '../lib/prefs';

// A link to the Preferences view that navigates in place (no reload), but still works as a real link
// for "open in new tab" and middle click. Focus returns to it when the student comes back.
export default function PrefsLink({ children, label }) {
  const { openPrefs } = usePrefs();

  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openPrefs(e.currentTarget);
  }

  return (
    <a className="link link-inline" href="?view=prefs" aria-label={label} onClick={onClick}>
      {children}
    </a>
  );
}
