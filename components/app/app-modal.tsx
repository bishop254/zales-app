import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';

type AppModalProps = {
  children: ReactNode;
  footer?: ReactNode;
  title: string;
  visible: boolean;
  eyebrow?: string;
  onClose: () => void;
};

export function AppModal({ children, footer, title, visible, eyebrow, onClose }: AppModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dim} />
        <View style={styles.cardFrame}>
          <LinearGradient
            colors={['rgba(244, 249, 255, 0.98)', 'rgba(236, 245, 255, 0.96)', 'rgba(248, 251, 255, 0.98)']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headingCopy}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                <Text style={styles.title}>{title}</Text>
              </View>
              <Pressable hitSlop={8} style={styles.closeButton} onPress={onClose}>
                <MaterialIcons color={palette.onSurfaceVariant} name="close" size={22} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.marginMobile,
  },
  body: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  card: {
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardFrame: {
    maxWidth: 480,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    width: '100%',
    zIndex: 1,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 22, 40, 0.34)',
  },
  eyebrow: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  footer: {
    borderTopColor: 'rgba(192, 199, 214, 0.55)',
    borderTopWidth: 1,
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    alignItems: 'flex-start',
    borderBottomColor: 'rgba(192, 199, 214, 0.45)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: palette.onSurface,
    fontSize: typography.headline,
    fontWeight: '700',
  },
});
