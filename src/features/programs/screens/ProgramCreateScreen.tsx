import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formStyles } from '../../../shared/theme/formStyles';
import { colors, spacing } from '../../../shared/theme/theme';
import { useCreateProgram } from '../hooks/useCreateProgram';

type Props = {
  userId: string;
};

type DayField = {
  key: string;
  name: string;
};

export function ProgramCreateScreen({ userId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const createProgram = useCreateProgram(userId);
  // Keys are only for list identity across add/remove — day names themselves are what
  // gets saved, so a simple incrementing counter is enough (no uuid needed).
  const nextKey = useRef(1);

  const [name, setName] = useState('');
  const [days, setDays] = useState<DayField[]>([{ key: '0', name: '' }]);

  const addDay = () => {
    setDays((current) => [...current, { key: String(nextKey.current++), name: '' }]);
  };

  const updateDay = (key: string, value: string) => {
    setDays((current) => current.map((day) => (day.key === key ? { ...day, name: value } : day)));
  };

  const removeDay = (key: string) => {
    setDays((current) => current.filter((day) => day.key !== key));
  };

  const trimmedName = name.trim();
  const validDayNames = days.map((day) => day.name.trim()).filter(Boolean);
  const canSave = trimmedName.length > 0 && validDayNames.length > 0 && !createProgram.isPending;

  const handleSave = () => {
    if (!canSave) return;
    createProgram.mutate(
      { name: trimmedName, days: validDayNames },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.label}>{t('programs.nameLabel')}</Text>
        <TextInput
          style={formStyles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('programs.namePlaceholder')}
          placeholderTextColor={colors.textFaint}
          testID="program-create-name"
        />

        <Text style={styles.label}>{t('programs.daysLabel')}</Text>
        {days.map((day, index) => (
          <View key={day.key} style={styles.dayRow}>
            <TextInput
              style={[formStyles.input, styles.dayInput]}
              value={day.name}
              onChangeText={(value) => updateDay(day.key, value)}
              placeholder={t('programs.dayPlaceholder')}
              placeholderTextColor={colors.textFaint}
              testID={`program-create-day-${index}`}
            />
            {days.length > 1 && (
              <TouchableOpacity
                onPress={() => removeDay(day.key)}
                style={styles.removeDay}
                accessibilityRole="button"
                accessibilityLabel={t('programs.removeDay')}
                testID={`program-create-remove-day-${index}`}
              >
                <Text style={styles.removeDayText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          onPress={addDay}
          style={styles.addDay}
          accessibilityRole="button"
          testID="program-create-add-day"
        >
          <Text style={styles.addDayText}>{t('programs.addDay')}</Text>
        </TouchableOpacity>

        {createProgram.isError && (
          <Text style={formStyles.error} testID="program-create-error">
            {t('programs.createError')}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          testID="program-create-save"
          accessibilityRole="button"
        >
          <Text style={formStyles.primaryButtonText}>{t('programs.create')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  label: {
    fontWeight: '600',
    marginTop: spacing.sm,
    color: colors.textPrimary,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayInput: {
    flex: 1,
  },
  removeDay: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDayText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  addDay: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  addDayText: {
    color: colors.accentDark,
    fontWeight: '600',
  },
  saveButton: {
    ...formStyles.primaryButton,
    marginTop: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
