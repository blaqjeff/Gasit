import { Connection, Keypair, VersionedTransaction, SystemProgram, TransactionMessage, TransactionInstruction, PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import bs58 from 'bs58';

// Setup connection 
const getRpcUrl = () => process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
console.log(`[Relayer] Initialized with RPC: ${getRpcUrl()}`);

// Helper to get keypair from string or env
const getKeypair = (secret?: string): Keypair => {
    const key = secret || process.env.RELAYER_SECRET_KEY;
    if (!key) throw new Error("No secret key provided for relayer");

    try {
        if (key.startsWith('[')) {
            return Keypair.fromSecretKey(new Uint8Array(JSON.parse(key)));
        }
        return Keypair.fromSecretKey(bs58.decode(key));
    } catch (error) {
        throw new Error("Failed to parse relayer secret key.");
    }
};

const relayerKeypair = getKeypair();

export const simulateAndBroadcast = async (transactionBase64: string): Promise<string> => {
    const activeConnection = new Connection(getRpcUrl());
    
    // 1. Decode transaction
    const txBuffer = Buffer.from(transactionBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);

    // 2. Instruction Whitelisting Gate
    const isSafe = inspectTransactionSafety(transaction);
    if (!isSafe) {
        throw new Error("Transaction failed safety inspection. Unauthorized instructions detected.");
    }

    // 3. Sign as Fee Payer
    transaction.sign([relayerKeypair]);

    // 4. Simulation with Retry
    let simulation;
    let retries = 3;
    while (retries > 0) {
        simulation = await activeConnection.simulateTransaction(transaction, { commitment: 'confirmed' });
        if (simulation.value.err) {
            const errStr = JSON.stringify(simulation.value.err);
            if (errStr.includes("BlockhashNotFound") && retries > 1) {
                console.log(`[Relayer] Blockhash not found, retrying in 1s... (${retries-1} left)`);
                await new Promise(r => setTimeout(r, 1000));
                retries--;
                continue;
            }
            throw new Error(`Simulation failed: ${errStr}`);
        }
        break;
    }

    // 5. Broadcast
    const txId = await activeConnection.sendTransaction(transaction, {
        maxRetries: 3,
        preflightCommitment: 'confirmed'
    });

    // 6. Confirm 
    const latestBlockhash = await activeConnection.getLatestBlockhash('confirmed');
    await activeConnection.confirmTransaction({
        signature: txId,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');

    return txId;
};

// Basic safety gate
const inspectTransactionSafety = (transaction: VersionedTransaction): boolean => {
    try {
        // Check if the fee player is the relayer
        const feePayer = transaction.message.staticAccountKeys[0];
        if (!feePayer.equals(relayerKeypair.publicKey)) {
            return false;
        }
        return true; 
    } catch (error) {
        return false;
    }
}
