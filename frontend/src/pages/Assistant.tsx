import { useEffect, useRef, useState } from "react";
import { postJson } from "../api";
import MessageContent from "../components/assistant/MessageContent";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attribution?: string[];
};

const SUGGESTIONS = [
  "Give me an overview of the selected country",
  "Compare Indonesia to Malaysia",
  "Top 10 countries by GDP",
  "Where is Indonesia located?",
  "Which continent is Ukraine in?",
  "Indonesia and Ukraine from 2023",
  "Summary of key metrics",
];

function sourceLabel(attribution: string[]): string {
  const llm = attribution.find((a) => a.startsWith("LLM:"));
  if (llm) return llm.replace(/^LLM:\s*/, "");
  if (attribution.some((a) => a.toLowerCase().includes("tavily") || a.toLowerCase().includes("web")))
    return "Web search";
  return "Dashboard";
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [model, setModel] = useState("groq");
  const [country] = useState("IDN");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setErr(null);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    try {
      const res = await postJson<{ reply: string; attribution: string[] }>("/api/assistant/chat", {
        message: text,
        countryCode: country || undefined,
      });
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.reply,
        attribution: res.attribution,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setErr(String(e));
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${e}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">
            Analytics Assistant
          </h1>
          <p className="mt-1.5 max-w-4xl text-sm leading-snug text-slate-600 lg:max-w-none">
            Analyst-grade views across financial, demographic, health, and education metrics
            (2000–latest), powered by World Bank WDI, IMF WEO, UNESCO UIS, and UN/WHO. The assistant
            has access to dashboard data and web search — ask about metrics, rankings, methodology,
            or general knowledge.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Model</p>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="groq">Llama 3.3 70B (Groq)</option>
              <option value="tavily">Tavily Web Search</option>
            </select>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </button>
        </div>
      </div>

      <div className="mt-4 flex min-h-[min(400px,70vh)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          ref={scrollRef}
          className="flex flex-1 flex-col overflow-auto p-4 sm:p-5"
        >
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
                !
              </div>
              <p className="max-w-md text-base font-semibold text-slate-900">
                Ask about dashboard data, metrics, and sources — or general knowledge such as a
                country&apos;s location.
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Try one of these (metrics, comparisons, or location) or type your own:
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end gap-3">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-red-50 px-4 py-3 shadow-sm">
                      <p className="text-sm text-slate-800">{msg.content}</p>
                    </div>
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white"
                      aria-hidden
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600"
                      aria-hidden
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <div className="max-w-[85%] flex-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <MessageContent text={msg.content} />
                      {msg.attribution && msg.attribution.length > 0 && (
                        <>
                          <div className="mt-4 border-t border-slate-100 pt-3" />
                          <p className="text-xs text-slate-400">
                            Source: {sourceLabel(msg.attribution)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )
              )}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                    <svg className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-sm text-slate-500">Thinking…</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-4">
          {err && (
            <p className="mb-3 text-sm text-red-600">{err}</p>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask about metrics, sources, methodology, or location..."
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition hover:bg-red-700 disabled:opacity-40"
              aria-label="Send"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
