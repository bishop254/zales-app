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
  completeTaskOccurrence,
  deleteTask,
  getTaskById,
  getTaskOccurrences,
  getTasks,
  type DueStatus,
  type TaskOccurrenceRecord,
  type TaskPriority,
  type TaskRecord,
} from '@/features/tasks/tasks-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type TaskFilter = 'ALL' | 'ONE_OFF' | 'OVERDUE' | 'REPETITIVE';
type TaskVisualStatus = 'COMPLETED' | 'OVERDUE' | 'DUE_SOON' | 'SCHEDULED';

type TaskSummaryCard = {
  count: string;
  filter: TaskFilter;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconTone: SummaryCardTone;
  label: string;
  title: string;
};

type TaskListItem = {
  code: string;
  id: string;
  nextLabel: string;
  occurrenceCountLabel: string;
  priority: TaskPriority;
  status: TaskVisualStatus;
  title: string;
  typeLabel: string;
};

type TaskNotificationItem = {
  dueLabel: string;
  occurrenceId: string;
  scheduledLabel: string;
  taskId: string;
  taskTitle: string;
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

const ACTION_MENU_HEIGHT = 232;

function formatDateTime(dateValue: string, timezone?: string) {
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    timeZone: timezone,
    year: 'numeric',
  }).format(parsed);
}

function getPendingOccurrences(occurrences: TaskOccurrenceRecord[]) {
  return occurrences.filter((occurrence) => occurrence.completionStatus !== 'COMPLETED');
}

function getNextPendingOccurrence(occurrences: TaskOccurrenceRecord[]) {
  return getPendingOccurrences(occurrences)[0] ?? null;
}

function getTaskVisualStatus(task: TaskRecord, occurrences: TaskOccurrenceRecord[]): TaskVisualStatus {
  const nextOccurrence = getNextPendingOccurrence(occurrences);

  if (!nextOccurrence) {
    return 'COMPLETED';
  }

  if (nextOccurrence.dueStatus === 'OVERDUE') {
    return 'OVERDUE';
  }

  if (nextOccurrence.dueStatus === 'ALMOST_DUE') {
    return 'DUE_SOON';
  }

  return 'SCHEDULED';
}

function mapTaskToListItem(task: TaskRecord, occurrences: TaskOccurrenceRecord[]): TaskListItem {
  const nextOccurrence = getNextPendingOccurrence(occurrences);
  const completedCount = occurrences.filter((occurrence) => occurrence.completionStatus === 'COMPLETED').length;

  return {
    code: task.taskCode,
    id: task.id,
    nextLabel: nextOccurrence
      ? formatDateTime(nextOccurrence.scheduledAt, task.timezone)
      : 'All scheduled occurrences completed',
    occurrenceCountLabel: `${completedCount}/${occurrences.length} completed`,
    priority: task.priority,
    status: getTaskVisualStatus(task, occurrences),
    title: task.title,
    typeLabel: task.taskType === 'ONE_OFF' ? 'One-off task' : 'Repetitive task',
  };
}

function buildTaskSearchValue(task: TaskRecord, listItem: TaskListItem) {
  return [
    task.taskCode,
    task.title,
    task.description ?? '',
    task.priority,
    task.taskType,
    task.timezone,
    listItem.nextLabel,
    listItem.status,
  ]
    .join(' ')
    .toLowerCase();
}

function buildSummaryCards(tasks: TaskRecord[], occurrencesMap: Record<string, TaskOccurrenceRecord[]>): TaskSummaryCard[] {
  const counts = tasks.reduce(
    (summary, task) => {
      const occurrences = occurrencesMap[task.id] ?? [];
      summary.total += 1;

      if (task.taskType === 'ONE_OFF') {
        summary.ONE_OFF += 1;
      } else {
        summary.REPETITIVE += 1;
      }

      if (getTaskVisualStatus(task, occurrences) === 'OVERDUE') {
        summary.OVERDUE += 1;
      }

      return summary;
    },
    { ONE_OFF: 0, OVERDUE: 0, REPETITIVE: 0, total: 0 },
  );

  return [
    {
      count: String(counts.total),
      filter: 'ALL',
      icon: 'assignment',
      iconTone: 'primary',
      label: 'All Schedules',
      title: 'Total',
    },
    {
      count: String(counts.ONE_OFF),
      filter: 'ONE_OFF',
      icon: 'event',
      iconTone: 'secondary',
      label: 'Single Run',
      title: 'One-off',
    },
    {
      count: String(counts.REPETITIVE),
      filter: 'REPETITIVE',
      icon: 'repeat',
      iconTone: 'primary',
      label: 'Recurring',
      title: 'Series',
    },
    {
      count: String(counts.OVERDUE),
      filter: 'OVERDUE',
      icon: 'warning-amber',
      iconTone: 'tertiary',
      label: 'Needs Action',
      title: 'Overdue',
    },
  ];
}

function formatDueLabel(status: DueStatus) {
  if (status === 'OVERDUE') {
    return 'Overdue';
  }

  if (status === 'ALMOST_DUE') {
    return 'Due soon';
  }

  if (status === 'COMPLETED') {
    return 'Completed';
  }

  return 'Scheduled';
}

export default function TasksScreen() {
  const { logout, session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [taskOccurrences, setTaskOccurrences] = useState<Record<string, TaskOccurrenceRecord[]>>({});
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('ALL');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskRecord | null>(null);
  const [taskActionMenuOpen, setTaskActionMenuOpen] = useState(false);
  const [taskViewOpen, setTaskViewOpen] = useState(false);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [completingOccurrenceId, setCompletingOccurrenceId] = useState<string | null>(null);
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

  const listItems = useMemo(
    () => tasks.map((task) => mapTaskToListItem(task, taskOccurrences[task.id] ?? [])),
    [taskOccurrences, tasks],
  );
  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [selectedTaskId, tasks]);
  const selectedTaskOccurrences = useMemo(
    () => (selectedTaskId ? taskOccurrences[selectedTaskId] ?? [] : []),
    [selectedTaskId, taskOccurrences],
  );
  const filteredListItems = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();

    return tasks
      .map((task, index) => {
        const listItem = listItems[index];
        if (!listItem) {
          return null;
        }

        if (taskFilter === 'ONE_OFF' && task.taskType !== 'ONE_OFF') {
          return null;
        }

        if (taskFilter === 'REPETITIVE' && task.taskType !== 'REPETITIVE') {
          return null;
        }

        if (taskFilter === 'OVERDUE' && listItem.status !== 'OVERDUE') {
          return null;
        }

        if (query && !buildTaskSearchValue(task, listItem).includes(query)) {
          return null;
        }

        return listItem;
      })
      .filter((item): item is TaskListItem => item !== null);
  }, [listItems, taskFilter, taskSearch, tasks]);
  const summaryCards = useMemo(() => buildSummaryCards(tasks, taskOccurrences), [taskOccurrences, tasks]);
  const overdueCount = useMemo(
    () => tasks.filter((task) => getTaskVisualStatus(task, taskOccurrences[task.id] ?? []) === 'OVERDUE').length,
    [taskOccurrences, tasks],
  );
  const dueSoonCount = useMemo(
    () => tasks.filter((task) => getTaskVisualStatus(task, taskOccurrences[task.id] ?? []) === 'DUE_SOON').length,
    [taskOccurrences, tasks],
  );
  const completedCount = useMemo(
    () => tasks.filter((task) => getTaskVisualStatus(task, taskOccurrences[task.id] ?? []) === 'COMPLETED').length,
    [taskOccurrences, tasks],
  );
  const notificationItems = useMemo(() => {
    const dueItems: TaskNotificationItem[] = [];

    for (const task of tasks) {
      const nextOccurrence = getNextPendingOccurrence(taskOccurrences[task.id] ?? []);

      if (!nextOccurrence || (nextOccurrence.dueStatus !== 'ALMOST_DUE' && nextOccurrence.dueStatus !== 'OVERDUE')) {
        continue;
      }

      dueItems.push({
        dueLabel: formatDueLabel(nextOccurrence.dueStatus),
        occurrenceId: nextOccurrence.id,
        scheduledLabel: formatDateTime(nextOccurrence.scheduledAt, task.timezone),
        taskId: task.id,
        taskTitle: task.title,
      });
    }

    return dueItems.sort((left, right) => left.scheduledLabel.localeCompare(right.scheduledLabel));
  }, [taskOccurrences, tasks]);
  const readinessInsight = useMemo(() => {
    if (!tasks.length) {
      return {
        body: 'Create your first task to track one-off follow-ups and repetitive routines from the same workspace shell.',
        icon: 'assignment' as const,
        toneStyle: styles.promoCardIdle,
      };
    }

    if (overdueCount) {
      return {
        body: `${overdueCount} task${overdueCount === 1 ? '' : 's'} ${overdueCount === 1 ? 'is' : 'are'} overdue. Clear urgent follow-ups first, then keep ${dueSoonCount} due-soon item${dueSoonCount === 1 ? '' : 's'} moving.`,
        icon: 'warning-amber' as const,
        toneStyle: styles.promoCardAlert,
      };
    }

    if (dueSoonCount) {
      return {
        body: `${dueSoonCount} task${dueSoonCount === 1 ? '' : 's'} ${dueSoonCount === 1 ? 'is' : 'are'} due soon. Your upcoming workload is visible and ready for follow-through.`,
        icon: 'schedule' as const,
        toneStyle: styles.promoCardWarm,
      };
    }

    return {
      body: `${completedCount} task${completedCount === 1 ? '' : 's'} completed and no urgent schedule pressure right now. The task board looks healthy.`,
      icon: 'task-alt' as const,
      toneStyle: styles.promoCardHealthy,
    };
  }, [completedCount, dueSoonCount, overdueCount, tasks.length]);

  const loadTasks = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session?.accessToken) {
        return;
      }

      const silent = options?.silent ?? false;

      if (!silent) {
        setTasksLoading(true);
      }

      try {
        const result = await getTasks(session.accessToken, { page: 1, pageSize: 100 });
        const records = result.data;
        setTasks(records);

        const occurrenceEntries = await Promise.all(
          records.map(async (task) => [task.id, await getTaskOccurrences(session.accessToken!, task.id)] as const),
        );

        setTaskOccurrences(Object.fromEntries(occurrenceEntries));
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) {
          showToast(error instanceof Error ? error.message : 'Unable to load tasks.', 'error');
        }
      } finally {
        if (!silent) {
          setTasksLoading(false);
        }
      }
    },
    [session?.accessToken, showToast],
  );

  useFocusEffect(
    useCallback(() => {
      if (!session?.accessToken) {
        setTasks([]);
        setTaskOccurrences({});
        setTasksLoading(false);
        return;
      }

      loadTasks();
    }, [loadTasks, session?.accessToken]),
  );

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  async function fetchTaskDetail(taskId: string) {
    if (!session?.accessToken) {
      return null;
    }

    setTaskDetailLoading(true);

    try {
      const task = await getTaskById(session.accessToken, taskId);
      setSelectedTaskDetail(task);
      return task;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to load task details.', 'error');
      }
      return null;
    } finally {
      setTaskDetailLoading(false);
    }
  }

  function handleBottomNavPress(key: string) {
    if (key === 'home') {
      router.replace('/dashboard');
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

    if (key === 'journals') {
      router.push('/journals');
      return;
    }

    if (key === 'tasks') {
      return;
    }

    if (key === 'more') {
      setMoreMenuOpen((current) => !current);
      return;
    }
  }

  function closeInfoModal() {
    setInfoModal((current) => ({ ...current, visible: false }));
  }

  function handleLogout() {
    setMoreMenuOpen(false);
    logout({ animated: true, redirectToLogin: true });
  }

  function handleOpenCreate() {
    router.push('/task-form');
  }

  function handleTaskPress(taskId: string, event: GestureResponderEvent) {
    const maxTop = Math.max(112, height - ACTION_MENU_HEIGHT - 112);
    setSelectedTaskId(taskId);
    setSelectedTaskDetail(null);
    setActionMenuPosition({
      top: Math.min(maxTop, Math.max(112, event.nativeEvent.pageY - 6)),
    });
    setTaskActionMenuOpen(true);
  }

  async function handleViewTask() {
    if (!selectedTaskId) {
      return;
    }

    setTaskActionMenuOpen(false);
    const task = await fetchTaskDetail(selectedTaskId);

    if (task) {
      setTaskViewOpen(true);
    }
  }

  async function handleViewTimeline() {
    if (!selectedTaskId) {
      return;
    }

    setTaskActionMenuOpen(false);
    setTimelineLoading(true);
    setTimelineOpen(true);

    try {
      const detail = await fetchTaskDetail(selectedTaskId);

      if (!detail) {
        setTimelineOpen(false);
      }
    } finally {
      setTimelineLoading(false);
    }
  }

  function handleEditTask() {
    if (!selectedTaskId) {
      return;
    }

    setTaskActionMenuOpen(false);
    router.push({
      params: { id: selectedTaskId, mode: 'edit' },
      pathname: '/task-form',
    });
  }

  function handleDeletePrompt() {
    setTaskActionMenuOpen(false);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteTask() {
    if (!selectedTaskId || !session?.accessToken) {
      return;
    }

    setDeleteSubmitting(true);

    try {
      await deleteTask(session.accessToken, selectedTaskId);
      setDeleteConfirmOpen(false);
      setSelectedTaskId(null);
      setSelectedTaskDetail(null);
      showToast('Task deleted successfully.');
      await loadTasks({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to delete task.', 'error');
      }
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleCompleteOccurrence(taskId: string, occurrenceId: string) {
    if (!session?.accessToken || completingOccurrenceId) {
      return;
    }

    setCompletingOccurrenceId(occurrenceId);

    try {
      await completeTaskOccurrence(session.accessToken, taskId, occurrenceId);
      showToast('Task occurrence marked as complete.');
      await loadTasks({ silent: true });
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        showToast(error instanceof Error ? error.message : 'Unable to complete task occurrence.', 'error');
      }
    } finally {
      setCompletingOccurrenceId(null);
    }
  }

  const selectedNextPendingOccurrence = getNextPendingOccurrence(selectedTaskOccurrences);

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        bottomSlot={<FloatingBottomNav activeKey={moreMenuOpen ? 'more' : 'tasks'} onPress={handleBottomNavPress} />}
        notificationCount={notificationItems.length}
        onBackPress={() => router.replace('/dashboard')}
        onNotificationPress={() => setNotificationsOpen(true)}
        onProfilePress={() => router.push('/profile')}
        profileImageUrl={session.profileImageUrl}
        refreshControl={<RefreshControl refreshing={tasksLoading} onRefresh={() => loadTasks()} />}
        scrollViewProps={{
          onScrollBeginDrag: () => {
            setMoreMenuOpen(false);
            setTaskActionMenuOpen(false);
          },
        }}
        title="Tasks">
        <View style={styles.heroSection}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Task Planner</Text>
            </View>
            <Pressable style={styles.addButton} onPress={handleOpenCreate}>
              <MaterialIcons color={palette.white} name="add" size={18} />
              <Text style={styles.addButtonText}>Add Task</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map((item) => (
            <SummaryCard
              key={item.filter}
              active={taskFilter === item.filter}
              count={item.count}
              icon={item.icon}
              iconTone={item.iconTone}
              label={item.label}
              style={{ width: cardWidth }}
              title={item.title}
              onPress={() => setTaskFilter(item.filter)}
            />
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Task Board</Text>
            <Text style={styles.sectionCount}>{filteredListItems.length} visible</Text>
          </View>

          <View style={styles.searchBar}>
            <MaterialIcons color={palette.outline} name="search" size={20} />
            <TextInput
              placeholder="Search tasks"
              placeholderTextColor={palette.outlineVariant}
              style={styles.searchInput}
              value={taskSearch}
              onChangeText={setTaskSearch}
            />
            {taskSearch ? (
              <Pressable hitSlop={8} onPress={() => setTaskSearch('')}>
                <MaterialIcons color={palette.outline} name="close" size={18} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.listCard}>
            {tasksLoading && !tasks.length ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={palette.primary} />
                <Text style={styles.emptyStateTitle}>Loading tasks</Text>
                <Text style={styles.emptyStateBody}>We are pulling your latest schedules and occurrences.</Text>
              </View>
            ) : filteredListItems.length ? (
              filteredListItems.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[styles.taskRow, index < filteredListItems.length - 1 ? styles.taskRowBorder : null]}
                  onPress={(event) => handleTaskPress(item.id, event)}>
                  <View style={styles.taskRowLeft}>
                    <View style={[styles.taskStatusDot, taskStatusDotStyles[item.status]]} />
                    <View style={styles.taskCopy}>
                      <Text style={styles.taskTitle}>{item.title}</Text>
                      <Text style={styles.taskMeta}>
                        {item.code} • {item.typeLabel}
                      </Text>
                      <Text style={styles.taskDueDate}>{item.nextLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.taskRight}>
                    <View style={[styles.taskStatusPill, taskStatusPillStyles[item.status]]}>
                      <Text style={styles.taskStatusText}>{item.status.replace('_', ' ')}</Text>
                    </View>
                    <Text style={styles.taskMeta}>
                      {item.priority} • {item.occurrenceCountLabel}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons color={palette.outline} name="assignment-late" size={32} />
                <Text style={styles.emptyStateTitle}>No tasks found</Text>
                <Text style={styles.emptyStateBody}>
                  Try a different filter or search term, or create a new task from the action above.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.promoCard, readinessInsight.toneStyle]}>
          <View style={styles.promoCopy}>
            <Text style={styles.promoTitle}>Execution Outlook</Text>
            <Text style={styles.promoBody}>{readinessInsight.body}</Text>
          </View>
          <MaterialIcons color="rgba(255,255,255,0.2)" name={readinessInsight.icon} size={160} style={styles.promoIcon} />
        </View>
      </FloatingPageShell>

      <AppModal
        frameStyle={styles.notificationsModalFrame}
        title="Task notifications"
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}>
        {notificationItems.length ? (
          <View style={styles.notificationList}>
            {notificationItems.map((item, index) => (
              <View key={item.occurrenceId} style={[styles.notificationRow, index < notificationItems.length - 1 ? styles.notificationRowBorder : null]}>
                <View
                  style={[
                    styles.notificationIconWrap,
                    item.dueLabel === 'Overdue' ? styles.notificationIconWrapTertiary : styles.notificationIconWrapPrimary,
                  ]}>
                  <MaterialIcons
                    color={item.dueLabel === 'Overdue' ? palette.tertiary : palette.primary}
                    name={item.dueLabel === 'Overdue' ? 'warning-amber' : 'notifications-active'}
                    size={18}
                  />
                </View>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationTitle}>{item.taskTitle}</Text>
                  <Text style={styles.notificationMeta}>{item.scheduledLabel}</Text>
                  <Text style={styles.notificationBody}>{item.dueLabel}</Text>
                </View>
                <Pressable
                  disabled={completingOccurrenceId === item.occurrenceId}
                  style={[styles.markPaidButton, completingOccurrenceId === item.occurrenceId ? styles.markPaidButtonDisabled : null]}
                  onPress={() => handleCompleteOccurrence(item.taskId, item.occurrenceId)}>
                  {completingOccurrenceId === item.occurrenceId ? (
                    <ActivityIndicator color={palette.primary} size="small" />
                  ) : (
                    <MaterialIcons color={palette.primary} name="task-alt" size={22} />
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.notificationEmpty}>
            <Text style={styles.notificationEmptyText}>No due-soon or overdue task reminders right now.</Text>
          </View>
        )}
      </AppModal>

      <AppModal
        frameStyle={styles.viewModalFrame}
        title="Task details"
        visible={taskViewOpen}
        onClose={() => setTaskViewOpen(false)}>
        {taskDetailLoading ? (
          <View style={styles.modalLoadingState}>
            <ActivityIndicator color={palette.primary} />
            <Text style={styles.modalLoadingText}>Loading task details...</Text>
          </View>
        ) : selectedTaskDetail ? (
          <View style={styles.detailList}>
            <View style={styles.detailHeaderCard}>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailHeaderTitle}>{selectedTaskDetail.title}</Text>
                <Text style={styles.detailHeaderMeta}>
                  {selectedTaskDetail.taskCode} • {selectedTaskDetail.taskType === 'ONE_OFF' ? 'One-off' : 'Repetitive'}
                </Text>
              </View>
              <View style={[styles.taskStatusPill, taskStatusPillStyles[getTaskVisualStatus(selectedTaskDetail, taskOccurrences[selectedTaskDetail.id] ?? [])]]}>
                <Text style={styles.taskStatusText}>
                  {getTaskVisualStatus(selectedTaskDetail, taskOccurrences[selectedTaskDetail.id] ?? []).replace('_', ' ')}
                </Text>
              </View>
            </View>
            <DetailRow label="Priority" value={selectedTaskDetail.priority} />
            <DetailRow label="Timezone" value={selectedTaskDetail.timezone} />
            <DetailRow label="Description" value={selectedTaskDetail.description ?? 'Not provided'} />
            <DetailRow label="Notifications" value={selectedTaskDetail.pushNotifications ? 'Enabled' : 'Disabled'} />
            {selectedTaskDetail.taskType === 'ONE_OFF' ? (
              <DetailRow
                label="Scheduled at"
                value={selectedTaskDetail.taskDateTime ? formatDateTime(selectedTaskDetail.taskDateTime, selectedTaskDetail.timezone) : 'Not scheduled'}
              />
            ) : (
              <>
                <DetailRow label="Recurrence" value={selectedTaskDetail.recurrence ?? 'Not provided'} />
                <DetailRow label="Series start" value={selectedTaskDetail.seriesStartDate ?? 'Not provided'} />
                <DetailRow label="Series end" value={selectedTaskDetail.seriesEndDate ?? 'Not provided'} />
                <DetailRow label="Task time" value={selectedTaskDetail.taskTime ?? 'Not provided'} />
              </>
            )}
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <Text style={styles.modalLoadingText}>No task details available.</Text>
          </View>
        )}
      </AppModal>

      <AppModal
        frameStyle={styles.viewModalFrame}
        title="Occurrence timeline"
        visible={timelineOpen}
        onClose={() => setTimelineOpen(false)}>
        {timelineLoading ? (
          <View style={styles.modalLoadingState}>
            <ActivityIndicator color={palette.primary} />
            <Text style={styles.modalLoadingText}>Loading occurrence timeline...</Text>
          </View>
        ) : selectedTask ? (
          <View style={styles.detailList}>
            {(taskOccurrences[selectedTask.id] ?? []).map((occurrence) => (
              <View key={occurrence.id} style={styles.timelineRow}>
                <View style={styles.timelineCopy}>
                  <Text style={styles.timelineTitle}>{formatDateTime(occurrence.scheduledAt, selectedTask.timezone)}</Text>
                  <Text style={styles.timelineMeta}>
                    {formatDueLabel(occurrence.dueStatus)} • {occurrence.completionStatus === 'COMPLETED' ? 'Completed' : 'Open'}
                  </Text>
                </View>
                {occurrence.completionStatus !== 'COMPLETED' ? (
                  <Pressable
                    disabled={completingOccurrenceId === occurrence.id}
                    style={[styles.timelineAction, completingOccurrenceId === occurrence.id ? styles.markPaidButtonDisabled : null]}
                    onPress={() => handleCompleteOccurrence(selectedTask.id, occurrence.id)}>
                    {completingOccurrenceId === occurrence.id ? (
                      <ActivityIndicator color={palette.primary} size="small" />
                    ) : (
                      <MaterialIcons color={palette.primary} name="task-alt" size={20} />
                    )}
                  </Pressable>
                ) : (
                  <MaterialIcons color="#16A34A" name="check-circle" size={20} />
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.modalLoadingState}>
            <Text style={styles.modalLoadingText}>No timeline available.</Text>
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
              onPress={handleDeleteTask}>
              {deleteSubmitting ? (
                <ActivityIndicator color={palette.onError} size="small" />
              ) : (
                <Text style={[styles.modalButtonText, styles.deleteButtonText]}>Delete task</Text>
              )}
            </Pressable>
          </View>
        }
        frameStyle={styles.deleteModalFrame}
        title="Delete task?"
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}>
        <Text style={styles.modalIntro}>
          This will remove the selected task and its remaining schedule from your workspace. This action cannot be undone.
        </Text>
      </AppModal>

      {taskActionMenuOpen && selectedTask ? (
        <>
          <Pressable style={styles.actionMenuBackdrop} onPress={() => setTaskActionMenuOpen(false)} />
          <View style={[styles.actionMenu, { top: actionMenuPosition.top }]}>
            <Pressable style={styles.actionMenuItem} onPress={handleViewTask}>
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
            <Pressable style={styles.actionMenuItem} onPress={handleEditTask}>
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                <MaterialIcons color={palette.primary} name="edit" size={18} />
              </View>
              <Text style={styles.actionMenuTitle}>Edit</Text>
            </Pressable>
            {selectedNextPendingOccurrence ? (
              <>
                <View style={styles.actionMenuSeparator} />
                <Pressable
                  style={styles.actionMenuItem}
                  onPress={async () => {
                    setTaskActionMenuOpen(false);
                    await handleCompleteOccurrence(selectedTask.id, selectedNextPendingOccurrence.id);
                  }}>
                  <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPrimary]}>
                    <MaterialIcons color={palette.primary} name="task-alt" size={18} />
                  </View>
                  <Text style={styles.actionMenuTitle}>Mark next done</Text>
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

const taskStatusDotStyles = StyleSheet.create({
  COMPLETED: { backgroundColor: '#16A34A' },
  DUE_SOON: { backgroundColor: '#F59E0B' },
  OVERDUE: { backgroundColor: '#BA1A1A' },
  SCHEDULED: { backgroundColor: '#2563EB' },
});

const taskStatusPillStyles = StyleSheet.create({
  COMPLETED: { backgroundColor: 'rgba(22, 163, 74, 0.12)' },
  DUE_SOON: { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
  OVERDUE: { backgroundColor: 'rgba(186, 26, 26, 0.12)' },
  SCHEDULED: { backgroundColor: 'rgba(37, 99, 235, 0.12)' },
});

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
    alignItems: 'center',
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
  notificationsModalFrame: {
    maxHeight: '70%',
  } as ViewStyle,
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
  taskCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  taskDueDate: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    fontWeight: '600',
  },
  taskMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  taskRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  taskRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  taskRowBorder: {
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
  },
  taskRowLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  taskStatusDot: {
    borderRadius: radius.pill,
    height: 12,
    width: 12,
  },
  taskStatusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  taskStatusText: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
  },
  taskTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  timelineAction: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  timelineCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  timelineMeta: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
  },
  timelineRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(192, 199, 214, 0.55)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  timelineTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  viewModalFrame: {
    maxHeight: '75%',
  } as ViewStyle,
});
