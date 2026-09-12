import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NewJournalSheet } from './NewJournalSheet';
import { HeaderPillButton } from '../../../shared/components/HeaderPillButton';

// Header-right button on the Home tab, mirroring NewProgramButton on the Programs tab —
// lives in the tab bar's header (app/(app)/(tabs)/_layout.tsx) rather than inside
// JournalWidgetCard, so it stays a fixed, predictably-placed element regardless of how long
// the active program's name is (previously, living inside the card, a long wrapped name
// pushed the card taller while the button stayed pinned top-right, reading as if it had
// drifted loose from the card).
export function NewJournalButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <>
      <HeaderPillButton
        label={t('programs.newProgram')}
        accessibilityLabel={t('journal.newJournalTitle')}
        onPress={() => setSheetVisible(true)}
        testID="new-journal-button"
      />
      <NewJournalSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onGenerate={() => {
          setSheetVisible(false);
          router.push('/program-generate?intent=journal');
        }}
        onCreateManually={() => {
          setSheetVisible(false);
          router.push('/program-create?intent=journal');
        }}
      />
    </>
  );
}
