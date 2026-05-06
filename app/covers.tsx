import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppModal } from '@/components/app/app-modal';
import { FloatingBottomNav } from '@/components/app/floating-bottom-nav';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { AuthTextField } from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import { type CoverRecord, createCover, deleteCover, getCoverById, getCovers, updateCover } from '@/features/covers/covers-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

const iconToneStyles = StyleSheet.create({
  neutral: { backgroundColor: 'rgba(230, 232, 234, 0.6)' },
  primary: { backgroundColor: 'rgba(0, 92, 171, 0.1)' },
  secondary: { backgroundColor: 'rgba(207, 225, 248, 0.35)' },
  tertiary: { backgroundColor: 'rgba(181, 28, 0, 0.1)' },
});

const iconToneColors = {
  neutral: palette.outline,
  primary: palette.primary,
  secondary: palette.onSecondaryContainer,
  tertiary: palette.tertiary,
};

type CoverStatus = 'ACTIVE' | 'DUE' | 'LAPSED';

type CoverSummaryCard = {
  count: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: 'primary' | 'secondary' | 'tertiary' | 'neutral';
  label: string;
  title: string;
};

type CoverListItem = {
  dueDate: string;
  id: string;
  provider: string;
  status: CoverStatus;
  title: string;
  type: string;
};

type CoverNotificationItem = {
  dateLabel: string;
  daysLabel: string;
  id: string;
  provider: string;
  title: string;
  type: string;
};

type CreateCoverForm = {
  allowPushNotif: boolean;
  currency: string;
  customerIdentifier: string;
  cycle: 'MONTHLY' | 'ANNUAL';
  email: string;
  expiryDate: string;
  insurancePremium: string;
  insuranceProduct: string;
  insuranceProvider: string;
  phone: string;
  policyNumber: string;
  vehicleReg: string;
};

type CreateCoverTouched = {
  customerIdentifier: boolean;
  cycle: boolean;
  email: boolean;
  expiryDate: boolean;
  insurancePremium: boolean;
  insuranceProduct: boolean;
  insuranceProvider: boolean;
};

const INITIAL_FORM: CreateCoverForm = {
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

const INITIAL_TOUCHED: CreateCoverTouched = {
  customerIdentifier: false,
  cycle: false,
  email: false,
  expiryDate: false,
  insurancePremium: false,
  insuranceProduct: false,
  insuranceProvider: false,
};

const EXPIRY_NOTICE_DAYS = 14;
const MONTHLY_DUE_NOTICE_DAYS = 5;

function formatLongDate(dateValue: string | null) {
  if (!dateValue) {
    return 'No due date';
  }

  const parsed = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function formatDateIso(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function daysUntil(dateValue: string | null) {
  if (!dateValue) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${dateValue}T00:00:00`);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function getCoverStatus(cover: CoverRecord): CoverStatus {
  if (daysUntil(cover.expiryDate) < 0) {
    return 'LAPSED';
  }

  const targetDate = cover.cycle === 'MONTHLY' ? cover.nextDueDate ?? cover.expiryDate : cover.expiryDate;
  return daysUntil(targetDate) <= 7 ? 'DUE' : 'ACTIVE';
}

function mapCoverToListItem(cover: CoverRecord): CoverListItem {
  const targetDate = cover.cycle === 'MONTHLY' ? cover.nextDueDate ?? cover.expiryDate : cover.expiryDate;

  return {
    dueDate: formatLongDate(targetDate),
    id: cover.id,
    provider: cover.insuranceProvider,
    status: getCoverStatus(cover),
    title: cover.customerIdentifier,
    type: cover.insuranceProduct,
  };
}

function buildSummaryCards(covers: CoverRecord[]): CoverSummaryCard[] {
  const counts = covers.reduce(
    (summary, cover) => {
      const status = getCoverStatus(cover);
      summary.total += 1;
      summary[status] += 1;
      return summary;
    },
    { ACTIVE: 0, DUE: 0, LAPSED: 0, total: 0 }
  );

  return [
    {
      count: String(counts.total),
      icon: 'shield',
      iconTone: 'primary',
      label: 'All Policies',
      title: 'Total',
    },
    {
      count: String(counts.ACTIVE),
      icon: 'verified-user',
      iconTone: 'secondary',
      label: 'Protected',
      title: 'Active',
    },
    {
      count: String(counts.DUE),
      icon: 'event',
      iconTone: 'tertiary',
      label: 'Renewals',
      title: 'Due',
    },
    {
      count: String(counts.LAPSED),
      icon: 'gpp-bad',
      iconTone: 'neutral',
      label: 'Needs Attention',
      title: 'Lapsed',
    },
  ];
}

function validateCreateForm(form: CreateCoverForm) {
  if (!form.customerIdentifier.trim()) return 'Customer name is required.';
  if (!form.insuranceProvider.trim()) return 'Insurance provider is required.';
  if (!form.insuranceProduct.trim()) return 'Insurance product is required.';
  if (!form.insurancePremium.trim()) return 'Premium is required.';
  if (Number.isNaN(Number(form.insurancePremium)) || Number(form.insurancePremium) < 0) {
    return 'Premium must be a valid number.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expiryDate.trim())) {
    return 'Expiry date must use YYYY-MM-DD.';
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return 'Email address looks invalid.';
  }
  return null;
}

function buildCoverNotificationItem(
  cover: CoverRecord,
  targetDate: string,
  kind: 'cycle' | 'expiry'
): CoverNotificationItem {
  const remainingDays = daysUntil(targetDate);

  return {
    dateLabel: formatLongDate(targetDate),
    daysLabel:
      remainingDays === 0
        ? kind === 'cycle'
          ? 'Due today'
          : 'Expires today'
        : remainingDays === 1
          ? kind === 'cycle'
            ? 'Due in 1 day'
            : 'Expires in 1 day'
          : kind === 'cycle'
            ? `Due in ${remainingDays} days`
            : `Expires in ${remainingDays} days`,
    id: cover.id,
    provider: cover.insuranceProvider,
    title: cover.customerIdentifier,
    type: cover.insuranceProduct,
  };
}

export default function CoversScreen() {
  const { logout, session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [covers, setCovers] = useState<CoverRecord[]>([]);
  const [coverForm, setCoverForm] = useState<CreateCoverForm>(INITIAL_FORM);
  const [coverTouched, setCoverTouched] = useState<CreateCoverTouched>(INITIAL_TOUCHED);
  const [coversLoading, setCoversLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [cyclePickerOpen, setCyclePickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [coverActionMenuOpen, setCoverActionMenuOpen] = useState(false);
  const [coverViewOpen, setCoverViewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [coverDetailLoading, setCoverDetailLoading] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
  const [selectedCoverDetail, setSelectedCoverDetail] = useState<CoverRecord | null>(null);
  const [pickerMonth, setPickerMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const { width } = useWindowDimensions();
  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();
  const cardWidth = (width - spacing.marginMobile * 2 - spacing.md) / 2;
  const listItems = useMemo(() => covers.map(mapCoverToListItem), [covers]);
  const coverSummaryCards = useMemo(() => buildSummaryCards(covers), [covers]);
  const dueSoonCount = useMemo(() => covers.filter((cover) => getCoverStatus(cover) === 'DUE').length, [covers]);
  const cycleDueNotifications = useMemo(
    () =>
      covers
        .filter((cover) => {
          if (cover.cycle !== 'MONTHLY' || !cover.nextDueDate) {
            return false;
          }

          const days = daysUntil(cover.nextDueDate);
          return days >= 0 && days <= MONTHLY_DUE_NOTICE_DAYS;
        })
        .sort((left, right) => daysUntil(left.nextDueDate) - daysUntil(right.nextDueDate))
        .map((cover) => buildCoverNotificationItem(cover, cover.nextDueDate as string, 'cycle')),
    [covers]
  );
  const expiryNotifications = useMemo(
    () =>
      covers
        .filter((cover) => {
          const days = daysUntil(cover.expiryDate);
          return days >= 0 && days <= EXPIRY_NOTICE_DAYS;
        })
        .sort((left, right) => daysUntil(left.expiryDate) - daysUntil(right.expiryDate))
        .map((cover) => buildCoverNotificationItem(cover, cover.expiryDate, 'expiry')),
    [covers]
  );
  const totalNotificationCount = cycleDueNotifications.length + expiryNotifications.length;
  const formErrors = useMemo(
    () => ({
      customerIdentifier: !coverForm.customerIdentifier.trim() ? 'Customer name is required.' : '',
      cycle: !coverForm.cycle ? 'Select a billing cycle.' : '',
      email:
        coverForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coverForm.email.trim())
          ? 'Email address looks invalid.'
          : '',
      expiryDate: /^\d{4}-\d{2}-\d{2}$/.test(coverForm.expiryDate.trim())
        ? ''
        : 'Expiry date must use YYYY-MM-DD.',
      insurancePremium:
        !coverForm.insurancePremium.trim()
          ? 'Premium is required.'
          : Number.isNaN(Number(coverForm.insurancePremium)) || Number(coverForm.insurancePremium) < 0
            ? 'Premium must be a valid number.'
            : '',
      insuranceProduct: !coverForm.insuranceProduct.trim() ? 'Insurance product is required.' : '',
      insuranceProvider: !coverForm.insuranceProvider.trim() ? 'Insurance provider is required.' : '',
    }),
    [coverForm]
  );
  const canSubmitForm = useMemo(() => Object.values(formErrors).every((value) => !value), [formErrors]);

  const loadCovers = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session?.accessToken) {
        return;
      }

      const silent = options?.silent ?? false;
      if (!silent) {
        setCoversLoading(true);
      }

      try {
        const records = await getCovers(session.accessToken);
        setCovers(records);
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) {
          showToast(error instanceof Error ? error.message : 'Unable to load covers.', 'error');
        }
      } finally {
        if (!silent) {
          setCoversLoading(false);
        }
      }
    },
    [session?.accessToken, showToast]
  );

  useFocusEffect(
    useCallback(() => {
      if (!session?.accessToken) {
        setCovers([]);
        setCoversLoading(false);
        return;
      }

      loadCovers();
    }, [loadCovers, session?.accessToken])
  );

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  function updateForm<K extends keyof CreateCoverForm>(key: K, value: CreateCoverForm[K]) {
    setCoverForm((current) => ({ ...current, [key]: value }));
  }

  function markTouched(field: keyof CreateCoverTouched) {
    setCoverTouched((current) => ({ ...current, [field]: true }));
  }

  function getFieldError(field: keyof CreateCoverTouched) {
    return coverTouched[field] ? formErrors[field] : '';
  }

  function openDatePicker() {
    const source = coverForm.expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(coverForm.expiryDate)
      ? new Date(`${coverForm.expiryDate}T00:00:00`)
      : new Date();
    setPickerMonth(new Date(source.getFullYear(), source.getMonth(), 1));
    setDatePickerOpen(true);
    markTouched('expiryDate');
  }

  function populateFormFromCover(cover: CoverRecord) {
    setCoverForm({
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
    setCoverTouched(INITIAL_TOUCHED);
  }

  async function fetchCoverDetail(coverId: string) {
    if (!session?.accessToken) {
      return null;
    }

    setCoverDetailLoading(true);

    try {
      const cover = await getCoverById(session.accessToken, coverId);
      setSelectedCoverDetail(cover);
      return cover;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to load cover details.', 'error');
      }
      return null;
    } finally {
      setCoverDetailLoading(false);
    }
  }

  function handleBottomNavPress(key: string) {
    if (key === 'home') {
      router.replace('/dashboard');
      return;
    }

    if (key === 'covers') {
      return;
    }

    if (key === 'more') {
      setMoreMenuOpen((current) => !current);
      return;
    }

    setMoreMenuOpen(false);
    Alert.alert(key === 'tasks' ? 'Tasks' : 'Contracts', 'This workspace can be connected next.');
  }

  function handleLogout() {
    setMoreMenuOpen(false);
    logout({ animated: true, redirectToLogin: true });
  }

  function handleOpenCreate() {
    setEditorMode('create');
    setSelectedCoverId(null);
    setSelectedCoverDetail(null);
    setCoverForm(INITIAL_FORM);
    setCoverTouched(INITIAL_TOUCHED);
    setCreateModalOpen(true);
  }

  function handleCoverPress(coverId: string) {
    setSelectedCoverId(coverId);
    setCoverActionMenuOpen(true);
  }

  async function handleViewCover() {
    if (!selectedCoverId) {
      return;
    }

    setCoverActionMenuOpen(false);
    const cover = await fetchCoverDetail(selectedCoverId);

    if (cover) {
      setCoverViewOpen(true);
    }
  }

  async function handleEditCover() {
    if (!selectedCoverId) {
      return;
    }

    setCoverActionMenuOpen(false);
    const cover = await fetchCoverDetail(selectedCoverId);

    if (cover) {
      populateFormFromCover(cover);
      setEditorMode('edit');
      setCreateModalOpen(true);
    }
  }

  function handleDeletePrompt() {
    setCoverActionMenuOpen(false);
    setDeleteConfirmOpen(true);
  }

  async function handleCreateCover() {
    if (!canSubmitForm) {
      setCoverTouched({
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

    const validationMessage = validateCreateForm(coverForm);

    if (validationMessage) {
      showToast(validationMessage, 'error');
      return;
    }

    setCreateSubmitting(true);

    try {
      const payload = {
        allowPushNotif: coverForm.allowPushNotif,
        currency: coverForm.currency.trim().toUpperCase() || 'KES',
        customerIdentifier: coverForm.customerIdentifier.trim(),
        cycle: coverForm.cycle,
        email: coverForm.email.trim() || undefined,
        expiryDate: coverForm.expiryDate.trim(),
        insurancePremium: Number(coverForm.insurancePremium),
        insuranceProduct: coverForm.insuranceProduct.trim(),
        insuranceProvider: coverForm.insuranceProvider.trim(),
        phone: coverForm.phone.trim() || undefined,
        policyNumber: coverForm.policyNumber.trim() || undefined,
        vehicleReg: coverForm.vehicleReg.trim() || undefined,
      };

      const savedCover =
        editorMode === 'edit' && selectedCoverId
          ? await updateCover(session.accessToken, selectedCoverId, payload)
          : await createCover(session.accessToken, payload);

      setCreateModalOpen(false);
      setSelectedCoverDetail(savedCover);
      setCoverForm(INITIAL_FORM);
      setCoverTouched(INITIAL_TOUCHED);
      showToast(editorMode === 'edit' ? 'Cover updated successfully.' : 'Cover created successfully.');
      await loadCovers({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to create cover.', 'error');
      }
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleDeleteCover() {
    if (!selectedCoverId || !session?.accessToken) {
      return;
    }

    setDeleteSubmitting(true);

    try {
      await deleteCover(session.accessToken, selectedCoverId);
      setDeleteConfirmOpen(false);
      setSelectedCoverId(null);
      setSelectedCoverDetail(null);
      showToast('Cover deleted successfully.');
      await loadCovers({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to delete cover.', 'error');
      }
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        bottomSlot={<FloatingBottomNav activeKey={moreMenuOpen ? 'more' : 'covers'} onPress={handleBottomNavPress} />}
        onBackPress={() => router.replace('/dashboard')}
        onNotificationPress={() => setNotificationsOpen(true)}
        onProfilePress={() => Alert.alert('Account', `Signed in as ${session.email}`)}
        profileImageUrl={session.profileImageUrl}
        scrollViewProps={{ onScrollBeginDrag: () => setMoreMenuOpen(false) }}
        title="Covers">
        <View style={styles.heroSection}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Covers Overview</Text>
              <Text style={styles.heroBody}>
                Track live policies, renewal dates, and new customer covers from the backend.
              </Text>
            </View>
            <Pressable style={styles.addButton} onPress={handleOpenCreate}>
              <MaterialIcons color={palette.white} name="add" size={18} />
              <Text style={styles.addButtonText}>Add cover</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {coverSummaryCards.map((card) => (
            <Pressable
              key={card.title}
              style={[styles.summaryCard, { width: cardWidth }]}
              onPress={() => Alert.alert(card.title, `${card.title} covers detail can be connected next.`)}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIconWrap, iconToneStyles[card.iconTone]]}>
                  <MaterialIcons color={iconToneColors[card.iconTone]} name={card.icon} size={26} />
                </View>
                <Text style={styles.summaryCount}>{card.count}</Text>
              </View>
              <Text style={styles.summaryLabel}>{card.label}</Text>
              <Text style={styles.summaryTitle}>{card.title}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Covers List</Text>
            <Text style={styles.sectionCount}>{listItems.length} records</Text>
          </View>
          <View style={styles.listCard}>
            {listItems.length ? (
              listItems.map((cover, index) => (
                <Pressable
                  key={cover.id}
                  style={[styles.coverRow, index < listItems.length - 1 ? styles.coverRowBorder : null]}
                  onPress={() => handleCoverPress(cover.id)}>
                  <View style={styles.coverRowLeft}>
                    <View
                      style={[
                        styles.coverStatusDot,
                        cover.status === 'ACTIVE'
                          ? styles.coverStatusDotActive
                          : cover.status === 'DUE'
                            ? styles.coverStatusDotDue
                            : styles.coverStatusDotLapsed,
                      ]}
                    />
                    <View style={styles.coverCopy}>
                      <Text style={styles.coverTitle}>{cover.title}</Text>
                      <Text style={styles.coverMeta}>
                        {cover.provider} • {cover.type}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.coverRight}>
                    <Text style={styles.coverDueDate}>{cover.dueDate}</Text>
                    <View
                      style={[
                        styles.coverStatusPill,
                        cover.status === 'ACTIVE'
                          ? styles.coverStatusPillActive
                          : cover.status === 'DUE'
                            ? styles.coverStatusPillDue
                            : styles.coverStatusPillLapsed,
                      ]}>
                      <Text style={styles.coverStatusText}>{cover.status}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : coversLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={palette.primary} size="small" />
                <Text style={styles.emptyStateTitle}>Loading covers...</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons color={palette.outline} name="shield" size={28} />
                <Text style={styles.emptyStateTitle}>No covers yet</Text>
                <Text style={styles.emptyStateBody}>Create your first cover record to start tracking renewals.</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.promoCard}>
          <View style={styles.promoCopy}>
            <Text style={styles.promoTitle}>Renewal Readiness</Text>
            <Text style={styles.promoBody}>
              {dueSoonCount
                ? `You have ${dueSoonCount} cover${dueSoonCount === 1 ? '' : 's'} due soon. Reach out early to improve renewal conversion.`
                : 'No covers are currently due soon. New records will show up here as renewals approach.'}
            </Text>
          </View>
          <MaterialIcons color="rgba(255,255,255,0.2)" name="shield" size={120} style={styles.promoIcon} />
        </View>
      </FloatingPageShell>

      <AppModal
        footer={
          <Pressable style={[styles.modalButton, styles.modalButtonOutline]} onPress={() => setCoverActionMenuOpen(false)}>
            <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
          </Pressable>
        }
        frameStyle={styles.actionMenuFrame}
        title="Cover actions"
        visible={coverActionMenuOpen}
        onClose={() => setCoverActionMenuOpen(false)}>
        <View style={styles.actionMenuList}>
          <Pressable style={styles.actionMenuItem} onPress={handleViewCover}>
            <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
              <MaterialIcons color={palette.primary} name="visibility" size={18} />
            </View>
            <View style={styles.actionMenuCopy}>
              <Text style={styles.actionMenuTitle}>View</Text>
              <Text style={styles.actionMenuBody}>Open full cover details</Text>
            </View>
          </Pressable>
          <Pressable style={styles.actionMenuItem} onPress={handleEditCover}>
            <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
              <MaterialIcons color={palette.primary} name="edit" size={18} />
            </View>
            <View style={styles.actionMenuCopy}>
              <Text style={styles.actionMenuTitle}>Edit</Text>
              <Text style={styles.actionMenuBody}>Update this cover record</Text>
            </View>
          </Pressable>
          <Pressable style={styles.actionMenuItem} onPress={handleDeletePrompt}>
            <View style={[styles.actionMenuIconWrap, styles.actionMenuIconDanger]}>
              <MaterialIcons color={palette.error} name="delete-outline" size={18} />
            </View>
            <View style={styles.actionMenuCopy}>
              <Text style={styles.actionMenuTitle}>Delete</Text>
              <Text style={styles.actionMenuBody}>Remove this cover permanently</Text>
            </View>
          </Pressable>
        </View>
      </AppModal>

      <AppModal
        footer={
          <Pressable style={styles.modalButton} onPress={() => setCoverViewOpen(false)}>
            <Text style={styles.modalButtonText}>Close</Text>
          </Pressable>
        }
        frameStyle={styles.viewModalFrame}
        title="Cover details"
        visible={coverViewOpen}
        onClose={() => setCoverViewOpen(false)}>
        {coverDetailLoading ? (
          <View style={styles.modalLoadingState}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.modalLoadingText}>Loading cover details...</Text>
          </View>
        ) : selectedCoverDetail ? (
          <View style={styles.detailList}>
            <View style={styles.detailHeaderCard}>
              <View style={[styles.notificationIconWrap, styles.notificationIconWrapPrimary]}>
                <MaterialIcons color={palette.primary} name="shield" size={20} />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailHeaderTitle}>{selectedCoverDetail.customerIdentifier}</Text>
                <Text style={styles.detailHeaderMeta}>
                  {selectedCoverDetail.insuranceProvider} • {selectedCoverDetail.insuranceProduct}
                </Text>
              </View>
              <View
                style={[
                  styles.coverStatusPill,
                  getCoverStatus(selectedCoverDetail) === 'ACTIVE'
                    ? styles.coverStatusPillActive
                    : getCoverStatus(selectedCoverDetail) === 'DUE'
                      ? styles.coverStatusPillDue
                      : styles.coverStatusPillLapsed,
                ]}>
                <Text style={styles.coverStatusText}>{getCoverStatus(selectedCoverDetail)}</Text>
              </View>
            </View>
            <DetailRow label="Customer identifier" value={selectedCoverDetail.customerIdentifier} />
            <DetailRow label="Email" value={selectedCoverDetail.email ?? 'Not provided'} />
            <DetailRow label="Phone" value={selectedCoverDetail.phone ?? 'Not provided'} />
            <DetailRow label="Provider" value={selectedCoverDetail.insuranceProvider} />
            <DetailRow label="Product" value={selectedCoverDetail.insuranceProduct} />
            <DetailRow label="Premium" value={`${selectedCoverDetail.currency} ${Number(selectedCoverDetail.insurancePremium).toLocaleString()}`} />
            <DetailRow label="Cycle" value={selectedCoverDetail.cycle} />
            <DetailRow label="Expiry date" value={formatLongDate(selectedCoverDetail.expiryDate)} />
            <DetailRow label="Next due date" value={formatLongDate(selectedCoverDetail.nextDueDate)} />
            <DetailRow label="Vehicle reg" value={selectedCoverDetail.vehicleReg ?? 'Not provided'} />
            <DetailRow label="Policy number" value={selectedCoverDetail.policyNumber ?? 'Not provided'} />
            <DetailRow label="Notifications" value={selectedCoverDetail.allowPushNotif ? 'Enabled' : 'Disabled'} />
            <DetailRow label="Created" value={new Date(selectedCoverDetail.createdAt).toLocaleString()} />
            <DetailRow label="Updated" value={new Date(selectedCoverDetail.updatedAt).toLocaleString()} />
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <Text style={styles.modalLoadingText}>No cover details available.</Text>
          </View>
        )}
      </AppModal>

      <AppModal
        footer={
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonOutline, deleteSubmitting ? styles.modalButtonDisabled : null]}
              disabled={deleteSubmitting}
              onPress={() => setDeleteConfirmOpen(false)}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.deleteButton, deleteSubmitting ? styles.modalButtonDisabled : null]}
              disabled={deleteSubmitting}
              onPress={handleDeleteCover}>
              {deleteSubmitting ? (
                <ActivityIndicator color={palette.onError} size="small" />
              ) : (
                <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Delete cover</Text>
              )}
            </Pressable>
          </View>
        }
        frameStyle={styles.deleteModalFrame}
        title="Delete cover"
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}>
        <Text style={styles.modalIntro}>
          This will permanently delete the selected cover record. You can’t undo this action.
        </Text>
      </AppModal>

      <AppModal
        eyebrow={editorMode === 'edit' ? 'Update policy' : 'New policy'}
        footer={
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonOutline, createSubmitting ? styles.modalButtonDisabled : null]}
              disabled={createSubmitting}
              onPress={() => {
                setCreateModalOpen(false);
                setCoverForm(INITIAL_FORM);
                setCoverTouched(INITIAL_TOUCHED);
              }}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, !canSubmitForm || createSubmitting ? styles.modalButtonDisabled : null]}
              disabled={!canSubmitForm || createSubmitting}
              onPress={handleCreateCover}>
              {createSubmitting ? (
                <ActivityIndicator color={palette.onPrimary} size="small" />
              ) : (
                <Text style={styles.modalButtonText}>{editorMode === 'edit' ? 'Save changes' : 'Create cover'}</Text>
              )}
            </Pressable>
          </View>
        }
        frameStyle={styles.createModalFrame}
        title={editorMode === 'edit' ? 'Edit cover' : 'Add cover'}
        visible={createModalOpen}
        onClose={() => {
          if (!createSubmitting) {
            setCreateModalOpen(false);
          }
        }}>
        <Text style={styles.modalIntro}>
          {editorMode === 'edit'
            ? 'Update the policy details below to keep this cover record accurate.'
            : 'Enter the policy details below to create a new cover record.'}
        </Text>
        <View style={styles.formStack}>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Customer Details</Text>
            <AuthTextField
              autoCapitalize="words"
              error={getFieldError('customerIdentifier')}
              icon="person-outline"
              label="Customer Identifier"
              placeholder="Customer name or reference"
              value={coverForm.customerIdentifier}
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
              value={coverForm.email}
              onBlur={() => markTouched('email')}
              onChangeText={(value) => updateForm('email', value)}
            />
            <AuthTextField
              icon="phone"
              keyboardType="phone-pad"
              label="Phone"
              optionalLabel="(Optional)"
              placeholder="+254700000000"
              value={coverForm.phone}
              onChangeText={(value) => updateForm('phone', value)}
            />
          </View>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Cover Details</Text>
            <AuthTextField
              autoCapitalize="words"
              error={getFieldError('insuranceProvider')}
              icon="business"
              label="Insurance Provider"
              placeholder="APA Insurance"
              value={coverForm.insuranceProvider}
              onBlur={() => markTouched('insuranceProvider')}
              onChangeText={(value) => updateForm('insuranceProvider', value)}
            />
            <AuthTextField
              autoCapitalize="words"
              error={getFieldError('insuranceProduct')}
              icon="shield"
              label="Insurance Product"
              placeholder="Motor Comprehensive"
              value={coverForm.insuranceProduct}
              onBlur={() => markTouched('insuranceProduct')}
              onChangeText={(value) => updateForm('insuranceProduct', value)}
            />
            <AuthTextField
              autoCapitalize="characters"
              icon="payments"
              label="Currency"
              optionalLabel="(Optional)"
              placeholder="KES"
              value={coverForm.currency}
              onChangeText={(value) => updateForm('currency', value)}
            />
            <AuthTextField
              error={getFieldError('insurancePremium')}
              icon="attach-money"
              keyboardType="numeric"
              label="Premium"
              placeholder="15000"
              value={coverForm.insurancePremium}
              onBlur={() => markTouched('insurancePremium')}
              onChangeText={(value) => updateForm('insurancePremium', value)}
            />
            <AuthTextField
              autoCapitalize="characters"
              icon="event"
              error={getFieldError('expiryDate')}
              label="Expiry date"
              placeholder="2026-12-31"
              value={coverForm.expiryDate}
              onFocus={openDatePicker}
              showSoftInputOnFocus={false}
            />
            <SelectTrigger
              error={getFieldError('cycle')}
              label="Cycle"
              value={coverForm.cycle === 'MONTHLY' ? 'Monthly' : 'Annual'}
              onPress={() => {
                setCyclePickerOpen(true);
                markTouched('cycle');
              }}
            />
            <AuthTextField
              autoCapitalize="characters"
              icon="directions-car"
              label="Vehicle reg"
              optionalLabel="(Optional)"
              placeholder="KDA 123A"
              value={coverForm.vehicleReg}
              onChangeText={(value) => updateForm('vehicleReg', value)}
            />
            <AuthTextField
              autoCapitalize="characters"
              icon="badge"
              label="Policy number"
              optionalLabel="(Optional)"
              placeholder="POL-001"
              value={coverForm.policyNumber}
              onChangeText={(value) => updateForm('policyNumber', value)}
            />
          </View>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Notifications</Text>
            <Pressable style={styles.switchRow} onPress={() => updateForm('allowPushNotif', !coverForm.allowPushNotif)}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Allow notifications</Text>
                <Text style={styles.switchSubtitle}>Keep reminder notifications enabled for this cover.</Text>
              </View>
              <View style={[styles.switchPill, coverForm.allowPushNotif ? styles.switchPillActive : null]}>
                <View
                  style={[
                    styles.switchThumb,
                    coverForm.allowPushNotif ? styles.switchThumbActive : null,
                  ]}
                />
              </View>
            </Pressable>
          </View>
        </View>
      </AppModal>

      <AppModal
        footer={
          <Pressable style={styles.modalButton} onPress={() => setNotificationsOpen(false)}>
            <Text style={styles.modalButtonText}>Close</Text>
          </Pressable>
        }
        frameStyle={styles.notificationsModalFrame}
        title="Cover notifications"
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}>
        <Text style={styles.modalIntro}>
          {totalNotificationCount
            ? `${totalNotificationCount} cover notification${totalNotificationCount === 1 ? '' : 's'} need attention.`
            : 'No cycle-due or expiry alerts right now.'}
        </Text>

        <View style={styles.modalSection}>
          <Text style={styles.modalSectionTitle}>Cycle Due</Text>
          {cycleDueNotifications.length ? (
            <View style={styles.notificationList}>
              {cycleDueNotifications.map((item, index) => (
                <View
                  key={`cycle-${item.id}`}
                  style={[styles.notificationRow, index < cycleDueNotifications.length - 1 ? styles.notificationRowBorder : null]}>
                  <View style={[styles.notificationIconWrap, styles.notificationIconWrapPrimary]}>
                    <MaterialIcons color={palette.primary} name="autorenew" size={18} />
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMeta}>{item.provider} • {item.type}</Text>
                    <Text style={styles.notificationBody}>{item.daysLabel} • {item.dateLabel}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.notificationEmpty}>
              <Text style={styles.notificationEmptyText}>No monthly cycle dues in the next 5 days.</Text>
            </View>
          )}
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.modalSectionTitle}>Expiry Due</Text>
          {expiryNotifications.length ? (
            <View style={styles.notificationList}>
              {expiryNotifications.map((item, index) => (
                <View
                  key={`expiry-${item.id}`}
                  style={[styles.notificationRow, index < expiryNotifications.length - 1 ? styles.notificationRowBorder : null]}>
                  <View style={[styles.notificationIconWrap, styles.notificationIconWrapTertiary]}>
                    <MaterialIcons color={palette.tertiary} name="event" size={18} />
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMeta}>{item.provider} • {item.type}</Text>
                    <Text style={styles.notificationBody}>{item.daysLabel} • {item.dateLabel}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.notificationEmpty}>
              <Text style={styles.notificationEmptyText}>No covers expiring in the next 14 days.</Text>
            </View>
          )}
        </View>
      </AppModal>

      <AppModal
        footer={
          <Pressable style={styles.modalButton} onPress={() => setCyclePickerOpen(false)}>
            <Text style={styles.modalButtonText}>Done</Text>
          </Pressable>
        }
        frameStyle={styles.cycleModalFrame}
        title="Select cycle"
        visible={cyclePickerOpen}
        onClose={() => setCyclePickerOpen(false)}>
        <View style={styles.cycleOptions}>
          {[
            { label: 'Monthly', value: 'MONTHLY' as const },
            { label: 'Annual', value: 'ANNUAL' as const },
          ].map((option) => (
            <Pressable
              key={option.value}
              style={[styles.cycleOption, coverForm.cycle === option.value ? styles.cycleOptionActive : null]}
              onPress={() => {
                updateForm('cycle', option.value);
                markTouched('cycle');
                setCyclePickerOpen(false);
              }}>
              <View style={styles.cycleOptionCopy}>
                <Text style={styles.cycleOptionTitle}>{option.label}</Text>
                <Text style={styles.cycleOptionBody}>
                  {option.value === 'MONTHLY' ? 'Track monthly premium follow-ups.' : 'Track annual renewal dates.'}
                </Text>
              </View>
              {coverForm.cycle === option.value ? (
                <MaterialIcons color={palette.primary} name="check-circle" size={22} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </AppModal>

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
            const selected = iso === coverForm.expiryDate;

            return (
              <Pressable
                key={iso ?? `empty-${index}`}
                disabled={!day}
                style={[
                  styles.calendarDay,
                  !day ? styles.calendarDayEmpty : null,
                  selected ? styles.calendarDaySelected : null,
                ]}
                onPress={() => {
                  if (!day) return;
                  updateForm('expiryDate', formatDateIso(day));
                  setDatePickerOpen(false);
                }}>
                <Text
                  style={[
                    styles.calendarDayText,
                    !day ? styles.calendarDayTextEmpty : null,
                    selected ? styles.calendarDayTextSelected : null,
                  ]}>
                  {day ? day.getDate() : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppModal>

      {moreMenuOpen ? (
        <>
          <Pressable style={styles.moreMenuBackdrop} onPress={() => setMoreMenuOpen(false)} />
          <View style={styles.moreMenu}>
            <Pressable
              style={styles.moreMenuItem}
              onPress={() => {
                setMoreMenuOpen(false);
                Alert.alert('Support', 'Support workspace can be connected next.');
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
                router.push('/billing');
              }}>
              <View style={styles.moreMenuIconWrap}>
                <MaterialIcons color={palette.primary} name="verified-user" size={20} />
              </View>
              <View style={styles.moreMenuCopy}>
                <Text style={styles.moreMenuTitle}>Billing</Text>
                <Text style={styles.moreMenuSubtitle}>Manage subscription and payments</Text>
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
    </>
  );
}

type SelectTriggerProps = {
  error?: string;
  label: string;
  onPress: () => void;
  value: string;
};

function SelectTrigger({ error, label, onPress, value }: SelectTriggerProps) {
  return (
    <View style={styles.selectBlock}>
      <Text style={[styles.selectLabel, error ? styles.selectLabelError : null]}>{label}</Text>
      <Pressable style={[styles.selectShell, error ? styles.selectShellError : null]} onPress={onPress}>
        <Text style={styles.selectValue}>{value}</Text>
        <MaterialIcons color={palette.onSurfaceVariant} name="keyboard-arrow-down" size={20} />
      </Pressable>
      {error ? <Text style={styles.selectError}>{error}</Text> : null}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionMenuBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  actionMenuCopy: {
    flex: 1,
    gap: 2,
  },
  actionMenuFrame: {
    maxWidth: 360,
  } as ViewStyle,
  actionMenuIconDanger: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
  },
  actionMenuIconPrimary: {
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
  },
  actionMenuIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  actionMenuItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderColor: 'rgba(192, 199, 214, 0.55)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  actionMenuList: {
    gap: spacing.sm,
  },
  actionMenuTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  addButtonText: {
    color: palette.white,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  coverCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  coverDueDate: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  coverMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  coverRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  coverRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  coverRowBorder: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  coverRowLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  coverStatusDot: {
    borderRadius: radius.pill,
    height: 12,
    width: 12,
  },
  coverStatusDotActive: {
    backgroundColor: '#16A34A',
  },
  coverStatusDotDue: {
    backgroundColor: '#F59E0B',
  },
  coverStatusDotLapsed: {
    backgroundColor: '#BA1A1A',
  },
  coverStatusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  coverStatusPillActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  coverStatusPillDue: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  coverStatusPillLapsed: {
    backgroundColor: 'rgba(186, 26, 26, 0.12)',
  },
  coverStatusText: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
  },
  coverTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyStateBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  emptyStateTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  createModalFrame: {
    maxHeight: '75%',
  } as ViewStyle,
  cycleModalFrame: {
    maxWidth: 420,
    maxHeight: '42%',
  } as ViewStyle,
  dateModalFrame: {
    maxWidth: 420,
    maxHeight: '56%',
  } as ViewStyle,
  deleteButton: {
    backgroundColor: palette.error,
  },
  deleteButtonText: {
    color: palette.onError,
  },
  deleteModalFrame: {
    maxWidth: 380,
  } as ViewStyle,
  detailHeaderCard: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  detailHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  detailHeaderMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  detailHeaderTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  detailLabel: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  detailList: {
    gap: spacing.md,
  },
  detailRow: {
    gap: spacing.xs,
  },
  detailValue: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '600',
    lineHeight: 20,
  },
  notificationsModalFrame: {
    maxHeight: '70%',
  } as ViewStyle,
  viewModalFrame: {
    maxHeight: '75%',
  } as ViewStyle,
  cycleOption: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  cycleOptionActive: {
    backgroundColor: 'rgba(0, 92, 171, 0.05)',
    borderColor: palette.primary,
  },
  cycleOptionBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  cycleOptionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cycleOptionTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  cycleOptions: {
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
  formStack: {
    gap: spacing.md,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: typography.body,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
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
  modalButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.7,
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
  modalIntro: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalLoadingState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  modalLoadingText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  modalSection: {
    gap: spacing.md,
  },
  modalSectionTitle: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  notificationBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  notificationCopy: {
    flex: 1,
    gap: 2,
  },
  notificationEmpty: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderColor: 'rgba(192, 199, 214, 0.55)',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  notificationEmptyText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  notificationIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  notificationIconWrapPrimary: {
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
  },
  notificationIconWrapTertiary: {
    backgroundColor: 'rgba(181, 28, 0, 0.1)',
  },
  notificationList: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  notificationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  notificationRowBorder: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  notificationTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
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
  moreMenuCopy: {
    flex: 1,
    gap: 2,
  },
  moreMenuIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  moreMenuIconWrapMuted: {
    backgroundColor: 'rgba(224, 227, 229, 0.85)',
  },
  moreMenuItem: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  moreMenuSubtitle: {
    color: palette.onSurfaceVariant,
    fontSize: 12,
  },
  moreMenuTitle: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  promoBody: {
    color: 'rgba(254,252,255,0.9)',
    fontSize: typography.bodySmall,
    maxWidth: '70%',
  },
  promoCard: {
    backgroundColor: palette.primaryContainer,
    borderRadius: radius.lg,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  promoCopy: {
    gap: spacing.xs,
    zIndex: 1,
  },
  promoIcon: {
    bottom: -24,
    position: 'absolute',
    right: -12,
    transform: [{ rotate: '12deg' }],
  },
  promoTitle: {
    color: palette.onPrimaryContainer,
    fontSize: typography.title,
    fontWeight: '700',
  },
  selectBlock: {
    gap: spacing.xs,
  },
  selectError: {
    color: palette.error,
    fontSize: typography.label,
    lineHeight: 16,
  },
  selectLabel: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.24,
  },
  selectLabelError: {
    color: palette.error,
  },
  selectShell: {
    alignItems: 'center',
    backgroundColor: palette.glassSoft,
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  selectShellError: {
    borderColor: palette.error,
  },
  selectValue: {
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.body,
  },
  sectionBlock: {
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
  },
  sectionCount: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: palette.white,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryCard: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 8,
    height: 144,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  summaryCount: {
    color: palette.onSurface,
    fontSize: 20,
    fontWeight: '700',
  },
  summaryGrid: {
    columnGap: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -4,
    paddingHorizontal: spacing.marginMobile,
    rowGap: spacing.md,
  },
  summaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryIconWrap: {
    alignItems: 'center',
    borderRadius: radius.xl,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  summaryLabel: {
    color: palette.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    color: palette.onSurface,
    fontSize: 20,
    fontWeight: '600',
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
