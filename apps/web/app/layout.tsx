import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

// Shown in link previews (Discord/Twitter embeds) and search results.
const DESCRIPTION =
  'The all-in-one Discord bot. Moderation, leveling, economy, giveaways and more — set up in minutes from a clean web dashboard.';

export const metadata: Metadata = {
  metadataBase: new URL('https://solari.gg'),
  title: {
    default: 'Solari — Discord Control Panel',
    template: '%s · Solari',
  },
  description: DESCRIPTION,
  applicationName: 'Solari',
  // Single source of truth for the favicon: drop the galaxy logo at
  // apps/web/public/solari-logo.png and it serves every icon slot below.
  icons: {
    icon: '/solari-logo.png',
    shortcut: '/solari-logo.png',
    apple: '/solari-logo.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Solari',
    title: 'Solari — Discord Control Panel',
    description: DESCRIPTION,
    url: 'https://solari.gg',
    images: [{ url: '/solari-logo.png', width: 512, height: 512, alt: 'Solari' }],
  },
  twitter: {
    card: 'summary',
    title: 'Solari — Discord Control Panel',
    description: DESCRIPTION,
    images: ['/solari-logo.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
