export const palette = {
  background: '#F7F9FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F4F6',
  surfaceRaised: '#ECEEF0',
  text: '#191C1E',
  textMuted: '#5F6B72',
  primary: '#002431',
  primarySoft: '#073B4C',
  accent: '#AE3200',
  accentSoft: '#FFDBD0',
  success: '#0F8F6F',
  border: '#C1C7CC',
  borderStrong: '#71787C',
  white: '#FFFFFF',
  shadow: 'rgba(10, 31, 44, 0.08)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  display: 32,
  headline: 24,
  title: 18,
  body: 16,
  bodySmall: 14,
  label: 12,
};

export const Colors = {
  light: {
    text: palette.text,
    background: palette.background,
    tint: palette.accent,
    icon: palette.textMuted,
    tabIconDefault: palette.textMuted,
    tabIconSelected: palette.accent,
  },
  dark: {
    text: palette.white,
    background: palette.primary,
    tint: palette.white,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: palette.white,
  },
};
