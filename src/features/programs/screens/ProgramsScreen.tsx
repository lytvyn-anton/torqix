import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '../../../shared/components/PlaceholderScreen';

// Placeholder for this tab until "Manual workout program creation screen" builds the real
// list + creation flow.
export function ProgramsScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen message={t('programs.comingSoon')} testID="programs-placeholder" />;
}
