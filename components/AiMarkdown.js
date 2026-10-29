'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLang } from '../lib/i18n';

const CITE_RE = /\[p\. ?(\d+)\]/g;
// A citation still being typed at the end of the stream, e.g. "[", "[p", "[p. 1". Hold it back so it never flashes.
const PARTIAL_CITE_RE = /\[(?:p(?:\.(?: ?\d*)?)?)?$/;

// "[p. 3]" becomes a Markdown link to "#page-3"; the `a` override below turns those into chips.
export function withCitationLinks(text, streaming) {
  const visible = streaming ? text.replace(PARTIAL_CITE_RE, '') : text;
  return visible.replace(CITE_RE, (_, n) => `[p. ${n}](#page-${n})`);
}

// Model output as Markdown, with page citations as chips that call onCite(page).
// Never uses dangerouslySetInnerHTML; links other than #page-N are shown as plain text.
function AiMarkdown({ text, streaming = false, pageCount = null, activePage = null, onCite }) {
  const { t } = useLang();
  const source = useMemo(() => withCitationLinks(text, streaming), [text, streaming]);

  const components = useMemo(
    () => ({
      a({ href, children }) {
        const match = typeof href === 'string' ? /^#page-(\d+)$/.exec(href) : null;
        if (!match) return <span>{children}</span>;
        const page = Number(match[1]);
        // A page the PDF does not have: show it, but do not pretend it can be opened.
        if (page < 1 || (pageCount && page > pageCount)) {
          return (
            <span className="cite cite-off" role="img" aria-label={t('citeMissing', { n: page })}>
              {t('citePage', { n: page })}
            </span>
          );
        }
        return (
          <button
            type="button"
            className="cite"
            aria-label={t('citeGo', { n: page })}
            aria-current={activePage === page ? 'true' : undefined}
            onClick={() => onCite?.(page)}
          >
            {t('citePage', { n: page })}
          </button>
        );
      },
    }),
    [t, pageCount, activePage, onCite],
  );

  return (
    <div className={`md${streaming ? ' is-streaming' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

export default memo(AiMarkdown);
