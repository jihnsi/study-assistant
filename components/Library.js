'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Query } from 'appwrite';
import { account, storage, BUCKET_ID } from '../lib/appwrite';
import { useLang } from '../lib/i18n';
import LanguageToggle from './LanguageToggle';
import Upload from './Upload';
import FilesTable from './FilesTable';
import DocumentView from './DocumentView';
import { AlertIcon, LogoMark } from './Icons';

// The open document lives in the address bar as ?doc=<fileId>. We use history.pushState / popstate
// directly (Next.js keeps them in sync with its router), so there is no useSearchParams and no Suspense.
const FILE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;

function readDocParam() {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('doc');
  return id && FILE_ID.test(id) ? id : null;
}

function urlWithDoc(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('doc', id);
  else url.searchParams.delete('doc');
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function Library({ user, onSignedOut }) {
  const { t } = useLang();
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [files, setFiles] = useState([]);
  const [newId, setNewId] = useState(null);
  const [signOutFailed, setSignOutFailed] = useState(false);
  // Library only renders after sign-in, in the browser, so reading the address bar here is safe.
  const [docId, setDocId] = useState(readDocParam);
  const [openFile, setOpenFile] = useState(null); // the file row we opened from the list, if any
  const [notice, setNotice] = useState(null); // 'docMissing' | null
  const listScroll = useRef(0);
  const returnTo = useRef(null);
  // True once the library has been on screen in this page load, so a history entry before the
  // document exists in our own history and history.back() lands on it.
  const libraryShown = useRef(docId === null);

  const load = useCallback(async () => {
    try {
      const result = await storage.listFiles({
        bucketId: BUCKET_ID,
        queries: [Query.orderDesc('$createdAt'), Query.limit(100)],
      });
      setFiles(result.files);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Browser Back and Forward move between the library and a document.
  useEffect(() => {
    const onPop = () => setDocId(readDocParam());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function openDoc(file) {
    listScroll.current = window.scrollY;
    returnTo.current = file.$id;
    setNotice(null);
    setOpenFile(file);
    setDocId(file.$id);
    window.history.pushState(null, '', urlWithDoc(file.$id));
  }

  // The Back button. If the library came before this document in our own history, step back through
  // history so Back/Forward stay in step; if the page was opened straight on ?doc=, replace the entry.
  function closeDoc() {
    if (libraryShown.current) {
      window.history.back();
    } else {
      window.history.replaceState(window.history.state, '', urlWithDoc(null));
      setDocId(null);
    }
  }

  // ?doc= pointed at a PDF that is not there: back to the library, with a note.
  const onMissing = useCallback(() => {
    window.history.replaceState(window.history.state, '', urlWithDoc(null));
    setDocId(null);
    setOpenFile(null);
    setNotice('docMissing');
    // The list may be stale too (deleted elsewhere).
    load();
  }, [load]);

  // Back in the library: restore the scroll position and put focus on the PDF we came from.
  const showingDoc = docId !== null;
  const wasShowingDoc = useRef(showingDoc);
  useEffect(() => {
    if (!showingDoc) libraryShown.current = true;
    if (wasShowingDoc.current && !showingDoc) {
      const id = returnTo.current;
      requestAnimationFrame(() => {
        window.scrollTo(0, listScroll.current);
        const target = id && document.querySelector(`[data-doc-id="${CSS.escape(id)}"]`);
        target?.focus({ preventScroll: true });
      });
      setOpenFile(null);
    }
    wasShowingDoc.current = showingDoc;
  }, [showingDoc]);

  // Re-read the list from Appwrite so what's shown is what is actually stored.
  async function handleStored(file) {
    setNewId(file.$id);
    await load();
  }

  async function signOut() {
    setSignOutFailed(false);
    try {
      await account.deleteSession({ sessionId: 'current' });
      onSignedOut();
    } catch {
      setSignOutFailed(true);
    }
  }

  return (
    <>
      {docId && (
        <DocumentView
          key={docId}
          fileId={docId}
          initialFile={openFile}
          onBack={closeDoc}
          onMissing={onMissing}
        />
      )}

      {/* Kept mounted (hidden) while a document is open, so the list and any upload in progress survive. */}
      <div hidden={showingDoc}>
        <a className="skip-link" href="#main">
          {t('skipToContent')}
        </a>
        <header className="bar">
          <div className="bar-inner">
            <p className="brand">
              <LogoMark />
              <span className="brand-name">{t('appName')}</span>
            </p>
            <div className="bar-tools">
              <LanguageToggle />
              <span className="bar-user">{user.email}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={signOut}>
                {t('signOut')}
              </button>
            </div>
          </div>
        </header>

        <main className="page" id="main">
          <h1>{t('libraryTitle')}</h1>
          {signOutFailed && (
            <p className="notice notice-error" role="alert">
              <AlertIcon />
              <span>{t('errSignOut')}</span>
            </p>
          )}
          {notice && (
            <div className="notice notice-error" role="alert">
              <AlertIcon />
              <span>{t(notice)}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNotice(null)}>
                {t('dismiss')}
              </button>
            </div>
          )}
          <Upload user={user} onStored={handleStored} />
          <FilesTable
            status={status}
            files={files}
            newId={newId}
            onRetry={load}
            onOpen={openDoc}
            onDeleted={load}
          />
        </main>
      </div>
    </>
  );
}
