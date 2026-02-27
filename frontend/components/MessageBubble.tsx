"use client";

import ReactMarkdown from "react-markdown";

export interface Message {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  timestamp: Date;
  sources?:  string[];
  intent?:   string;
}

const INTENT_BADGE: Record<string, string> = {
  booking: "bg-green-100 text-green-700",
  pricing: "bg-amber-100 text-amber-700",
  query:   "bg-indigo-100 text-indigo-700",
};

export default function MessageBubble({
  message,
  agentName,
}: {
  message:   Message;
  agentName: string;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Agent avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          {agentName[0]}
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isUser
              ? "bg-indigo-600 text-white rounded-br-sm"
              : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm"
          }`}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown
              components={{
                p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-indigo-600">{children}</strong>,
                ul:     ({ children }) => <ul className="list-disc list-inside mt-1 space-y-0.5">{children}</ul>,
                li:     ({ children }) => <li>{children}</li>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-gray-400" suppressHydrationWarning>
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {message.intent && !isUser && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${INTENT_BADGE[message.intent] ?? INTENT_BADGE.query}`}>
              {message.intent}
            </span>
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {message.sources.map(src => (
              <span key={src} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                📄 {src.length > 40 ? src.slice(0, 40) + "…" : src}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
          U
        </div>
      )}
    </div>
  );
}
