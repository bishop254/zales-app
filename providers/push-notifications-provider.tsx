import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import {
  registerPushDevice,
  unregisterPushDevice,
} from '@/features/push/push-api';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type RegisteredToken = {
  accessToken: string;
  expoPushToken: string;
};

export function PushNotificationsProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const registeredTokenRef = useRef<RegisteredToken | null>(null);
  const previousSessionRef = useRef<typeof session>(null);
  const permissionToastShownRef = useRef(false);

  useEffect(() => {
    const notificationResponseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        void routeFromNotificationData(response.notification.request.content.data);
      });

    void (async () => {
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        await routeFromNotificationData(lastResponse.notification.request.content.data);
      }
    })();

    return () => {
      notificationResponseSubscription.remove();
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
      if (!Device.isDevice) {
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      const currentPermissions = await Notifications.getPermissionsAsync();
      let permissionGranted = allowsNotifications(currentPermissions);

      if (!permissionGranted) {
        const requestedPermissions = await Notifications.requestPermissionsAsync();
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
        await Notifications.getExpoPushTokenAsync({
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

      const message =
        error instanceof Error ? error.message : 'Failed to register push notifications.';
      showToast(message, 'error');
    });

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, showToast]);

  return children;
}

async function routeFromNotificationData(data: unknown) {
  const route = getRouteFromNotificationData(data);
  if (!route) {
    return;
  }

  router.push(route);
  await Notifications.clearLastNotificationResponseAsync();
}

function getRouteFromNotificationData(data: unknown): Href | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const route = (data as Record<string, unknown>).route;
  return typeof route === 'string' && route.startsWith('/') ? (route as Href) : null;
}

function allowsNotifications(
  permissions: Notifications.NotificationPermissionsStatus
): boolean {
  const normalized = permissions as {
    ios?: { status?: Notifications.IosAuthorizationStatus };
    status?: string;
  };

  return (
    normalized.status === 'granted' ||
    normalized.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    normalized.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}
