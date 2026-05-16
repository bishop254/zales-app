import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';

type MetricCardProps = {
  label: string;
  value: string;
  trend: string;
};

export function MetricCard({ label, trend, value }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.trend}>{trend}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 132,
    padding: spacing.lg,
  },
  label: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  value: {
    color: palette.primary,
    fontSize: typography.headline,
    fontWeight: '800',
  },
  trend: {
    color: '#15803D',
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
});
