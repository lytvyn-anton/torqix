import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ProgramForm } from '../components/ProgramForm';
import { useProgram } from '../hooks/useProgram';
import { useUpdateProgram } from '../hooks/useUpdateProgram';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
  programId: string;
};

export function ProgramEditScreen({ userId, programId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const programQuery = useProgram(programId);
  const updateProgram = useUpdateProgram(userId, programId);

  if (programQuery.isLoading) {
    return (
      <View style={styles.centered} testID="program-edit-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (programQuery.isError || !programQuery.data) {
    return (
      <View style={styles.centered} testID="program-edit-load-error">
        <Text style={formStyles.error}>{t('programs.detailLoadError')}</Text>
      </View>
    );
  }

  return (
    <ProgramForm
      initialName={programQuery.data.name}
      initialDays={programQuery.data.days}
      onSave={(input) => updateProgram.mutate(input, { onSuccess: () => router.back() })}
      isSaving={updateProgram.isPending}
      isError={updateProgram.isError}
      errorText={t('programs.editError')}
      saveLabel={t('programs.saveChanges')}
    />
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      padding: spacing.xl,
    },
  });
}
