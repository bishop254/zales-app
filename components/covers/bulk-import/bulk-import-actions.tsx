import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';
import type { BulkImportStep } from '@/features/covers/bulk-import/types';

type BulkImportActionsProps = {
  disableSubmit?: boolean;
  loading?: boolean;
  onBack: () => void;
  onNext: () => void;
  onReset: () => void;
  onSubmit: () => void;
  step: BulkImportStep;
};

export function BulkImportActions({
  disableSubmit = false,
  loading = false,
  onBack,
  onNext,
  onReset,
  onSubmit,
  step,
}: BulkImportActionsProps) {
  return (
    <View style={styles.actionCard}>
      <View style={styles.row}>
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={onReset}>
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Reset</Text>
        </Pressable>

        {step !== 'file' ? (
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={onBack}>
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Back</Text>
          </Pressable>
        ) : null}

        {step === 'preview' ? (
          <Pressable
            disabled={disableSubmit || loading}
            style={[styles.button, disableSubmit || loading ? styles.buttonDisabled : null]}
            onPress={onSubmit}>
            {loading ? <ActivityIndicator color={palette.onPrimary} size="small" /> : null}
            <Text style={styles.buttonText}>{loading ? 'Importing...' : 'Import Covers'}</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.button, loading ? styles.buttonDisabled : null]} disabled={loading} onPress={onNext}>
            {loading ? <ActivityIndicator color={palette.onPrimary} size="small" /> : null}
            <Text style={styles.buttonText}>{step === 'defaults' ? 'Preview' : 'Continue'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: radius.xl,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  button: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonSecondary: {
    backgroundColor: palette.surfaceContainer,
  },
  buttonText: {
    color: palette.onPrimary,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: palette.onSurface,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
