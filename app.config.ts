import { existsSync } from 'node:fs';
import type { ExpoConfig } from 'expo/config';

const { expo: staticConfig } = require('./app.json') as { expo: ExpoConfig };

const androidGoogleServicesFile =
  process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE ??
  (existsSync('./google-services.json') ? './google-services.json' : undefined);

export default (): ExpoConfig => ({
  ...staticConfig,
  android: {
    ...staticConfig.android,
    ...(androidGoogleServicesFile
      ? { googleServicesFile: androidGoogleServicesFile }
      : {}),
  },
});