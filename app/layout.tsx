import type { Metadata } from 'next';
import './globals.css';
import { PixelTrailBackground } from '@/components/ui/pixel-trail-background';
import { AppPrivyProvider } from '@/components/providers/privy-provider';

export const metadata: Metadata = {
  title: 'memos — A Persistent Brain for AI Agents',
  description:
    'memos gives AI agents persistent memory across sessions. Remember, Dream, Reason, Grow, Sync — all powered by 0G infrastructure.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppPrivyProvider>
          <PixelTrailBackground />
          <div className="relative z-10">{children}</div>
        </AppPrivyProvider>
      </body>
    </html>
  );
}

