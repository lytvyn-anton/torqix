import {
  Manrope_500Medium,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Single readiness gate for app startup, combining every async dependency the splash screen
// should wait for (currently: Manrope font assets + session restore). Keeping this in one
// hook means the native splash hides exactly once, straight into real content, instead of
// handing off to a second JS-rendered loading state per dependency.
export function useAppReady(sessionLoading: boolean): boolean {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontError) {
      // Not fatal — text falls back to the system font (see fontWeight fallbacks alongside
      // fontFamily in theme-consuming styles) — but worth surfacing for diagnosis.
      console.warn('Manrope font failed to load, falling back to the system font', fontError);
    }
  }, [fontError]);

  // A failed font load still counts as "settled" — we don't want to block the app forever on
  // a font that will never arrive.
  const fontsSettled = fontsLoaded || !!fontError;
  const appReady = fontsSettled && !sessionLoading;

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  return appReady;
}
