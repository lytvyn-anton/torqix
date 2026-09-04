import { render, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { ProgramsScreen } from './ProgramsScreen';

describe('ProgramsScreen', () => {
  it('renders the placeholder', async () => {
    await render(<ProgramsScreen />);

    expect(screen.getByTestId('programs-placeholder')).toBeTruthy();
  });
});
