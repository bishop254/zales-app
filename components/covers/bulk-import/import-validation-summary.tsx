import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';
import type { BulkImportSummary } from '@/features/covers/bulk-import/types';

type ImportValidationSummaryProps = {
  summary: BulkImportSummary;
};

export function ImportValidationSummary({ summary }: ImportValidationSummaryProps) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{summary.totalRows}</Text>
        <Text style={styles.metricLabel}>Total rows</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={[styles.metricValue, styles.metricValueValid]}>{summary.validRows}</Text>
        <Text style={styles.metricLabel}>Valid</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={[styles.metricValue, styles.metricValueInvalid]}>{summary.invalidRows}</Text>
        <Text style={styles.metricLabel}>Invalid</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricCard: {
    backgroundColor: 'rgba(246, 249, 255, 0.94)',
    borderRadius: radius.lg,
    flex: 1,
    gap: 4,
    padding: spacing.sm,
  },
  metricLabel: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  metricValue: {
    color: palette.onSurface,
    fontSize: 24,
    fontWeight: '800',
  },
  metricValueInvalid: {
    color: palette.error,
  },
  metricValueValid: {
    color: '#15803D',
  },
  summaryCard: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
