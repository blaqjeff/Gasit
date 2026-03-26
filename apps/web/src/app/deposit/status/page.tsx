"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { TopNavBar } from "@/components/TopNavBar";
import { useEffect, useState, Suspense } from "react";

function DepositStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const status = searchParams.get("status");
  const reference = searchParams.get("reference");
  const amount = searchParams.get("amount");
  const message = searchParams.get("message");

  const isSuccess = status === "success";

  return (
    <div className="bg-[#1C1B1C] border border-[#3C4A42] p-10 rounded-2xl shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
      
      {/* Background Glow Effect */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-[100px] rounded-full opacity-20 pointer-events-none ${isSuccess ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />

      {/* Status Icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 z-10 ${isSuccess ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#EF4444]/20 text-[#EF4444]'}`}>
        <span className="material-symbols-outlined text-[48px]">
          {isSuccess ? 'check_circle' : 'error'}
        </span>
      </div>

      {/* Headers */}
      <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 z-10">
        {isSuccess ? 'Deposit Successful' : 'Deposit Failed'}
      </h1>
      <p className="text-[#86948A] mb-8 font-mono text-sm z-10">
        {isSuccess ? 'Your Gasit balance has been officially updated.' : (message ? decodeURIComponent(message) : 'We encountered an error processing your transaction.')}
      </p>

      {/* Receipt Data Block */}
      <div className="w-full bg-[#0A0A0B] border border-[#3C4A42] rounded-xl p-6 text-left z-10 space-y-4 font-mono text-sm">
        {amount && isSuccess && (
           <div className="flex justify-between items-center border-b border-[#3C4A42]/50 pb-4">
             <span className="text-[#86948A]">Amount Deposited</span>
             <span className="text-white font-bold text-lg">₦{amount}</span>
           </div>
        )}
        
        <div className="flex flex-col gap-1">
           <span className="text-[#86948A] text-xs">Reference ID</span>
           <span className="text-white truncate">{reference || 'N/A'}</span>
        </div>
        
        <div className="flex flex-col gap-1">
           <span className="text-[#86948A] text-xs">Timestamp</span>
           <span className="text-white">{new Date().toLocaleString()}</span>
        </div>
        
        {!isSuccess && (
           <div className="mt-4 p-3 bg-opacity-10 bg-error border border-error/50 rounded text-error text-xs italic">
             Do not worry, failed or pending verification processes will still be settled automatically via our redundant background webhook if the payment was charged.
           </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => router.push("/dashboard")}
        className="w-full mt-8 bg-[#3C4A42] text-white hover:bg-[#10B981] hover:text-[#003824] font-bold text-lg py-4 rounded-xl transition-all z-10"
      >
        Return to Dashboard
      </button>
    </div>
  );
}

export default function DepositStatusPage() {
  return (
    <main className="min-h-screen pt-16 bg-[#0A0A0B]">
      <TopNavBar />
      <div className="max-w-lg mx-auto px-6 py-24">
        <Suspense fallback={
          <div className="bg-[#1C1B1C] border border-[#3C4A42] p-10 rounded-2xl shadow-2xl flex flex-col items-center text-center animate-pulse">
            <div className="w-20 h-20 rounded-full bg-[#3C4A42]/20 mb-6" />
            <div className="h-8 w-48 bg-[#3C4A42]/20 rounded mb-4" />
            <div className="h-4 w-64 bg-[#3C4A42]/20 rounded mb-8" />
            <div className="w-full h-48 bg-[#0A0A0B] border border-[#3C4A42] rounded-xl" />
          </div>
        }>
          <DepositStatusContent />
        </Suspense>
      </div>
    </main>
  );
}
