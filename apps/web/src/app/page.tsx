import { ClientWalletButton } from '../components/ClientWalletButton';

export default function LandingPage() {
  return (
    <main className="pt-16 pb-32">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-outline-variant bg-surface-container-low">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-secondary">Network Operational</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[0.9] text-on-surface">
              Stop worrying about SOL.<br />
              <span className="text-primary">Just Gas-it.</span>
            </h1>
            <p className="text-lg text-on-surface-variant max-w-lg leading-relaxed">
              The ultimate fiat-to-gas abstraction layer for Solana. Gasit lets you pay network and priority fees directly with Naira, so you can execute trades without ever holding a fraction of SOL.
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <ClientWalletButton variant="hero" />
              <button className="border border-outline-variant text-on-surface px-8 py-4 font-bold text-lg rounded hover:bg-surface-container transition-all cursor-pointer">
                View Docs
              </button>
            </div>
            <div className="flex items-center gap-6 pt-4">
              <p className="text-xs text-on-surface-variant font-mono uppercase tracking-tighter">
                Trusted by 12,000+ Power Users
              </p>
            </div>
          </div>

          {/* Comparison Visual */}
          <div className="relative grid grid-cols-2 h-[500px] border border-outline-variant rounded-xl overflow-hidden bg-surface-container-lowest">
            {/* Failed State */}
            <div className="relative flex flex-col justify-center items-center p-8 bg-surface-container-low border-r border-outline-variant">
              <div className="absolute top-4 left-4 text-[10px] font-mono text-error/50 uppercase tracking-widest">
                System: Legacy
              </div>
              <div className="w-full max-w-[200px] space-y-4">
                <div className="h-32 rounded bg-surface border border-error-container flex flex-col items-center justify-center p-4 text-center">
                  <span className="material-symbols-outlined text-error text-4xl mb-2">error</span>
                  <span className="text-xs font-mono text-error uppercase">Insufficient SOL</span>
                </div>
                <div className="space-y-2 opacity-40">
                  <div className="h-4 bg-surface rounded w-full"></div>
                  <div className="h-4 bg-surface rounded w-3/4"></div>
                </div>
              </div>
              <div className="mt-8 text-center">
                <p className="text-2xl font-bold text-error line-through decoration-2">FAILED</p>
                <p className="text-[10px] font-mono text-on-surface-variant mt-2">TX: 0x8a...4b2</p>
              </div>
            </div>

            {/* Success State */}
            <div className="relative flex flex-col justify-center items-center p-8 bg-surface">
              <div className="absolute top-4 right-4 text-[10px] font-mono text-primary/50 uppercase tracking-widest text-right">
                System: Gasit
              </div>
              <div className="w-full max-w-[200px] space-y-4">
                <div className="h-32 rounded bg-surface-container-high border border-primary flex flex-col items-center justify-center p-4 text-center">
                  <span className="material-symbols-outlined text-primary text-4xl mb-2">check_circle</span>
                  <span className="text-xs font-mono text-primary uppercase">Gas Refilled</span>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-primary/20 rounded w-full"></div>
                  <div className="h-4 bg-primary/20 rounded w-5/6"></div>
                </div>
              </div>
              <div className="mt-8 text-center">
                <p className="text-2xl font-bold text-primary">SUCCESS</p>
                <p className="text-[10px] font-mono text-primary mt-2">REFILL: +0.05 SOL</p>
              </div>
            </div>

            {/* Divider Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-outline-variant text-[10px] font-mono px-3 py-1 rounded text-white transform -rotate-90">
                VS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bento Grid */}
      <section className="bg-surface-container-low border-y border-outline-variant py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-outline-variant border border-outline-variant rounded-xl overflow-hidden">
            <div className="bg-surface p-10 space-y-4">
              <p className="text-sm font-mono text-secondary uppercase tracking-widest">Total Relays</p>
              <p className="text-4xl font-mono font-bold text-on-surface">4.2M+</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">Successful gasless executions sponsored directly via fiat balances globally.</p>
            </div>
            <div className="bg-surface p-10 space-y-4">
              <p className="text-sm font-mono text-secondary uppercase tracking-widest">Zero-SOL Failures</p>
              <p className="text-4xl font-mono font-bold text-error">0.00%</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">Say goodbye to "Insufficient SOL" errors. Your trades execute seamlessly, every time.</p>
            </div>
            <div className="bg-surface p-10 space-y-4">
              <p className="text-sm font-mono text-secondary uppercase tracking-widest">Avg Execution</p>
              <p className="text-4xl font-mono font-bold text-on-surface">~420ms</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">Instant relayed transaction sponsorship via high-performance RPCs and priority fees.</p>
            </div>
            <div className="bg-surface p-10 space-y-4">
              <p className="text-sm font-mono text-secondary uppercase tracking-widest">Fees Sponsored</p>
              <p className="text-4xl font-mono font-bold text-primary">₦1M+</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">Total on-chain network costs abstracted and offset by Gasit's institutional relayer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Preview Section */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Fiat-Powered. Decentralized Execution.</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto">Top up your dashboard with Naira and let our institutional relayers sponsor your on-chain executions. Your keys, your crypto, our reliability.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-surface-container-low border border-outline-variant p-8 rounded-xl flex flex-col justify-between group hover:border-primary transition-colors cursor-pointer">
            <div>
              <div className="w-12 h-12 bg-surface flex items-center justify-center rounded mb-6 border border-outline-variant">
                <span className="material-symbols-outlined text-primary">monitoring</span>
              </div>
              <h3 className="text-xl font-bold mb-4">Complete Fiat Abstraction</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6">Fund your Gasit dashboard with local currency and instantly route those funds to cover complex Solana transaction fees in the background.</p>
            </div>
            <div className="h-1 bg-outline-variant w-full rounded-full overflow-hidden">
              <div className="h-full bg-primary w-1/3 group-hover:w-full transition-all duration-700"></div>
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant p-8 rounded-xl flex flex-col justify-between group hover:border-primary transition-colors cursor-pointer">
            <div>
              <div className="w-12 h-12 bg-surface flex items-center justify-center rounded mb-6 border border-outline-variant">
                <span className="material-symbols-outlined text-primary">bolt</span>
              </div>
              <h3 className="text-xl font-bold mb-4">True Gasless Swaps</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6">Execute token swaps natively inside Gasit. Our relayer absorbs the routing and priority fees while giving you zero-slippage execution.</p>
            </div>
            <div className="h-1 bg-outline-variant w-full rounded-full overflow-hidden">
              <div className="h-full bg-primary w-2/3 group-hover:w-full transition-all duration-700"></div>
            </div>
          </div>
          <div className="bg-surface-container-low border border-outline-variant p-8 rounded-xl flex flex-col justify-between group hover:border-primary transition-colors cursor-pointer">
            <div>
              <div className="w-12 h-12 bg-surface flex items-center justify-center rounded mb-6 border border-outline-variant">
                <span className="material-symbols-outlined text-primary">security</span>
              </div>
              <h3 className="text-xl font-bold mb-4">Secure & Non-Custodial</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6">Gasit never has access to your private keys. You sign the transaction, our relayer pays the fee.</p>
            </div>
            <div className="h-1 bg-outline-variant w-full rounded-full overflow-hidden">
              <div className="h-full bg-primary w-1/2 group-hover:w-full transition-all duration-700"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 pb-32">
        <div className="bg-surface border border-outline-variant rounded-xl p-12 text-center relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(#10B981 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>
          <h2 className="text-4xl font-bold tracking-tighter mb-6 relative z-10">Secure your gas today.</h2>
          <p className="text-on-surface-variant max-w-xl mx-auto mb-10 relative z-10">Join thousands of Solana traders who have eliminated transaction failures from their workflow.</p>
          <div className="flex justify-center gap-4 relative z-10 w-full overflow-hidden">
            <ClientWalletButton variant="hero" />
          </div>
        </div>
      </section>
      
      {/* Institutional Footer Info */}
      <footer className="mt-16 text-center space-y-2 opacity-40">
        <div className="text-[10px] uppercase tracking-widest font-mono">Network Status: Operational</div>
        <div className="text-[9px] uppercase tracking-[0.3em]">Institutional Grade Security • 256-bit Encryption</div>
        <p className="text-xs text-on-surface-variant font-mono mt-4">© 2026 GASIT PROTOCOL. ALL RIGHTS RESERVED.</p>
      </footer>
    </main>
  );
}
