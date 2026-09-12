import type { ColorValue } from 'react-native';
import { Path, Svg } from 'react-native-svg';

// Stroke-based line icon matching the app's icon conventions (24px viewBox, round caps,
// 1.8 stroke width) — see TrashIcon.tsx/TabIcons.tsx. Used to hint that a card navigates
// somewhere (e.g. the Home tab's ProgramsWidgetCard, which links to the Programs tab).
type ChevronRightIconProps = {
  color: ColorValue;
  size: number;
};

export function ChevronRightIcon({ color, size }: ChevronRightIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
