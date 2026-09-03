-- Phase 1: RLS so each user can only read/write their own data.
-- exercises additionally exposes the shared catalog (created_by_user_id is null) as read-only,
-- and workout_programs/program_days/program_day_exercises expose is_template rows as read-only.

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_programs enable row level security;
alter table public.program_days enable row level security;
alter table public.program_day_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;

-- profiles

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_delete_own" on public.profiles
  for delete using (id = auth.uid());

-- exercises: read the shared catalog plus your own custom entries; only manage your own

create policy "exercises_select_catalog_and_own" on public.exercises
  for select using (created_by_user_id is null or created_by_user_id = auth.uid());

create policy "exercises_insert_own" on public.exercises
  for insert with check (created_by_user_id = auth.uid());

create policy "exercises_update_own" on public.exercises
  for update using (created_by_user_id = auth.uid());

create policy "exercises_delete_own" on public.exercises
  for delete using (created_by_user_id = auth.uid());

-- workout_programs: read your own plus system templates; only manage your own

create policy "workout_programs_select_own_or_template" on public.workout_programs
  for select using (user_id = auth.uid() or is_template);

create policy "workout_programs_insert_own" on public.workout_programs
  for insert with check (user_id = auth.uid());

create policy "workout_programs_update_own" on public.workout_programs
  for update using (user_id = auth.uid());

create policy "workout_programs_delete_own" on public.workout_programs
  for delete using (user_id = auth.uid());

-- program_days: scoped through the parent program

create policy "program_days_select_own_or_template" on public.program_days
  for select using (
    exists (
      select 1 from public.workout_programs p
      where p.id = program_days.program_id
        and (p.user_id = auth.uid() or p.is_template)
    )
  );

create policy "program_days_insert_own" on public.program_days
  for insert with check (
    exists (
      select 1 from public.workout_programs p
      where p.id = program_days.program_id and p.user_id = auth.uid()
    )
  );

create policy "program_days_update_own" on public.program_days
  for update using (
    exists (
      select 1 from public.workout_programs p
      where p.id = program_days.program_id and p.user_id = auth.uid()
    )
  );

create policy "program_days_delete_own" on public.program_days
  for delete using (
    exists (
      select 1 from public.workout_programs p
      where p.id = program_days.program_id and p.user_id = auth.uid()
    )
  );

-- program_day_exercises: scoped through program_days -> workout_programs

create policy "program_day_exercises_select_own_or_template" on public.program_day_exercises
  for select using (
    exists (
      select 1 from public.program_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = program_day_exercises.program_day_id
        and (p.user_id = auth.uid() or p.is_template)
    )
  );

create policy "program_day_exercises_insert_own" on public.program_day_exercises
  for insert with check (
    exists (
      select 1 from public.program_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = program_day_exercises.program_day_id and p.user_id = auth.uid()
    )
  );

create policy "program_day_exercises_update_own" on public.program_day_exercises
  for update using (
    exists (
      select 1 from public.program_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = program_day_exercises.program_day_id and p.user_id = auth.uid()
    )
  );

create policy "program_day_exercises_delete_own" on public.program_day_exercises
  for delete using (
    exists (
      select 1 from public.program_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = program_day_exercises.program_day_id and p.user_id = auth.uid()
    )
  );

-- workout_sessions: direct user ownership

create policy "workout_sessions_select_own" on public.workout_sessions
  for select using (user_id = auth.uid());

create policy "workout_sessions_insert_own" on public.workout_sessions
  for insert with check (user_id = auth.uid());

create policy "workout_sessions_update_own" on public.workout_sessions
  for update using (user_id = auth.uid());

create policy "workout_sessions_delete_own" on public.workout_sessions
  for delete using (user_id = auth.uid());

-- set_logs: scoped through workout_sessions

create policy "set_logs_select_own" on public.set_logs
  for select using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = set_logs.workout_session_id and s.user_id = auth.uid()
    )
  );

create policy "set_logs_insert_own" on public.set_logs
  for insert with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = set_logs.workout_session_id and s.user_id = auth.uid()
    )
  );

create policy "set_logs_update_own" on public.set_logs
  for update using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = set_logs.workout_session_id and s.user_id = auth.uid()
    )
  );

create policy "set_logs_delete_own" on public.set_logs
  for delete using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = set_logs.workout_session_id and s.user_id = auth.uid()
    )
  );
