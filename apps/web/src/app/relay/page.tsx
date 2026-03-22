"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TopNavBar } from "@/components/TopNavBar";
import { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

export default function RelayTransferPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();

  const [destination, setDestination] = useState<string>('');
  const [asset, setAsset] = useState<string>('SOL');
  const [amount, setAmount] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  const executeTransfer = async () => {
    if (!publicKey || !signTransaction) return;
    if (!destination || !amount || isNaN(parseFloat(amount))) {
       alert('Please enter a valid destination and amount');
       return;
    }

    setIsTransferring(true);

    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
      const destPubkey = new PublicKey(destination);
      const lamports = Math.floor(parseFloat(amount) * 1e9);

      // Create a transfer instruction
      const transferIx = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: destPubkey,
        lamports
      });

      // Fetch blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Compile message
      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [transferIx]
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // We sign the transaction
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

      alert(`✅ Transfer executed gaslessly!\nSignature: ${data.txId}\n\nYour Dashboard Naira balance has been deducted!`);
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
    <main className="min-h-screen pt-16 bg-background">
      <TopNavBar />
      <div className="max-w-2xl mx-auto px-6 py-20">
        <div className="bg-surface-container border border-outline-variant p-8 rounded-xl shadow-2xl">
          <h1 className="text-3xl font-extrabold tracking-tighter mb-2 text-on-surface">Gas-it</h1>
          <p className="text-outline mb-8 font-mono text-xs uppercase tracking-wider">Gasless SPL & SOL Dispatch</p>

          <form className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-on-surface-variant">Destination Address</label>
              <input 
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                type="text" 
                placeholder="Solana Address (e.g. 7oA..." 
                className="w-full bg-surface border border-outline-variant rounded px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors font-mono text-sm"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-semibold mb-2 text-on-surface-variant">Asset</label>
                <select 
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors font-mono text-sm appearance-none"
                >
                  <option>SOL</option>
                  <option>USDC</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-2 text-on-surface-variant">Amount</label>
                <input 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number" 
                  step="any"
                  placeholder="0.00" 
                  className="w-full bg-surface border border-outline-variant rounded px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mb-6 px-2">
              <span className="text-outline font-semibold text-sm">Gasit Automation Fee</span>
              <span className="font-mono text-primary font-bold">₦ 100.00</span>
            </div>

            <button 
              type="button" 
              onClick={handleButtonClick}
              disabled={connected && (isTransferring || !destination || !amount)}
              className="w-full bg-primary flex justify-center items-center text-on-primary font-bold text-lg py-4 rounded hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {isTransferring ? (
                <span className="animate-spin material-symbols-outlined mr-2">refresh</span>
              ) : null}
              {!connected ? "Connect Wallet" : isTransferring ? "Executing Transfer..." : "Initiate Transfer"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
