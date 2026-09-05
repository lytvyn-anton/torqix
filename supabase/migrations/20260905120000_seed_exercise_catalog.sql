-- Phase 2: base shared exercise catalog (created_by_user_id null), so program creation
-- and set logging have something real to pick from instead of an empty list.

-- Guards against duplicate rows if this insert is ever re-run by hand (migrations
-- normally only apply once, but nothing stops a manual replay against a live database).
create unique index exercises_catalog_name_unique_idx on public.exercises (name)
  where created_by_user_id is null;

insert into public.exercises (name, muscle_group, equipment) values
  ('Barbell Bench Press', 'chest', array['barbell', 'bench']),
  ('Incline Dumbbell Press', 'chest', array['dumbbells', 'bench']),
  ('Push-up', 'chest', array['bodyweight']),
  ('Overhead Press', 'shoulders', array['barbell']),
  ('Dumbbell Shoulder Press', 'shoulders', array['dumbbells']),
  ('Lateral Raise', 'shoulders', array['dumbbells']),
  ('Pull-up', 'back', array['pull_up_bar', 'bodyweight']),
  ('Lat Pulldown', 'back', array['machine', 'cable']),
  ('Barbell Row', 'back', array['barbell']),
  ('Seated Cable Row', 'back', array['cable', 'machine']),
  ('Deadlift', 'back', array['barbell']),
  ('Back Squat', 'legs', array['barbell']),
  ('Leg Press', 'legs', array['machine']),
  ('Walking Lunge', 'legs', array['dumbbells', 'bodyweight']),
  ('Romanian Deadlift', 'legs', array['barbell']),
  ('Leg Curl', 'legs', array['machine']),
  ('Leg Extension', 'legs', array['machine']),
  ('Standing Calf Raise', 'calves', array['machine', 'bodyweight']),
  ('Barbell Curl', 'biceps', array['barbell']),
  ('Dumbbell Curl', 'biceps', array['dumbbells']),
  ('Tricep Pushdown', 'triceps', array['cable', 'machine']),
  ('Overhead Tricep Extension', 'triceps', array['dumbbells']),
  ('Plank', 'core', array['bodyweight']),
  ('Crunch', 'core', array['bodyweight']),
  ('Hanging Leg Raise', 'core', array['pull_up_bar', 'bodyweight']),
  ('Hip Thrust', 'glutes', array['barbell']),
  ('Kettlebell Swing', 'full_body', array['kettlebell'])
on conflict (name) where created_by_user_id is null do nothing;
