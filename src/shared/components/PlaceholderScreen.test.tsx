import { screen } from '@testing-library/react-native';

import { renderWithProviders as render } from '../testing/renderWithProviders';
import { PlaceholderScreen } from './PlaceholderScreen';

describe('PlaceholderScreen', () => {
  it('renders the given message under the given testID', async () => {
    await render(<PlaceholderScreen message="Coming soon" testID="some-placeholder" />);

    expect(screen.getByTestId('some-placeholder')).toBeTruthy();
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });
});
