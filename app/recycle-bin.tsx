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
  getRecycleBinItemById,
  getRecycleBinItems,
  permanentlyDeleteRecycleBinItem,
  restoreRecycleBinItem,
  type RecycleBinEntityType,
  type RecycleBinItemRecord,
} from '@/features/recycle-bin/recycle-bin-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type BinFilter = 'ALL' | RecycleBinEntityType;

type RecycleBinSummaryCard = {
  count: string;
  filter: BinFilter;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: SummaryCardTone;
  label: string;
  title: string;
};

type ActionMenuPosition = { top: number };

const ACTION_MENU_HEIGHT = 216;

const ENTITY_CONFIG: Record<
  RecycleBinEntityType,
  {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    tone: SummaryCardTone;
  }
> = {
  CONTRACT: { icon: 'description', label: 'Contract', tone: 'secondary' },
  COVER: { icon: 'shield', label: 'Cover', tone: 'tertiary' },
  JOURNAL: { icon: 'menu-book', label: 'Journal', tone: 'primary' },
  SUPPORT_TICKET: { icon: 'contact-support', label: 'Support', tone: 'neutral' },
  TASK: { icon: 'assignment', label: 'Task', tone: 'primary' },
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getPurgeLabel(daysRemaining: number) {
  if (daysRemaining <= 0) {
    return 'Purges today';
  }

  if (daysRemaining === 1) {
    return '1 day left';
  }

  return `${daysRemaining} days left`;
}

function buildSummaryCards(items: RecycleBinItemRecord[]): RecycleBinSummaryCard[] {
  const counts = items.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.entityType] = (acc[item.entityType] ?? 0) + 1;
      return acc;
    },
    { total: 0 } as Record<string, number>,
  );

  return [
    {
      count: String(counts.total ?? 0),
      filter: 'ALL',
      icon: 'delete-sweep',
      iconTone: 'primary',
      label: 'All Items',
      title: 'Total',
    },
    {
      count: String(counts.JOURNAL ?? 0),
      filter: 'JOURNAL',
      icon: ENTITY_CONFIG.JOURNAL.icon,
      iconTone: ENTITY_CONFIG.JOURNAL.tone,
      label: 'Journal Entries',
      title: 'Journal',
    },
    {
      count: String(counts.TASK ?? 0),
      filter: 'TASK',
      icon: ENTITY_CONFIG.TASK.icon,
      iconTone: ENTITY_CONFIG.TASK.tone,
      label: 'Task Items',
      title: 'Tasks',
    },
    {
      count: String((counts.COVER ?? 0) + (counts.CONTRACT ?? 0) + (counts.SUPPORT_TICKET ?? 0)),
      filter: 'COVER',
      icon: 'inventory-2',
      iconTone: 'secondary',
      label: 'Other Records',
      title: 'Other',
    },
  ];
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function RecycleBinScreen() {
  const { logout, session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const { height, width } = useWindowDimensions();

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [items, setItems] = useState<RecycleBinItemRecord[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BinFilter>('ALL');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RecycleBinItemRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [restoreSubmitting, setRestoreSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState<ActionMenuPosition>({ top: 0 });
  const [infoModal, setInfoModal] = useState({
    eyebrow: '',
    message: '',
    title: '',
    visible: false,
  });

  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();
  const cardWidth = (width - spacing.marginMobile * 2 - spacing.md) / 2;

  const summaryCards = useMemo(() => buildSummaryCards(items), [items]);
  const selectedItemFromList = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      if (filter !== 'ALL') {
        if (filter === 'COVER') {
          if (!['COVER', 'CONTRACT', 'SUPPORT_TICKET'].includes(item.entityType)) {
            return false;
          }
        } else if (item.entityType !== filter) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      return [
        item.displayTitle,
        item.displayDescription ?? '',
        item.entityType,
        ENTITY_CONFIG[item.entityType].label,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [filter, items, search]);

  const loadItems = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session?.accessToken) {
        return;
      }

      const silent = options?.silent ?? false;
      if (!silent) {
        setItemsLoading(true);
      }

      try {
        const result = await getRecycleBinItems(session.accessToken, { page: 1, pageSize: 100 });
        setItems(result.data);
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) {
          showToast(error instanceof Error ? error.message : 'Unable to load recycle bin.', 'error');
        }
      } finally {
        if (!silent) {
          setItemsLoading(false);
        }
      }
    },
    [session?.accessToken, showToast],
  );

  useFocusEffect(
    useCallback(() => {
      if (!session?.accessToken) {
        setItems([]);
        return;
      }

      loadItems();
    }, [loadItems, session?.accessToken]),
  );

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  async function fetchItemDetail(itemId: string) {
    if (!session?.accessToken) {
      return null;
    }

    setDetailLoading(true);

    try {
      const item = await getRecycleBinItemById(session.accessToken, itemId);
      setSelectedItem(item);
      return item;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to load recycle-bin details.', 'error');
      }
      return null;
    } finally {
      setDetailLoading(false);
    }
  }

  function handleBottomNavPress(key: string) {
    if (key === 'home') {
      router.replace('/dashboard');
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
      router.push('/contracts');
      return;
    }
    if (key === 'covers') {
      router.push('/covers');
      return;
    }
    if (key === 'more') {
      setMoreMenuOpen((current) => !current);
    }
  }

  function handleLogout() {
    setMoreMenuOpen(false);
    logout({ animated: true, redirectToLogin: true });
  }

  function handleItemPress(itemId: string, event: GestureResponderEvent) {
    const maxTop = Math.max(112, height - ACTION_MENU_HEIGHT - 112);
    setSelectedItemId(itemId);
    setSelectedItem(null);
    setActionMenuPosition({
      top: Math.min(maxTop, Math.max(112, event.nativeEvent.pageY - 6)),
    });
    setActionMenuOpen(true);
  }

  async function handleViewItem() {
    if (!selectedItemId) {
      return;
    }

    setActionMenuOpen(false);
    const item = await fetchItemDetail(selectedItemId);
    if (item) {
      setDetailOpen(true);
    }
  }

  async function handleRestoreItem() {
    if (!selectedItemId || !session?.accessToken || restoreSubmitting) {
      return;
    }

    setActionMenuOpen(false);
    setRestoreSubmitting(true);

    try {
      await restoreRecycleBinItem(session.accessToken, selectedItemId);
      setDetailOpen(false);
      setSelectedItemId(null);
      setSelectedItem(null);
      showToast('Item restored successfully.');
      await loadItems({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to restore item.', 'error');
      }
    } finally {
      setRestoreSubmitting(false);
    }
  }

  function handleDeletePrompt() {
    setActionMenuOpen(false);
    setDeleteConfirmOpen(true);
  }

  async function handlePermanentDelete() {
    if (!selectedItemId || !session?.accessToken) {
      return;
    }

    setDeleteSubmitting(true);
    try {
      await permanentlyDeleteRecycleBinItem(session.accessToken, selectedItemId);
      setDeleteConfirmOpen(false);
      setDetailOpen(false);
      setSelectedItemId(null);
      setSelectedItem(null);
      showToast('Recycle-bin item deleted permanently.');
      await loadItems({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to delete item permanently.', 'error');
      }
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        bottomSlot={<FloatingBottomNav activeKey="more" onPress={handleBottomNavPress} />}
        onBackPress={() => router.replace('/dashboard')}
        onNotificationPress={() =>
          setInfoModal({
            eyebrow: 'Recycle Bin',
            message: 'Restore soft-deleted items or permanently remove them from your workspace history.',
            title: 'Recycle Bin',
            visible: true,
          })
        }
        onProfilePress={() => router.push('/profile')}
        profileImageUrl={session.profileImageUrl}
        refreshControl={<RefreshControl refreshing={itemsLoading} tintColor={palette.primary} onRefresh={() => loadItems()} />}
        scrollViewProps={{
          onScrollBeginDrag: () => {
            setMoreMenuOpen(false);
            setActionMenuOpen(false);
          },
        }}
        title="Recycle Bin">
        <View style={styles.heroSection}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Recycle Bin</Text>
              <Text style={styles.heroBody}>
                Review removed records, restore what you need, or clear items permanently before auto-purge.
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <MaterialIcons color={palette.white} name="delete-sweep" size={18} />
              <Text style={styles.heroBadgeText}>{items.length} items</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <SummaryCard
              active={filter === card.filter}
              count={card.count}
              icon={card.icon}
              iconTone={card.iconTone}
              key={card.filter}
              label={card.label}
              style={{ width: cardWidth }}
              title={card.title}
              onPress={() => setFilter(card.filter)}
            />
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Deleted Items</Text>
            <Text style={styles.sectionCount}>{filteredItems.length} visible</Text>
          </View>

          <View style={styles.searchBar}>
            <MaterialIcons color={palette.onSurfaceVariant} name="search" size={18} />
            <TextInput
              placeholder="Search by title, description, or type"
              placeholderTextColor={palette.onSurfaceVariant}
              returnKeyType="search"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.listCard}>
            {itemsLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={palette.primary} size="small" />
                <Text style={styles.emptyStateBody}>Loading recycle-bin items...</Text>
              </View>
            ) : filteredItems.length ? (
              filteredItems.map((item, index) => {
                const config = ENTITY_CONFIG[item.entityType];

                return (
                  <Pressable
                    key={item.id}
                    style={[styles.itemRow, index < filteredItems.length - 1 ? styles.itemRowBorder : null]}
                    onPress={(event) => handleItemPress(item.id, event)}>
                    <View style={styles.itemRowLeft}>
                      <View style={[styles.itemIconWrap, iconToneStyles[config.tone]]}>
                        <MaterialIcons color={iconColor[config.tone]} name={config.icon} size={20} />
                      </View>
                      <View style={styles.itemCopy}>
                        <Text numberOfLines={1} style={styles.itemTitle}>{item.displayTitle}</Text>
                        <Text numberOfLines={1} style={styles.itemSubtitle}>
                          {item.displayDescription || `${config.label} removed from the active workspace.`}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {config.label} · Deleted {formatDateTime(item.deletedAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.itemRight}>
                      <View style={styles.daysPill}>
                        <Text style={styles.daysPillText}>{getPurgeLabel(item.daysRemaining)}</Text>
                      </View>
                      <Text style={styles.purgeDate}>Purge {formatDateTime(item.purgeAfter)}</Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons color={palette.primary} name="delete-sweep" size={28} />
                <Text style={styles.emptyStateTitle}>Recycle bin is clear</Text>
                <Text style={styles.emptyStateBody}>
                  {search.trim()
                    ? 'Try a different search term to find deleted items.'
                    : 'Deleted covers, contracts, tasks, journals, and support tickets will appear here.'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.promoCard}>
          <View style={styles.promoCopy}>
            <Text style={styles.promoTitle}>Retention window</Text>
            <Text style={styles.promoBody}>
              Restored items return to their original module. Permanent delete removes them completely and cannot be undone.
            </Text>
          </View>
          <MaterialIcons color="rgba(255,255,255,0.2)" name="restore-from-trash" size={136} style={styles.promoIcon} />
        </View>
      </FloatingPageShell>

      <AppModal
        frameStyle={styles.viewModalFrame}
        title="Recycle-bin item"
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}>
        {detailLoading ? (
          <View style={styles.modalLoadingState}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.modalLoadingText}>Loading recycle-bin details...</Text>
          </View>
        ) : selectedItem ? (
          <View style={styles.modalSection}>
            <View style={styles.detailHeaderCard}>
              <View style={[styles.detailHeaderIconWrap, iconToneStyles[ENTITY_CONFIG[selectedItem.entityType].tone]]}>
                <MaterialIcons
                  color={iconColor[ENTITY_CONFIG[selectedItem.entityType].tone]}
                  name={ENTITY_CONFIG[selectedItem.entityType].icon}
                  size={20}
                />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailHeaderTitle}>{selectedItem.displayTitle}</Text>
                <Text style={styles.detailHeaderMeta}>{ENTITY_CONFIG[selectedItem.entityType].label}</Text>
              </View>
            </View>

            <View style={styles.detailList}>
              <DetailRow label="Description" value={selectedItem.displayDescription || 'Not available'} />
              <DetailRow label="Deleted at" value={formatDateTime(selectedItem.deletedAt)} />
              <DetailRow label="Purge after" value={formatDateTime(selectedItem.purgeAfter)} />
              <DetailRow label="Days remaining" value={String(selectedItem.daysRemaining)} />
              <DetailRow label="Retention days" value={String(selectedItem.retentionDays)} />
            </View>
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <Text style={styles.modalLoadingText}>Item details are not available.</Text>
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
              onPress={handlePermanentDelete}>
              {deleteSubmitting ? (
                <ActivityIndicator color={palette.onError} size="small" />
              ) : (
                <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Delete forever</Text>
              )}
            </Pressable>
          </View>
        }
        frameStyle={styles.deleteModalFrame}
        title="Delete permanently?"
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}>
        <Text style={styles.modalIntro}>
          This permanently removes the selected item from the recycle bin and cannot be undone.
        </Text>
      </AppModal>

      {actionMenuOpen && selectedItemFromList ? (
        <>
          <Pressable style={styles.actionMenuBackdrop} onPress={() => setActionMenuOpen(false)} />
          <View style={[styles.actionMenu, { top: actionMenuPosition.top }]}>
            <Pressable style={styles.actionMenuItem} onPress={handleViewItem}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="visibility" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>View</Text>
            </Pressable>
            <View style={styles.actionMenuSeparator} />
            <Pressable
              disabled={restoreSubmitting}
              style={styles.actionMenuItem}
              onPress={handleRestoreItem}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                {restoreSubmitting ? (
                  <ActivityIndicator color={palette.primary} size="small" />
                ) : (
                  <MaterialIcons color={palette.primary} name="restore" size={18} />
                )}
              </View>
              <Text style={styles.actionMenuTitle}>Restore</Text>
            </Pressable>
            <View style={styles.actionMenuSeparator} />
            <Pressable style={styles.actionMenuItem} onPress={handleDeletePrompt}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconDanger]}>
                <MaterialIcons color={palette.error} name="delete-forever" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Delete forever</Text>
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
        onClose={() => setInfoModal((current) => ({ ...current, visible: false }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionMenu: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(0,92,171,0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: 168,
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
  daysPill: {
    backgroundColor: 'rgba(0, 92, 171, 0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  daysPillText: {
    color: palette.primary,
    fontSize: typography.label,
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
  detailHeaderIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
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
  heroBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: palette.white,
    fontSize: typography.bodySmall,
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
  itemCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  itemIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  itemMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    maxWidth: '38%',
  },
  itemRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  itemRowBorder: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  itemRowLeft: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  itemSubtitle: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
  },
  itemTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
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
    maxWidth: '72%',
  },
  promoCard: {
    backgroundColor: '#7C2D12',
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
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
    transform: [{ rotate: '10deg' }],
  },
  promoTitle: {
    color: palette.white,
    fontSize: typography.title,
    fontWeight: '700',
  },
  purgeDate: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    textAlign: 'right',
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
});

const iconToneStyles = StyleSheet.create({
  neutral: { backgroundColor: 'rgba(230, 232, 234, 0.5)' },
  primary: { backgroundColor: 'rgba(0, 92, 171, 0.1)' },
  secondary: { backgroundColor: 'rgba(207, 225, 248, 0.3)' },
  tertiary: { backgroundColor: 'rgba(181, 28, 0, 0.1)' },
});

const iconColor = {
  neutral: palette.outline,
  primary: palette.primary,
  secondary: palette.onSecondaryContainer,
  tertiary: palette.tertiary,
};
