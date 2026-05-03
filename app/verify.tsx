import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import {
  AuthBackground,
  AuthButton,
  AuthCard,
  AuthHeader,
  OtpInputRow,
} from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

export default function VerifyScreen() {
  const { pendingChallenge, submitOtp } = useAuth();
  const { showToast } = useToast();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);

  const otpValue = useMemo(() => otp.join(''), [otp]);

  if (!pendingChallenge || pendingChallenge.type !== 'otp') {
    return <Redirect href="/login" />;
  }

  function handleChangeDigit(index: number, nextValue: string) {
    const sanitized = nextValue.replace(/[^0-9]/g, '').slice(-1);

    setOtp((current) => {
      const copy = [...current];
      copy[index] = sanitized;
      return copy;
    });
  }

  async function handleVerify() {
    if (otpValue.length !== 6 || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      await submitOtp(otpValue);
      showToast('OTP verified. Welcome back.');
      router.replace('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify code.';
      showToast(message, 'error');
      Alert.alert('Verification failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <AuthBackground scroll={false}>
        <AuthCard scrollable styleVariant="compact">
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>6</Text>
          </View>
          <AuthHeader
            centered
            subtitle={`Enter the 6-digit code sent to ${pendingChallenge.email}.`}
            title="Verify your login"
          />
          <OtpInputRow value={otp} onChangeDigit={handleChangeDigit} />
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              Your OTP is required before we issue the final access token for subsequent logins.
            </Text>
          </View>
          <View style={styles.buttonStack}>
            <AuthButton
              disabled={otpValue.length !== 6 || submitting}
              loading={submitting}
              title={submitting ? 'Verifying OTP...' : 'Verify OTP'}
              onPress={handleVerify}
            />
            <AuthButton title="Back to Login" variant="secondary" onPress={() => router.replace('/login')} />
          </View>
        </AuthCard>
      </AuthBackground>
    </>
  );
}

const styles = StyleSheet.create({
  buttonStack: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  iconCircle: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.primaryFixed,
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 64,
  },
  iconText: {
    color: palette.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  noticeCard: {
    backgroundColor: palette.surfaceContainerLow,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  noticeText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
  },
});
