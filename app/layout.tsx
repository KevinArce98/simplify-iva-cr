import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Montserrat } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Simplify IVA CR',
  description: 'Cálculo mensual de IVA para profesionales independientes en Costa Rica',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Simplify IVA CR',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#D97706',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${montserrat.variable} antialiased font-sans`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
