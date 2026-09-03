-- Phase 1: core data model (profiles, exercise catalog, programs, scheduling, logs).

create extension if not exists "pgcrypto";

-- One row per user, extends auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  age smallint,
  height_cm numeric(5, 1),
  weight_kg numeric(5, 1),
  goal text,
  level text,
  equipment text[] not null default '{}',
  session_minutes smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Shared catalog (created_by_user_id null) plus user-added custom exercises.
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text,
  equipment text[] not null default '{}',
  created_by_user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index exercises_created_by_user_id_idx on public.exercises (created_by_user_id);

-- A program belongs to a user, or is a system template (user_id null, is_template true).
create table public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  source text not null default 'manual' check (source in ('manual', 'ai')),
  is_template boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create index workout_programs_user_id_idx on public.workout_programs (user_id);

-- A named day within a program (e.g. "Push day"), reused across scheduled dates.
create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs (id) on delete cascade,
  name text not null,
  order_index smallint not null default 0
);

create index program_days_program_id_idx on public.program_days (program_id);

-- An exercise assigned to a program day, with its target sets/reps/weight.
create table public.program_day_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  order_index smallint not null default 0,
  sets smallint,
  reps smallint,
  target_weight numeric(6, 2),
  rest_seconds smallint,
  note text
);

create index program_day_exercises_program_day_id_idx on public.program_day_exercises (program_day_id);
create index program_day_exercises_exercise_id_idx on public.program_day_exercises (exercise_id);

-- A program day placed on a specific calendar date; status moves planned -> done/skipped.
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_day_id uuid not null references public.program_days (id) on delete cascade,
  scheduled_date date not null,
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index workout_sessions_user_id_idx on public.workout_sessions (user_id);
create index workout_sessions_program_day_id_idx on public.workout_sessions (program_day_id);
create index workout_sessions_scheduled_date_idx on public.workout_sessions (scheduled_date);

-- An actually performed set within a workout session.
create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_index smallint not null,
  reps_done smallint,
  weight numeric(6, 2),
  created_at timestamptz not null default now()
);

create index set_logs_workout_session_id_idx on public.set_logs (workout_session_id);
create index set_logs_exercise_id_idx on public.set_logs (exercise_id);
