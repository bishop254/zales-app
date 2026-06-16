import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { palette, radius, spacing } from '@/constants/app-theme';

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
  return (
    <Pressable style={[styles.summaryCard, active ? styles.summaryCardActive : null, style]} onPress={onPress}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryIconWrap, iconToneStyles[iconTone]]}>
          <MaterialIcons color={iconToneColors[iconTone]} name={icon} size={20} />
        </View>
        <View style={styles.summaryCopy}>
          <Text
            ellipsizeMode="clip"
            numberOfLines={1}
            style={styles.summaryTitle}>
            {title}
          </Text>
          <Text
            ellipsizeMode="clip"
            numberOfLines={1}
            style={styles.summaryLabel}>
            {label}
          </Text>
        </View>
        <View style={styles.summaryMetric}>
          <Text
            ellipsizeMode="clip"
            numberOfLines={1}
            style={styles.summaryCount}>
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
    fontSize: 10,
    fontWeight: '600',
  },
  summaryMetric: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 42,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  summaryTitle: {
    color: palette.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
});
