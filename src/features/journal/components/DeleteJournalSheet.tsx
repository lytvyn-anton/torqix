import { useTranslation } from 'react-i18next';

import { ConfirmSheet } from '../../../shared/components/ConfirmSheet';

type Props = {
  visible: boolean;
  isError?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onKeepGoing: () => void;
};

export function DeleteJournalSheet({ visible, isError, isPending, onConfirm, onKeepGoing }: Props) {
  const { t } = useTranslation();

  return (
    <ConfirmSheet
      visible={visible}
      title={t('journal.deleteSheetTitle')}
      body={t('journal.deleteSheetBody')}
      confirmLabel={t('journal.deleteSheetConfirm')}
      keepGoingLabel={t('journal.deleteSheetKeepGoing')}
      errorText={t('journal.deleteError')}
      isError={isError}
      isPending={isPending}
      onConfirm={onConfirm}
      onKeepGoing={onKeepGoing}
      testIdPrefix="delete-journal"
    />
  );
}
