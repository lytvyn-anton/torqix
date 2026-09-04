import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { authFormStyles as styles } from '../authFormStyles';
import { useAuthForm } from '../hooks/useAuthForm';
import { useSignUp } from '../hooks/useSignUp';

export function SignUpScreen() {
  const { t } = useTranslation();
  const signUp = useSignUp();
  const { email, setEmail, password, setPassword, fieldError, handleSubmit } = useAuthForm(
    signUp.mutate,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.signUpTitle')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('auth.emailLabel')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        testID="sign-up-email"
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.passwordLabel')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password-new"
        testID="sign-up-password"
      />

      {fieldError && <Text style={styles.error}>{t(fieldError)}</Text>}
      {signUp.isError && <Text style={styles.error}>{t('auth.errors.genericSignUp')}</Text>}
      {signUp.isSuccess && signUp.data.alreadyRegistered && (
        <View testID="sign-up-already-registered">
          <Text style={styles.error}>{t('auth.signUpAlreadyRegistered')} </Text>
          <Link href="/sign-in">
            <Text style={styles.switchAction}>{t('auth.signInSwitchAction')}</Text>
          </Link>
        </View>
      )}
      {signUp.isSuccess &&
        !signUp.data.alreadyRegistered &&
        signUp.data.requiresEmailConfirmation && (
          <Text testID="sign-up-confirmation-notice">{t('auth.signUpConfirmationRequired')}</Text>
        )}

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={signUp.isPending}
        testID="sign-up-submit"
      >
        <Text style={styles.submitButtonText}>{t('auth.signUpSubmit')}</Text>
      </TouchableOpacity>

      <View style={styles.switchRow}>
        <Text>{t('auth.signUpSwitchPrompt')} </Text>
        <Link href="/sign-in">
          <Text style={styles.switchAction}>{t('auth.signUpSwitchAction')}</Text>
        </Link>
      </View>
    </View>
  );
}
