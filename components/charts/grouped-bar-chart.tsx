import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/constants/app-theme';

type GroupedBarChartItem = {
  color: string;
  label: string;
  value: number;
};

type GroupedBarChartProps = {
  height?: number;
  items: GroupedBarChartItem[];
  width: number;
};

export function GroupedBarChart({ items, width, height = 180 }: GroupedBarChartProps) {
  const chartPaddingTop = 18;
  const chartPaddingBottom = 28;
  const chartPaddingHorizontal = 10;
  const chartHeight = height - chartPaddingTop - chartPaddingBottom;
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const slotWidth = (width - chartPaddingHorizontal * 2) / Math.max(items.length, 1);
  const barWidth = Math.min(22, slotWidth * 0.44);
  const gridValues = [0.25, 0.5, 0.75, 1];

  return (
    <View style={styles.wrap}>
      <Svg height={height} width={width}>
        {gridValues.map((gridValue) => {
          const y = chartPaddingTop + chartHeight - chartHeight * gridValue;
          return (
            <Line
              key={`grid-${gridValue}`}
              stroke="rgba(148,163,184,0.18)"
              strokeDasharray="4 4"
              strokeWidth={1}
              x1={chartPaddingHorizontal}
              x2={width - chartPaddingHorizontal}
              y1={y}
              y2={y}
            />
          );
        })}

        {items.map((item, index) => {
          const barHeight = Math.max(10, (item.value / maxValue) * chartHeight);
          const x = chartPaddingHorizontal + slotWidth * index + (slotWidth - barWidth) / 2;
          const y = chartPaddingTop + chartHeight - barHeight;

          return (
            <Rect
              key={`bar-${item.label}`}
              fill={item.color}
              height={barHeight}
              rx={6}
              ry={6}
              width={barWidth}
              x={x}
              y={y}
            />
          );
        })}

        {items.map((item, index) => {
          const x = chartPaddingHorizontal + slotWidth * index + slotWidth / 2;

          return (
            <SvgText
              key={`value-${item.label}`}
              fill={palette.onSurface}
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
              x={x}
              y={14}>
              {item.value}
            </SvgText>
          );
        })}

        {items.map((item, index) => {
          const x = chartPaddingHorizontal + slotWidth * index + slotWidth / 2;

          return (
            <SvgText
              key={`label-${item.label}`}
              fill={palette.onSurfaceVariant}
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
              x={x}
              y={height - 8}>
              {item.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
});
