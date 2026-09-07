import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { HeaderPillButton } from '../../../shared/components/HeaderPillButton';

// Header-right button on the Programs tab that opens the AI generation screen — sits
// alongside NewProgramButton so AI generation stays reachable once the user already has
// programs (ProgramsScreen's own generate CTA only shows in its empty state).
export function GenerateProgramButton() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <HeaderPillButton
      label={t('programs.generateHeaderLabel')}
      accessibilityLabel={t('programs.generateTitle')}
      onPress={() => router.push('/program-generate')}
      testID="generate-program-button"
    />
  );
}
