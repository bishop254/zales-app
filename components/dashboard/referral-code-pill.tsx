import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';

type ReferralCodePillProps = {
  code: string;
  onCopy: () => void;
};

export function ReferralCodePill({ code, onCopy }: ReferralCodePillProps) {
  return (
    <View style={styles.referralPill}>
      <Text style={styles.referralLabel}>Your Referral Code:</Text>
      <Text style={styles.referralValue}>{code}</Text>
      <Pressable hitSlop={8} onPress={onCopy}>
        <MaterialIcons color="rgba(255,255,255,0.7)" name="content-copy" size={16} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  referralLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.labelCaps,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  referralPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  referralValue: {
    color: palette.white,
    fontSize: typography.label,
    fontWeight: '700',
  },
});
