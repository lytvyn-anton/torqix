-- RLS policies alone don't grant table access — Postgres checks schema/table-level
-- privileges before it ever reaches the RLS check, and the initial schema migration never
-- granted those to `authenticated`, causing "permission denied for table X" (42501) on every
-- query even though the RLS policies are correct.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.exercises,
  public.workout_programs,
  public.program_days,
  public.program_day_exercises,
  public.workout_sessions,
  public.set_logs
to authenticated;
