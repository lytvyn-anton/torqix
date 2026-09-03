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
