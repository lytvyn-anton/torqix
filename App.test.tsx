import { render } from '@testing-library/react-native';

import App from './App';

describe('App', () => {
  it('renders without crashing', async () => {
    const { toJSON } = await render(<App />);
    expect(toJSON()).toBeTruthy();
  });
});
