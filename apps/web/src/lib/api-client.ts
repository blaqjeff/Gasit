const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UserDTO {
    walletAddress: string;
    nairaBalance: number;
}

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
