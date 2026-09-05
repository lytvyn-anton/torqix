import { fireEvent, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useWorkoutSummary } from '../hooks/useWorkoutSummary';
import { WorkoutCompleteScreen } from './WorkoutCompleteScreen';

jest.mock('../hooks/useWorkoutSummary', () => ({ useWorkoutSummary: jest.fn() }));

const mockedUseWorkoutSummary = jest.mocked(useWorkoutSummary);

describe('WorkoutCompleteScreen', () => {
  it('shows a loading indicator while the summary loads', async () => {
    mockedUseWorkoutSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useWorkoutSummary>);

    await render(<WorkoutCompleteScreen sessionId="session-1" onDone={jest.fn()} />);

    expect(screen.getByTestId('workout-complete-loading')).toBeTruthy();
  });

  it('shows an error message when the summary fails to load', async () => {
    mockedUseWorkoutSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useWorkoutSummary>);

    await render(<WorkoutCompleteScreen sessionId="session-1" onDone={jest.fn()} />);

    expect(screen.getByTestId('workout-complete-load-error')).toBeTruthy();
  });

  it('shows the set count and day name, and calls onDone', async () => {
    mockedUseWorkoutSummary.mockReturnValue({
      data: { programDayName: 'Push day', setCount: 12 },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useWorkoutSummary>);
    const onDone = jest.fn();

    await render(<WorkoutCompleteScreen sessionId="session-1" onDone={onDone} />);

    expect(screen.getByTestId('workout-complete-summary')).toBeTruthy();
    expect(screen.getByText('12 sets logged for Push day.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('workout-complete-done'));
    expect(onDone).toHaveBeenCalled();
  });
});
