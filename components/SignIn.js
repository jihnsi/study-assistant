'use client';

import { useId, useRef, useState } from 'react';
import { ID } from 'appwrite';
import { account } from '../lib/appwrite';
import { errorKey, useLang } from '../lib/i18n';
import LanguageToggle from './LanguageToggle';
import { AlertIcon, LogoMark } from './Icons';

export default function SignIn({ onSignedIn }) {
  const { t, lang } = useLang();
  const uid = useId();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const creating = mode === 'create';

  // Editing a field clears its own error so a fixed mistake doesn't linger on screen.
  function onEdit(field, setValue) {
    return (event) => {
      setValue(event.target.value);
      setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };
  }

  function switchMode() {
    setMode(creating ? 'signin' : 'create');
    setFieldErrors({});
    setFormError(null);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    const cleanEmail = email.trim();
    const errors = {};
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) errors.email = 'errEmail';
    if (!password) errors.password = 'errPasswordEmpty';
    else if (creating && password.length < 8) errors.password = 'errPasswordRule';

    setFieldErrors(errors);
    setFormError(null);
    if (errors.email) return emailRef.current?.focus();
    if (errors.password) return passwordRef.current?.focus();

    setBusy(true);
    try {
      if (creating) {
        await account.create({ userId: ID.unique(), email: cleanEmail, password });
      }
      await account.createEmailPasswordSession({ email: cleanEmail, password });
      onSignedIn(await account.get());
    } catch (err) {
      // A session already exists in this browser: carry on as that user.
      if (err?.type === 'user_session_already_exists') {
        try {
          onSignedIn(await account.get());
          return;
        } catch {}
      }
      setFormError(errorKey(err));
    } finally {
      setBusy(false);
    }
  }

  const emailErr = fieldErrors.email;
  const passwordErr = fieldErrors.password;

  return (
    <main className="gate">
      <div className="gate-top">
        <LogoMark size={32} />
        <LanguageToggle />
      </div>

      <section className="gate-brand">
        <h1 className="gate-name">{t('appName')}</h1>
        <p className="gate-tagline">{t('tagline')}</p>
        <p className="gate-statement">{t('gateStatement')}</p>
      </section>

      <section className="sheet" aria-labelledby={`${uid}-title`}>
        <div>
          <h2 id={`${uid}-title`}>{t(creating ? 'createTitle' : 'signInTitle')}</h2>

          <form onSubmit={submit} noValidate>
            {formError && (
              <p className="notice notice-error" role="alert">
                <AlertIcon />
                <span>{t(formError)}</span>
              </p>
            )}

            <div className="field">
              <label htmlFor={`${uid}-email`}>{t('email')}</label>
              <input
                ref={emailRef}
                id={`${uid}-email`}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={onEdit('email', setEmail)}
                aria-invalid={emailErr ? 'true' : undefined}
                aria-describedby={emailErr ? `${uid}-email-err` : undefined}
              />
              {emailErr && (
                <p className="field-error" id={`${uid}-email-err`}>
                  {t(emailErr)}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor={`${uid}-password`}>{t('password')}</label>
              <input
                ref={passwordRef}
                id={`${uid}-password`}
                name="password"
                type="password"
                autoComplete={creating ? 'new-password' : 'current-password'}
                value={password}
                onChange={onEdit('password', setPassword)}
                aria-invalid={passwordErr ? 'true' : undefined}
                aria-describedby={
                  [passwordErr && `${uid}-password-err`, creating && `${uid}-password-hint`]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              />
              {creating && (
                <p className="hint" id={`${uid}-password-hint`}>
                  {t('passwordHint')}
                </p>
              )}
              {passwordErr && (
                <p className="field-error" id={`${uid}-password-err`}>
                  {t(passwordErr)}
                </p>
              )}
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? t('working') : t(creating ? 'createAccount' : 'signIn')}
            </button>
          </form>

          <p className="switch">
            {t(creating ? 'haveAccount' : 'noAccount')}
            {lang === 'zh' ? null : ' '}
            <button type="button" className="link" onClick={switchMode}>
              {t(creating ? 'signIn' : 'createAccount')}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
