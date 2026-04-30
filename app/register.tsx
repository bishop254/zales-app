import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { ScreenContainer } from '@/components/app/screen-container';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';
import { palette, radius, typography } from '@/constants/app-theme';
import { validateEmail, validatePassword, validateRequired } from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [territory, setTerritory] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const errors = useMemo(
    () => ({
      firstName: validateRequired(firstName, 'First name'),
      lastName: validateRequired(lastName, 'Last name'),
      territory: validateRequired(territory, 'Territory'),
      email: validateEmail(email),
      password: validatePassword(password),
    }),
    [email, firstName, lastName, password, territory]
  );

  const canSubmit = Object.values(errors).every((value) => !value);

  async function handleSubmit() {
    if (!canSubmit || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      await register({ email, firstName, lastName, password, territory });
      router.replace('/dashboard');
    } catch {
      Alert.alert('Registration failed', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <AuthShell
        footer={
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" style={styles.footerLink}>
              Log in
            </Link>
          </Text>
        }
        subtitle="Create an account for your sales team with clear ownership and room for future policy controls."
        title="Create your account">
        <FormField
          autoCapitalize="words"
          error={firstName ? errors.firstName : ''}
          icon="badge"
          label="First name"
          placeholder="Amina"
          value={firstName}
          onChangeText={setFirstName}
        />
        <FormField
          autoCapitalize="words"
          error={lastName ? errors.lastName : ''}
          icon="person-outline"
          label="Last name"
          placeholder="Otieno"
          value={lastName}
          onChangeText={setLastName}
        />
        <FormField
          autoCapitalize="words"
          error={territory ? errors.territory : ''}
          icon="public"
          label="Territory"
          placeholder="Nairobi Flagship"
          value={territory}
          onChangeText={setTerritory}
        />
        <FormField
          error={email ? errors.email : ''}
          icon="mail"
          keyboardType="email-address"
          label="Email address"
          placeholder="agent@salespro.com"
          value={email}
          onChangeText={setEmail}
        />
        <FormField
          error={password ? errors.password : ''}
          icon="lock"
          label="Password"
          placeholder="At least 8 characters"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          disabled={!canSubmit || submitting}
          style={[styles.submitButton, !canSubmit || submitting ? styles.submitButtonDisabled : null]}
          onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>{submitting ? 'Creating account...' : 'Register'}</Text>
        </Pressable>
      </AuthShell>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  submitButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 54,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: palette.white,
    fontSize: typography.title,
    fontWeight: '700',
  },
  footerText: {
    color: palette.textMuted,
    fontSize: typography.bodySmall,
  },
  footerLink: {
    color: palette.accent,
    fontWeight: '700',
  },
});
