# Fitness AI App

Learning project: a mobile fitness app where AI generates workout programs and tracks the
user's progress. Stack, data model, and phases live in [PLAN.md](PLAN.md).

## Sources of truth
- **PLAN.md** — stack, data model, phase breakdown. Read this first when starting a new session.
- **Notion "Fitness AI App — Tasks"** — https://app.notion.com/p/4334509b5bd84f34bc061ccbf82adf64
  Concrete per-phase tasks with statuses (Not started / In progress / Done).
  Check it before starting work to see what's already done and what's queued.

## Stack (short)
- React Native + Expo (TypeScript)
- Supabase (Postgres, Auth, Storage, Edge Functions) — free tier
- AI: Google Gemini API, key from Google AI Studio, calls go through a Supabase Edge Function
  (key never ships in client code)
- Testing: Jest + React Native Testing Library (unit), Appium (E2E, critical flows only)

## Coding conventions
- TypeScript strict mode. Functional components + hooks, no class components.
- Feature-based folder structure: `src/features/<feature>/{components,hooks,api,types.ts}`
  (e.g. `auth`, `programs`, `workouts`, `progress`), plus `src/shared` for cross-feature code.
- Server state (Supabase reads/writes) via TanStack Query; local UI state via plain
  `useState`/`useReducer`. No global state library unless a real cross-feature need shows up.
- ESLint + Prettier from Phase 0 onward; keep the codebase lint-clean as we go rather than
  batching cleanup later.
- Every phase ships tests for what it ships — unit tests are not deferred to a later phase.
- E2E (Appium) covers critical user flows only (auth, create program, log a set, view
  progress) — not exhaustive screen-by-screen coverage.

## Agents / skills / orchestration
- No custom skills or multi-agent orchestrator yet — deliberately deferred until Phase 2+,
  once there's an actual repeated pattern (e.g. the shape of "screen + hook + test") worth
  automating. Revisit then rather than building speculative tooling now.
- Use built-in Agent subagent types ad hoc (e.g. Explore, code-reviewer) for genuinely
  isolated research/review tasks in the meantime, not a standing pipeline.

## How we work
- Go through PLAN.md phases sequentially, not in one giant prompt.
- Agree on each phase before starting it, test it before moving to the next.
- After finishing a task, update its status in the Notion task tracker
  (Not started → In progress → Done), and check off the phase in PLAN.md once it's fully done.
- Commit to git in logical chunks, not one giant commit per phase.
- All documentation (this file, PLAN.md, Notion, code comments, commit messages) is written
  in English. Conversation in chat follows whatever language the user uses.
- Use the `design` skill for UI mockups/wireframes before building screens for a phase,
  once that phase's data/logic work is agreed on.
