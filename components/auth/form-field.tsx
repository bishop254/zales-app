import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';

type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: keyof typeof MaterialIcons.glyphMap;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  error?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function FormField({
  actionLabel,
  autoCapitalize = 'none',
  error,
  icon,
  keyboardType = 'default',
  label,
  onActionPress,
  onChangeText,
  placeholder,
  secureTextEntry,
  value,
}: FormFieldProps) {
  return (
    <View style={styles.block}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {actionLabel && onActionPress ? (
          <Pressable onPress={onActionPress}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <MaterialIcons color={palette.textMuted} name={icon} size={20} />
        <TextInput
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: palette.text,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  action: {
    color: palette.accent,
    fontSize: typography.label,
    fontWeight: '700',
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  inputRowError: {
    borderColor: '#BA1A1A',
  },
  input: {
    color: palette.text,
    flex: 1,
    fontSize: typography.body,
    paddingVertical: spacing.md,
  },
  error: {
    color: '#BA1A1A',
    fontSize: typography.bodySmall,
  },
});
