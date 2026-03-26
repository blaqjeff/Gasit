'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { fetchUserBalance, UserDTO, fetchUserAssets, AssetDTO } from '@/lib/api-client';
import { ClientWalletButton } from '@/components/ClientWalletButton';
import { SOL_MINT } from '@/lib/jupiter';

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [userData, setUserData] = useState<UserDTO | null>(null);
  const [assets, setAssets] = useState<AssetDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function refreshData() {
      if (publicKey) {
        setLoading(true);
        try {
          // Fetch Naira Balance
          const data = await fetchUserBalance(publicKey.toString());
          // Only update if we actually got a result or a 404 (null)
          // If the network call itself fails, we keep the old data to avoid flickering to 0
          if (data !== undefined) {
             setUserData(data);
          }

          // Fetch All Assets (SOL + SPL)
          const assetData = await fetchUserAssets(publicKey.toString());
          if (assetData !== undefined) {
             setAssets(assetData);
          }
        } catch (error) {
          console.error("Dashboard refresh error:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setUserData(null);
        setAssets([]);
      }
    }
    refreshData();
  }, [publicKey]);

  const nairaBalance = userData?.nairaBalance || 0;
  const isSetup = !!publicKey;

  return (
    <main className="pt-24 px-6 max-w-lg mx-auto md:max-w-4xl pb-24">
      {/* Wallet Connection */}
      <div className="flex justify-end mb-8">
        <ClientWalletButton variant="navbar" />
      </div>

      {isSetup ? (
        <>
          {/* Gasit Balance Card */}
          <section className="mb-8">
            <div className="bg-primary-container p-8 rounded-xl border border-primary flex flex-col items-start relative overflow-hidden shadow-lg">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBqMFWSIyZo1KO7nQIsT8vgyX32LFNnEXI6LeHX0f_4EO21kLGTO8ongeqLeTF-nUV0PpDdbNk3R4st0DqIGg4U9lgEtY44i3DrF2MB98_yaHmi11sn18pvkHdELXu-X1nf6DNQwV0Z7wt1_0osS_9c8ir2J3TIJ48LZjJOSp7XIQxzRVsa4yLM_RUp2kZvIIcoijrcHW8A6fH-a14uSCtKJpph1kdYsdEd0VR9a49dpLrADJX7u-553iWQd8j8dC1hP5cu7eQplPI')" }}></div>
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBqMFWSIyZo1KO7nQIsT8vgyX32LFNnEXI6LeHX0f_4EO21kLGTO8ongeqLeTF-nUV0PpDdbNk3R4st0DqIGg4U9lgEtY44i3DrF2MB98_yaHmi11sn18pvkHdELXu-X1nf6DNQwV0Z7wt1_0osS_9c8ir2J3TIJ48LZjJOSp7XIQxzRVsa4yLM_RUp2kZvIIcoijrcHW8A6fH-a14uSCnKJpph1kdYsdEd0VR9a49dpLrADJX7u-553iWQd8j8dC1hP5cu7eQplPI')" }}></div>
              <span className="text-on-primary-container text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-2 opacity-80">Gasit Balance</span>
              <div className="flex items-baseline gap-2 overflow-hidden">
                <h1 className="text-on-primary-container text-3xl md:text-5xl font-extrabold tracking-tighter font-mono leading-none truncate">
                  {loading && !userData ? '...' : `₦${nairaBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
                </h1>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
                <div className="flex items-center gap-2 text-on-primary-container text-xs md:text-sm opacity-90">
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  <span className="font-medium">
                    {nairaBalance > 0 ? 'Ready for next transactions' : 'Fund your wallet to send gaslessly'}
                  </span>
                </div>
                <button 
                  onClick={() => router.push('/deposit')}
                  className="w-full sm:w-auto bg-on-primary text-primary-container px-6 py-3 sm:py-2 text-xs font-bold rounded shadow-sm hover:opacity-90 transition-opacity cursor-pointer">
                  Top Up Naira
                </button>
              </div>
            </div>
          </section>

          {/* Primary Actions */}
          <section className="grid grid-cols-2 gap-4 mb-10">
            <button 
              onClick={() => router.push('/relay')}
              className="flex items-center justify-center gap-3 bg-surface-container border border-outline-variant py-5 rounded-xl text-primary font-bold hover:bg-surface-container-high transition-all active:scale-95 group cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-2xl group-hover:-translate-y-1 transition-transform">north</span>
              <span className="uppercase tracking-widest text-sm">Gas-it</span>
            </button>
            <button 
              onClick={() => router.push('/swap')}
              className="flex items-center justify-center gap-3 bg-surface-container border border-outline-variant py-5 rounded-xl text-primary font-bold hover:bg-surface-container-high transition-all active:scale-95 group cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-2xl group-hover:rotate-180 transition-transform">swap_horiz</span>
              <span className="uppercase tracking-widest text-sm">Swap</span>
            </button>
          </section>

          {/* Asset List */}
          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-outline-variant pb-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-outline">Portfolio Assets</h2>
            </div>
            
            <div className="space-y-4">
              {assets.length === 0 && !loading ? (
                <div className="p-8 bg-surface-container-low border border-outline-variant rounded-xl text-center">
                  <p className="text-xs text-outline font-mono uppercase">No assets found</p>
                </div>
              ) : (
                assets.slice(0, 3).map((asset) => (
                  <div key={asset.mint} className="flex items-center justify-between p-4 bg-surface-container-low border border-outline-variant rounded-xl hover:bg-surface-container transition-colors cursor-pointer" onClick={() => router.push('/assets')}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-surface-container-highest rounded-lg border border-outline-variant flex items-center justify-center overflow-hidden">
                        {asset.logoURI ? (
                          <img src={asset.logoURI} alt={asset.symbol} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-on-surface text-xs font-mono font-bold">{asset.symbol.slice(0, 3)}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-on-surface tracking-tight">{asset.symbol}</div>
                        <div className="text-[11px] text-outline uppercase tracking-wider truncate max-w-[100px]">{asset.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold text-on-surface">
                        {loading ? '...' : asset.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </div>
                      <div className="text-[11px] text-outline font-mono">
                        {loading ? '...' : asset.valueUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {assets.length > 3 && (
                <button 
                  onClick={() => router.push('/assets')}
                  className="w-full py-2 text-[10px] uppercase font-bold text-outline hover:text-primary transition-colors"
                >
                  + {assets.length - 3} More Assets
                </button>
              )}
            </div>
          </section>

          {/* Recent Activity */}
          <section className="space-y-6 mt-12 mb-12">
            <div className="flex justify-between items-end border-b border-outline-variant pb-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-outline">Recent Activity</h2>
              <button 
                onClick={() => router.push('/transactions')}
                className="text-[10px] uppercase font-bold text-primary hover:underline"
              >
                View All
              </button>
            </div>
            
            <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-3xl text-outline-variant mb-2">history</span>
              <p className="text-xs text-outline font-mono">Check your full transaction history for details on previous swaps and transfers.</p>
            </div>
          </section>
        </>
      ) : (
         <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
           <span className="material-symbols-outlined text-4xl text-outline-variant mb-4">account_balance_wallet</span>
           <h2 className="text-2xl font-bold text-on-surface">Connect your wallet</h2>
           <p className="text-on-surface-variant max-w-sm">Please connect your Solana wallet to access your Gasit dashboard and fund your account.</p>
         </div>
      )}
      
      {/* Footer Info */}
      <footer className="mt-16 text-center space-y-2 opacity-40">
        <div className="text-[10px] uppercase tracking-widest font-mono">Network Status: Operational</div>
        <div className="text-[9px] uppercase tracking-[0.3em]">Institutional Grade Security • 256-bit Encryption</div>
      </footer>
    </main>
  );
}
