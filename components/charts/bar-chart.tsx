import { useState } from 'react';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/constants/app-theme';
import type { ExpiringSoonBucket } from '@/features/analytics/analytics-types';

type BarChartProps = {
  bars: ExpiringSoonBucket[];
  height?: number;
};

export function BarChart({ bars, height = 120 }: BarChartProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const chartWidth = Math.max(containerWidth, 240);
  const maxValue = Math.max(...bars.map((bar) => bar.count), 1);
  const chartPaddingTop = 18;
  const chartPaddingBottom = 36;
  const chartPaddingHorizontal = 12;
  const chartHeight = height - chartPaddingTop - chartPaddingBottom;
  const slotWidth = (chartWidth - chartPaddingHorizontal * 2) / Math.max(bars.length, 1);
  const barWidth = Math.min(24, slotWidth * 0.42);
  const gridValues = [0.25, 0.5, 0.75, 1];

  return (
    <View
      style={[styles.chart, { height }]}
      onLayout={(event) => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        if (nextWidth && nextWidth !== containerWidth) {
          setContainerWidth(nextWidth);
        }
      }}>
      <Svg height={height} viewBox={`0 0 ${chartWidth} ${height}`} width="100%">
        {gridValues.map((gridValue) => {
          const y = chartPaddingTop + chartHeight - chartHeight * gridValue;

          return (
            <Line
              key={`grid-${gridValue}`}
              stroke="rgba(148,163,184,0.16)"
              strokeDasharray="4 4"
              strokeWidth={1}
              x1={chartPaddingHorizontal}
              x2={chartWidth - chartPaddingHorizontal}
              y1={y}
              y2={y}
            />
          );
        })}

        {bars.map((bar, index) => {
          const barHeight = Math.max(10, (bar.count / maxValue) * chartHeight);
          const x = chartPaddingHorizontal + slotWidth * index + (slotWidth - barWidth) / 2;
          const y = chartPaddingTop + chartHeight - barHeight;

          return (
            <Rect
              key={`bar-${bar.label}`}
              fill="#F59E0B"
              height={barHeight}
              rx={6}
              ry={6}
              width={barWidth}
              x={x}
              y={y}
            />
          );
        })}

        {bars.map((bar, index) => {
          const x = chartPaddingHorizontal + slotWidth * index + slotWidth / 2;

          return (
            <SvgText
              key={`value-${bar.label}`}
              fill={palette.onSurface}
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
              x={x}
              y={14}>
              {bar.count}
            </SvgText>
          );
        })}

        {bars.map((bar, index) => {
          const x = chartPaddingHorizontal + slotWidth * index + slotWidth / 2;
          const [lineOne, lineTwo = ''] = splitLabel(bar.label);

          return (
            <SvgText
              key={`label-${bar.label}`}
              fill={palette.onSurfaceVariant}
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              x={x}
              y={height - 18}>
              <SvgText x={x} y={height - 18}>
                {lineOne}
              </SvgText>
              {lineTwo ? (
                <SvgText x={x} y={height - 6}>
                  {lineTwo}
                </SvgText>
              ) : null}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

function splitLabel(label: string) {
  if (label.length <= 14) {
    return [label];
  }

  const words = label.split(' ');
  if (words.length < 2) {
    return [label];
  }

  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
}

const styles = StyleSheet.create({
  chart: {
    width: '100%',
  },
});
