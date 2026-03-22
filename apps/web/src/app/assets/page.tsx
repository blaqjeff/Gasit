"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TopNavBar } from "@/components/TopNavBar";
import { Connection } from "@solana/web3.js";
import { getJupiterQuote, SOL_MINT } from "@/lib/jupiter";

import { fetchUserAssets, AssetDTO } from "@/lib/api-client";

export default function AssetsPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();

  const [assets, setAssets] = useState<AssetDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect to dashboard if not connected
  useEffect(() => {
    if (!connected) router.push("/");
  }, [connected, router]);

  useEffect(() => {
    async function fetchPortfolio() {
      if (!publicKey) return;
      setLoading(true);
      try {
        const data = await fetchUserAssets(publicKey.toString());
        setAssets(data);
      } catch (err) {
        console.error("Error fetching portfolio data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPortfolio();
  }, [publicKey]);

  const totalValueUsd = assets.reduce((sum, a) => sum + a.valueUsd, 0);
  const netWorth = totalValueUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <main className="min-h-screen pt-16 bg-background">
      <TopNavBar />
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-3xl font-extrabold tracking-tighter mb-2 text-on-surface">Portfolio Assets</h1>
        <p className="text-outline mb-12 font-mono text-xs uppercase tracking-wider">On-chain holding summary</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 bg-surface-container border border-outline-variant rounded-xl p-8">
             <div className="text-sm text-outline font-semibold mb-2">Net Worth</div>
             <div className="text-4xl font-mono text-on-surface font-bold">{loading ? "..." : netWorth}</div>
          </div>
          <div className="bg-surface-container border border-outline-variant rounded-xl p-8 flex items-center justify-center">
             <span className="text-sm text-outline font-mono text-center">Charts module rendering...</span>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-outline">Asset Name</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-outline">Balance</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-outline">Price</th>
                <th className="px-6 py-4 text-xs font-mono uppercase tracking-widest text-outline text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {assets.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-outline font-mono text-xs uppercase">No assets found</td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.mint} className="hover:bg-surface transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {asset.logoURI ? (
                        <img src={asset.logoURI} alt={asset.symbol} className="w-8 h-8 rounded-full border border-outline-variant" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-bold text-[10px]">{asset.symbol.slice(0, 3)}</div>
                      )}
                      <div>
                        <p className="font-bold text-on-surface">{asset.name}</p>
                        <p className="text-[10px] uppercase font-mono text-outline">{asset.symbol}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface font-mono">{loading ? "..." : asset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                    <td className="px-6 py-4 text-on-surface font-mono">{loading ? "..." : `$${asset.priceUsd.toFixed(asset.priceUsd < 1 ? 6 : 2)}`}</td>
                    <td className="px-6 py-4 text-right text-on-surface font-mono">
                      {loading ? "..." : asset.valueUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
