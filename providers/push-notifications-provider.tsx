import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import {
  registerPushDevice,
  unregisterPushDevice,
} from '@/features/push/push-api';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

type NotificationsModule = typeof import('expo-notifications');

type RegisteredToken = {
  accessToken: string;
  expoPushToken: string;
};

let notificationsModulePromise: Promise<NotificationsModule> | null = null;
let notificationHandlerConfigured = false;

function isExpoGo() {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient'
  );
}

function supportsRemotePushNotifications() {
  return !(Platform.OS === 'android' && isExpoGo());
}

async function getNotificationsModule() {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }

  const notifications = await notificationsModulePromise;

  if (!notificationHandlerConfigured) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  }

  return notifications;
}

export function PushNotificationsProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const registeredTokenRef = useRef<RegisteredToken | null>(null);
  const previousSessionRef = useRef<typeof session>(null);
  const permissionToastShownRef = useRef(false);

  useEffect(() => {
    if (!supportsRemotePushNotifications()) {
      return;
    }

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    void (async () => {
      const notifications = await getNotificationsModule();
      if (cancelled) {
        return;
      }

      subscription = notifications.addNotificationResponseReceivedListener((response) => {
        void routeFromNotificationData(response.notification.request.content.data);
      });

      const lastResponse = await notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        await routeFromNotificationData(lastResponse.notification.request.content.data, notifications);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    const previousSession = previousSessionRef.current;

    if (!session?.accessToken && previousSession?.accessToken && registeredTokenRef.current) {
      const registration = registeredTokenRef.current;
      registeredTokenRef.current = null;

      void unregisterPushDevice(registration.accessToken, registration.expoPushToken).catch(
        () => {
          // Best-effort cleanup during logout or session expiry.
        }
      );
    }

    previousSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let cancelled = false;
    const accessToken = session.accessToken;

    async function syncPushToken() {
      if (!supportsRemotePushNotifications()) {
        return;
      }

      if (!Device.isDevice) {
        return;
      }

      const notifications = await getNotificationsModule();

      if (Platform.OS === 'android') {
        await notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: notifications.AndroidImportance.HIGH,
        });
      }

      const currentPermissions = await notifications.getPermissionsAsync();
      let permissionGranted = allowsNotifications(currentPermissions);

      if (!permissionGranted) {
        const requestedPermissions = await notifications.requestPermissionsAsync();
        permissionGranted = allowsNotifications(requestedPermissions);
      }

      if (!permissionGranted) {
        if (!permissionToastShownRef.current) {
          showToast('Push notifications are disabled on this device.', 'error');
          permissionToastShownRef.current = true;
        }
        return;
      }

      const projectId =
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        throw new Error(
          'Missing Expo project ID. Set EXPO_PUBLIC_EAS_PROJECT_ID or configure extra.eas.projectId.'
        );
      }

      const expoPushToken = (
        await notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      if (cancelled) {
        return;
      }

      await registerPushDevice(accessToken, {
        expoPushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceName: Device.deviceName ?? undefined,
        appVersion: Constants.expoConfig?.version ?? undefined,
        projectId,
      });

      registeredTokenRef.current = {
        accessToken,
        expoPushToken,
      };
    }

    void syncPushToken().catch((error) => {
      if (cancelled) {
        return;
      }

      const message = getPushRegistrationErrorMessage(error);
      showToast(message, 'error');
    });

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, showToast]);

  return children;
}

async function routeFromNotificationData(
  data: unknown,
  notifications?: NotificationsModule
) {
  const route = getRouteFromNotificationData(data);
  if (!route) {
    return;
  }

  router.push(route);
  const loadedNotifications = notifications ?? (supportsRemotePushNotifications() ? await getNotificationsModule() : null);
  await loadedNotifications?.clearLastNotificationResponseAsync();
}

function getRouteFromNotificationData(data: unknown): Href | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const route = (data as Record<string, unknown>).route;
  return typeof route === 'string' && route.startsWith('/') ? (route as Href) : null;
}

function allowsNotifications(
  permissions: Awaited<ReturnType<NotificationsModule['getPermissionsAsync']>>
): boolean {
  const normalized = permissions as {
    ios?: { status?: NotificationsModule['IosAuthorizationStatus'][keyof NotificationsModule['IosAuthorizationStatus']] };
    status?: string;
  };

  return (
    normalized.status === 'granted' ||
    normalized.ios?.status === 2 ||
    normalized.ios?.status === 3
  );
}

function getPushRegistrationErrorMessage(error: unknown): string {
  const fallback = 'Failed to register push notifications.';

  if (!(error instanceof Error)) {
    return fallback;
  }

  if (
    Platform.OS === 'android' &&
    error.message.includes('Default FirebaseApp is not initialized')
  ) {
    return 'Android push notifications are not configured yet. Add google-services.json and rebuild the app.';
  }

  return error.message || fallback;
}
