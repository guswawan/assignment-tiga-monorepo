import type { JsonObject } from "@anvia/core/completion";

// ── Step 1: Analyze ──
export function ANALYZE_PROMPT(
  topic: string,
  currentLevel: string,
  targetGoal: string,
  hoursPerWeek: number,
  extraNotes?: string
) {
  const system = `You are a senior learning strategist. Analyze the learner's profile and produce a structured assessment.

Output JSON with these exact keys:
- learnerProfile: 2-3 sentence summary of the learner's current situation
- skillGaps: array of 3-5 specific gaps between current level and target goal
- learningPriorities: array of 3-5 prioritized topics/sub-skills to focus on, with a short reason for each
- estimatedWeeks: number — how many weeks this plan should span (4-8 weeks, based on ${hoursPerWeek}h/week commitment)
- learningStyle: brief note on what approach suits this learner profile`;

  const user = `Topic: ${topic}
Current Level: ${currentLevel}
Target Goal: ${targetGoal}
Hours Per Week: ${hoursPerWeek}
${extraNotes ? `Extra Notes: ${extraNotes}` : ""}`;

  return { system, user };
}

export const ANALYZE_SCHEMA: JsonObject = {
  type: "object",
  properties: {
    learnerProfile: { type: "string" },
    skillGaps: {
      type: "array",
      items: { type: "string" },
    },
    learningPriorities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          reason: { type: "string" },
        },
        required: ["topic", "reason"],
      },
    },
    estimatedWeeks: { type: "number" },
    learningStyle: { type: "string" },
  },
  required: ["learnerProfile", "skillGaps", "learningPriorities", "estimatedWeeks", "learningStyle"],
};

// ── Step 2a: Research → Generate Queries ──
export function RESEARCH_QUERY_PROMPT(analysis: Record<string, unknown>) {
  const system = `You are a research query generator. Given a learner analysis, generate 3-4 targeted web search queries to find the best learning resources, curriculum structures, and best practices for this topic.

Output JSON:
- queries: array of 3-4 search query strings`;

  const user = JSON.stringify(analysis, null, 2);

  return { system, user };
}

export const RESEARCH_QUERY_SCHEMA: JsonObject = {
  type: "object",
  properties: {
    queries: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["queries"],
};

// ── Step 2b: Research → Extract Findings ──
export function RESEARCH_EXTRACT_PROMPT(
  searchResults: { query: string; content: string }[],
  topic: string
) {
  const system = `You are a research synthesizer. Extract structured learning insights from search results for "${topic}".

Output JSON:
- bestResources: array of { title, url (if available), type (course/book/docs/tool), whyRecommended }
- commonCurriculumPatterns: array of common learning sequences found across sources
- commonPitfalls: array of mistakes beginners make when learning this topic
- bestPractices: array of proven learning strategies for this topic
- toolsAndLibraries: array of essential tools, frameworks, or libraries mentioned`;

  const searchBlock = searchResults
    .map((r) => `### Query: "${r.query}"\n${r.content}`)
    .join("\n\n---\n\n");

  const user = `Search results for "${topic}":\n\n${searchBlock}`;

  return { system, user };
}

export const RESEARCH_EXTRACT_SCHEMA: JsonObject = {
  type: "object",
  properties: {
    bestResources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          type: { type: "string" },
          whyRecommended: { type: "string" },
        },
        required: ["title", "type", "whyRecommended"],
      },
    },
    commonCurriculumPatterns: {
      type: "array",
      items: { type: "string" },
    },
    commonPitfalls: {
      type: "array",
      items: { type: "string" },
    },
    bestPractices: {
      type: "array",
      items: { type: "string" },
    },
    toolsAndLibraries: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["bestResources", "commonCurriculumPatterns", "commonPitfalls", "bestPractices", "toolsAndLibraries"],
};

// ── Step 3a: Curriculum Designer ──
export function CURRICULUM_DESIGNER_PROMPT(
  analysis: Record<string, unknown>,
  research: Record<string, unknown> | null
) {
  const researchContext = research
    ? `\nResearch findings:\n${JSON.stringify(research, null, 2)}`
    : "\nNo research available. Rely on your own knowledge.";

  const system = `You are a curriculum designer. Design a structured weekly learning roadmap.

Output a markdown document with:
- Week-by-week breakdown (4-8 weeks depending on scope)
- Each week: clear topic, specific learning objectives, subtopics
- Prerequisites clearly marked
- Milestones at key checkpoints
- Estimated time allocation per topic
- Progressive difficulty — each week builds on the previous

Be specific. Use concrete technology names, frameworks, and concepts. Avoid vague statements like "learn more about X."`;

  const user = `Learner analysis:\n${JSON.stringify(analysis, null, 2)}${researchContext}`;

  return { system, user };
}

// ── Step 3b: Subject Matter Expert ──
export function SUBJECT_EXPERT_PROMPT(
  analysis: Record<string, unknown>,
  research: Record<string, unknown> | null
) {
  const researchContext = research
    ? `\nResearch findings:\n${JSON.stringify(research, null, 2)}`
    : "\nNo research available. Rely on your own knowledge.";

  const system = `You are a subject matter expert. Validate and enrich the technical accuracy of a learning roadmap.

Output a markdown document with:
- Recommended resources for each major topic (specific books, courses, documentation, tools)
- Common misconceptions to avoid
- Industry best practices and standards
- What to prioritize vs. what can be deferred
- Key projects or exercises that demonstrate real competency
- Warn about outdated or deprecated content if relevant

Be opinionated. Choose the BEST resources, not the most popular ones.`;

  const user = `Learner analysis:\n${JSON.stringify(analysis, null, 2)}${researchContext}`;

  return { system, user };
}

// ── Step 3c: Learning Coach ──
export function LEARNING_COACH_PROMPT(
  analysis: Record<string, unknown>,
  targetGoal: string,
  currentLevel: string
) {
  const system = `You are an experienced learning coach. Personalize the study experience for this specific learner.

Output a markdown document with:
- Motivation strategy tailored to this learner's goal ("${targetGoal}")
- Habit-building tips for ${currentLevel} level learners
- Anti-burnout checkpoints and warning signs
- How to measure progress (concrete metrics, not just "feel confident")
- Practice exercises at the right difficulty level
- Accountability suggestions
- When and how to adjust the plan if falling behind

Write in a supportive, encouraging tone. Address the learner directly.`;

  const user = JSON.stringify(analysis, null, 2);

  return { system, user };
}

// ── Step 4: Synthesize ──
export function SYNTHESIZE_PROMPT(
  curriculum: string,
  expert: string,
  coach: string,
  evaluationFeedback?: string
) {
  const revisionBlock = evaluationFeedback
    ? `\n\nIMPORTANT — Previous evaluation feedback to address:\n${evaluationFeedback}`
    : "";

  const system = `You are a senior learning content editor. Synthesize three specialist perspectives into ONE cohesive, polished study plan.

The three inputs are from:
1. Curriculum Designer — weekly structure and sequence
2. Subject Matter Expert — resources, accuracy, best practices
3. Learning Coach — personalization, motivation, exercises

Your job:
- Combine all three into a single markdown document
- Resolve any contradictions between specialists
- Maintain a clean, scannable structure
- Include: intro, weekly breakdown, resources, exercises, milestones, tips
- Use tables, bullet points, and headers for readability
- Target length: comprehensive but not bloated (aim for 1500-2500 words)

Do NOT just stack the three inputs. Weave them together into one unified plan.${revisionBlock}`;

  const user = `=== CURRICULUM DESIGNER ===\n${curriculum}\n\n=== SUBJECT MATTER EXPERT ===\n${expert}\n\n=== LEARNING COACH ===\n${coach}`;

  return { system, user };
}

// ── Step 5: Evaluate ──
export function EVALUATE_PROMPT(draft: string) {
  const system = `You are a strict quality auditor for study plans. Evaluate the following study plan against 5 criteria.

Score each criterion from 1-10. Be honest and critical — inflated scores hurt the learner.

Output JSON:
- personalization: number (1-10) — how well tailored to the specific learner profile?
- actionability: number (1-10) — can the learner follow this immediately without guessing?
- completeness: number (1-10) — does it cover everything needed to reach the goal?
- structure: number (1-10) — is the weekly breakdown logical and progressive?
- resourceQuality: number (1-10) — are the recommended resources specific and high-quality?
- feedback: string — specific, actionable revision suggestions. What exactly needs improvement?
- overallPass: boolean — true only if ALL scores are >= 7`;

  const user = draft;

  return { system, user };
}

export const EVALUATE_SCHEMA: JsonObject = {
  type: "object",
  properties: {
    personalization: { type: "number" },
    actionability: { type: "number" },
    completeness: { type: "number" },
    structure: { type: "number" },
    resourceQuality: { type: "number" },
    feedback: { type: "string" },
    overallPass: { type: "boolean" },
  },
  required: ["personalization", "actionability", "completeness", "structure", "resourceQuality", "feedback", "overallPass"],
};

// ── Step 7: Finalize ──
export function FINALIZE_PROMPT(draft: string) {
  const system = `You are a final editor. Polish the study plan into a beautiful, learner-ready document.

Do:
- Add a warm, motivating introduction
- Add a brief "How to Use This Plan" section
- Ensure consistent formatting throughout
- Add a "Milestones & Checkpoints" summary section
- Add a short "Final Tips" conclusion
- Fix any formatting issues or inconsistencies
- Keep the plan actionable and scannable

Do NOT:
- Change the actual content or recommendations
- Add generic filler
- Remove specificity`;

  const user = draft;

  return { system, user };
}