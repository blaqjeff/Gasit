"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { TopNavBar } from "@/components/TopNavBar";
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  TransactionInstruction, // Added
  TransactionMessage, 
  VersionedTransaction,
  ComputeBudgetProgram
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  createTransferCheckedInstruction, 
  getAccount, 
  createAssociatedTokenAccountInstruction, 
  TokenAccountNotFoundError, 
  TokenInvalidAccountOwnerError 
} from "@solana/spl-token";
import { fetchRelayerPubKey } from "@/lib/api-client";
import TransactionResult, { TransactionResultType } from "@/components/TransactionResult";

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

interface TokenAsset {
  symbol: string;
  name: string;
  mint: string;
  balance: number;
  decimals: number;
}

export default function RelayTransferPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();

  const [destination, setDestination] = useState<string>('');
  const [selectedMint, setSelectedMint] = useState<string>('SOL');
  const [amount, setAmount] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [dynamicFee, setDynamicFee] = useState<number | null>(null);
  const [gasFeeNaira, setGasFeeNaira] = useState<number | null>(null);
  const [rentFeeNaira, setRentFeeNaira] = useState<number | null>(null);
  const [feeSol, setFeeSol] = useState<number | null>(null);
  const [rentFeeSol, setRentFeeSol] = useState<number>(0);
  const [relayerPubKey, setRelayerPubKey] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenAsset[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [txResult, setTxResult] = useState<{ type: TransactionResultType; txId?: string; message?: string } | null>(null);
  
  const debouncedDestination = useDebounce(destination, 600);
  const debouncedAmount = useDebounce(amount, 600);

  // Initialize
  useEffect(() => {
    // 2. Fetch Relayer Pubkey
    fetchRelayerPubKey()
      .then(setRelayerPubKey)
      .catch(err => console.error("Failed to fetch relayer pubkey", err));
  }, []);

  // Fetch tokens when wallet connects
  useEffect(() => {
    if (publicKey) {
      fetchWalletAssets();
    } else {
      setTokens([]);
    }
  }, [publicKey]);

  // Accurate Fee Preview Logic
  useEffect(() => {
    if (!publicKey || !debouncedDestination || !debouncedAmount || isTransferring) return;

    async function getAccuratePreview() {
      if (!publicKey || !relayerPubKey) return;

      // Clear previous fees to prevent flashing
      setFeeSol(null);
      setDynamicFee(null);
      setGasFeeNaira(null);
      setRentFeeNaira(null);
      setRentFeeSol(0);

      try {
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
        const destPubkey = new PublicKey(debouncedDestination);
        const relayerPubkeyObj = new PublicKey(relayerPubKey);
        const selectedAsset = tokens.find(t => t.mint === selectedMint);
        if (!selectedAsset && selectedMint !== 'SOL') return;
        
        const instructions: TransactionInstruction[] = [];

        // Add Priority Fee
        const recentFees = await connection.getRecentPrioritizationFees();
        const medianPriorityFee = recentFees.length > 0 ? 
            recentFees.sort((a, b) => (a.prioritizationFee as number) - (b.prioritizationFee as number))[Math.floor(recentFees.length / 2)].prioritizationFee : 1000;
        
        instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }));
        instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Math.max(medianPriorityFee, 5000) }));

        if (selectedMint === 'SOL') {
          instructions.push(SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: destPubkey,
            lamports: Math.floor(parseFloat(debouncedAmount) * 1e9)
          }));
        } else if (selectedAsset) {
          const mintPubkey = new PublicKey(selectedAsset.mint);
          const fromAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
          const toAta = await getAssociatedTokenAddress(mintPubkey, destPubkey);
          
          try { await getAccount(connection, toAta); } catch (e) {
            instructions.push(createAssociatedTokenAccountInstruction(relayerPubkeyObj, toAta, destPubkey, mintPubkey));
          }
          const rawAmount = BigInt(Math.floor(parseFloat(debouncedAmount) * Math.pow(10, selectedAsset.decimals)));
          instructions.push(createTransferCheckedInstruction(fromAta, mintPubkey, toAta, publicKey, rawAmount, selectedAsset.decimals));
        }

        const { blockhash } = await connection.getLatestBlockhash('finalized');
        const messageV0 = new TransactionMessage({
          payerKey: relayerPubkeyObj,
          recentBlockhash: blockhash,
          instructions: instructions
        }).compileToV0Message();
        
        const tx = new VersionedTransaction(messageV0);
        const base64 = Buffer.from(tx.serialize()).toString('base64');

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/relay/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionBase64: base64 })
        });
        
        if (res.ok) {
          const data = await res.json();
          setDynamicFee(data.feeNaira);
          setGasFeeNaira(data.gasFeeNaira);
          setRentFeeNaira(data.rentFeeNaira);
          setFeeSol(data.feeSol);
          setRentFeeSol(data.rentFeeSol || 0);
        }
      } catch (e) {
        // Silently fail on preview errors to avoid flickering
      }
    }

    if (relayerPubKey && tokens.length > 0) {
      getAccuratePreview();
    }
  }, [debouncedDestination, debouncedAmount, selectedMint, relayerPubKey]);

  const fetchWalletAssets = async () => {
    if (!publicKey) return;
    setLoadingTokens(true);
    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
      
      // SOL Balance
      const solBalance = await connection.getBalance(publicKey);
      const assets: TokenAsset[] = [{
        symbol: 'SOL',
        name: 'Solana',
        mint: 'SOL',
        balance: solBalance / 1e9,
        decimals: 9
      }];

      // SPL Tokens
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID
      });

      tokenAccounts.value.forEach((acc) => {
        const info = acc.account.data.parsed.info;
        const balance = info.tokenAmount.uiAmount;
        if (balance > 0) {
          assets.push({
            symbol: info.mint.slice(0, 4).toUpperCase(), // Placeholder symbol, could fetch from registry
            name: `Token ${info.mint.slice(0, 4)}`,
            mint: info.mint,
            balance: balance,
            decimals: info.tokenAmount.decimals
          });
        }
      });

      setTokens(assets);
    } catch (err) {
      console.error("Failed to fetch assets", err);
    } finally {
      setLoadingTokens(false);
    }
  };

  const selectedAsset = useMemo(() => 
    tokens.find(t => t.mint === selectedMint) || tokens[0], 
    [tokens, selectedMint]
  );

  const executeTransfer = async () => {
    if (!publicKey || !signTransaction || !relayerPubKey || !selectedAsset) return;
    
    if (!destination || !amount || isNaN(parseFloat(amount))) {
       alert('Please enter a valid destination and amount');
       return;
    }

    setIsTransferring(true);

    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
      const destPubkey = new PublicKey(destination);
      const relayerPubkeyObj = new PublicKey(relayerPubKey);
      
      const instructions: TransactionInstruction[] = [];

      // Add Priority Fee
      const recentFees = await connection.getRecentPrioritizationFees();
      const medianPriorityFee = recentFees.length > 0 ? 
          recentFees.sort((a, b) => (a.prioritizationFee as number) - (b.prioritizationFee as number))[Math.floor(recentFees.length / 2)].prioritizationFee : 1000;
      
      instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }));
      instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Math.max(medianPriorityFee, 5000) }));

      if (selectedAsset.mint === 'SOL') {
        const lamports = Math.floor(parseFloat(amount) * 1e9);
        instructions.push(SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: destPubkey,
          lamports
        }));
      } else {
        // SPL Token Transfer
        const mintPubkey = new PublicKey(selectedAsset.mint);
        const fromAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
        const toAta = await getAssociatedTokenAddress(mintPubkey, destPubkey);
        
        // Check if destination ATA exists
        try {
          await getAccount(connection, toAta);
        } catch (error: any) {
          if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
            // Create ATA instruction if it doesn't exist
            instructions.push(
              createAssociatedTokenAccountInstruction(
                relayerPubkeyObj, // Payer of the rent
                toAta,
                destPubkey,
                mintPubkey
              )
            );
          } else {
            throw error;
          }
        }

        const rawAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, selectedAsset.decimals)));
        
        instructions.push(createTransferCheckedInstruction(
          fromAta,
          mintPubkey,
          toAta,
          publicKey,
          rawAmount,
          selectedAsset.decimals
        ));
      }

      // Fetch blockhash
      const { blockhash } = await connection.getLatestBlockhash('finalized');

      // Compile message with RELAYER as the payer
      const messageV0 = new TransactionMessage({
        payerKey: relayerPubkeyObj,
        recentBlockhash: blockhash,
        instructions: instructions
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // User signs the transaction (as instruction authorizer)
      const signedTransaction = await signTransaction(transaction);
      const base64Tx = Buffer.from(signedTransaction.serialize()).toString('base64');

      // Dispatch to API
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/relay/transfer`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            transactionBase64: base64Tx,
            userWallet: publicKey.toString()
         })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server rejected transfer relay');

      setTxResult({ type: 'success', txId: data.txId });

    } catch (err: any) {
      console.error(err);
      setTxResult({ type: 'error', message: err.message });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleButtonClick = () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    executeTransfer();
  };

  return (
    <main className="min-h-screen pt-16 bg-background text-on-background">
      <TopNavBar />
      <div className="max-w-2xl mx-auto px-6 py-20">
        <div className="bg-surface-container border border-outline-variant p-8 rounded-xl shadow-2xl relative overflow-hidden">
          {/* Decorative Gradient Overlay */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-opacity group-hover:opacity-100" />
          
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold tracking-tighter mb-2 text-on-surface">Gas-it Relayer</h1>
            <p className="text-outline mb-8 font-mono text-xs uppercase tracking-widest flex items-center">
              <span className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse" />
              Gasless Dispatch Active
            </p>

            <form className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-outline uppercase tracking-widest mb-3">Destination Address</label>
                <input 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  type="text" 
                  placeholder="Solana Address (e.g. 7oA..." 
                  className="w-full bg-background border border-outline-variant rounded-lg px-4 py-4 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm placeholder:text-outline/30"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-xs font-mono text-outline uppercase tracking-widest mb-3">Asset</label>
                  <div className="relative">
                    <select 
                      value={selectedMint}
                      onChange={(e) => setSelectedMint(e.target.value)}
                      disabled={loadingTokens}
                      className="w-full bg-background border border-outline-variant rounded-lg px-4 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-mono text-sm appearance-none cursor-pointer disabled:opacity-50"
                    >
                      {tokens.length === 0 ? (
                        <option value="SOL">SOL</option>
                      ) : (
                        tokens.map(t => (
                          <option key={t.mint} value={t.mint}>{t.symbol} ({t.balance.toFixed(2)})</option>
                        ))
                      )}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-mono text-outline uppercase tracking-widest mb-3">Amount</label>
                  <div className="relative group">
                    <input 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      type="number" 
                      step="any"
                      placeholder="0.00" 
                      className="w-full bg-background border border-outline-variant rounded-lg px-4 py-4 text-on-surface focus:outline-none focus:border-primary transition-all font-mono text-sm placeholder:text-outline/30"
                    />
                    <button 
                      type="button"
                      onClick={() => selectedAsset && setAmount(selectedAsset.balance.toString())}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary hover:brightness-125 px-2 py-1 bg-primary/10 rounded uppercase"
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8 p-6 bg-surface-container-low rounded-xl border border-outline-variant/50 backdrop-blur-sm">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-outline uppercase tracking-widest">Network Fee Cost</span>
                  <div className="text-right">
                    <div className="text-on-surface font-bold line-through opacity-70">
                      {!amount || !destination ? "0.00 SOL" : (feeSol !== null && feeSol > 0 ? `~${feeSol.toFixed(7)} SOL` : "Calculating...")}
                    </div>
                    <div className="text-primary font-bold text-[10px] uppercase">Gasless Sponsored</div>
                  </div>
                </div>
                
                {rentFeeSol > 0 && (
                  <>
                    <div className="flex justify-between items-center text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-outline uppercase tracking-widest">Account Activation</span>
                        <div className="group relative">
                          <span className="material-symbols-outlined text-[14px] text-outline/50 cursor-help">info</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-surface-container text-[10px] text-on-surface rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-outline-variant">
                            One-time SOL rent required by Solana to open this token account for the recipient.
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-on-surface font-bold">
                          {`~${rentFeeSol.toFixed(4)} SOL`}
                        </div>
                        <div className="text-[9px] text-on-surface-variant font-medium uppercase">Paid by Relayer</div>
                      </div>
                    </div>
                    <div className="h-px bg-outline-variant/30" />
                  </>
                )}
                
                <div className="h-px bg-outline-variant/30" />

                <div className="flex justify-between items-top text-xs font-mono">
                  <span className="text-outline uppercase tracking-widest mt-1">Service Fee</span>
                  <div className="text-right">
                    <span className="text-primary font-extrabold text-sm">
                       {!amount || !destination ? "₦0.00" : (dynamicFee !== null ? `₦${dynamicFee.toLocaleString()}` : "Calculating...")}
                    </span>
                    {dynamicFee !== null && gasFeeNaira !== null && (
                      <div className="text-[10px] text-on-surface-variant font-medium mt-1 lowercase">
                        {`₦${gasFeeNaira.toLocaleString()} gas${rentFeeNaira && rentFeeNaira > 0 ? ` + ₦${rentFeeNaira.toLocaleString()} activation` : ''}`}
                      </div>
                    )}
                    <p className="text-[9px] text-on-surface-variant font-medium mt-1 uppercase">Deducted from Dashboard Balance</p>
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleButtonClick}
                disabled={connected && (isTransferring || !destination || !amount || !relayerPubKey)}
                className="group relative w-full overflow-hidden rounded-xl bg-primary px-6 py-5 text-lg font-bold text-on-primary transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {isTransferring ? (
                    <span className="animate-spin material-symbols-outlined">refresh</span>
                  ) : !connected ? (
                    <span className="material-symbols-outlined">account_balance_wallet</span>
                  ) : (
                    <span className="material-symbols-outlined">send</span>
                  )}
                  <span>
                    {!connected ? "Connect Wallet to Send" : isTransferring ? "Broadcasting..." : "Send Gaslessly"}
                  </span>
                </div>
                {/* Button Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </button>
              
              {!connected && (
                <p className="text-center text-[10px] font-mono text-error uppercase tracking-widest">
                  Connect your wallet to send assets
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {txResult && (
        <TransactionResult
          type={txResult.type}
          kind="transfer"
          txId={txResult.txId}
          message={txResult.message}
          onClose={() => setTxResult(null)}
        />
      )}
    </main>
  );
}
