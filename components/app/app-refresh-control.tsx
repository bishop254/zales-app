import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';

type AppRefreshControlProps = {
  onRefresh: () => void;
  refreshing: boolean;
};

export function AppRefreshControl({ onRefresh, refreshing }: AppRefreshControlProps) {
  return (
    <RefreshControl
      colors={[palette.primary]}
      progressBackgroundColor={palette.white}
      refreshing={refreshing}
      tintColor={palette.white}
      onRefresh={onRefresh}
    />
  );
}

type RefreshIndicatorProps = {
  refreshing: boolean;
};

export function RefreshIndicator({ refreshing }: RefreshIndicatorProps) {
  if (!refreshing) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.pill}>
        <ActivityIndicator color={palette.primary} size="small" />
        <Text style={styles.text}>Refreshing...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  text: {
    color: palette.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  wrap: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 74,
    zIndex: 30,
  },
});
