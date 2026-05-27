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
  deleteJournal,
  getJournalById,
  getJournals,
  getTodayJournal,
  type JournalRecord,
} from '@/features/journal/journal-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type JournalSummaryCard = {
  count: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: SummaryCardTone;
  key: 'all' | 'filled' | 'month' | 'today';
  label: string;
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

const ACTION_MENU_HEIGHT = 216;

function formatDate(dateValue: string) {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateValue: string) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getPreviewText(journal: JournalRecord) {
  return (
    journal.thoughts ||
    journal.accomplishments ||
    journal.gratefulFor ||
    journal.affirmation ||
    journal.quoteOfTheDay ||
    journal.mood ||
    'No details added yet.'
  );
}

function getCompletionCount(journal: JournalRecord) {
  return [
    journal.mood,
    journal.thoughts,
    journal.quoteOfTheDay,
    journal.gratefulFor,
    journal.affirmation,
    journal.accomplishments,
  ].filter((value) => Boolean(value?.trim())).length;
}

function buildSummaryCards(journals: JournalRecord[], todayEntry: JournalRecord | null): JournalSummaryCard[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthCount = journals.filter((journal) => {
    const [year, month] = journal.journalDate.split('-').map(Number);
    return year === currentYear && month === currentMonth;
  }).length;
  const filledCount = journals.filter((journal) => getCompletionCount(journal) >= 3).length;

  return [
    { count: String(journals.length), icon: 'menu-book', iconTone: 'primary', key: 'all', label: 'All Entries', title: 'Total' },
    { count: String(monthCount), icon: 'calendar-month', iconTone: 'secondary', key: 'month', label: 'This Month', title: 'Month' },
    { count: String(filledCount), icon: 'auto-awesome', iconTone: 'tertiary', key: 'filled', label: 'Rich Notes', title: 'Filled' },
    { count: todayEntry ? 'Ready' : 'Open', icon: 'today', iconTone: 'neutral', key: 'today', label: 'Today', title: 'Status' },
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

export default function JournalsScreen() {
  const { logout, session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const { height, width } = useWindowDimensions();

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [journals, setJournals] = useState<JournalRecord[]>([]);
  const [todayEntry, setTodayEntry] = useState<JournalRecord | null>(null);
  const [journalsLoading, setJournalsLoading] = useState(false);
  const [journalSearch, setJournalSearch] = useState('');
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<JournalRecord | null>(null);
  const [journalDetailOpen, setJournalDetailOpen] = useState(false);
  const [journalDetailLoading, setJournalDetailLoading] = useState(false);
  const [journalActionMenuOpen, setJournalActionMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState<ActionMenuPosition>({ top: 0 });
  const [infoModal, setInfoModal] = useState<InfoModalState>({
    eyebrow: '',
    message: '',
    title: '',
    visible: false,
  });

  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();
  const cardWidth = (width - spacing.marginMobile * 2 - spacing.md) / 2;

  const filteredJournals = useMemo(() => {
    const query = journalSearch.trim().toLowerCase();

    return journals.filter((journal) => {
      if (!query) {
        return true;
      }

      return [
        journal.journalDate,
        journal.mood ?? '',
        journal.thoughts ?? '',
        journal.quoteOfTheDay ?? '',
        journal.gratefulFor ?? '',
        journal.affirmation ?? '',
        journal.accomplishments ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [journalSearch, journals]);

  const summaryCards = useMemo(() => buildSummaryCards(journals, todayEntry), [journals, todayEntry]);
  const selectedJournalFromList = useMemo(
    () => journals.find((journal) => journal.id === selectedJournalId) ?? null,
    [journals, selectedJournalId],
  );

  const loadJournals = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session?.accessToken) {
        return;
      }

      const silent = options?.silent ?? false;
      if (!silent) {
        setJournalsLoading(true);
      }

      try {
        const [journalList, currentDay] = await Promise.all([
          getJournals(session.accessToken, { page: 1, pageSize: 100 }),
          getTodayJournal(session.accessToken),
        ]);

        setJournals(journalList.data);
        setTodayEntry(currentDay);
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) {
          showToast(error instanceof Error ? error.message : 'Unable to load journal entries.', 'error');
        }
      } finally {
        if (!silent) {
          setJournalsLoading(false);
        }
      }
    },
    [session?.accessToken, showToast],
  );

  useFocusEffect(
    useCallback(() => {
      if (!session?.accessToken) {
        setJournals([]);
        setTodayEntry(null);
        return;
      }

      loadJournals();
    }, [loadJournals, session?.accessToken]),
  );

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  async function fetchJournalDetail(journalId: string) {
    if (!session?.accessToken) {
      return null;
    }

    setJournalDetailLoading(true);

    try {
      const journal = await getJournalById(session.accessToken, journalId);
      setSelectedJournal(journal);
      return journal;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to load journal details.', 'error');
      }
      return null;
    } finally {
      setJournalDetailLoading(false);
    }
  }

  function handleBottomNavPress(key: string) {
    if (key === 'home') {
      router.replace('/dashboard');
      return;
    }

    if (key === 'journals') {
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

  function handleOpenCreate() {
    if (todayEntry) {
      router.push({
        params: { id: todayEntry.id, mode: 'edit' },
        pathname: '/journal-form',
      });
      return;
    }

    router.push('/journal-form');
  }

  function handleJournalPress(journalId: string, event: GestureResponderEvent) {
    const maxTop = Math.max(112, height - ACTION_MENU_HEIGHT - 112);
    setSelectedJournalId(journalId);
    setSelectedJournal(null);
    setActionMenuPosition({
      top: Math.min(maxTop, Math.max(112, event.nativeEvent.pageY - 6)),
    });
    setJournalActionMenuOpen(true);
  }

  async function handleViewJournal() {
    if (!selectedJournalId) {
      return;
    }

    setJournalActionMenuOpen(false);
    const journal = await fetchJournalDetail(selectedJournalId);

    if (journal) {
      setJournalDetailOpen(true);
    }
  }

  function handleEditJournal() {
    if (!selectedJournalId) {
      return;
    }

    setJournalActionMenuOpen(false);
    router.push({
      params: { id: selectedJournalId, mode: 'edit' },
      pathname: '/journal-form',
    });
  }

  function handleDeletePrompt() {
    setJournalActionMenuOpen(false);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteJournal() {
    if (!selectedJournalId || !session?.accessToken) {
      return;
    }

    setDeleteSubmitting(true);

    try {
      await deleteJournal(session.accessToken, selectedJournalId);
      setDeleteConfirmOpen(false);
      setSelectedJournalId(null);
      setSelectedJournal(null);
      setJournalDetailOpen(false);
      showToast('Journal deleted successfully.');
      await loadJournals({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to delete journal.', 'error');
      }
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        bottomSlot={<FloatingBottomNav activeKey={moreMenuOpen ? 'more' : 'journals'} onPress={handleBottomNavPress} />}
        notificationCount={todayEntry ? 0 : 1}
        onBackPress={() => router.replace('/dashboard')}
        onNotificationPress={() => {
          if (todayEntry) {
            router.push({
              params: { id: todayEntry.id, mode: 'edit' },
              pathname: '/journal-form',
            });
            return;
          }

          router.push('/journal-form');
        }}
        onProfilePress={() =>
          setInfoModal({
            eyebrow: 'Account',
            message: `Signed in as ${session.email}`,
            title: 'Account',
            visible: true,
          })
        }
        profileImageUrl={session.profileImageUrl}
        refreshControl={<RefreshControl refreshing={journalsLoading} tintColor={palette.primary} onRefresh={() => loadJournals()} />}
        scrollViewProps={{
          onScrollBeginDrag: () => {
            setMoreMenuOpen(false);
            setJournalActionMenuOpen(false);
          },
        }}
        title="Journal">
        <View style={styles.heroSection}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Journal Entries</Text>
              <Text style={styles.heroBody}>
                Keep your daily reflections, gratitude, affirmation, and progress in one dedicated workspace.
              </Text>
            </View>
            <Pressable style={styles.addButton} onPress={handleOpenCreate}>
              <MaterialIcons color={palette.white} name={todayEntry ? 'edit' : 'add'} size={18} />
              <Text style={styles.addButtonText}>{todayEntry ? 'Edit today' : 'New entry'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map((item) => (
            <SummaryCard
              key={item.key}
              count={item.count}
              icon={item.icon}
              iconTone={item.iconTone}
              label={item.label}
              style={{ width: cardWidth }}
              title={item.title}
            />
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Journal Timeline</Text>
            <Text style={styles.sectionCount}>{filteredJournals.length} visible</Text>
          </View>

          <View style={styles.searchBar}>
            <MaterialIcons color={palette.onSurfaceVariant} name="search" size={18} />
            <TextInput
              placeholder="Search by date, mood, or journal notes"
              placeholderTextColor={palette.onSurfaceVariant}
              returnKeyType="search"
              style={styles.searchInput}
              value={journalSearch}
              onChangeText={setJournalSearch}
            />
          </View>

          <View style={styles.listCard}>
            {journalsLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={palette.primary} size="small" />
                <Text style={styles.emptyStateBody}>Loading your journal entries...</Text>
              </View>
            ) : filteredJournals.length ? (
              filteredJournals.map((journal, index) => (
                <Pressable
                  key={journal.id}
                  style={[styles.journalRow, index < filteredJournals.length - 1 ? styles.journalRowBorder : null]}
                  onPress={(event) => handleJournalPress(journal.id, event)}>
                  <View style={styles.journalRowLeft}>
                    <View style={styles.journalDateBadge}>
                      <MaterialIcons color={palette.primary} name="calendar-today" size={18} />
                    </View>
                    <View style={styles.journalCopy}>
                      <Text style={styles.journalDate}>{formatDate(journal.journalDate)}</Text>
                      <Text numberOfLines={1} style={styles.journalPreview}>
                        {getPreviewText(journal)}
                      </Text>
                      <Text style={styles.journalMeta}>
                        {journal.mood?.trim() ? `Mood: ${journal.mood}` : `${getCompletionCount(journal)} sections filled`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.journalRight}>
                    <View style={styles.completionPill}>
                      <Text style={styles.completionText}>{getCompletionCount(journal)}/6</Text>
                    </View>
                    <Text style={styles.journalUpdatedAt}>Updated {formatDateTime(journal.updatedAt)}</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons color={palette.primary} name="menu-book" size={28} />
                <Text style={styles.emptyStateTitle}>No journal entries found</Text>
                <Text style={styles.emptyStateBody}>
                  {journalSearch.trim()
                    ? 'Try a different search term to find your notes.'
                    : 'Create your first journal entry to start tracking your daily reflections.'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.promoCard}>
          <View style={styles.promoCopy}>
            <Text style={styles.promoTitle}>Daily reflection rhythm</Text>
            <Text style={styles.promoBody}>
              {todayEntry
                ? 'Today already has an entry. Revisit it to sharpen your wins, gratitude, and direction.'
                : 'A short journal entry each day helps keep your goals, mindset, and momentum visible.'}
            </Text>
          </View>
          <MaterialIcons color="rgba(255,255,255,0.2)" name="auto-stories" size={140} style={styles.promoIcon} />
        </View>
      </FloatingPageShell>

      <AppModal
        frameStyle={styles.viewModalFrame}
        title="Journal entry"
        visible={journalDetailOpen}
        onClose={() => setJournalDetailOpen(false)}>
        {journalDetailLoading ? (
          <View style={styles.modalLoadingState}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.modalLoadingText}>Loading journal details...</Text>
          </View>
        ) : selectedJournal ? (
          <View style={styles.modalSection}>
            <View style={styles.detailHeaderCard}>
              <View style={styles.detailHeaderIconWrap}>
                <MaterialIcons color={palette.primary} name="menu-book" size={20} />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailHeaderTitle}>{formatDate(selectedJournal.journalDate)}</Text>
                <Text style={styles.detailHeaderMeta}>Updated {formatDateTime(selectedJournal.updatedAt)}</Text>
              </View>
            </View>

            <View style={styles.detailList}>
              <DetailRow label="Mood" value={selectedJournal.mood || 'Not added'} />
              <DetailRow label="Thoughts" value={selectedJournal.thoughts || 'Not added'} />
              <DetailRow label="Quote of the day" value={selectedJournal.quoteOfTheDay || 'Not added'} />
              <DetailRow label="Grateful for" value={selectedJournal.gratefulFor || 'Not added'} />
              <DetailRow label="Affirmation" value={selectedJournal.affirmation || 'Not added'} />
              <DetailRow label="Accomplishments" value={selectedJournal.accomplishments || 'Not added'} />
            </View>
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <Text style={styles.modalLoadingText}>Journal details are not available.</Text>
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
              onPress={handleDeleteJournal}>
              {deleteSubmitting ? (
                <ActivityIndicator color={palette.onError} size="small" />
              ) : (
                <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Delete entry</Text>
              )}
            </Pressable>
          </View>
        }
        frameStyle={styles.deleteModalFrame}
        title="Delete journal?"
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}>
        <Text style={styles.modalIntro}>
          This removes the selected journal entry from your active workspace and sends it to the recycle flow.
        </Text>
      </AppModal>

      {journalActionMenuOpen && selectedJournalFromList ? (
        <>
          <Pressable style={styles.actionMenuBackdrop} onPress={() => setJournalActionMenuOpen(false)} />
          <View style={[styles.actionMenu, { top: actionMenuPosition.top }]}>
            <Pressable style={styles.actionMenuItem} onPress={handleViewJournal}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="visibility" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>View</Text>
            </Pressable>
            <View style={styles.actionMenuSeparator} />
            <Pressable style={styles.actionMenuItem} onPress={handleEditJournal}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="edit" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Edit</Text>
            </Pressable>
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
  completionPill: {
    backgroundColor: 'rgba(0, 92, 171, 0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  completionText: {
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
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
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
  journalCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  journalDate: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  journalDateBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  journalMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
  },
  journalPreview: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
  },
  journalRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    maxWidth: '38%',
  },
  journalRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  journalRowBorder: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  journalRowLeft: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  journalUpdatedAt: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    textAlign: 'right',
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
    backgroundColor: '#0F766E',
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
