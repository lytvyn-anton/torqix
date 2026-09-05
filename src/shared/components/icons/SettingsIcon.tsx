import type { ColorValue } from 'react-native';
import { Circle, Path, Svg } from 'react-native-svg';

// Stroke-based line icon matching the Phase 2 design canvas conventions (24px viewBox,
// round caps, 1.8 stroke width) — see TabIcons.tsx. Three sliders rather than a gear/cog:
// simpler to draw cleanly at this stroke weight and a common "Settings" pattern.
type SettingsIconProps = {
  color: ColorValue;
  size: number;
};

export function SettingsIcon({ color, size }: SettingsIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h8.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M17.6 7H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={15} cy={7} r={2.2} stroke={color} strokeWidth={1.8} />

      <Path d="M4 12h2.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M11.6 12H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={9} cy={12} r={2.2} stroke={color} strokeWidth={1.8} />

      <Path d="M4 17h10.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M19.6 17H20" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={17} cy={17} r={2.2} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
