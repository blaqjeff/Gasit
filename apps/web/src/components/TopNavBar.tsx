"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClientWalletButton } from './ClientWalletButton';

export function TopNavBar() {
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return isActive 
      ? "font-semibold tracking-tight text-[#10B981] border-b-2 border-[#10B981] pb-1"
      : "font-semibold tracking-tight text-gray-400 hover:text-white transition-colors pb-1";
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#0A0A0B] border-b border-[#3C4A42]">
      <div className="text-xl font-bold tracking-tighter text-[#10B981]">
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
      </div>
      <div className="flex items-center gap-4">
        <ClientWalletButton />
      </div>
    </nav>
  );
}
