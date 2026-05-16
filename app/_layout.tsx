import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/providers/auth-provider';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { ToastProvider } from '@/providers/toast-provider';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ToastProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="set-password" />
              <Stack.Screen name="verify" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="billing" />
              <Stack.Screen name="tasks" />
              <Stack.Screen name="task-form" />
              <Stack.Screen name="contracts" />
              <Stack.Screen name="contract-form" />
              <Stack.Screen name="covers" />
              <Stack.Screen name="cover-form" />
              <Stack.Screen name="support-tickets" />
              <Stack.Screen name="support-ticket-form" />
            </Stack>
          </SubscriptionProvider>
        </AuthProvider>
      </ToastProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
