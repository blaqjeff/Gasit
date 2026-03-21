"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { TopNavBar } from "@/components/TopNavBar";
import { usePaystackPayment } from "react-paystack";
import { verifyPaystackPayment } from "@/lib/api-client";

export default function DepositPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();

  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Paystack Config
  const config = {
    reference: (new Date()).getTime().toString(),
    email: "user@gasit.com", // Since Gasit doesn't enforce email logins, we use a placeholder or ask the user. We'll use a placeholder.
    amount: (parseFloat(amount) || 0) * 100, // Paystack expects lowest denomination (Kobo)
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    metadata: {
      custom_fields: [],
      walletAddress: publicKey?.toString() || ""
    },
    channels: paymentMethod ? [paymentMethod] : undefined,
  };

  const initializePayment = usePaystackPayment(config);

  const handleDeposit = () => {
    if (!connected || !publicKey) {
      alert("Please connect your wallet first.");
      return;
    }
    
    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    if (!amount || parseFloat(amount) < 100) {
      alert("Please enter a valid amount (minimum ₦100).");
      return;
    }

    // Since Paystack hook requires email, we use a default as we are an anonymous Web3 app
    setIsProcessing(true);
    initializePayment({
      onSuccess: async (reference: any) => {
        try {
           setIsProcessing(true);
           await verifyPaystackPayment(reference.reference);
           router.push(`/deposit/status?status=success&amount=${amount}&reference=${reference.reference}`);
        } catch (err: any) {
           console.error("Verification error:", err);
           router.push(`/deposit/status?status=error&message=${encodeURIComponent(err.message)}&reference=${reference.reference}`);
        } finally {
           setIsProcessing(false);
        }
      },
      onClose: () => {
        setIsProcessing(false);
        console.log("Payment window closed.");
      }
    });
  };

  return (
    <main className="min-h-screen pt-16 bg-[#0A0A0B]">
      <TopNavBar />
      <div className="max-w-xl mx-auto px-6 py-20">
        <div className="bg-[#1C1B1C] border border-[#3C4A42] p-8 rounded-xl shadow-2xl">
          <h1 className="text-3xl font-extrabold tracking-tighter mb-2 text-white">Deposit Funds</h1>
          <p className="text-[#86948A] mb-8 font-mono text-xs uppercase tracking-wider">Fund your Relayer Balance</p>

          <div className="space-y-8">
            {/* Amount Input */}
            <div>
              <label className="block text-xs font-mono text-[#86948A] uppercase tracking-widest mb-3">
                Amount (NGN)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86948A] font-bold">₦</span>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full bg-[#0A0A0B] border border-[#3C4A42] rounded-lg py-4 pl-10 pr-4 text-white font-mono placeholder:text-[#3C4A42] hover:border-[#86948A] focus:border-[#10B981] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-mono text-[#86948A] uppercase tracking-widest mb-3">
                Select Option
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank")}
                  className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                    paymentMethod === "bank" 
                      ? "bg-[#10B981]/10 border-[#10B981] text-[#10B981]" 
                      : "bg-[#0A0A0B] border-[#3C4A42] text-[#86948A] hover:border-[#86948A]"
                  }`}
                >
                  <span className="material-symbols-outlined text-4xl mb-3">account_balance</span>
                  <span className="font-bold tracking-tight">Bank Transfer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                    paymentMethod === "card" 
                      ? "bg-[#10B981]/10 border-[#10B981] text-[#10B981]" 
                      : "bg-[#0A0A0B] border-[#3C4A42] text-[#86948A] hover:border-[#86948A]"
                  }`}
                >
                  <span className="material-symbols-outlined text-4xl mb-3">credit_card</span>
                  <span className="font-bold tracking-tight">Card</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                type="button" 
                onClick={handleDeposit}
                disabled={!connected || isProcessing || !amount || !paymentMethod}
                className="w-full bg-[#10B981] flex justify-center items-center text-[#003824] font-bold text-lg py-4 rounded hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {isProcessing ? (
                  <span className="animate-spin material-symbols-outlined mr-2">refresh</span>
                ) : null}
                {!connected ? "Connect Wallet" : isProcessing ? "Initializing..." : "Proceed to Payment"}
              </button>
              {!connected && (
                <p className="text-center text-error text-xs mt-3 uppercase tracking-wideset font-mono">
                  Wallet connection required to deposit.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
