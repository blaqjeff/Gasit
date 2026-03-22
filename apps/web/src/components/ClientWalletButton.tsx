"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
// Needed for the generic Wallet component default styles to format cleanly!
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  variant?: 'navbar' | 'hero';
}

export function ClientWalletButton({ variant = 'navbar' }: Props) {
  const { connected, connecting, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const heroClass = "bg-primary text-on-primary px-10 py-4 font-bold text-lg rounded shadow-lg hover:scale-105 transition-transform cursor-pointer";

  if (!mounted) {
    if (variant === 'hero') {
      return (
        <button className={`${heroClass} opacity-50 cursor-wait`}>
          Connect Wallet
        </button>
      );
    }
    return <div className="w-[140px] h-[40px] bg-surface-container-high animate-pulse rounded"></div>;
  }

  if (variant === 'hero') {
    if (connected && publicKey) {
      return (
        <button onClick={() => router.push('/dashboard')} className={heroClass}>
          Go to Dashboard
        </button>
      );
    }
    
    return (
      <button onClick={() => setVisible(true)} className={heroClass}>
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="wallet-btn-container">
      <WalletMultiButton 
        className="!bg-surface-container-high !border !border-outline-variant !text-sm !font-semibold !text-primary hover:!bg-surface-container-highest !transition-all active:!scale-95 !rounded-[0.25rem] !h-[40px] !px-4"
      >
        {publicKey ? undefined : "Connect Wallet"}
      </WalletMultiButton>
    </div>
  );
}
