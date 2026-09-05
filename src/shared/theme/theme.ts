// Design tokens for "Liquid Glass" (Phase 2 visual refresh), light and dark variants. See
// PLAN.md's Phase 2 section for the source design canvases. Hex values below are sRGB
// approximations of the canvases' oklch colors — React Native's StyleSheet doesn't accept
// oklch(), so these are the closest flat equivalents.

export type ThemeColors = {
  background: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderInput: string;
  accent: string;
  accentDark: string;
  accentTint: string;
  onAccent: string;
  error: string;
  surfaceTranslucent: string;
};

export const lightColors: ThemeColors = {
  background: '#F7F5F0',
  surface: '#FFFFFF',
  textPrimary: '#211F1A',
  textMuted: '#6B665A',
  textFaint: '#C2BBAC',
  border: '#ECE6D8',
  borderInput: '#DDD3C0',
  accent: '#6F9C82',
  accentDark: '#3C5F49',
  accentTint: 'rgba(111, 156, 130, 0.16)',
  onAccent: '#FFFFFF',
  error: '#B3453A',
  // Layered over the tab bar's BlurView — the app's palette is all cream/white, so blur alone
  // barely shows against it; a translucent white panel on top gives the bar a distinct "glass"
  // read instead of blending into the background.
  surfaceTranslucent: 'rgba(255, 255, 255, 0.55)',
};

// `accentDark` is lightened rather than darkened here — it's used as the accent's
// on-surface text/icon variant (badges, CTA labels), and a darkened sage green loses
// contrast against the dark background where light theme relies on a darkened one against a
// light background. Same field name, direction flipped per theme so call sites don't change.
export const darkColors: ThemeColors = {
  background: '#141513',
  surface: '#272826',
  textPrimary: '#F3F1EA',
  textMuted: '#A39D8F',
  textFaint: '#807A6C',
  border: '#353634',
  borderInput: '#484847',
  accent: '#6F9C82',
  accentDark: '#ABD8BE',
  accentTint: 'rgba(111, 156, 130, 0.16)',
  onAccent: '#FFFFFF',
  error: '#E07267',
  surfaceTranslucent: 'rgba(255, 255, 255, 0.08)',
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

// Cast upward (negative height) since these sit on bottom-edge surfaces like the tab bar —
// the shadow should read above the surface, not below it.
export const shadows = {
  tabBar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 16,
  },
} as const;

// Manrope weights loaded via useAppReady (src/shared/hooks/useAppReady.ts). Apply to
// headings, titles and primary button labels; leave body/meta text on the system font
// (unchanged from before). Pair fontFamily with the matching numeric fontWeight below so
// text still reads as bold if the font asset ever fails to load (see fontError handling
// in useAppReady) — RN falls back to the system font at that weight instead of regular.
export const fonts = {
  heading: 'Manrope_800ExtraBold',
  headingWeight: '800',
  headingBold: 'Manrope_700Bold',
  headingBoldWeight: '700',
  headingMedium: 'Manrope_500Medium',
} as const;
