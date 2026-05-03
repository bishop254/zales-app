type UnauthorizedListener = (message?: string) => void;

let unauthorizedListener: UnauthorizedListener | null = null;

export class UnauthorizedError extends Error {
  constructor(message = 'Your session has expired. Please sign in again.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export function setUnauthorizedListener(listener: UnauthorizedListener | null) {
  unauthorizedListener = listener;
}

export function notifyUnauthorized(message?: string) {
  unauthorizedListener?.(message);
}
