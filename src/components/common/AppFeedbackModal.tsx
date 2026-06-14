import { MaterialIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, spacing, typography } from '@/constants/app-theme';

export type FeedbackType = 'error' | 'warning' | 'success' | 'info';

export interface AppFeedbackModalProps {
  visible: boolean;
  type?: FeedbackType;
  label?: string;
  title: string;
  message?: string;
  detailTitle?: string;
  detailDescription?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  showCloseButton?: boolean;
  dismissOnBackdropPress?: boolean;
  loading?: boolean;
  onClose?: () => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  cardStyle?: StyleProp<ViewStyle>;
}

type FeedbackTheme = {
  accent: string;
  accentSoft: string;
  border: string;
  detailBackground: string;
  detailBorder: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBackground: string;
  secondaryText: string;
};

const FEEDBACK_THEME: Record<FeedbackType, FeedbackTheme> = {
  error: {
    accent: '#D92D20',
    accentSoft: 'rgba(217, 45, 32, 0.12)',
    border: 'rgba(217, 45, 32, 0.16)',
    detailBackground: '#FFF4F2',
    detailBorder: '#F7C4BE',
    icon: 'error-outline',
    iconBackground: 'rgba(217, 45, 32, 0.16)',
    secondaryText: '#B42318',
  },
  warning: {
    accent: '#D97706',
    accentSoft: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.16)',
    detailBackground: '#FFF8EB',
    detailBorder: '#F7D79A',
    icon: 'warning-amber',
    iconBackground: 'rgba(217, 119, 6, 0.16)',
    secondaryText: '#B45309',
  },
  success: {
    accent: '#15803D',
    accentSoft: 'rgba(21, 128, 61, 0.12)',
    border: 'rgba(21, 128, 61, 0.16)',
    detailBackground: '#EFFCF3',
    detailBorder: '#B7E4C2',
    icon: 'check-circle-outline',
    iconBackground: 'rgba(21, 128, 61, 0.16)',
    secondaryText: '#166534',
  },
  info: {
    accent: '#2563EB',
    accentSoft: 'rgba(37, 99, 235, 0.12)',
    border: 'rgba(37, 99, 235, 0.16)',
    detailBackground: '#EFF6FF',
    detailBorder: '#BFDBFE',
    icon: 'info-outline',
    iconBackground: 'rgba(37, 99, 235, 0.16)',
    secondaryText: '#1D4ED8',
  },
};

const TOKENS = {
  backdrop: 'rgba(12, 20, 33, 0.58)',
  cardBackground: '#FFFFFF',
  cardMaxWidth: 440,
  cardPadding: spacing.xl,
  closeSize: 44,
  detailIconSize: 52,
  separator: 'rgba(15, 23, 42, 0.08)',
  shadowColor: '#000000',
};

export function AppFeedbackModal({
  visible,
  type = 'error',
  label,
  title,
  message,
  detailTitle,
  detailDescription,
  primaryActionLabel = 'Okay',
  secondaryActionLabel,
  showCloseButton = true,
  dismissOnBackdropPress = true,
  loading = false,
  onClose,
  onPrimaryAction,
  onSecondaryAction,
  cardStyle,
}: AppFeedbackModalProps) {
  const insets = useSafeAreaInsets();
  const theme = FEEDBACK_THEME[type];

  const canClose = Boolean(onClose);

  function handleBackdropPress() {
    if (dismissOnBackdropPress && canClose) {
      onClose?.();
    }
  }

  function handlePrimaryAction() {
    if (loading) {
      return;
    }

    if (onPrimaryAction) {
      onPrimaryAction();
      return;
    }

    onClose?.();
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={() => onClose?.()}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, spacing.marginMobile),
            paddingBottom: Math.max(insets.bottom, spacing.marginMobile),
          },
        ]}>
        <Pressable
          accessibilityLabel="Dismiss feedback modal backdrop"
          style={styles.backdrop}
          onPress={handleBackdropPress}
        />

        <View pointerEvents="box-none" style={styles.centerWrap}>
          <View style={[styles.card, { borderColor: theme.border }, cardStyle]}>
            {showCloseButton && canClose ? (
              <Pressable
                accessibilityLabel="Close feedback modal"
                hitSlop={8}
                style={styles.closeButton}
                onPress={() => onClose?.()}>
                <MaterialIcons color={palette.onSurfaceVariant} name="close" size={24} />
              </Pressable>
            ) : null}

            <ScrollView
              bounces={false}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {label ? <Text style={[styles.label, { color: theme.accent }]}>{label}</Text> : null}
              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}

              {detailTitle || detailDescription ? (
                <View
                  style={[
                    styles.detailBox,
                    {
                      backgroundColor: theme.detailBackground,
                      borderColor: theme.detailBorder,
                    },
                  ]}>
                  <View style={[styles.detailIconWrap, { backgroundColor: theme.iconBackground }]}>
                    <MaterialIcons color={theme.accent} name={theme.icon} size={28} />
                  </View>
                  <View style={styles.detailCopy}>
                    {detailTitle ? (
                      <Text style={[styles.detailTitle, { color: theme.secondaryText }]}>{detailTitle}</Text>
                    ) : null}
                    {detailDescription ? (
                      <Text style={styles.detailDescription}>{detailDescription}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.separator} />

              <Pressable
                accessibilityLabel={primaryActionLabel}
                disabled={loading}
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.accent },
                  loading ? styles.primaryButtonDisabled : null,
                ]}
                onPress={handlePrimaryAction}>
                {loading ? (
                  <ActivityIndicator color={palette.onPrimary} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
                )}
              </Pressable>

              {secondaryActionLabel ? (
                <Pressable
                  accessibilityLabel={secondaryActionLabel}
                  disabled={loading}
                  style={styles.secondaryButton}
                  onPress={onSecondaryAction}>
                  <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>
                    {secondaryActionLabel}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: TOKENS.backdrop,
  },
  card: {
    backgroundColor: TOKENS.cardBackground,
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: '100%',
    maxWidth: TOKENS.cardMaxWidth,
    shadowColor: TOKENS.shadowColor,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    width: '100%',
    elevation: 18,
  },
  centerWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.marginMobile,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.pill,
    height: TOKENS.closeSize,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
    width: TOKENS.closeSize,
    zIndex: 2,
  },
  content: {
    padding: TOKENS.cardPadding,
  },
  detailBox: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  detailCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  detailDescription: {
    color: palette.onSurfaceVariant,
    fontSize: typography.body,
    lineHeight: 24,
  },
  detailIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: TOKENS.detailIconSize,
    justifyContent: 'center',
    width: TOKENS.detailIconSize,
  },
  detailTitle: {
    fontSize: typography.title,
    fontWeight: '700',
  },
  label: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingRight: TOKENS.closeSize + spacing.md,
    textTransform: 'uppercase',
  },
  message: {
    color: palette.onSurfaceVariant,
    fontSize: typography.body,
    lineHeight: 30,
    marginTop: spacing.md,
  },
  overlay: {
    flex: 1,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: palette.onPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  separator: {
    backgroundColor: TOKENS.separator,
    height: 1,
    marginTop: spacing.xl,
    width: '100%',
  },
  title: {
    color: palette.onSurface,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 38,
    paddingRight: TOKENS.closeSize + spacing.md,
  },
});
