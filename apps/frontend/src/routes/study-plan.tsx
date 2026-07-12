import { api } from "#/utils/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/study-plan")({
  component: StudyPlanPage,
});

const PENDING_KEY = "study-plan-pending-id";

type SubmitStatus = "idle" | "submitting" | "submitted";
type PlanStatus = "pending" | "processing" | "done" | "failed";

interface StudyPlan {
  id: number;
  topic: string;
  currentLevel: string;
  targetGoal: string;
  hoursPerWeek: number;
  extraNotes: string | null;
  status: PlanStatus;
  currentStep: string;
  result: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

const STEP_LABELS: Record<string, string> = {
  queued: "In queue",
  analyzing: "Analyzing your profile",
  planning: "Building study plan",
  finalizing: "Finalizing roadmap",
};

function StudyPlanPage() {
  const [topic, setTopic] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [targetGoal, setTargetGoal] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [extraNotes, setExtraNotes] = useState("");

  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resume from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem(PENDING_KEY);
    if (savedId) {
      const id = Number(savedId);
      setPlanId(id);
      setSubmitStatus("submitted");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitStatus("submitting");
    setSubmitError(null);

    try {
      const res = await api["study-plans"].$post({
        json: { topic, currentLevel, targetGoal, hoursPerWeek, extraNotes },
      });
      const data = (await res.json()) as { studyPlanId: number };
      localStorage.setItem(PENDING_KEY, String(data.studyPlanId));
      setPlanId(data.studyPlanId);
      setSubmitStatus("submitted");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setSubmitStatus("idle");
    }
  }

  function clearPending() {
    localStorage.removeItem(PENDING_KEY);
  }

  // Polling
  useEffect(() => {
    if (planId === null) return;

    async function poll() {
      try {
        const res = await api["study-plans"][":id"].$get({
          param: { id: String(planId) },
        });
        const data = (await res.json()) as StudyPlan;
        setPlan(data);

        if (data.status === "done" || data.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          clearPending();
        }
      } catch {
        // transient error, keep polling
      }
    }

    poll(); // immediate first fetch
    pollRef.current = setInterval(poll, 30000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [planId]);

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-2xl mx-auto">
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
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Study Plan
          </h1>
        </div>
      </header>

      <div className="flex-1 px-6 py-8">
        {/* Status banner (non-blocking) */}
        {submitStatus === "submitted" && plan && plan.status !== "done" && plan.status !== "failed" && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {STEP_LABELS[plan.currentStep] || "Processing..."}
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                Your study plan is being generated. You can leave this page and come back later.
              </p>
            </div>
          </div>
        )}

        {/* Done banner */}
        {submitStatus === "submitted" && plan && plan.status === "done" && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Plan generated successfully
              </p>
              {plan.result && (
                <details className="mt-2">
                  <summary className="text-xs text-emerald-600/70 dark:text-emerald-500/70 cursor-pointer">
                    View result
                  </summary>
                  <div className="mt-2 p-3 rounded-lg bg-white/50 dark:bg-zinc-900/50 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {plan.result}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Failed banner */}
        {submitStatus === "submitted" && plan && plan.status === "failed" && (
          <div className="mb-6 p-4 rounded-xl border border-red-200/60 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Failed to generate plan
              </p>
              <p className="text-xs text-red-500/70 dark:text-red-400/70">
                {plan.errorMessage || "Unknown error occurred"}
              </p>
            </div>
          </div>
        )}

        {/* Form heading */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Create a Study Roadmap
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Tell us what you want to learn and our AI will build a personalized plan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Topic
            </label>
            <input
              type="text"
              className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
              placeholder="e.g. Machine Learning, React, Calculus..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              disabled={submitStatus === "submitting"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Current Level
            </label>
            <input
              type="text"
              className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
              placeholder="e.g. Beginner, Intermediate, Advanced..."
              value={currentLevel}
              onChange={(e) => setCurrentLevel(e.target.value)}
              required
              disabled={submitStatus === "submitting"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Target Goal
            </label>
            <input
              type="text"
              className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
              placeholder="e.g. Build a web app, Pass an exam..."
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              required
              disabled={submitStatus === "submitting"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Hours per Week
            </label>
            <input
              type="number"
              className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
              min={1}
              max={40}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              required
              disabled={submitStatus === "submitting"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Extra Notes
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all resize-none"
              rows={3}
              placeholder="Any specific topics, preferences, or constraints..."
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              disabled={submitStatus === "submitting"}
            />
          </div>

          <button
            type="submit"
            disabled={submitStatus === "submitting"}
            className="w-full h-11 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
          >
            {submitStatus === "submitting" && (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            )}
            {submitStatus === "submitting" ? "Submitting..." : "Generate Study Plan"}
          </button>

          {submitError && (
            <div className="p-4 rounded-xl border border-red-200/60 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30">
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}
        </form>

        {/* Clear plan button */}
        {(submitStatus === "submitted" || submitStatus === "submitting") && (
          <button
            onClick={() => {
              setSubmitStatus("idle");
              setPlan(null);
              setPlanId(null);
              clearPending();
            }}
            className="w-full mt-6 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Clear & Create New Plan
          </button>
        )}
      </div>
    </div>
  );
}