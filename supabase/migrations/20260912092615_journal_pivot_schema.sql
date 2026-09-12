-- Phase 5: retire workout_sessions/set_logs, replace with an explicitly-saved Journal.
--
-- The old flow autosaved continuously into a "planned" session that could be abandoned
-- mid-flight, which is what let a session end up skipped with its set_logs wiped and no
-- visible confirmation (see PLAN.md's Phase 5 section). A journal_entries row now only ever
-- exists once the user has explicitly saved it — there's no "planned but never finished"
-- state left to leak.

drop table if exists public.set_logs;
drop table if exists public.workout_sessions;
drop function if exists public.owns_workout_session(uuid);

-- A user-created, on-demand notebook tied to a program (not a calendar date).
create table public.journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- SET NULL, not CASCADE: deleting the program shouldn't take the user's logged history
  -- with it, same reasoning as the old workout_sessions.program_day_id.
  program_id uuid references public.workout_programs (id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create index journals_user_id_idx on public.journals (user_id);
create index journals_program_id_idx on public.journals (program_id);

-- One saved training snapshot within a journal. Append-only in the sense that matters for
-- Phase 5: no status column, because a row only ever exists after an explicit Save — there's
-- no "planned but never finished" state to leak. RLS still lets the owner UPDATE a saved
-- entry (e.g. fixing a typo'd rep count) rather than hard-blocking every edit forever.
-- user_id is denormalized from journals.user_id (kept in sync via the RLS insert/update
-- checks below) so ownership checks and the Progress-tab queries only need one join instead
-- of two, mirroring the old workout_sessions.user_id being direct rather than derived
-- through program ownership.
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  program_day_id uuid references public.program_days (id) on delete set null,
  entry_date date not null,
  created_at timestamptz not null default now()
);

create index journal_entries_journal_id_idx on public.journal_entries (journal_id);
create index journal_entries_user_id_idx on public.journal_entries (user_id);
create index journal_entries_program_day_id_idx on public.journal_entries (program_day_id);

-- An actually performed set within a journal entry — same shape as the old set_logs.
create table public.journal_entry_set_logs (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  set_index smallint not null,
  reps_done smallint,
  weight numeric(6, 2),
  created_at timestamptz not null default now(),
  unique (journal_entry_id, exercise_id, set_index)
);

-- No separate index on journal_entry_id: the unique constraint above already leads with it,
-- and Postgres can use that index for a single-column journal_entry_id lookup too (leftmost-
-- prefix rule) — a second index would just be redundant write overhead on every insert.
create index journal_entry_set_logs_exercise_id_idx
  on public.journal_entry_set_logs (exercise_id);

alter table public.journals enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_set_logs enable row level security;

create function public.owns_journal(target_journal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.journals j
    where j.id = target_journal_id and j.user_id = auth.uid()
  );
$$;

create function public.owns_journal_entry(target_journal_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.journal_entries e
    where e.id = target_journal_entry_id and e.user_id = auth.uid()
  );
$$;

-- journals: direct user ownership, plus (when set — program_id is nullable) verifying the
-- referenced program is one of the caller's own.

create policy "journals_select_own" on public.journals
  for select using (user_id = auth.uid());

create policy "journals_insert_own" on public.journals
  for insert with check (
    user_id = auth.uid() and (program_id is null or public.owns_program(program_id))
  );

create policy "journals_update_own" on public.journals
  for update using (
    user_id = auth.uid() and (program_id is null or public.owns_program(program_id))
  );

create policy "journals_delete_own" on public.journals
  for delete using (user_id = auth.uid());

-- journal_entries: insert/update verify the parent journal belongs to the caller, and (when
-- set — program_day_id is nullable) that the referenced program_day is one of the caller's
-- own, same shape as the old workout_sessions_insert_own check.

create policy "journal_entries_select_own" on public.journal_entries
  for select using (user_id = auth.uid());

create policy "journal_entries_insert_own" on public.journal_entries
  for insert with check (
    user_id = auth.uid()
    and public.owns_journal(journal_id)
    and (program_day_id is null or public.owns_program_day(program_day_id))
  );

create policy "journal_entries_update_own" on public.journal_entries
  for update using (
    user_id = auth.uid()
    and public.owns_journal(journal_id)
    and (program_day_id is null or public.owns_program_day(program_day_id))
  );

create policy "journal_entries_delete_own" on public.journal_entries
  for delete using (user_id = auth.uid());

-- journal_entry_set_logs: scoped through journal_entries, plus exercise_visible on writes —
-- same shape as the old set_logs policies.

create policy "journal_entry_set_logs_select_own" on public.journal_entry_set_logs
  for select using (public.owns_journal_entry(journal_entry_id));

create policy "journal_entry_set_logs_insert_own" on public.journal_entry_set_logs
  for insert with check (
    public.owns_journal_entry(journal_entry_id) and public.exercise_visible(exercise_id)
  );

create policy "journal_entry_set_logs_update_own" on public.journal_entry_set_logs
  for update using (
    public.owns_journal_entry(journal_entry_id) and public.exercise_visible(exercise_id)
  );

create policy "journal_entry_set_logs_delete_own" on public.journal_entry_set_logs
  for delete using (public.owns_journal_entry(journal_entry_id));

grant select, insert, update, delete on
  public.journals,
  public.journal_entries,
  public.journal_entry_set_logs
to authenticated;
