-- Fixes found in code review of the initial schema/policies:
-- 1. workout_sessions insert/update didn't verify the program_day belongs to the caller.
-- 2. program_day_exercises and set_logs insert/update didn't verify exercise_id is visible
--    to the caller (catalog entry or their own custom exercise).
-- 3. is_template was unconstrained: any user could flip their own program to is_template = true
--    and have it exposed to every other user via the "own or template" select policies. The
--    constraint below is bidirectional (is_template <=> user_id is null) so the two columns
--    can never drift into an orphaned, unowned-and-not-a-template row either.
-- 4. The ownership-check subquery was copy-pasted across policies (which is how #1 happened) —
--    extracted into shared helper functions so every policy uses the same logic. The two
--    program_day-scoped helpers now compose the program-scoped ones instead of re-deriving the
--    same join, so the ownership/visibility rule only lives in one place.
-- 5. workout_sessions.program_day_id cascaded on delete, so removing a program_day (or its
--    whole parent program) silently wiped every historical workout_session — and, transitively,
--    set_logs — scheduled or completed against it. Changed to set null: history survives, it
--    just loses its link to a since-deleted day. (exercise_id below stays restrict rather than
--    set null/cascade — losing which exercise a set was for would make that history useless.
--    That does mean a full "delete my account" cascade can still conflict with a custom
--    exercise still in use elsewhere; nothing in PLAN.md ships account deletion yet, so this is
--    a known follow-up for whenever that feature is built, not a Phase 1 concern.)
-- All 6 helper functions are security definer: they're pure boolean predicates already fully
-- expressed by their own WHERE clause, so evaluating them with RLS re-applied on top (security
-- invoker) was pure redundant work — every policy call re-ran the referenced table's own SELECT
-- policy a second time for no additional safety.

alter table public.workout_programs
  add constraint workout_programs_template_has_no_owner
  check (is_template = (user_id is null));

-- Helper predicates, shared across policies below so ownership logic only lives in one place.

create function public.owns_program(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.workout_programs p
    where p.id = target_program_id and p.user_id = auth.uid()
  );
$$;

create function public.can_view_program(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.workout_programs p
    where p.id = target_program_id and (p.user_id = auth.uid() or p.is_template)
  );
$$;

create function public.owns_program_day(target_program_day_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.program_days d
    where d.id = target_program_day_id and public.owns_program(d.program_id)
  );
$$;

create function public.can_view_program_day(target_program_day_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.program_days d
    where d.id = target_program_day_id and public.can_view_program(d.program_id)
  );
$$;

create function public.owns_workout_session(target_workout_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.workout_sessions s
    where s.id = target_workout_session_id and s.user_id = auth.uid()
  );
$$;

create function public.exercise_visible(target_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.exercises e
    where e.id = target_exercise_id
      and (e.created_by_user_id is null or e.created_by_user_id = auth.uid())
  );
$$;

-- program_days: reuse owns_program / can_view_program instead of inline joins

drop policy "program_days_select_own_or_template" on public.program_days;
create policy "program_days_select_own_or_template" on public.program_days
  for select using (public.can_view_program(program_id));

drop policy "program_days_insert_own" on public.program_days;
create policy "program_days_insert_own" on public.program_days
  for insert with check (public.owns_program(program_id));

drop policy "program_days_update_own" on public.program_days;
create policy "program_days_update_own" on public.program_days
  for update using (public.owns_program(program_id));

drop policy "program_days_delete_own" on public.program_days;
create policy "program_days_delete_own" on public.program_days
  for delete using (public.owns_program(program_id));

-- program_day_exercises: reuse can_view_program_day / owns_program_day / exercise_visible

drop policy "program_day_exercises_select_own_or_template" on public.program_day_exercises;
create policy "program_day_exercises_select_own_or_template" on public.program_day_exercises
  for select using (public.can_view_program_day(program_day_id));

drop policy "program_day_exercises_insert_own" on public.program_day_exercises;
create policy "program_day_exercises_insert_own" on public.program_day_exercises
  for insert with check (
    public.owns_program_day(program_day_id) and public.exercise_visible(exercise_id)
  );

drop policy "program_day_exercises_update_own" on public.program_day_exercises;
create policy "program_day_exercises_update_own" on public.program_day_exercises
  for update using (
    public.owns_program_day(program_day_id) and public.exercise_visible(exercise_id)
  );

drop policy "program_day_exercises_delete_own" on public.program_day_exercises;
create policy "program_day_exercises_delete_own" on public.program_day_exercises
  for delete using (public.owns_program_day(program_day_id));

-- workout_sessions: insert/update now verify program_day ownership too

drop policy "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own" on public.workout_sessions
  for insert with check (
    user_id = auth.uid() and public.owns_program_day(program_day_id)
  );

drop policy "workout_sessions_update_own" on public.workout_sessions;
create policy "workout_sessions_update_own" on public.workout_sessions
  for update using (
    user_id = auth.uid() and public.owns_program_day(program_day_id)
  );

-- set_logs: reuse owns_workout_session / exercise_visible on every command

drop policy "set_logs_select_own" on public.set_logs;
create policy "set_logs_select_own" on public.set_logs
  for select using (public.owns_workout_session(workout_session_id));

drop policy "set_logs_insert_own" on public.set_logs;
create policy "set_logs_insert_own" on public.set_logs
  for insert with check (
    public.owns_workout_session(workout_session_id) and public.exercise_visible(exercise_id)
  );

drop policy "set_logs_update_own" on public.set_logs;
create policy "set_logs_update_own" on public.set_logs
  for update using (
    public.owns_workout_session(workout_session_id) and public.exercise_visible(exercise_id)
  );

drop policy "set_logs_delete_own" on public.set_logs;
create policy "set_logs_delete_own" on public.set_logs
  for delete using (public.owns_workout_session(workout_session_id));

-- Make the exercise_id FKs' delete behavior explicit (was already the implicit default):
-- deleting a still-referenced exercise is blocked rather than silently orphaning the
-- program/log row that names it.

alter table public.program_day_exercises
  drop constraint program_day_exercises_exercise_id_fkey,
  add constraint program_day_exercises_exercise_id_fkey
    foreign key (exercise_id) references public.exercises (id) on delete restrict;

alter table public.set_logs
  drop constraint set_logs_exercise_id_fkey,
  add constraint set_logs_exercise_id_fkey
    foreign key (exercise_id) references public.exercises (id) on delete restrict;

-- workout_sessions.program_day_id: cascade -> set null (see note 5 above).

alter table public.workout_sessions
  alter column program_day_id drop not null,
  drop constraint workout_sessions_program_day_id_fkey,
  add constraint workout_sessions_program_day_id_fkey
    foreign key (program_day_id) references public.program_days (id) on delete set null;
