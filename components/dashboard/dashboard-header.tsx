import { MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius } from '@/constants/app-theme';

type DashboardHeaderProps = {
  avatarLetter: string;
  hasNotification: boolean;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  profileImageUrl?: string | null;
};

export function DashboardHeader({
  avatarLetter,
  hasNotification,
  onNotificationPress,
  onProfilePress,
  profileImageUrl,
}: DashboardHeaderProps) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarBrand}>
        <View style={styles.brandBadge}>
          <MaterialIcons color={palette.onPrimary} name="leaderboard" size={20} />
        </View>
        <Text style={styles.brandText}>ManagePro</Text>
      </View>

      <View style={styles.topBarActions}>
        <Pressable style={styles.notificationButton} onPress={onNotificationPress}>
          <MaterialIcons color="#64748B" name="notifications-none" size={24} />
          {hasNotification ? <View style={styles.notificationDot} /> : null}
        </Pressable>
        <Pressable style={styles.avatarWrap} onPress={onProfilePress}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{avatarLetter}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: palette.primaryFixed,
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: palette.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarWrap: {
    borderColor: palette.primaryFixed,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 40,
    overflow: 'hidden',
    width: 40,
  },
  brandBadge: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  brandText: {
    color: palette.primary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  notificationButton: {
    padding: 2,
  },
  notificationDot: {
    backgroundColor: palette.tertiary,
    borderColor: palette.white,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 10,
  },
  topBar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(0,92,171,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 18,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    top: 0,
    width: '90%',
    zIndex: 20,
  },
  topBarActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  topBarBrand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
});
