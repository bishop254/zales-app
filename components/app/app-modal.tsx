import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StyleProp, ViewStyle } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';

type AppModalProps = {
  children: ReactNode;
  footer?: ReactNode;
  title: string;
  visible: boolean;
  eyebrow?: string;
  frameStyle?: StyleProp<ViewStyle>;
  onClose: () => void;
};

export function AppModal({ children, footer, title, visible, eyebrow, frameStyle, onClose }: AppModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const availableHeight = windowHeight - Math.max(insets.top, spacing.marginMobile) - Math.max(insets.bottom, spacing.marginMobile);
  const bodyMaxHeight = availableHeight * 0.65;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          {
            paddingBottom: Math.max(insets.bottom, spacing.marginMobile),
            paddingTop: Math.max(insets.top, spacing.marginMobile),
          },
        ]}>
        <View style={styles.dim} />
        <View style={[styles.cardFrame, frameStyle]}>
          <LinearGradient
            colors={['rgba(244, 249, 255, 0.98)', 'rgba(236, 245, 255, 0.96)', 'rgba(248, 251, 255, 0.98)']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.card}>
            <View style={styles.headerWrap}>
              <View style={styles.header}>
                <View style={styles.headingCopy}>
                  {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                  <Text style={styles.title}>{title}</Text>
                </View>
                <Pressable hitSlop={8} style={styles.closeButton} onPress={onClose}>
                  <MaterialIcons color={palette.onSurfaceVariant} name="close" size={22} />
                </Pressable>
              </View>
              <View style={styles.ruleWrap}>
                <View style={styles.rule} />
              </View>
            </View>

            <View style={styles.bodyWrap}>
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.body}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                style={[styles.bodyScroll, { maxHeight: bodyMaxHeight }]}
                showsVerticalScrollIndicator={false}>
                {children}
                {footer ? (
                  <View style={styles.footerInner}>
                    <View style={styles.ruleWrap}>
                      <View style={styles.rule} />
                    </View>
                    <View style={styles.footer}>{footer}</View>
                  </View>
                ) : null}
              </ScrollView>
            </View>
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
    paddingHorizontal: spacing.marginMobile,
  },
  body: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  bodyScroll: {},
  bodyWrap: {
    backgroundColor: 'rgba(247, 249, 251, 0.9)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1,
  },
  card: {
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: radius.lg,
    borderWidth: 1,
    maxHeight: '100%',
    overflow: 'hidden',
  },
  cardFrame: {
    maxWidth: 480,
    maxHeight: '100%',
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  footerInner: {
    marginTop: spacing.md,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    zIndex: 1,
  },
  headerWrap: {
    backgroundColor: 'rgba(247, 249, 251, 0.9)',
  },
  headingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  rule: {
    backgroundColor: 'rgba(192, 199, 214, 0.72)',
    borderRadius: radius.pill,
    height: 1,
    width: '75%',
  },
  ruleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: palette.onSurface,
    fontSize: typography.headline,
    fontWeight: '700',
  },
});
