import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const inputMint = searchParams.get('inputMint');
  const outputMint = searchParams.get('outputMint');
  const amount = searchParams.get('amount');
  const slippageBps = searchParams.get('slippageBps') || '50';

  try {
    const url = `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'x-api-key': process.env.JUPITER_API_KEY || ''
      }
    });
    
    // Fallback if jupiter API returns text (like 403 Forbidden HTML)
    if (!res.ok) {
        const text = await res.text();
        console.error("Jupiter Quote Proxy Error", text);
        return NextResponse.json({ error: text }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
