import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle, useWindowDimensions } from 'react-native';

import { palette, radius, spacing } from '@/constants/app-theme';
import { singleLineShrinkProps } from '@/constants/responsive-text';
import { useResponsiveTypography } from '@/hooks/use-responsive-typography';

export type SummaryCardTone = 'primary' | 'secondary' | 'tertiary' | 'neutral';

type SummaryCardProps = {
  active?: boolean;
  count: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: SummaryCardTone;
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  title: string;
};

const iconToneStyles = StyleSheet.create({
  neutral: { backgroundColor: 'rgba(230, 232, 234, 0.6)' },
  primary: { backgroundColor: 'rgba(0, 92, 171, 0.1)' },
  secondary: { backgroundColor: 'rgba(207, 225, 248, 0.35)' },
  tertiary: { backgroundColor: 'rgba(181, 28, 0, 0.1)' },
});

const iconToneColors = {
  neutral: palette.outline,
  primary: palette.primary,
  secondary: palette.onSecondaryContainer,
  tertiary: palette.tertiary,
};

export function SummaryCard({
  active = false,
  count,
  icon,
  iconTone,
  label,
  onPress,
  style,
  title,
}: SummaryCardProps) {
  const { width } = useWindowDimensions();
  const responsiveType = useResponsiveTypography();
  const isCompactScreen = width < 390;
  const isSmallScreen = width < 350;
  const titleSize = isSmallScreen ? 11 : isCompactScreen ? 12 : 15;
  const labelSize = isSmallScreen ? 8 : isCompactScreen ? 9 : 10;
  const countSize = isSmallScreen ? 14 : isCompactScreen ? 15 : 18;
  const cardPadding = isSmallScreen ? spacing.xs + 4 : isCompactScreen ? spacing.xs + 6 : spacing.sm;
  const rowGap = isSmallScreen ? 6 : isCompactScreen ? 8 : spacing.sm;
  const iconSize = isSmallScreen ? 30 : isCompactScreen ? 32 : 34;

  return (
    <Pressable
      style={[
        styles.summaryCard,
        active ? styles.summaryCardActive : null,
        style,
        { padding: cardPadding },
      ]}
      onPress={onPress}>
      <View style={[styles.summaryRow, { gap: rowGap }]}>
        <View style={[styles.summaryIconWrap, iconToneStyles[iconTone], { height: iconSize, width: iconSize }]}>
          <MaterialIcons color={iconToneColors[iconTone]} name={icon} size={20} />
        </View>
        <View style={styles.summaryCopy}>
          <Text
            {...singleLineShrinkProps}
            style={[
              styles.summaryTitle,
              {
                fontSize: Math.max(responsiveType.label + 1, titleSize),
                lineHeight: Math.round(Math.max(responsiveType.label + 1, titleSize) * 1.15),
              },
            ]}>
            {title}
          </Text>
          <Text
            {...singleLineShrinkProps}
            style={[
              styles.summaryLabel,
              {
                fontSize: Math.max(responsiveType.labelCaps - 0.5, labelSize),
                lineHeight: Math.round(Math.max(responsiveType.labelCaps - 0.5, labelSize) * 1.2),
              },
            ]}>
            {label}
          </Text>
        </View>
        <View style={styles.summaryMetric}>
          <Text
            {...singleLineShrinkProps}
            style={[
              styles.summaryCount,
              {
                fontSize: Math.max(responsiveType.title - 1, countSize),
                lineHeight: Math.round(Math.max(responsiveType.title - 1, countSize) * 1.1),
              },
            ]}>
            {count}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 8,
    minHeight: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  summaryCardActive: {
    borderColor: palette.primary,
    borderWidth: 2,
  },
  summaryCount: {
    color: palette.onSurface,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },
  summaryIconWrap: {
    alignItems: 'center',
    borderRadius: radius.xl,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  summaryLabel: {
    color: palette.onSurfaceVariant,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '600',
  },
  summaryMetric: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 'auto',
    minWidth: 34,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryTitle: {
    color: palette.onSurface,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
  },
});
