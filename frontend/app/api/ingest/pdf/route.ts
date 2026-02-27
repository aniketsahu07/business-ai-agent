import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    // Parse the incoming formData from the browser
    const incomingForm = await req.formData();
    const file = incomingForm.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Re-build a fresh FormData to forward to the Python backend
    const outForm = new FormData();
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type || "application/pdf" });
    outForm.append("file", blob, file.name);

    const res = await fetch(`${BACKEND}/api/ingest/pdf`, {
      method: "POST",
      body: outForm,   // fetch sets Content-Type + boundary automatically
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Backend error: ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
