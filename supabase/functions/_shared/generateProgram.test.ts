import {
  buildGenerateProgramPrompt,
  buildGenerateProgramResponseSchema,
  getMissingProfileFields,
  parseGeneratedProgram,
  resolveGeneratedProgram,
  toGenerateProgramRequest,
  type GeneratedProgram,
  type GenerateProgramCatalogExercise,
  type GenerateProgramRequest,
  type ProfileProgramFields,
} from './generateProgram';

const catalog: GenerateProgramCatalogExercise[] = [
  { id: '1', name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: ['barbell', 'bench'] },
  { id: '2', name: 'Pull-up', muscleGroup: 'back', equipment: ['pull_up_bar', 'bodyweight'] },
];

const request: GenerateProgramRequest = {
  goal: 'build_muscle',
  level: 'intermediate',
  trainingLocation: 'gym',
  equipment: ['barbell', 'dumbbells'],
  splitPreference: 'split',
  availableDaysPerWeek: 4,
  sessionMinutes: 60,
};

describe('buildGenerateProgramResponseSchema', () => {
  it('constrains exerciseName to the exact catalog names', () => {
    const schema = buildGenerateProgramResponseSchema(request, catalog);
    const exerciseNameSchema =
      schema.properties.days.items.properties.exercises.items.properties.exerciseName;
    expect(exerciseNameSchema.enum).toEqual(['Barbell Bench Press', 'Pull-up']);
  });

  it('requires every generated exercise field, including the nullable ones', () => {
    const schema = buildGenerateProgramResponseSchema(request, catalog);
    const exerciseSchema = schema.properties.days.items.properties.exercises.items;
    expect(exerciseSchema.required).toEqual([
      'exerciseName',
      'sets',
      'reps',
      'restSeconds',
      'note',
    ]);
    expect(exerciseSchema.properties.restSeconds.nullable).toBe(true);
    expect(exerciseSchema.properties.note.nullable).toBe(true);
  });

  it('does not include targetWeight anywhere in the schema', () => {
    const schema = buildGenerateProgramResponseSchema(request, catalog);
    expect(JSON.stringify(schema)).not.toMatch(/weight/i);
  });

  it('pins the days array length to availableDaysPerWeek', () => {
    const schema = buildGenerateProgramResponseSchema(
      { ...request, availableDaysPerWeek: 3 },
      catalog,
    );
    expect(schema.properties.days.minItems).toBe(3);
    expect(schema.properties.days.maxItems).toBe(3);
  });

  it('throws for an empty catalog instead of emitting an unsatisfiable enum', () => {
    expect(() => buildGenerateProgramResponseSchema(request, [])).toThrow(/non-empty/);
  });
});

describe('buildGenerateProgramPrompt', () => {
  it('includes every profile field the caller passed in', () => {
    const prompt = buildGenerateProgramPrompt(request, catalog);
    expect(prompt).toContain('build_muscle');
    expect(prompt).toContain('intermediate');
    expect(prompt).toContain('gym');
    expect(prompt).toContain('barbell, dumbbells');
    expect(prompt).toContain('split');
    expect(prompt).toContain('exactly 4 day(s)');
    expect(prompt).toContain('60 minutes');
  });

  it('lists every catalog exercise by exact name', () => {
    const prompt = buildGenerateProgramPrompt(request, catalog);
    expect(prompt).toContain('Barbell Bench Press');
    expect(prompt).toContain('Pull-up');
  });

  it('falls back to "none specified" when no equipment is given', () => {
    const prompt = buildGenerateProgramPrompt({ ...request, equipment: [] }, catalog);
    expect(prompt).toContain('none specified');
  });

  it('instructs the model not to suggest a target weight', () => {
    const prompt = buildGenerateProgramPrompt(request, catalog);
    expect(prompt).toMatch(/do not suggest a target weight/i);
  });
});

const completeProfile: ProfileProgramFields = {
  goal: 'build_muscle',
  level: 'intermediate',
  trainingLocation: 'gym',
  equipment: ['barbell', 'dumbbells'],
  splitPreference: 'split',
  availableDaysPerWeek: 4,
  sessionMinutes: 60,
};

describe('getMissingProfileFields', () => {
  it('returns an empty list for a complete profile', () => {
    expect(getMissingProfileFields(completeProfile)).toEqual([]);
  });

  it('lists every null required field', () => {
    const profile: ProfileProgramFields = {
      ...completeProfile,
      goal: null,
      availableDaysPerWeek: null,
    };
    expect(getMissingProfileFields(profile)).toEqual(['goal', 'availableDaysPerWeek']);
  });

  it('does not flag equipment as missing when empty (home_bodyweight has none)', () => {
    expect(getMissingProfileFields({ ...completeProfile, equipment: [] })).toEqual([]);
  });

  it('flags availableDaysPerWeek as missing when it is zero, not just null', () => {
    expect(getMissingProfileFields({ ...completeProfile, availableDaysPerWeek: 0 })).toEqual([
      'availableDaysPerWeek',
    ]);
  });
});

describe('toGenerateProgramRequest', () => {
  it('maps a complete profile onto a GenerateProgramRequest', () => {
    expect(toGenerateProgramRequest(completeProfile)).toEqual(request);
  });

  it('throws when a required field is missing', () => {
    expect(() => toGenerateProgramRequest({ ...completeProfile, level: null })).toThrow(
      /incomplete profile/,
    );
  });
});

describe('parseGeneratedProgram', () => {
  const generatedProgram = {
    name: 'AI Program',
    days: [{ name: 'Push day', exercises: [] }],
  };

  it('parses the JSON text out of the first candidate', () => {
    const response = {
      candidates: [{ content: { parts: [{ text: JSON.stringify(generatedProgram) }] } }],
    };
    expect(parseGeneratedProgram(response)).toEqual(generatedProgram);
  });

  it('throws when there are no candidates', () => {
    expect(() => parseGeneratedProgram({ candidates: [] })).toThrow(/did not include/);
  });

  it('throws when the candidate text is not valid JSON', () => {
    const response = { candidates: [{ content: { parts: [{ text: 'not json' }] } }] };
    expect(() => parseGeneratedProgram(response)).toThrow(/not valid JSON/);
  });
});

describe('resolveGeneratedProgram', () => {
  it('resolves every exerciseName to its catalog id, dropping the name', () => {
    const program: GeneratedProgram = {
      name: 'AI Program',
      days: [
        {
          name: 'Push day',
          exercises: [
            { exerciseName: 'Barbell Bench Press', sets: 4, reps: 8, restSeconds: 90, note: null },
            { exerciseName: 'Pull-up', sets: 3, reps: 10, restSeconds: 60, note: 'to failure' },
          ],
        },
      ],
    };

    expect(resolveGeneratedProgram(program, catalog)).toEqual({
      name: 'AI Program',
      days: [
        {
          name: 'Push day',
          exercises: [
            { exerciseId: '1', sets: 4, reps: 8, restSeconds: 90, note: null },
            { exerciseId: '2', sets: 3, reps: 10, restSeconds: 60, note: 'to failure' },
          ],
        },
      ],
    });
  });

  it('throws listing every exercise name not found in the catalog', () => {
    const program: GeneratedProgram = {
      name: 'AI Program',
      days: [
        {
          name: 'Push day',
          exercises: [
            { exerciseName: 'Barbell Bench Press', sets: 4, reps: 8, restSeconds: 90, note: null },
            { exerciseName: 'Cable Fly', sets: 3, reps: 12, restSeconds: 60, note: null },
          ],
        },
        {
          name: 'Pull day',
          exercises: [
            { exerciseName: 'Cable Fly', sets: 3, reps: 12, restSeconds: 60, note: null },
            { exerciseName: 'Leg Press', sets: 4, reps: 10, restSeconds: 90, note: null },
          ],
        },
      ],
    };

    expect(() => resolveGeneratedProgram(program, catalog)).toThrow('Cable Fly, Leg Press');
  });

  it('throws when the catalog itself has two exercises sharing a name, instead of silently picking one', () => {
    const ambiguousCatalog: GenerateProgramCatalogExercise[] = [
      ...catalog,
      { id: '3', name: 'Pull-up', muscleGroup: 'back', equipment: ['bodyweight'] },
    ];
    const program: GeneratedProgram = {
      name: 'AI Program',
      days: [{ name: 'Pull day', exercises: [] }],
    };

    expect(() => resolveGeneratedProgram(program, ambiguousCatalog)).toThrow(/ambiguous/i);
  });
});
