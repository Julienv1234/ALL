import type { Metadata, Viewport } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/600.css';
import './globals.css';
import Rail from '@/components/Rail';
import Toasts from '@/components/Toasts';
import ClientBoot from '@/components/ClientBoot';

export const metadata: Metadata = {
  title: 'ALL',
  description: 'Jouw persoonlijke thuisbasis.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/apple-icon.png' },
  appleWebApp: { capable: true, title: 'ALL', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#07060f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <div className="city">
          <Rail />
          {children}
        </div>
        <Toasts />
        <ClientBoot />
      </body>
    </html>
  );
}
