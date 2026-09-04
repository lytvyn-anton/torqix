import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { useSession } from '../../../shared/auth/SessionProvider';
import { ProfileAvatarButton } from './ProfileAvatarButton';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../../shared/auth/SessionProvider', () => ({ useSession: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseSession = jest.mocked(useSession);

describe('ProfileAvatarButton', () => {
  it("shows the signed-in user's email initial and navigates to /profile on press", async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUseSession.mockReturnValue({
      session: { user: { email: 'anton@example.com' } },
      isLoading: false,
    } as unknown as ReturnType<typeof useSession>);

    await render(<ProfileAvatarButton />);

    expect(screen.getByText('A')).toBeTruthy();
    fireEvent.press(screen.getByTestId('profile-avatar-button'));
    expect(push).toHaveBeenCalledWith('/profile');
  });

  it('falls back to "?" when there is no session email', async () => {
    mockedUseRouter.mockReturnValue({ push: jest.fn() } as unknown as ReturnType<typeof useRouter>);
    mockedUseSession.mockReturnValue({ session: null, isLoading: false } as unknown as ReturnType<
      typeof useSession
    >);

    await render(<ProfileAvatarButton />);

    expect(screen.getByText('?')).toBeTruthy();
  });
});
