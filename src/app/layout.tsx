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
import AuthGate from '@/components/AuthGate';
import TimerWatch from '@/components/TimerWatch';
import RuleRunner from '@/components/RuleRunner';
import ReminderWatch from '@/components/ReminderWatch';
import CommandK from '@/components/CommandK';
import Tour from '@/components/Tour';

export const metadata: Metadata = {
  title: 'ALL',
  description: 'Jouw persoonlijke thuisbasis.',
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/apple-icon.png' },
  appleWebApp: { capable: true, title: 'ALL', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#07060f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <div className="city">
          <AuthGate>
            <Rail />
            {children}
            <TimerWatch />
            <RuleRunner />
            <ReminderWatch />
            <CommandK />
            <Tour />
          </AuthGate>
        </div>
        <Toasts />
        <ClientBoot />
      </body>
    </html>
  );
}
