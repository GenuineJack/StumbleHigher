import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { Web3Provider } from '@/providers/Web3Provider';
import { ToastProvider } from '@/providers/ToastProvider';
import { AnalyticsProvider } from '@/providers/AnalyticsProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stumble Higher',
  description: 'Press one button. Discover the web. A Web3-native content discovery platform.',
  keywords: 'content discovery, web3, curation, stumbleupon, higher, farcaster',
  authors: [{ name: 'Higher Market' }],
  creator: 'Higher Market',
  openGraph: {
    type: 'website',
    title: 'Stumble Higher',
    description: 'Press one button. Discover the web.',
    images: [
      {
        url: 'https://images.squarespace-cdn.com/content/v1/67ad421520b6ba3d357c8fd1/a681b2d2-59b0-4953-a7f3-bdbebc6b7ba6/stumble-higher-miniapp-image.png',
        width: 1200,
        height: 630,
        alt: 'Stumble Higher',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stumble Higher',
    description: 'Press one button. Discover the web.',
    images: [
      'https://images.squarespace-cdn.com/content/v1/67ad421520b6ba3d357c8fd1/a681b2d2-59b0-4953-a7f3-bdbebc6b7ba6/stumble-higher-miniapp-image.png',
    ],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: '#FF6D0E',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Farcaster Frame meta tags */}
        <meta property="fc:frame" content='{"version": "next", "imageUrl": "https://i.imgur.com/CIzWvqk.png", "button": {"title": "Start Stumbling", "action": {"type": "launch_frame", "name": "Stumble Higher", "url": "https://www.stumblehigher.press/frame", "splashImageUrl": "https://i.imgur.com/CIzWvqk.png", "splashBackgroundColor": "#141414"}}}' />

        {/* Additional frame compatibility */}
        <meta name="frame:version" content="next" />
        <meta name="frame:image" content="https://i.imgur.com/CIzWvqk.png" />
        <meta name="frame:button:1" content="Start Stumbling" />
        <meta name="frame:button:1:action" content="link" />
        <meta name="frame:button:1:target" content="https://www.stumblehigher.press/frame" />

        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Analytics */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'GA_MEASUREMENT_ID');
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-zinc-900 text-white antialiased`}>
        <AnalyticsProvider>
          <Web3Provider>
            <AuthProvider>
              <ToastProvider>
                <div className="min-h-screen flex flex-col">
                  {children}
                </div>
              </ToastProvider>
            </AuthProvider>
          </Web3Provider>
        </AnalyticsProvider>

        {/* Farcaster SDK */}
        <script
          src="https://cdn.jsdelivr.net/npm/@farcaster/frame-sdk/dist/index.min.js"
          async
        />

        {/* Initialize Farcaster */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function() {
                if (window.frame?.sdk?.actions?.ready) {
                  frame.sdk.actions.ready();
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
