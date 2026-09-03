# Fitness AI App

Learning project: a mobile fitness app where AI generates workout programs and tracks the
user's progress. Stack, data model, and phases live in [PLAN.md](PLAN.md).

## Sources of truth

- **PLAN.md** — stack, data model, phase breakdown. Read this first when starting a new session.
- **AGENTS.md** — Expo moves fast; read it before touching Expo/React Native APIs so you're
  looking at docs for the SDK version actually installed here.
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

- Feature-scaffolding skills (e.g. a future `/new-screen`) and a multi-agent orchestrator are
  deliberately deferred until Phase 2+, once there's an actual repeated code pattern worth
  automating. Revisit then rather than building speculative tooling now.
- Exception: the `ship` skill (see below) — it encodes a fixed process, not a code pattern,
  so it doesn't need repetition to justify itself.
- Use built-in Agent subagent types ad hoc (e.g. Explore, code-reviewer) for genuinely
  isolated research/review tasks in the meantime, not a standing pipeline.

## Git workflow

- **Never commit directly to `main`.** All work happens on a feature branch, opened as a PR,
  merged into `main` only after CI is green.
- Branch naming: `phase-<n>/<short-description>` for phase work, `fix/<short-description>` for
  bugfixes outside a phase.
- GitHub Actions CI (`.github/workflows/ci.yml`) runs on every PR: lint, format check, unit
  tests. `main` has branch protection requiring that check to pass before the merge button
  unlocks — no required review (solo project, no second account to approve).
- Use the `ship` skill (`.claude/skills/ship/SKILL.md`) to run this workflow end to end:
  branch → commit → push → open PR → wait for CI → merge → clean up the branch.
- Repo: https://github.com/lytvyn-anton/torqix (private).

## How we work

- Go through PLAN.md phases sequentially, not in one giant prompt.
- Agree on each phase before starting it, test it before moving to the next.
- After finishing a task, update its status in the Notion task tracker
  (Not started → In progress → Done), and check off the phase in PLAN.md once it's fully done.
- All documentation (this file, PLAN.md, Notion, code comments, commit messages) is written
  in English. Conversation in chat follows whatever language the user uses.
- Use the `design` skill for UI mockups/wireframes before building screens for a phase,
  once that phase's data/logic work is agreed on.
