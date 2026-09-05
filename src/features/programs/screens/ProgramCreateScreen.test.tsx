import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { useCreateProgram } from '../hooks/useCreateProgram';
import { ProgramCreateScreen } from './ProgramCreateScreen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../hooks/useCreateProgram', () => ({ useCreateProgram: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseCreateProgram = jest.mocked(useCreateProgram);

describe('ProgramCreateScreen', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({
      back: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  it('disables save until a name and at least one non-blank day are entered', async () => {
    const mutate = jest.fn();
    mockedUseCreateProgram.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateProgram>);

    await render(<ProgramCreateScreen userId="user-1" />);

    await fireEvent.press(screen.getByTestId('program-create-save'));
    expect(mutate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('program-create-name'), 'Push / Pull / Legs');
    await fireEvent.press(screen.getByTestId('program-create-save'));
    expect(mutate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('program-create-day-0'), 'Push day');
    await fireEvent.press(screen.getByTestId('program-create-save'));

    expect(mutate).toHaveBeenCalledWith(
      { name: 'Push / Pull / Legs', days: ['Push day'] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  }, 15000);

  it('adds and removes day rows, only sending non-blank names', async () => {
    const mutate = jest.fn();
    mockedUseCreateProgram.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateProgram>);

    await render(<ProgramCreateScreen userId="user-1" />);

    await fireEvent.changeText(screen.getByTestId('program-create-name'), 'Full Body');
    await fireEvent.changeText(screen.getByTestId('program-create-day-0'), 'Day A');
    await fireEvent.press(screen.getByTestId('program-create-add-day'));
    // Second row left blank on purpose — should be filtered out on save.
    expect(screen.getByTestId('program-create-day-1')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('program-create-add-day'));
    await fireEvent.changeText(screen.getByTestId('program-create-day-2'), 'Day B');
    await fireEvent.press(screen.getByTestId('program-create-remove-day-1'));

    await fireEvent.press(screen.getByTestId('program-create-save'));

    expect(mutate).toHaveBeenCalledWith(
      { name: 'Full Body', days: ['Day A', 'Day B'] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('shows an error message when the mutation fails', async () => {
    mockedUseCreateProgram.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useCreateProgram>);

    await render(<ProgramCreateScreen userId="user-1" />);

    expect(screen.getByTestId('program-create-error')).toBeTruthy();
  });
});
