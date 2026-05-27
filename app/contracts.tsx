import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { MaterialIcons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  type GestureResponderEvent,
  type ViewStyle,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppMessageModal } from '@/components/app/app-message-modal';
import { AppModal } from '@/components/app/app-modal';
import { FloatingBottomNav } from '@/components/app/floating-bottom-nav';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { AuthTextField } from '@/components/auth/auth-primitives';
import { apiConfig } from '@/constants/api';
import { SummaryCard, type SummaryCardTone } from '@/components/dashboard/summary-card';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import {
  type ContractRecord,
  deleteContract,
  getContractById,
  getContractRenewalTimeline,
  getContracts,
  markContractExpiryComplete,
  type ContractRenewalTimelineItem,
} from '@/features/contracts/contracts-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type ContractStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'UPCOMING';
type ContractFilter = 'ALL' | ContractStatus;

type ContractSummaryCard = {
  count: string;
  filter: ContractFilter;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: SummaryCardTone;
  label: string;
  title: string;
};

type ContractListItem = {
  expiryDate: string;
  id: string;
  parties: string;
  status: ContractStatus;
  title: string;
};

type ContractNotificationItem = {
  dateLabel: string;
  daysLabel: string;
  id: string;
  parties: string;
  title: string;
};

type InfoModalState = {
  eyebrow: string;
  message: string;
  title: string;
  visible: boolean;
};

type NotificationConfirmState = {
  contractId: string | null;
  expiryDate: string;
  visible: boolean;
};

type ActionMenuPosition = {
  top: number;
};

const ACTION_MENU_HEIGHT = 188;

function formatLongDate(dateValue: string | null) {
  if (!dateValue) {
    return 'No date';
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

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return 'Unknown size';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function advanceContractExpiryDate(currentExpiryDate: string) {
  const date = new Date(`${currentExpiryDate}T00:00:00`);
  const dayOfMonth = date.getDate();
  const next = new Date(date.getFullYear() + 1, date.getMonth(), dayOfMonth);
  return next.toISOString().split('T')[0];
}

function getExpiryCompletionError(contract: ContractRecord | null, expiryDate: string) {
  const trimmed = expiryDate.trim();

  if (!trimmed) {
    return 'Enter the new expiry date.';
  }

  if (!isIsoDate(trimmed)) {
    return 'Use the YYYY-MM-DD format for the new expiry date.';
  }

  if (contract && new Date(`${trimmed}T00:00:00`) < new Date(`${contract.contractStartDate}T00:00:00`)) {
    return 'New expiry date cannot be earlier than the contract start date.';
  }

  return null;
}

function getContractStatus(contract: ContractRecord): ContractStatus {
  const startDelta = daysUntil(contract.contractStartDate);
  const expiryDelta = daysUntil(contract.contractExpiryDate);

  if (expiryDelta < 0) {
    return 'EXPIRED';
  }

  if (startDelta > 0) {
    return 'UPCOMING';
  }

  return expiryDelta <= 14 ? 'EXPIRING' : 'ACTIVE';
}

function mapContractToListItem(contract: ContractRecord): ContractListItem {
  return {
    expiryDate: formatLongDate(contract.contractExpiryDate),
    id: contract.id,
    parties: contract.contractingParties,
    status: getContractStatus(contract),
    title: contract.contractNumber,
  };
}

function buildContractSearchValue(contract: ContractRecord, listItem: ContractListItem) {
  return [
    contract.contractNumber,
    contract.contractingParties,
    contract.description ?? '',
    contract.contractStartDate,
    contract.contractExpiryDate,
    contract.contractFileName ?? '',
    listItem.status,
  ]
    .join(' ')
    .toLowerCase();
}

function buildSummaryCards(contracts: ContractRecord[]): ContractSummaryCard[] {
  const counts = contracts.reduce(
    (summary, contract) => {
      const status = getContractStatus(contract);
      summary.total += 1;
      summary[status] += 1;
      return summary;
    },
    { ACTIVE: 0, EXPIRING: 0, EXPIRED: 0, UPCOMING: 0, total: 0 }
  );

  return [
    {
      count: String(counts.total),
      filter: 'ALL',
      icon: 'description',
      iconTone: 'primary',
      label: 'All Agreements',
      title: 'Total',
    },
    {
      count: String(counts.ACTIVE),
      filter: 'ACTIVE',
      icon: 'verified',
      iconTone: 'secondary',
      label: 'In Force',
      title: 'Active',
    },
    {
      count: String(counts.EXPIRING),
      filter: 'EXPIRING',
      icon: 'event',
      iconTone: 'tertiary',
      label: 'Needs Review',
      title: 'Expiring',
    },
    {
      count: String(counts.EXPIRED),
      filter: 'EXPIRED',
      icon: 'history-toggle-off',
      iconTone: 'neutral',
      label: 'Past Term',
      title: 'Expired',
    },
  ];
}

function buildContractNotificationItem(
  contract: ContractRecord,
  targetDate: string
): ContractNotificationItem {
  const remainingDays = daysUntil(targetDate);

  return {
    dateLabel: formatLongDate(targetDate),
    daysLabel:
      remainingDays === 0
        ? 'Expires today'
        : remainingDays === 1
          ? 'Expires in 1 day'
          : `Expires in ${remainingDays} days`,
    id: contract.id,
    parties: contract.contractingParties,
    title: contract.contractNumber,
  };
}

function describeContractTermLength(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 'Duration unavailable';
  }

  const cursor = new Date(start.getTime());
  let months = 0;

  while (true) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    if (next <= end) {
      months += 1;
      cursor.setTime(next.getTime());
      continue;
    }

    break;
  }

  const days = Math.round((end.getTime() - cursor.getTime()) / 86400000);
  const monthLabel = months === 1 ? '1 month' : `${months} months`;
  const dayLabel = days === 1 ? '1 day' : `${days} days`;

  if (!months) {
    return dayLabel;
  }

  if (!days) {
    return monthLabel;
  }

  return `${monthLabel}, ${dayLabel}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default function ContractsScreen() {
  const { logout, session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractSearch, setContractSearch] = useState('');
  const [contractFilter, setContractFilter] = useState<ContractFilter>('ALL');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedContractDetail, setSelectedContractDetail] = useState<ContractRecord | null>(null);
  const [contractActionMenuOpen, setContractActionMenuOpen] = useState(false);
  const [contractViewOpen, setContractViewOpen] = useState(false);
  const [contractDetailLoading, setContractDetailLoading] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timeline, setTimeline] = useState<ContractRenewalTimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [completionDatePickerOpen, setCompletionDatePickerOpen] = useState(false);
  const [markingExpiryCompleteId, setMarkingExpiryCompleteId] = useState<string | null>(null);
  const [completionPickerMonth, setCompletionPickerMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [notificationConfirm, setNotificationConfirm] = useState<NotificationConfirmState>({
    contractId: null,
    expiryDate: '',
    visible: false,
  });
  const [actionMenuPosition, setActionMenuPosition] = useState<ActionMenuPosition>({ top: 0 });
  const [infoModal, setInfoModal] = useState<InfoModalState>({
    eyebrow: '',
    message: '',
    title: '',
    visible: false,
  });
  const { height, width } = useWindowDimensions();
  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();
  const cardWidth = (width - spacing.marginMobile * 2 - spacing.md) / 2;

  const listItems = useMemo(() => contracts.map(mapContractToListItem), [contracts]);
  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) ?? null,
    [contracts, selectedContractId]
  );
  const filteredListItems = useMemo(() => {
    const query = contractSearch.trim().toLowerCase();
    return contracts
      .map((contract, index) => {
        const listItem = listItems[index];
        if (!listItem) {
          return null;
        }

        if (contractFilter !== 'ALL' && listItem.status !== contractFilter) {
          return null;
        }

        if (query && !buildContractSearchValue(contract, listItem).includes(query)) {
          return null;
        }

        return listItem;
      })
      .filter((item): item is ContractListItem => item !== null);
  }, [contractFilter, contractSearch, contracts, listItems]);
  const contractSummaryCards = useMemo(() => buildSummaryCards(contracts), [contracts]);
  const expiringCount = useMemo(
    () => contracts.filter((contract) => getContractStatus(contract) === 'EXPIRING').length,
    [contracts]
  );
  const expiredCount = useMemo(
    () => contracts.filter((contract) => getContractStatus(contract) === 'EXPIRED').length,
    [contracts]
  );
  const activeCount = useMemo(
    () => contracts.filter((contract) => getContractStatus(contract) === 'ACTIVE').length,
    [contracts]
  );
  const upcomingCount = useMemo(
    () => contracts.filter((contract) => getContractStatus(contract) === 'UPCOMING').length,
    [contracts]
  );
  const expiryNotifications = useMemo(
    () =>
      [...contracts]
        .filter((contract) => {
          const days = daysUntil(contract.contractExpiryDate);
          return days >= 0 && days <= 14;
        })
        .sort((left, right) => daysUntil(left.contractExpiryDate) - daysUntil(right.contractExpiryDate))
        .map((contract) => buildContractNotificationItem(contract, contract.contractExpiryDate)),
    [contracts]
  );
  const totalNotificationCount = expiryNotifications.length;
  const notificationConfirmContract = useMemo(
    () => contracts.find((contract) => contract.id === notificationConfirm.contractId) ?? null,
    [contracts, notificationConfirm.contractId]
  );
  const notificationConfirmBusy = markingExpiryCompleteId === notificationConfirm.contractId;
  const notificationConfirmExpiryError = useMemo(
    () => getExpiryCompletionError(notificationConfirmContract, notificationConfirm.expiryDate),
    [notificationConfirm.expiryDate, notificationConfirmContract]
  );

  const readinessInsight = useMemo(() => {
    if (!contracts.length) {
      return {
        body: 'Create your first contract record to start tracking agreement timelines, files, and renewals in one place.',
        icon: 'description' as const,
        toneStyle: styles.promoCardIdle,
      };
    }

    if (expiredCount) {
      return {
        body: `${expiredCount} contract${expiredCount === 1 ? '' : 's'} ${expiredCount === 1 ? 'has' : 'have'} expired. Prioritise renewals, replacements, or closures before the next review cycle.`,
        icon: 'history-toggle-off' as const,
        toneStyle: styles.promoCardAlert,
      };
    }

    if (expiringCount) {
      return {
        body: `${expiringCount} contract${expiringCount === 1 ? '' : 's'} ${expiringCount === 1 ? 'is' : 'are'} approaching expiry. Review terms early and keep the latest signed files attached.`,
        icon: 'event-available' as const,
        toneStyle: styles.promoCardWarm,
      };
    }

    if (upcomingCount) {
      return {
        body: `${upcomingCount} contract${upcomingCount === 1 ? '' : 's'} ${upcomingCount === 1 ? 'starts' : 'start'} soon while ${activeCount} ${activeCount === 1 ? 'is' : 'are'} already active. Your timeline is shaping up well.`,
        icon: 'schedule' as const,
        toneStyle: styles.promoCardHealthy,
      };
    }

    return {
      body: `All ${activeCount} active contract${activeCount === 1 ? '' : 's'} are currently in good standing with no urgent expiry pressure.`,
      icon: 'verified' as const,
      toneStyle: styles.promoCardHealthy,
    };
  }, [activeCount, contracts.length, expiredCount, expiringCount, upcomingCount]);

  const loadContracts = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session?.accessToken) {
        return;
      }

      const silent = options?.silent ?? false;
      if (!silent) {
        setContractsLoading(true);
      }

      try {
        const records = await getContracts(session.accessToken);
        setContracts(records);
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) {
          showToast(error instanceof Error ? error.message : 'Unable to load contracts.', 'error');
        }
      } finally {
        if (!silent) {
          setContractsLoading(false);
        }
      }
    },
    [session?.accessToken, showToast]
  );

  useFocusEffect(
    useCallback(() => {
      if (!session?.accessToken) {
        setContracts([]);
        setContractsLoading(false);
        return;
      }

      loadContracts();
    }, [loadContracts, session?.accessToken])
  );

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  async function fetchContractDetail(contractId: string) {
    if (!session?.accessToken) {
      return null;
    }

    setContractDetailLoading(true);

    try {
      const contract = await getContractById(session.accessToken, contractId);
      setSelectedContractDetail(contract);
      return contract;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to load contract details.', 'error');
      }
      return null;
    } finally {
      setContractDetailLoading(false);
    }
  }

  function handleBottomNavPress(key: string) {
    if (key === 'home') {
      router.replace('/dashboard');
      return;
    }

    if (key === 'covers') {
      router.push('/covers');
      return;
    }

    if (key === 'journals') {
      router.push('/journals');
      return;
    }

    if (key === 'tasks') {
      router.push('/tasks');
      return;
    }

    if (key === 'contracts') {
      return;
    }

    if (key === 'more') {
      setMoreMenuOpen((current) => !current);
      return;
    }

    setMoreMenuOpen(false);
  }

  function closeInfoModal() {
    setInfoModal((current) => ({
      ...current,
      visible: false,
    }));
  }

  function handleLogout() {
    setMoreMenuOpen(false);
    logout({ animated: true, redirectToLogin: true });
  }

  function handleOpenCreate() {
    router.push('/contract-form');
  }

  function handleContractPress(contractId: string, event: GestureResponderEvent) {
    const maxTop = Math.max(112, height - ACTION_MENU_HEIGHT - 112);
    setSelectedContractId(contractId);
    setSelectedContractDetail(null);
    setActionMenuPosition({
      top: Math.min(maxTop, Math.max(112, event.nativeEvent.pageY - 6)),
    });
    setContractActionMenuOpen(true);
  }

  async function handleViewContract() {
    if (!selectedContractId) {
      return;
    }

    setContractActionMenuOpen(false);
    const contract = await fetchContractDetail(selectedContractId);

    if (contract) {
      setContractViewOpen(true);
    }
  }

  async function handleViewTimeline() {
    if (!selectedContractId || !session?.accessToken) {
      return;
    }

    setContractActionMenuOpen(false);
    setTimelineLoading(true);
    setTimelineOpen(true);

    try {
      const items = await getContractRenewalTimeline(session.accessToken, selectedContractId);
      setTimeline(items);
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to load renewal timeline.', 'error');
      }
      setTimelineOpen(false);
    } finally {
      setTimelineLoading(false);
    }
  }

  function handleEditContract() {
    if (!selectedContractId) {
      return;
    }

    setContractActionMenuOpen(false);
    router.push({
      params: { id: selectedContractId, mode: 'edit' },
      pathname: '/contract-form',
    });
  }

  function handleDeletePrompt() {
    setContractActionMenuOpen(false);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteContract() {
    if (!selectedContractId || !session?.accessToken) {
      return;
    }

    setDeleteSubmitting(true);

    try {
      await deleteContract(session.accessToken, selectedContractId);
      setDeleteConfirmOpen(false);
      setContractViewOpen(false);
      setTimelineOpen(false);
      setSelectedContractId(null);
      setSelectedContractDetail(null);
      showToast('Contract deleted successfully.');
      await loadContracts({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to delete contract.', 'error');
      }
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleOpenContractDocument(contractId: string, fallbackUrl: string | null) {
    if (!session?.accessToken) {
      return;
    }

    try {
      const contract = await getContractById(session.accessToken, contractId);
      setSelectedContractDetail(contract);

      if (!contract.contractFileName) {
        showToast('No contract document is attached to this record.', 'error');
        return;
      }

      const downloadedFile = await File.downloadFileAsync(
        `${apiConfig.baseUrl}/contracts/${contractId}/file`,
        new File(Paths.cache, `${contractId}-${sanitizeFileName(contract.contractFileName)}`),
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          idempotent: true,
        }
      );

      const mimeType = contract.contractFileMimeType ?? 'application/octet-stream';

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadedFile.uri, {
          UTI: mimeType,
          dialogTitle: contract.contractFileName,
          mimeType,
        });
        return;
      }

      const localUrl =
        Platform.OS === 'android'
          ? await getContentUriAsync(downloadedFile.uri)
          : downloadedFile.uri;

      const canOpen = await Linking.canOpenURL(localUrl);

      if (canOpen) {
        await Linking.openURL(localUrl);
        return;
      }

      if (fallbackUrl ?? contract.contractFileUrl) {
        await WebBrowser.openBrowserAsync(contract.contractFileUrl ?? fallbackUrl!);
        return;
      }

      showToast('Unable to preview this contract document on the device.', 'error');
    } catch {
      showToast('Unable to open contract file.', 'error');
    }
  }

  async function handleMarkExpiryComplete(contractId: string, contractExpiryDate: string) {
    if (!session?.accessToken || markingExpiryCompleteId) {
      return;
    }

    setMarkingExpiryCompleteId(contractId);

    try {
      await markContractExpiryComplete(session.accessToken, contractId, {
        contractExpiryDate: contractExpiryDate.trim(),
      });
      setNotificationConfirm({ contractId: null, expiryDate: '', visible: false });
      showToast('Contract expiry marked as complete.');
      await loadContracts({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to complete contract expiry.', 'error');
      }
    } finally {
      setMarkingExpiryCompleteId(null);
    }
  }

  function openNotificationConfirm(contractId: string) {
    const contract = contracts.find((item) => item.id === contractId) ?? null;
    setNotificationConfirm({
      contractId,
      expiryDate: contract ? advanceContractExpiryDate(contract.contractExpiryDate) : '',
      visible: true,
    });
  }

  function openCompletionDatePicker() {
    const source = notificationConfirm.expiryDate && /^\d{4}-\d{2}-\d{2}$/.test(notificationConfirm.expiryDate)
      ? new Date(`${notificationConfirm.expiryDate}T00:00:00`)
      : new Date();
    setCompletionPickerMonth(new Date(source.getFullYear(), source.getMonth(), 1));
    setCompletionDatePickerOpen(true);
  }

  function closeNotificationConfirm() {
    if (notificationConfirmBusy) {
      return;
    }

      setNotificationConfirm({
        contractId: null,
        expiryDate: '',
        visible: false,
      });
      setCompletionDatePickerOpen(false);
  }

  async function handleConfirmNotificationAction() {
    if (!notificationConfirm.contractId) {
      return;
    }

    if (notificationConfirmExpiryError) {
      showToast(notificationConfirmExpiryError, 'error');
      return;
    }

    await handleMarkExpiryComplete(notificationConfirm.contractId, notificationConfirm.expiryDate);
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        bottomSlot={<FloatingBottomNav activeKey={moreMenuOpen ? 'more' : 'contracts'} onPress={handleBottomNavPress} />}
        notificationCount={totalNotificationCount}
        onBackPress={() => router.replace('/dashboard')}
        onNotificationPress={() => setNotificationsOpen(true)}
        onProfilePress={() => router.push('/profile')}
        profileImageUrl={session.profileImageUrl}
        refreshControl={
          <RefreshControl
            refreshing={contractsLoading}
            tintColor={palette.primary}
            onRefresh={() => loadContracts()}
          />
        }
        scrollViewProps={{
          onScrollBeginDrag: () => {
            setMoreMenuOpen(false);
            setContractActionMenuOpen(false);
          },
        }}
        title="Contracts">
        <View style={styles.heroSection}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Contracts Hub</Text>
              <Text style={styles.heroBody}>
                Keep every agreement and key expiry date organised in one polished workspace.
              </Text>
            </View>
            <Pressable style={styles.addButton} onPress={handleOpenCreate}>
              <MaterialIcons color={palette.white} name="add" size={18} />
              <Text style={styles.addButtonText}>Add contract</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {contractSummaryCards.map((card) => {
            const active = card.filter === contractFilter;
            return (
              <SummaryCard
                active={active}
                key={card.filter}
                count={card.count}
                icon={card.icon}
                iconTone={card.iconTone}
                label={card.label}
                style={{ width: cardWidth }}
                title={card.title}
                onPress={() => setContractFilter(card.filter)}
              />
            );
          })}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Contracts List</Text>
            <Text style={styles.sectionCount}>
              {filteredListItems.length} {contractFilter === 'ALL' ? 'records' : `${contractFilter.toLowerCase()} records`}
            </Text>
          </View>

          <View style={styles.searchBar}>
            <MaterialIcons color={palette.onSurfaceVariant} name="search" size={18} />
            <TextInput
              placeholder="Search by number, party, or file"
              placeholderTextColor={palette.onSurfaceVariant}
              returnKeyType="search"
              style={styles.searchInput}
              value={contractSearch}
              onChangeText={setContractSearch}
            />
          </View>

          <View style={styles.listCard}>
            {contractsLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={palette.primary} size="small" />
                <Text style={styles.emptyStateBody}>Loading your contracts...</Text>
              </View>
            ) : filteredListItems.length ? (
              filteredListItems.map((contract, index) => (
                <Pressable
                  key={contract.id}
                  style={[styles.contractRow, index < filteredListItems.length - 1 ? styles.contractRowBorder : null]}
                  onPress={(event) => handleContractPress(contract.id, event)}>
                  <View style={styles.contractRowLeft}>
                    <View
                      style={[
                        styles.contractStatusDot,
                        contract.status === 'ACTIVE'
                          ? styles.contractStatusDotActive
                          : contract.status === 'EXPIRING'
                            ? styles.contractStatusDotExpiring
                            : contract.status === 'UPCOMING'
                              ? styles.contractStatusDotUpcoming
                              : styles.contractStatusDotExpired,
                      ]}
                    />
                    <View style={styles.contractCopy}>
                      <Text style={styles.contractTitle}>{contract.title}</Text>
                      <Text numberOfLines={1} style={styles.contractMeta}>
                        {contract.parties}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.contractRight}>
                    <View
                      style={[
                        styles.contractStatusPill,
                        contract.status === 'ACTIVE'
                          ? styles.contractStatusPillActive
                          : contract.status === 'EXPIRING'
                            ? styles.contractStatusPillExpiring
                            : contract.status === 'UPCOMING'
                              ? styles.contractStatusPillUpcoming
                              : styles.contractStatusPillExpired,
                      ]}>
                      <Text style={styles.contractStatusText}>{contract.status}</Text>
                    </View>
                    <Text style={styles.contractDueDate}>Expires {contract.expiryDate}</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons color={palette.primary} name="description" size={28} />
                <Text style={styles.emptyStateTitle}>No contracts found</Text>
                <Text style={styles.emptyStateBody}>
                  {contracts.length
                    ? 'Try a different search or filter to find another contract record.'
                    : 'Add your first contract to start tracking parties, dates, and signed files.'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.promoCard, readinessInsight.toneStyle]}>
          <View style={styles.promoCopy}>
            <Text style={styles.promoTitle}>Contract Readiness</Text>
            <Text style={styles.promoBody}>{readinessInsight.body}</Text>
          </View>
          <MaterialIcons color="rgba(255,255,255,0.2)" name={readinessInsight.icon} size={120} style={styles.promoIcon} />
        </View>
      </FloatingPageShell>

      <AppModal
        footer={
          <Pressable style={styles.modalButton} onPress={() => setNotificationsOpen(false)}>
            <Text style={styles.modalButtonText}>Close</Text>
          </Pressable>
        }
        frameStyle={styles.notificationsModalFrame}
        title={`Notifications (${totalNotificationCount})`}
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}>
        <View style={styles.modalSection}>
          <Text style={styles.modalIntro}>
            Contracts that are approaching expiry appear here so you can complete renewals before the deadline.
          </Text>
          {expiryNotifications.length ? (
            <View style={styles.notificationList}>
              {expiryNotifications.map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.notificationRow, index < expiryNotifications.length - 1 ? styles.notificationRowBorder : null]}>
                  <View style={[styles.notificationIconWrap, styles.notificationIconWrapTertiary]}>
                    <MaterialIcons color={palette.tertiary} name="event" size={20} />
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMeta}>{item.parties}</Text>
                    <Text style={styles.notificationBody}>
                      {item.daysLabel} - {item.dateLabel}
                    </Text>
                  </View>
                  <Pressable
                    disabled={markingExpiryCompleteId === item.id}
                    hitSlop={8}
                    style={[styles.markPaidButton, markingExpiryCompleteId === item.id ? styles.markPaidButtonDisabled : null]}
                    onPress={() => openNotificationConfirm(item.id)}>
                    {markingExpiryCompleteId === item.id ? (
                      <ActivityIndicator color={palette.tertiary} size="small" />
                    ) : (
                      <MaterialIcons color={palette.tertiary} name="check-circle" size={24} />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.notificationEmpty}>
              <Text style={styles.notificationEmptyText}>
                No expiring contracts right now. You are up to date.
              </Text>
            </View>
          )}
        </View>
      </AppModal>

      <AppModal
        footer={
          <Pressable style={styles.modalButton} onPress={() => setTimelineOpen(false)}>
            <Text style={styles.modalButtonText}>Close</Text>
          </Pressable>
        }
        frameStyle={styles.viewModalFrame}
        title="Renewal timeline"
        visible={timelineOpen}
        onClose={() => setTimelineOpen(false)}>
        {timelineLoading ? (
          <View style={styles.modalLoadingState}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.modalLoadingText}>Loading timeline...</Text>
          </View>
        ) : timeline.length ? (
          <View style={styles.notificationList}>
            {timeline.map((item, index) => (
              <View
                key={`${item.startDate}-${item.endDate}-${index}`}
                style={[styles.notificationRow, index < timeline.length - 1 ? styles.notificationRowBorder : null]}>
                <View style={[styles.notificationIconWrap, styles.notificationIconWrapPrimary]}>
                  <MaterialIcons color={palette.primary} name="history" size={18} />
                </View>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationTitle}>
                    {formatLongDate(item.startDate)} - {formatLongDate(item.endDate)}
                  </Text>
                  <Text style={styles.notificationMeta}>
                    Term length: {describeContractTermLength(item.startDate, item.endDate)}
                  </Text>
                  <Text style={styles.notificationBody}>
                    Renewed: {new Date(item.renewedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <MaterialIcons color={palette.outline} name="history" size={28} />
            <Text style={styles.modalLoadingText}>No renewal history yet.</Text>
          </View>
        )}
      </AppModal>

      <AppModal
        footer={
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonOutline, notificationConfirmBusy ? styles.modalButtonDisabled : null]}
              disabled={notificationConfirmBusy}
              onPress={closeNotificationConfirm}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, notificationConfirmBusy ? styles.modalButtonDisabled : null]}
              disabled={notificationConfirmBusy || !notificationConfirmContract || Boolean(notificationConfirmExpiryError)}
              onPress={handleConfirmNotificationAction}>
              {notificationConfirmBusy ? (
                <ActivityIndicator color={palette.onPrimary} size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Mark as complete</Text>
              )}
            </Pressable>
          </View>
        }
        frameStyle={styles.deleteModalFrame}
        title="Confirm expiry completion"
        visible={notificationConfirm.visible}
        onClose={closeNotificationConfirm}>
        {notificationConfirmContract ? (
          <View style={styles.detailList}>
            <Text style={styles.modalIntro}>
              Confirm that this contract expiry has been completed, then set the new expiry date for the renewed contract.
            </Text>
            <View style={styles.detailHeaderCard}>
              <View
                style={[styles.notificationIconWrap, styles.notificationIconWrapTertiary]}>
                <MaterialIcons color={palette.tertiary} name="event" size={20} />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailHeaderTitle}>{notificationConfirmContract.contractNumber}</Text>
                <Text style={styles.detailHeaderMeta}>{notificationConfirmContract.contractingParties}</Text>
              </View>
              <View
                style={[
                  styles.contractStatusPill,
                  getContractStatus(notificationConfirmContract) === 'ACTIVE'
                    ? styles.contractStatusPillActive
                    : getContractStatus(notificationConfirmContract) === 'EXPIRING'
                      ? styles.contractStatusPillExpiring
                      : getContractStatus(notificationConfirmContract) === 'UPCOMING'
                        ? styles.contractStatusPillUpcoming
                        : styles.contractStatusPillExpired,
                ]}>
                <Text style={styles.contractStatusText}>{getContractStatus(notificationConfirmContract)}</Text>
              </View>
            </View>
            <DetailRow label="Expiry date" value={formatLongDate(notificationConfirmContract.contractExpiryDate)} />
            <DetailRow label="Start date" value={formatLongDate(notificationConfirmContract.contractStartDate)} />
            <DetailRow label="Description" value={notificationConfirmContract.description ?? 'Not provided'} />
            <AuthTextField
              error={notificationConfirmExpiryError ?? ''}
              icon="event-busy"
              label="New Expiry Date"
              placeholder="Select expiry date"
              showSoftInputOnFocus={false}
              value={notificationConfirm.expiryDate ? formatReadableDate(notificationConfirm.expiryDate) : ''}
              onFocus={openCompletionDatePicker}
            />
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <Text style={styles.modalLoadingText}>No contract details available.</Text>
          </View>
        )}
      </AppModal>

      <AppModal
        footer={
          <View style={styles.modalFooter}>
            <Pressable style={[styles.modalButton, styles.modalButtonOutline]} onPress={() => setCompletionDatePickerOpen(false)}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
            </Pressable>
          </View>
        }
        frameStyle={styles.dateModalFrame}
        title="Select expiry date"
        visible={completionDatePickerOpen}
        onClose={() => setCompletionDatePickerOpen(false)}>
        <View style={styles.calendarHeader}>
          <Pressable
            style={styles.calendarNavButton}
            onPress={() =>
              setCompletionPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }>
            <MaterialIcons color={palette.primary} name="chevron-left" size={22} />
          </Pressable>
          <Text style={styles.calendarTitle}>
            {completionPickerMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable
            style={styles.calendarNavButton}
            onPress={() =>
              setCompletionPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }>
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
          {buildCalendarDays(completionPickerMonth).map((day, index) => {
            const iso = day ? formatDateIso(day) : null;
            const selected = iso === notificationConfirm.expiryDate;
            const isDisabled =
              day &&
              notificationConfirmContract &&
              new Date(`${iso}T00:00:00`) < new Date(`${notificationConfirmContract.contractStartDate}T00:00:00`);

            return (
              <Pressable
                key={iso ?? `empty-${index}`}
                disabled={!day || isDisabled}
                style={[
                  styles.calendarDay,
                  !day ? styles.calendarDayEmpty : null,
                  isDisabled ? styles.calendarDayPast : null,
                  selected ? styles.calendarDaySelected : null,
                ]}
                onPress={() => {
                  setNotificationConfirm((current) => ({
                    ...current,
                    expiryDate: formatDateIso(day!),
                  }));
                  setCompletionDatePickerOpen(false);
                }}>
                <Text
                  style={[
                    styles.calendarDayText,
                    !day ? styles.calendarDayTextEmpty : null,
                    isDisabled ? styles.calendarDayTextPast : null,
                    selected ? styles.calendarDayTextSelected : null,
                  ]}>
                  {day ? day.getDate() : 0}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppModal>

      <AppModal
        footer={
          selectedContractDetail ? (
            <View style={styles.modalFooter}>
              <Pressable style={[styles.modalButton, styles.modalButtonOutline]} onPress={() => setContractViewOpen(false)}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Close</Text>
              </Pressable>
              <Pressable style={styles.modalButton} onPress={handleEditContract}>
                <Text style={styles.modalButtonText}>Edit contract</Text>
              </Pressable>
            </View>
          ) : undefined
        }
        frameStyle={styles.viewModalFrame}
        title="Contract details"
        visible={contractViewOpen}
        onClose={() => setContractViewOpen(false)}>
        {contractDetailLoading ? (
          <View style={styles.modalLoadingState}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.modalLoadingText}>Loading contract details...</Text>
          </View>
        ) : selectedContractDetail ? (
          <View style={styles.modalSection}>
            <View style={styles.detailHeaderCard}>
              <View style={[styles.notificationIconWrap, styles.notificationIconWrapPrimary]}>
                <MaterialIcons color={palette.primary} name="description" size={20} />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailHeaderTitle}>{selectedContractDetail.contractNumber}</Text>
                <Text style={styles.detailHeaderMeta}>{selectedContractDetail.contractingParties}</Text>
              </View>
              <View
                style={[
                  styles.contractStatusPill,
                  getContractStatus(selectedContractDetail) === 'ACTIVE'
                    ? styles.contractStatusPillActive
                    : getContractStatus(selectedContractDetail) === 'EXPIRING'
                      ? styles.contractStatusPillExpiring
                      : getContractStatus(selectedContractDetail) === 'UPCOMING'
                        ? styles.contractStatusPillUpcoming
                        : styles.contractStatusPillExpired,
                ]}>
                <Text style={styles.contractStatusText}>{getContractStatus(selectedContractDetail)}</Text>
              </View>
            </View>

            <View style={styles.detailList}>
              <DetailRow label="Start date" value={formatLongDate(selectedContractDetail.contractStartDate)} />
              <DetailRow label="Expiry date" value={formatLongDate(selectedContractDetail.contractExpiryDate)} />
              <DetailRow
                label="Notifications"
                value={selectedContractDetail.allowPushNotif ? 'Enabled' : 'Disabled'}
              />
              <DetailRow
                label="Description"
                value={selectedContractDetail.description?.trim() || 'No description provided'}
              />
              <DetailRow
                label="Contract file"
                value={selectedContractDetail.contractFileName ?? 'No file attached'}
              />
            </View>

            <View style={styles.documentCard}>
              <View style={styles.documentIconWrap}>
                <MaterialIcons color={palette.primary} name="attach-file" size={22} />
              </View>
              <View style={styles.documentCopy}>
                <Text style={styles.documentTitle}>
                  {selectedContractDetail.contractFileName ?? 'No contract file attached'}
                </Text>
                <Text style={styles.documentBody}>
                  {selectedContractDetail.contractFileName
                    ? 'Open the uploaded contract document from this record.'
                    : 'No uploaded document is available for this contract yet.'}
                </Text>
              </View>
            </View>

            {selectedContractDetail.contractFileName ? (
              <View style={styles.documentActionRow}>
                <View style={styles.documentSizeWrap}>
                  <Text style={styles.documentSizeLabel}>File size</Text>
                  <Text style={styles.documentSizeValue}>
                    {formatFileSize(selectedContractDetail.contractFileSize)}
                  </Text>
                </View>
                <Pressable
                  style={styles.fileOpenButton}
                  onPress={() => handleOpenContractDocument(selectedContractDetail.id, selectedContractDetail.contractFileUrl)}>
                  <MaterialIcons color={palette.primary} name="open-in-new" size={18} />
                  <Text style={styles.fileOpenButtonText}>View document</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <Text style={styles.modalLoadingText}>Contract details are unavailable.</Text>
          </View>
        )}
      </AppModal>

      <AppModal
        footer={
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonOutline]}
              disabled={deleteSubmitting}
              onPress={() => setDeleteConfirmOpen(false)}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.deleteButton, deleteSubmitting ? styles.modalButtonDisabled : null]}
              disabled={deleteSubmitting}
              onPress={handleDeleteContract}>
              {deleteSubmitting ? (
                <ActivityIndicator color={palette.onError} size="small" />
              ) : (
                <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Delete contract</Text>
              )}
            </Pressable>
          </View>
        }
        frameStyle={styles.deleteModalFrame}
        title="Delete contract?"
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}>
        <Text style={styles.modalIntro}>
          This will remove the selected contract record from your workspace. This action cannot be undone.
        </Text>
      </AppModal>

      {contractActionMenuOpen && selectedContract ? (
        <>
          <Pressable style={styles.actionMenuBackdrop} onPress={() => setContractActionMenuOpen(false)} />
          <View style={[styles.actionMenu, { top: actionMenuPosition.top }]}>
            <Pressable style={styles.actionMenuItem} onPress={handleViewContract}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="visibility" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>View</Text>
            </Pressable>
            <View style={styles.actionMenuSeparator} />
            <Pressable style={styles.actionMenuItem} onPress={handleViewTimeline}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="history" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Timeline</Text>
            </Pressable>
            <View style={styles.actionMenuSeparator} />
            <Pressable style={styles.actionMenuItem} onPress={handleEditContract}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="edit" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Edit</Text>
            </Pressable>
            {selectedContract.contractFileName ? (
              <>
                <View style={styles.actionMenuSeparator} />
                <Pressable
                  style={styles.actionMenuItem}
                  onPress={() => {
                    setContractActionMenuOpen(false);
                    handleOpenContractDocument(selectedContract.id, selectedContract.contractFileUrl);
                  }}>
                  <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                    <MaterialIcons color={palette.primary} name="attach-file" size={18} />
                  </View>
                  <Text style={styles.actionMenuTitle}>View document</Text>
                </Pressable>
              </>
            ) : null}
            <View style={styles.actionMenuSeparator} />
            <Pressable style={styles.actionMenuItem} onPress={handleDeletePrompt}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconDanger]}>
                <MaterialIcons color={palette.error} name="delete-outline" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Delete</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {moreMenuOpen ? (
        <>
          <Pressable style={styles.moreMenuBackdrop} onPress={() => setMoreMenuOpen(false)} />
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionMenu: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(0,92,171,0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: 156,
    padding: 6,
    position: 'absolute',
    right: spacing.marginMobile,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    zIndex: 50,
  },
  actionMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 40,
  },
  actionMenuIconDanger: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
  },
  actionMenuIconPrimary: {
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
  },
  actionMenuIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  actionMenuItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionMenuSeparator: {
    alignSelf: 'center',
    backgroundColor: 'rgba(192, 199, 214, 0.7)',
    height: 1,
    marginVertical: 2,
    width: '75%',
  },
  actionMenuTitle: {
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.label,
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
  contractCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  contractDueDate: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  contractMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  contractRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  contractRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  contractRowBorder: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  contractRowLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contractStatusDot: {
    borderRadius: radius.pill,
    height: 12,
    width: 12,
  },
  contractStatusDotActive: {
    backgroundColor: '#16A34A',
  },
  contractStatusDotExpired: {
    backgroundColor: '#BA1A1A',
  },
  contractStatusDotExpiring: {
    backgroundColor: '#F59E0B',
  },
  contractStatusDotUpcoming: {
    backgroundColor: '#2563EB',
  },
  contractStatusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contractStatusPillActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  contractStatusPillExpired: {
    backgroundColor: 'rgba(186, 26, 26, 0.12)',
  },
  contractStatusPillExpiring: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  contractStatusPillUpcoming: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  contractStatusText: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
  },
  contractTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
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
  documentBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  documentActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  documentCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(192, 199, 214, 0.55)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  documentCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  documentIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  documentSizeLabel: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  documentSizeValue: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  documentSizeWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  documentTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  fileOpenButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.08)',
    borderColor: 'rgba(0, 92, 171, 0.16)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fileOpenButtonText: {
    color: palette.primary,
    fontSize: typography.label,
    fontWeight: '700',
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
  dateModalFrame: {
    maxHeight: '56%',
    maxWidth: 420,
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
  notificationsModalFrame: {
    maxHeight: '70%',
  } as ViewStyle,
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
  promoCardAlert: {
    backgroundColor: palette.tertiaryContainer,
  },
  promoCardHealthy: {
    backgroundColor: '#0F766E',
  },
  promoCardIdle: {
    backgroundColor: palette.primaryContainer,
  },
  promoCardWarm: {
    backgroundColor: '#B45309',
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
  searchBar: {
    alignItems: 'center',
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    color: palette.onSurface,
    flex: 1,
    fontSize: typography.body,
    paddingVertical: spacing.xs,
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
  summaryGrid: {
    columnGap: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -4,
    paddingHorizontal: spacing.marginMobile,
    rowGap: spacing.sm,
  },
  viewModalFrame: {
    maxHeight: '75%',
  } as ViewStyle,
  markPaidButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  markPaidButtonDisabled: {
    opacity: 0.5,
  },
});
