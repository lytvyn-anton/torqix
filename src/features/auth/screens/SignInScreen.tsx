import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAuthFormStyles } from '../authFormStyles';
import { AuthScreenContainer } from '../components/AuthScreenContainer';
import { useAuthForm } from '../hooks/useAuthForm';
import { useSignIn } from '../hooks/useSignIn';

export function SignInScreen() {
  const { t } = useTranslation();
  const styles = useAuthFormStyles();
  const signIn = useSignIn();
  const { email, setEmail, password, setPassword, fieldError, handleSubmit } = useAuthForm(
    signIn.mutate,
  );

  return (
    <AuthScreenContainer>
      <Text style={styles.title}>{t('auth.signInTitle')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('auth.emailLabel')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        testID="sign-in-email"
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.passwordLabel')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        testID="sign-in-password"
      />

      {fieldError && <Text style={styles.error}>{t(fieldError)}</Text>}
      {signIn.isError && <Text style={styles.error}>{t('auth.errors.genericSignIn')}</Text>}

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={signIn.isPending}
        testID="sign-in-submit"
      >
        <Text style={styles.submitButtonText}>{t('auth.signInSubmit')}</Text>
      </TouchableOpacity>

      <View style={styles.switchRow}>
        <Text>{t('auth.signInSwitchPrompt')} </Text>
        <Link href="/sign-up">
          <Text style={styles.switchAction}>{t('auth.signInSwitchAction')}</Text>
        </Link>
      </View>
    </AuthScreenContainer>
  );
}
