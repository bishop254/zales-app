import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const androidGoogleServicesFile =
  process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE ??
  (existsSync('./google-services.json') ? './google-services.json' : undefined);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  android: {
    ...config.android,
    ...(androidGoogleServicesFile
      ? { googleServicesFile: androidGoogleServicesFile }
      : {}),
  },
});
