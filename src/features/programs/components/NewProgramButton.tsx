import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { HeaderPillButton } from '../../../shared/components/HeaderPillButton';

// Header-right button on the Programs tab that opens the manual creation screen.
export function NewProgramButton() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <HeaderPillButton
      label={t('programs.newProgram')}
      accessibilityLabel={t('programs.createTitle')}
      onPress={() => router.push('/program-create')}
      testID="new-program-button"
    />
  );
}
