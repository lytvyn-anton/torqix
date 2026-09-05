// AsyncStorage's native module isn't available under Jest — this is the mock the package
// itself ships for testing, used app-wide now that ThemeProvider (in the render tree of most
// screens/components) reads/writes it directly rather than only through the already-mocked
// supabase client.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
