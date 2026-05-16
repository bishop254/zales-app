import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { SummaryCard, type SummaryCardTone } from '@/components/dashboard/summary-card';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import {
  type ContractRecord,
  deleteContract,
  getContracts,
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

type InfoModalState = {
  eyebrow: string;
  message: string;
  title: string;
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

export default function ContractsScreen() {
  const { logout, session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractSearch, setContractSearch] = useState('');
  const [contractFilter, setContractFilter] = useState<ContractFilter>('ALL');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [contractActionMenuOpen, setContractActionMenuOpen] = useState(false);
  const [contractViewOpen, setContractViewOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
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

  function handleBottomNavPress(key: string) {
    if (key === 'home') {
      router.replace('/dashboard');
      return;
    }

    if (key === 'covers') {
      router.push('/covers');
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
    setInfoModal({
      eyebrow: 'Workspace',
      message: 'This workspace can be connected next.',
      title: 'Tasks',
      visible: true,
    });
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
    setActionMenuPosition({
      top: Math.min(maxTop, Math.max(112, event.nativeEvent.pageY - 6)),
    });
    setContractActionMenuOpen(true);
  }

  function handleViewContract() {
    setContractActionMenuOpen(false);
    setContractViewOpen(true);
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
      setSelectedContractId(null);
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

  async function handleOpenFile(url: string | null) {
    if (!url) {
      return;
    }

    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      showToast('Unable to open contract file.', 'error');
    }
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        bottomSlot={<FloatingBottomNav activeKey={moreMenuOpen ? 'more' : 'contracts'} onPress={handleBottomNavPress} />}
        onBackPress={() => router.replace('/dashboard')}
        onNotificationPress={() =>
          setInfoModal({
            eyebrow: 'Notifications',
            message: 'Contract reminder alerts will appear here as this workspace expands.',
            title: 'Notifications',
            visible: true,
          })
        }
        onProfilePress={() =>
          setInfoModal({
            eyebrow: 'Account',
            message: `Signed in as ${session.email}`,
            title: 'Account',
            visible: true,
          })
        }
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
                Keep every agreement, attachment, and key expiry date organised in one polished workspace.
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
          selectedContract ? (
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
        {selectedContract ? (
          <View style={styles.modalSection}>
            <View style={styles.detailHeaderCard}>
              <View style={[styles.notificationIconWrap, styles.notificationIconWrapPrimary]}>
                <MaterialIcons color={palette.primary} name="description" size={20} />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailHeaderTitle}>{selectedContract.contractNumber}</Text>
                <Text style={styles.detailHeaderMeta}>{selectedContract.contractingParties}</Text>
              </View>
              <View
                style={[
                  styles.contractStatusPill,
                  getContractStatus(selectedContract) === 'ACTIVE'
                    ? styles.contractStatusPillActive
                    : getContractStatus(selectedContract) === 'EXPIRING'
                      ? styles.contractStatusPillExpiring
                      : getContractStatus(selectedContract) === 'UPCOMING'
                        ? styles.contractStatusPillUpcoming
                        : styles.contractStatusPillExpired,
                ]}>
                <Text style={styles.contractStatusText}>{getContractStatus(selectedContract)}</Text>
              </View>
            </View>

            <View style={styles.detailList}>
              <DetailRow label="Start date" value={formatLongDate(selectedContract.contractStartDate)} />
              <DetailRow label="Expiry date" value={formatLongDate(selectedContract.contractExpiryDate)} />
              <DetailRow
                label="Notifications"
                value={selectedContract.allowPushNotif ? 'Enabled' : 'Disabled'}
              />
              <DetailRow
                label="Description"
                value={selectedContract.description?.trim() || 'No description provided'}
              />
              <DetailRow
                label="Contract file"
                value={selectedContract.contractFileName ?? 'No file attached'}
              />
              {selectedContract.contractFileName ? (
                <DetailRow
                  label="File size"
                  value={formatFileSize(selectedContract.contractFileSize)}
                />
              ) : null}
            </View>

            {selectedContract.contractFileUrl ? (
              <Pressable style={styles.fileOpenButton} onPress={() => handleOpenFile(selectedContract.contractFileUrl)}>
                <MaterialIcons color={palette.primary} name="open-in-new" size={18} />
                <Text style={styles.fileOpenButtonText}>Open contract file</Text>
              </Pressable>
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
            <Pressable style={styles.actionMenuItem} onPress={handleEditContract}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="edit" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Edit</Text>
            </Pressable>
            {selectedContract.contractFileUrl ? (
              <Pressable
                style={styles.actionMenuItem}
                onPress={() => {
                  setContractActionMenuOpen(false);
                  handleOpenFile(selectedContract.contractFileUrl);
                }}>
                <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                  <MaterialIcons color={palette.primary} name="attach-file" size={18} />
                </View>
                <Text style={styles.actionMenuTitle}>Open file</Text>
              </Pressable>
            ) : null}
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
                setInfoModal({
                  eyebrow: 'Support',
                  message: 'Support workspace can be connected next.',
                  title: 'Support',
                  visible: true,
                });
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
    borderColor: 'rgba(192, 199, 214, 0.4)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  fileOpenButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 92, 171, 0.08)',
    borderColor: 'rgba(0, 92, 171, 0.16)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
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
    columnGap: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -4,
    paddingHorizontal: spacing.marginMobile,
    rowGap: spacing.md,
  },
  viewModalFrame: {
    maxHeight: '75%',
  } as ViewStyle,
});
