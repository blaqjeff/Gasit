import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const mints = request.nextUrl.searchParams.get('mints');
  
  if (!mints) {
      return NextResponse.json({ error: "Missing mints parameter" }, { status: 400 });
  }

  try {
    // Jupiter Tokens API for specific mints
    const res = await fetch(`https://tokens.jup.ag/tokens?mints=${mints}`, { 
      cache: 'force-cache', // Metadata changes slowly
      next: { revalidate: 3600 } // Revalidate every hour
    });
    
    if (!res.ok) {
        const text = await res.text();
        console.error("Jupiter Tokens API Error", text);
        return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
