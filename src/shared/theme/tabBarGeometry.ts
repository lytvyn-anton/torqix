import { spacing } from './theme';

// The floating tab bar (app/(app)/(tabs)/_layout.tsx) is nudged down by this much on iOS,
// since the home-indicator inset leaves more clearance than the bar needs. Shared with
// useFloatingTabBarClearance so screens computing space above the bar agree with where the
// bar actually sits — keeping these in two places previously let them drift out of sync.
export const TAB_BAR_IOS_BOTTOM_TRIM = spacing.sm;
