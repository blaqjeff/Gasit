"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TopNavBar } from "@/components/TopNavBar";
import { BottomNavBar } from "@/components/BottomNavBar";
import { fetchUserTransactions, TransactionDTO } from "@/lib/api-client";
import { Connection } from "@solana/web3.js";

export default function TransactionsPage() {
  const { connected, publicKey } = useWallet();
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedTx, setSelectedTx] = useState<TransactionDTO | null>(null);
  const [txDetails, setTxDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadTransactions = async () => {
    if (publicKey) {
      setLoading(true);
      const data = await fetchUserTransactions(publicKey.toString());
      setTransactions(data);
      setLoading(false);
    }
  };

  const handleTxClick = async (tx: TransactionDTO) => {
    setSelectedTx(tx);
    setLoadingDetails(true);
    setTxDetails(null);
    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
      const details = await connection.getParsedTransaction(tx.signature, {
        maxSupportedTransactionVersion: 0
      });
      setTxDetails(details);
    } catch (error) {
      console.error("Error fetching tx details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [publicKey]);

  return (
    <main className="min-h-screen pt-16 pb-24 bg-background">
      <TopNavBar />
      
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tighter text-on-surface">Activity</h1>
            <p className="text-outline font-mono text-xs uppercase tracking-wider mt-1">Your gasless transactions on Solana</p>
          </div>
          <button 
            onClick={loadTransactions}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/5 px-4 py-2 rounded-lg border border-primary/20 transition-all w-fit"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-high/30">
                  <th className="px-6 py-4 font-semibold text-outline uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 font-semibold text-outline uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 font-semibold text-outline uppercase tracking-wider">Fee (NGN)</th>
                  <th className="px-6 py-4 font-semibold text-outline uppercase tracking-wider">Signature</th>
                  <th className="px-6 py-4 font-semibold text-outline uppercase tracking-wider text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {!connected ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-outline italic">
                      Please connect your wallet to view transaction history.
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-outline italic">
                      {loading ? "Loading transactions..." : "No transactions found yet."}
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-surface-container-highest/30 transition-colors cursor-pointer group"
                      onClick={() => handleTxClick(tx)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            tx.type === 'SWAP' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                          }`}>
                            <span className="material-symbols-outlined text-base">
                              {tx.type === 'SWAP' ? 'swap_horiz' : 'send'}
                            </span>
                          </div>
                          <span className="font-bold text-on-surface">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          tx.status === 'SUCCESS' ? 'bg-success/10 text-success' : 
                          tx.status === 'PENDING' ? 'bg-warning/10 text-warning' : 
                          'bg-error/10 text-error'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-bold text-on-surface">
                        ₦{tx.feeNaira.toFixed(2)}
                      </td>
                      <td className="px-6 py-5 text-outline font-mono truncate max-w-[150px]">
                        <div className="group-hover:text-primary flex items-center gap-1">
                          {tx.signature?.slice(0, 8)}...{tx.signature?.slice(-8)}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right text-outline">
                        {new Date(tx.createdAt).toLocaleDateString()}
                        <div className="text-[10px] opacity-60">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container border border-outline-variant rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-high/30">
              <h2 className="text-lg font-extrabold tracking-tighter text-on-surface">Transaction Details</h2>
              <button onClick={() => setSelectedTx(null)} className="material-symbols-outlined text-outline hover:text-on-surface flex items-center justify-center p-2">close</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-outline tracking-widest mb-1">Type</div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">{selectedTx.type === 'SWAP' ? 'swap_horiz' : 'send'}</span>
                    <span className="font-bold text-on-surface">{selectedTx.type}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-outline tracking-widest mb-1">Status</div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                    selectedTx.status === 'SUCCESS' ? 'bg-success/10 text-success' : 
                    selectedTx.status === 'PENDING' ? 'bg-warning/10 text-warning' : 
                    'bg-error/10 text-error'
                  }`}>
                    {selectedTx.status}
                  </span>
                </div>
              </div>

              {/* On-chain Details */}
              <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 space-y-4">
                {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                    <span className="text-xs text-outline font-mono uppercase">Fetching on-chain data...</span>
                  </div>
                ) : txDetails ? (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline uppercase font-mono">Blockchain Fee</span>
                      <span className="text-on-surface font-mono">{(txDetails.meta?.fee / 1e9).toFixed(6)} SOL</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline uppercase font-mono">Gasit Fee</span>
                      <span className="text-on-surface font-mono">₦{selectedTx.feeNaira.toFixed(2)}</span>
                    </div>
                    {/* Parse Amount if Transfer */}
                    {selectedTx.type === 'TRANSFER' && txDetails.transaction.message.instructions.some((ix: any) => ix.program === 'system' && ix.parsed?.type === 'transfer') && (
                      <div className="pt-2 border-t border-outline-variant/30">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="text-outline uppercase font-mono text-xs">Amount Sent</span>
                          <span className="text-primary font-mono">
                            {(txDetails.transaction.message.instructions.find((ix: any) => ix.program === 'system' && ix.parsed?.type === 'transfer')?.parsed.info.lamports / 1e9).toFixed(4)} SOL
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-xs text-outline">On-chain details not available.</div>
                )}
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-bold text-outline tracking-widest">Transaction Signature</div>
                <div className="text-[11px] font-mono p-3 bg-surface-container-highest/50 rounded-lg break-all border border-outline-variant/30 opacity-80">
                  {selectedTx.signature}
                </div>
                <a 
                  href={`https://solscan.io/tx/${selectedTx.signature}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 mt-4 bg-primary text-on-primary rounded-xl font-bold transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-primary/20 cursor-pointer"
                >
                  <span className="text-sm">View on Solscan</span>
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNavBar />
    </main>
  );
}
