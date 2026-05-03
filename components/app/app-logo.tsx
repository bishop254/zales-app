import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';

type AppLogoProps = {
  tint?: 'dark' | 'light';
  compact?: boolean;
};

export function AppLogo({ compact = false, tint = 'dark' }: AppLogoProps) {
  const isLight = tint === 'light';

  return (
    <View style={styles.row}>
      <View style={[styles.badge, compact ? styles.badgeCompact : null]}>
        <MaterialIcons color={palette.white} name="rocket-launch" size={28} />
      </View>
      <Text style={[styles.wordmark, isLight ? styles.wordmarkLight : styles.wordmarkDark]}>ManagePro</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  badgeCompact: {
    height: 36,
    width: 36,
  },
  wordmark: {
    fontSize: typography.title,
    fontWeight: '800',
  },
  wordmarkDark: {
    color: palette.primary,
  },
  wordmarkLight: {
    color: palette.onPrimary,
  },
});
