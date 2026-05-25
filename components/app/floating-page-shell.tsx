import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { imagery, palette, radius, typography } from '@/constants/app-theme';

type FloatingPageShellProps = {
  avatarLetter: string;
  bottomSlot?: React.ReactNode;
  overlaySlot?: React.ReactNode;
  profileImageUrl?: string | null;
  notificationCount?: number;
  title: string;
  onBackPress?: () => void;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  children: React.ReactNode;
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'refreshControl' | 'contentContainerStyle'>;
};

export function FloatingPageShell({
  avatarLetter,
  bottomSlot,
  overlaySlot,
  profileImageUrl,
  notificationCount,
  title,
  onBackPress,
  onNotificationPress,
  onProfilePress,
  refreshControl,
  children,
  scrollViewProps,
}: FloatingPageShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ImageBackground source={{ uri: imagery.pipeline }} style={styles.backgroundImage} resizeMode="cover">
        <View style={styles.backgroundOverlay} />
      </ImageBackground>

      <View style={styles.screen}>
        {overlaySlot}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            {onBackPress ? (
              <Pressable style={styles.backButton} onPress={onBackPress}>
                <MaterialIcons color={palette.primary} name="arrow-back" size={24} />
              </Pressable>
            ) : null}
            <Text style={styles.topBarTitle}>{title}</Text>
          </View>

          <View style={styles.topBarActions}>
            <Pressable style={styles.notificationButton} onPress={onNotificationPress}>
              <MaterialIcons color="#64748B" name="notifications-none" size={24} />
              {typeof notificationCount === 'number' ? (
                notificationCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                  </View>
                ) : null
              ) : (
                <View style={styles.notificationDot} />
              )}
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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          {...scrollViewProps}>
          {children}
        </ScrollView>

        {bottomSlot}
      </View>
    </SafeAreaView>
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
    fontSize: typography.title,
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
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 51, 102, 0.22)',
  },
  notificationButton: {
    padding: 2,
  },
  notificationBadge: {
    alignItems: 'center',
    backgroundColor: palette.tertiary,
    borderColor: palette.white,
    borderRadius: radius.pill,
    borderWidth: 2,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -6,
    top: -6,
  },
  notificationBadgeText: {
    color: palette.white,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
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
  safeArea: {
    backgroundColor: palette.deepNavy,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 92,
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
  topBarLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  topBarTitle: {
    color: palette.primary,
    fontSize: 20,
    fontWeight: '800',
  },
});
