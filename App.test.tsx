import { render, screen } from '@testing-library/react-native';

import App from './App';
import en from './src/shared/i18n/locales/en.json';

describe('App', () => {
  it('renders the translated greeting', async () => {
    await render(<App />);
    expect(await screen.findByText(en.home.greeting)).toBeTruthy();
  });
});
