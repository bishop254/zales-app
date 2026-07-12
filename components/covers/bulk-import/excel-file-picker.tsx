import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { singleLineShrinkProps } from '@/constants/responsive-text';
import type { ParsedExcelFile } from '@/features/covers/bulk-import/types';

type ExcelFilePickerProps = {
  error?: string;
  loading?: boolean;
  onPickFile: () => void;
  parsedFile: ParsedExcelFile | null;
};

export function ExcelFilePicker({ error, loading = false, onPickFile, parsedFile }: ExcelFilePickerProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Step 1: Select Excel File</Text>
      <Text style={styles.helperText}>Upload an Excel or CSV file. We read the first sheet and show a quick preview before mapping columns.</Text>

      <Pressable style={[styles.pickButton, loading ? styles.pickButtonDisabled : null]} disabled={loading} onPress={onPickFile}>
        {loading ? <ActivityIndicator color={palette.onPrimary} size="small" /> : <MaterialIcons color={palette.white} name="upload-file" size={18} />}
        <Text style={styles.pickButtonText}>{loading ? 'Reading file...' : 'Choose file'}</Text>
      </Pressable>

      {parsedFile ? (
        <View style={styles.fileInfoCard}>
          <Text style={styles.fileName}>{parsedFile.fileName}</Text>
          <Text style={styles.fileMeta}>Sheet: {parsedFile.sheetName}</Text>
          <Text style={styles.fileMeta}>Rows: {parsedFile.rowCount} • Columns: {parsedFile.columnCount}</Text>

          <View style={styles.previewTable}>
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewCell, styles.previewHeaderCell, styles.previewRowNumberCell]}>Row</Text>
              {parsedFile.headers.slice(0, 3).map((header) => (
                <Text key={header} {...singleLineShrinkProps} style={[styles.previewCell, styles.previewHeaderCell]}>
                  {header}
                </Text>
              ))}
            </View>
            {parsedFile.previewRows.map((row) => (
              <View key={`preview-${row.rowNumber}`} style={styles.previewDataRow}>
                <Text style={[styles.previewCell, styles.previewRowNumberCell]}>{row.rowNumber}</Text>
                {parsedFile.headers.slice(0, 3).map((header) => (
                  <Text key={`${row.rowNumber}-${header}`} {...singleLineShrinkProps} style={styles.previewCell}>
                    {String(row.raw[header] ?? '')}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: palette.error,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  fileInfoCard: {
    backgroundColor: 'rgba(246, 249, 255, 0.94)',
    borderColor: 'rgba(0, 92, 171, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  fileMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  fileName: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  helperText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  pickButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  pickButtonDisabled: {
    opacity: 0.7,
  },
  pickButtonText: {
    color: palette.white,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  previewCell: {
    color: palette.onSurface,
    flex: 1,
    fontSize: 12,
  },
  previewDataRow: {
    borderTopColor: palette.outlineVariant,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 8,
  },
  previewHeaderCell: {
    color: palette.primary,
    fontWeight: '700',
  },
  previewHeaderRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: 6,
  },
  previewRowNumberCell: {
    flex: 0.45,
  },
  previewTable: {
    marginTop: spacing.xs,
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
});
