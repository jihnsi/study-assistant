import { Newsreader, Instrument_Sans, Noto_Serif_TC, Noto_Sans_TC } from 'next/font/google';
import { LanguageProvider } from '../lib/i18n';
import './globals.css';

// Latin: Newsreader (a text serif with an optical-size axis, used for display) and
// Instrument Sans (UI). Chinese: Noto Serif TC and Noto Sans TC as their counterparts.
// The CJK families are split into many unicode-range slices by Google Fonts, so
// preload is off: the browser only fetches the slices a page actually uses.
const serifLatin = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-serif-latin',
  display: 'swap',
});
const sansLatin = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans-latin',
  display: 'swap',
});
const serifCjk = Noto_Serif_TC({
  weight: ['400', '600', '700'],
  variable: '--font-serif-cjk',
  display: 'swap',
  preload: false,
});
const sansCjk = Noto_Sans_TC({
  weight: ['400', '500', '700'],
  variable: '--font-sans-cjk',
  display: 'swap',
  preload: false,
});

export const metadata = {
  title: 'Margin: study from your own notes',
  description:
    'Upload your lecture notes as a PDF. Margin summarises them and answers your questions, naming the page each answer comes from.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f9fc' },
    { media: '(prefers-color-scheme: dark)', color: '#10141b' },
  ],
};

export default function RootLayout({ children }) {
  const fonts = [serifLatin, sansLatin, serifCjk, sansCjk].map((f) => f.variable).join(' ');
  return (
    <html lang="en" className={fonts}>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
