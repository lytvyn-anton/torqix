import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './theme';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedScheme = 'light' | 'dark';

const STORAGE_KEY = 'theme-preference';

type ThemeContextValue = {
  colors: ThemeColors;
  mode: ThemeMode;
  resolvedScheme: ResolvedScheme;
  setMode: (mode: ThemeMode) => void;
  // False until the persisted preference has been read (or failed to read) once. Consumed by
  // useAppReady so the splash screen doesn't hide onto a briefly-wrong (default "system")
  // theme while a stored "light"/"dark" override is still in flight.
  isHydrated: boolean;
  // Derived once here (rather than each BlurView call site writing its own
  // `resolvedScheme === 'dark' ? 'dark' : 'light'` ternary) so every glass surface follows
  // the app's resolved theme — which can be a user override, not just the OS appearance —
  // instead of expo-blur's own `tint="default"`, which only tracks the OS.
  blurTint: 'light' | 'dark';
  // Same idea for expo-status-bar's `style` prop, whose values are named for the icon color
  // (not the background), so the mapping is inverted from blurTint's.
  statusBarStyle: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      })
      // A failed read still counts as "settled" — fall back to the "system" default rather
      // than blocking app startup forever on it (mirrors useAppReady's font-error handling).
      .catch(() => {})
      .finally(() => setIsHydrated(true));
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => {});
  };

  const resolvedScheme: ResolvedScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = resolvedScheme === 'dark' ? darkColors : lightColors;
  const blurTint = resolvedScheme;
  const statusBarStyle: 'light' | 'dark' = resolvedScheme === 'dark' ? 'light' : 'dark';

  const value = useMemo(
    () => ({ colors, mode, resolvedScheme, setMode, isHydrated, blurTint, statusBarStyle }),
    [colors, mode, resolvedScheme, isHydrated, blurTint, statusBarStyle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Shared boilerplate for the "colors flip per theme, so the StyleSheet has to be rebuilt
// alongside them" pattern used throughout screens/components — replaces the repeated
// `const { colors } = useTheme(); useMemo(() => build(colors), [colors])` pair.
export function useThemedStyles<T>(build: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => build(colors), [colors, build]);
}
