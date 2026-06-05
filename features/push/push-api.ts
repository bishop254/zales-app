import { apiConfig } from '@/constants/api';
import {
  parseApiEnvelope,
  parseApiEnvelopeNullable,
} from '@/features/api/api-client';

export type RegisterPushDevicePayload = {
  expoPushToken: string;
  platform: 'android' | 'ios';
  deviceName?: string;
  appVersion?: string;
  projectId?: string;
};

type RegisteredPushDevice = {
  id: string;
  expoPushToken: string;
  isActive: boolean;
  lastRegisteredAt: string;
};

export async function registerPushDevice(
  accessToken: string,
  payload: RegisterPushDevicePayload
): Promise<RegisteredPushDevice> {
  const response = await fetch(`${apiConfig.baseUrl}/push-devices/register`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseApiEnvelope<RegisteredPushDevice>(response);
}

export async function unregisterPushDevice(
  accessToken: string,
  expoPushToken: string
): Promise<void> {
  const response = await fetch(`${apiConfig.baseUrl}/push-devices/unregister`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expoPushToken }),
  });

  await parseApiEnvelopeNullable(response);
}
