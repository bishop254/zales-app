import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius } from '@/constants/app-theme';
import { bottomNavItems } from '@/features/dashboard/data';

type FloatingBottomNavProps = {
  activeKey: string;
  onPress: (key: string) => void;
};

export function FloatingBottomNav({ activeKey, onPress }: FloatingBottomNavProps) {
  return (
    <View style={styles.bottomNav}>
      {bottomNavItems.map((item) => {
        const active = item.key === activeKey;

        return (
          <Pressable
            key={item.key}
            style={[styles.bottomNavItem, active ? styles.bottomNavItemActive : null]}
            onPress={() => onPress(item.key)}>
            <MaterialIcons color={active ? palette.primary : '#94A3B8'} name={item.icon} size={22} />
            <Text style={[styles.bottomNavLabel, active ? styles.bottomNavLabelActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(0,92,171,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    bottom: 0,
    elevation: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 68,
    marginBottom: 16,
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
    width: '84%',
  },
  bottomNavItem: {
    alignItems: 'center',
    borderRadius: radius.lg,
    justifyContent: 'center',
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bottomNavItemActive: {
    backgroundColor: 'rgba(0, 92, 171, 0.08)',
  },
  bottomNavLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  bottomNavLabelActive: {
    color: palette.primary,
    fontWeight: '700',
  },
});
