import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '../../../shared/components/PlaceholderScreen';

// Placeholder for this tab until "Workout history list" builds the real Sessions/Exercises
// view.
export function HistoryScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen message={t('history.comingSoon')} testID="history-placeholder" />;
}
