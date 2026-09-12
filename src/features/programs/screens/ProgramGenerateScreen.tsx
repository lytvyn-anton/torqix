import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGenerateProgram } from '../hooks/useGenerateProgram';
import { useCreateJournal } from '../../journal/hooks/useCreateJournal';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
  // Set when this screen was reached from the Home tab's "start a journal" flow
  // (NewJournalSheet, via program-generate.tsx's `intent` search param) rather than the
  // Programs tab's own "New" button — on success, a journal is created for the generated
  // program and the user goes straight into logging its first entry instead of landing on
  // the program's detail screen.
  intent?: 'journal';
};

// The profile screen already collects goal/level/equipment/days-per-week (Phase 1) and the
// Edge Function reads them straight from `profiles` (see
// supabase/functions/generate-program/index.ts), so this screen has nothing left to ask for
// — it's a single "Generate" action plus the loading/error states around that one call.
export function ProgramGenerateScreen({ userId, intent }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const generateProgram = useGenerateProgram(userId);
  const createJournal = useCreateJournal(userId);

  // Checked by name rather than `instanceof IncompleteProfileError` so this screen doesn't
  // need to import programsApi.ts (and, transitively, the real Supabase client module) just
  // to narrow an error type — useGenerateProgram is already the screen's only touchpoint
  // with the API layer.
  const isIncompleteProfile = generateProgram.error?.name === 'IncompleteProfileError';
  const isPending = generateProgram.isPending || createJournal.isPending;
  // Deliberately not OR'd with createJournal.isError: when only the journal step fails, the
  // program itself was generated fine and the screen navigates to its detail screen below
  // (see handleGenerate) — showing "couldn't generate a program" here would misattribute a
  // journal failure to generation, which didn't happen.
  const isError = generateProgram.isError;

  const handleGenerate = () => {
    generateProgram.mutate(undefined, {
      onSuccess: (program) => {
        if (intent === 'journal') {
          // The program is already saved (and, for a generated one, already AI-billed) at
          // this point regardless of what happens next — always navigate to it rather than
          // leaving the user on a screen with no sign the generation actually succeeded. The
          // Home tab's JournalWidgetCard can always start this program's journal later (it
          // resolves-or-creates on first day tap).
          createJournal.mutate(
            { programId: program.id, name: program.name },
            {
              onSuccess: (journal) => router.replace(`/journal-entry/${journal.id}`),
              onError: () => router.replace(`/program/${program.id}`),
            },
          );
        } else {
          router.replace(`/program/${program.id}`);
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={formStyles.screenTitle}>{t('programs.generateTitle')}</Text>
        <Text style={styles.body}>{t('programs.generateBody')}</Text>

        {isError && (
          <Text style={formStyles.error} testID="program-generate-error">
            {isIncompleteProfile
              ? t('programs.generateIncompleteProfile')
              : t('programs.generateError')}
          </Text>
        )}

        {isIncompleteProfile ? (
          <TouchableOpacity
            style={formStyles.primaryButton}
            onPress={() => router.push('/profile')}
            testID="program-generate-go-to-profile"
            accessibilityRole="button"
          >
            <Text style={formStyles.primaryButtonText}>{t('programs.generateGoToProfile')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[formStyles.primaryButton, isPending && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={isPending}
            testID="program-generate-submit"
            accessibilityRole="button"
          >
            {isPending ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={formStyles.primaryButtonText}>{t('programs.generateSubmit')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    body: {
      color: colors.textMuted,
      fontSize: 14,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
}
