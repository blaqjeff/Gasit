"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { VersionedTransaction } from "@solana/web3.js";
import { TopNavBar } from "@/components/TopNavBar";
import { getJupiterQuote, getJupiterSwapTx, QuoteResponse, SOL_MINT, USDC_MINT } from "@/lib/jupiter";
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

export default function SwapPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();

  const [inputMint, setInputMint] = useState(USDC_MINT);
  const [outputMint, setOutputMint] = useState(SOL_MINT);
  const [inputAmount, setInputAmount] = useState<string>('');
  const debouncedInput = useDebounce(inputAmount, 600);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [dynamicFee, setDynamicFee] = useState<number | null>(null);
  const [gasFeeNaira, setGasFeeNaira] = useState<number | null>(null);
  const [rentFeeNaira, setRentFeeNaira] = useState<number | null>(null);
  const [feeSol, setFeeSol] = useState<number | null>(null);
  const [rentFeeSol, setRentFeeSol] = useState<number>(0);
  
  // Slippage settings
  const [slippageBps, setSlippageBps] = useState(50);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customSlippage, setCustomSlippage] = useState<string>('');
  const [txResult, setTxResult] = useState<{ type: TransactionResultType; txId?: string; message?: string } | null>(null);

  useEffect(() => {
    let active = true;

    if (!debouncedInput || parseFloat(debouncedInput) <= 0) {
      setQuote(null);
      setDynamicFee(null);
      return;
    }

    const fetchQuote = async () => {
      setIsQuoting(true);
      // Clear previous fees to prevent flashing
      setDynamicFee(null);
      setFeeSol(null);
      setGasFeeNaira(null);
      setRentFeeNaira(null);
      setRentFeeSol(0);
      // Determine decimals: assume 6 for USDC, 9 for SOL
      const decimals = inputMint === USDC_MINT ? 1e6 : 1e9;
      const amountAsInt = Math.floor(parseFloat(debouncedInput) * decimals);
      
      const q = await getJupiterQuote(inputMint, outputMint, amountAsInt, slippageBps);
      
      if (active) {
        setQuote(q);
        setIsQuoting(false);
        if (q && publicKey) {
           // Fetch accurate gas fee by previewing the swap transaction
           try {
             const swapTx = await getJupiterSwapTx(q, publicKey.toString());
             if (swapTx && active) {
               const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/relay/preview`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ transactionBase64: swapTx })
               });
               if (res.ok && active) {
                 const data = await res.json();
                 setDynamicFee(data.feeNaira);
                 setGasFeeNaira(data.gasFeeNaira);
                 setRentFeeNaira(data.rentFeeNaira);
                 setFeeSol(data.feeSol);
                 setRentFeeSol(data.rentFeeSol || 0);
               }
             }
           } catch (err) {
             console.error("Failed to fetch accurate preview fee", err);
             // Fallback to legacy fee estimation
           }
        } else {
           setDynamicFee(null);
           setFeeSol(null);
        }
      }
    };

    fetchQuote();
    return () => { active = false; };
  }, [debouncedInput, inputMint, outputMint, slippageBps]);

  const outAmountUI = quote 
    ? (parseInt(quote.outAmount) / (outputMint === USDC_MINT ? 1e6 : 1e9)).toFixed(4)
    : '0.00';

  const handleSwap = () => {
    setInputMint(outputMint);
    setOutputMint(inputMint);
    setInputAmount(outAmountUI === '0.00' ? '' : outAmountUI);
  };

  const executeSwap = async () => {
    if (!quote || !publicKey || !signTransaction) return;
    setIsSwapping(true);
    
    try {
      // 1. Get swap transaction from Jupiter
      const swapTransactionBuf = await getJupiterSwapTx(quote, publicKey.toString());
      if (!swapTransactionBuf) throw new Error("Failed to fetch swap transaction from Jupiter.");

      // 2. User signs the transaction
      const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransactionBuf, 'base64'));
      const signedTransaction = await signTransaction(transaction);
      const base64Tx = Buffer.from(signedTransaction.serialize()).toString('base64');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/relay/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionBase64: base64Tx,
          userWallet: publicKey.toString()
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Backend Swap Relay Failed');
      }

      setTxResult({ type: 'success', txId: data.txId });
    } catch (err: any) {
      console.error(err);
      setTxResult({ type: 'error', message: err.message });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleButtonClick = () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    executeSwap();
  };

  return (
    <main className="min-h-screen pt-16 bg-background">
      <TopNavBar />
      <div className="max-w-lg mx-auto px-6 py-20 flex flex-col items-center">
        <h1 className="text-3xl font-extrabold tracking-tighter mb-2 text-on-surface text-center">Gasless Swap</h1>
        <p className="text-outline mb-8 font-mono text-xs uppercase tracking-wider text-center">Powered by Jupiter & Gasit Insti-Relayer</p>

        <div className="w-full bg-surface-container border border-outline-variant p-6 rounded-xl shadow-2xl relative">
          
          {/* Settings Header */}
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-outline">Swap Settings</h2>
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 rounded-lg transition-colors ${isSettingsOpen ? 'bg-primary text-on-primary' : 'text-outline hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-sm">settings</span>
            </button>
          </div>

          {/* Slippage Settings Panel */}
          {isSettingsOpen && (
            <div className="mb-6 p-4 bg-surface-container-high border border-outline-variant rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Slippage Tolerance</span>
                <span className="text-[10px] font-mono text-primary font-bold">{slippageBps / 100}%</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 500].map((v) => (
                  <button
                    key={v}
                    onClick={() => { setSlippageBps(v); setCustomSlippage(''); }}
                    className={`py-2 text-xs font-mono rounded border transition-all ${
                      slippageBps === v && !customSlippage ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant text-outline hover:border-primary'
                    }`}
                  >
                    {v / 100}%
                  </button>
                ))}
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Custom"
                    value={customSlippage}
                    onChange={(e) => {
                      setCustomSlippage(e.target.value);
                      const b = Math.floor(parseFloat(e.target.value) * 100);
                      if (!isNaN(b)) setSlippageBps(b);
                    }}
                    className={`w-full py-2 px-1 text-[10px] font-mono text-center rounded border outline-none transition-all ${
                      customSlippage ? 'bg-primary border-primary text-on-primary placeholder:text-on-primary/50' : 'border-outline-variant bg-surface text-on-surface'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="relative flex flex-col gap-2">
            <div className="mb-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-on-surface-variant">You Pay</label>
                <span className="text-[10px] font-mono text-outline">Bal: 0.00</span>
              </div>
              <div className="flex items-center gap-2 bg-surface border border-outline-variant rounded p-4">
                <select 
                  value={inputMint}
                  onChange={(e) => setInputMint(e.target.value)}
                  className="bg-transparent text-on-surface font-bold outline-none appearance-none cursor-pointer"
                >
                  <option value={USDC_MINT}>USDC</option>
                  <option value={SOL_MINT}>SOL</option>
                </select>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="w-full bg-transparent text-right text-2xl font-mono text-on-surface outline-none"
                />
              </div>
            </div>

            <div className="flex justify-center -my-4 z-10">
              <div 
                onClick={handleSwap}
                className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center cursor-pointer hover:bg-primary hover:text-on-primary transition-all shadow-lg active:scale-95"
              >
                <span className="material-symbols-outlined text-sm transform transition-all hover:rotate-180">swap_vert</span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-on-surface-variant">You Receive</label>
                <span className="text-[10px] font-mono text-outline">Bal: 0.00</span>
              </div>
              <div className={`flex items-center gap-2 bg-surface border border-outline-variant rounded p-4 ${isQuoting ? 'opacity-50 blur-[1px]' : ''} transition-all`}>
                <select 
                  value={outputMint}
                  onChange={(e) => setOutputMint(e.target.value)}
                  className="bg-transparent text-on-surface font-bold outline-none appearance-none cursor-pointer"
                >
                  <option value={SOL_MINT}>SOL</option>
                  <option value={USDC_MINT}>USDC</option>
                </select>
                <input 
                  type="number" 
                  placeholder={isQuoting ? "Fetching..." : "0.00"} 
                  value={outAmountUI}
                  className="w-full bg-transparent text-right text-2xl font-mono text-on-surface outline-none"
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-6 p-4 bg-surface rounded border border-outline-variant">
             <div className="flex justify-between text-xs font-mono">
               <span className="text-outline uppercase tracking-wider">Solana Network Fee</span>
               <span className="text-on-surface font-bold line-through opacity-70">
                  {!inputAmount ? "0.00 SOL" : (feeSol !== null && feeSol > 0 ? `${feeSol.toFixed(7)} SOL` : "Calculating...")}
               </span>
             </div>
             {rentFeeSol > 0 && (
               <div className="flex justify-between text-xs font-mono border-b border-outline-variant/30 pb-2 mb-2">
                 <div className="flex items-center gap-1">
                   <span className="text-outline uppercase">Account Activation</span>
                   <span className="material-symbols-outlined text-[12px] text-outline/50">info</span>
                 </div>
                 <div className="text-right">
                   <span className="text-on-surface font-bold">
                      {`~${rentFeeSol.toFixed(4)} SOL`}
                   </span>
                   <div className="text-[9px] text-on-surface-variant font-medium uppercase">Paid by Relayer</div>
                 </div>
               </div>
             )}
             <div className="flex justify-between text-xs font-mono">
               <span className="text-outline">Gasit Sponsorship</span>
               <span className="text-primary font-bold">100% COVERED</span>
             </div>
              <div className="flex justify-between text-xs font-mono border-t border-outline-variant pt-2 mt-2">
                <span className="text-outline">Slippage Tolerance</span>
                <span className="text-on-surface">{(slippageBps / 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-top text-xs font-mono border-t border-outline-variant pt-2 mt-2">
                <span className="text-outline uppercase tracking-widest mt-1">Service Fee</span>
                <div className="text-right">
                  <span className="text-primary font-extrabold text-sm">
                     {!inputAmount ? "₦0.00" : (dynamicFee !== null ? `₦${dynamicFee.toLocaleString()}` : "Calculating...")}
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
            disabled={connected && (!quote || isQuoting || isSwapping)}
            onClick={handleButtonClick}
            type="button" 
            className="w-full bg-primary text-on-primary font-bold text-lg py-4 rounded hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer flex justify-center items-center"
          >
            {isSwapping ? (
              <span className="animate-spin material-symbols-outlined mr-2">refresh</span>
            ) : null}
            {!connected ? "Connect Wallet" : (isSwapping ? "Executing..." : (quote ? "Review Swap" : "Enter amount"))}
          </button>
        </div>
      </div>

      {txResult && (
        <TransactionResult
          type={txResult.type}
          kind="swap"
          txId={txResult.txId}
          message={txResult.message}
          onClose={() => setTxResult(null)}
        />
      )}
    </main>
  );
}
