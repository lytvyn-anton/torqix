import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '../../../shared/i18n';
import { useSignUp } from '../hooks/useSignUp';
import { SignUpScreen } from './SignUpScreen';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('../hooks/useSignUp', () => ({ useSignUp: jest.fn() }));

const mockedUseSignUp = jest.mocked(useSignUp);

describe('SignUpScreen', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockClear();
    mockedUseSignUp.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
    } as unknown as ReturnType<typeof useSignUp>);
  });

  it('shows validation errors and does not submit for empty fields', async () => {
    await render(<SignUpScreen />);

    await fireEvent.press(screen.getByTestId('sign-up-submit'));

    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits trimmed credentials when valid', async () => {
    await render(<SignUpScreen />);

    await fireEvent.changeText(screen.getByTestId('sign-up-email'), '  user@example.com  ');
    await fireEvent.changeText(screen.getByTestId('sign-up-password'), 'secret1');
    await fireEvent.press(screen.getByTestId('sign-up-submit'));

    expect(mutate).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret1' });
  });

  it('shows a confirmation notice when email confirmation is required', async () => {
    mockedUseSignUp.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { requiresEmailConfirmation: true, alreadyRegistered: false },
    } as unknown as ReturnType<typeof useSignUp>);

    await render(<SignUpScreen />);

    expect(screen.getByTestId('sign-up-confirmation-notice')).toBeTruthy();
  });

  it('shows an already-registered notice instead of the confirmation notice', async () => {
    mockedUseSignUp.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      isSuccess: true,
      data: { requiresEmailConfirmation: true, alreadyRegistered: true },
    } as unknown as ReturnType<typeof useSignUp>);

    await render(<SignUpScreen />);

    expect(screen.getByTestId('sign-up-already-registered')).toBeTruthy();
    expect(screen.queryByTestId('sign-up-confirmation-notice')).toBeNull();
  });
});
