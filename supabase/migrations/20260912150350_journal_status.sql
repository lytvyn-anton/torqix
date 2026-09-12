-- Phase 5 PR 4/4: journals gain an archived state so the Programs screen's Journals list
-- can offer per-row archive/unarchive, same manual-lifecycle shape workout_programs.status
-- already has. No RLS changes needed — journals_update_own already lets the owner update
-- any column on their own row.
alter table public.journals
  add column status text not null default 'active' check (status in ('active', 'archived'));
