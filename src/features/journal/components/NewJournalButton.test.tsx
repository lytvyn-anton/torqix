import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { NewJournalButton } from './NewJournalButton';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);

describe('NewJournalButton', () => {
  it('opens the new-journal sheet on press', async () => {
    mockedUseRouter.mockReturnValue({ push: jest.fn() } as unknown as ReturnType<typeof useRouter>);

    await render(<NewJournalButton />);

    expect(screen.queryByTestId('new-journal-sheet-generate')).toBeNull();
    await fireEvent.press(screen.getByTestId('new-journal-button'));
    expect(screen.getByTestId('new-journal-sheet-generate')).toBeTruthy();
  });

  it('navigates to /program-generate with intent=journal and closes the sheet from the AI option', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    await render(<NewJournalButton />);
    await fireEvent.press(screen.getByTestId('new-journal-button'));
    await fireEvent.press(screen.getByTestId('new-journal-sheet-generate'));

    expect(push).toHaveBeenCalledWith('/program-generate?intent=journal');
    expect(screen.queryByTestId('new-journal-sheet-generate')).toBeNull();
  });

  it('navigates to /program-create with intent=journal and closes the sheet from the manual option', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    await render(<NewJournalButton />);
    await fireEvent.press(screen.getByTestId('new-journal-button'));
    await fireEvent.press(screen.getByTestId('new-journal-sheet-manual'));

    expect(push).toHaveBeenCalledWith('/program-create?intent=journal');
    expect(screen.queryByTestId('new-journal-sheet-manual')).toBeNull();
  });
});
