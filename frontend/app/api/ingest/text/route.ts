import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const text   = searchParams.get("text");
    const source = searchParams.get("source") || "manual";
    if (!text) return NextResponse.json({ error: "text param missing" }, { status: 400 });

    const res = await fetch(
      `${BACKEND}/api/ingest/text?text=${encodeURIComponent(text)}&source=${encodeURIComponent(source)}`,
      { method: "POST" }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
