import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthBackground, AuthBrandMark, LoadingRail } from '@/components/auth/auth-primitives';

export default function SplashScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/login');
    }, 1400);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <AuthBackground contentStyle={styles.content} scroll={false}>
        <View style={styles.center}>
          <AuthBrandMark />
        </View>
        <LoadingRail />
      </AuthBackground>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
  },
});
