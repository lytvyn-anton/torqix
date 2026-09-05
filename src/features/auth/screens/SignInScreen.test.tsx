import { fireEvent, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useSignIn } from '../hooks/useSignIn';
import { SignInScreen } from './SignInScreen';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../hooks/useSignIn', () => ({ useSignIn: jest.fn() }));

const mockedUseSignIn = jest.mocked(useSignIn);

describe('SignInScreen', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockClear();
    mockedUseSignIn.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useSignIn>);
  });

  it('shows validation errors and does not submit for empty fields', async () => {
    await render(<SignInScreen />);

    await fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits trimmed credentials when valid', async () => {
    await render(<SignInScreen />);

    await fireEvent.changeText(screen.getByTestId('sign-in-email'), '  user@example.com  ');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'secret1');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(mutate).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret1' });
  });

  it('shows a generic error message when sign-in fails', async () => {
    mockedUseSignIn.mockReturnValue({
      mutate,
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useSignIn>);

    await render(<SignInScreen />);

    expect(
      screen.getByText("Couldn't sign in. Check your email and password and try again."),
    ).toBeTruthy();
  });
});
