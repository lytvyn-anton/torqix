// Phase 4: calls Gemini to generate a workout program from the caller's profile and the
// exercise catalog. Deliberately thin — prompt/schema construction and response parsing
// live in ../_shared/generateProgram.ts so they can be unit-tested under Jest; this file is
// just the Deno glue (auth, DB reads, the Gemini HTTP call).
//
// Scope note: this function returns Gemini's generated program as-is. Re-validating each
// exerciseName against the catalog and resolving it to an exercise id, then persisting the
// result, are the next two Phase 4 tasks — not done here.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildGenerateProgramPrompt,
  buildGenerateProgramResponseSchema,
  getMissingProfileFields,
  parseGeneratedProgram,
  toGenerateProgramRequest,
  type GenerateProgramCatalogExercise,
  type GeminiGenerateContentResponse,
  type ProfileProgramFields,
} from '../_shared/generateProgram.ts';

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';

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

  if (profileError || !profileRow) {
    // PGRST116 ("no rows") is the expected case for a user who hasn't filled in a profile
    // yet; anything else (connection blip, RLS misconfiguration, column rename) is logged
    // so it isn't misdiagnosed as the same thing from the client-facing 404 alone.
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Failed to load profile', profileError);
    }
    return jsonResponse({ error: 'Profile not found' }, 404);
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

  try {
    const geminiResponse = await callGemini(geminiApiKey, prompt, responseSchema);
    const program = parseGeneratedProgram(geminiResponse);
    return jsonResponse({ program }, 200);
  } catch (error) {
    console.error('Program generation failed', error);
    return jsonResponse({ error: 'Failed to generate a program' }, 502);
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
