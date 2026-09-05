// AsyncStorage's native module isn't available under Jest — this is the mock the package
// itself ships for testing, used app-wide now that ThemeProvider (in the render tree of most
// screens/components) reads/writes it directly rather than only through the already-mocked
// supabase client.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// SafeAreaProvider only resolves its children once real native measurement fires (needed
// because RN's Modal opens a separate native window on iOS, so screens presented in a Modal
// nest their own SafeAreaProvider rather than relying on the app-root one). That measurement
// never happens under Jest, so a SafeAreaProvider rendered without explicit `initialMetrics`
// (as the one nested inside a Modal necessarily is — it takes no props from the test) would
// otherwise render no children at all. Default the metrics only when a test hasn't already
// supplied its own (e.g. ProgramsScreen/CoachScreen/HistoryScreen tests, which pass specific
// values to exercise their safe-area-dependent layout) — SafeAreaView is left real throughout.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const actual = jest.requireActual('react-native-safe-area-context');
  const defaultMetrics = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };
  return {
    ...actual,
    SafeAreaProvider: (props) =>
      React.createElement(actual.SafeAreaProvider, {
        ...props,
        initialMetrics: props.initialMetrics ?? defaultMetrics,
      }),
  };
});
