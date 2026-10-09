'use client';

import { useEffect, useState } from 'react';
import { account } from '../lib/appwrite';
import SignIn from '../components/SignIn';
import Library from '../components/Library';

export default function Home() {
  // undefined = still checking for a session, null = signed out
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    account
      .get()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && setUser(null));
    return () => {
      cancelled = true;
    };
  }, []);

  if (user === undefined) return <div className="boot" aria-busy="true" />;
  if (user === null) return <SignIn onSignedIn={setUser} />;
  return <Library user={user} onSignedOut={() => setUser(null)} />;
}
