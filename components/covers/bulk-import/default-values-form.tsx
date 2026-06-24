import { StyleSheet, Text, View } from 'react-native';

import { AuthSelectField, AuthTextField } from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import type { BulkImportFieldDefinition, FieldMappingConfig } from '@/features/covers/bulk-import/types';

type DefaultValuesFormProps = {
  fieldDefinitions: BulkImportFieldDefinition[];
  mappingErrors: Record<string, string>;
  mappings: FieldMappingConfig[];
  onUpdateMapping: (field: FieldMappingConfig['field'], update: Partial<FieldMappingConfig>) => void;
};

function getDisplayValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
}

export function DefaultValuesForm({
  fieldDefinitions,
  mappingErrors,
  mappings,
  onUpdateMapping,
}: DefaultValuesFormProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Step 3: Set Defaults</Text>
      <Text style={styles.helperText}>
        Use defaults for missing columns or as fallback values when some cells are empty. Required fields still need valid final values.
      </Text>

      <View style={styles.defaultsStack}>
        {fieldDefinitions.map((definition) => {
          const mapping = mappings.find((item) => item.field === definition.field)!;
          const needsDefaultInput = mapping.mode === 'default' || mapping.mode === 'column_with_fallback';

          if (!needsDefaultInput) {
            return null;
          }

          return (
            <View key={definition.field} style={styles.defaultCard}>
              <Text style={styles.defaultTitle}>{definition.label}</Text>
              <Text style={styles.defaultHelper}>{definition.helperText}</Text>

              {definition.type === 'boolean' ? (
                <AuthSelectField
                  error={mappingErrors[definition.field]}
                  label="Default value"
                  options={[
                    { label: 'True', value: 'true' },
                    { label: 'False', value: 'false' },
                  ]}
                  placeholder="Choose default"
                  value={getDisplayValue(mapping.defaultValue)}
                  onSelect={(value) => onUpdateMapping(definition.field, { defaultValue: value === 'true' })}
                />
              ) : definition.type === 'enum' ? (
                <AuthSelectField
                  error={mappingErrors[definition.field]}
                  label="Default value"
                  options={definition.options ?? []}
                  placeholder="Choose default"
                  value={getDisplayValue(mapping.defaultValue)}
                  onSelect={(value) => onUpdateMapping(definition.field, { defaultValue: value })}
                />
              ) : (
                <AuthTextField
                  error={mappingErrors[definition.field]}
                  label="Default value"
                  placeholder={`Enter ${definition.label.toLowerCase()}`}
                  value={getDisplayValue(mapping.defaultValue)}
                  onChangeText={(value) =>
                    onUpdateMapping(definition.field, {
                      defaultValue: value,
                    })
                  }
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  defaultCard: {
    backgroundColor: 'rgba(246, 249, 255, 0.94)',
    borderColor: 'rgba(0, 92, 171, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  defaultHelper: {
    color: palette.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
  },
  defaultTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  defaultsStack: {
    gap: spacing.sm,
  },
  helperText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
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
