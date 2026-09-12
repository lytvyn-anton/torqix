import { fireEvent, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { NewJournalSheet } from './NewJournalSheet';

describe('NewJournalSheet', () => {
  it('renders nothing interactive when not visible', async () => {
    await render(
      <NewJournalSheet
        visible={false}
        onGenerate={jest.fn()}
        onCreateManually={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('new-journal-sheet-generate')).toBeNull();
  });

  it('calls onGenerate when the AI option is pressed', async () => {
    const onGenerate = jest.fn();

    await render(
      <NewJournalSheet
        visible
        onGenerate={onGenerate}
        onCreateManually={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    await fireEvent.press(screen.getByTestId('new-journal-sheet-generate'));

    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('calls onCreateManually when the manual option is pressed', async () => {
    const onCreateManually = jest.fn();

    await render(
      <NewJournalSheet
        visible
        onGenerate={jest.fn()}
        onCreateManually={onCreateManually}
        onClose={jest.fn()}
      />,
    );
    await fireEvent.press(screen.getByTestId('new-journal-sheet-manual'));

    expect(onCreateManually).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is pressed', async () => {
    const onClose = jest.fn();

    await render(
      <NewJournalSheet
        visible
        onGenerate={jest.fn()}
        onCreateManually={jest.fn()}
        onClose={onClose}
      />,
    );
    await fireEvent.press(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
