import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Polyline,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';

import { palette, typography } from '@/constants/app-theme';
import type { WeeklyActivityPoint } from '@/features/analytics/analytics-types';

type AreaLineChartProps = {
  data: WeeklyActivityPoint[];
  height?: number;
  width: number;
};

function buildPoints(values: number[], width: number, height: number, paddingX: number, paddingY: number, maxValue: number) {
  const stepX = values.length > 1 ? (width - paddingX * 2) / (values.length - 1) : 0;

  return values.map((value, index) => {
    const x = paddingX + stepX * index;
    const y = height - paddingY - ((value / maxValue) * (height - paddingY * 2));
    return { x, y };
  });
}

function toPolyline(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function toAreaPath(points: { x: number; y: number }[], height: number, paddingY: number) {
  if (!points.length) {
    return '';
  }

  const start = points[0];
  const end = points[points.length - 1];

  return [
    `M ${start.x} ${height - paddingY}`,
    `L ${start.x} ${start.y}`,
    ...points.slice(1).map((point) => `L ${point.x} ${point.y}`),
    `L ${end.x} ${height - paddingY}`,
    'Z',
  ].join(' ');
}

export function AreaLineChart({ data, height = 210, width }: AreaLineChartProps) {
  if (!data.length) {
    return (
      <View style={[styles.emptyState, { height, width }]}>
        <Text style={styles.emptyStateText}>No activity data yet.</Text>
      </View>
    );
  }

  const paddingX = 18;
  const paddingY = 28;
  const createdValues = data.map((item) => item.created ?? item.count ?? 0);
  const completedValues = data.map((item) => item.completed ?? item.count ?? item.created ?? 0);
  const maxValue = Math.max(...createdValues, ...completedValues, 1);
  const completedPoints = buildPoints(completedValues, width, height, paddingX, paddingY, maxValue);
  const yAxisLabels = Array.from({ length: 5 }).map((_, index) => Math.round((maxValue / 4) * (4 - index)));

  return (
    <Svg height={height} width={width}>
      <Defs>
        <LinearGradient id="createdFill" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="rgba(37,99,235,0.28)" />
          <Stop offset="1" stopColor="rgba(37,99,235,0.02)" />
        </LinearGradient>
      </Defs>

      {yAxisLabels.map((label, index) => {
        const y = paddingY + ((height - paddingY * 2) / 4) * index;

        return (
          <Line
            key={`grid-${label}-${index}`}
            stroke="rgba(148,163,184,0.22)"
            strokeDasharray="4 4"
            strokeWidth={1}
            x1={paddingX}
            x2={width - paddingX}
            y1={y}
            y2={y}
          />
        );
      })}

      {yAxisLabels.map((label, index) => {
        const y = paddingY + ((height - paddingY * 2) / 4) * index + 4;

        return (
          <SvgText
            key={`axis-${label}-${index}`}
            fill={palette.onSurfaceVariant}
            fontSize="11"
            fontWeight="600"
            x={0}
            y={y}>
            {label}
          </SvgText>
        );
      })}

      <Path d={toAreaPath(completedPoints, height, paddingY)} fill="url(#createdFill)" />

      <Polyline
        fill="none"
        points={toPolyline(completedPoints)}
        stroke={palette.primaryContainer}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
      />

      {completedPoints.map((point, index) => (
        <Circle
          key={`point-${index}`}
          cx={point.x}
          cy={point.y}
          fill={palette.surfaceContainerLowest}
          r={5.5}
          stroke={palette.primaryContainer}
          strokeWidth={2.5}
        />
      ))}

      {completedPoints.map((point, index) => (
        <SvgText
          key={`value-${index}`}
          fill={palette.onSurface}
          fontSize="12"
          fontWeight="700"
          textAnchor="middle"
          x={point.x}
          y={point.y - 12}>
          {completedValues[index]}
        </SvgText>
      ))}

      {data.map((item, index) => (
        <SvgText
          key={`label-${item.label}-${index}`}
          fill={palette.onSurfaceVariant}
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          x={completedPoints[index]?.x ?? paddingX}
          y={height - 6}>
          {item.label}
        </SvgText>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderRadius: 12,
    justifyContent: 'center',
  },
  emptyStateText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
});
