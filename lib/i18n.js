'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STRINGS = {
  en: {
    appName: 'Margin',
    docTitle: 'Margin: study from your own notes',
    tagline: 'Study from your own notes, and check every answer against the page.',
    gateStatement:
      'Upload your lecture notes as a text-based PDF. Margin summarises them and answers your questions, naming the page each answer comes from. Only you can see your files.',
    skipToContent: 'Skip to content',
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
    libraryTitle: 'Library',
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
    storedTitle: 'Your PDFs',
    emptyTitle: 'Nothing here yet',
    empty: 'Upload your first set of notes above and it will appear here.',
    uploadedOn: 'Uploaded {date}',
    deleteFile: 'Delete',
    deleteLabel: 'Delete {name}',
    deleteConfirm: 'Delete “{name}”? This can’t be undone.',
    deleteYes: 'Delete PDF',
    cancel: 'Cancel',
    deleting: 'Deleting…',
    deleted: 'Deleted: {name}',
    errDelete: "Couldn't delete the PDF. Try again.",
    loadingFiles: 'Loading your PDFs…',
    errList: "Couldn't load your PDFs. Try again.",
    retry: 'Try again',

    // ---- Document view ----
    docBack: 'Back',
    docBackLabel: 'Back to library',
    pageCountOne: '1 page',
    pageCountMany: '{n} pages',
    docOpening: 'Opening your PDF…',
    docMissing: "That PDF isn't in your library any more. It may have been deleted.",
    docOpenError: "Couldn't open this PDF.",
    dismiss: 'Dismiss',
    paneSwitchLabel: 'Show',
    paneStudy: 'Study',
    panePdf: 'PDF',
    pdfFrameTitle: 'PDF: {name}',
    pdfBarLabel: 'Original PDF',
    pdfOpenTab: 'Open in new tab',
    pdfLoading: 'Loading the PDF…',
    pdfPhoneHint: "If the PDF doesn't show on your phone, open it in a new tab.",
    pdfShowing: 'Showing page {n} of the PDF.',
    studyLabel: 'Study panel',
    tabsLabel: 'Study tools',
    tabSummary: 'Summary',
    tabAsk: 'Ask',
    trustAnswers: 'Answers come only from this PDF. Check the cited pages before you rely on them.',
    trustSend: "Margin sends this PDF's text to DeepSeek only when you summarise or ask. For long PDFs, Voyage AI also reads it to find the relevant pages.",
    optEnglish: 'English',
    optChinese: '中文',
    sumLangLabel: 'Summary language',
    sumRun: 'Summarise',
    sumRunning: 'Summarising…',
    sumRegen: 'Regenerate',
    sumStop: 'Stop',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: "Couldn't copy. Select the text and copy it yourself.",
    sumEmptyTitle: 'No summary yet',
    sumEmpty: 'Summarise writes the key points of this PDF, each with the page it comes from.',
    sumSaved: 'Saved on this device · {date}',
    sumStarted: 'Writing the summary…',
    sumDone: 'Summary ready.',
    sumStopped: 'Stopped. This summary is incomplete and was not saved.',
    sumHeading: 'Summary',
    streamTruncated: 'The reply reached the length limit and was cut off. What you see is incomplete.',
    streamModelError: 'The AI service stopped partway. What you see is incomplete.',
    askTitle: 'Ask about this PDF',
    askEmpty: 'Each answer comes from this PDF only and names the pages it used.',
    askTry: 'Try asking',
    starter1: 'What are the main ideas in this PDF?',
    starter2: 'List the key terms and define each one briefly.',
    starter3: 'Write five practice questions from these notes.',
    askLabel: 'Your question',
    askPlaceholder: 'Ask about this PDF',
    askHint: 'Enter sends. Shift+Enter starts a new line.',
    askLeft: '{n} characters left',
    askSend: 'Send',
    askStop: 'Stop',
    askClear: 'Clear chat',
    askRetry: 'Try again',
    askAnswerLabel: 'Answer',
    askStarted: 'Writing the answer…',
    askDone: 'Answer ready.',
    askStopped: 'Stopped. This answer is incomplete.',
    askThread: 'Conversation',
    citePage: 'p. {n}',
    citeGo: 'Go to page {n}',
    citeMissing: 'Page {n} (not in this PDF)',
    apiErr_bad_request: "That request wasn't valid. Reload the page and try again.",
    apiErr_unauthorized: 'Your session has expired. Reload the page and sign in again.',
    apiErr_not_found: "This PDF wasn't found in your library. It may have been deleted.",
    apiErr_no_text: "This PDF has no selectable text, so Margin can't read it. Scanned notes aren't supported yet.",
    apiErr_rate_limited: "You've sent a lot of requests. Wait a few minutes and try again.",
    apiErr_not_configured:
      "The AI service isn't set up yet. Add DEEPSEEK_API_KEY to .env.local and restart the dev server.",
    apiErr_model_error: "The AI service couldn't answer just now. Try again in a moment.",
    apiErr_server_error: 'Something went wrong on the server. Try again.',
    apiErr_network: "Can't reach the server. Check your connection and try again.",

    // ---- Preferences and memory ----
    prefsOpen: 'Preferences',
    prefsEdit: 'Edit',
    prefsEditLabel: 'Edit preferences',
    prefsTitle: 'Preferences',
    prefsIntro: 'These settings shape how Margin explains things. They apply to every PDF.',
    prefsLoading: 'Loading your preferences…',
    errPrefsLoad: "Couldn't load your preferences. Try again.",
    errPrefsSave: "Couldn't save. Your changes are still here. Try again.",
    errPrefsMemory: "Couldn't update memory. Try again.",
    errPrefsForget: "Couldn't delete. Try again.",
    prefsExplainTitle: 'How Margin explains',
    prefsLevelLabel: 'Level',
    level_beginner: 'Beginner',
    level_standard: 'Standard',
    level_advanced: 'Advanced',
    levelDesc_beginner: 'Plain words, with terms explained as they appear and ideas taken one step at a time.',
    levelDesc_standard: 'Clear and balanced. Assumes you went to the lecture.',
    levelDesc_advanced: 'Concise and technical. Skips the basics and goes straight to the detail.',
    prefsLengthLabel: 'Answer length',
    length_short: 'Short',
    length_detailed: 'Detailed',
    lengthDesc_short: 'Gets to the point in a few lines.',
    lengthDesc_detailed: 'Fuller explanations, with the reasoning and examples.',
    prefsSave: 'Save preferences',
    prefsSaving: 'Saving…',
    prefsSaved: 'Saved. Margin will use this from the next summary or answer.',
    prefsUnsaved: 'You have unsaved changes.',
    prefsLeaveWarn: 'You have unsaved changes. Leave without saving them?',
    prefsLeave: 'Leave without saving',
    prefsStay: 'Keep editing',
    prefsMemoryTitle: 'Memory',
    prefsRememberLabel: 'Remember details from my questions and PDFs',
    prefsRememberDesc: 'Margin may note things like your course or topics you find hard. Notes you add yourself are always kept.',
    prefsRememberOn: 'Memory turned on.',
    prefsRememberOff: 'Memory turned off.',
    prefsMemoryNote:
      'Margin writes notes from your questions and the PDFs you summarise, and you can edit them or add your own. They are stored in your account and only shape tone and examples, never facts about your PDFs. You can delete them at any time.',
    prefsMemoryOffNote: "Memory is off, so Margin won't add new notes. Notes already kept stay, and are still used, until you delete them.",
    prefsNotesTitle: 'What Margin has noted',
    prefsNotesCount: '{n} of {max} notes',
    prefsMemEmptyTitle: 'No notes yet',
    prefsMemEmpty:
      'As you ask questions and summarise PDFs, Margin may note things like your course or what you find hard. You can also add a note yourself. They will appear here.',
    prefsMemOffTitle: 'Memory is off',
    prefsMemOff: "Margin isn't writing notes from your questions or PDFs. Turn memory on above if you want it to, or add a note yourself.",
    prefsNotedOn: 'Noted {date}',
    prefsForget: 'Forget',
    prefsForgetLabel: 'Forget this note: {text}',
    prefsForgetAll: 'Forget everything',
    prefsForgetAllConfirm: 'Delete all {n} notes? This can’t be undone.',
    prefsForgetAllYes: 'Delete all notes',
    prefsForgotten: 'Note deleted.',
    prefsForgotAll: 'All notes deleted.',
    prefsSourceAsk: 'From a question',
    prefsSourcePdf: 'From a PDF',
    prefsSourceYou: 'Added by you',
    prefsEdit: 'Edit',
    prefsEditLabel: 'Edit this note: {text}',
    prefsAdd: '+ Add a note',
    prefsNoteField: 'Note',
    prefsNoteHint: 'One short fact or preference, for example “I’m revising COM4101 and find recursion hard.” Up to {max} characters. Keep out anything private.',
    prefsNoteSave: 'Save note',
    prefsNoteEmpty: 'Write something first.',
    prefsNoteSaved: 'Note saved.',
    prefsNoteAdded: 'Note added.',
    prefsFull: 'You have {max} notes, the most Margin keeps. Delete one to add another.',
    errPrefsNote: "Couldn't save the note. Your text is still here. Try again.",
    askPrefsLine: 'Answers use your preferences',
    askMemoryOff: 'Memory is off',
    sumPrefsLine: 'Level: {level} · Length: {length}',
  },
  zh: {
    appName: '旁註',
    docTitle: '旁註：用自己的筆記溫書',
    tagline: '用自己的筆記溫書，每個答案都能對照原頁。',
    gateStatement:
      '把講義或筆記上載為文字型 PDF。旁註會為你撰寫摘要、回答提問，並標明每個答案出自哪一頁。只有你看得到自己的檔案。',
    skipToContent: '跳至內容',
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
    libraryTitle: '資料庫',
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
    storedTitle: '你的 PDF',
    emptyTitle: '暫時沒有檔案',
    empty: '在上方上載第一份筆記，它就會出現在這裡。',
    uploadedOn: '上載於 {date}',
    deleteFile: '刪除',
    deleteLabel: '刪除 {name}',
    deleteConfirm: '要刪除「{name}」嗎？此操作無法還原。',
    deleteYes: '刪除 PDF',
    cancel: '取消',
    deleting: '正在刪除…',
    deleted: '已刪除：{name}',
    errDelete: '無法刪除此 PDF。請再試一次。',
    loadingFiles: '正在載入你的 PDF…',
    errList: '無法載入你的 PDF。請再試一次。',
    retry: '重試',

    // ---- Document view ----
    docBack: '返回',
    docBackLabel: '返回資料庫',
    pageCountOne: '共 1 頁',
    pageCountMany: '共 {n} 頁',
    docOpening: '正在開啟 PDF…',
    docMissing: '資料庫中已找不到該 PDF，可能已被刪除。',
    docOpenError: '無法開啟此 PDF。',
    dismiss: '關閉',
    paneSwitchLabel: '切換檢視',
    paneStudy: '溫習',
    panePdf: 'PDF',
    pdfFrameTitle: 'PDF：{name}',
    pdfBarLabel: '原始 PDF',
    pdfOpenTab: '在新分頁開啟',
    pdfLoading: '正在載入 PDF…',
    pdfPhoneHint: '如果手機上看不到 PDF，請在新分頁開啟。',
    pdfShowing: '正在顯示 PDF 第 {n} 頁。',
    studyLabel: '溫習面板',
    tabsLabel: '溫習工具',
    tabSummary: '摘要',
    tabAsk: '提問',
    trustAnswers: '答案只根據這份 PDF 生成。引用前請先核對所標示的頁數。',
    trustSend: '只有在你要求摘要或提問時，旁註才會把這份 PDF 的文字傳送給 DeepSeek。較長的 PDF 亦會交由 Voyage AI 找出相關頁面。',
    optEnglish: 'English',
    optChinese: '中文',
    sumLangLabel: '摘要語言',
    sumRun: '撰寫摘要',
    sumRunning: '正在撰寫摘要…',
    sumRegen: '重新生成',
    sumStop: '停止',
    copy: '複製',
    copied: '已複製',
    copyFailed: '無法複製。請自行選取文字再複製。',
    sumEmptyTitle: '尚未有摘要',
    sumEmpty: '旁註會列出這份 PDF 的重點，並標明每點出自哪一頁。',
    sumSaved: '已儲存在此裝置 · {date}',
    sumStarted: '正在撰寫摘要…',
    sumDone: '摘要已完成。',
    sumStopped: '已停止。此摘要並不完整，也未有儲存。',
    sumHeading: '摘要',
    streamTruncated: '內容達到長度上限而被截斷，目前顯示的並不完整。',
    streamModelError: '人工智能服務中途停止，目前顯示的並不完整。',
    askTitle: '就這份 PDF 提問',
    askEmpty: '每個答案只取材自這份 PDF，並標明所用的頁數。',
    askTry: '可以這樣問',
    starter1: '這份 PDF 的主要重點是什麼？',
    starter2: '列出關鍵詞彙，並簡單解釋每一個。',
    starter3: '根據這些筆記，擬五條練習題。',
    askLabel: '你的問題',
    askPlaceholder: '就這份 PDF 提問',
    askHint: '按 Enter 傳送，Shift+Enter 換行。',
    askLeft: '還可輸入 {n} 字',
    askSend: '傳送',
    askStop: '停止',
    askClear: '清除對話',
    askRetry: '重試',
    askAnswerLabel: '答案',
    askStarted: '正在撰寫答案…',
    askDone: '答案已完成。',
    askStopped: '已停止。此答案並不完整。',
    askThread: '對話',
    citePage: '第 {n} 頁',
    citeGo: '跳至第 {n} 頁',
    citeMissing: '第 {n} 頁（此 PDF 沒有這一頁）',
    apiErr_bad_request: '請求無效。請重新載入頁面後再試。',
    apiErr_unauthorized: '登入已過期。請重新載入頁面並再次登入。',
    apiErr_not_found: '資料庫中找不到這份 PDF，可能已被刪除。',
    apiErr_no_text: '這份 PDF 沒有可選取的文字，旁註無法閱讀。暫不支援掃描檔。',
    apiErr_rate_limited: '你在短時間內發出太多請求。請等幾分鐘後再試。',
    apiErr_not_configured: '人工智能服務尚未設定。請在 .env.local 加入 DEEPSEEK_API_KEY，然後重新啟動開發伺服器。',
    apiErr_model_error: '人工智能服務暫時未能回應。請稍後再試。',
    apiErr_server_error: '伺服器發生問題。請再試一次。',
    apiErr_network: '無法連線至伺服器。請檢查網絡後再試。',

    // ---- Preferences and memory ----
    prefsOpen: '偏好設定',
    prefsEdit: '修改',
    prefsEditLabel: '修改偏好設定',
    prefsTitle: '偏好設定',
    prefsIntro: '這些設定會影響旁註解釋的方式，適用於所有 PDF。',
    prefsLoading: '正在載入你的偏好設定…',
    errPrefsLoad: '無法載入你的偏好設定。請再試一次。',
    errPrefsSave: '無法儲存，你的修改仍然保留。請再試一次。',
    errPrefsMemory: '無法更新記憶設定。請再試一次。',
    errPrefsForget: '無法刪除。請再試一次。',
    prefsExplainTitle: '旁註如何解釋',
    prefsLevelLabel: '程度',
    level_beginner: '入門',
    level_standard: '標準',
    level_advanced: '進階',
    levelDesc_beginner: '用淺白的字句，術語出現時隨即解釋，一步一步講解。',
    levelDesc_standard: '清晰而平衡，假設你有上過堂。',
    levelDesc_advanced: '簡潔而專業，略過基礎，直接談細節。',
    prefsLengthLabel: '答案長度',
    length_short: '精簡',
    length_detailed: '詳細',
    lengthDesc_short: '幾句話說清重點。',
    lengthDesc_detailed: '解釋較完整，附上推理過程和例子。',
    prefsSave: '儲存偏好設定',
    prefsSaving: '正在儲存…',
    prefsSaved: '已儲存。下一次撰寫摘要或回答時就會採用。',
    prefsUnsaved: '你有未儲存的修改。',
    prefsLeaveWarn: '你有未儲存的修改。要不儲存就離開嗎？',
    prefsLeave: '不儲存並離開',
    prefsStay: '繼續編輯',
    prefsMemoryTitle: '記憶',
    prefsRememberLabel: '記住我提問和 PDF 中的細節',
    prefsRememberDesc: '旁註可能會記下你修讀的科目、覺得困難的課題等。你自己加的筆記一律會保留。',
    prefsRememberOn: '已開啟記憶。',
    prefsRememberOff: '已關閉記憶。',
    prefsMemoryNote:
      '旁註會根據你的提問和你摘要過的 PDF 撰寫筆記，你可以修改，也可以自己新增。筆記儲存在你的帳戶中，只影響語氣和舉例，不會當作 PDF 內容的事實依據。你可以隨時刪除。',
    prefsMemoryOffNote: '記憶已關閉，旁註不會再新增筆記。已記下的筆記會保留並繼續使用，直至你刪除。',
    prefsNotesTitle: '旁註記下的內容',
    prefsNotesCount: '{n} / {max} 則筆記',
    prefsMemEmptyTitle: '暫時沒有筆記',
    prefsMemEmpty: '你提問和摘要 PDF 時，旁註可能會記下你的科目或覺得困難的地方。你也可以自己新增筆記。記下的內容會顯示在這裡。',
    prefsMemOffTitle: '記憶已關閉',
    prefsMemOff: '旁註沒有根據你的提問或 PDF 撰寫筆記。如想它這樣做，請在上方開啟記憶，或自己新增筆記。',
    prefsNotedOn: '記錄於 {date}',
    prefsForget: '忘記',
    prefsForgetLabel: '忘記這則筆記：{text}',
    prefsForgetAll: '全部忘記',
    prefsForgetAllConfirm: '要刪除全部 {n} 則筆記嗎？此操作無法還原。',
    prefsForgetAllYes: '刪除全部筆記',
    prefsForgotten: '已刪除該筆記。',
    prefsForgotAll: '已刪除全部筆記。',
    prefsSourceAsk: '來自提問',
    prefsSourcePdf: '來自 PDF',
    prefsSourceYou: '你自己加的',
    prefsEdit: '編輯',
    prefsEditLabel: '編輯這則筆記：{text}',
    prefsAdd: '+ 新增筆記',
    prefsNoteField: '筆記',
    prefsNoteHint: '寫下一項簡短的資料或偏好，例如：「我正在溫習 COM4101，覺得遞迴很難。」最多 {max} 個字元。請勿寫入私隱資料。',
    prefsNoteSave: '儲存筆記',
    prefsNoteEmpty: '請先寫點內容。',
    prefsNoteSaved: '已儲存筆記。',
    prefsNoteAdded: '已新增筆記。',
    prefsFull: '你已有 {max} 則筆記，這是旁註可保留的上限。請先刪除一則，才能再新增。',
    errPrefsNote: '無法儲存筆記，你寫的內容仍然保留。請再試一次。',
    askPrefsLine: '答案會依據你的偏好設定',
    askMemoryOff: '記憶已關閉',
    sumPrefsLine: '程度：{level} · 長度：{length}',
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
    document.title = STRINGS[lang].docTitle;
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

// Maps an error from lib/api.js (ApiError, matched by name so this file need not import it) to a message key.
export function apiErrorKey(err) {
  const code = err?.name === 'ApiError' ? err.code : null;
  const key = `apiErr_${code}`;
  return code && key in STRINGS.en ? key : 'apiErr_server_error';
}
