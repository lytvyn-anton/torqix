import { supabase } from '../../../shared/api/supabase';
import { getExercises } from './exercisesApi';

jest.mock('../../../shared/api/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockedFrom = jest.mocked(supabase.from);

function mockExercisesQuery(result: { data: unknown; error: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ order });
  mockedFrom.mockReturnValue({ select } as never);
  return { select, order };
}

describe('getExercises', () => {
  it('queries the exercises table ordered by name and maps rows to camelCase', async () => {
    const { select, order } = mockExercisesQuery({
      data: [{ id: 'ex-1', name: 'Back Squat', muscle_group: 'legs', equipment: ['barbell'] }],
      error: null,
    });

    const result = await getExercises();

    expect(mockedFrom).toHaveBeenCalledWith('exercises');
    expect(select).toHaveBeenCalledWith('id, name, muscle_group, equipment');
    expect(order).toHaveBeenCalledWith('name', { ascending: true });
    expect(result).toEqual([
      { id: 'ex-1', name: 'Back Squat', muscleGroup: 'legs', equipment: ['barbell'] },
    ]);
  });

  it('returns an empty list when there are no exercises', async () => {
    mockExercisesQuery({ data: [], error: null });

    expect(await getExercises()).toEqual([]);
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    mockExercisesQuery({ data: null, error });

    await expect(getExercises()).rejects.toBe(error);
  });
});
