import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NewProgramSheet } from './NewProgramSheet';
import { HeaderPillButton } from '../../../shared/components/HeaderPillButton';

// Header-right button on the Programs tab. Opens a sheet offering the two ways to get a
// program (AI generation or the manual form) rather than navigating straight to manual
// creation — see NewProgramSheet for why that's one button, not two.
export function NewProgramButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <>
      <HeaderPillButton
        label={t('programs.newProgram')}
        accessibilityLabel={t('programs.createTitle')}
        onPress={() => setSheetVisible(true)}
        testID="new-program-button"
      />
      <NewProgramSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onGenerate={() => {
          setSheetVisible(false);
          router.push('/program-generate');
        }}
        onCreateManually={() => {
          setSheetVisible(false);
          router.push('/program-create');
        }}
      />
    </>
  );
}
