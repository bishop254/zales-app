import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppMessageModal } from '@/components/app/app-message-modal';
import { AppModal } from '@/components/app/app-modal';
import { FloatingBottomNav } from '@/components/app/floating-bottom-nav';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import {
  getBillingBills,
  getBillingOverview,
  getBillingPaymentStatus,
  getBillingPlans,
  initiateMpesaCheckout,
  type BillingBillItem,
  type BillingBillsResult,
  type BillingOverview,
  type BillingPlan,
} from '@/features/billing/billing-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type CheckoutStep = 'idle' | 'submitting' | 'polling' | 'success' | 'failed';
type InfoModalState = {
  eyebrow: string;
  message: string;
  title: string;
  visible: boolean;
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 12; // 36 seconds

function formatBillingDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString();
}

function formatBillingDateTime(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleString();
}

function formatPriceKes(plan: BillingPlan) {
  return `KES ${plan.priceKes.toLocaleString()}`;
}

function normalizeMpesaPhone(value: string) {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }

  if (digits.startsWith('7') && digits.length === 9) {
    return `254${digits}`;
  }

  return digits;
}

export default function BillingScreen() {
  const { logout, session } = useAuth();
  const { showToast } = useToast();
  const { reloadSubscription } = useSubscription();
  const { width } = useWindowDimensions();

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [bills, setBills] = useState<BillingBillsResult>({ active: [], past: [] });
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<BillingBillItem | null>(null);

  // Checkout state
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const [infoModal, setInfoModal] = useState<InfoModalState>({
    eyebrow: '',
    message: '',
    title: '',
    visible: false,
  });
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const planCardWidth = width * 0.78;

  const avatarLetter = useMemo(() => {
    if (!session) return 'A';
    return (session.name?.trim() || session.email).slice(0, 1).toUpperCase();
  }, [session]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const loadBillingData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [nextOverview, nextBills, nextPlans] = await Promise.all([
        getBillingOverview(session.accessToken),
        getBillingBills(session.accessToken),
        getBillingPlans(),
      ]);
      setOverview(nextOverview);
      setBills(nextBills);
      setPlans(
        nextPlans.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
      );
    } catch (error) {
      if (error instanceof UnauthorizedError) return;
      const message =
        error instanceof Error ? error.message : 'Unable to load billing details.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [session, showToast]);

  useFocusEffect(
    useCallback(() => {
      loadBillingData();
      return () => stopPolling();
    }, [loadBillingData, stopPolling])
  );

  if (!session) {
    return <Redirect href="/login" />;
  }

  const hasActiveSubscription = overview?.hasActiveSubscription ?? false;
  const planLabel = overview?.subscription?.plan?.name ?? 'No active plan';
  const expiryLabel = formatBillingDate(overview?.subscription?.expiresAt);
  const allBills = [...bills.active, ...bills.past];

  function handleLogout() {
    setMoreMenuOpen(false);
    logout({ animated: true, redirectToLogin: true });
  }

  function openInfoModal({ eyebrow, message, title }: Omit<InfoModalState, 'visible'>) {
    setInfoModal({
      eyebrow,
      message,
      title,
      visible: true,
    });
  }

  function closeInfoModal() {
    setInfoModal((current) => ({
      ...current,
      visible: false,
    }));
  }

  function handleBottomNavPress(key: string) {
    if (key === 'home') {
      setMoreMenuOpen(false);
      router.replace('/dashboard');
      return;
    }
    if (key === 'contracts') {
      setMoreMenuOpen(false);
      router.push('/contracts');
      return;
    }
    if (key === 'covers') {
      setMoreMenuOpen(false);
      router.push('/covers');
      return;
    }
    if (key === 'journals') {
      setMoreMenuOpen(false);
      router.push('/journals');
      return;
    }
    if (key === 'tasks') {
      setMoreMenuOpen(false);
      router.push('/tasks');
      return;
    }
    if (key === 'more') {
      setMoreMenuOpen((current) => !current);
      return;
    }
    setMoreMenuOpen(false);
  }

  function openPlanModal(plan: BillingPlan) {
    stopPolling();
    setSelectedPlan(plan);
    setPhone('');
    setPhoneError('');
    setCheckoutStep('idle');
    setCheckoutError('');
  }

  function closePlanModal() {
    stopPolling();
    const wasSuccess = checkoutStep === 'success';
    setSelectedPlan(null);
    setCheckoutStep('idle');
    if (wasSuccess) {
      loadBillingData();
      reloadSubscription();
    }
  }

  function validatePhone(value: string) {
    const normalized = normalizeMpesaPhone(value);
    if (!normalized) return 'Phone number is required.';
    if (!/^2547\d{8}$/.test(normalized)) {
      return 'Enter a valid phone number (e.g. 0712 345 678, 712345678, or 254712345678).';
    }
    return '';
  }

  function startPolling(paymentId: string) {
    if (!session) return;
    stopPolling();

    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      if (pollCountRef.current > MAX_POLLS) {
        stopPolling();
        setCheckoutError(
          'Payment confirmation timed out. Check your transactions for the latest status.'
        );
        setCheckoutStep('failed');
        return;
      }

      try {
        const status = await getBillingPaymentStatus(session.accessToken, paymentId);
        if (status.status === 'SUCCESS') {
          stopPolling();
          setCheckoutStep('success');
        } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
          stopPolling();
          setCheckoutError(
            status.providerResultDescription ?? 'Payment was declined. Please try again.'
          );
          setCheckoutStep('failed');
        }
      } catch {
        // swallow polling errors — retry on next tick
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleCheckout() {
    if (!selectedPlan || !session) return;

    const err = validatePhone(phone);
    if (err) {
      setPhoneError(err);
      return;
    }
    setPhoneError('');
    setCheckoutStep('submitting');

    try {
      const normalizedPhone = normalizeMpesaPhone(phone);
      const result = await initiateMpesaCheckout(session.accessToken, {
        phoneNumber: normalizedPhone,
        planId: selectedPlan.id,
      });
      setCheckoutStep('polling');
      startPolling(result.paymentId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Checkout failed. Please try again.';
      setCheckoutError(msg);
      setCheckoutStep('failed');
    }
  }

  function handleRetry() {
    setCheckoutStep('idle');
    setCheckoutError('');
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        bottomSlot={
          <FloatingBottomNav activeKey="more" onPress={handleBottomNavPress} />
        }
        onBackPress={() => router.replace('/dashboard')}
        onNotificationPress={() =>
          openInfoModal({
            eyebrow: 'Notifications',
            message: 'Notification center can be connected next.',
            title: 'Notifications',
          })
        }
        onProfilePress={() => router.push('/profile')}
        profileImageUrl={session.profileImageUrl}
        scrollViewProps={{ onScrollBeginDrag: () => setMoreMenuOpen(false) }}
        title="Billing">

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Subscription</Text>
        </View>

        {/* ── Subscription status ──────────────────────────────────────── */}
        <View style={styles.contentWrap}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIconWrap,
                hasActiveSubscription
                  ? styles.statusIconWrapActive
                  : styles.statusIconWrapInactive,
              ]}>
              {loading ? (
                <ActivityIndicator color={palette.primary} size="small" />
              ) : (
                <MaterialIcons
                  color={hasActiveSubscription ? '#15803D' : palette.error}
                  name={hasActiveSubscription ? 'verified-user' : 'warning'}
                  size={20}
                />
              )}
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>
                {loading ? 'Loading subscription...' : planLabel}
              </Text>
              <Text style={styles.statusMeta}>
                {loading
                  ? 'Fetching the latest subscription details.'
                  : hasActiveSubscription
                    ? expiryLabel
                      ? `Active until ${expiryLabel}`
                      : 'Subscription active'
                    : 'No active subscription'}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                hasActiveSubscription
                  ? styles.statusPillActive
                  : styles.statusPillInactive,
              ]}>
              <Text style={styles.statusPillText}>
                {loading ? 'SYNCING' : hasActiveSubscription ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Plans carousel (hidden when subscribed) ──────────────────── */}
        {!hasActiveSubscription && <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Available Plans</Text>
          <Text style={styles.sectionHint}>Swipe to see all</Text>
        </View>}

        {!hasActiveSubscription && (
          loading ? (
            <View style={styles.plansLoadingWrap}>
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : plans.length > 0 ? (
            <FlatList
              data={plans}
              decelerationRate="fast"
              horizontal
              keyExtractor={(item) => item.id}
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={planCardWidth + spacing.md}
              snapToAlignment="start"
              contentContainerStyle={[
                styles.carouselContent,
                { paddingHorizontal: spacing.marginMobile },
              ]}
              renderItem={({ item: plan }) => (
                <Pressable
                  style={[styles.planCard, { width: planCardWidth }]}
                  onPress={() => openPlanModal(plan)}>
                  <View style={styles.planCardTop}>
                    <View style={styles.planIconWrap}>
                      <MaterialIcons
                        color={palette.primary}
                        name={
                          plan.billingCycle === 'YEARLY' ? 'workspace-premium' : 'star'
                        }
                        size={24}
                      />
                    </View>
                    <View
                      style={[
                        styles.planCyclePill,
                        plan.billingCycle === 'YEARLY'
                          ? styles.planCyclePillYearly
                          : styles.planCyclePillMonthly,
                      ]}>
                      <Text
                        style={[
                          styles.planCycleText,
                          plan.billingCycle === 'YEARLY'
                            ? styles.planCycleTextYearly
                            : styles.planCycleTextMonthly,
                        ]}>
                        {plan.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.planPriceBlock}>
                    <Text style={styles.planPrice}>{formatPriceKes(plan)}</Text>
                    <Text style={styles.planPricePer}>
                      /{plan.billingCycle === 'YEARLY' ? 'yr' : 'mo'}
                    </Text>
                  </View>

                  <Text style={styles.planName}>{plan.name}</Text>
                  {plan.description ? (
                    <Text style={styles.planDescription} numberOfLines={2}>
                      {plan.description}
                    </Text>
                  ) : null}

                  <View style={styles.planSelectRow}>
                    <Text style={styles.planSelectLabel}>Select Plan</Text>
                    <MaterialIcons color={palette.primary} name="arrow-forward" size={16} />
                  </View>
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.plansEmptyWrap}>
              <MaterialIcons color={palette.outlineVariant} name="credit-card-off" size={28} />
              <Text style={styles.emptyStateText}>No plans available.</Text>
            </View>
          )
        )}

        {/* ── Transactions ─────────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Transactions</Text>
          <View style={styles.listCard}>
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={palette.primary} />
                <Text style={styles.emptyStateText}>Loading transactions...</Text>
              </View>
            ) : allBills.length > 0 ? (
              allBills.map((bill, index) => (
                <Pressable
                  key={bill.paymentId}
                  style={[
                    styles.billRow,
                    index < allBills.length - 1 ? styles.billRowBorder : null,
                  ]}
                  onPress={() => setSelectedBill(bill)}>
                  <View style={styles.billRowLeft}>
                    <View
                      style={[
                        styles.billStatusDot,
                        bill.status === 'SUCCESS'
                          ? styles.billStatusDotSuccess
                          : bill.status === 'PENDING'
                            ? styles.billStatusDotPending
                            : styles.billStatusDotFailed,
                      ]}
                    />
                    <View style={styles.billCopy}>
                      <Text style={styles.billTitle}>
                        {bill.currency} {bill.amount.toFixed(2)}
                      </Text>
                      <Text style={styles.billMeta}>
                        {bill.providerReceipt
                          ? `Receipt ${bill.providerReceipt}`
                          : 'Receipt pending'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.billRight}>
                    <Text style={styles.billDate}>
                      {formatBillingDate(bill.createdAt) ?? 'Unknown date'}
                    </Text>
                    <View
                      style={[
                        styles.billStatusPill,
                        bill.status === 'SUCCESS'
                          ? styles.billStatusPillSuccess
                          : bill.status === 'PENDING'
                            ? styles.billStatusPillPending
                            : styles.billStatusPillFailed,
                      ]}>
                      <Text style={styles.billStatusText}>{bill.status}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons
                  color={palette.outlineVariant}
                  name="receipt-long"
                  size={28}
                />
                <Text style={styles.emptyStateText}>No transactions yet.</Text>
              </View>
            )}
          </View>
        </View>
      </FloatingPageShell>

      {/* ── More menu ──────────────────────────────────────────────────── */}
      {moreMenuOpen ? (
        <>
          <Pressable
            style={styles.moreMenuBackdrop}
            onPress={() => setMoreMenuOpen(false)}
          />
          <View style={styles.moreMenu}>
            <Pressable
              style={styles.moreMenuItem}
              onPress={() => {
                setMoreMenuOpen(false);
                router.push('/support-tickets');
              }}>
              <View style={styles.moreMenuIconWrap}>
                <MaterialIcons color={palette.primary} name="contact-support" size={20} />
              </View>
              <View style={styles.moreMenuCopy}>
                <Text style={styles.moreMenuTitle}>Support</Text>
                <Text style={styles.moreMenuSubtitle}>Open support tools and tickets</Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.moreMenuItem}
              onPress={() => {
                setMoreMenuOpen(false);
                router.push('/recycle-bin');
              }}>
              <View style={styles.moreMenuIconWrap}>
                <MaterialIcons color={palette.primary} name="delete-sweep" size={20} />
              </View>
              <View style={styles.moreMenuCopy}>
                <Text style={styles.moreMenuTitle}>Recycle Bin</Text>
                <Text style={styles.moreMenuSubtitle}>Restore or clear deleted records</Text>
              </View>
            </Pressable>
            <Pressable style={styles.moreMenuItem} onPress={handleLogout}>
              <View style={[styles.moreMenuIconWrap, styles.moreMenuIconWrapMuted]}>
                <MaterialIcons color={palette.onSurface} name="logout" size={20} />
              </View>
              <View style={styles.moreMenuCopy}>
                <Text style={styles.moreMenuTitle}>Logout</Text>
                <Text style={styles.moreMenuSubtitle}>Sign out of your account</Text>
              </View>
            </Pressable>
          </View>
        </>
      ) : null}

      {/* ── Transaction detail modal ────────────────────────────────────── */}
      <AppModal
        eyebrow="Transaction Details"
        footer={
          <Pressable style={styles.modalButton} onPress={() => setSelectedBill(null)}>
            <Text style={styles.modalButtonText}>Close</Text>
          </Pressable>
        }
        title={
          selectedBill
            ? `${selectedBill.currency} ${selectedBill.amount.toFixed(2)}`
            : 'Transaction'
        }
        visible={Boolean(selectedBill)}
        onClose={() => setSelectedBill(null)}>
        {selectedBill ? (
          <>
            <View style={styles.modalStatusStrip}>
              <View
                style={[
                  styles.modalStatusIconWrap,
                  selectedBill.status === 'SUCCESS'
                    ? styles.billStatusPillSuccess
                    : selectedBill.status === 'PENDING'
                      ? styles.billStatusPillPending
                      : styles.billStatusPillFailed,
                ]}>
                <MaterialIcons
                  color={
                    selectedBill.status === 'SUCCESS'
                      ? '#15803D'
                      : selectedBill.status === 'PENDING'
                        ? '#B45309'
                        : palette.error
                  }
                  name={
                    selectedBill.status === 'SUCCESS'
                      ? 'check-circle'
                      : selectedBill.status === 'PENDING'
                        ? 'schedule'
                        : 'error'
                  }
                  size={20}
                />
              </View>
              <View style={styles.modalStatusCopy}>
                <Text style={styles.modalStatusTitle}>{selectedBill.status}</Text>
                <Text style={styles.modalStatusBody}>
                  {selectedBill.subscriptionStatus
                    ? `Linked subscription: ${selectedBill.subscriptionStatus}`
                    : 'No linked subscription state available.'}
                </Text>
              </View>
            </View>

            <View style={styles.detailList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Receipt</Text>
                <Text style={styles.detailValue}>
                  {selectedBill.providerReceipt ?? 'Pending'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>
                  {selectedBill.phoneNumber ?? 'Not available'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>
                  {formatBillingDateTime(selectedBill.createdAt) ?? '-'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Updated</Text>
                <Text style={styles.detailValue}>
                  {formatBillingDateTime(selectedBill.updatedAt) ?? '-'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment ID</Text>
                <Text style={styles.detailValueMono}>{selectedBill.paymentId}</Text>
              </View>
            </View>
          </>
        ) : null}
      </AppModal>

      {/* ── Checkout / plan selection modal ─────────────────────────────── */}
      <AppModal
        eyebrow={selectedPlan ? formatPriceKes(selectedPlan) : ''}
        title={selectedPlan?.name ?? 'Choose Plan'}
        visible={Boolean(selectedPlan)}
        onClose={closePlanModal}
        footer={
          checkoutStep === 'idle' || checkoutStep === 'submitting' ? (
            <Pressable
              disabled={checkoutStep === 'submitting'}
              style={[
                styles.modalButton,
                checkoutStep === 'submitting' ? styles.modalButtonDisabled : null,
              ]}
              onPress={handleCheckout}>
              {checkoutStep === 'submitting' ? (
                <ActivityIndicator color={palette.onPrimary} size="small" />
              ) : (
                <Text style={styles.modalButtonText}>
                  Pay with M-Pesa
                  {selectedPlan ? ` • ${formatPriceKes(selectedPlan)}` : ''}
                </Text>
              )}
            </Pressable>
          ) : checkoutStep === 'polling' ? (
            <Pressable
              style={[styles.modalButton, styles.modalButtonOutline]}
              onPress={closePlanModal}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>
                Cancel
              </Text>
            </Pressable>
          ) : checkoutStep === 'success' ? (
            <Pressable style={styles.modalButton} onPress={closePlanModal}>
              <Text style={styles.modalButtonText}>Done</Text>
            </Pressable>
          ) : (
            <View style={styles.modalFooterRow}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonOutline, { flex: 1 }]}
                onPress={closePlanModal}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>
                  Close
                </Text>
              </Pressable>
              <Pressable style={[styles.modalButton, { flex: 1 }]} onPress={handleRetry}>
                <Text style={styles.modalButtonText}>Try Again</Text>
              </Pressable>
            </View>
          )
        }>

        {checkoutStep === 'idle' || checkoutStep === 'submitting' ? (
          <>
            {/* Plan summary strip */}
            <View style={styles.checkoutPlanRow}>
              <View style={styles.planIconWrap}>
                <MaterialIcons
                  color={palette.primary}
                  name={
                    selectedPlan?.billingCycle === 'YEARLY' ? 'workspace-premium' : 'star'
                  }
                  size={22}
                />
              </View>
              <View style={styles.checkoutPlanCopy}>
                <Text style={styles.checkoutPlanName}>{selectedPlan?.name}</Text>
                <Text style={styles.checkoutPlanCycle}>
                  {selectedPlan?.billingCycle === 'YEARLY'
                    ? 'Billed annually'
                    : 'Billed monthly'}
                </Text>
              </View>
              <Text style={styles.checkoutPlanPrice}>
                {selectedPlan ? formatPriceKes(selectedPlan) : ''}
              </Text>
            </View>

            {/* Payment method selector */}
            <View style={styles.methodsBlock}>
              <Text style={styles.methodsLabel}>Payment Method</Text>
              <View style={styles.methodsList}>
                {/* M-Pesa — selected */}
                <View style={[styles.methodRow, styles.methodRowSelected]}>
                  <View style={[styles.methodIconWrap, styles.methodIconWrapSelected]}>
                    <MaterialIcons color={palette.primary} name="phone-android" size={20} />
                  </View>
                  <View style={styles.methodCopy}>
                    <Text style={styles.methodTitle}>M-Pesa</Text>
                    <Text style={styles.methodSubtitle}>Mobile money payment</Text>
                  </View>
                  <MaterialIcons
                    color={palette.primary}
                    name="radio-button-checked"
                    size={20}
                  />
                </View>

                {/* Card — coming soon */}
                <View style={[styles.methodRow, styles.methodRowDisabled]}>
                  <View style={styles.methodIconWrap}>
                    <MaterialIcons
                      color={palette.outlineVariant}
                      name="credit-card"
                      size={20}
                    />
                  </View>
                  <View style={styles.methodCopy}>
                    <Text style={[styles.methodTitle, styles.methodTitleDisabled]}>
                      Card
                    </Text>
                    <Text style={styles.methodSubtitle}>Credit / Debit card</Text>
                  </View>
                  <View style={styles.comingSoonPill}>
                    <Text style={styles.comingSoonText}>Soon</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Phone number input */}
            <View style={styles.phoneBlock}>
              <Text style={styles.phoneLabel}>M-Pesa Phone Number</Text>
              <View
                style={[
                  styles.phoneInputRow,
                  phoneError ? styles.phoneInputRowError : null,
                ]}>
                <MaterialIcons color={palette.onSurfaceVariant} name="phone" size={20} />
                <TextInput
                  editable={checkoutStep === 'idle'}
                  keyboardType="phone-pad"
                  placeholder="e.g. 0712 345 678"
                  placeholderTextColor={palette.outlineVariant}
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (phoneError) setPhoneError('');
                  }}
                />
              </View>
              {phoneError ? (
                <Text style={styles.phoneError}>{phoneError}</Text>
              ) : null}
            </View>
          </>
        ) : checkoutStep === 'polling' ? (
          <View style={styles.checkoutFeedback}>
            <ActivityIndicator color={palette.primary} size="large" />
            <Text style={styles.checkoutFeedbackTitle}>Check your phone</Text>
            <Text style={styles.checkoutFeedbackBody}>
              An M-Pesa prompt has been sent to {phone}. Enter your PIN to complete the
              payment.
            </Text>
          </View>
        ) : checkoutStep === 'success' ? (
          <View style={styles.checkoutFeedback}>
            <View style={[styles.checkoutFeedbackIcon, styles.checkoutFeedbackIconSuccess]}>
              <MaterialIcons color="#15803D" name="check-circle" size={40} />
            </View>
            <Text style={styles.checkoutFeedbackTitle}>Subscription Activated!</Text>
            <Text style={styles.checkoutFeedbackBody}>
              Your {selectedPlan?.name} plan is now active. Enjoy full access to all
              features.
            </Text>
          </View>
        ) : (
          <View style={styles.checkoutFeedback}>
            <View style={[styles.checkoutFeedbackIcon, styles.checkoutFeedbackIconError]}>
              <MaterialIcons color={palette.error} name="error-outline" size={40} />
            </View>
            <Text style={styles.checkoutFeedbackTitle}>Payment Failed</Text>
            <Text style={styles.checkoutFeedbackBody}>{checkoutError}</Text>
          </View>
        )}
      </AppModal>
      <AppMessageModal
        eyebrow={infoModal.eyebrow}
        message={infoModal.message}
        title={infoModal.title}
        visible={infoModal.visible}
        onClose={closeInfoModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // ── Page layout ──────────────────────────────────────────────────────────
  heroSection: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.lg,
  },
  heroTitle: {
    color: palette.white,
    fontSize: typography.display,
    fontWeight: '700',
  },
  heroBody: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: typography.body,
    maxWidth: '82%',
  },
  contentWrap: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.marginMobile,
  },
  sectionBlock: {
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.marginMobile,
  },
  sectionLabel: {
    color: palette.white,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },

  // ── Status row ───────────────────────────────────────────────────────────
  statusRow: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  statusIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  statusIconWrapActive: { backgroundColor: 'rgba(22, 163, 74, 0.12)' },
  statusIconWrapInactive: { backgroundColor: 'rgba(186, 26, 26, 0.1)' },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  statusMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusPillActive: { backgroundColor: 'rgba(22, 163, 74, 0.12)' },
  statusPillInactive: { backgroundColor: 'rgba(186, 26, 26, 0.12)' },
  statusPillText: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
  },

  // ── Plans carousel ───────────────────────────────────────────────────────
  plansLoadingWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 180,
  },
  plansEmptyWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 180,
    paddingHorizontal: spacing.marginMobile,
  },
  carouselContent: {
    gap: spacing.md,
    marginTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  planCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 10,
    gap: spacing.sm,
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  planCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.xl,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  planCyclePill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  planCyclePillMonthly: { backgroundColor: 'rgba(0, 92, 171, 0.1)' },
  planCyclePillYearly: { backgroundColor: 'rgba(181, 28, 0, 0.1)' },
  planCycleText: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  planCycleTextMonthly: { color: palette.primary },
  planCycleTextYearly: { color: palette.tertiary },
  planPriceBlock: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 2,
    marginTop: spacing.xs,
  },
  planPrice: {
    color: palette.onSurface,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  planPricePer: {
    color: palette.onSurfaceVariant,
    fontSize: typography.body,
    fontWeight: '600',
    marginBottom: 3,
  },
  planName: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  planDescription: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 18,
  },
  planSelectRow: {
    alignItems: 'center',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  planSelectLabel: {
    color: palette.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },

  // ── Transactions ─────────────────────────────────────────────────────────
  listCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 132,
    padding: spacing.lg,
  },
  emptyStateText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  billRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  billRowBorder: { borderBottomColor: '#F1F5F9', borderBottomWidth: 1 },
  billRowLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  billStatusDot: { borderRadius: radius.pill, height: 12, width: 12 },
  billStatusDotSuccess: { backgroundColor: '#16A34A' },
  billStatusDotPending: { backgroundColor: '#F59E0B' },
  billStatusDotFailed: { backgroundColor: '#BA1A1A' },
  billCopy: { flex: 1, gap: spacing.xs },
  billTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  billMeta: { color: palette.onSurfaceVariant, fontSize: typography.bodySmall },
  billRight: { alignItems: 'flex-end', gap: spacing.xs },
  billDate: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  billStatusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  billStatusPillSuccess: { backgroundColor: 'rgba(22, 163, 74, 0.12)' },
  billStatusPillPending: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
  billStatusPillFailed: { backgroundColor: 'rgba(186, 26, 26, 0.12)' },
  billStatusText: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
  },

  // ── More menu ────────────────────────────────────────────────────────────
  moreMenu: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(0,92,171,0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    bottom: 94,
    padding: spacing.sm,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: '72%',
    zIndex: 40,
  },
  moreMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.06)',
    zIndex: 30,
  },
  moreMenuCopy: { flex: 1, gap: 2 },
  moreMenuIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  moreMenuIconWrapMuted: { backgroundColor: 'rgba(224, 227, 229, 0.85)' },
  moreMenuItem: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  moreMenuSubtitle: { color: palette.onSurfaceVariant, fontSize: 12 },
  moreMenuTitle: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },

  // ── Shared modal ─────────────────────────────────────────────────────────
  modalButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
  },
  modalButtonDisabled: { opacity: 0.7 },
  modalButtonOutline: {
    backgroundColor: 'transparent',
    borderColor: palette.outlineVariant,
    borderWidth: 1,
  },
  modalButtonText: {
    color: palette.onPrimary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  modalButtonTextOutline: { color: palette.onSurface },
  modalFooterRow: { flexDirection: 'row', gap: spacing.sm },

  // ── Transaction modal ─────────────────────────────────────────────────────
  modalStatusStrip: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  modalStatusIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  modalStatusCopy: { flex: 1, gap: spacing.xs },
  modalStatusTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  modalStatusBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  detailList: { gap: spacing.sm },
  detailRow: { gap: spacing.xs },
  detailLabel: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '600',
    lineHeight: 20,
  },
  detailValueMono: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '600',
    lineHeight: 20,
  },

  // ── Checkout modal ────────────────────────────────────────────────────────
  checkoutPlanRow: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  checkoutPlanCopy: { flex: 1, gap: 2 },
  checkoutPlanName: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  checkoutPlanCycle: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  checkoutPlanPrice: {
    color: palette.primary,
    fontSize: typography.body,
    fontWeight: '800',
  },
  methodsBlock: { gap: spacing.sm },
  methodsLabel: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  methodsList: { gap: spacing.xs },
  methodRow: {
    alignItems: 'center',
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  methodRowSelected: {
    backgroundColor: 'rgba(0, 92, 171, 0.04)',
    borderColor: palette.primary,
  },
  methodRowDisabled: { opacity: 0.55 },
  methodIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(224, 227, 229, 0.6)',
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  methodIconWrapSelected: { backgroundColor: 'rgba(0, 92, 171, 0.1)' },
  methodCopy: { flex: 1, gap: 2 },
  methodTitle: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  methodTitleDisabled: { color: palette.onSurfaceVariant },
  methodSubtitle: { color: palette.onSurfaceVariant, fontSize: 12 },
  comingSoonPill: {
    backgroundColor: 'rgba(224, 227, 229, 0.8)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  comingSoonText: {
    color: palette.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  phoneBlock: { gap: spacing.sm },
  phoneLabel: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  phoneInputRow: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLow,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  phoneInputRowError: { borderColor: '#BA1A1A' },
  phoneInput: {
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.body,
    paddingVertical: spacing.md,
  },
  phoneError: { color: '#BA1A1A', fontSize: typography.bodySmall },
  checkoutFeedback: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  checkoutFeedbackIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  checkoutFeedbackIconSuccess: { backgroundColor: 'rgba(22, 163, 74, 0.1)' },
  checkoutFeedbackIconError: { backgroundColor: 'rgba(186, 26, 26, 0.1)' },
  checkoutFeedbackTitle: {
    color: palette.onSurface,
    fontSize: typography.headline,
    fontWeight: '700',
    textAlign: 'center',
  },
  checkoutFeedbackBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
  },
});
