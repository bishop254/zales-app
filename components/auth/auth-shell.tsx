import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppLogo } from '@/components/app/app-logo';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { useResponsiveTypography } from '@/hooks/use-responsive-typography';

type AuthShellProps = {
  children?: ReactNode;
  title: string;
  subtitle: string;
  footer?: ReactNode;
};

export function AuthShell({ children, footer, subtitle, title }: AuthShellProps) {
  const responsiveType = useResponsiveTypography();

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <AppLogo />
        <Text style={[styles.title, { fontSize: responsiveType.display, lineHeight: responsiveType.displayLineHeight }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { fontSize: responsiveType.body, lineHeight: responsiveType.bodyLineHeight }]}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.card}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: palette.primary,
    fontSize: typography.display,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: palette.onSurfaceVariant,
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 320,
    textAlign: 'center',
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 3,
    gap: spacing.lg,
    padding: spacing.xl,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  footer: {
    alignItems: 'center',
  },
});
