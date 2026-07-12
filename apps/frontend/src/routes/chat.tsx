import { useChat } from "@anvia/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Send, Sparkle } from "lucide-react";
import { useRef, useState, useEffect } from "react";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const [input, setInput] = useState("");
  const { send, messages, status } = useChat({
    endpoint: "http://localhost:8000/chats",
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;
    send(input);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-3xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
        <Link
          to="/"
          className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-500 dark:text-zinc-400" strokeWidth={2} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10">
            <Sparkle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Chat with AI
          </h1>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-5"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 mb-5">
              <Sparkle
                className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
                strokeWidth={1.5}
              />
            </div>
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              Ask me anything
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
              Get help with your coursework, explanations, or brainstorm ideas.
            </p>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${isUser
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-800/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  }`}
              >
                {message.parts.map((part) =>
                  part.type === "text" ? (
                    <p key={part.id} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  ) : null
                )}
              </div>
            </div>
          );
        })}

        {status === "streaming" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60">
              <p className="text-sm text-red-600 dark:text-red-400">
                Something went wrong. Please try again.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 px-4 py-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-t border-zinc-200/60 dark:border-zinc-800/60">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 h-11 pl-4 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
            placeholder="Ask anything about your studies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status === "streaming"}
            autoFocus
          />
          <button
            type="submit"
            disabled={status === "streaming" || !input.trim()}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] disabled:opacity-40 disabled:scale-100 transition-all"
          >
            <Send className="w-4 h-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}