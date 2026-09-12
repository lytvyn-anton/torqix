import { useTranslation } from 'react-i18next';

import { GenerateOrManualSheet } from '../../../shared/components/GenerateOrManualSheet';

type Props = {
  visible: boolean;
  onGenerate: () => void;
  onCreateManually: () => void;
  onClose: () => void;
};

// Bottom sheet opened from the Programs tab header's "New" button, offering the two ways to
// get a program: AI generation (the faster, primary path) or the manual form. Kept as one
// header entry point rather than two separate pills — a second pill next to the tab's
// "Programs" title header overflowed/overlapped on device.
export function NewProgramSheet({ visible, onGenerate, onCreateManually, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <GenerateOrManualSheet
      visible={visible}
      title={t('programs.createTitle')}
      testIdPrefix="new-program-sheet"
      onGenerate={onGenerate}
      onCreateManually={onCreateManually}
      onClose={onClose}
    />
  );
}
