import { render, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { CoachScreen } from './CoachScreen';

describe('CoachScreen', () => {
  it('renders the placeholder', async () => {
    await render(<CoachScreen />);

    expect(screen.getByTestId('coach-placeholder')).toBeTruthy();
  });
});
