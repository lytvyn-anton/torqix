import { useTranslation } from 'react-i18next';

import { ConfirmSheet } from '../../../shared/components/ConfirmSheet';

type Props = {
  visible: boolean;
  isError?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onKeepGoing: () => void;
};

export function DeleteProgramSheet({ visible, isError, isPending, onConfirm, onKeepGoing }: Props) {
  const { t } = useTranslation();

  return (
    <ConfirmSheet
      visible={visible}
      title={t('programs.deleteSheetTitle')}
      body={t('programs.deleteSheetBody')}
      confirmLabel={t('programs.deleteSheetConfirm')}
      keepGoingLabel={t('programs.deleteSheetKeepGoing')}
      errorText={t('programs.deleteError')}
      isError={isError}
      isPending={isPending}
      onConfirm={onConfirm}
      onKeepGoing={onKeepGoing}
      testIdPrefix="delete-program"
    />
  );
}
