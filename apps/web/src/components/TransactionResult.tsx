'use client';

import { useRouter } from 'next/navigation';

export type TransactionResultType = 'success' | 'error';
export type TransactionKind = 'swap' | 'transfer';

interface TransactionResultProps {
  type: TransactionResultType;
  kind: TransactionKind;
  txId?: string;
  message?: string;
  onClose: () => void;
}

const EXPLORER_BASE = 'https://orb.helius.dev/tx';
const NETWORK_PARAM = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta' ? '' : '?cluster=devnet';

export default function TransactionResult({ type, kind, txId, message, onClose }: TransactionResultProps) {
  const router = useRouter();
  const isSuccess = type === 'success';
  const kindLabel = kind === 'swap' ? 'Swap' : 'Transfer';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-background border border-outline-variant rounded-xl shadow-2xl relative overflow-hidden">
        {/* Top Accent Bar */}
        <div className={`h-1 w-full ${isSuccess ? 'bg-primary' : 'bg-error'}`} />

        <div className="p-10 flex flex-col items-center text-center">
          {/* Icon */}
          <div className={`mb-8 w-16 h-16 rounded-full border flex items-center justify-center ${
            isSuccess
              ? 'border-primary bg-primary/10'
              : 'border-error bg-error/10'
          }`}>
            <span
              className={`material-symbols-outlined ${isSuccess ? 'text-primary' : 'text-error'}`}
              style={{ fontSize: 32, fontVariationSettings: "'FILL' 0, 'wght' 500" }}
            >
              {isSuccess ? 'check' : 'close'}
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-on-surface">
            {isSuccess
              ? `${kindLabel} Relayed Successfully!`
              : `${kindLabel} Failed`}
          </h2>

          {/* Detail Pill */}
          {isSuccess ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg mb-8">
              <span className="text-sm font-medium text-outline">Gas fees</span>
              <span className="font-mono font-bold text-primary">sponsored</span>
              <span className="text-sm font-medium text-outline">by Gasit.</span>
            </div>
          ) : (
            <p className="text-sm text-outline mb-8 max-w-xs break-words font-mono">
              {message || 'An unknown error occurred.'}
            </p>
          )}

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {isSuccess && txId && (
              <a
                href={`${EXPLORER_BASE}/${txId}${NETWORK_PARAM}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-surface-container-highest border border-outline-variant text-on-surface font-semibold tracking-tight rounded-lg hover:bg-surface-container-high transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                <span className="text-sm">View on Solscan</span>
                <span
                  className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform"
                  style={{ fontSize: 16 }}
                >
                  open_in_new
                </span>
              </a>
            )}

            {!isSuccess && (
              <button
                onClick={onClose}
                className="w-full py-4 bg-surface-container-highest border border-outline-variant text-on-surface font-semibold tracking-tight rounded-lg hover:bg-surface-container-high transition-all active:scale-[0.98] cursor-pointer"
              >
                Try Again
              </button>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-4 bg-primary text-on-primary font-bold tracking-tight rounded-lg hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>

        {/* Subtle Grid Background Decoration */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(var(--color-outline) 1px, transparent 1px), linear-gradient(90deg, var(--color-outline) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
      </div>
    </div>
  );
}
