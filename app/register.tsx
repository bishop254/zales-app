import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppLogo } from '@/components/app/app-logo';
import {
  AuthBackground,
  AuthButton,
  AuthCard,
  AuthHeader,
  AuthSearchSelectField,
  AuthSelectField,
  AuthTextField,
  ConsentRow,
  SplitAuthLayout,
} from '@/components/auth/auth-primitives';
import {
  africanCountries,
  africanCountryOptions,
  africanDialCodeOptions,
} from '@/constants/african-countries';
import { palette, spacing, typography } from '@/constants/app-theme';
import {
  validateEmail,
  validateName,
  validatePhoneCountryCode,
  validatePhoneNumber,
  validateRequired,
} from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

type TouchedFields = {
  acceptedTerms: boolean;
  countryOfResidence: boolean;
  email: boolean;
  firstName: boolean;
  lastName: boolean;
  phoneCountryCode: boolean;
  phoneNumber: boolean;
  referralCode: boolean;
};

export default function RegisterScreen() {
  const { loginWithGoogle, register } = useAuth();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+254');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryOfResidence, setCountryOfResidence] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({
    acceptedTerms: false,
    countryOfResidence: false,
    email: false,
    firstName: false,
    lastName: false,
    phoneCountryCode: false,
    phoneNumber: false,
    referralCode: false,
  });

  const selectedDialCode = useMemo(
    () => africanCountries.find((country) => country.dialCode === phoneCountryCode),
    [phoneCountryCode]
  );

  const errors = useMemo(
    () => ({
      firstName: validateName(firstName, 'First name'),
      lastName: validateName(lastName, 'Last name'),
      phoneNumber: validatePhoneNumber(phoneNumber, selectedDialCode?.phoneNumberLengths ?? [10]),
      phoneCountryCode: validatePhoneCountryCode(phoneCountryCode),
      countryOfResidence: validateRequired(countryOfResidence, 'Country of residence'),
      email: validateEmail(email),
      acceptedTerms: acceptedTerms ? '' : 'You need to accept the terms to continue.',
    }),
    [
      acceptedTerms,
      countryOfResidence,
      email,
      firstName,
      lastName,
      phoneCountryCode,
      phoneNumber,
      selectedDialCode?.phoneNumberLengths,
    ]
  );

  const canSubmit = Object.values(errors).every((value) => !value);
  const useSplitLayout = Platform.OS === 'web' && width >= 1024;

  function markTouched(field: keyof TouchedFields) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function getFieldError(field: keyof typeof errors) {
    return touched[field] ? errors[field] : '';
  }

  async function handleRegister() {
    if (!canSubmit || submitting) {
      setTouched({
        acceptedTerms: true,
        countryOfResidence: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneCountryCode: true,
        phoneNumber: true,
        referralCode: true,
      });
      return;
    }

    let didNavigate = false;

    try {
      setSubmitting(true);
      await register({
        countryOfResidence,
        email,
        firstName,
        lastName,
        phoneCountryCode,
        phoneNumber,
        referralCode,
      });
      didNavigate = true;
      router.replace({
        params: { registered: '1' },
        pathname: '/login',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      showToast(message, 'error');
      Alert.alert('Registration failed', message);
    } finally {
      if (!didNavigate) {
        setSubmitting(false);
      }
    }
  }

  async function handleGoogleRegister() {
    if (googleSubmitting || submitting) {
      return;
    }

    try {
      setGoogleSubmitting(true);
      await loginWithGoogle();
      showToast('Signed in with Google.');
      router.replace('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start Google sign-in.';
      showToast(message, 'error');
      Alert.alert('Google sign-in failed', message);
    } finally {
      setGoogleSubmitting(false);
    }
  }

  const content = (
    <AuthCard scrollable>
      {!useSplitLayout ? (
        <View style={styles.mobileLogoWrap}>
          <AppLogo compact />
        </View>
      ) : null}
      <AuthHeader
        subtitle="Enter your details to get started with ManagePro."
        title="Create an Account"
      />
      <View style={styles.formStack}>
        <AuthTextField
          autoCapitalize="words"
          error={getFieldError('firstName')}
          label="First Name"
          placeholder="Enter your first name"
          value={firstName}
          onBlur={() => markTouched('firstName')}
          onChangeText={setFirstName}
        />
        <AuthTextField
          autoCapitalize="words"
          error={getFieldError('lastName')}
          label="Last Name"
          placeholder="Enter your last name"
          value={lastName}
          onBlur={() => markTouched('lastName')}
          onChangeText={setLastName}
        />
        <AuthTextField
          autoCapitalize="none"
          error={getFieldError('email')}
          label="Email Address"
          keyboardType="email-address"
          placeholder="name@company.com"
          value={email}
          onBlur={() => markTouched('email')}
          onChangeText={setEmail}
        />
        <Text style={styles.groupLabel}>Phone Number</Text>
        <View style={styles.phoneRow}>
          <AuthSelectField
            containerStyle={styles.phoneCodeField}
            error={getFieldError('phoneCountryCode')}
            label="Code"
            options={africanDialCodeOptions}
            placeholder="Select code"
            value={phoneCountryCode}
            onSelect={(value) => {
              setPhoneCountryCode(value);
              markTouched('phoneCountryCode');
            }}
          />
          <AuthTextField
            containerStyle={styles.phoneNumberField}
            error={getFieldError('phoneNumber')}
            keyboardType="number-pad"
            label="Number"
            placeholder={selectedDialCode?.phoneNumberLengths[0] === 8 ? '71234567' : '712345678'}
            value={phoneNumber}
            onBlur={() => markTouched('phoneNumber')}
            onChangeText={(value) => setPhoneNumber(value.replace(/\D/g, ''))}
          />
        </View>
        <AuthSearchSelectField
          error={getFieldError('countryOfResidence')}
          label="Country of Residence"
          options={africanCountryOptions}
          placeholder="Select your country"
          searchPlaceholder="Search country"
          value={countryOfResidence}
          onSelect={(value) => {
            setCountryOfResidence(value);
            markTouched('countryOfResidence');
          }}
        />
        <AuthTextField
          autoCapitalize="characters"
          label="Referral Code"
          optionalLabel="(Optional)"
          placeholder="e.g. AGENT2024"
          value={referralCode}
          onBlur={() => markTouched('referralCode')}
          onChangeText={setReferralCode}
        />
        <ConsentRow
          value={acceptedTerms}
          onValueChange={(value) => {
            setAcceptedTerms(value);
            markTouched('acceptedTerms');
          }}
        />
        {touched.acceptedTerms && errors.acceptedTerms ? (
          <Text style={styles.errorText}>{errors.acceptedTerms}</Text>
        ) : null}
        <AuthButton
          disabled={!canSubmit || submitting}
          loading={submitting}
          title={submitting ? 'Creating account...' : 'Create Account'}
          onPress={handleRegister}
        />
        <AuthButton
          disabled={googleSubmitting || submitting}
          loading={googleSubmitting}
          title={googleSubmitting ? 'Opening Google...' : 'Continue with Google'}
          variant="secondary"
          onPress={handleGoogleRegister}
        />
      </View>
      <View style={styles.bottomTextWrap}>
        <Text style={styles.bottomText}>
          Already have an account?{' '}
          <Link href="/login" style={styles.bottomLink}>
            Log in here
          </Link>
        </Text>
      </View>
    </AuthCard>
  );

  return (
    <>
      <StatusBar style="light" />
      <AuthBackground contentStyle={styles.registerContent} scroll={false}>
        {useSplitLayout ? <SplitAuthLayout>{content}</SplitAuthLayout> : content}
      </AuthBackground>
    </>
  );
}

const styles = StyleSheet.create({
  bottomLink: {
    color: palette.primary,
    fontWeight: '500',
  },
  bottomText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  bottomTextWrap: {
    marginTop: spacing.lg,
  },
  errorText: {
    color: palette.error,
    fontSize: typography.label,
    lineHeight: 16,
  },
  formStack: {
    gap: spacing.md,
  },
  groupLabel: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.24,
  },
  mobileLogoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  phoneCodeField: {
    flex: 0.42,
    minWidth: 80,
  },
  phoneNumberField: {
    flex: 1.78,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  registerContent: {
    paddingVertical: spacing.marginMobile,
  },
});
