import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { supabase } from '../api/supabase';
import { SessionProvider, useSession } from './SessionProvider';

jest.mock('../api/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
    },
  },
}));

const mockedOnAuthStateChange = jest.mocked(supabase.auth.onAuthStateChange);

function Probe() {
  const { session, isLoading } = useSession();
  return <Text testID="probe">{JSON.stringify({ isLoading, hasSession: !!session })}</Text>;
}

describe('SessionProvider', () => {
  it('starts loading, then reflects the session emitted by onAuthStateChange', async () => {
    let emit: (event: string, session: unknown) => void = () => {};
    const unsubscribe = jest.fn();
    mockedOnAuthStateChange.mockImplementation((callback) => {
      emit = callback as typeof emit;
      return { data: { subscription: { id: 'sub', callback, unsubscribe } } } as never;
    });

    await render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    expect(screen.getByTestId('probe').props.children).toContain('"isLoading":true');

    await act(async () => {
      emit('INITIAL_SESSION', { user: { id: 'user-1' } });
    });

    expect(screen.getByTestId('probe').props.children).toContain('"isLoading":false');
    expect(screen.getByTestId('probe').props.children).toContain('"hasSession":true');
  });

  it('unsubscribes on unmount', async () => {
    const unsubscribe = jest.fn();
    mockedOnAuthStateChange.mockImplementation(
      () => ({ data: { subscription: { id: 'sub', callback: () => {}, unsubscribe } } }) as never,
    );

    const view = await render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await view.unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('useSession', () => {
  it('throws when used outside a SessionProvider', async () => {
    await expect(render(<Probe />)).rejects.toThrow(
      'useSession must be used within a SessionProvider',
    );
  });
});
