import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids');
  
  if (!ids) {
      return NextResponse.json({ error: "Missing ids parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.jup.ag/price/v3?ids=${ids}`, { 
      cache: 'no-store',
      headers: {
        'x-api-key': process.env.JUPITER_API_KEY || ''
      }
    });
    
    if (!res.ok) {
        const text = await res.text();
        console.error("Jupiter Price Proxy Error", text);
        return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
