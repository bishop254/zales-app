import { MaterialIcons } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppModal } from '@/components/app/app-modal';
import { palette, radius, spacing, typography } from '@/constants/app-theme';

type AppMessageModalProps = {
  message: string;
  onClose: () => void;
  title: string;
  visible: boolean;
  actionLabel?: string;
  eyebrow?: string;
  frameStyle?: StyleProp<ViewStyle>;
  tone?: 'error' | 'info';
};

export function AppMessageModal({
  message,
  onClose,
  title,
  visible,
  actionLabel = 'Okay',
  eyebrow,
  frameStyle,
  tone = 'info',
}: AppMessageModalProps) {
  const isError = tone === 'error';

  return (
    <AppModal
      eyebrow={eyebrow}
      footer={
        <Pressable
          style={[styles.button, isError ? styles.buttonError : null]}
          onPress={onClose}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      }
      frameStyle={frameStyle}
      title={title}
      visible={visible}
      onClose={onClose}>
      <View style={styles.notice}>
        <View style={[styles.iconWrap, isError ? styles.iconWrapError : styles.iconWrapInfo]}>
          <MaterialIcons
            color={isError ? palette.error : palette.primary}
            name={isError ? 'error-outline' : 'info-outline'}
            size={24}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.heading}>
            {isError ? "We couldn't complete that action." : 'A quick update for you'}
          </Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  buttonError: {
    backgroundColor: palette.error,
  },
  buttonText: {
    color: palette.onPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  heading: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  iconWrapError: {
    backgroundColor: palette.errorContainer,
  },
  iconWrapInfo: {
    backgroundColor: palette.primaryFixed,
  },
  message: {
    color: palette.onSurfaceVariant,
    fontSize: typography.body,
    lineHeight: 22,
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: palette.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
});
