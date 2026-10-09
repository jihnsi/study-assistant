'use client';

import { useCallback, useEffect, useState } from 'react';
import { Query } from 'appwrite';
import { account, storage, BUCKET_ID } from '../lib/appwrite';
import { useLang } from '../lib/i18n';
import LanguageToggle from './LanguageToggle';
import Upload from './Upload';
import FilesTable from './FilesTable';
import { AlertIcon } from './Icons';

export default function Library({ user, onSignedOut }) {
  const { t } = useLang();
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [files, setFiles] = useState([]);
  const [newId, setNewId] = useState(null);
  const [signOutFailed, setSignOutFailed] = useState(false);

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
      <header className="bar">
        <p className="bar-name">{t('appName')}</p>
        <div className="bar-tools">
          <LanguageToggle />
          <span className="bar-user">{user.email}</span>
          <button type="button" className="btn btn-outline-light" onClick={signOut}>
            {t('signOut')}
          </button>
        </div>
        <div className="stripe bar-stripe" aria-hidden="true" />
      </header>

      <main className="library">
        <h1>{t('yourPdfs')}</h1>
        {signOutFailed && (
          <p className="notice notice-error" role="alert">
            <AlertIcon />
            <span>{t('errSignOut')}</span>
          </p>
        )}
        <Upload user={user} onStored={handleStored} />
        <FilesTable status={status} files={files} newId={newId} onRetry={load} />
      </main>
    </>
  );
}
