import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, BookOpen, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Study Assistant
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Heading */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              What do you want to do?
            </h1>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Choose a feature below to get started with your study journey.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chat Card */}
            <Link
              to="/chat"
              className="group relative flex flex-col items-center text-center p-8 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 mb-5 group-hover:bg-emerald-500/20 transition-colors">
                <MessageCircle
                  className="w-6 h-6 text-emerald-400"
                  strokeWidth={1.5}
                />
              </div>
              <h2 className="text-base font-semibold mb-2">Chat with AI</h2>
              <p className="text-sm text-zinc-400 mb-6 max-w-[24ch]">
                Ask questions, get explanations, and chat with an AI tutor in
                real time.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 group-hover:gap-2.5 transition-all">
                Start chatting
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </span>
            </Link>

            {/* Study Plan Card */}
            <Link
              to="/study-plan"
              className="group relative flex flex-col items-center text-center p-8 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 mb-5 group-hover:bg-emerald-500/20 transition-colors">
                <BookOpen
                  className="w-6 h-6 text-emerald-400"
                  strokeWidth={1.5}
                />
              </div>
              <h2 className="text-base font-semibold mb-2">Study Plan</h2>
              <p className="text-sm text-zinc-400 mb-6 max-w-[24ch]">
                Create a personalized study roadmap with AI-powered workflow and
                progress tracking.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 group-hover:gap-2.5 transition-all">
                Create plan
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-zinc-800/60 text-center">
        <p className="text-xs text-zinc-500">
          Assignment 3 - AI Product Engineering
        </p>
      </footer>
    </div>
  );
}
