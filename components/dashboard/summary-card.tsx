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
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryIconWrap, iconToneStyles[iconTone]]}>
          <MaterialIcons color={iconToneColors[iconTone]} name={icon} size={24} />
        </View>
        <Text style={styles.summaryCount}>{count}</Text>
      </View>
      <View style={styles.summaryFooter}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryTitle}>{title}</Text>
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
    height: 124,
    justifyContent: 'flex-start',
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
    fontSize: 17,
    fontWeight: '700',
  },
  summaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryFooter: {
    marginTop: spacing.sm + 2,
  },
  summaryIconWrap: {
    alignItems: 'center',
    borderRadius: radius.xl,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  summaryLabel: {
    color: palette.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    color: palette.onSurface,
    fontSize: 17,
    fontWeight: '600',
  },
});
