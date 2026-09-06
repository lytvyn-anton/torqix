// Phase 4: prompt + response-schema contract for the generate-program Edge Function.
// Kept dependency-free (no Deno or RN imports) so it can be unit-tested under Jest and
// imported as-is from the Deno function once that's built.
//
// Field names and the uppercase `type` enum below follow the Gemini REST API's
// GenerationConfig.responseSchema (a Schema object, not raw JSON Schema) — verify against
// a live call when wiring the actual `generateContent` request in the Edge Function.

export type GenerateProgramCatalogExercise = {
  id: string;
  name: string;
  muscleGroup: string | null;
  equipment: string[];
};

export type GenerateProgramRequest = {
  goal: string;
  level: string;
  trainingLocation: string;
  equipment: string[];
  splitPreference: string;
  availableDaysPerWeek: number;
  sessionMinutes: number;
};

// Mirrors ProgramDayExerciseInput (src/features/programs/types.ts) minus targetWeight,
// and with exerciseName in place of exerciseId — Gemini can't know our UUIDs, so it
// answers with the catalog name and the caller resolves that back to an id afterwards
// (the "Validate / handle errors in AI response" task) before saving via CreateProgramInput.
export type GeneratedProgramExercise = {
  exerciseName: string;
  sets: number;
  reps: number;
  restSeconds: number | null;
  note: string | null;
};

export type GeneratedProgramDay = {
  name: string;
  exercises: GeneratedProgramExercise[];
};

export type GeneratedProgram = {
  name: string;
  days: GeneratedProgramDay[];
};

// Constrains exerciseName to the catalog sent in the prompt so Gemini can't invent an
// exercise with no matching `exercises` row. This is a first line of defense, not the only
// one — the validation step re-checks every name against the same catalog server-side,
// since a schema constraint on a generative model is a strong bias, not a guarantee.
//
// Requires a non-empty catalog: an empty `enum` in Gemini's responseSchema makes the
// exerciseName field unsatisfiable, so the caller should surface "no matching exercises"
// itself rather than let the generateContent call fail with an opaque schema error.
export function buildGenerateProgramResponseSchema(
  request: Pick<GenerateProgramRequest, 'availableDaysPerWeek'>,
  catalog: GenerateProgramCatalogExercise[],
) {
  if (catalog.length === 0) {
    throw new Error('buildGenerateProgramResponseSchema requires a non-empty exercise catalog');
  }
  const exerciseNames = catalog.map((exercise) => exercise.name);
  return {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING' },
      days: {
        type: 'ARRAY',
        minItems: request.availableDaysPerWeek,
        maxItems: request.availableDaysPerWeek,
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            exercises: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  exerciseName: { type: 'STRING', enum: exerciseNames },
                  sets: { type: 'INTEGER' },
                  reps: { type: 'INTEGER' },
                  restSeconds: { type: 'INTEGER', nullable: true },
                  note: { type: 'STRING', nullable: true },
                },
                required: ['exerciseName', 'sets', 'reps', 'restSeconds', 'note'],
              },
            },
          },
          required: ['name', 'exercises'],
        },
      },
    },
    required: ['name', 'days'],
  } as const;
}

function formatCatalog(catalog: GenerateProgramCatalogExercise[]): string {
  return catalog
    .map((exercise) => {
      const details = [exercise.muscleGroup, exercise.equipment.join('/')].filter(Boolean);
      return `- ${exercise.name}${details.length ? ` (${details.join(', ')})` : ''}`;
    })
    .join('\n');
}

// target_weight is deliberately absent from the generated shape: a first-time AI program
// has no logged history to base a load on, and guessing a number is a safety concern for a
// beginner. The user fills it in as they log real sets; suggesting load adjustments from
// actual history is Phase 5's job, not this one.
export function buildGenerateProgramPrompt(
  request: GenerateProgramRequest,
  catalog: GenerateProgramCatalogExercise[],
): string {
  return `You are a certified strength & conditioning coach designing a workout program for a client.

Client profile:
- Goal: ${request.goal}
- Experience level: ${request.level}
- Training location: ${request.trainingLocation}
- Available equipment: ${request.equipment.length > 0 ? request.equipment.join(', ') : 'none specified'}
- Split preference: ${request.splitPreference}
- Days per week: ${request.availableDaysPerWeek}
- Session length: ${request.sessionMinutes} minutes

Exercise catalog — choose ONLY from this list, using the exact name shown:
${formatCatalog(catalog)}

Design a program with exactly ${request.availableDaysPerWeek} day(s). Give each day a short
descriptive name (e.g. "Push day", "Full body A") and pick exercises appropriate for the
client's level, goal, equipment, and session length — including realistic sets, reps, and rest
time in seconds. Do not suggest a target weight; the client has no logged history yet. Keep
notes to a single short form cue, or omit them.`;
}
