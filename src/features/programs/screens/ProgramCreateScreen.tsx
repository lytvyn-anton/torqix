import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ProgramForm } from '../components/ProgramForm';
import { useCreateProgram } from '../hooks/useCreateProgram';

type Props = {
  userId: string;
};

export function ProgramCreateScreen({ userId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const createProgram = useCreateProgram(userId);

  return (
    <ProgramForm
      onSave={(input) => createProgram.mutate(input, { onSuccess: () => router.back() })}
      isSaving={createProgram.isPending}
      isError={createProgram.isError}
      errorText={t('programs.createError')}
      saveLabel={t('programs.create')}
    />
  );
}
