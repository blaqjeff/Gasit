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
  VersionedTransaction 
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
  const [feeSol, setFeeSol] = useState<number | null>(null);
  const [relayerPubKey, setRelayerPubKey] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenAsset[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Initialize
  useEffect(() => {
    // 1. Fetch dynamic fee
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/relay/fee?type=transfer`)
      .then(res => res.json())
      .then(data => {
        setDynamicFee(data.feeNaira);
        setFeeSol(data.feeSol);
      })
      .catch(err => console.error("Failed to fetch transfer fee", err));

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
      const { blockhash } = await connection.getLatestBlockhash('confirmed');

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

      alert(`✅ Transfer executed gaslessly!\n\nCheck signature: ${data.txId}`);
      router.push('/dashboard');

    } catch (err: any) {
      console.error(err);
      alert('Error during gasless transfer: ' + err.message);
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
                    <div className="text-on-surface font-bold line-through opacity-50">
                      {feeSol !== null ? `~${feeSol.toFixed(7)} SOL` : "..."}
                    </div>
                    <div className="text-primary font-bold text-[10px] uppercase">Gasless Sponsored</div>
                  </div>
                </div>
                
                <div className="h-px bg-outline-variant/30" />

                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-outline uppercase tracking-widest">Automated Relayer Fee</span>
                  <div className="text-right">
                    <span className="text-primary font-extrabold text-sm">
                      {dynamicFee !== null ? `₦${dynamicFee.toLocaleString()}` : "Calculating..."}
                    </span>
                    <p className="text-[9px] text-outline-variant mt-1 uppercase">Deducted from Dashboard Balance</p>
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
                    {!connected ? "Connect Wallet to Dispatch" : isTransferring ? "Broadcasting..." : "Initiate Gasless Transfer"}
                  </span>
                </div>
                {/* Button Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </button>
              
              {!connected && (
                <p className="text-center text-[10px] font-mono text-error uppercase tracking-widest">
                  Wallet connection required to access relayer
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
