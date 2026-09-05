import { useTranslation } from 'react-i18next';

import { ConfirmSheet } from '../../../shared/components/ConfirmSheet';

type Props = {
  visible: boolean;
  isError?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onKeepGoing: () => void;
};

export function CancelWorkoutSheet({ visible, isError, isPending, onConfirm, onKeepGoing }: Props) {
  const { t } = useTranslation();

  return (
    <ConfirmSheet
      visible={visible}
      title={t('workouts.cancelSheetTitle')}
      body={t('workouts.cancelSheetBody')}
      confirmLabel={t('workouts.cancelSheetConfirm')}
      keepGoingLabel={t('workouts.cancelSheetKeepGoing')}
      errorText={t('workouts.cancelError')}
      isError={isError}
      isPending={isPending}
      onConfirm={onConfirm}
      onKeepGoing={onKeepGoing}
      testIdPrefix="cancel-workout"
    />
  );
}
