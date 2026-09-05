import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type Blob = {
  size: number;
  color: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

type BackgroundSpec = {
  // Approximates the design canvas's `linear-gradient(160deg, ...)` — expo-linear-gradient
  // takes normalized start/end points rather than a CSS angle, so these are the (x, y)
  // fractions for a line through the center at ~160deg rather than a literal conversion.
  gradientColors: readonly [string, string, string];
  gradientLocations: readonly [number, number, number];
  blobs: readonly Blob[];
};

// Positions/sizes are the exact px values from the Phase 2 design canvas's 390×844 reference
// frame (see PLAN.md's Phase 2 "Liquid Glass" canvases) — not scaled per device. The blobs
// are large, soft, and mostly off-screen at the edges, so this reads fine across typical phone
// screen sizes without needing runtime scaling math.
const DARK_BACKGROUND: BackgroundSpec = {
  gradientColors: ['#1B1C19', '#141513', '#0E0F0E'],
  gradientLocations: [0, 0.55, 1],
  blobs: [
    { top: -110, left: -100, size: 420, color: 'rgba(96,138,112,0.34)' },
    { top: 20, right: -150, size: 380, color: 'rgba(112,126,156,0.28)' },
    { bottom: -160, left: -90, size: 440, color: 'rgba(168,140,100,0.24)' },
    { bottom: 150, right: -110, size: 280, color: 'rgba(96,138,112,0.20)' },
  ],
};

const LIGHT_BACKGROUND: BackgroundSpec = {
  gradientColors: ['#EEEFE9', '#DADCD2', '#C7C9BC'],
  gradientLocations: [0, 0.45, 1],
  blobs: [
    { top: -100, left: -90, size: 400, color: 'rgba(108,145,120,0.50)' },
    { top: 40, right: -140, size: 360, color: 'rgba(140,150,176,0.46)' },
    { bottom: -140, left: -80, size: 420, color: 'rgba(198,176,140,0.44)' },
    { bottom: 160, right: -100, size: 260, color: 'rgba(108,145,120,0.30)' },
  ],
};

function blobStyle(blob: Blob): StyleProp<ViewStyle> {
  return [
    styles.blob,
    {
      width: blob.size,
      height: blob.size,
      borderRadius: blob.size / 2,
      backgroundColor: blob.color,
      top: blob.top,
      bottom: blob.bottom,
      left: blob.left,
      right: blob.right,
    },
  ];
}

// Ambient, blurred-color backdrop behind main content — replaces a flat background fill.
// RN has no direct equivalent of the canvas's per-shape `filter: blur()`, so this renders the
// blobs at full opacity/sharp edges and blurs the whole composited layer with one BlurView on
// top instead, which blends them into soft overlapping glows. An approximation of the design
// canvas, not a pixel-identical port.
//
// Mounted once behind the whole tab navigator (app/(app)/(tabs)/_layout.tsx), so it re-renders
// whenever that navigator does — a safe-area inset or locale change, not just an actual theme
// flip. memo() plus memoizing the derived blob styles below means those unrelated re-renders
// skip rebuilding this component's output entirely.
export const Background = memo(function Background() {
  const { resolvedScheme, blurTint } = useTheme();
  const spec = resolvedScheme === 'dark' ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  const blobStyles = useMemo(() => spec.blobs.map(blobStyle), [spec]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={spec.gradientColors}
        locations={spec.gradientLocations}
        start={{ x: 0.33, y: 0.03 }}
        end={{ x: 0.67, y: 0.97 }}
        style={StyleSheet.absoluteFill}
      />
      {blobStyles.map((style, index) => (
        <View key={index} style={style} />
      ))}
      {/* Follows the app's resolved theme (blurTint), not expo-blur's own "default" tint,
          which only tracks the OS appearance and would mismatch a user-chosen override. */}
      <BlurView intensity={90} tint={blurTint} style={StyleSheet.absoluteFill} />
    </View>
  );
});

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
  },
});
