import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';
import type { BulkImportPreviewRow, PreviewFilter } from '@/features/covers/bulk-import/types';

type ImportPreviewTableProps = {
  filter: PreviewFilter;
  onChangeFilter: (filter: PreviewFilter) => void;
  rows: BulkImportPreviewRow[];
};

const filterOptions: PreviewFilter[] = ['ALL', 'VALID', 'INVALID'];

export function ImportPreviewTable({ filter, onChangeFilter, rows }: ImportPreviewTableProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Step 4: Preview and Validate</Text>
      <Text style={styles.helperText}>Review the transformed rows below. Submission stays disabled until all rows are valid.</Text>

      <View style={styles.filterRow}>
        {filterOptions.map((option) => (
          <Pressable
            key={option}
            style={[styles.filterChip, filter === option ? styles.filterChipActive : null]}
            onPress={() => onChangeFilter(option)}>
            <Text style={[styles.filterChipText, filter === option ? styles.filterChipTextActive : null]}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.rowStack} nestedScrollEnabled>
        {rows.map((row) => (
          <View key={`preview-row-${row.rowNumber}`} style={styles.previewRow}>
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderLeft}>
                <View style={[styles.statusDot, row.isValid ? styles.statusDotValid : styles.statusDotInvalid]} />
                <Text style={styles.previewRowTitle}>Excel row {row.rowNumber}</Text>
              </View>
              <Text style={[styles.previewStatusText, row.isValid ? styles.previewStatusValid : styles.previewStatusInvalid]}>
                {row.isValid ? 'Valid' : 'Invalid'}
              </Text>
            </View>

            {row.payload ? (
              <View style={styles.payloadCard}>
                {Object.entries(row.payload).map(([key, value]) => (
                  <View key={`${row.rowNumber}-${key}`} style={styles.payloadItem}>
                    <Text style={styles.payloadKey}>{key}</Text>
                    <Text style={styles.payloadValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {row.errors.length ? (
              <View style={styles.errorList}>
                {row.errors.map((error, index) => (
                  <View key={`${row.rowNumber}-${error.field}-${index}`} style={styles.errorRow}>
                    <MaterialIcons color={palette.error} name="error-outline" size={16} />
                    <Text style={styles.errorText}>{error.message}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  errorList: {
    gap: 6,
  },
  errorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  errorText: {
    color: palette.error,
    flex: 1,
    fontSize: typography.bodySmall,
  },
  filterChip: {
    backgroundColor: 'rgba(79, 96, 115, 0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: palette.primary,
  },
  filterChipText: {
    color: palette.secondary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: palette.white,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  helperText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  payloadCard: {
    backgroundColor: 'rgba(246, 249, 255, 0.94)',
    borderRadius: radius.lg,
    gap: 8,
    padding: spacing.sm,
  },
  payloadItem: {
    gap: 4,
  },
  payloadKey: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  payloadValue: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  previewRow: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(0, 92, 171, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  previewRowTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  previewStatusInvalid: {
    color: palette.error,
  },
  previewStatusText: {
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  previewStatusValid: {
    color: '#15803D',
  },
  rowStack: {
    gap: spacing.sm,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: radius.xl,
    gap: spacing.md,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  statusDot: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  statusDotInvalid: {
    backgroundColor: palette.error,
  },
  statusDotValid: {
    backgroundColor: '#16A34A',
  },
});
