"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { TopNavBar } from "@/components/TopNavBar";
import { getJupiterQuote, getJupiterSwapTx, QuoteResponse, SOL_MINT, USDC_MINT } from "@/lib/jupiter";

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

  useEffect(() => {
    let active = true;

    if (!debouncedInput || parseFloat(debouncedInput) <= 0) {
      setQuote(null);
      setDynamicFee(null);
      return;
    }

    const fetchQuote = async () => {
      setIsQuoting(true);
      // Determine decimals: assume 6 for USDC, 9 for SOL
      const decimals = inputMint === USDC_MINT ? 1e6 : 1e9;
      const amountAsInt = Math.floor(parseFloat(debouncedInput) * decimals);
      
      const q = await getJupiterQuote(inputMint, outputMint, amountAsInt);
      
      if (active) {
        setQuote(q);
        setIsQuoting(false);
        if (q) {
           // Fetch gas fee only after successful quote interpolation 
           fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/relay/fee?type=swap`)
             .then(res => res.json())
             .then(data => { if (active) setDynamicFee(data.feeNaira); })
             .catch(err => console.error("Failed to fetch dynamic swap fee", err));
        } else {
           setDynamicFee(null);
        }
      }
    };

    fetchQuote();
    return () => { active = false; };
  }, [debouncedInput, inputMint, outputMint]);

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

      // For gasless logic, the backend usually constructs this and signs as fee payer.
      // We will send this base64 string to our API to trigger the Naira deduction and processing.
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/relay/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionBase64: swapTransactionBuf,
          userWallet: publicKey.toString()
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Backend Swap Relay Failed');
      }

      alert(`✅ Swap executed gaslessly!\nSignature: ${data.txId}\n\nYour Dashboard Naira balance has been deducted!`);
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      alert('Error during gasless swap: ' + err.message);
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
          
          <div className="mb-6 px-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-outline font-semibold text-sm">Gasit Automation Fee</span>
              <span className="font-mono text-primary font-bold">
                {dynamicFee !== null ? `₦ ${dynamicFee.toFixed(2)}` : "Calculating..."}
              </span>
            </div>
          </div>

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

          <div 
             onClick={handleSwap}
             className="absolute left-1/2 -translate-x-1/2 top-[125px] w-8 h-8 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center cursor-pointer hover:bg-surface-container-high transition-colors z-10"
          >
            <span className="material-symbols-outlined text-outline text-sm transform transition-all hover:rotate-180">swap_vert</span>
          </div>

          <div className="mb-6 mt-4">
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

          <div className="space-y-2 mb-6 p-4 bg-surface rounded border border-outline-variant">
             <div className="flex justify-between text-xs font-mono">
               <span className="text-outline">Solana Network Fee</span>
               <span className="text-primary line-through">0.000005 SOL</span>
             </div>
             <div className="flex justify-between text-xs font-mono">
               <span className="text-outline">Gasit Sponsorship</span>
               <span className="text-primary font-bold">100% COVERED</span>
             </div>
             <div className="flex justify-between text-xs font-mono border-t border-outline-variant pt-2 mt-2">
               <span className="text-outline">Gasit Automation Fee</span>
               <span className="text-primary font-bold">
                  {dynamicFee !== null ? `₦ ${dynamicFee.toFixed(2)}` : "Calculating..."}
               </span>
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
    </main>
  );
}
