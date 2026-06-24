import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';
import type { BulkImportStep } from '@/features/covers/bulk-import/types';

const stepLabels: Record<BulkImportStep, string> = {
  defaults: '3. Defaults',
  file: '1. Upload',
  mapping: '2. Mapping',
  preview: '4. Preview',
};

const stepOrder: BulkImportStep[] = ['file', 'mapping', 'defaults', 'preview'];

type BulkImportStepperProps = {
  step: BulkImportStep;
};

export function BulkImportStepper({ step }: BulkImportStepperProps) {
  const activeIndex = stepOrder.indexOf(step);

  return (
    <View style={styles.stepperCard}>
      {stepOrder.map((stepKey, index) => {
        const isActive = index === activeIndex;
        const isComplete = index < activeIndex;

        return (
          <View key={stepKey} style={styles.stepItem}>
            <View style={[styles.stepBadge, isActive ? styles.stepBadgeActive : null, isComplete ? styles.stepBadgeComplete : null]}>
              <Text style={[styles.stepBadgeText, isActive || isComplete ? styles.stepBadgeTextActive : null]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, isActive ? styles.stepLabelActive : null]}>{stepLabels[stepKey]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stepBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepBadgeActive: {
    backgroundColor: palette.primary,
  },
  stepBadgeComplete: {
    backgroundColor: palette.secondaryContainer,
  },
  stepBadgeText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    fontWeight: '700',
  },
  stepBadgeTextActive: {
    color: palette.white,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: palette.white,
  },
  stepperCard: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
  },
});
