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

// Mirrors the profile fields the Edge Function reads from `profiles` (snake_case columns
// already converted to camelCase by the caller). These are stored as "starting hints, not
// hard constraints" (see the profiles migration), but a program can't be generated without
// them — nullable here only because a profile row can legitimately have them unset.
export type ProfileProgramFields = {
  goal: string | null;
  level: string | null;
  trainingLocation: string | null;
  equipment: string[];
  splitPreference: string | null;
  availableDaysPerWeek: number | null;
  sessionMinutes: number | null;
};

const REQUIRED_PROFILE_FIELDS = [
  'goal',
  'level',
  'trainingLocation',
  'splitPreference',
  'availableDaysPerWeek',
  'sessionMinutes',
] as const satisfies readonly (keyof ProfileProgramFields)[];

// Also exported so the Edge Function can report every required field as missing for a
// caller with no `profiles` row at all, without hardcoding the list a second time.
export const REQUIRED_PROFILE_FIELD_NAMES: readonly string[] = REQUIRED_PROFILE_FIELDS;

// Lets the Edge Function surface one clear "complete your profile" error instead of either
// crashing on a null field mid-prompt or silently generating a program from defaults.
// availableDaysPerWeek gets an extra check beyond null: the profile form has no minimum-value
// validation, and 0 would otherwise sail through to an unsatisfiable minItems:0/maxItems:0
// response schema (see buildGenerateProgramResponseSchema) and then an empty-days program.
export function getMissingProfileFields(profile: ProfileProgramFields): string[] {
  return REQUIRED_PROFILE_FIELDS.filter((field) => {
    if (field === 'availableDaysPerWeek') {
      return profile.availableDaysPerWeek === null || profile.availableDaysPerWeek <= 0;
    }
    return profile[field] === null;
  });
}

// Throws if the profile is incomplete — callers should check `getMissingProfileFields` first
// to return a 400 with the specific missing fields rather than a generic error.
export function toGenerateProgramRequest(profile: ProfileProgramFields): GenerateProgramRequest {
  if (getMissingProfileFields(profile).length > 0) {
    throw new Error('Cannot build a program request from an incomplete profile');
  }
  return {
    goal: profile.goal as string,
    level: profile.level as string,
    trainingLocation: profile.trainingLocation as string,
    equipment: profile.equipment,
    splitPreference: profile.splitPreference as string,
    availableDaysPerWeek: profile.availableDaysPerWeek as number,
    sessionMinutes: profile.sessionMinutes as number,
  };
}

// Shape of the relevant part of Gemini's generateContent REST response — just enough to
// pull out the generated JSON text, not a full response type.
export type GeminiGenerateContentResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

// generateContent can fail to return the expected shape (empty candidates, a text-less
// part, or — despite the responseSchema constraint — non-JSON text) independently of an
// HTTP-level error, so this is checked and reported separately from the fetch call itself.
export function parseGeneratedProgram(response: GeminiGenerateContentResponse): GeneratedProgram {
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('Gemini response did not include generated text');
  }
  try {
    return JSON.parse(text) as GeneratedProgram;
  } catch (error) {
    throw new Error(`Gemini response was not valid JSON: ${(error as Error).message}`);
  }
}

// Mirrors ProgramDayExerciseInput/ProgramDayInput/CreateProgramInput (src/features/programs/types.ts)
// with exerciseId resolved and no targetWeight (see GeneratedProgramExercise) — the shape the
// Edge Function persists once every exerciseName below is confirmed to be in the catalog.
export type ResolvedProgramExercise = {
  exerciseId: string;
  sets: number;
  reps: number;
  restSeconds: number | null;
  note: string | null;
};

export type ResolvedProgramDay = {
  name: string;
  exercises: ResolvedProgramExercise[];
};

export type ResolvedProgram = {
  name: string;
  days: ResolvedProgramDay[];
};

// Re-checks every exerciseName Gemini returned against the same catalog sent in the prompt
// and resolves it to that exercise's id. The responseSchema's enum constraint (see
// buildGenerateProgramResponseSchema) is a strong bias, not a guarantee, so this still
// throws — rather than silently dropping or guessing — if a name doesn't match exactly.
export function resolveGeneratedProgram(
  program: GeneratedProgram,
  catalog: GenerateProgramCatalogExercise[],
): ResolvedProgram {
  const idByName = new Map<string, string>();
  const ambiguousNames = new Set<string>();
  for (const exercise of catalog) {
    if (idByName.has(exercise.name)) {
      ambiguousNames.add(exercise.name);
    } else {
      idByName.set(exercise.name, exercise.id);
    }
  }
  // Two catalog rows sharing a name (e.g. a user's custom exercise named the same as a
  // shared-catalog one) make the name Gemini was given genuinely ambiguous — resolving it
  // to whichever id happened to win the Map would silently save the wrong exercise, so this
  // is treated as a generation failure instead.
  if (ambiguousNames.size > 0) {
    throw new Error(
      `Catalog has ambiguous duplicate exercise name(s): ${[...ambiguousNames].join(', ')}`,
    );
  }

  const unknownNames = [
    ...new Set(
      program.days
        .flatMap((day) => day.exercises)
        .map((exercise) => exercise.exerciseName)
        .filter((name) => !idByName.has(name)),
    ),
  ];
  if (unknownNames.length > 0) {
    throw new Error(
      `Gemini referenced exercise name(s) not in the catalog: ${unknownNames.join(', ')}`,
    );
  }

  return {
    name: program.name,
    days: program.days.map((day) => ({
      name: day.name,
      exercises: day.exercises.map((exercise) => ({
        exerciseId: idByName.get(exercise.exerciseName) as string,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        note: exercise.note,
      })),
    })),
  };
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
