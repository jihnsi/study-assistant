'use client';

import { useLang } from '../lib/i18n';

export default function LanguageToggle() {
  const { lang, setLang, t } = useLang();

  return (
    <div className="lang" role="group" aria-label={t('langLabel')}>
      <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
        English
      </button>
      <button type="button" lang="zh-HK" aria-pressed={lang === 'zh'} onClick={() => setLang('zh')}>
        中文
      </button>
    </div>
  );
}
