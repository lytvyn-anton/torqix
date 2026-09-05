import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';

import { darkColors, lightColors } from './theme';
import { ThemeProvider, useTheme } from './ThemeProvider';

function Probe() {
  const { colors, mode, resolvedScheme, setMode, isHydrated } = useTheme();
  return (
    <>
      <Text testID="mode">{mode}</Text>
      <Text testID="resolved-scheme">{resolvedScheme}</Text>
      <Text testID="background">{colors.background}</Text>
      <Text testID="hydrated">{String(isHydrated)}</Text>
      <TouchableOpacity testID="set-dark" onPress={() => setMode('dark')}>
        <Text>set dark</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="set-light" onPress={() => setMode('light')}>
        <Text>set light</Text>
      </TouchableOpacity>
    </>
  );
}

describe('ThemeProvider', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to system mode, resolved to light under the test environment', async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved-scheme')).toHaveTextContent('light');
    expect(screen.getByTestId('background')).toHaveTextContent(lightColors.background);
    expect(await screen.findByTestId('hydrated')).toHaveTextContent('true');
  });

  it('switches the resolved colors and persists the explicit choice', async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId('set-dark'));

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved-scheme')).toHaveTextContent('dark');
    expect(screen.getByTestId('background')).toHaveTextContent(darkColors.background);
    expect(await AsyncStorage.getItem('theme-preference')).toBe('dark');
  });

  it('restores a persisted mode on mount', async () => {
    await AsyncStorage.setItem('theme-preference', 'dark');

    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(await screen.findByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved-scheme')).toHaveTextContent('dark');
  });

  it('still settles to hydrated when reading the persisted preference fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage unavailable'));

    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(await screen.findByTestId('hydrated')).toHaveTextContent('true');
    expect(screen.getByTestId('mode')).toHaveTextContent('system');
  });

  it('throws when useTheme is called outside a ThemeProvider', async () => {
    // Swallow the expected React error-boundary console.error noise for this one assertion.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(render(<Probe />)).rejects.toThrow('useTheme must be used within a ThemeProvider');

    consoleError.mockRestore();
  });
});
