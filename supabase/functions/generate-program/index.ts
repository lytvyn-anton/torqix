// Phase 4: calls Gemini to generate a workout program from the caller's profile and the
// exercise catalog, then resolves and persists it. Deliberately thin on the Gemini side —
// prompt/schema construction and response parsing live in ../_shared/generateProgram.ts so
// they can be unit-tested under Jest; this file is the Deno glue (auth, DB reads/writes,
// the Gemini HTTP call). The DB-write path (saveGeneratedProgram below) can't be unit-tested
// the same way (no Deno JSR imports under Jest) and duplicates createProgram's insert logic
// (src/features/programs/api/programsApi.ts) — an accepted tradeoff for persisting
// server-side with the caller's own RLS-scoped session rather than round-tripping the
// generated program back to the client to save through the existing client-side path.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
  REQUIRED_PROFILE_FIELD_NAMES,
  buildGenerateProgramPrompt,
  buildGenerateProgramResponseSchema,
  getMissingProfileFields,
  parseGeneratedProgram,
  resolveGeneratedProgram,
  toGenerateProgramRequest,
  type GenerateProgramCatalogExercise,
  type GeminiGenerateContentResponse,
  type ProfileProgramFields,
  type ResolvedProgram,
} from '../_shared/generateProgram.ts';

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash';

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (error) {
    console.error('Unhandled error in generate-program', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return jsonResponse({ error: 'Server misconfiguration' }, 500);
  }

  // Scoped to the caller's own JWT (not the service role) so RLS applies exactly as it does
  // for a normal client request — the exercises query below naturally comes back as the
  // shared catalog plus this user's own custom exercises, nothing more.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401);
  }

  const [{ data: profileRow, error: profileError }, { data: exerciseRows, error: exercisesError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'goal, level, training_location, equipment, split_preference, available_days_per_week, session_minutes',
        )
        .eq('id', user.id)
        .single(),
      supabase.from('exercises').select('id, name, muscle_group, equipment').order('name'),
    ]);

  if (profileError && profileError.code !== 'PGRST116') {
    // Anything other than "no rows" (connection blip, RLS misconfiguration, column rename)
    // is a genuine server-side failure, not the caller's incomplete profile.
    console.error('Failed to load profile', profileError);
    return jsonResponse({ error: 'Failed to load profile' }, 500);
  }
  if (!profileRow) {
    // PGRST116 ("no rows") is the expected case for a user who hasn't filled in a profile
    // yet — nothing creates a `profiles` row automatically on signup. Reported the same way
    // as an incomplete-but-present profile (400 + missingFields) rather than a 404, so the
    // client's single "go complete your profile" path (see generateProgram in
    // src/features/programs/api/programsApi.ts) covers this, most common, first-run case too.
    return jsonResponse(
      {
        error: 'Complete your profile before generating a program',
        missingFields: [...REQUIRED_PROFILE_FIELD_NAMES],
      },
      400,
    );
  }
  if (exercisesError) {
    console.error('Failed to load exercise catalog', exercisesError);
    return jsonResponse({ error: 'Failed to load exercise catalog' }, 500);
  }

  const profile: ProfileProgramFields = {
    goal: profileRow.goal,
    level: profileRow.level,
    trainingLocation: profileRow.training_location,
    equipment: profileRow.equipment ?? [],
    splitPreference: profileRow.split_preference,
    availableDaysPerWeek: profileRow.available_days_per_week,
    sessionMinutes: profileRow.session_minutes,
  };
  const missingFields = getMissingProfileFields(profile);
  if (missingFields.length > 0) {
    return jsonResponse(
      { error: 'Complete your profile before generating a program', missingFields },
      400,
    );
  }

  const catalog: GenerateProgramCatalogExercise[] = (exerciseRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
  }));
  if (catalog.length === 0) {
    return jsonResponse({ error: 'No exercises available to build a program from' }, 400);
  }

  const generateRequest = toGenerateProgramRequest(profile);
  const prompt = buildGenerateProgramPrompt(generateRequest, catalog);
  const responseSchema = buildGenerateProgramResponseSchema(generateRequest, catalog);

  let resolvedProgram: ResolvedProgram;
  try {
    const geminiResponse = await callGemini(geminiApiKey, prompt, responseSchema);
    const generatedProgram = parseGeneratedProgram(geminiResponse);
    resolvedProgram = resolveGeneratedProgram(generatedProgram, catalog);
  } catch (error) {
    console.error('Program generation failed', error);
    return jsonResponse({ error: 'Failed to generate a program' }, 502);
  }

  try {
    const program = await saveGeneratedProgram(supabase, user.id, resolvedProgram);
    return jsonResponse({ program }, 200);
  } catch (error) {
    console.error('Failed to save generated program', error);
    return jsonResponse({ error: 'Failed to save the generated program' }, 500);
  }
}

type SavedProgram = { id: string; name: string; status: string; createdAt: string };

// Inserts the resolved program (workout_programs -> program_days -> program_day_exercises)
// and archives the caller's other active programs, mirroring createProgram's behavior
// (src/features/programs/api/programsApi.ts) so an AI-generated program becomes the user's
// one active program the same way a manually created one does. Sequential writes, cleaned
// up via deleteOrphanedProgram on failure, for the same reason createProgram is: no
// client-side transaction API against Postgres from here either.
async function saveGeneratedProgram(
  supabase: SupabaseClient,
  userId: string,
  program: ResolvedProgram,
): Promise<SavedProgram> {
  // Belt-and-suspenders alongside getMissingProfileFields now rejecting
  // availableDaysPerWeek <= 0 before Gemini is ever called — mirrors createProgram's own
  // guard (src/features/programs/api/programsApi.ts) rather than letting an empty-days
  // program reach an insert.
  if (program.days.length === 0) {
    throw new Error('saveGeneratedProgram requires at least one day');
  }

  const { data: savedProgram, error: programError } = await supabase
    .from('workout_programs')
    .insert({ user_id: userId, name: program.name })
    .select('id, name, status, created_at')
    .single();
  if (programError) throw programError;

  const { data: insertedDays, error: daysError } = await supabase
    .from('program_days')
    .insert(
      program.days.map((day, index) => ({
        program_id: savedProgram.id,
        name: day.name,
        order_index: index,
      })),
    )
    .select('id, order_index');
  if (daysError) {
    await deleteOrphanedProgram(supabase, savedProgram.id);
    throw daysError;
  }
  if (insertedDays.length !== program.days.length) {
    await deleteOrphanedProgram(supabase, savedProgram.id);
    throw new Error(
      `saveGeneratedProgram: expected ${program.days.length} inserted days, got ${insertedDays.length}`,
    );
  }

  const dayIdByOrderIndex = new Map(insertedDays.map((day) => [day.order_index, day.id]));

  const exerciseRows = program.days.flatMap((day, dayIndex) =>
    day.exercises.map((exercise, exerciseIndex) => ({
      program_day_id: dayIdByOrderIndex.get(dayIndex),
      exercise_id: exercise.exerciseId,
      order_index: exerciseIndex,
      sets: exercise.sets,
      reps: exercise.reps,
      rest_seconds: exercise.restSeconds,
      note: exercise.note,
    })),
  );

  if (exerciseRows.length > 0) {
    const { error: exercisesError } = await supabase
      .from('program_day_exercises')
      .insert(exerciseRows);
    if (exercisesError) {
      await deleteOrphanedProgram(supabase, savedProgram.id);
      throw exercisesError;
    }
  }

  const { error: archiveError } = await supabase
    .from('workout_programs')
    .update({ status: 'archived' })
    .eq('user_id', userId)
    .eq('status', 'active')
    .neq('id', savedProgram.id);
  if (archiveError) {
    await deleteOrphanedProgram(supabase, savedProgram.id);
    throw archiveError;
  }

  return {
    id: savedProgram.id,
    name: savedProgram.name,
    status: savedProgram.status,
    createdAt: savedProgram.created_at,
  };
}

// Deletes a program that failed partway through saving, cascading to any days/exercises
// already inserted for it. Surfaces its own failure via console.error rather than throwing
// — the caller is already mid-throw for the original error, and losing that in favor of a
// cleanup-step error would hide the actual cause.
async function deleteOrphanedProgram(supabase: SupabaseClient, programId: string): Promise<void> {
  const { error } = await supabase.from('workout_programs').delete().eq('id', programId);
  if (error) {
    console.error(`Failed to clean up orphaned program ${programId}`, error);
  }
}

async function callGemini(
  apiKey: string,
  prompt: string,
  responseSchema: unknown,
): Promise<GeminiGenerateContentResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as GeminiGenerateContentResponse;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
