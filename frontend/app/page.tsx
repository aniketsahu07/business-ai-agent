"use client";

import ChatWindow from "@/components/ChatWindow";
import AdminPanel from "@/components/AdminPanel";
import { useState } from "react";
import { Bot, Settings } from "lucide-react";

const BUSINESS_NAME = process.env.NEXT_PUBLIC_BUSINESS_NAME || "Business AI Agent";
const AGENT_NAME    = process.env.NEXT_PUBLIC_AGENT_NAME    || "Aria";

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
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
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
          >
            <Settings size={16} />
            Admin
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {showAdmin ? (
          <AdminPanel />
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
