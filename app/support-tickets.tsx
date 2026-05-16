import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
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

import { AppModal } from '@/components/app/app-modal';
import { AppMessageModal } from '@/components/app/app-message-modal';
import { FloatingBottomNav } from '@/components/app/floating-bottom-nav';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { apiConfig } from '@/constants/api';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import {
  type SupportTicketRecord,
  type TicketStatus,
  addTicketComment,
  closeTicket,
  getSupportTicketById,
  getSupportTickets,
  reopenTicket,
} from '@/features/support-tickets/support-tickets-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';
import { SummaryCard, type SummaryCardTone } from '@/components/dashboard/summary-card';

type TicketFilter = 'ALL' | TicketStatus;

type TicketSummaryCard = {
  count: string;
  filter: TicketFilter;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: SummaryCardTone;
  label: string;
  title: string;
};

type ActionMenuPosition = { top: number };

const ACTION_MENU_HEIGHT = 160;

const CATEGORY_LABELS: Record<string, string> = {
  ACCOUNT_SUPPORT: 'Account Support',
  BUG_REPORT: 'Bug Report',
  FEATURE_REQUEST: 'Feature Request',
  GENERAL_ENQUIRY: 'General Enquiry',
  TECHNICAL_ISSUES: 'Technical Issues',
};

const PRIORITY_COLOURS: Record<string, string> = {
  HIGH: '#DC2626',
  LOW: '#16A34A',
  MEDIUM: '#D97706',
  URGENT: '#7C3AED',
};

const SUPPORT_COMPANY_DETAILS = {
  companyName: 'ManagePro',
  email: 'support@managepro.app',
  phone: '+254 700 000 000',
  supportHours: 'Monday to Friday, 8:00 AM to 5:00 PM',
  websiteLabel: 'www.managepro.app',
  websiteUrl: 'https://www.managepro.app',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getStatusStyle(status: TicketStatus) {
  switch (status) {
    case 'OPEN': return { bg: 'rgba(37,99,235,0.12)', dot: '#2563EB', text: '#1D4ED8' };
    case 'IN_PROGRESS': return { bg: 'rgba(217,119,6,0.12)', dot: '#D97706', text: '#B45309' };
    case 'RESOLVED': return { bg: 'rgba(22,163,74,0.12)', dot: '#16A34A', text: '#15803D' };
    case 'CLOSED': return { bg: 'rgba(100,116,139,0.12)', dot: '#64748B', text: '#475569' };
    case 'REOPENED': return { bg: 'rgba(124,58,237,0.12)', dot: '#7C3AED', text: '#6D28D9' };
  }
}

function getTimelineEventLabel(event: string) {
  switch (event) {
    case 'OPENED': return 'Ticket Opened';
    case 'IN_PROGRESS': return 'Marked In Progress';
    case 'RESOLVED': return 'Resolved by Support';
    case 'CLOSED': return 'Closed';
    case 'REOPENED': return 'Reopened';
    case 'COMMENT_ADDED': return 'Comment Added';
    default: return event;
  }
}

function getTimelineEventIcon(event: string): keyof typeof MaterialIcons.glyphMap {
  switch (event) {
    case 'OPENED': return 'open-in-new';
    case 'IN_PROGRESS': return 'hourglass-empty';
    case 'RESOLVED': return 'check-circle';
    case 'CLOSED': return 'lock';
    case 'REOPENED': return 'replay';
    case 'COMMENT_ADDED': return 'chat-bubble-outline';
    default: return 'radio-button-unchecked';
  }
}

function buildSummaryCards(tickets: SupportTicketRecord[]): TicketSummaryCard[] {
  const counts = tickets.reduce(
    (acc, t) => {
      acc.total += 1;
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    { total: 0 } as Record<string, number>,
  );

  return [
    { count: String(counts.total ?? 0), filter: 'ALL', icon: 'contact-support', iconTone: 'primary', label: 'All Tickets', title: 'Total' },
    { count: String(counts.OPEN ?? 0), filter: 'OPEN', icon: 'open-in-new', iconTone: 'secondary', label: 'Awaiting Reply', title: 'Open' },
    { count: String(counts.IN_PROGRESS ?? 0), filter: 'IN_PROGRESS', icon: 'hourglass-empty', iconTone: 'tertiary', label: 'Being Handled', title: 'In Progress' },
    { count: String((counts.RESOLVED ?? 0) + (counts.CLOSED ?? 0)), filter: 'RESOLVED', icon: 'check-circle', iconTone: 'neutral', label: 'Completed', title: 'Resolved' },
  ];
}

export default function SupportTicketsScreen() {
  const { session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const { height, width } = useWindowDimensions();

  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('ALL');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<ActionMenuPosition>({ top: 0 });
  const [ticketActionMenuOpen, setTicketActionMenuOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<SupportTicketRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [timelineOpen, setTimelineOpen] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentFile, setCommentFile] = useState<DocumentPickerAsset | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [supportContactModalOpen, setSupportContactModalOpen] = useState(false);

  const [infoModal, setInfoModal] = useState({ eyebrow: '', message: '', title: '', visible: false });

  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();
  const cardWidth = (width - spacing.marginMobile * 2 - spacing.md) / 2;

  const summaryCards = useMemo(() => buildSummaryCards(tickets), [tickets]);

  const filteredTickets = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase();
    return tickets.filter((t) => {
      if (ticketFilter !== 'ALL' && t.status !== ticketFilter) return false;
      if (!query) return true;
      return [t.ticketNumber, t.subject, t.category, t.priority, t.status]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [tickets, ticketFilter, ticketSearch]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  );

  const canUserClose = detailTicket
    ? ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPENED'].includes(detailTicket.status)
    : false;
  const canUserReopen = detailTicket
    ? ['RESOLVED', 'CLOSED'].includes(detailTicket.status)
    : false;
  const canComment = detailTicket
    ? detailTicket.status !== 'CLOSED'
    : false;

  const loadTickets = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session?.accessToken) return;
      const silent = options?.silent ?? false;
      if (!silent) setTicketsLoading(true);
      try {
        const records = await getSupportTickets(session.accessToken);
        setTickets(records);
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) {
          showToast(error instanceof Error ? error.message : 'Unable to load tickets.', 'error');
        }
      } finally {
        if (!silent) setTicketsLoading(false);
      }
    },
    [session?.accessToken, showToast],
  );

  useFocusEffect(
    useCallback(() => {
      if (!session?.accessToken) {
        setTickets([]);
        return;
      }
      loadTickets();
    }, [loadTickets, session?.accessToken]),
  );

  if (!session) return <Redirect href="/login" />;
  if (!subscriptionLoading && !hasActiveSubscription) return <Redirect href="/billing" />;

  async function fetchDetail(ticketId: string) {
    if (!session?.accessToken) return null;
    setDetailLoading(true);
    try {
      const t = await getSupportTicketById(session.accessToken, ticketId);
      setDetailTicket(t);
      return t;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to load ticket details.', 'error');
      }
      return null;
    } finally {
      setDetailLoading(false);
    }
  }

  function handleTicketPress(ticketId: string, event: GestureResponderEvent) {
    const maxTop = Math.max(112, height - ACTION_MENU_HEIGHT - 112);
    setSelectedTicketId(ticketId);
    setDetailTicket(null);
    setActionMenuPosition({ top: Math.min(maxTop, Math.max(112, event.nativeEvent.pageY - 6)) });
    setTicketActionMenuOpen(true);
  }

  async function handleViewTicket() {
    if (!selectedTicketId) return;
    setTicketActionMenuOpen(false);
    const t = await fetchDetail(selectedTicketId);
    if (t) setDetailOpen(true);
  }

  async function handleViewTimeline() {
    if (!selectedTicketId) return;
    setTicketActionMenuOpen(false);
    const t = await fetchDetail(selectedTicketId);
    if (t) setTimelineOpen(true);
  }

  async function handleCloseTicket() {
    if (!detailTicket || !session?.accessToken || actionSubmitting) return;
    setActionSubmitting(true);
    try {
      const updated = await closeTicket(session.accessToken, detailTicket.id);
      setDetailTicket(updated);
      showToast('Ticket marked as closed.');
      await loadTickets({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Failed to close ticket.', 'error');
      }
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleReopenTicket() {
    if (!detailTicket || !session?.accessToken || actionSubmitting) return;
    setActionSubmitting(true);
    try {
      const updated = await reopenTicket(session.accessToken, detailTicket.id);
      setDetailTicket(updated);
      showToast('Ticket reopened.');
      await loadTickets({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Failed to reopen ticket.', 'error');
      }
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handlePickCommentFile() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (asset) setCommentFile(asset);
  }

  async function handleSubmitComment() {
    if (!detailTicket || !session?.accessToken || !commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const updated = await addTicketComment(session.accessToken, detailTicket.id, {
        attachment: commentFile,
        message: commentText.trim(),
      });
      setDetailTicket(updated);
      setCommentText('');
      setCommentFile(null);
      setCommentModalOpen(false);
      showToast('Comment added.');
      await loadTickets({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Failed to add comment.', 'error');
      }
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleOpenTicketAttachment(
    ticketId: string,
    fileName: string,
    mimeType: string | null | undefined,
    endpointPath: string,
  ) {
    if (!session?.accessToken) {
      return;
    }

    try {
      const downloadedFile = await File.downloadFileAsync(
        `${apiConfig.baseUrl}${endpointPath}`,
        new File(Paths.cache, `${ticketId}-${sanitizeFileName(fileName)}`),
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          idempotent: true,
        }
      );

      const resolvedMimeType = mimeType ?? 'application/octet-stream';

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadedFile.uri, {
          UTI: resolvedMimeType,
          dialogTitle: fileName,
          mimeType: resolvedMimeType,
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

      showToast('Unable to preview this attachment on the device.', 'error');
    } catch {
      showToast('Unable to open attachment.', 'error');
    }
  }

  async function handleOpenSupportLink(url: string) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        showToast('This contact option is not available on the device.', 'error');
        return;
      }

      await Linking.openURL(url);
    } catch {
      showToast('Unable to open the contact link.', 'error');
    }
  }

  function handleBottomNavPress(key: string) {
    if (key === 'home') { router.replace('/dashboard'); return; }
    if (key === 'tasks') { router.push('/tasks'); return; }
    if (key === 'covers') { router.push('/covers'); return; }
    if (key === 'contracts') { router.push('/contracts'); return; }
    if (key === 'more') { setMoreMenuOpen((c) => !c); return; }
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        bottomSlot={<FloatingBottomNav activeKey={moreMenuOpen ? 'more' : 'support-tickets'} onPress={handleBottomNavPress} />}
        onBackPress={() => router.replace('/dashboard')}
        onNotificationPress={() => {}}
        onProfilePress={() => setInfoModal({ eyebrow: 'Account', message: `Signed in as ${session.email}`, title: 'Account', visible: true })}
        profileImageUrl={session.profileImageUrl}
        refreshControl={
          <RefreshControl refreshing={ticketsLoading} tintColor={palette.primary} onRefresh={() => loadTickets()} />
        }
        scrollViewProps={{ onScrollBeginDrag: () => { setMoreMenuOpen(false); setTicketActionMenuOpen(false); } }}
        title="Support">

        <View style={styles.heroSection}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Support Tickets</Text>
              <Text style={styles.heroBody}>
                Track your support requests from open to resolution.
              </Text>
            </View>
            <Pressable style={styles.addButton} onPress={() => router.push('/support-ticket-form')}>
              <MaterialIcons color={palette.white} name="add" size={18} />
              <Text style={styles.addButtonText}>New ticket</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <SummaryCard
              active={card.filter === ticketFilter || (card.filter === 'RESOLVED' && (ticketFilter === 'RESOLVED' || ticketFilter === 'CLOSED'))}
              count={card.count}
              icon={card.icon}
              iconTone={card.iconTone}
              key={card.filter}
              label={card.label}
              style={{ width: cardWidth }}
              title={card.title}
              onPress={() => setTicketFilter(card.filter === ticketFilter ? 'ALL' : card.filter)}
            />
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Ticket List</Text>
            <Text style={styles.sectionCount}>
              {filteredTickets.length} {ticketFilter === 'ALL' ? 'tickets' : `${ticketFilter.toLowerCase().replace('_', ' ')} tickets`}
            </Text>
          </View>

          <View style={styles.searchBar}>
            <MaterialIcons color={palette.onSurfaceVariant} name="search" size={18} />
            <TextInput
              placeholder="Search by number, subject, or status"
              placeholderTextColor={palette.onSurfaceVariant}
              returnKeyType="search"
              style={styles.searchInput}
              value={ticketSearch}
              onChangeText={setTicketSearch}
            />
          </View>

          <View style={styles.listCard}>
            {ticketsLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={palette.primary} size="small" />
                <Text style={styles.emptyStateBody}>Loading your tickets...</Text>
              </View>
            ) : filteredTickets.length ? (
              filteredTickets.map((ticket, index) => {
                const statusStyle = getStatusStyle(ticket.status);
                return (
                  <Pressable
                    key={ticket.id}
                    style={[styles.ticketRow, index < filteredTickets.length - 1 ? styles.ticketRowBorder : null]}
                    onPress={(e) => handleTicketPress(ticket.id, e)}>
                    <View style={styles.ticketRowLeft}>
                      <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
                      <View style={styles.ticketCopy}>
                        <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
                        <Text numberOfLines={1} style={styles.ticketSubject}>{ticket.subject}</Text>
                        <Text style={styles.ticketMeta}>{CATEGORY_LABELS[ticket.category] ?? ticket.category}</Text>
                      </View>
                    </View>
                    <View style={styles.ticketRight}>
                      <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                          {ticket.status.replace('_', ' ')}
                        </Text>
                      </View>
                      <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_COLOURS[ticket.priority]}20` }]}>
                        <Text style={[styles.priorityText, { color: PRIORITY_COLOURS[ticket.priority] }]}>
                          {ticket.priority}
                        </Text>
                      </View>
                      <Text style={styles.ticketDate}>{formatDate(ticket.createdAt)}</Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons color={palette.primary} name="contact-support" size={28} />
                <Text style={styles.emptyStateTitle}>No tickets found</Text>
                <Text style={styles.emptyStateBody}>
                  {tickets.length
                    ? 'Try a different search or filter.'
                    : 'Submit a ticket to get help from our support team.'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.promoCard, { backgroundColor: palette.primaryContainer }]}>
          <View style={styles.promoCopy}>
            <View style={styles.promoHeaderRow}>
              <Text style={styles.promoTitle}>Need Help?</Text>
              <Pressable style={styles.promoButton} onPress={() => setSupportContactModalOpen(true)}>
                <Text style={styles.promoButtonText}>Contact details</Text>
              </Pressable>
            </View>
            <Text style={styles.promoBody}>
              Our support team typically responds within 24 hours. Submit a ticket for the fastest resolution.
            </Text>
          </View>
          <MaterialIcons color="rgba(255,255,255,0.2)" name="support-agent" size={120} style={styles.promoIcon} />
        </View>
      </FloatingPageShell>

      {/* ── Ticket Detail Modal ── */}
      <AppModal
        footer={
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonOutline]}
              onPress={() => setSupportContactModalOpen(false)}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Close</Text>
            </Pressable>
          </View>
        }
        frameStyle={styles.contactModalFrame}
        title="Company Contact Details"
        visible={supportContactModalOpen}
        onClose={() => setSupportContactModalOpen(false)}>
        <View style={styles.contactModalContent}>
          <View style={styles.contactHeroCard}>
            <View style={styles.contactHeroIconWrap}>
              <MaterialIcons color={palette.primary} name="business" size={20} />
            </View>
            <View style={styles.contactHeroCopy}>
              <Text style={styles.contactHeroTitle}>{SUPPORT_COMPANY_DETAILS.companyName}</Text>
              <Text style={styles.contactHeroBody}>
                Reach our support team directly if you need company details or help outside the ticket queue.
              </Text>
            </View>
          </View>

          <View style={styles.contactInfoList}>
            <View style={styles.contactInfoRow}>
              <Text style={styles.contactInfoLabel}>Company</Text>
              <Text style={styles.contactInfoValue}>{SUPPORT_COMPANY_DETAILS.companyName}</Text>
            </View>
            <View style={styles.contactInfoRow}>
              <Text style={styles.contactInfoLabel}>Email</Text>
              <Text style={styles.contactInfoValue}>{SUPPORT_COMPANY_DETAILS.email}</Text>
            </View>
            <View style={styles.contactInfoRow}>
              <Text style={styles.contactInfoLabel}>Phone</Text>
              <Text style={styles.contactInfoValue}>{SUPPORT_COMPANY_DETAILS.phone}</Text>
            </View>
            <View style={styles.contactInfoRow}>
              <Text style={styles.contactInfoLabel}>Support Hours</Text>
              <Text style={styles.contactInfoValue}>{SUPPORT_COMPANY_DETAILS.supportHours}</Text>
            </View>
            <View style={styles.contactInfoRow}>
              <Text style={styles.contactInfoLabel}>Website</Text>
              <Text style={styles.contactInfoValue}>{SUPPORT_COMPANY_DETAILS.websiteLabel}</Text>
            </View>
          </View>

          <View style={styles.contactActionList}>
            <Pressable
              style={styles.contactActionButton}
              onPress={() => handleOpenSupportLink(`tel:${SUPPORT_COMPANY_DETAILS.phone.replace(/\s+/g, '')}`)}>
              <MaterialIcons color={palette.primary} name="phone" size={18} />
              <Text style={styles.contactActionText}>Call support</Text>
            </Pressable>
            <Pressable
              style={styles.contactActionButton}
              onPress={() => handleOpenSupportLink(`mailto:${SUPPORT_COMPANY_DETAILS.email}`)}>
              <MaterialIcons color={palette.primary} name="mail-outline" size={18} />
              <Text style={styles.contactActionText}>Email support</Text>
            </Pressable>
            <Pressable
              style={styles.contactActionButton}
              onPress={() => handleOpenSupportLink(SUPPORT_COMPANY_DETAILS.websiteUrl)}>
              <MaterialIcons color={palette.primary} name="language" size={18} />
              <Text style={styles.contactActionText}>Visit website</Text>
            </Pressable>
          </View>
        </View>
      </AppModal>

      <AppModal
        footer={
          detailTicket && !detailLoading ? (
            <View style={styles.modalFooter}>
              {canComment ? (
                <Pressable
                  style={[styles.modalButton, styles.modalButtonOutline]}
                  onPress={() => { setCommentModalOpen(true); }}>
                  <MaterialIcons color={palette.primary} name="chat-bubble-outline" size={16} />
                  <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Comment</Text>
                </Pressable>
              ) : null}
              {canUserReopen ? (
                <Pressable
                  disabled={actionSubmitting}
                  style={[styles.modalButton, styles.modalButtonOutline, actionSubmitting ? styles.modalButtonDisabled : null]}
                  onPress={handleReopenTicket}>
                  {actionSubmitting ? <ActivityIndicator color={palette.primary} size="small" /> : (
                    <>
                      <MaterialIcons color={palette.primary} name="replay" size={16} />
                      <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Reopen</Text>
                    </>
                  )}
                </Pressable>
              ) : canUserClose ? (
                <Pressable
                  disabled={actionSubmitting}
                  style={[styles.modalButton, actionSubmitting ? styles.modalButtonDisabled : null]}
                  onPress={handleCloseTicket}>
                  {actionSubmitting ? <ActivityIndicator color={palette.onPrimary} size="small" /> : (
                    <>
                      <MaterialIcons color={palette.onPrimary} name="check" size={16} />
                      <Text style={styles.modalButtonText}>Close Ticket</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : undefined
        }
        frameStyle={styles.detailModalFrame}
        title="Ticket Details"
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}>
        {detailLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.loadingText}>Loading ticket...</Text>
          </View>
        ) : detailTicket ? (
          <View style={styles.modalSection}>
            {/* Header card */}
            <View style={styles.detailHeaderCard}>
              <View style={[styles.iconWrap, { backgroundColor: `${getStatusStyle(detailTicket.status).dot}18` }]}>
                <MaterialIcons color={getStatusStyle(detailTicket.status).dot} name="contact-support" size={20} />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailHeaderNumber}>{detailTicket.ticketNumber}</Text>
                <Text numberOfLines={2} style={styles.detailHeaderSubject}>{detailTicket.subject}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: getStatusStyle(detailTicket.status).bg }]}>
                <Text style={[styles.statusText, { color: getStatusStyle(detailTicket.status).text }]}>
                  {detailTicket.status.replace('_', ' ')}
                </Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.detailList}>
              <DetailRow label="Category" value={CATEGORY_LABELS[detailTicket.category] ?? detailTicket.category} />
              <DetailRow label="Priority" value={detailTicket.priority} />
              <DetailRow label="Submitted" value={formatDateTime(detailTicket.createdAt)} />
              {detailTicket.resolvedAt ? <DetailRow label="Resolved" value={formatDateTime(detailTicket.resolvedAt)} /> : null}
              {detailTicket.closedAt ? <DetailRow label="Closed" value={formatDateTime(detailTicket.closedAt)} /> : null}
            </View>

            {/* Original message */}
            <View style={styles.messageCard}>
              <Text style={styles.messageSenderLabel}>Your Message</Text>
              <Text style={styles.messageText}>{detailTicket.message}</Text>
            </View>

            {/* Attachments */}
            {(detailTicket.attachments?.length ?? 0) > 0 ? (
              <View style={styles.attachmentList}>
                <Text style={styles.sectionSubLabel}>Attachments</Text>
                {detailTicket.attachments.map((att, index) => (
                  <Pressable
                    key={`${att.objectKey}-${index}`}
                    style={styles.attachmentRow}
                    onPress={() =>
                      handleOpenTicketAttachment(
                        detailTicket.id,
                        att.fileName,
                        att.mimeType,
                        `/support-tickets/${detailTicket.id}/attachments/${index}`,
                      )
                    }>
                    <View style={styles.attachmentIconWrap}>
                      <MaterialIcons color={palette.primary} name="attach-file" size={16} />
                    </View>
                    <View style={styles.attachmentCopy}>
                      <Text numberOfLines={1} style={styles.attachmentName}>{att.fileName}</Text>
                      <Text style={styles.attachmentSize}>{formatFileSize(att.size)}</Text>
                    </View>
                    <MaterialIcons color={palette.onSurfaceVariant} name="open-in-new" size={16} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Comments thread */}
            {(detailTicket.comments?.length ?? 0) > 0 ? (
              <View style={styles.commentThread}>
                <Text style={styles.sectionSubLabel}>Comments ({detailTicket.comments.length})</Text>
                {detailTicket.comments.map((comment) => (
                  <View
                    key={comment.id}
                    style={[
                      styles.commentBubble,
                      comment.authorRole === 'ADMIN' ? styles.commentBubbleAdmin : styles.commentBubbleUser,
                    ]}>
                    <View style={styles.commentBubbleHeader}>
                      <View style={[styles.commentAuthorBadge, comment.authorRole === 'ADMIN' ? styles.commentAuthorBadgeAdmin : styles.commentAuthorBadgeUser]}>
                        <MaterialIcons
                          color={comment.authorRole === 'ADMIN' ? palette.primary : palette.onSurface}
                          name={comment.authorRole === 'ADMIN' ? 'support-agent' : 'person'}
                          size={12}
                        />
                        <Text style={[styles.commentAuthorLabel, comment.authorRole === 'ADMIN' ? styles.commentAuthorLabelAdmin : null]}>
                          {comment.authorRole === 'ADMIN' ? 'Support Team' : 'You'}
                        </Text>
                      </View>
                      <Text style={styles.commentDate}>{formatDateTime(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.message}</Text>
                    {comment.attachment ? (
                      <Pressable
                        style={styles.commentAttachRow}
                        onPress={() => {
                          const attachment = comment.attachment;
                          if (!attachment) {
                            return;
                          }

                          handleOpenTicketAttachment(
                            detailTicket.id,
                            attachment.fileName,
                            attachment.mimeType,
                            `/support-tickets/${detailTicket.id}/comments/${comment.id}/attachment`,
                          );
                        }}>
                        <MaterialIcons color={palette.onSurfaceVariant} name="attach-file" size={14} />
                        <Text style={styles.commentAttachName}>{comment.attachment.fileName}</Text>
                        <Text style={styles.commentAttachSize}>· {formatFileSize(comment.attachment.size)}</Text>
                        <MaterialIcons color={palette.onSurfaceVariant} name="open-in-new" size={14} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noCommentsState}>
                <MaterialIcons color={palette.outline} name="chat-bubble-outline" size={22} />
                <Text style={styles.noCommentsText}>No comments yet.</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Ticket details unavailable.</Text>
          </View>
        )}
      </AppModal>

      {/* ── Timeline Modal ── */}
      <AppModal
        footer={
          <Pressable style={styles.modalButton} onPress={() => setTimelineOpen(false)}>
            <Text style={styles.modalButtonText}>Close</Text>
          </Pressable>
        }
        frameStyle={styles.viewModalFrame}
        title="Ticket Timeline"
        visible={timelineOpen}
        onClose={() => setTimelineOpen(false)}>
        {detailLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.loadingText}>Loading timeline...</Text>
          </View>
        ) : detailTicket?.timeline?.length ? (
          <View style={styles.timelineList}>
            {[...detailTicket.timeline].reverse().map((entry, index) => (
              <View key={`${entry.timestamp}-${index}`} style={styles.timelineItem}>
                <View style={styles.timelineLeftCol}>
                  <View style={[styles.timelineIconWrap, { backgroundColor: entry.actorRole === 'ADMIN' ? 'rgba(0,92,171,0.1)' : 'rgba(22,163,74,0.1)' }]}>
                    <MaterialIcons
                      color={entry.actorRole === 'ADMIN' ? palette.primary : '#16A34A'}
                      name={getTimelineEventIcon(entry.event)}
                      size={16}
                    />
                  </View>
                  {index < detailTicket.timeline.length - 1 ? <View style={styles.timelineConnector} /> : null}
                </View>
                <View style={styles.timelineCopy}>
                  <Text style={styles.timelineEventLabel}>{getTimelineEventLabel(entry.event)}</Text>
                  <Text style={styles.timelineActor}>
                    {entry.actorRole === 'ADMIN' ? 'Support Team' : 'You'} · {formatDateTime(entry.timestamp)}
                  </Text>
                  {entry.note ? <Text style={styles.timelineNote}>{entry.note}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.loadingState}>
            <MaterialIcons color={palette.outline} name="history" size={28} />
            <Text style={styles.loadingText}>No timeline events yet.</Text>
          </View>
        )}
      </AppModal>

      {/* ── Add Comment Modal ── */}
      <AppModal
        footer={
          <View style={styles.modalFooter}>
            <Pressable
              disabled={commentSubmitting}
              style={[styles.modalButton, styles.modalButtonOutline]}
              onPress={() => { setCommentModalOpen(false); setCommentText(''); setCommentFile(null); }}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={commentSubmitting || !commentText.trim()}
              style={[styles.modalButton, commentSubmitting || !commentText.trim() ? styles.modalButtonDisabled : null]}
              onPress={handleSubmitComment}>
              {commentSubmitting ? (
                <ActivityIndicator color={palette.onPrimary} size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Send</Text>
              )}
            </Pressable>
          </View>
        }
        frameStyle={styles.commentModalFrame}
        title="Add Comment"
        visible={commentModalOpen}
        onClose={() => { setCommentModalOpen(false); setCommentText(''); setCommentFile(null); }}>
        <View style={styles.commentInputBlock}>
          <TextInput
            multiline
            numberOfLines={4}
            placeholder="Describe the issue or provide an update..."
            placeholderTextColor={palette.onSurfaceVariant}
            style={styles.commentTextArea}
            value={commentText}
            onChangeText={setCommentText}
          />
          {commentFile ? (
            <View style={styles.commentFileRow}>
              <View style={styles.attachmentIconWrap}>
                <MaterialIcons color={palette.primary} name="attach-file" size={16} />
              </View>
              <Text numberOfLines={1} style={styles.attachmentName}>{commentFile.name}</Text>
              <Pressable hitSlop={8} onPress={() => setCommentFile(null)}>
                <MaterialIcons color={palette.error} name="close" size={18} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.attachButton} onPress={handlePickCommentFile}>
              <MaterialIcons color={palette.onSurfaceVariant} name="attach-file" size={16} />
              <Text style={styles.attachButtonText}>Attach a file (optional)</Text>
            </Pressable>
          )}
        </View>
      </AppModal>

      {/* ── Action Menu ── */}
      {ticketActionMenuOpen && selectedTicket ? (
        <>
          <Pressable style={styles.actionMenuBackdrop} onPress={() => setTicketActionMenuOpen(false)} />
          <View style={[styles.actionMenu, { top: actionMenuPosition.top }]}>
            <Pressable style={styles.actionMenuItem} onPress={handleViewTicket}>
              <View style={[styles.actionMenuIconWrap, { backgroundColor: 'rgba(0,92,171,0.1)' }]}>
                <MaterialIcons color={palette.primary} name="visibility" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>View</Text>
            </Pressable>
            <Pressable style={styles.actionMenuItem} onPress={handleViewTimeline}>
              <View style={[styles.actionMenuIconWrap, { backgroundColor: 'rgba(0,92,171,0.1)' }]}>
                <MaterialIcons color={palette.primary} name="history" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Timeline</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {/* ── More Menu ── */}
      {moreMenuOpen ? (
        <>
          <Pressable style={styles.moreMenuBackdrop} onPress={() => setMoreMenuOpen(false)} />
          <View style={styles.moreMenu}>
            <Pressable
              style={styles.moreMenuItem}
              onPress={() => { setMoreMenuOpen(false); router.push('/billing'); }}>
              <View style={styles.moreMenuIconWrap}>
                <MaterialIcons color={palette.primary} name="verified-user" size={20} />
              </View>
              <View style={styles.moreMenuCopy}>
                <Text style={styles.moreMenuTitle}>Billing</Text>
                <Text style={styles.moreMenuSubtitle}>Manage subscription and payments</Text>
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
        onClose={() => setInfoModal((c) => ({ ...c, visible: false }))}
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
  heroSection: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.lg,
  },
  heroHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  heroCopy: { flex: 1, gap: spacing.xs },
  heroTitle: { color: palette.white, fontSize: typography.display, fontWeight: '700' },
  heroBody: { color: 'rgba(255,255,255,0.84)', fontSize: typography.body },
  addButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  addButtonText: { color: palette.white, fontSize: typography.bodySmall, fontWeight: '700' },

  summaryGrid: {
    columnGap: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -4,
    paddingHorizontal: spacing.marginMobile,
    rowGap: spacing.md,
  },

  sectionBlock: { gap: spacing.md, marginTop: spacing.lg, paddingHorizontal: spacing.marginMobile },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionLabel: { color: palette.white, fontSize: typography.label, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionCount: { color: 'rgba(255,255,255,0.76)', fontSize: typography.bodySmall, fontWeight: '600' },
  sectionSubLabel: { color: palette.onSurfaceVariant, fontSize: typography.label, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },

  searchBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: { color: palette.onSurface, flex: 1, fontSize: typography.body, paddingVertical: spacing.xs },

  listCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },

  ticketRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  ticketRowBorder: { borderBottomColor: '#F1F5F9', borderBottomWidth: 1 },
  ticketRowLeft: { alignItems: 'flex-start', flex: 1, flexDirection: 'row', gap: spacing.sm },
  statusDot: { borderRadius: radius.pill, height: 10, marginTop: 4, width: 10 },
  ticketCopy: { flex: 1, gap: 2 },
  ticketNumber: { color: palette.onSurface, fontSize: typography.body, fontWeight: '700' },
  ticketSubject: { color: palette.onSurface, fontSize: typography.bodySmall },
  ticketMeta: { color: palette.onSurfaceVariant, fontSize: typography.label },
  ticketRight: { alignItems: 'flex-end', gap: spacing.xs },
  ticketDate: { color: palette.onSurfaceVariant, fontSize: typography.label },

  statusPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusText: { fontSize: typography.label, fontWeight: '700' },
  priorityBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  priorityText: { fontSize: typography.label, fontWeight: '700' },

  emptyState: { alignItems: 'center', gap: spacing.sm, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  emptyStateTitle: { color: palette.onSurface, fontSize: typography.body, fontWeight: '700' },
  emptyStateBody: { color: palette.onSurfaceVariant, fontSize: typography.bodySmall, textAlign: 'center' },

  promoCard: {
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  promoCopy: { gap: spacing.xs, zIndex: 1 },
  promoHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  promoButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 42,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  promoButtonText: { color: palette.onPrimaryContainer, fontSize: typography.bodySmall, fontWeight: '700' },
  promoTitle: { color: palette.onPrimaryContainer, fontSize: typography.title, fontWeight: '700' },
  promoBody: { color: 'rgba(254,252,255,0.9)', fontSize: typography.bodySmall, maxWidth: '70%' },
  promoIcon: { bottom: -24, position: 'absolute', right: -12, transform: [{ rotate: '12deg' }] },

  // Detail modal
  contactModalFrame: { maxWidth: 460 } as ViewStyle,
  detailModalFrame: { maxHeight: '85%' } as ViewStyle,
  viewModalFrame: { maxHeight: '75%' } as ViewStyle,
  commentModalFrame: { maxWidth: 440 } as ViewStyle,

  contactModalContent: { gap: spacing.md },
  contactHeroCard: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,92,171,0.04)',
    borderColor: 'rgba(0,92,171,0.12)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  contactHeroIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,92,171,0.1)',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  contactHeroCopy: { flex: 1, gap: 4 },
  contactHeroTitle: { color: palette.onSurface, fontSize: typography.body, fontWeight: '700' },
  contactHeroBody: { color: palette.onSurfaceVariant, fontSize: typography.bodySmall, lineHeight: 20 },
  contactInfoList: { gap: spacing.sm },
  contactInfoRow: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(192,199,214,0.45)',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  contactInfoLabel: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  contactInfoValue: { color: palette.onSurface, fontSize: typography.bodySmall, fontWeight: '600', lineHeight: 20 },
  contactActionList: { gap: spacing.sm },
  contactActionButton: {
    alignItems: 'center',
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  contactActionText: { color: palette.primary, fontSize: typography.bodySmall, fontWeight: '700' },

  modalSection: { gap: spacing.md },
  loadingState: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  loadingText: { color: palette.onSurfaceVariant, fontSize: typography.bodySmall, textAlign: 'center' },

  detailHeaderCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(192,199,214,0.55)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconWrap: { alignItems: 'center', borderRadius: radius.pill, height: 36, justifyContent: 'center', width: 36 },
  detailHeaderCopy: { flex: 1, gap: 2 },
  detailHeaderNumber: { color: palette.onSurface, fontSize: typography.body, fontWeight: '700' },
  detailHeaderSubject: { color: palette.onSurfaceVariant, fontSize: typography.bodySmall },

  detailList: { gap: spacing.md },
  detailRow: { gap: spacing.xs },
  detailLabel: { color: palette.onSurfaceVariant, fontSize: typography.label, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  detailValue: { color: palette.onSurface, fontSize: typography.bodySmall, fontWeight: '600', lineHeight: 20 },

  messageCard: {
    backgroundColor: 'rgba(0,92,171,0.04)',
    borderColor: 'rgba(0,92,171,0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  messageSenderLabel: { color: palette.primary, fontSize: typography.label, fontWeight: '700', textTransform: 'uppercase' },
  messageText: { color: palette.onSurface, fontSize: typography.bodySmall, lineHeight: 20 },

  attachmentList: { gap: spacing.sm },
  attachmentRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,92,171,0.04)',
    borderColor: 'rgba(0,92,171,0.1)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  attachmentIconWrap: { alignItems: 'center', backgroundColor: 'rgba(0,92,171,0.1)', borderRadius: radius.pill, height: 28, justifyContent: 'center', width: 28 },
  attachmentCopy: { flex: 1, gap: 2, minWidth: 0 },
  attachmentName: { color: palette.onSurface, flex: 1, flexShrink: 1, fontSize: typography.bodySmall, fontWeight: '600' },
  attachmentSize: { color: palette.onSurfaceVariant, fontSize: typography.label },

  commentThread: { gap: spacing.sm },
  commentBubble: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  commentBubbleUser: { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: 'rgba(192,199,214,0.4)' },
  commentBubbleAdmin: { backgroundColor: 'rgba(0,92,171,0.05)', borderColor: 'rgba(0,92,171,0.15)' },
  commentBubbleHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  commentAuthorBadge: { alignItems: 'center', borderRadius: radius.pill, flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 3 },
  commentAuthorBadgeUser: { backgroundColor: 'rgba(100,116,139,0.12)' },
  commentAuthorBadgeAdmin: { backgroundColor: 'rgba(0,92,171,0.12)' },
  commentAuthorLabel: { color: palette.onSurface, fontSize: typography.label, fontWeight: '700' },
  commentAuthorLabelAdmin: { color: palette.primary },
  commentDate: { color: palette.onSurfaceVariant, fontSize: typography.label },
  commentText: { color: palette.onSurface, fontSize: typography.bodySmall, lineHeight: 20 },
  commentAttachRow: { alignItems: 'center', flexDirection: 'row', gap: 4, minWidth: 0 },
  commentAttachName: { color: palette.onSurfaceVariant, flexShrink: 1, fontSize: typography.label, fontWeight: '600' },
  commentAttachSize: { color: palette.onSurfaceVariant, fontSize: typography.label },

  noCommentsState: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  noCommentsText: { color: palette.onSurfaceVariant, fontSize: typography.bodySmall },

  // Timeline
  timelineList: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: spacing.sm },
  timelineLeftCol: { alignItems: 'center', width: 36 },
  timelineIconWrap: { alignItems: 'center', borderRadius: radius.pill, height: 32, justifyContent: 'center', width: 32 },
  timelineConnector: { backgroundColor: '#E2E8F0', flex: 1, marginVertical: 2, width: 2 },
  timelineCopy: { flex: 1, gap: 2, paddingBottom: spacing.md, paddingTop: 6 },
  timelineEventLabel: { color: palette.onSurface, fontSize: typography.bodySmall, fontWeight: '700' },
  timelineActor: { color: palette.onSurfaceVariant, fontSize: typography.label },
  timelineNote: { color: palette.onSurface, fontSize: typography.bodySmall, fontStyle: 'italic' },

  // Comment modal
  commentInputBlock: { gap: spacing.sm },
  commentTextArea: {
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.onSurface,
    fontSize: typography.body,
    minHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  commentFileRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,92,171,0.04)',
    borderColor: 'rgba(0,92,171,0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  attachButton: {
    alignItems: 'center',
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 40,
  },
  attachButtonText: { color: palette.onSurfaceVariant, fontSize: typography.bodySmall },

  // Modal buttons
  modalButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 48,
    justifyContent: 'center',
  },
  modalButtonOutline: { backgroundColor: 'transparent', borderColor: palette.outlineVariant, borderWidth: 1 },
  modalButtonDisabled: { opacity: 0.6 },
  modalButtonText: { color: palette.onPrimary, fontSize: typography.label, fontWeight: '700' },
  modalButtonTextOutline: { color: palette.onSurface },
  modalFooter: { flexDirection: 'row', gap: spacing.sm },

  // Action menu
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
  actionMenuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', zIndex: 40 },
  actionMenuIconWrap: { alignItems: 'center', borderRadius: radius.pill, height: 30, justifyContent: 'center', width: 30 },
  actionMenuItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'rgba(192,199,214,0.4)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionMenuTitle: { color: palette.onSurface, flex: 1, fontSize: typography.label, fontWeight: '700' },

  // More menu
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
  moreMenuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.06)', zIndex: 30 },
  moreMenuCopy: { flex: 1, gap: 2 },
  moreMenuIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,92,171,0.1)',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  moreMenuItem: { alignItems: 'center', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  moreMenuSubtitle: { color: palette.onSurfaceVariant, fontSize: 12 },
  moreMenuTitle: { color: palette.onSurface, fontSize: typography.bodySmall, fontWeight: '700' },
});
