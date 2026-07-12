import { StyleSheet, Text, type TextProps } from 'react-native';

import { useResponsiveTypography } from '@/hooks/use-responsive-typography';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const responsiveType = useResponsiveTypography();

  return (
    <Text
      style={[
        { color },
        type === 'default'
          ? {
              ...styles.default,
              fontSize: responsiveType.body,
              lineHeight: responsiveType.bodyLineHeight,
            }
          : undefined,
        type === 'title'
          ? {
              ...styles.title,
              fontSize: responsiveType.display,
              lineHeight: responsiveType.displayLineHeight,
            }
          : undefined,
        type === 'defaultSemiBold'
          ? {
              ...styles.defaultSemiBold,
              fontSize: responsiveType.body,
              lineHeight: responsiveType.bodyLineHeight,
            }
          : undefined,
        type === 'subtitle'
          ? {
              ...styles.subtitle,
              fontSize: responsiveType.title,
              lineHeight: responsiveType.titleLineHeight,
            }
          : undefined,
        type === 'link'
          ? {
              ...styles.link,
              fontSize: responsiveType.body,
              lineHeight: responsiveType.bodyLineHeight + 6,
            }
          : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
