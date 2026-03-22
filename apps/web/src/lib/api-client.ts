import { Connection, PublicKey } from '@solana/web3.js';
import { SOL_MINT } from './jupiter';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UserDTO {
    walletAddress: string;
    nairaBalance: number;
}

export interface DepositDTO {
    id: string;
    amountNaira: number;
    paystackReference: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
}

export interface TransactionDTO {
    id: string;
    signature: string;
    type: string;
    feeNaira: number;
    status: string;
    createdAt: string;
}

export interface AssetDTO {
    mint: string;
    symbol: string;
    name: string;
    logoURI: string;
    balance: number;
    decimals: number;
    priceUsd: number;
    valueUsd: number;
}

export const verifyPaystackPayment = async (reference: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE_URL}/webhooks/paystack/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification failed');
    return data;
};

export const fetchUserBalance = async (walletAddress: string): Promise<UserDTO | null> => {
    try {
        const res = await fetch(`${API_BASE_URL}/users/${walletAddress}`);
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error('Error fetching user balance:', error);
        return null;
    }
};

export const executeRelay = async (walletAddress: string, transactionBase64: string): Promise<{ success: boolean; txId?: string; error?: string }> => {
    try {
        const res = await fetch(`${API_BASE_URL}/relay/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userWallet: walletAddress, transactionBase64 })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            return { success: false, error: data.error || 'Relay failed' };
        }
        
        return { success: true, txId: data.txId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const fetchUserDeposits = async (walletAddress: string): Promise<DepositDTO[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/history/${walletAddress}/deposits`);
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error('Error fetching deposits:', error);
        return [];
    }
};

export const fetchUserTransactions = async (walletAddress: string): Promise<TransactionDTO[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/history/${walletAddress}/transactions`);
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
};

export const fetchUserAssets = async (walletAddress: string): Promise<AssetDTO[]> => {
    try {
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
        const pubkey = new PublicKey(walletAddress);

        // 1. Fetch SOL Balance
        const solLamports = await connection.getBalance(pubkey);
        const solBalance = solLamports / 1e9;

        // 2. Fetch Token Accounts (Standard + Token-2022)
        // Note: Wrap in individual try-catches as some RPC nodes don't support Token-2022 or may fail on specific filters
        let tokenAccounts: any = { value: [] };
        let token2022Accounts: any = { value: [] };

        try {
            tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
                programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
            });
        } catch (e) {
            console.warn('Standard SPL token fetch failed:', e);
        }

        try {
            token2022Accounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
                programId: new PublicKey('TokenzQdBNZqbbYx2EJQ3Dgcs9shP2B555MNo8QJ7P4')
            });
        } catch (e) {
            console.warn('Token-2022 fetch failed (might be unsupported by RPC):', e);
        }

        const assets: AssetDTO[] = [];

        // Add SOL as first asset
        assets.push({
            mint: SOL_MINT,
            symbol: 'SOL',
            name: 'Solana',
            logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
            balance: solBalance,
            decimals: 9,
            priceUsd: 0,
            valueUsd: 0
        });

        // Helper to process accounts
        const processAccounts = (accounts: any[]) => {
            for (const account of accounts) {
                const info = account.account.data.parsed.info;
                const balance = info.tokenAmount.uiAmount;
                if (balance > 0) {
                    assets.push({
                        mint: info.mint,
                        symbol: 'TOKEN',
                        name: 'Unknown Token',
                        logoURI: '',
                        balance: balance,
                        decimals: info.tokenAmount.decimals,
                        priceUsd: 0,
                        valueUsd: 0
                    });
                }
            }
        };

        processAccounts(tokenAccounts.value);
        processAccounts(token2022Accounts.value);

        // 3. Fetch Metadata and Prices for all found mints
        if (assets.length > 0) {
            const mints = assets.map(a => a.mint).join(',');
            
            // Parallel fetch metadata and prices
            const [metaRes, priceRes] = await Promise.all([
                fetch(`/api/jupiter/tokens?mints=${mints}`),
                fetch(`/api/jupiter/price?ids=${mints}`)
            ]);

            const [metaData, priceData] = await Promise.all([
                metaRes.ok ? metaRes.json() : null,
                priceRes.ok ? priceRes.json() : null
            ]);

            // Map results back to assets
            assets.forEach(asset => {
                if (metaData) {
                    const meta = metaData.find((m: any) => m.address === asset.mint);
                    if (meta) {
                        asset.symbol = meta.symbol;
                        asset.name = meta.name;
                        asset.logoURI = meta.logoURI;
                    }
                }
                if (priceData?.data?.[asset.mint]) {
                    asset.priceUsd = parseFloat(priceData.data[asset.mint].price);
                    asset.valueUsd = asset.balance * asset.priceUsd;
                }
            });
        }

        // Sort by value descending
        return assets.sort((a, b) => b.valueUsd - a.valueUsd);

    } catch (error) {
        console.error('Error fetching assets:', error);
        return [];
    }
};
