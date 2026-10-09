import { Archivo } from 'next/font/google';
import { LanguageProvider } from '../lib/i18n';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });

export const metadata = {
  title: 'Study Assistant',
  description: 'Upload your course notes and study from them.',
};

export const viewport = {
  themeColor: '#1a3c8e',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
