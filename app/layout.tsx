import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// "backend-free", not "offline-friendly": there is no service worker and no
// manifest, so the app does not load without a network. Client-side is not offline.
const SITE_DESCRIPTION =
  'A fast, backend-free grocery list app. Demo build — your lists live in this browser tab only.';

// og:image must be an absolute URL or crawlers drop it, and the file-convention
// images below are declared as relative paths. metadataBase is what makes them
// absolute, so it has to be the canonical host this demo is actually shared from
// — hardcoded, because a demo with no backend has no environment to read it from.
const SITE_URL = 'https://simple-grocery-list-demo.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Simple Grocery List',
    template: '%s · Simple Grocery List',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'Simple Grocery List',
  authors: [{ name: 'Felipe SQ', url: 'https://www.felipesq.dev' }],
  icons: { icon: '/favicon.png', apple: '/icon.png' },
  openGraph: {
    title: 'Simple Grocery List',
    description: SITE_DESCRIPTION,
    type: 'website',
    siteName: 'Simple Grocery List',
  },
  twitter: { card: 'summary_large_image', title: 'Simple Grocery List', description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  // The add-item bar sits above the keyboard on mobile; let the viewport resize.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Providers>
          {children}
          {/* Offset clears the demo notice banner, which occupies the top strip. */}
          <Toaster position="top-center" offset="72px" />
        </Providers>
      </body>
    </html>
  );
}
