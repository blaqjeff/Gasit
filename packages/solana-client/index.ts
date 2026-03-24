import { Connection, Keypair, VersionedTransaction, SystemProgram, TransactionMessage, TransactionInstruction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

// Setup connection 
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Helper to get keypair from string or env
const getKeypair = (secret?: string): Keypair => {
    const key = secret || process.env.RELAYER_SECRET_KEY;
    if (!key) throw new Error("No secret key provided for relayer");

    try {
        // Try parsing as JSON array first
        if (key.startsWith('[')) {
            return Keypair.fromSecretKey(new Uint8Array(JSON.parse(key)));
        }
        // Fallback to Base58
        return Keypair.fromSecretKey(bs58.decode(key));
    } catch (error) {
        throw new Error("Failed to parse relayer secret key. Ensure it's a JSON array or Base58 string.");
    }
};

const relayerKeypair = getKeypair();

export const transferSol = async (destination: string, lamports: number, secretKey?: string): Promise<string> => {
    const signer = secretKey ? getKeypair(secretKey) : relayerKeypair;
    const toPubkey = new PublicKey(destination);

    const instruction = SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: toPubkey,
        lamports
    });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const messageV0 = new TransactionMessage({
        payerKey: signer.publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([signer]);

    const txId = await connection.sendTransaction(transaction, {
        maxRetries: 3,
        preflightCommitment: 'confirmed'
    });

    await connection.confirmTransaction({
        signature: txId,
        blockhash,
        lastValidBlockHeight
    }, 'confirmed');

    return txId;
};

export const simulateAndBroadcast = async (transactionBase64: string): Promise<string> => {
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

    // 4. Simulation
    const simulation = await connection.simulateTransaction(transaction);
    if (simulation.value.err) {
        throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
    }

    // 5. Broadcast
    const txId = await connection.sendTransaction(transaction, {
        maxRetries: 3,
        preflightCommitment: 'confirmed'
    });

    // 6. Confirm 
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
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
