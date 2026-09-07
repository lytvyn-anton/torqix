-- The old insert-per-tap logging flow had no protection against two rapid taps computing
-- the same set_index (that race is exactly what its client-side code used to guard
-- against), so pre-existing data could already contain duplicate (session, exercise, slot)
-- rows — drop all but the most recent one in each group before the constraint below can be
-- added. (a.created_at, a.id) < (b.created_at, b.id) breaks ties on id so exactly one
-- survivor remains even if two rows share a created_at timestamp.
delete from public.set_logs a
using public.set_logs b
where a.workout_session_id = b.workout_session_id
  and a.exercise_id = b.exercise_id
  and a.set_index = b.set_index
  and (a.created_at, a.id) < (b.created_at, b.id);

-- Enables upserting a set_log by (session, exercise, set slot): the workout screen now
-- autosaves continuously as the user types, updating a set's reps/weight in place rather
-- than accumulating duplicate rows for the same slot on every edit.
alter table public.set_logs
  add constraint set_logs_session_exercise_set_index_key
  unique (workout_session_id, exercise_id, set_index);
