# Fitness AI App — Project Plan

## Goal

Learning project: a mobile fitness app where AI generates workout programs
(exercise → sets → reps → weight) and tracks the user's progress (weight and
sets/reps growth over time), giving advice based on that progress.

## Stack

- **Frontend:** React Native + Expo (TypeScript)
- **Backend:** Supabase (free tier) — Postgres, Auth, Storage, Edge Functions
- **AI:** Google Gemini API, key obtained via Google AI Studio (free, no card required).
  Calls go through a Supabase Edge Function so the key never ships in client code.
- **Deployment:** Expo EAS Build. Testing starts on the developer's own phone (Expo Go /
  dev build, free), publishing to the App Store / Google Play (paid developer accounts)
  comes later as a separate step.
- **Testing:** Jest + React Native Testing Library for unit tests; Appium for E2E, scoped to
  critical flows only.

## Data model (draft)

- `profiles` — goal, level, equipment (extends auth.users)
- `exercises` — exercise catalog (name, muscle group, equipment)
- `workout_programs` — a program (ai-generated or manual), belongs to a user
- `program_exercises` — exercise within a program: order, sets, reps, target weight, rest
- `workout_logs` — a specific workout session (date, reference to program)
- `set_logs` — an actually performed set (exercise, reps done, weight, reference to workout_log)

## Phases

We work through phases sequentially, agreeing on and testing each before starting the next —
not in a single prompt.

- **Phase 0 — Setup.** Expo project init, git, Supabase project, `.env`, Gemini API key.
- **Phase 1 — Data & Auth.** Supabase schema (tables above), auth (email/password), profile screen.
- **Phase 2 — Manual tracking (skeleton).** Exercise catalog, manual program creation, set
  logging, basic progress list. Working core app without AI.
- **Phase 3 — Progress visualization.** Charts for weight/reps per exercise over time.
- **Phase 4 — AI #1: program generation.** Edge Function calls Gemini, returns a structured
  JSON workout program based on goal/level/equipment, saved to the DB.
- **Phase 5 — AI #2: progress analysis & advice.** Edge Function analyzes `set_logs`, gives
  advice / suggests program adjustments.
- **Phase 6 — Polish.** UI/UX pass, notifications, offline handling.
- **Phase 7 — Release prep.** EAS Build, app icons, store listings, TestFlight/internal track.

## Status

- [ ] Phase 0
- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
- [ ] Phase 5
- [ ] Phase 6
- [ ] Phase 7
