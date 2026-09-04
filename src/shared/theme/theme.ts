// Design tokens for "Direction C — Calm Focused", chosen in the Phase 2 design pass.
// See the design canvas linked from PLAN.md's Phase 2 section for the source mockups.
// Hex values below are sRGB approximations of the canvas's oklch colors — React Native's
// StyleSheet doesn't accept oklch(), so these are the closest flat equivalents.

export const colors = {
  background: '#F7F5F0',
  surface: '#FFFFFF',
  textPrimary: '#2E2A22',
  textMuted: '#8A8378',
  textFaint: '#C2BBAC',
  border: '#ECE6D8',
  borderInput: '#DDD3C0',
  accent: '#6F9C82',
  accentDark: '#3C5F49',
  accentTint: 'rgba(111, 156, 130, 0.16)',
  onAccent: '#FFFFFF',
  error: '#B3453A',
} as const;

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
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
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
