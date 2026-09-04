import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSignOut } from '../../auth/hooks/useSignOut';
import { MultiOptionPicker } from '../components/MultiOptionPicker';
import { OptionPicker } from '../components/OptionPicker';
import { useProfile } from '../hooks/useProfile';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import {
  EQUIPMENT_OPTIONS,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  SPLIT_PREFERENCE_OPTIONS,
  TRAINING_LOCATION_OPTIONS,
  type Equipment,
  type Goal,
  type Level,
  type Profile,
  type SplitPreference,
  type TrainingLocation,
} from '../types';

// profiles.age / profiles.session_minutes / profiles.available_days_per_week are smallint
// columns: round to whole numbers and reject negatives client-side so we never silently store
// a value Postgres would round/coerce.
function toIntegerOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

// profiles.height_cm / profiles.weight_kg are numeric(5,1): round to one decimal so the
// value we save matches what the user sees echoed back.
function toDecimalOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 10) / 10;
}

type Props = {
  userId: string;
};

export function ProfileScreen({ userId }: Props) {
  const { t } = useTranslation();
  const signOut = useSignOut();
  const profileQuery = useProfile(userId);

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={styles.centered} testID="profile-loading">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  // Only treat this as a fatal load failure when we've never had data (first load). A
  // background refetch error (token refresh blip, brief network loss) shouldn't unmount the
  // form and discard whatever the user was in the middle of editing.
  if (profileQuery.isError && profileQuery.data === undefined) {
    return (
      <SafeAreaView style={styles.centered} testID="profile-load-error">
        <Text style={styles.error}>{t('profile.loadError')}</Text>
        <Text
          style={styles.signOut}
          onPress={() => {
            if (!signOut.isPending) signOut.mutate();
          }}
          testID="profile-load-error-sign-out"
        >
          {t('auth.signOut')}
        </Text>
      </SafeAreaView>
    );
  }

  return <ProfileForm userId={userId} profile={profileQuery.data ?? null} />;
}

type FormProps = {
  userId: string;
  profile: Profile | null;
};

function ProfileForm({ userId, profile }: FormProps) {
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile(userId);
  const signOut = useSignOut();

  const [age, setAge] = useState(profile?.age?.toString() ?? '');
  const [heightCm, setHeightCm] = useState(profile?.heightCm?.toString() ?? '');
  const [weightKg, setWeightKg] = useState(profile?.weightKg?.toString() ?? '');
  const [sessionMinutes, setSessionMinutes] = useState(profile?.sessionMinutes?.toString() ?? '');
  const [availableDaysPerWeek, setAvailableDaysPerWeek] = useState(
    profile?.availableDaysPerWeek?.toString() ?? '',
  );
  const [goal, setGoal] = useState<Goal | null>(profile?.goal ?? null);
  const [level, setLevel] = useState<Level | null>(profile?.level ?? null);
  const [trainingLocation, setTrainingLocation] = useState<TrainingLocation | null>(
    profile?.trainingLocation ?? null,
  );
  const [equipment, setEquipment] = useState<Equipment[]>(profile?.equipment ?? []);
  const [splitPreference, setSplitPreference] = useState<SplitPreference | null>(
    profile?.splitPreference ?? null,
  );

  const handleSave = () => {
    if (updateProfile.isPending) return;
    updateProfile.mutate({
      age: toIntegerOrNull(age),
      heightCm: toDecimalOrNull(heightCm),
      weightKg: toDecimalOrNull(weightKg),
      sessionMinutes: toIntegerOrNull(sessionMinutes),
      availableDaysPerWeek: toIntegerOrNull(availableDaysPerWeek),
      goal,
      level,
      trainingLocation,
      // Equipment only means something for "home_equipped" — clear it if the user picks a
      // different location so we don't persist a stale checklist from a prior choice.
      equipment: trainingLocation === 'home_equipped' ? equipment : [],
      splitPreference,
    });
  };

  const handleSignOut = () => {
    if (signOut.isPending) return;
    signOut.mutate();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('profile.title')}</Text>

        <Text style={styles.label}>{t('profile.ageLabel')}</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          testID="profile-age"
        />

        <Text style={styles.label}>{t('profile.heightLabel')}</Text>
        <TextInput
          style={styles.input}
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="decimal-pad"
          testID="profile-height"
        />

        <Text style={styles.label}>{t('profile.weightLabel')}</Text>
        <TextInput
          style={styles.input}
          value={weightKg}
          onChangeText={setWeightKg}
          keyboardType="decimal-pad"
          testID="profile-weight"
        />

        <Text style={styles.label}>{t('profile.sessionMinutesLabel')}</Text>
        <TextInput
          style={styles.input}
          value={sessionMinutes}
          onChangeText={setSessionMinutes}
          keyboardType="number-pad"
          testID="profile-session-minutes"
        />

        <Text style={styles.label}>{t('profile.availableDaysPerWeekLabel')}</Text>
        <TextInput
          style={styles.input}
          value={availableDaysPerWeek}
          onChangeText={setAvailableDaysPerWeek}
          keyboardType="number-pad"
          testID="profile-available-days-per-week"
        />

        <Text style={styles.label}>{t('profile.goalLabel')}</Text>
        <OptionPicker
          options={GOAL_OPTIONS}
          value={goal}
          onChange={setGoal}
          labelKey={(option) => `profile.goals.${option}`}
          testIDPrefix="goal"
        />

        <Text style={styles.label}>{t('profile.levelLabel')}</Text>
        <OptionPicker
          options={LEVEL_OPTIONS}
          value={level}
          onChange={setLevel}
          labelKey={(option) => `profile.levels.${option}`}
          testIDPrefix="level"
        />

        <Text style={styles.label}>{t('profile.trainingLocationLabel')}</Text>
        <OptionPicker
          options={TRAINING_LOCATION_OPTIONS}
          value={trainingLocation}
          onChange={setTrainingLocation}
          labelKey={(option) => `profile.trainingLocations.${option}`}
          testIDPrefix="location"
        />

        {trainingLocation === 'home_equipped' && (
          <>
            <Text style={styles.label}>{t('profile.equipmentLabel')}</Text>
            <MultiOptionPicker
              options={EQUIPMENT_OPTIONS}
              value={equipment}
              onChange={setEquipment}
              labelKey={(option) => `profile.equipment.${option}`}
              testIDPrefix="equipment"
            />
          </>
        )}

        <Text style={styles.label}>{t('profile.splitPreferenceLabel')}</Text>
        <OptionPicker
          options={SPLIT_PREFERENCE_OPTIONS}
          value={splitPreference}
          onChange={setSplitPreference}
          labelKey={(option) => `profile.splitPreferences.${option}`}
          testIDPrefix="split"
        />

        {updateProfile.isError && <Text style={styles.error}>{t('profile.saveError')}</Text>}
        {updateProfile.isSuccess && <Text testID="profile-saved">{t('profile.saved')}</Text>}

        <View style={[styles.saveButton, updateProfile.isPending && styles.buttonDisabled]}>
          <Text
            style={styles.saveButtonText}
            onPress={handleSave}
            testID="profile-save"
            accessibilityRole="button"
          >
            {t('profile.save')}
          </Text>
        </View>

        <Text
          style={[styles.signOut, signOut.isPending && styles.buttonDisabled]}
          onPress={handleSignOut}
          testID="profile-sign-out"
        >
          {t('auth.signOut')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 24,
    gap: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  error: {
    color: '#c00',
  },
  saveButton: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  signOut: {
    textAlign: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
