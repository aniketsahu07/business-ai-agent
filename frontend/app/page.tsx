"use client";

import ChatWindow from "@/components/ChatWindow";
import AdminPanel from "@/components/AdminPanel";
import { useState, useEffect, useRef } from "react";
import { Bot, Settings, Lock, Eye, EyeOff, LogOut } from "lucide-react";

const BUSINESS_NAME  = process.env.NEXT_PUBLIC_BUSINESS_NAME  || "Business AI Agent";
const AGENT_NAME     = process.env.NEXT_PUBLIC_AGENT_NAME     || "Aria";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin@123";
const SESSION_KEY    = "admin_auth";

export default function Home() {
  const [showAdmin, setShowAdmin]           = useState(false);
  const [isAdminAuth, setIsAdminAuth]       = useState(false);
  const [showModal, setShowModal]           = useState(false);
  const [passwordInput, setPasswordInput]   = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [authError, setAuthError]           = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore auth from sessionStorage on mount
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      setIsAdminAuth(true);
    }
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (showModal) setTimeout(() => inputRef.current?.focus(), 80);
  }, [showModal]);

  const handleAdminClick = () => {
    if (isAdminAuth) {
      setShowAdmin(prev => !prev);
    } else {
      setPasswordInput("");
      setAuthError("");
      setShowModal(true);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setIsAdminAuth(true);
      setShowModal(false);
      setShowAdmin(true);
      setPasswordInput("");
      setAuthError("");
    } else {
      setAuthError("❌ Incorrect password. Please try again.");
      setPasswordInput("");
      inputRef.current?.focus();
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAdminAuth(false);
    setShowAdmin(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Password Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center mb-6">
              <div className="bg-indigo-600 rounded-full p-3 mb-3">
                <Lock size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Admin Login</h2>
              <p className="text-sm text-gray-500 mt-1 text-center">Enter the admin password to continue</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setAuthError(""); }}
                  placeholder="Password"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {authError && (
                <p className="text-red-500 text-xs text-center">{authError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full text-gray-400 hover:text-gray-600 text-sm py-1"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white border-b border-indigo-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 rounded-xl p-2">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-none">{BUSINESS_NAME}</h1>
              <p className="text-xs text-indigo-500">Powered by {AGENT_NAME} AI · 24/7 Available</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdminAuth && (
              <button
                onClick={handleLogout}
                title="Logout from Admin"
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                <LogOut size={15} />
                Logout
              </button>
            )}
            <button
              onClick={handleAdminClick}
              className={`flex items-center gap-2 text-sm transition-colors px-3 py-1.5 rounded-lg ${
                isAdminAuth
                  ? "text-indigo-600 bg-indigo-50 font-medium"
                  : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              <Settings size={16} />
              Admin {isAdminAuth && "✓"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {showAdmin && isAdminAuth ? (
          <AdminPanel onLogout={handleLogout} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Chat – takes 2/3 width on desktop */}
            <div className="lg:col-span-2">
              <ChatWindow agentName={AGENT_NAME} />
            </div>
            {/* Sidebar */}
            <div className="flex flex-col gap-4">
              <FeatureCard
                emoji="🎯"
                title="Smart Sales Pitch"
                desc="AI reads your business data and gives personalised answers to every lead."
              />
              <FeatureCard
                emoji="📅"
                title="Auto Appointment Booking"
                desc="Collects name & phone mid-conversation and saves the lead instantly."
              />
              <FeatureCard
                emoji="🌐"
                title="Hindi + English"
                desc="Responds in the language your customer uses – no setup needed."
              />
              <FeatureCard
                emoji="🔍"
                title="Semantic Search"
                desc="Even with spelling mistakes AI finds the right product/service."
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm">
      <div className="text-2xl mb-2">{emoji}</div>
      <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}
