import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing, typography } from '@/constants/app-theme';
import type { ExpiringSoonBucket } from '@/features/analytics/analytics-types';

type BarChartProps = {
  bars: ExpiringSoonBucket[];
  height?: number;
};

export function BarChart({ bars, height = 120 }: BarChartProps) {
  const maxValue = Math.max(...bars.map((bar) => bar.count), 1);

  return (
    <View style={[styles.chart, { height }]}>
      {bars.map((bar) => {
        const fillHeight = Math.max(10, (bar.count / maxValue) * (height - 28));
        return (
          <View key={bar.label} style={styles.barColumn}>
            <Text style={styles.barValue}>{bar.count}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: fillHeight }]} />
            </View>
            <Text style={styles.barLabel}>{bar.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barColumn: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  barFill: {
    backgroundColor: '#F59E0B',
    borderRadius: 999,
    width: '100%',
  },
  barLabel: {
    color: palette.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  barTrack: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderRadius: 999,
    height: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 18,
  },
  barValue: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
  },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
