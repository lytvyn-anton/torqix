import { supabase } from '../../../shared/api/supabase';
import { getProfile, upsertProfile } from './profileApi';

jest.mock('../../../shared/api/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockedFrom = jest.mocked(supabase.from);

const row = {
  id: 'user-1',
  age: 30,
  height_cm: 180,
  weight_kg: 82.5,
  goal: 'build_muscle',
  level: 'intermediate',
  equipment: [] as string[],
  session_minutes: 45,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('getProfile', () => {
  it('maps a row from snake_case to the Profile shape', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ select } as never);

    const profile = await getProfile('user-1');

    expect(mockedFrom).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
    expect(profile).toEqual({
      id: 'user-1',
      age: 30,
      heightCm: 180,
      weightKg: 82.5,
      goal: 'build_muscle',
      level: 'intermediate',
      equipment: [],
      sessionMinutes: 45,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('returns null when no row exists yet', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ select } as never);

    expect(await getProfile('user-1')).toBeNull();
  });

  it('throws the supabase error', async () => {
    const error = new Error('rls denied');
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    mockedFrom.mockReturnValue({ select } as never);

    await expect(getProfile('user-1')).rejects.toBe(error);
  });
});

describe('upsertProfile', () => {
  it('sends a snake_case payload and maps the returned row back', async () => {
    const single = jest
      .fn()
      .mockResolvedValue({ data: { ...row, level: 'advanced', age: 31 }, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const upsert = jest.fn().mockReturnValue({ select });
    mockedFrom.mockReturnValue({ upsert } as never);

    const result = await upsertProfile('user-1', {
      age: 31,
      heightCm: 180,
      weightKg: 82.5,
      sessionMinutes: 45,
      goal: 'build_muscle',
      level: 'advanced',
      equipment: ['dumbbells'],
    });

    expect(upsert).toHaveBeenCalledWith({
      id: 'user-1',
      age: 31,
      height_cm: 180,
      weight_kg: 82.5,
      goal: 'build_muscle',
      level: 'advanced',
      equipment: ['dumbbells'],
      session_minutes: 45,
    });
    expect(result.level).toBe('advanced');
    expect(result.age).toBe(31);
  });

  it('throws the supabase error', async () => {
    const error = new Error('constraint violation');
    const single = jest.fn().mockResolvedValue({ data: null, error });
    const select = jest.fn().mockReturnValue({ single });
    const upsert = jest.fn().mockReturnValue({ select });
    mockedFrom.mockReturnValue({ upsert } as never);

    await expect(
      upsertProfile('user-1', {
        age: null,
        heightCm: null,
        weightKg: null,
        sessionMinutes: null,
        goal: null,
        level: null,
        equipment: [],
      }),
    ).rejects.toBe(error);
  });
});
