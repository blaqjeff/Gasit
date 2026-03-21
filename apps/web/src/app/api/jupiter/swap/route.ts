import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const res = await fetch('https://api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': process.env.JUPITER_API_KEY || ''
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("Jupiter Swap Proxy Error", text);
        return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
