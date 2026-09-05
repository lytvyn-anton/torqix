import { screen } from '@testing-library/react-native';

import { renderWithProviders as render } from '../testing/renderWithProviders';
import { Background } from './Background';

describe('Background', () => {
  it('renders without crashing behind the default (light) theme', async () => {
    await render(<Background />);

    // Nothing meaningful to assert on by testID (it's decorative, pointerEvents="none"), so
    // just confirm the tree renders — a bad gradient/blob prop shape would throw here.
    expect(screen.toJSON()).toBeTruthy();
  });
});
