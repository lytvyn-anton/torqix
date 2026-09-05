import { renderHook, waitFor } from '@testing-library/react-native';
import { useFonts } from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';

import { useAppReady } from './useAppReady';

jest.mock('@expo-google-fonts/manrope', () => ({
  useFonts: jest.fn(),
  Manrope_500Medium: 'Manrope_500Medium',
  Manrope_700Bold: 'Manrope_700Bold',
  Manrope_800ExtraBold: 'Manrope_800ExtraBold',
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockedUseFonts = jest.mocked(useFonts);
const mockedHideAsync = jest.mocked(SplashScreen.hideAsync);

describe('useAppReady', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is not ready while fonts are still loading, even if the session is ready', async () => {
    mockedUseFonts.mockReturnValue([false, null]);

    const { result } = await renderHook(() => useAppReady(false, true));

    expect(result.current).toBe(false);
    expect(mockedHideAsync).not.toHaveBeenCalled();
  });

  it('is not ready while the session is still loading, even if fonts are ready', async () => {
    mockedUseFonts.mockReturnValue([true, null]);

    const { result } = await renderHook(() => useAppReady(true, true));

    expect(result.current).toBe(false);
    expect(mockedHideAsync).not.toHaveBeenCalled();
  });

  it('is not ready while the theme preference is still hydrating, even if fonts and session are ready', async () => {
    mockedUseFonts.mockReturnValue([true, null]);

    const { result } = await renderHook(() => useAppReady(false, false));

    expect(result.current).toBe(false);
    expect(mockedHideAsync).not.toHaveBeenCalled();
  });

  it('is ready and hides the splash screen once fonts have loaded and the session has settled', async () => {
    mockedUseFonts.mockReturnValue([true, null]);

    const { result } = await renderHook(() => useAppReady(false, true));

    expect(result.current).toBe(true);
    await waitFor(() => expect(mockedHideAsync).toHaveBeenCalledTimes(1));
  });

  it('treats a font load error as settled rather than blocking forever', async () => {
    mockedUseFonts.mockReturnValue([false, new Error('font fetch failed')]);

    const { result } = await renderHook(() => useAppReady(false, true));

    expect(result.current).toBe(true);
    await waitFor(() => expect(mockedHideAsync).toHaveBeenCalledTimes(1));
  });
});
