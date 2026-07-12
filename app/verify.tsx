import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AppMessageModal } from '@/components/app/app-message-modal';
import {
  AuthBackground,
  AuthButton,
  AuthCard,
  AuthHeader,
} from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

type FeedbackModalState = {
  eyebrow: string;
  message: string;
  title: string;
  tone: 'error' | 'info';
  visible: boolean;
};

export default function VerifyScreen() {
  const { pendingChallenge, resendOtpChallenge, submitOtp } = useAuth();
  const { showToast } = useToast();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(26);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    eyebrow: '',
    message: '',
    title: '',
    tone: 'info',
    visible: false,
  });
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const otpValue = useMemo(() => otp.join(''), [otp]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  if (!pendingChallenge || pendingChallenge.type !== 'otp') {
    return <Redirect href="/login" />;
  }

  function openFeedbackModal({
    eyebrow,
    message,
    title,
    tone,
  }: Omit<FeedbackModalState, 'visible'>) {
    setFeedbackModal({
      eyebrow,
      message,
      title,
      tone,
      visible: true,
    });
  }

  function closeFeedbackModal() {
    setFeedbackModal((current) => ({
      ...current,
      visible: false,
    }));
  }

  function handleChangeDigit(index: number, nextValue: string) {
    const sanitized = nextValue.replace(/[^0-9]/g, '').slice(-1);

    setOtp((current) => {
      const copy = [...current];
      copy[index] = sanitized;
      return copy;
    });
  }

  function focusNextInput(index: number, nextValue: string) {
    if (nextValue && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleBackspace(index: number) {
    setOtp((current) => {
      const copy = [...current];

      if (copy[index]) {
        copy[index] = '';
        return copy;
      }

      if (index > 0) {
        copy[index - 1] = '';
        requestAnimationFrame(() => {
          inputRefs.current[index - 1]?.focus();
        });
      }

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
      openFeedbackModal({
        eyebrow: 'Verification error',
        message,
        title: 'Verification failed',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (resending || resendCountdown > 0) {
      return;
    }

    try {
      setResending(true);
      await resendOtpChallenge();
      setOtp(['', '', '', '', '', '']);
      setResendCountdown(26);
      inputRefs.current[0]?.focus();
      showToast('A new OTP has been sent to your email.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resend OTP.';
      showToast(message, 'error');
      openFeedbackModal({
        eyebrow: 'OTP resend',
        message,
        title: 'Resend failed',
        tone: 'error',
      });
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <AuthBackground scroll={false}>
        <AuthCard scrollable styleVariant="compact">
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>{String(resendCountdown).padStart(2, '0')}</Text>
          </View>
          <AuthHeader
            centered
            subtitle={`Enter the 6-digit code sent to ${pendingChallenge.email}.`}
            title="Verify your login"
          />
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(node) => {
                  inputRefs.current[index] = node;
                }}
                keyboardType="number-pad"
                maxLength={1}
                placeholder="."
                placeholderTextColor={palette.onSurfaceVariant}
                style={styles.otpCell}
                textAlign="center"
                textAlignVertical="center"
                value={digit}
                onChangeText={(nextValue) => {
                  const sanitized = nextValue.replace(/[^0-9]/g, '').slice(-1);
                  handleChangeDigit(index, sanitized);
                  focusNextInput(index, sanitized);
                }}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace') {
                    handleBackspace(index);
                  }
                }}
              />
            ))}
          </View>
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn&apos;t receive the code?</Text>
            <Pressable disabled={resending || resendCountdown > 0} onPress={handleResendOtp}>
              <Text
                style={[
                  styles.resendButtonText,
                  resending || resendCountdown > 0 ? styles.resendButtonTextDisabled : null,
                ]}>
                {resending
                  ? 'Resending...'
                  : resendCountdown > 0
                    ? `Resend in 00:${String(resendCountdown).padStart(2, '0')}`
                    : 'Resend OTP'}
              </Text>
            </Pressable>
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
      <AppMessageModal
        eyebrow={feedbackModal.eyebrow}
        message={feedbackModal.message}
        title={feedbackModal.title}
        tone={feedbackModal.tone}
        visible={feedbackModal.visible}
        onClose={closeFeedbackModal}
      />
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
  otpCell: {
    backgroundColor: palette.glassSoft,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.headline,
    fontWeight: '600',
    height: 60,
    includeFontPadding: false,
    lineHeight: 60,
    maxWidth: 46,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    verticalAlign: 'middle',
  },
  otpRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    maxWidth: '100%',
    width: '100%',
  },
  resendButtonText: {
    color: palette.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  resendButtonTextDisabled: {
    color: palette.onSurfaceVariant,
  },
  resendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  resendText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
});
