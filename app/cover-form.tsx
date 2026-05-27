import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppMessageModal } from '@/components/app/app-message-modal';
import { AppModal } from '@/components/app/app-modal';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { AuthSearchSelectField, AuthSelectField, AuthTextField } from '@/components/auth/auth-primitives';
import { africanCountries } from '@/constants/african-countries';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import { type CoverCycle, createCover, getCoverById, updateCover } from '@/features/covers/covers-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type CoverForm = {
  allowPushNotif: boolean;
  currency: string;
  customerIdentifier: string;
  cycle: CoverCycle;
  email: string;
  expiryDate: string;
  insurancePremium: string;
  insuranceProduct: string;
  insuranceProvider: string;
  phone: string;
  policyNumber: string;
  vehicleReg: string;
};

type CoverTouched = {
  country: boolean;
  customerIdentifier: boolean;
  cycle: boolean;
  email: boolean;
  expiryDate: boolean;
  insurancePremium: boolean;
  insuranceProduct: boolean;
  insuranceProvider: boolean;
};

type InfoModalState = {
  eyebrow: string;
  message: string;
  title: string;
  visible: boolean;
};

const INITIAL_FORM: CoverForm = {
  allowPushNotif: true,
  currency: 'KES',
  customerIdentifier: '',
  cycle: 'MONTHLY',
  email: '',
  expiryDate: '',
  insurancePremium: '',
  insuranceProduct: '',
  insuranceProvider: '',
  phone: '',
  policyNumber: '',
  vehicleReg: '',
};

const INITIAL_TOUCHED: CoverTouched = {
  country: false,
  customerIdentifier: false,
  cycle: false,
  email: false,
  expiryDate: false,
  insurancePremium: false,
  insuranceProduct: false,
  insuranceProvider: false,
};

function formatDateIso(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatReadableDate(dateValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())) {
    return dateValue;
  }

  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let index = 0; index < firstDay; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function validateCreateForm(form: CoverForm) {
  if (!form.customerIdentifier.trim()) return 'Customer name is required.';
  if (!form.insuranceProvider.trim()) return 'Insurance provider is required.';
  if (!form.insuranceProduct.trim()) return 'Insurance product is required.';
  if (!form.insurancePremium.trim()) return 'Premium is required.';
  if (Number.isNaN(Number(form.insurancePremium)) || Number(form.insurancePremium) < 0) {
    return 'Premium must be a valid number.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expiryDate.trim())) {
    return 'Select a valid expiry date.';
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return 'Email address looks invalid.';
  }
  return null;
}

function findCountryByCurrencyCode(currencyCode: string) {
  return africanCountries.find((country) => country.currencyCode === currencyCode.trim().toUpperCase()) ?? null;
}

const currencyCountryOptions = africanCountries
  .map((country) => ({
    label: `${country.flag} ${country.name} • ${country.currencyCode}`,
    value: country.name,
  }))
  .sort((left, right) => left.value.localeCompare(right.value));

export default function CoverFormScreen() {
  const { session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string | string[]; mode?: string | string[] }>();
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const rawCoverId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isEditMode = rawMode === 'edit';
  const coverId = rawCoverId ?? null;

  const [form, setForm] = useState<CoverForm>(INITIAL_FORM);
  const [touched, setTouched] = useState<CoverTouched>(INITIAL_TOUCHED);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCover, setLoadingCover] = useState(isEditMode);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [currencyCountry, setCurrencyCountry] = useState('');
  const [pickerMonth, setPickerMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [infoModal, setInfoModal] = useState<InfoModalState>({
    eyebrow: '',
    message: '',
    title: '',
    visible: false,
  });

  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();

  const formErrors = useMemo(
    () => ({
      country: !currencyCountry ? 'Select a country to autofill currency.' : '',
      customerIdentifier: !form.customerIdentifier.trim() ? 'Customer name is required.' : '',
      cycle: !form.cycle ? 'Select a billing cycle.' : '',
      email:
        form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
          ? 'Email address looks invalid.'
          : '',
      expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(form.expiryDate.trim())
        ? ''
        : 'Select a valid expiry date.',
      insurancePremium:
        !form.insurancePremium.trim()
          ? 'Premium is required.'
          : Number.isNaN(Number(form.insurancePremium)) || Number(form.insurancePremium) < 0
            ? 'Premium must be a valid number.'
            : '',
      insuranceProduct: !form.insuranceProduct.trim() ? 'Insurance product is required.' : '',
      insuranceProvider: !form.insuranceProvider.trim() ? 'Insurance provider is required.' : '',
    }),
    [currencyCountry, form]
  );

  const canSubmitForm = useMemo(() => Object.values(formErrors).every((value) => !value), [formErrors]);

  useEffect(() => {
    const accessToken: string | null = session?.accessToken ?? null;

    if (!isEditMode || !coverId || !accessToken) {
      setLoadingCover(false);
      return;
    }

    let active = true;

    async function loadCover() {
      setLoadingCover(true);

      try {
        const cover = await getCoverById(accessToken!, coverId!);

        if (!active) {
          return;
        }

        setForm({
          allowPushNotif: cover.allowPushNotif,
          currency: cover.currency,
          customerIdentifier: cover.customerIdentifier,
          cycle: cover.cycle,
          email: cover.email ?? '',
          expiryDate: cover.expiryDate,
          insurancePremium: String(cover.insurancePremium),
          insuranceProduct: cover.insuranceProduct,
          insuranceProvider: cover.insuranceProvider,
          phone: cover.phone ?? '',
          policyNumber: cover.policyNumber ?? '',
          vehicleReg: cover.vehicleReg ?? '',
        });
        setCurrencyCountry(findCountryByCurrencyCode(cover.currency)?.name ?? '');
      } catch (error) {
        if (!active) {
          return;
        }

        if (!(error instanceof UnauthorizedError)) {
          showToast(error instanceof Error ? error.message : 'Unable to load cover details.', 'error');
          setInfoModal({
            eyebrow: 'Cover editor',
            message: error instanceof Error ? error.message : 'Unable to load cover details.',
            title: 'Edit cover unavailable',
            visible: true,
          });
        }
      } finally {
        if (active) {
          setLoadingCover(false);
        }
      }
    }

    loadCover();

    return () => {
      active = false;
    };
  }, [coverId, isEditMode, session?.accessToken, showToast]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  if (isEditMode && !coverId) {
    return <Redirect href="/covers" />;
  }

  function closeEditor() {
    router.replace('/covers');
  }

  function updateForm<K extends keyof CoverForm>(key: K, value: CoverForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function markTouched(field: keyof CoverTouched) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function getFieldError(field: keyof CoverTouched) {
    return touched[field] ? formErrors[field] : '';
  }

  const selectedCurrencyCountry =
    africanCountries.find((country) => country.name === currencyCountry) ?? null;

  function handleCurrencyCountrySelect(value: string) {
    const country = africanCountries.find((option) => option.name === value);
    setCurrencyCountry(value);
    markTouched('country');

    if (country) {
      updateForm('currency', country.currencyCode);
    }
  }

  function openDatePicker() {
    const source = form.expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(form.expiryDate)
      ? new Date(`${form.expiryDate}T00:00:00`)
      : new Date();
    setPickerMonth(new Date(source.getFullYear(), source.getMonth(), 1));
    setDatePickerOpen(true);
    markTouched('expiryDate');
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }

    if (!canSubmitForm) {
      setTouched({
        country: true,
        customerIdentifier: true,
        cycle: true,
        email: true,
        expiryDate: true,
        insurancePremium: true,
        insuranceProduct: true,
        insuranceProvider: true,
      });
      return;
    }

    const validationMessage = validateCreateForm(form);

    if (validationMessage) {
      showToast(validationMessage, 'error');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        allowPushNotif: form.allowPushNotif,
        currency: form.currency.trim().toUpperCase() || 'KES',
        customerIdentifier: form.customerIdentifier.trim(),
        cycle: form.cycle,
        email: form.email.trim() || undefined,
        expiryDate: form.expiryDate.trim(),
        insurancePremium: Number(form.insurancePremium),
        insuranceProduct: form.insuranceProduct.trim(),
        insuranceProvider: form.insuranceProvider.trim(),
        phone: form.phone.trim() || undefined,
        policyNumber: form.policyNumber.trim() || undefined,
        vehicleReg: form.vehicleReg.trim() || undefined,
      };

      if (isEditMode && coverId) {
        await updateCover(session.accessToken, coverId, payload);
      } else {
        await createCover(session.accessToken, payload);
      }

      showToast(isEditMode ? 'Cover updated successfully.' : 'Cover created successfully.');
      router.replace('/covers');
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        const message = error instanceof Error ? error.message : 'Unable to save cover.';
        showToast(message, 'error');
        setInfoModal({
          eyebrow: isEditMode ? 'Update failed' : 'Create failed',
          message,
          title: isEditMode ? 'Cover update failed' : 'Cover creation failed',
          visible: true,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        onBackPress={closeEditor}
        onNotificationPress={() =>
          setInfoModal({
            eyebrow: 'Notifications',
            message: 'Cover reminders and alerts are available from the main covers screen.',
            title: 'Notifications',
            visible: true,
          })
        }
        onProfilePress={() => router.push('/profile')}
        profileImageUrl={session.profileImageUrl}
        title={isEditMode ? 'Edit Cover' : 'Add Cover'}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{isEditMode ? 'Update Cover' : 'Create Cover'}</Text>
          <Text style={styles.heroBody}>
            {isEditMode
              ? 'Update the policy details below to keep this cover record accurate.'
              : 'Enter the policy details below to create a new cover record.'}
          </Text>
        </View>

        <View style={styles.contentWrap}>
          {loadingCover ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={palette.primary} size="small" />
              <Text style={styles.loadingText}>Loading cover details...</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Customer Details</Text>
                <View style={styles.formStack}>
                  <AuthTextField
                    autoCapitalize="words"
                    error={getFieldError('customerIdentifier')}
                    icon="person-outline"
                    label="Customer Identifier"
                    placeholder="Customer name or reference"
                    value={form.customerIdentifier}
                    onBlur={() => markTouched('customerIdentifier')}
                    onChangeText={(value) => updateForm('customerIdentifier', value)}
                  />
                  <AuthTextField
                    error={getFieldError('email')}
                    icon="mail-outline"
                    keyboardType="email-address"
                    label="Email"
                    optionalLabel="(Optional)"
                    placeholder="customer@example.com"
                    value={form.email}
                    onBlur={() => markTouched('email')}
                    onChangeText={(value) => updateForm('email', value)}
                  />
                  <AuthTextField
                    icon="phone"
                    keyboardType="phone-pad"
                    label="Phone"
                    optionalLabel="(Optional)"
                    placeholder="+254700000000"
                    value={form.phone}
                    onChangeText={(value) => updateForm('phone', value)}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Cover Details</Text>
                <View style={styles.formStack}>
                  <AuthTextField
                    autoCapitalize="words"
                    error={getFieldError('insuranceProvider')}
                    icon="business"
                    label="Insurance Provider"
                    placeholder="APA Insurance"
                    value={form.insuranceProvider}
                    onBlur={() => markTouched('insuranceProvider')}
                    onChangeText={(value) => updateForm('insuranceProvider', value)}
                  />
                  <AuthTextField
                    autoCapitalize="words"
                    error={getFieldError('insuranceProduct')}
                    icon="shield"
                    label="Insurance Product"
                    placeholder="Motor Comprehensive"
                    value={form.insuranceProduct}
                    onBlur={() => markTouched('insuranceProduct')}
                    onChangeText={(value) => updateForm('insuranceProduct', value)}
                  />
                  <AuthTextField
                    autoCapitalize="characters"
                    icon="directions-car"
                    label="Vehicle reg"
                    optionalLabel="(Optional)"
                    placeholder="KDA 123A"
                    value={form.vehicleReg}
                    onChangeText={(value) => updateForm('vehicleReg', value)}
                  />
                  <AuthTextField
                    autoCapitalize="characters"
                    icon="badge"
                    label="Policy number"
                    optionalLabel="(Optional)"
                    placeholder="POL-001"
                    value={form.policyNumber}
                    onChangeText={(value) => updateForm('policyNumber', value)}
                  />
                  <AuthSearchSelectField
                    error={getFieldError('country')}
                    label="Currency Country"
                    options={currencyCountryOptions}
                    placeholder="Select country"
                    searchPlaceholder="Search country"
                    value={currencyCountry}
                    onSelect={handleCurrencyCountrySelect}
                  />
                  <AuthTextField
                    autoCapitalize="characters"
                    icon="payments"
                    label={`${selectedCurrencyCountry?.flag ?? ''}${selectedCurrencyCountry ? ' ' : ''}Currency`}
                    placeholder="KES"
                    value={form.currency}
                    onChangeText={(value) => {
                      const nextValue = value.toUpperCase();
                      updateForm('currency', nextValue);
                      setCurrencyCountry(findCountryByCurrencyCode(nextValue)?.name ?? '');
                    }}
                  />
                  <AuthTextField
                    error={getFieldError('insurancePremium')}
                    icon="attach-money"
                    keyboardType="numeric"
                    label="Premium"
                    placeholder="15000"
                    value={form.insurancePremium}
                    onBlur={() => markTouched('insurancePremium')}
                    onChangeText={(value) => updateForm('insurancePremium', value)}
                  />
                  <AuthTextField
                    autoCapitalize="characters"
                    error={getFieldError('expiryDate')}
                    icon="event"
                    label="Expiry date"
                    placeholder="31 December 2026"
                    showSoftInputOnFocus={false}
                    value={form.expiryDate ? formatReadableDate(form.expiryDate) : ''}
                    onFocus={openDatePicker}
                  />
                  <AuthSelectField
                    error={getFieldError('cycle')}
                    label="Payment Cycle"
                    options={[
                      { label: 'Monthly', value: 'MONTHLY' },
                      { label: 'Annual', value: 'ANNUAL' },
                    ]}
                    placeholder="Select cycle"
                    value={form.cycle}
                    onSelect={(value) => {
                      updateForm('cycle', value as CoverCycle);
                      markTouched('cycle');
                    }}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <Pressable style={styles.switchRow} onPress={() => updateForm('allowPushNotif', !form.allowPushNotif)}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchTitle}>Allow notifications</Text>
                    <Text style={styles.switchSubtitle}>Keep reminder notifications enabled for this cover.</Text>
                  </View>
                  <View style={[styles.switchPill, form.allowPushNotif ? styles.switchPillActive : null]}>
                    <View
                      style={[
                        styles.switchThumb,
                        form.allowPushNotif ? styles.switchThumbActive : null,
                      ]}
                    />
                  </View>
                </Pressable>
              </View>

              <View style={styles.actionCard}>
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionButton, styles.actionButtonSecondary, submitting ? styles.actionButtonDisabled : null]}
                    disabled={submitting}
                    onPress={closeEditor}>
                    <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, (!canSubmitForm || submitting) ? styles.actionButtonDisabled : null]}
                    disabled={!canSubmitForm || submitting}
                    onPress={handleSubmit}>
                    {submitting ? (
                      <ActivityIndicator color={palette.onPrimary} size="small" />
                    ) : (
                      <Text style={styles.actionButtonText}>{isEditMode ? 'Save Changes' : 'Create Cover'}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </FloatingPageShell>

      <AppModal
        footer={
          <View style={styles.modalFooter}>
            <Pressable style={[styles.modalButton, styles.modalButtonOutline]} onPress={() => setDatePickerOpen(false)}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
            </Pressable>
          </View>
        }
        frameStyle={styles.dateModalFrame}
        title="Select expiry date"
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}>
        <View style={styles.calendarHeader}>
          <Pressable
            style={styles.calendarNavButton}
            onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
            <MaterialIcons color={palette.primary} name="chevron-left" size={22} />
          </Pressable>
          <Text style={styles.calendarTitle}>
            {pickerMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable
            style={styles.calendarNavButton}
            onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
            <MaterialIcons color={palette.primary} name="chevron-right" size={22} />
          </Pressable>
        </View>

        <View style={styles.calendarWeekdays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.calendarWeekday}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {buildCalendarDays(pickerMonth).map((day, index) => {
            const iso = day ? formatDateIso(day) : null;
            const selected = iso === form.expiryDate;
            const tomorrow = new Date();
            tomorrow.setHours(0, 0, 0, 0);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const isPast = day ? day < tomorrow : false;
            const isDisabled = !day || isPast;

            return (
              <Pressable
                key={iso ?? `empty-${index}`}
                disabled={isDisabled}
                style={[
                  styles.calendarDay,
                  !day ? styles.calendarDayEmpty : null,
                  isPast ? styles.calendarDayPast : null,
                  selected ? styles.calendarDaySelected : null,
                ]}
                onPress={() => {
                  updateForm('expiryDate', formatDateIso(day!));
                  setDatePickerOpen(false);
                }}>
                <Text
                  style={[
                    styles.calendarDayText,
                    !day ? styles.calendarDayTextEmpty : null,
                    isPast ? styles.calendarDayTextPast : null,
                    selected ? styles.calendarDayTextSelected : null,
                  ]}>
                  {day ? day.getDate() : 0}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppModal>

      <AppMessageModal
        eyebrow={infoModal.eyebrow}
        message={infoModal.message}
        title={infoModal.title}
        visible={infoModal.visible}
        onClose={() =>
          setInfoModal((current) => ({
            ...current,
            visible: false,
          }))
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    flex: 1,
    height: 50,
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderColor: palette.outlineVariant,
    borderWidth: 1,
  },
  actionButtonText: {
    color: palette.onPrimary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: palette.onSurface,
  },
  actionCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.xs,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  calendarDay: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radius.md,
    justifyContent: 'center',
    width: '13.3%',
  },
  calendarDayEmpty: {
    opacity: 0,
  },
  calendarDayPast: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: palette.primary,
  },
  calendarDayText: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  calendarDayTextEmpty: {
    color: 'transparent',
  },
  calendarDayTextPast: {
    color: palette.onSurfaceVariant,
  },
  calendarDayTextSelected: {
    color: palette.onPrimary,
  },
  calendarGrid: {
    columnGap: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xs,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarNavButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  calendarTitle: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  calendarWeekday: {
    color: palette.onSurfaceVariant,
    flex: 1,
    fontSize: typography.label,
    fontWeight: '700',
    textAlign: 'center',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  contentWrap: {
    gap: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
  },
  dateModalFrame: {
    maxHeight: '56%',
    maxWidth: 420,
  },
  formStack: {
    gap: spacing.md,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: typography.body,
    maxWidth: '88%',
  },
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
  loadingCard: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  modalButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
  },
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
  modalButtonTextOutline: {
    color: palette.onSurface,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  sectionTitle: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  switchPill: {
    backgroundColor: palette.surfaceContainerHigh,
    borderRadius: radius.pill,
    height: 30,
    paddingHorizontal: 3,
    width: 52,
  },
  switchPillActive: {
    backgroundColor: 'rgba(0,92,171,0.18)',
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(192, 199, 214, 0.55)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  switchSubtitle: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  switchThumb: {
    backgroundColor: palette.white,
    borderRadius: radius.pill,
    height: 24,
    marginTop: 3,
    transform: [{ translateX: 0 }],
    width: 24,
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  switchTitle: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
});
