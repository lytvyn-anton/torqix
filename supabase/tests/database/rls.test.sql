-- RLS regression tests for the Phase 1 schema, plus Phase 7's journal_days/
-- journal_day_exercises (the journal's own one-time clone of a program's days/exercises).
-- Run with: supabase test db --local

begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Fixtures, created as postgres (bypasses RLS) -----------------------------

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'alice@example.com'),
  ('b0000000-0000-0000-0000-00000000000b', 'bob@example.com');

insert into public.profiles (id, goal) values
  ('a0000000-0000-0000-0000-00000000000a', 'build_muscle');

insert into public.workout_programs (id, user_id, name) values
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Alice Program');
insert into public.workout_programs (id, user_id, name, is_template) values
  ('10000000-0000-0000-0000-000000000002', null, 'PPL Template', true);

insert into public.program_days (id, program_id, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Day A');

insert into public.exercises (id, name, created_by_user_id) values
  ('30000000-0000-0000-0000-000000000001', 'Alice Custom Curl', 'a0000000-0000-0000-0000-00000000000a'),
  ('30000000-0000-0000-0000-000000000003', 'Bob Custom Lunge', 'b0000000-0000-0000-0000-00000000000b');
insert into public.exercises (id, name) values
  ('30000000-0000-0000-0000-000000000002', 'Global Squat');

insert into public.journals (id, user_id, program_id, name) values
  ('40000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'Alice Journal');

-- The journal's own one-time clone of "Day A" (see cloneProgramDaysIntoJournal in
-- journalApi.ts) — a separate row from program_days, with no FK back to it.
insert into public.journal_days (id, journal_id, name) values
  ('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000000', 'Day A');

insert into public.journal_entries (id, journal_id, user_id, journal_day_id, entry_date) values
  ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000a', '70000000-0000-0000-0000-000000000001', current_date);

insert into public.program_day_exercises (id, program_day_id, exercise_id, order_index) values
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 1);

insert into public.journal_day_exercises (id, journal_day_id, exercise_id, order_index) values
  ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 1);

insert into public.journal_entry_set_logs (id, journal_entry_id, exercise_id, set_index) values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 1);

-- Table owner bypasses RLS, so this constraint check has to run before we switch role.
select throws_ok(
  $$update public.workout_programs set is_template = true
    where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'A program cannot be flipped to is_template while it still has an owner'
);

-- As Bob: isolation from Alice's private data --------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-00000000000b', true);

select is(
  (select count(*) from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  0::bigint,
  'Bob cannot see Alice''s profile'
);

select is(
  (select count(*) from public.workout_programs where id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'Bob cannot see Alice''s private program'
);

select is(
  (select count(*) from public.workout_programs where id = '10000000-0000-0000-0000-000000000002'),
  1::bigint,
  'Bob can see the system template program'
);

select is(
  (select count(*) from public.exercises where id = '30000000-0000-0000-0000-000000000001'),
  0::bigint,
  'Bob cannot see Alice''s custom exercise'
);

select is(
  (select count(*) from public.exercises where id = '30000000-0000-0000-0000-000000000002'),
  1::bigint,
  'Bob can see the global exercise catalog'
);

select is(
  (select count(*) from public.journal_days where id = '70000000-0000-0000-0000-000000000001'),
  0::bigint,
  'Bob cannot see Alice''s cloned journal day'
);

select is(
  (select count(*) from public.journal_day_exercises where id = '80000000-0000-0000-0000-000000000001'),
  0::bigint,
  'Bob cannot see the exercise on Alice''s cloned journal day'
);

select throws_ok(
  $$insert into public.journal_days (journal_id, name) values
    ('40000000-0000-0000-0000-000000000000', 'Bob''s fake day')$$,
  '42501',
  null,
  'Bob cannot add a day to Alice''s journal'
);

select throws_ok(
  $$insert into public.journal_entries (journal_id, user_id, journal_day_id, entry_date)
    values ('40000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-00000000000b', '70000000-0000-0000-0000-000000000001', current_date)$$,
  '42501',
  null,
  'Bob cannot log a journal entry against Alice''s journal'
);

-- An UPDATE whose USING clause excludes the target row matches zero rows and succeeds
-- silently (no exception) — RLS makes it invisible, not an error. Verify by switching back
-- to the (RLS-exempt) table owner and confirming the value didn't move.

update public.journal_entries set entry_date = current_date + 1
  where id = '40000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select entry_date from public.journal_entries where id = '40000000-0000-0000-0000-000000000001'),
  current_date,
  'Bob''s update to Alice''s journal entry matches zero rows (entry_date unchanged)'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-00000000000b', true);

update public.program_day_exercises set sets = 5
  where id = '50000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select sets from public.program_day_exercises where id = '50000000-0000-0000-0000-000000000001'),
  null::smallint,
  'Bob''s update to an exercise entry on Alice''s program day matches zero rows (sets unchanged)'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-00000000000b', true);

update public.journal_day_exercises set sets = 5
  where id = '80000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select sets from public.journal_day_exercises where id = '80000000-0000-0000-0000-000000000001'),
  null::smallint,
  'Bob''s update to an exercise on Alice''s cloned journal day matches zero rows (sets unchanged)'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-00000000000b', true);

update public.journal_entry_set_logs set reps_done = 12
  where id = '60000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select reps_done from public.journal_entry_set_logs where id = '60000000-0000-0000-0000-000000000001'),
  null::smallint,
  'Bob''s update to a set log on Alice''s journal entry matches zero rows (reps_done unchanged)'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-00000000000b', true);

update public.profiles set goal = 'lose_weight'
  where id = 'a0000000-0000-0000-0000-00000000000a';
reset role;
select is(
  (select goal from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'),
  'build_muscle',
  'Bob''s update to Alice''s profile matches zero rows (goal unchanged)'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-00000000000b', true);

delete from public.workout_programs where id = '10000000-0000-0000-0000-000000000001';
reset role;
select is(
  (select count(*) from public.workout_programs where id = '10000000-0000-0000-0000-000000000001'),
  1::bigint,
  'Bob''s delete of Alice''s program matches zero rows (program still exists)'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-00000000000b', true);

select throws_ok(
  $$insert into public.workout_programs (user_id, name, is_template)
    values (auth.uid(), 'Bob''s fake template', true)$$,
  '23514',
  null,
  'Bob cannot create a program that is both his own and a template'
);

-- As Alice: can manage her own data, still can't reach Bob's private exercise ----

select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-00000000000a', true);

select lives_ok(
  $$insert into public.journal_entries (journal_id, user_id, journal_day_id, entry_date)
    values ('40000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000a', '70000000-0000-0000-0000-000000000001', current_date + 1)$$,
  'Alice can log a journal entry on her own cloned journal day'
);

select lives_ok(
  $$update public.journal_entries set entry_date = current_date + 2
    where id = '40000000-0000-0000-0000-000000000001'$$,
  'Alice can update her own journal entry'
);

select throws_ok(
  $$insert into public.program_day_exercises (program_day_id, exercise_id, order_index)
    values ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 2)$$,
  '42501',
  null,
  'Alice cannot attach Bob''s private exercise to her own program day'
);

select throws_ok(
  $$insert into public.journal_day_exercises (journal_day_id, exercise_id, order_index)
    values ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 2)$$,
  '42501',
  null,
  'Alice cannot attach Bob''s private exercise to her own cloned journal day'
);

-- The whole point of Phase 7: editing/deleting the source program never touches an
-- already-cloned journal. Deleting the program day the journal was cloned from succeeds
-- (no FK from journal_days back to program_days at all) and leaves the clone untouched.
select lives_ok(
  $$delete from public.program_days where id = '20000000-0000-0000-0000-000000000001'$$,
  'Alice can delete the program day her journal was cloned from'
);

select is(
  (select journal_day_id from public.journal_entries where id = '40000000-0000-0000-0000-000000000001'),
  '70000000-0000-0000-0000-000000000001'::uuid,
  'The journal entry''s journal_day_id is unaffected by deleting the source program day'
);

-- Separately, the journal's own day still behaves the old program_days way for its own
-- history: deleting it succeeds and the entry survives with journal_day_id cleared.
select lives_ok(
  $$delete from public.journal_days where id = '70000000-0000-0000-0000-000000000001'$$,
  'Alice can delete a journal day that still has a journal entry logged against it'
);

select is(
  (select journal_day_id from public.journal_entries where id = '40000000-0000-0000-0000-000000000001'),
  null::uuid,
  'The journal entry survives the journal day deletion, with journal_day_id cleared'
);

select * from finish();
rollback;
