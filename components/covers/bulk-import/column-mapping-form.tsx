import { StyleSheet, Text, View } from 'react-native';

import { AuthSelectField } from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import type { BulkImportFieldDefinition, FieldMappingConfig, MappingMode } from '@/features/covers/bulk-import/types';

const mappingModeOptions: { label: string; value: MappingMode }[] = [
  { label: 'Map from column', value: 'column' },
  { label: 'Use default value', value: 'default' },
  { label: 'Column with fallback', value: 'column_with_fallback' },
  { label: 'Leave blank', value: 'empty' },
];

type ColumnMappingFormProps = {
  fieldDefinitions: BulkImportFieldDefinition[];
  headers: string[];
  mappingErrors: Record<string, string>;
  mappings: FieldMappingConfig[];
  onUpdateMapping: (field: FieldMappingConfig['field'], update: Partial<FieldMappingConfig>) => void;
};

export function ColumnMappingForm({
  fieldDefinitions,
  headers,
  mappingErrors,
  mappings,
  onUpdateMapping,
}: ColumnMappingFormProps) {
  const columnOptions = headers.map((header) => ({ label: header, value: header }));

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Step 2: Map Columns</Text>
      <Text style={styles.helperText}>
        Map each file column to the expected cover field. Required fields must come from a column or a default value.
      </Text>

      <View style={styles.mappingStack}>
        {fieldDefinitions.map((definition) => {
          const mapping = mappings.find((item) => item.field === definition.field)!;
          const canChooseEmpty = !definition.required;
          const modeOptions = canChooseEmpty
            ? mappingModeOptions
            : mappingModeOptions.filter((option) => option.value !== 'empty');

          return (
            <View key={definition.field} style={styles.mappingCard}>
              <View style={styles.mappingHeader}>
                <Text style={styles.mappingTitle}>{definition.label}</Text>
                <View style={[styles.badge, definition.required ? styles.badgeRequired : styles.badgeOptional]}>
                  <Text style={[styles.badgeText, definition.required ? styles.badgeTextRequired : styles.badgeTextOptional]}>
                    {definition.required ? 'Required' : 'Optional'}
                  </Text>
                </View>
              </View>
              <Text style={styles.mappingMeta}>Expected: {definition.type}</Text>
              <Text style={styles.mappingHelper}>{definition.helperText}</Text>

              <AuthSelectField
                error={mappingErrors[definition.field]}
                label="Mapping mode"
                options={modeOptions}
                placeholder="Choose mapping mode"
                value={mapping.mode}
                onSelect={(value) => onUpdateMapping(definition.field, { mode: value as MappingMode })}
              />

              {mapping.mode === 'column' || mapping.mode === 'column_with_fallback' ? (
                <AuthSelectField
                  label="Source column"
                  options={columnOptions}
                  placeholder="Choose file column"
                  value={mapping.sourceColumn ?? ''}
                  onSelect={(value) => onUpdateMapping(definition.field, { sourceColumn: value })}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOptional: {
    backgroundColor: 'rgba(79, 96, 115, 0.12)',
  },
  badgeRequired: {
    backgroundColor: 'rgba(181, 28, 0, 0.1)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextOptional: {
    color: palette.secondary,
  },
  badgeTextRequired: {
    color: palette.tertiary,
  },
  helperText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  mappingCard: {
    backgroundColor: 'rgba(246, 249, 255, 0.94)',
    borderColor: 'rgba(0, 92, 171, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  mappingHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mappingHelper: {
    color: palette.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
  },
  mappingMeta: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mappingStack: {
    gap: spacing.sm,
  },
  mappingTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
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
