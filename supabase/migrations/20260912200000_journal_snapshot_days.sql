-- Phase 7: give each journal its own copy of the days/exercises it was started from,
-- instead of reading the program's live program_days/program_day_exercises. "Create journal
-- from this program" / "Start a journal from this program" only ever set journals.program_id
-- and had journal_entries.program_day_id reference the program's live rows, so editing the
-- program after journaling against it could retroactively change what an already-started
-- journal shows/logs against. journals.program_id itself stays — display provenance and
-- resolveJournalForProgram's dedup lookup, not a source of truth for logging any more.

create table public.journal_days (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals (id) on delete cascade,
  name text not null,
  order_index smallint not null default 0
);

create index journal_days_journal_id_idx on public.journal_days (journal_id);

create table public.journal_day_exercises (
  id uuid primary key default gen_random_uuid(),
  journal_day_id uuid not null references public.journal_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  order_index smallint not null default 0,
  sets smallint,
  reps smallint,
  target_weight numeric(6, 2),
  rest_seconds smallint,
  note text
);

create index journal_day_exercises_journal_day_id_idx
  on public.journal_day_exercises (journal_day_id);
create index journal_day_exercises_exercise_id_idx
  on public.journal_day_exercises (exercise_id);

-- journal_entries moves from the program's live program_days to the journal's own cloned
-- journal_days — same on delete set null (day gone, entry survives with a blank day label),
-- same nullability (an entry can still be logged with no day picked at all). Dev project, no
-- production journal_entries data to migrate (see the Phase 5 journal-pivot migration for the
-- same reasoning applied to workout_sessions/set_logs). The insert/update policies reference
-- program_day_id directly, so they have to go before the column does — recreated further
-- down, pointing at journal_day_id instead.
drop policy "journal_entries_insert_own" on public.journal_entries;
drop policy "journal_entries_update_own" on public.journal_entries;

alter table public.journal_entries
  drop column program_day_id,
  add column journal_day_id uuid references public.journal_days (id) on delete set null;

create index journal_entries_journal_day_id_idx on public.journal_entries (journal_day_id);

alter table public.journal_days enable row level security;
alter table public.journal_day_exercises enable row level security;

create function public.owns_journal_day(target_journal_day_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.journal_days d
    where d.id = target_journal_day_id and public.owns_journal(d.journal_id)
  );
$$;

-- journal_days: scoped through the parent journal (owns_journal, from the journal-pivot
-- migration) — no "or is_template" branch, unlike program_days: a journal is never shared.

create policy "journal_days_select_own" on public.journal_days
  for select using (public.owns_journal(journal_id));

create policy "journal_days_insert_own" on public.journal_days
  for insert with check (public.owns_journal(journal_id));

create policy "journal_days_update_own" on public.journal_days
  for update using (public.owns_journal(journal_id));

create policy "journal_days_delete_own" on public.journal_days
  for delete using (public.owns_journal(journal_id));

-- journal_day_exercises: scoped through journal_days -> journals, plus exercise_visible on
-- writes — same shape as program_day_exercises.

create policy "journal_day_exercises_select_own" on public.journal_day_exercises
  for select using (public.owns_journal_day(journal_day_id));

create policy "journal_day_exercises_insert_own" on public.journal_day_exercises
  for insert with check (
    public.owns_journal_day(journal_day_id) and public.exercise_visible(exercise_id)
  );

create policy "journal_day_exercises_update_own" on public.journal_day_exercises
  for update using (
    public.owns_journal_day(journal_day_id) and public.exercise_visible(exercise_id)
  );

create policy "journal_day_exercises_delete_own" on public.journal_day_exercises
  for delete using (public.owns_journal_day(journal_day_id));

-- journal_entries: recreate the insert/update policies dropped above, now checking
-- journal_day_id ownership instead of program_day_id.

create policy "journal_entries_insert_own" on public.journal_entries
  for insert with check (
    user_id = auth.uid()
    and public.owns_journal(journal_id)
    and (journal_day_id is null or public.owns_journal_day(journal_day_id))
  );

create policy "journal_entries_update_own" on public.journal_entries
  for update using (
    user_id = auth.uid()
    and public.owns_journal(journal_id)
    and (journal_day_id is null or public.owns_journal_day(journal_day_id))
  );

grant select, insert, update, delete on
  public.journal_days,
  public.journal_day_exercises
to authenticated;
