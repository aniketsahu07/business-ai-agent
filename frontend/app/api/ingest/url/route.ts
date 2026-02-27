import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const url = searchParams.get("url");
    if (!url) return NextResponse.json({ error: "url param missing" }, { status: 400 });

    const res = await fetch(`${BACKEND}/api/ingest/url?url=${encodeURIComponent(url)}`, {
      method: "POST",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
