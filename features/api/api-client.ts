import { notifyUnauthorized, UnauthorizedError } from './auth-session';

type ApiEnvelope<T> = {
  data: T | null;
  message: string;
  status: string;
  status_code: number;
};

export async function parseApiEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (response.status === 401 || payload.status_code === 401) {
    const message = payload.message || 'Your session has expired. Please sign in again.';
    notifyUnauthorized(message);
    throw new UnauthorizedError(message);
  }

  if (!response.ok || !payload.data) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload.data;
}

export async function parseApiEnvelopeNullable<T>(response: Response): Promise<T | null> {
  if (response.status === 204) {
    return null;
  }

  const rawBody = await response.text();

  if (!rawBody.trim()) {
    if (response.status === 401) {
      const message = 'Your session has expired. Please sign in again.';
      notifyUnauthorized(message);
      throw new UnauthorizedError(message);
    }

    if (!response.ok) {
      throw new Error('Request failed.');
    }

    return null;
  }

  const payload = JSON.parse(rawBody) as ApiEnvelope<T>;

  if (response.status === 401 || payload.status_code === 401) {
    const message = payload.message || 'Your session has expired. Please sign in again.';
    notifyUnauthorized(message);
    throw new UnauthorizedError(message);
  }

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload.data ?? null;
}
