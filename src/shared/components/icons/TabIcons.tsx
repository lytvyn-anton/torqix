import type { ColorValue } from 'react-native';
import { Path, Svg } from 'react-native-svg';

// Stroke-based line icons matching the Phase 2 design canvas (24px viewBox, round caps/joins,
// 1.8 stroke width) — used by the tab bar, so they take the active/inactive tint as `color`.
// `ColorValue` (not plain `string`) matches the type React Navigation's tabBarIcon hands us.
export type TabIconProps = {
  color: ColorValue;
  size: number;
};

export function HomeIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11.5 12 4l9 7.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 10v9a1 1 0 0 0 1 1H9v-6h6v6h2.5a1 1 0 0 0 1-1v-9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ProgramsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 9v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M20 9v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M4 12h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M7 7v10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M17 7v10" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function TrendingUpIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 16l5-5 4 4 7-8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 6h6v6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CoachIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5h16v10H9l-4 4V5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
