import type { ColorValue } from 'react-native';
import { Path, Svg } from 'react-native-svg';

// Stroke-based line icon matching the app's icon conventions (24px viewBox, round caps,
// 1.8 stroke width) — see SettingsIcon.tsx/TabIcons.tsx.
type TrashIconProps = {
  color: ColorValue;
  size: number;
};

export function TrashIcon({ color, size }: TrashIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path
        d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 6l1 13.5A1.5 1.5 0 0 0 8 21h8a1.5 1.5 0 0 0 1.5-1.5L18.5 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 10.5v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M14 10.5v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
