"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload, Link, FileText, Trash2, RefreshCw,
  CheckCircle, XCircle, Download, RotateCcw
} from "lucide-react";
import axios from "axios";

const API_URL = "";   // Use Next.js proxy routes (same-origin)

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"ingest" | "bookings">("ingest");
  const [bookings, setBookings]   = useState<any[]>([]);
  const [loadingBk, setLoadingBk] = useState(false);
  const [status, setStatus]       = useState("");

  // Auto-dismiss status message after 4 s
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(""), 4000);
    return () => clearTimeout(t);
  }, [status]);

  // ── Fetch Bookings ──
  const fetchBookings = async () => {
    setLoadingBk(true);
    try {
      const res = await axios.get(`${API_URL}/api/bookings`);
      setBookings(res.data);
    } catch {
      setStatus("❌ Failed to load bookings.");
    } finally {
      setLoadingBk(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-indigo-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">⚙️ Admin Panel</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["ingest", "bookings"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); if (tab === "bookings") fetchBookings(); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab === "ingest" ? "📄 Data Ingestion" : "📅 Bookings"}
          </button>
        ))}
      </div>

      {status && (
        <div className="mb-4 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm">{status}</div>
      )}

      {activeTab === "ingest" ? (
        <IngestSection onStatus={setStatus} />
      ) : (
        <BookingsTable
          bookings={bookings}
          loading={loadingBk}
          onRefresh={fetchBookings}
          onStatus={setStatus}
          setBookings={setBookings}
        />
      )}
    </div>
  );
}

// ── Data Ingestion ────────────────────────────────────────────
function IngestSection({ onStatus }: { onStatus: (s: string) => void }) {
  const [url, setUrl]       = useState("");
  const [text, setText]     = useState("");
  const fileRef             = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState("");

  const ingestPDF = async (file: File) => {
    setLoading("pdf");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await axios.post(`${API_URL}/api/ingest/pdf`, form);
      onStatus(`✅ PDF indexed: ${res.data.chunks_created} chunks created.`);
    } catch { onStatus("❌ PDF ingestion failed."); }
    finally  { setLoading(""); if (fileRef.current) fileRef.current.value = ""; }
  };

  const ingestURL = async () => {
    if (!url.trim()) return;
    setLoading("url");
    try {
      const res = await axios.post(`${API_URL}/api/ingest/url`, null, { params: { url } });
      onStatus(`✅ URL indexed: ${res.data.chunks_created} chunks.`);
      setUrl("");
    } catch { onStatus("❌ URL ingestion failed."); }
    finally  { setLoading(""); }
  };

  const ingestText = async () => {
    if (!text.trim()) return;
    setLoading("text");
    try {
      const res = await axios.post(`${API_URL}/api/ingest/text`, null, { params: { text, source: "admin_paste" } });
      onStatus(`✅ Text indexed: ${res.data.chunks_created} chunks.`);
      setText("");
    } catch { onStatus("❌ Text ingestion failed."); }
    finally  { setLoading(""); }
  };

  const resetStore = async () => {
    if (!confirm("⚠️ This will delete all indexed data. Continue?")) return;
    try {
      await axios.delete(`${API_URL}/api/vectorstore/reset`);
      onStatus("🗑️ Vector store cleared.");
    } catch { onStatus("❌ Reset failed."); }
  };

  return (
    <div className="space-y-6">
      {/* PDF Upload */}
      <div>
        <h3 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2"><Upload size={15}/> Upload PDF</h3>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
        >
          {loading === "pdf" ? (
            <p className="text-sm text-indigo-500 animate-pulse">⏳ Processing PDF…</p>
          ) : (
            <>
              <Upload size={28} className="mx-auto text-indigo-300 mb-2" />
              <p className="text-sm text-gray-500">Click to upload PDF (brochure, pricing, FAQs)</p>
              <p className="text-xs text-gray-400 mt-1">Max 10 MB</p>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => e.target.files?.[0] && ingestPDF(e.target.files[0])}
        />
      </div>

      {/* URL Ingest */}
      <div>
        <h3 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2"><Link size={15}/> Scrape URL</h3>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && ingestURL()}
            placeholder="https://yourbusiness.com/pricing"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
          />
          <button
            onClick={ingestURL}
            disabled={loading === "url" || !url.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
          >
            {loading === "url" ? "⏳" : "Index"}
          </button>
        </div>
      </div>

      {/* Raw Text */}
      <div>
        <h3 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2"><FileText size={15}/> Paste Business Info</h3>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          placeholder="Paste services, pricing, FAQs, team info, offers etc. here…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{text.length} chars</span>
          <button
            onClick={ingestText}
            disabled={loading === "text" || !text.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
          >
            {loading === "text" ? "⏳ Indexing…" : "Index Text"}
          </button>
        </div>
      </div>

      {/* Reset */}
      <div className="border-t border-red-100 pt-4">
        <button
          onClick={resetStore}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          <Trash2 size={14} /> Reset entire knowledge base
        </button>
      </div>
    </div>
  );
}

// ── Bookings Table ────────────────────────────────────────────
function BookingsTable({
  bookings, loading, onRefresh, onStatus, setBookings,
}: {
  bookings: any[];
  loading: boolean;
  onRefresh: () => void;
  onStatus: (s: string) => void;
  setBookings: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const [actionId, setActionId] = useState<string | null>(null);

  const updateStatus = async (id: string, newStatus: string) => {
    setActionId(id);
    try {
      await axios.patch(`${API_URL}/api/bookings/${id}/status`, { status: newStatus });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      onStatus(`✅ Booking ${id} marked as ${newStatus}.`);
    } catch { onStatus("❌ Status update failed."); }
    finally  { setActionId(null); }
  };

  const deleteBooking = async (id: string) => {
    if (!confirm(`Delete booking ${id}? This cannot be undone.`)) return;
    setActionId(id);
    try {
      await axios.delete(`${API_URL}/api/bookings/${id}`);
      setBookings(prev => prev.filter(b => b.id !== id));
      onStatus(`🗑️ Booking ${id} deleted.`);
    } catch { onStatus("❌ Delete failed."); }
    finally  { setActionId(null); }
  };

  const exportCSV = () => {
    if (bookings.length === 0) return;
    const headers = ["ID","Name","Phone","Email","Service","Preferred Time","Status","Date"];
    const rows = bookings.map(b => [
      b.id, b.name, b.phone, b.email,
      b.service, b.preferred_time, b.status,
      new Date(b.created_at).toLocaleDateString(),
    ]);
    const csv  = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "bookings.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-center text-gray-400 py-8 animate-pulse">Loading bookings…</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{bookings.length} total leads</p>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={bookings.length === 0}
            className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 disabled:opacity-40"
          >
            <Download size={12} /> Export CSV
          </button>
          <button onClick={onRefresh} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>
      {bookings.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No bookings yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["ID","Name","Phone","Service","Time","Status","Date","Actions"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-t border-gray-50 hover:bg-indigo-50/30 transition-colors">
                  <td className="px-3 py-2 font-mono font-bold text-indigo-600">{b.id}</td>
                  <td className="px-3 py-2 font-medium text-gray-700">{b.name}</td>
                  <td className="px-3 py-2 text-gray-500">{b.phone}</td>
                  <td className="px-3 py-2 text-gray-600">{b.service}</td>
                  <td className="px-3 py-2 text-gray-500">{b.preferred_time}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      b.status === "confirmed"  ? "bg-green-100 text-green-700"  :
                      b.status === "cancelled"  ? "bg-red-100 text-red-600"      :
                                                  "bg-amber-100 text-amber-700"
                    }`}>{b.status}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-400" suppressHydrationWarning>{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {/* Confirm / Undo-confirm */}
                      {b.status !== "confirmed" ? (
                        <button title="Confirm" disabled={actionId === b.id}
                          onClick={() => updateStatus(b.id, "confirmed")}
                          className="text-green-500 hover:text-green-700 disabled:opacity-40 transition-colors">
                          <CheckCircle size={14} />
                        </button>
                      ) : (
                        <button title="Mark Pending" disabled={actionId === b.id}
                          onClick={() => updateStatus(b.id, "pending")}
                          className="text-amber-500 hover:text-amber-700 disabled:opacity-40 transition-colors">
                          <RotateCcw size={14} />
                        </button>
                      )}
                      {/* Cancel */}
                      {b.status !== "cancelled" && (
                        <button title="Cancel" disabled={actionId === b.id}
                          onClick={() => updateStatus(b.id, "cancelled")}
                          className="text-orange-400 hover:text-orange-600 disabled:opacity-40 transition-colors">
                          <XCircle size={14} />
                        </button>
                      )}
                      {/* Delete */}
                      <button title="Delete" disabled={actionId === b.id}
                        onClick={() => deleteBooking(b.id)}
                        className="text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
