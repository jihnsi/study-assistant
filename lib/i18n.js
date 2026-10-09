'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STRINGS = {
  en: {
    appName: 'Study Assistant',
    tagline: 'Upload your course notes and study from them.',
    langLabel: 'Language',
    signInTitle: 'Sign in',
    createTitle: 'Create account',
    email: 'Email',
    password: 'Password',
    passwordHint: 'Use at least 8 characters.',
    signIn: 'Sign in',
    createAccount: 'Create account',
    working: 'Working…',
    noAccount: 'New here?',
    haveAccount: 'Already have an account?',
    errEmail: 'Enter a valid email address.',
    errPasswordEmpty: 'Enter your password.',
    errPasswordRule: 'Use at least 8 characters, and avoid very common passwords.',
    errCredentials: 'Email or password is incorrect. Check both and try again.',
    errExists: 'An account with this email already exists. Sign in instead.',
    errRate: 'Too many attempts. Wait a minute and try again.',
    errNetwork: "Can't reach the server. Check your connection and try again.",
    errOrigin: "This web address isn't registered in Appwrite. Add it under Platforms in the Appwrite Console.",
    errGeneric: 'Something went wrong. Try again.',
    signOut: 'Sign out',
    errSignOut: "Couldn't sign you out. Try again.",
    yourPdfs: 'Your PDFs',
    uploadTitle: 'Upload a PDF',
    uploadHelp: "Text-based PDFs only, up to 20 MB. Scanned notes aren't supported yet.",
    dropHere: 'Drop a PDF here',
    choosePdf: 'Choose PDF',
    uploading: 'Uploading {name}…',
    stored: 'Stored: {name}',
    errNotPdf: "That file isn't a PDF. Choose a .pdf file.",
    errTooLarge: 'That file is over 20 MB. Choose a smaller PDF.',
    errUpload: "Upload failed. The file wasn't stored. Try again.",
    privacy: "Other users of this app can't see your files.",
    storedTitle: 'Stored PDFs',
    colName: 'Name',
    colSize: 'Size',
    colUploaded: 'Uploaded',
    empty: 'No PDFs stored yet. Upload your first set of notes above.',
    loadingFiles: 'Loading your PDFs…',
    errList: "Couldn't load your PDFs. Try again.",
    retry: 'Try again',
  },
  zh: {
    appName: '學習助手',
    tagline: '上載你的課堂筆記，從中學習。',
    langLabel: '語言',
    signInTitle: '登入',
    createTitle: '建立帳戶',
    email: '電郵',
    password: '密碼',
    passwordHint: '請使用至少 8 個字元。',
    signIn: '登入',
    createAccount: '建立帳戶',
    working: '處理中…',
    noAccount: '未有帳戶？',
    haveAccount: '已有帳戶？',
    errEmail: '請輸入有效的電郵地址。',
    errPasswordEmpty: '請輸入密碼。',
    errPasswordRule: '請使用至少 8 個字元，並避免過於常見的密碼。',
    errCredentials: '電郵或密碼不正確。請檢查後再試。',
    errExists: '此電郵已有帳戶。請改為登入。',
    errRate: '嘗試次數過多。請等一分鐘後再試。',
    errNetwork: '無法連線至伺服器。請檢查網絡後再試。',
    errOrigin: '此網址尚未在 Appwrite 登記。請在 Appwrite Console 的 Platforms 新增此網址。',
    errGeneric: '發生問題。請再試一次。',
    signOut: '登出',
    errSignOut: '無法登出。請再試一次。',
    yourPdfs: '你的 PDF',
    uploadTitle: '上載 PDF',
    uploadHelp: '只支援文字型 PDF，最大 20 MB。暫不支援掃描檔。',
    dropHere: '將 PDF 拖放到這裡',
    choosePdf: '選擇 PDF',
    uploading: '正在上載 {name}…',
    stored: '已儲存：{name}',
    errNotPdf: '此檔案不是 PDF。請選擇 .pdf 檔案。',
    errTooLarge: '檔案超過 20 MB。請選擇較小的 PDF。',
    errUpload: '上載失敗，檔案未有儲存。請再試一次。',
    privacy: '此應用程式的其他使用者看不到你的檔案。',
    storedTitle: '已儲存的 PDF',
    colName: '名稱',
    colSize: '大小',
    colUploaded: '上載時間',
    empty: '尚未儲存任何 PDF。請在上方上載你的第一份筆記。',
    loadingFiles: '正在載入你的 PDF…',
    errList: '無法載入你的 PDF。請再試一次。',
    retry: '重試',
  },
};

const LOCALES = { en: 'en-HK', zh: 'zh-HK' };

const LangContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  // Pick the saved language, else the browser's. Runs after mount so the
  // server-rendered HTML and the first client render match.
  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem('lang');
    } catch {}
    if (saved === 'en' || saved === 'zh') {
      setLangState(saved);
    } else if ((navigator.language || '').toLowerCase().startsWith('zh')) {
      setLangState('zh');
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en';
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      localStorage.setItem('lang', next);
    } catch {}
  }, []);

  const value = useMemo(() => {
    const dict = STRINGS[lang];
    const t = (key, params) => {
      const text = dict[key] ?? STRINGS.en[key] ?? key;
      if (!params) return text;
      return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
    };
    return { lang, setLang, t, locale: LOCALES[lang] };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}

// Maps an Appwrite error to one of the message keys above.
export function errorKey(err, fallback = 'errGeneric') {
  switch (err?.type) {
    case 'user_invalid_credentials':
      return 'errCredentials';
    case 'user_already_exists':
      return 'errExists';
    case 'general_rate_limit_exceeded':
      return 'errRate';
    case 'general_unknown_origin':
      return 'errOrigin';
  }
  if (err?.code === 400 && /password/i.test(err.message || '')) return 'errPasswordRule';
  // The SDK reports a failed fetch as an exception with no HTTP status.
  if (!err?.code) return 'errNetwork';
  return fallback;
}
