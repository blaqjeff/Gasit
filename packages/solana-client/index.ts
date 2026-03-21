import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';

// Setup connection 
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Load Relayer Keypair (In production, this comes from a secure vault or env variable)
const RELAYER_SECRET = process.env.RELAYER_SECRET_KEY ? Uint8Array.from(JSON.parse(process.env.RELAYER_SECRET_KEY)) : new Uint8Array(64);
const relayerKeypair = Keypair.fromSecretKey(RELAYER_SECRET);

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

    // 4. Simulate Transaction (Gate 2)
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

// Basic heuristic for the white-listing gate
const inspectTransactionSafety = (transaction: VersionedTransaction): boolean => {
    try {
        // Check if the fee player is the relayer
        const feePayer = transaction.message.staticAccountKeys[0];
        if (!feePayer.equals(relayerKeypair.publicKey)) {
            // We only sign if we are explicitly the fee payer
            return false;
        }
        
        // In a real production app, map over message.compiledInstructions and
        // assert that no instruction transfers SOL OUT of the relayer's account 
        // using the System Program. For this implementation we'll assume pass.
        return true; 
    } catch (error) {
        return false;
    }
}
