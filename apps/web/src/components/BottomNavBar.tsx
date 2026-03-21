import Link from 'next/link';

export function BottomNavBar() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-20 bg-[#131314] border-t border-[#3C4A42]">
      <Link href="/" className="flex flex-col items-center justify-center text-[#10B981] bg-[#1C1B1C] rounded-md py-1 w-full">
        <span className="material-symbols-outlined">home</span>
        <span className="text-[10px] uppercase tracking-widest font-medium mt-1">Home</span>
      </Link>
      <Link href="/transactions" className="flex flex-col items-center justify-center text-gray-500 py-1 w-full hover:text-white transition-colors">
        <span className="material-symbols-outlined">receipt_long</span>
        <span className="text-[10px] uppercase tracking-widest font-medium mt-1">Txns</span>
      </Link>
      <Link href="/wallet" className="flex flex-col items-center justify-center text-gray-500 py-1 w-full hover:text-white transition-colors">
        <span className="material-symbols-outlined">local_gas_station</span>
        <span className="text-[10px] uppercase tracking-widest font-medium mt-1">Wallet</span>
      </Link>
      <Link href="/profile" className="flex flex-col items-center justify-center text-gray-500 py-1 w-full hover:text-white transition-colors">
        <span className="material-symbols-outlined">person</span>
        <span className="text-[10px] uppercase tracking-widest font-medium mt-1">Profile</span>
      </Link>
    </nav>
  );
}
