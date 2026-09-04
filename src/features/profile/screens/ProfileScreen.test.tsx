import { fireEvent, render, screen } from '@testing-library/react-native';

import { useSignOut } from '../../auth/hooks/useSignOut';
import '../../../shared/i18n';
import { useProfile } from '../hooks/useProfile';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import type { Profile } from '../types';
import { ProfileScreen } from './ProfileScreen';

jest.mock('../hooks/useProfile', () => ({ useProfile: jest.fn() }));
jest.mock('../hooks/useUpdateProfile', () => ({ useUpdateProfile: jest.fn() }));
jest.mock('../../auth/hooks/useSignOut', () => ({ useSignOut: jest.fn() }));

const mockedUseProfile = jest.mocked(useProfile);
const mockedUseUpdateProfile = jest.mocked(useUpdateProfile);
const mockedUseSignOut = jest.mocked(useSignOut);

const baseProfile: Profile = {
  id: 'user-1',
  age: 30,
  heightCm: 180,
  weightKg: 82.5,
  goal: 'build_muscle',
  level: 'intermediate',
  equipment: ['dumbbells'],
  sessionMinutes: 45,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ProfileScreen', () => {
  const updateMutate = jest.fn();
  const signOutMutate = jest.fn();

  beforeEach(() => {
    updateMutate.mockClear();
    signOutMutate.mockClear();

    mockedUseUpdateProfile.mockReturnValue({
      mutate: updateMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
    } as unknown as ReturnType<typeof useUpdateProfile>);

    mockedUseSignOut.mockReturnValue({
      mutate: signOutMutate,
    } as unknown as ReturnType<typeof useSignOut>);
  });

  it('shows a loading indicator while the profile is loading', async () => {
    mockedUseProfile.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useProfile>);

    await render(<ProfileScreen userId="user-1" />);

    expect(screen.getByTestId('profile-loading')).toBeTruthy();
  });

  it('shows an error message when the profile fails to load', async () => {
    mockedUseProfile.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useProfile>);

    await render(<ProfileScreen userId="user-1" />);

    expect(screen.getByTestId('profile-load-error')).toBeTruthy();
  });

  it('prefills the form from the loaded profile', async () => {
    mockedUseProfile.mockReturnValue({
      isLoading: false,
      isError: false,
      data: baseProfile,
    } as unknown as ReturnType<typeof useProfile>);

    await render(<ProfileScreen userId="user-1" />);

    expect(screen.getByTestId('profile-age').props.value).toBe('30');
    expect(screen.getByTestId('profile-height').props.value).toBe('180');
    expect(screen.getByTestId('profile-weight').props.value).toBe('82.5');
    expect(screen.getByTestId('profile-session-minutes').props.value).toBe('45');
  });

  it('saves edited fields with the expected numeric conversion', async () => {
    mockedUseProfile.mockReturnValue({
      isLoading: false,
      isError: false,
      data: baseProfile,
    } as unknown as ReturnType<typeof useProfile>);

    await render(<ProfileScreen userId="user-1" />);

    await fireEvent.changeText(screen.getByTestId('profile-age'), '31');
    await fireEvent.press(screen.getByTestId('option-level-advanced'));
    await fireEvent.press(screen.getByTestId('profile-save'));

    expect(updateMutate).toHaveBeenCalledWith({
      age: 31,
      heightCm: 180,
      weightKg: 82.5,
      sessionMinutes: 45,
      goal: 'build_muscle',
      level: 'advanced',
      equipment: ['dumbbells'],
    });
  });

  it('toggles equipment selection on and off', async () => {
    mockedUseProfile.mockReturnValue({
      isLoading: false,
      isError: false,
      data: baseProfile,
    } as unknown as ReturnType<typeof useProfile>);

    await render(<ProfileScreen userId="user-1" />);

    // baseProfile already has "dumbbells" selected; add "barbell" and remove "dumbbells".
    await fireEvent.press(screen.getByTestId('option-equipment-barbell'));
    await fireEvent.press(screen.getByTestId('option-equipment-dumbbells'));
    await fireEvent.press(screen.getByTestId('profile-save'));

    expect(updateMutate).toHaveBeenCalledWith(expect.objectContaining({ equipment: ['barbell'] }));
  });

  it('signs out when the sign-out action is pressed', async () => {
    mockedUseProfile.mockReturnValue({
      isLoading: false,
      isError: false,
      data: baseProfile,
    } as unknown as ReturnType<typeof useProfile>);

    await render(<ProfileScreen userId="user-1" />);

    await fireEvent.press(screen.getByTestId('profile-sign-out'));

    expect(signOutMutate).toHaveBeenCalled();
  });
});
