import Constants from 'expo-constants';
import { Platform } from 'react-native';

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function getDefaultBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://aura-tech-africa.com:3000';

  if (configuredBaseUrl?.trim()) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    '';

  const hostname = hostUri.split(':')[0];

  if (hostname) {
    return normalizeBaseUrl(`http://${hostname}:3000`);
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}

export const apiConfig = {
  baseUrl: getDefaultBaseUrl(),
};
