import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/app-theme';

type ToastTone = 'error' | 'success';

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
} | null;

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now();
    setToast({ id, message, tone });

    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2800);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <Pressable
            style={[styles.toast, toast.tone === 'error' ? styles.toastError : styles.toastSuccess]}
            onPress={() => setToast(null)}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  overlay: {
    bottom: 110,
    left: 0,
    paddingHorizontal: spacing.marginMobile,
    position: 'absolute',
    right: 0,
  },
  toast: {
    alignSelf: 'center',
    borderRadius: radius.lg,
    maxWidth: 420,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  toastError: {
    backgroundColor: palette.error,
  },
  toastSuccess: {
    backgroundColor: palette.primary,
  },
  toastText: {
    color: palette.white,
    fontSize: typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },
});
