# assignment-tiga-monorepo

Assignment 3 — AI Product Engineering with TypeScript

## Overview

Full-stack monorepo with 4 core requirements: monorepo structure, layered architecture (data/AI/presentation), agentic workflow, and chat streaming.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   apps/frontend                   │
│  React + Vite + TanStack Router + Tailwind CSS    │
│  @anvia/react (streaming chat)                    │
│  Polling-based study plan UI                      │
└──────────────────┬───────────────────────────────┘
                   │ HTTP / SSE
┌──────────────────▼───────────────────────────────┐
│                   apps/api                        │
│  Hono HTTP server (port 8000)                     │
│                                                    │
│  ┌─────────────────┐   ┌──────────────────┐      │
│  │  Chat Module     │   │  Study Plan Module│      │
│  │  POST /chats     │   │  GET/POST /study- │      │
│  │  SSE streaming   │   │  plans/:id        │      │
│  └─────────────────┘   └────────┬───────────┘      │
│                                 │ BullMQ Worker     │
│                        ┌────────▼───────────┐      │
│                        │  Agentic Workflow   │      │
│                        │  (background job)   │      │
│                        └────────────────────┘      │
└──────────────────┬───────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────┐
│  Data Layer                                       │
│  PostgreSQL (Prisma) + Redis (BullMQ queue)       │
└──────────────────────────────────────────────────┘
```

## Features

### Agentic Workflow — Study Plan Generator

A 7-step agentic pipeline that creates personalized study roadmaps:

1. **Analyze** — LLM assesses learner profile, skill gaps, learning priorities
2. **Research** — LLM generates search queries → Tavily API fetches real resources → LLM extracts structured findings
3. **Fan-Out** — 3 specialists run in parallel: Curriculum Designer, Subject Expert, Learning Coach
4. **Synthesize** — Merge all 3 perspectives into one cohesive draft
5. **Evaluate** — Score 5 criteria (personalization, actionability, completeness, structure, resource quality)
6. **Revise** — Up to 2 revision loops with feedback from evaluation
7. **Finalize** — Polish into a learner-ready document

**Concepts:** Multi-step agent orchestration, tool calling (web research), parallel LLM fan-out, evaluation-driven revision loop, background job processing

### Chat Streaming

Real-time streaming chat with AI via SSE (Server-Sent Events). Frontend uses `@anvia/react` `useChat` hook for token-by-token streaming with loading and error states.

**Concepts:** Streaming responses, SSE protocol, React hooks for real-time UI

## Tech Stack

- **Monorepo:** pnpm workspaces
- **API:** Hono, `@anvia/server` (SSE), `@anvia/core` (structured output), `@anvia/openai` (OpenAI-compatible client)
- **Data:** Prisma + PostgreSQL, Redis + BullMQ (job queue)
- **AI:** OpenAI-compatible LLM, Tavily web search API, Zod (schema validation)
- **Frontend:** React 19, Vite, TanStack Router, Tailwind CSS v4, `@anvia/react` (streaming chat)

## Setup

```bash
pnpm install
```

Create a `.env` file in the root:

```
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=your_base_url
TAVILY_API_KEY=your_key
DATABASE_URL=postgresql://postgres:postgres@localhost:15432/postgres
```

Start infrastructure:

```bash
docker compose -f docker-compose.dev.yaml up -d
```

Run database migration:

```bash
pnpm --filter=api db:migrate
```

## Run

```bash
# Start API server + frontend
pnpm dev

# Start background worker (separate terminal)
pnpm worker:dev
```

- Frontend: http://localhost:3000
- API: http://localhost:8000