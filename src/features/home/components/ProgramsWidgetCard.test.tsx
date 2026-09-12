import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useProgram } from '../../programs/hooks/useProgram';
import { ProgramsWidgetCard } from './ProgramsWidgetCard';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../programs/hooks/useProgram', () => ({ useProgram: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseProgram = jest.mocked(useProgram);

const activeProgram = { id: 'program-1', name: 'Push / Pull / Legs' };
const programWithDays = {
  id: 'program-1',
  name: 'Push / Pull / Legs',
  status: 'active' as const,
  createdAt: '2026-09-01T00:00:00Z',
  days: [
    { id: 'day-1', name: 'Push day', exercises: [] },
    { id: 'day-2', name: 'Pull day', exercises: [] },
  ],
};

describe('ProgramsWidgetCard', () => {
  let push: jest.Mock;

  beforeEach(() => {
    push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  });

  it('shows the empty state and its CTAs when there is no active program', async () => {
    const onGenerateProgram = jest.fn();
    const onCreateProgram = jest.fn();
    mockedUseProgram.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(
      <ProgramsWidgetCard
        activeProgram={undefined}
        onGenerateProgram={onGenerateProgram}
        onCreateProgram={onCreateProgram}
      />,
    );

    expect(screen.getByTestId('programs-widget-empty')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('programs-widget-generate-cta'));
    expect(onGenerateProgram).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('programs-widget-create-cta'));
    expect(onCreateProgram).toHaveBeenCalledTimes(1);
  });

  it('shows the program name and the first day as "Next", navigating to the program on tap', async () => {
    mockedUseProgram.mockReturnValue({
      data: programWithDays,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(
      <ProgramsWidgetCard
        activeProgram={activeProgram}
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    expect(screen.getByText('Push / Pull / Legs')).toBeTruthy();
    expect(screen.getByTestId('programs-widget-next')).toHaveTextContent('Next: Push day');

    await fireEvent.press(screen.getByTestId('programs-widget-card'));
    expect(push).toHaveBeenCalledWith('/program/program-1');
  });

  it('shows a "no days" message instead of Next when the program has no days', async () => {
    mockedUseProgram.mockReturnValue({
      data: { ...programWithDays, days: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(
      <ProgramsWidgetCard
        activeProgram={activeProgram}
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    expect(screen.getByTestId('programs-widget-next')).toHaveTextContent(
      'This program has no days set up yet.',
    );
  });

  it('shows a loading indicator while the program is loading', async () => {
    mockedUseProgram.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(
      <ProgramsWidgetCard
        activeProgram={activeProgram}
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    expect(screen.getByTestId('programs-widget-loading')).toBeTruthy();
  });

  it('shows an error message when the program fails to load with no cached data', async () => {
    mockedUseProgram.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useProgram>);

    await render(
      <ProgramsWidgetCard
        activeProgram={activeProgram}
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    expect(screen.getByTestId('programs-widget-load-error')).toBeTruthy();
  });

  it('keeps showing the already-loaded Next row through a background refetch error', async () => {
    mockedUseProgram.mockReturnValue({
      data: programWithDays,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useProgram>);

    await render(
      <ProgramsWidgetCard
        activeProgram={activeProgram}
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('programs-widget-load-error')).toBeNull();
    expect(screen.getByTestId('programs-widget-next')).toHaveTextContent('Next: Push day');
  });
});
