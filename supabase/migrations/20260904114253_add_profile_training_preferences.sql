-- Starting hints for AI program generation (Phase 4), not hard constraints — a program can
-- always be created (by the AI, on request, or manually) ignoring these.
alter table public.profiles
  add column available_days_per_week smallint,
  add column training_location text,
  add column split_preference text;
