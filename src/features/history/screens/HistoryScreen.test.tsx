import { screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { HistoryScreen } from './HistoryScreen';

describe('HistoryScreen', () => {
  it('renders the placeholder', async () => {
    await render(<HistoryScreen />);

    expect(screen.getByTestId('history-placeholder')).toBeTruthy();
  });
});
