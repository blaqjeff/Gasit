export const JUPITER_API_URL = 'https://quote-api.jup.ag/v6'; // Standard V6 for public access
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
}

/**
 * Fetches a quote from Jupiter for a swap pair.
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number, // in raw atomic units
  slippageBps = 50
): Promise<QuoteResponse | null> {
  const url = `/api/jupiter/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&t=${Date.now()}`;
  
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`Jupiter Quote Failed: ${res.statusText}`);
    const data = await res.json();
    return data as QuoteResponse;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Fetches the base64 serialized swap transaction from Jupiter.
 */
export async function getJupiterSwapTx(
  quoteResponse: QuoteResponse,
  userWalletPubkey: string
): Promise<string | null> {
  try {
    const res = await fetch(`/api/jupiter/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: userWalletPubkey,
        wrapAndUnwrapSol: true,
        computeUnitPriceMicroLamports: "auto" // Auto priority fees
      }),
    });
    
    if (!res.ok) throw new Error(`Jupiter Swap Failed: ${res.statusText}`);
    const { swapTransaction } = await res.json();
    return swapTransaction as string; // Base64 encoded transaction
  } catch (error) {
    console.error(error);
    return null;
  }
}
