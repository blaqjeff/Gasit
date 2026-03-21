"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TopNavBar } from "@/components/TopNavBar";
import { Connection } from "@solana/web3.js";
import { getJupiterQuote, SOL_MINT } from "@/lib/jupiter";

interface AssetData {
  balance: number;
  priceUsd: number;
  valueUsd: number;
}

export default function AssetsPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();

  const [solData, setSolData] = useState<AssetData>({ balance: 0, priceUsd: 0, valueUsd: 0 });
  const [loading, setLoading] = useState(true);

  // Redirect to dashboard if not connected
  useEffect(() => {
    if (!connected) router.push("/");
  }, [connected, router]);

  useEffect(() => {
    async function fetchPortfolio() {
      if (!publicKey) return;
      try {
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
        
        // Fetch SOL Balance
        const lamports = await connection.getBalance(publicKey);
        const solBalance = lamports / 1e9;

        // Fetch SOL Price from Jupiter V3 API (Proxied)
        const priceRes = await fetch(`/api/jupiter/price?ids=${SOL_MINT}`);
        const priceData = await priceRes.json();
        const solPrice = priceData?.data ? parseFloat(priceData?.data[SOL_MINT]?.price || "0") : 0;

        setSolData({
          balance: solBalance,
          priceUsd: solPrice,
          valueUsd: solBalance * solPrice
        });

      } catch (err) {
        console.error("Error fetching portfolio data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPortfolio();
  }, [publicKey]);

  const netWorth = solData.valueUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <main className="min-h-screen pt-16 bg-[#0A0A0B]">
      <TopNavBar />
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-3xl font-extrabold tracking-tighter mb-2 text-white">Portfolio Assets</h1>
        <p className="text-[#86948A] mb-12 font-mono text-xs uppercase tracking-wider">On-chain holding summary</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 bg-[#1C1B1C] border border-[#3C4A42] rounded-xl p-8">
             <div className="text-sm text-[#86948A] font-semibold mb-2">Net Worth</div>
             <div className="text-4xl font-mono text-white font-bold">{loading ? "..." : netWorth}</div>
          </div>
          <div className="bg-[#1C1B1C] border border-[#3C4A42] rounded-xl p-8 flex items-center justify-center">
             <span className="text-sm text-[#86948A] font-mono text-center">Charts module rendering...</span>
          </div>
        </div>

        <div className="bg-[#1C1B1C] border border-[#3C4A42] rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#131314] border-b border-[#3C4A42]">
              <tr>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-[#86948A]">Asset Name</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-[#86948A]">Balance</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-[#86948A]">Price</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-[#86948A] text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3C4A42]">
              {/* Dynamic SOL Data */}
              <tr className="hover:bg-[#131314] transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center text-[#003824] font-bold text-xs">SOL</div>
                  <div>
                    <p className="font-bold text-white">Solana</p>
                    <p className="text-[10px] uppercase font-mono text-[#86948A]">Native</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-white font-mono">{loading ? "..." : solData.balance.toFixed(4)}</td>
                <td className="px-6 py-4 text-white font-mono">{loading ? "..." : `$${solData.priceUsd.toFixed(2)}`}</td>
                <td className="px-6 py-4 text-right text-white font-mono">{loading ? "..." : solData.valueUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
