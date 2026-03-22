'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

import { ThemeProvider } from 'next-themes';

interface Props {
    children: ReactNode;
}

export const WalletContextProvider: FC<Props> = ({ children }) => {
    const network = 'mainnet-beta'; // Can be adjusted as needed
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            // Add wallet adapters here
        ],
        [network]
    );

    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={wallets} autoConnect>
                    <WalletModalProvider>{children}</WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
        </ThemeProvider>
    );
};
