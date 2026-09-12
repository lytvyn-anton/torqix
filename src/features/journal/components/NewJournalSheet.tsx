import { useTranslation } from 'react-i18next';

import { GenerateOrManualSheet } from '../../../shared/components/GenerateOrManualSheet';

type Props = {
  visible: boolean;
  onGenerate: () => void;
  onCreateManually: () => void;
  onClose: () => void;
};

// Opened from the Home tab when there's no program to journal against yet — same
// generate-vs-manual choice as NewProgramSheet (src/features/programs/components), but each
// option routes with `intent=journal` so the program screens skip their usual "back to where
// you came from" landing and go straight into logging the new program's first entry instead
// (see program-create.tsx/program-generate.tsx). Shares GenerateOrManualSheet with
// NewProgramSheet — only the title and testIDs differ.
export function NewJournalSheet({ visible, onGenerate, onCreateManually, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <GenerateOrManualSheet
      visible={visible}
      title={t('journal.newJournalTitle')}
      testIdPrefix="new-journal-sheet"
      onGenerate={onGenerate}
      onCreateManually={onCreateManually}
      onClose={onClose}
    />
  );
}
