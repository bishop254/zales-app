import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';

import { palette, typography } from '@/constants/app-theme';

type DonutChartProps = {
  label?: string;
  size?: number;
  strokeWidth?: number;
  value: number;
};

type SegmentedDonutChartProps = {
  segments: { color: string; value: number }[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  strokeWidth?: number;
};

export function DonutChart({ label, size = 124, strokeWidth = 12, value }: DonutChartProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <View style={styles.wrap}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="rgba(0,92,171,0.12)"
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          stroke="#16A34A"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.value}>{safeValue}%</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

export function SegmentedDonutChart({
  centerLabel,
  centerValue = '100%',
  segments,
  size = 124,
  strokeWidth = 12,
}: SegmentedDonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeSegments = segments.map((segment) => ({
    ...segment,
    value: Math.max(0, segment.value),
  }));
  const total = safeSegments.reduce((sum, segment) => sum + segment.value, 0);
  let offset = 0;

  return (
    <View style={styles.wrap}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="rgba(0,92,171,0.12)"
          strokeWidth={strokeWidth}
        />
        {total > 0
          ? safeSegments.map((segment, index) => {
              const dashLength = (segment.value / total) * circumference;
              const dashOffset = circumference - offset;
              offset += dashLength;

              return (
                <Circle
                  key={`${segment.color}-${index}`}
                  cx={size / 2}
                  cy={size / 2}
                  fill="none"
                  r={radius}
                  rotation="-90"
                  origin={`${size / 2}, ${size / 2}`}
                  stroke={segment.color}
                  strokeDasharray={`${dashLength} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  strokeWidth={strokeWidth}
                />
              );
            })
          : null}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.value}>{centerValue}</Text>
        {centerLabel ? <Text style={styles.label}>{centerLabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  label: {
    color: palette.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '800',
  },
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
