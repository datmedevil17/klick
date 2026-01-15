import type { Metadata } from 'next'
import { Geist, Geist_Mono, Share_Tech_Mono, Play } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import AppWalletProvider from '@/components/AppWalletProvider'
import { WalletConnectButton } from '@/components/wallet-connect-button'
import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'

const geist = Geist({ subsets: ["latin"], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: '--font-mono-fallback' });
const shareTechMono = Share_Tech_Mono({ weight: "400", subsets: ["latin"], variable: '--font-share-tech-mono' });
const play = Play({ weight: "700", subsets: ["latin"], variable: '--font-play' });

export const metadata: Metadata = {
  title: '3D Keyboard Chat',
  description: 'Interactive 3D keyboard chat interface',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} ${shareTechMono.variable} ${play.variable} antialiased font-sans`}>
        <AppWalletProvider>
          {children}
          <WalletConnectButton />
        </AppWalletProvider>
        <Analytics />
      </body>
    </html>
  )
}
