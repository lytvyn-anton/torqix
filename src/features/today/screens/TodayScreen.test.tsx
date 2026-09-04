import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { useActiveProgram } from '../../programs/hooks/useActiveProgram';
import { TodayScreen } from './TodayScreen';

jest.mock('../../programs/hooks/useActiveProgram', () => ({ useActiveProgram: jest.fn() }));

const mockedUseActiveProgram = jest.mocked(useActiveProgram);

describe('TodayScreen', () => {
  it('shows a loading indicator while the active program is loading', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<TodayScreen userId="user-1" onChooseProgram={jest.fn()} />);

    expect(screen.getByTestId('today-loading')).toBeTruthy();
  });

  it('shows an error message when the active program fails to load', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<TodayScreen userId="user-1" onChooseProgram={jest.fn()} />);

    expect(screen.getByTestId('today-load-error')).toBeTruthy();
  });

  it('shows the empty state and calls onChooseProgram when there is no active program', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);
    const onChooseProgram = jest.fn();

    await render(<TodayScreen userId="user-1" onChooseProgram={onChooseProgram} />);

    expect(screen.getByTestId('today-empty')).toBeTruthy();
    fireEvent.press(screen.getByTestId('today-choose-program'));
    expect(onChooseProgram).toHaveBeenCalledTimes(1);
  });

  it('keeps showing an already-loaded active program through a background refetch error', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: true,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<TodayScreen userId="user-1" onChooseProgram={jest.fn()} />);

    expect(screen.queryByTestId('today-load-error')).toBeNull();
    expect(screen.getByTestId('today-active-program')).toBeTruthy();
  });

  it("shows the active program's name when one exists", async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<TodayScreen userId="user-1" onChooseProgram={jest.fn()} />);

    expect(screen.getByTestId('today-active-program')).toBeTruthy();
    expect(screen.getByText('Push / Pull / Legs')).toBeTruthy();
  });
});
