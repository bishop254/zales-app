import { createContext, useCallback, useContext, useMemo, useEffect, useState, type PropsWithChildren } from 'react';

import { UnauthorizedError } from '@/features/api/auth-session';
import { getBillingOverview } from '@/features/billing/billing-api';
import { useAuth } from '@/providers/auth-provider';

type SubscriptionContextValue = {
  hasActiveSubscription: boolean;
  subscriptionLoading: boolean;
  reloadSubscription: (silent?: boolean) => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const reloadSubscription = useCallback(
    async (silent = false) => {
      if (!session) return;

      if (!silent) setSubscriptionLoading(true);

      try {
        const overview = await getBillingOverview(session.accessToken);
        setHasActiveSubscription(overview.hasActiveSubscription);
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) {
          setHasActiveSubscription(false);
        }
      } finally {
        if (!silent) setSubscriptionLoading(false);
      }
    },
    [session]
  );

  useEffect(() => {
    if (!session) {
      setHasActiveSubscription(false);
      setSubscriptionLoading(false);
      return;
    }

    reloadSubscription();
    // Only re-run when session identity changes, not on every reloadSubscription reference update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const value = useMemo(
    () => ({ hasActiveSubscription, subscriptionLoading, reloadSubscription }),
    [hasActiveSubscription, subscriptionLoading, reloadSubscription]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error('useSubscription must be used inside SubscriptionProvider');
  }

  return context;
}
