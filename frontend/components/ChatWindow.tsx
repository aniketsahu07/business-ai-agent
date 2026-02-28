"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { v4 as uuidv4 } from "uuid";
import { Send, Mic, MicOff, Paperclip, Trash2, CalendarPlus } from "lucide-react";
import MessageBubble, { Message } from "./MessageBubble";
import BookingModal from "./BookingModal";
import TypingIndicator from "./TypingIndicator";
import axios from "axios";

const API_URL = "";   // Use Next.js proxy routes (same-origin)
// PDF goes directly to Render to bypass Vercel 10s serverless timeout
const DIRECT_BACKEND = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_BACKEND_URL || "")
  : "";

function makeWelcomeMsg(): Message {
  return {
    id: "welcome",
    role: "assistant",
    content:
      "Namaste! 👋 Main aapka AI assistant hoon. Aap mujhse services, pricing, ya appointment ke baare mein kuch bhi pooch sakte hain!\n\nHello! I'm your AI assistant. Ask me anything about our services, pricing, or book an appointment!",
    timestamp: new Date(),
    intent: "query",
  };
}

export default function ChatWindow({ agentName }: { agentName: string }) {
  // Lazy initialisers run only on the client → no SSR/client mismatch
  const [messages, setMessages]         = useState<Message[]>(() => [makeWelcomeMsg()]);
  const [input, setInput]               = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [language, setLanguage]         = useState<"auto" | "en" | "hi">("auto");
  const [showBooking, setShowBooking]   = useState(false);
  const [listening, setListening]       = useState(false);
  const [pdfStatus, setPdfStatus]       = useState("");
  const endRef                          = useRef<HTMLDivElement>(null);
  const fileRef                         = useRef<HTMLInputElement>(null);
  // Generate SESSION_ID once on the client only
  const sessionIdRef                    = useRef<string>("");
  if (!sessionIdRef.current) sessionIdRef.current = uuidv4();

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Clear chat
  const clearChat = () => {
    setMessages([makeWelcomeMsg()]);
    setInput("");
  };

  // Voice input (Web Speech API)
  const toggleMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Use Chrome.");
      return;
    }
    if (listening) { setListening(false); return; }
    const rec = new SpeechRecognition();
    rec.lang = language === "hi" ? "hi-IN" : "en-US";
    rec.interimResults = false;
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onerror  = () => setListening(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => (prev ? prev + " " : "") + transcript);
    };
    rec.start();
  };

  // PDF upload from chat
  const uploadPDF = async (file: File) => {
    setPdfStatus("⏳ Uploading PDF…");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await axios.post(`${DIRECT_BACKEND}/api/ingest/pdf`, form, { timeout: 60000 });
      setPdfStatus(`✅ PDF indexed (${res.data.chunks_created} chunks)`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Unknown error";
      setPdfStatus(`❌ Failed: ${msg}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setPdfStatus(""), 6000);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id:        uuidv4(),
      role:      "user",
      content:   text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/chat`, {
        message:    text,
        session_id: sessionIdRef.current,
        language,
      });

      const data = res.data;
      const botMsg: Message = {
        id:        uuidv4(),
        role:      "assistant",
        content:   data.answer,
        timestamp: new Date(),
        sources:   data.sources,
        intent:    data.intent,
      };
      setMessages(prev => [...prev, botMsg]);

      // Show booking modal only when backend explicitly signals it
      if (data.booking_triggered) {
        setTimeout(() => setShowBooking(true), 800);
      }
    } catch {
      const errMsg: Message = {
        id:        uuidv4(),
        role:      "assistant",
        content:   "⚠️ Sorry, I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
        intent:    "query",
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickReplies = [
    "What are your plans and pricing?",
    "Appointment book karna hai",
    "Do you have a free trial?",
    "Timings kya hain?",
  ];

  const sendQuickReply = (text: string) => {
    setInput(text);
    // tiny delay so state updates before sendMessage reads it
    setTimeout(() => {
      const userMsg: Message = { id: uuidv4(), role: "user", content: text, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);
      axios.post(`${API_URL}/api/chat`, { message: text, session_id: sessionIdRef.current, language })
        .then(res => {
          const d = res.data;
          setMessages(prev => [...prev, { id: uuidv4(), role: "assistant", content: d.answer, timestamp: new Date(), sources: d.sources, intent: d.intent }]);
          if (d.booking_triggered) setTimeout(() => setShowBooking(true), 800);
        })
        .catch(() => {
          setMessages(prev => [...prev, { id: uuidv4(), role: "assistant", content: "⚠️ Sorry, I'm having trouble connecting right now. Please try again.", timestamp: new Date(), intent: "query" }]);
        })
        .finally(() => setIsLoading(false));
    }, 50);
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-xl border border-indigo-100 flex flex-col h-[80vh]">
        {/* ── Chat Header ── */}
        <div className="px-5 py-4 border-b border-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
              {agentName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{agentName}</p>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Online
              </p>
            </div>
          </div>
          {/* Right: Book Appointment + Language Toggle + Clear Chat */}
          <div className="flex items-center gap-2">
            {/* Direct Booking Button */}
            <button
              onClick={() => setShowBooking(true)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors"
            >
              <CalendarPlus size={13} />
              Book
            </button>
            {/* Language Toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-full p-1">
              {(["auto", "en", "hi"] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`text-xs px-3 py-1 rounded-full transition-all font-medium ${
                    language === lang
                      ? "bg-indigo-600 text-white shadow"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {lang === "auto" ? "Auto" : lang === "en" ? "EN" : "हि"}
                </button>
              ))}
            </div>
            {/* Clear Chat */}
            <button
              onClick={clearChat}
              title="Clear conversation"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 chat-scroll">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} agentName={agentName} />
          ))}
          {isLoading && <TypingIndicator agentName={agentName} />}
          <div ref={endRef} />
        </div>

        {/* ── PDF status banner ── */}
        {pdfStatus && (
          <div className="mx-4 mb-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs rounded-xl">{pdfStatus}</div>
        )}

        {/* ── Quick Replies ── */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {quickReplies.map(qr => (
              <button
                key={qr}
                disabled={isLoading}
                onClick={() => sendQuickReply(qr)}
                className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        {/* ── Input Row ── */}
        <div className="px-4 py-3 border-t border-indigo-50">
          {/* Hidden PDF file input */}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => e.target.files?.[0] && uploadPDF(e.target.files[0])}
          />

          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 focus-within:border-indigo-400 transition-colors">
            {/* Paperclip → PDF upload */}
            <button
              onClick={() => fileRef.current?.click()}
              title="Upload PDF to knowledge base"
              className="text-gray-400 hover:text-indigo-500 transition-colors mb-1"
            >
              <Paperclip size={18} />
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything... (Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 resize-none outline-none max-h-28"
            />
            {/* Mic button */}
            <button
              onClick={toggleMic}
              title={listening ? "Stop listening" : "Voice input"}
              className={`mb-1 p-1.5 rounded-xl transition-colors ${
                listening
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : "text-gray-400 hover:text-indigo-500"
              }`}
            >
              {listening ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="mb-1 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 rounded-xl transition-colors"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Powered by HuggingFace AI · RAG-based Sales Agent
          </p>
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {showBooking && <BookingModal onClose={() => setShowBooking(false)} />}
    </>
  );
}
