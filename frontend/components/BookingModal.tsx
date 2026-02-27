"use client";

import { useState } from "react";
import { X, CheckCircle } from "lucide-react";
import axios from "axios";

const API_URL = "";   // Use Next.js proxy routes (same-origin)

interface Props {
  onClose: () => void;
}

export default function BookingModal({ onClose }: Props) {
  const [form, setForm]       = useState({ name: "", phone: "", email: "", service: "", preferred_time: "" });
  const [loading, setLoading] = useState(false);
  const [booked, setBooked]   = useState<string | null>(null);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.service) {
      setError("Name, Phone, and Service are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/api/book`, form);
      setBooked(res.data.booking_id);
    } catch {
      setError("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        {booked ? (
          /* ── Success State ── */
          <div className="text-center py-6">
            <CheckCircle size={52} className="text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-800 mb-1">Booking Confirmed! 🎉</h2>
            <p className="text-gray-500 text-sm mb-1">Your Booking ID:</p>
            <p className="font-mono font-bold text-indigo-600 text-lg">{booked}</p>
            <p className="text-gray-400 text-xs mt-3">Our team will contact you within 24 hours.</p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Book an Appointment</h2>
            <p className="text-sm text-gray-500 mb-5">Fill in your details and we'll confirm shortly.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input label="Full Name *" value={form.name}           onChange={v => setForm(f => ({ ...f, name: v }))}   placeholder="Rahul Sharma" />
              <Input label="Phone Number *" value={form.phone}       onChange={v => setForm(f => ({ ...f, phone: v }))}  placeholder="+91 98765 43210" type="tel" />
              <Input label="Email (optional)" value={form.email}     onChange={v => setForm(f => ({ ...f, email: v }))}  placeholder="rahul@email.com" type="email" />
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Service *</label>
                <select
                  value={form.service}
                  onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-400 transition-colors bg-white"
                >
                  <option value="">-- Select a service --</option>
                  <option value="Personal Training">Personal Training</option>
                  <option value="Group Fitness Classes">Group Fitness Classes</option>
                  <option value="Yoga & Meditation">Yoga & Meditation</option>
                  <option value="Nutrition Counseling">Nutrition Counseling</option>
                  <option value="Physiotherapy">Physiotherapy</option>
                  <option value="Membership Enquiry">Membership Enquiry</option>
                </select>
              </div>
              <Input label="Preferred Time (optional)" value={form.preferred_time} onChange={v => setForm(f => ({ ...f, preferred_time: v }))} placeholder="e.g. Monday 10 AM" />

              {error && <p className="text-red-500 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm transition-colors mt-1"
              >
                {loading ? "Booking…" : "Confirm Booking"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-400 transition-colors"
      />
    </div>
  );
}
