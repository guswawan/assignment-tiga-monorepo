import { createCompletion } from "@anvia/core";
import { z } from "zod";
import { getModel } from "../../utils/openai.js";
import { prisma } from "../../utils/prisma.js";
import {
  ANALYZE_PROMPT,
  ANALYZE_SCHEMA,
  RESEARCH_QUERY_PROMPT,
  RESEARCH_QUERY_SCHEMA,
  RESEARCH_EXTRACT_PROMPT,
  RESEARCH_EXTRACT_SCHEMA,
  CURRICULUM_DESIGNER_PROMPT,
  SUBJECT_EXPERT_PROMPT,
  LEARNING_COACH_PROMPT,
  SYNTHESIZE_PROMPT,
  EVALUATE_PROMPT,
  EVALUATE_SCHEMA,
  FINALIZE_PROMPT,
} from "./prompts.js";

// ── Zod schemas for parsing structured outputs ──

const AnalyzeOutput = z.object({
  learnerProfile: z.string(),
  skillGaps: z.array(z.string()),
  learningPriorities: z.array(
    z.object({ topic: z.string(), reason: z.string() })
  ),
  estimatedWeeks: z.number(),
  learningStyle: z.string(),
});

const ResearchQueryOutput = z.object({
  queries: z.array(z.string()),
});

const EvaluateOutput = z.object({
  personalization: z.number(),
  actionability: z.number(),
  completeness: z.number(),
  structure: z.number(),
  resourceQuality: z.number(),
  feedback: z.string(),
  overallPass: z.boolean(),
});

// ── Tavily API ──

const TAVILY_API_URL = "https://api.tavily.com/search";

async function tavilySearch(query: string): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not set, skipping research");
    return null;
  }

  try {
    const res = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 3,
      }),
    });

    if (!res.ok) {
      console.warn(`Tavily search failed for "${query}": ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string }[];
    };

    const results = (data.results || []).map(
      (r) =>
        `${r.title || "Untitled"}\n${r.url || ""}\n${r.content || ""}`
    );

    return results.join("\n\n---\n\n") || null;
  } catch (err) {
    console.warn(`Tavily search error for "${query}":`, err);
    return null;
  }
}

// ── LLM helpers ──

async function llmText(instructions: string, input: string): Promise<string> {
  const model = getModel();
  const result = await createCompletion(model, { instructions, input });
  return result.text;
}

async function llmStructured<T>(
  instructions: string,
  input: string,
  outputSchema: Record<string, unknown>,
  zodSchema: z.ZodSchema<T>
): Promise<T> {
  const model = getModel();
  const result = await createCompletion(model, {
    instructions,
    input,
    outputSchema: outputSchema as import("@anvia/core").JsonObject,
  });
  return zodSchema.parse(JSON.parse(result.text));
}

// ── Step 1: Analyze ──

async function analyze(
  topic: string,
  currentLevel: string,
  targetGoal: string,
  hoursPerWeek: number,
  extraNotes?: string
): Promise<z.infer<typeof AnalyzeOutput>> {
  const { system, user } = ANALYZE_PROMPT(topic, currentLevel, targetGoal, hoursPerWeek, extraNotes);
  return llmStructured(system, user, ANALYZE_SCHEMA as Record<string, unknown>, AnalyzeOutput);
}

// ── Step 2: Research ──

async function research(
  analysis: Record<string, unknown>,
  topic: string
): Promise<Record<string, unknown> | null> {
  // Generate search queries
  const { system, user } = RESEARCH_QUERY_PROMPT(analysis);
  const { queries } = await llmStructured(
    system,
    user,
    RESEARCH_QUERY_SCHEMA as Record<string, unknown>,
    ResearchQueryOutput
  );

  // Run searches in parallel
  const searchResults = (
    await Promise.all(
      queries.map(async (query: string) => {
        const content = await tavilySearch(query);
        return { query, content };
      })
    )
  ).filter((r) => r.content !== null);

  if (searchResults.length === 0) {
    console.warn("All Tavily searches returned empty, skipping research extraction");
    return null;
  }

  // Extract findings
  const extractPrompts = RESEARCH_EXTRACT_PROMPT(
    searchResults as { query: string; content: string }[],
    topic
  );
  const model = getModel();
  const result = await createCompletion(model, {
    instructions: extractPrompts.system,
    input: extractPrompts.user,
    outputSchema: RESEARCH_EXTRACT_SCHEMA,
  });

  return JSON.parse(result.text) as Record<string, unknown>;
}

// ── Step 3: Parallel Fan-Out ──

async function fanOut(
  analysis: Record<string, unknown>,
  research: Record<string, unknown> | null,
  targetGoal: string,
  currentLevel: string
): Promise<{ curriculum: string; expert: string; coach: string }> {
  const curriculumPrompt = CURRICULUM_DESIGNER_PROMPT(analysis, research);
  const expertPrompt = SUBJECT_EXPERT_PROMPT(analysis, research);
  const coachPrompt = LEARNING_COACH_PROMPT(analysis, targetGoal, currentLevel);

  const [curriculumResult, expertResult, coachResult] = await Promise.allSettled([
    llmText(curriculumPrompt.system, curriculumPrompt.user),
    llmText(expertPrompt.system, expertPrompt.user),
    llmText(coachPrompt.system, coachPrompt.user),
  ]);

  const curriculum =
    curriculumResult.status === "fulfilled" ? curriculumResult.value : "";
  const expert = expertResult.status === "fulfilled" ? expertResult.value : "";
  const coach = coachResult.status === "fulfilled" ? coachResult.value : "";

  const failed = [curriculumResult, expertResult, coachResult].filter(
    (r) => r.status === "rejected"
  ).length;

  if (failed > 0) {
    console.warn(`Fan-out: ${failed} specialist(s) failed, continuing with ${3 - failed}`);
  }

  if (!curriculum && !expert && !coach) {
    throw new Error("All specialists failed during fan-out");
  }

  return { curriculum, expert, coach };
}

// ── Step 4-6: Synthesize → Evaluate → Revise (loop) ──

const MAX_REVISIONS = 2;

async function synthesizeAndEvaluate(
  curriculum: string,
  expert: string,
  coach: string
): Promise<string> {
  let draft = await synthesize(curriculum, expert, coach);
  let bestScore = 0;
  let bestDraft = draft;

  for (let attempt = 0; attempt < MAX_REVISIONS; attempt++) {
    const evaluation = await evaluate(draft);

    const avgScore =
      (evaluation.personalization +
        evaluation.actionability +
        evaluation.completeness +
        evaluation.structure +
        evaluation.resourceQuality) /
      5;

    if (avgScore > bestScore) {
      bestScore = avgScore;
      bestDraft = draft;
    }

    if (evaluation.overallPass) {
      return draft;
    }

    console.log(
      `Revision loop ${attempt + 1}: avg=${avgScore.toFixed(1)}, passing=${evaluation.overallPass}`
    );

    if (attempt < MAX_REVISIONS - 1) {
      draft = await synthesize(curriculum, expert, coach, evaluation.feedback);
    }
  }

  console.log(`Max revisions reached. Best score: ${bestScore.toFixed(1)}`);
  return bestDraft;
}

async function synthesize(
  curriculum: string,
  expert: string,
  coach: string,
  evaluationFeedback?: string
): Promise<string> {
  const { system, user } = SYNTHESIZE_PROMPT(curriculum, expert, coach, evaluationFeedback);
  return llmText(system, user);
}

async function evaluate(
  draft: string
): Promise<z.infer<typeof EvaluateOutput>> {
  const { system, user } = EVALUATE_PROMPT(draft);
  return llmStructured(
    system,
    user,
    EVALUATE_SCHEMA as Record<string, unknown>,
    EvaluateOutput
  );
}

// ── Step 7: Finalize ──

async function finalize(draft: string): Promise<string> {
  const { system, user } = FINALIZE_PROMPT(draft);
  return llmText(system, user);
}

// ── Main orchestrator ──

export async function generateStudyPlan(planId: number): Promise<void> {
  const plan = await prisma.studyPlan.findUniqueOrThrow({ where: { id: planId } });
  console.log(`[StudyPlan ${planId}] Starting workflow for "${plan.topic}"`);

  try {
    // Step 1: Analyze
    console.log(`[StudyPlan ${planId}] Step 1: Analyzing...`);
    await prisma.studyPlan.update({
      where: { id: planId },
      data: { status: "processing", currentStep: "analyzing" },
    });

    const analysis = await analyze(
      plan.topic,
      plan.currentLevel,
      plan.targetGoal,
      plan.hoursPerWeek,
      plan.extraNotes ?? undefined
    );
    const analysisObj = analysis as unknown as Record<string, unknown>;
    console.log(`[StudyPlan ${planId}] Step 1: Analyze done`);

    // Skip heavy steps for test — go straight to finalize
    await prisma.studyPlan.update({
      where: { id: planId },
      data: { currentStep: "finalizing" },
    });

    const inputSummary = JSON.stringify(analysisObj, null, 2);
    console.log(`[StudyPlan ${planId}] Step 2: Finalizing...`);
    const result = await finalize(inputSummary);
    console.log(`[StudyPlan ${planId}] Step 2: Finalize done`);

    await prisma.studyPlan.update({
      where: { id: planId },
      data: { status: "done", result, currentStep: "finalizing" },
    });
    console.log(`[StudyPlan ${planId}] Workflow complete`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[StudyPlan ${planId}] Failed:`, message);
    await prisma.studyPlan.update({
      where: { id: planId },
      data: { status: "failed", errorMessage: message },
    });
  }
}