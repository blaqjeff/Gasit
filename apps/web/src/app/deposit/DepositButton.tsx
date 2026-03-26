"use client";

import { usePaystackPayment } from "react-paystack";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { verifyPaystackPayment } from "@/lib/api-client";

interface DepositButtonProps {
  amount: string;
  paymentMethod: "card" | "bank" | null;
  publicKey: PublicKey | null;
  connected: boolean;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  onSuccess: () => Promise<void>;
}

export default function DepositButton({
  amount,
  paymentMethod,
  publicKey,
  connected,
  isProcessing,
  setIsProcessing,
  onSuccess,
}: DepositButtonProps) {
  const router = useRouter();

  // Initialize Paystack Config
  const config = {
    reference: new Date().getTime().toString(),
    email: "user@gasit.com",
    amount: (parseFloat(amount) || 0) * 100, // Paystack expects lowest denomination (Kobo)
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    metadata: {
      custom_fields: [],
      walletAddress: publicKey?.toString() || "",
      origin: "web_deposit",
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

    setIsProcessing(true);
    initializePayment({
      onSuccess: async (reference: any) => {
        try {
          setIsProcessing(true);
          await verifyPaystackPayment(reference.reference);
          await onSuccess(); // Refresh history
          router.push(
            `/deposit/status?status=success&amount=${amount}&reference=${reference.reference}`
          );
        } catch (err: any) {
          console.error("Verification error:", err);
          router.push(
            `/deposit/status?status=error&message=${encodeURIComponent(
              err.message
            )}&reference=${reference.reference}`
          );
        } finally {
          setIsProcessing(false);
        }
      },
      onClose: () => {
        setIsProcessing(false);
        console.log("Payment window closed.");
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleDeposit}
      disabled={!connected || isProcessing || !amount || !paymentMethod}
      className="w-full bg-primary flex justify-center items-center text-on-primary font-bold text-lg py-4 rounded hover:brightness-110 disabled:opacity-50 transition-all"
    >
      {isProcessing ? (
        <span className="animate-spin material-symbols-outlined mr-2">refresh</span>
      ) : null}
      {!connected
        ? "Connect Wallet"
        : isProcessing
        ? "Initializing..."
        : "Proceed to Payment"}
    </button>
  );
}
