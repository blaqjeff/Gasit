"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNavBar() {
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `flex flex-col items-center justify-center py-1 w-full transition-colors ${
      isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
    }`;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 h-20 bg-surface border-t border-outline-variant">
      <Link href="/dashboard" className={getLinkClass("/dashboard")}>
        <span className="material-symbols-outlined">home</span>
        <span className="text-[10px] uppercase tracking-widest font-medium mt-1">Home</span>
      </Link>
      <Link href="/swap" className={getLinkClass("/swap")}>
        <span className="material-symbols-outlined">swap_horiz</span>
        <span className="text-[10px] uppercase tracking-widest font-medium mt-1">Swap</span>
      </Link>
      <Link href="/relay" className={getLinkClass("/relay")}>
        <span className="material-symbols-outlined">bolt</span>
        <span className="text-[10px] uppercase tracking-widest font-medium mt-1">Gas-it</span>
      </Link>
      <Link href="/assets" className={getLinkClass("/assets")}>
        <span className="material-symbols-outlined">account_balance_wallet</span>
        <span className="text-[10px] uppercase tracking-widest font-medium mt-1">Assets</span>
      </Link>
      <Link href="/transactions" className={getLinkClass("/transactions")}>
        <span className="material-symbols-outlined">receipt_long</span>
        <span className="text-[10px] uppercase tracking-widest font-medium mt-1">Txns</span>
      </Link>
    </nav>
  );
}
