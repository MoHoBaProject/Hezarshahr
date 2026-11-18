import './globals.css';
import PwaRegister from '../components/PwaRegister';

export const metadata = {
  title: 'هزارشهر | Hezarshahr',
  description: 'هزارشهر: بازی سه‌بعدی ساخت شهر روی کره‌ی زمین',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'هزارشهر', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#16231b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
