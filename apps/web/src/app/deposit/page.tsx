"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { TopNavBar } from "@/components/TopNavBar";
import { usePaystackPayment } from "react-paystack";
import { verifyPaystackPayment, fetchUserDeposits, DepositDTO } from "@/lib/api-client";
import { useEffect } from "react";

export default function DepositPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();

  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deposits, setDeposits] = useState<DepositDTO[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    if (publicKey) {
      setLoadingHistory(true);
      const data = await fetchUserDeposits(publicKey.toString());
      setDeposits(data);
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [publicKey]);

  // Initialize Paystack Config
  const config = {
    reference: (new Date()).getTime().toString(),
    email: "user@gasit.com", // Since Gasit doesn't enforce email logins, we use a placeholder or ask the user. We'll use a placeholder.
    amount: (parseFloat(amount) || 0) * 100, // Paystack expects lowest denomination (Kobo)
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    metadata: {
      custom_fields: [],
      walletAddress: publicKey?.toString() || "",
      origin: "web_deposit"
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
           await loadHistory();
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
    <main className="min-h-screen pt-16 bg-background">
      <TopNavBar />
      <div className="max-w-xl mx-auto px-6 py-20">
        <div className="bg-surface-container border border-outline-variant p-8 rounded-xl shadow-2xl">
          <h1 className="text-3xl font-extrabold tracking-tighter mb-2 text-on-surface">Deposit Funds</h1>
          <p className="text-outline mb-8 font-mono text-xs uppercase tracking-wider">Fund your Relayer Balance</p>

          <div className="space-y-8">
            {/* Amount Input */}
            <div>
              <label className="block text-xs font-mono text-outline uppercase tracking-widest mb-3">
                Amount (NGN)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-bold">₦</span>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full bg-background border border-outline-variant rounded-lg py-4 pl-10 pr-4 text-on-surface font-mono placeholder:text-outline-variant hover:border-outline focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-mono text-outline uppercase tracking-widest mb-3">
                Select Option
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank")}
                  className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                    paymentMethod === "bank" 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-background border-outline-variant text-outline hover:border-outline"
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
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-background border-outline-variant text-outline hover:border-outline"
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
                className="w-full bg-primary flex justify-center items-center text-on-primary font-bold text-lg py-4 rounded hover:brightness-110 disabled:opacity-50 transition-all"
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

      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
            <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface">Deposit History</h2>
            <button onClick={loadHistory} className="text-primary hover:bg-primary/5 p-1 rounded transition-colors">
              <span className={`material-symbols-outlined text-sm ${loadingHistory ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-high/30">
                  <th className="px-6 py-3 font-semibold text-outline uppercase">Date</th>
                  <th className="px-6 py-3 font-semibold text-outline uppercase">Amount</th>
                  <th className="px-6 py-3 font-semibold text-outline uppercase">Reference</th>
                  <th className="px-6 py-3 font-semibold text-outline uppercase">Method</th>
                  <th className="px-6 py-3 font-semibold text-outline uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {deposits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-outline italic">
                      {loadingHistory ? "Loading history..." : "No deposits found."}
                    </td>
                  </tr>
                ) : (
                  deposits.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-container-highest/30 transition-colors">
                      <td className="px-6 py-4 text-on-surface">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-on-surface">
                        ₦{d.amountNaira.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-outline font-mono truncate max-w-[120px]" title={d.paystackReference}>
                        {d.paystackReference}
                      </td>
                      <td className="px-6 py-4 text-outline capitalize">
                        {d.paymentMethod}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          d.status === 'SUCCESS' ? 'bg-success/10 text-success' : 
                          d.status === 'PENDING' ? 'bg-warning/10 text-warning' : 
                          'bg-error/10 text-error'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
