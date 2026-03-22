"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClientWalletButton } from './ClientWalletButton';

import { ThemeToggle } from './ThemeToggle';

export function TopNavBar() {
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return isActive 
      ? "font-semibold tracking-tight text-primary border-b-2 border-primary pb-1"
      : "font-semibold tracking-tight text-on-surface-variant hover:text-on-surface transition-colors pb-1";
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-background border-b border-outline-variant">
      <div className="text-xl font-bold tracking-tighter text-primary">
        <Link href="/">Gasit</Link>
      </div>
      <div className="hidden md:flex items-center space-x-8">
        <Link href="/dashboard" className={getLinkClass("/dashboard")}>
          Dashboard
        </Link>
        <Link href="/relay" className={getLinkClass("/relay")}>
          Gas-it
        </Link>
        <Link href="/swap" className={getLinkClass("/swap")}>
          Swap
        </Link>
        <Link href="/assets" className={getLinkClass("/assets")}>
          Assets
        </Link>
        <Link href="/transactions" className={getLinkClass("/transactions")}>
          History
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <ClientWalletButton />
      </div>
    </nav>
  );
}
