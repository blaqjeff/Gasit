import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { TopNavBar } from '@/components/TopNavBar';
import { BottomNavBar } from '@/components/BottomNavBar';
import { WalletContextProvider } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Gasit - Automated Solana Gas Relayer',
  description: 'Stop worrying about SOL. Just Gasit. Automated liquidity management for the Solana ecosystem.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} bg-background text-on-surface font-sans antialiased min-h-screen pb-24 md:pb-0`}>
        <WalletContextProvider>
          <TopNavBar />
          {children}
          <BottomNavBar />
        </WalletContextProvider>
      </body>
    </html>
  );
}
