import { Image, StyleSheet, View } from 'react-native';

type AppLogoProps = {
  tint?: 'dark' | 'light';
  compact?: boolean;
};

export function AppLogo({ compact = false, tint = 'dark' }: AppLogoProps) {
  void tint;

  return (
    <View style={styles.row}>
      <Image
        resizeMode="contain"
        source={require('@/assets/images/managewizard-logo.png')}
        style={[styles.logoImage, compact ? styles.logoImageCompact : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoImage: {
    height: 72,
    width: 240,
  },
  logoImageCompact: {
    height: 54,
    width: 188,
  },
});
