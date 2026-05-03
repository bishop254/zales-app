import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardResponsiveView } from '@/components/app/keyboard-responsive-view';
import { palette, spacing } from '@/constants/app-theme';

type ScreenContainerProps = {
  children?: ReactNode;
  scroll?: boolean;
};

export function ScreenContainer({ children, scroll = true }: ScreenContainerProps) {
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardResponsiveView contentContainerStyle={styles.scrollContent} scroll={scroll}>
        {content}
      </KeyboardResponsiveView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
