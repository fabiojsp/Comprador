import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ui = Instrument_Sans({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
const ticket = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-ticket', display: 'swap' });

export const metadata: Metadata = {
  title: 'Cesta Mallorca',
  description: 'Tu compra de supermercado en Mallorca, comparada con el envío incluido.',
  applicationName: 'Cesta',
  appleWebApp: { capable: true, title: 'Cesta', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f1e7' },
    { media: '(prefers-color-scheme: dark)', color: '#171a18' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${ui.variable} ${ticket.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
