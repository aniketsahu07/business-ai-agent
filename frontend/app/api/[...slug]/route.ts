import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

// Handle pdf, url, text ingest and vectorstore/reset — all proxied to backend
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const path = params.slug.join("/");
    const searchParams = req.nextUrl.searchParams.toString();
    const backendURL = `${BACKEND}/api/${path}${searchParams ? `?${searchParams}` : ""}`;

    const contentType = req.headers.get("content-type") || "";
    let fetchOptions: RequestInit;

    if (contentType.includes("multipart/form-data")) {
      // PDF upload — forward raw formdata
      const formData = await req.formData();
      fetchOptions = { method: "POST", body: formData as any };
    } else {
      fetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: req.body ? await req.text() : undefined,
      };
    }

    const res = await fetch(backendURL, fetchOptions);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    const path = params.slug.join("/");
    const res = await fetch(`${BACKEND}/api/${path}`, { method: "DELETE" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
