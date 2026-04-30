import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';

export function AppLogo() {
  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <MaterialIcons color={palette.white} name="rocket-launch" size={28} />
      </View>
      <Text style={styles.wordmark}>SalesPro</Text>
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
  wordmark: {
    color: palette.primary,
    fontSize: typography.title,
    fontWeight: '800',
  },
});
