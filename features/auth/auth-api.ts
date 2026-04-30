import { apiConfig } from '@/constants/api';

type ApiEnvelope<T> = {
  data: T | null;
  message: string;
  status: string;
  status_code: number;
};

export type LoginResult = {
  access_token: string;
  isFirstLogin: boolean;
};

export async function loginWithBackend(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${apiConfig.baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  const payload = (await response.json()) as ApiEnvelope<LoginResult>;

  if (!response.ok || !payload.data) {
    throw new Error(payload.message || 'Unable to login right now.');
  }

  return payload.data;
}
