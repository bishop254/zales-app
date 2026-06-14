import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { DatePickerModal } from '@/components/app/date-picker-modal';
import { AppMessageModal } from '@/components/app/app-message-modal';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { AuthPressableField, AuthSearchSelectField, AuthSelectField, AuthTextField } from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import {
  createTask,
  getTaskById,
  type TaskPriority,
  type TaskRecurrence,
  type TaskType,
  updateTask,
} from '@/features/tasks/tasks-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type TaskForm = {
  description: string;
  oneOffDate: string;
  oneOffTime: string;
  priority: TaskPriority;
  pushNotifications: boolean;
  recurrence: TaskRecurrence;
  seriesEndDate: string;
  seriesStartDate: string;
  taskTime: string;
  taskType: TaskType;
  timezone: string;
  title: string;
};

type TaskTouched = {
  description: boolean;
  oneOffDate: boolean;
  oneOffTime: boolean;
  recurrence: boolean;
  seriesEndDate: boolean;
  seriesStartDate: boolean;
  taskTime: boolean;
  taskType: boolean;
  title: boolean;
};

type InfoModalState = {
  eyebrow: string;
  message: string;
  title: string;
  visible: boolean;
};

type ActiveDateField = 'oneOffDate' | 'seriesEndDate' | 'seriesStartDate' | null;

const INITIAL_FORM: TaskForm = {
  description: '',
  oneOffDate: '',
  oneOffTime: '',
  priority: 'MEDIUM',
  pushNotifications: true,
  recurrence: 'DAILY',
  seriesEndDate: '',
  seriesStartDate: '',
  taskTime: '',
  taskType: 'ONE_OFF',
  timezone: 'Africa/Nairobi',
  title: '',
};

const INITIAL_TOUCHED: TaskTouched = {
  description: false,
  oneOffDate: false,
  oneOffTime: false,
  recurrence: false,
  seriesEndDate: false,
  seriesStartDate: false,
  taskTime: false,
  taskType: false,
  title: false,
};

const TASK_TYPE_OPTIONS = [
  { label: 'One-off', value: 'ONE_OFF' },
  { label: 'Repetitive', value: 'REPETITIVE' },
];

const PRIORITY_OPTIONS = [
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];

const RECURRENCE_OPTIONS = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = `${Math.floor(index / 2)}`.padStart(2, '0');
  const minutes = index % 2 === 0 ? '00' : '30';
  const value = `${hours}:${minutes}`;
  return { label: value, value };
});

const TIMEZONE_OPTIONS = [
  { label: 'Africa/Abidjan', value: 'Africa/Abidjan' },
  { label: 'Africa/Accra', value: 'Africa/Accra' },
  { label: 'Africa/Addis_Ababa', value: 'Africa/Addis_Ababa' },
  { label: 'Africa/Algiers', value: 'Africa/Algiers' },
  { label: 'Africa/Bamako', value: 'Africa/Bamako' },
  { label: 'Africa/Banjul', value: 'Africa/Banjul' },
  { label: 'Africa/Blantyre', value: 'Africa/Blantyre' },
  { label: 'Africa/Brazzaville', value: 'Africa/Brazzaville' },
  { label: 'Africa/Bujumbura', value: 'Africa/Bujumbura' },
  { label: 'Africa/Cairo', value: 'Africa/Cairo' },
  { label: 'Africa/Casablanca', value: 'Africa/Casablanca' },
  { label: 'Africa/Ceuta', value: 'Africa/Ceuta' },
  { label: 'Africa/Conakry', value: 'Africa/Conakry' },
  { label: 'Africa/Dakar', value: 'Africa/Dakar' },
  { label: 'Africa/Dar_es_Salaam', value: 'Africa/Dar_es_Salaam' },
  { label: 'Africa/Djibouti', value: 'Africa/Djibouti' },
  { label: 'Africa/Douala', value: 'Africa/Douala' },
  { label: 'Africa/El_Aaiun', value: 'Africa/El_Aaiun' },
  { label: 'Africa/Freetown', value: 'Africa/Freetown' },
  { label: 'Africa/Gaborone', value: 'Africa/Gaborone' },
  { label: 'Africa/Harare', value: 'Africa/Harare' },
  { label: 'Africa/Johannesburg', value: 'Africa/Johannesburg' },
  { label: 'Africa/Juba', value: 'Africa/Juba' },
  { label: 'Africa/Kampala', value: 'Africa/Kampala' },
  { label: 'Africa/Khartoum', value: 'Africa/Khartoum' },
  { label: 'Africa/Kigali', value: 'Africa/Kigali' },
  { label: 'Africa/Kinshasa', value: 'Africa/Kinshasa' },
  { label: 'Africa/Lagos', value: 'Africa/Lagos' },
  { label: 'Africa/Libreville', value: 'Africa/Libreville' },
  { label: 'Africa/Lome', value: 'Africa/Lome' },
  { label: 'Africa/Luanda', value: 'Africa/Luanda' },
  { label: 'Africa/Lubumbashi', value: 'Africa/Lubumbashi' },
  { label: 'Africa/Lusaka', value: 'Africa/Lusaka' },
  { label: 'Africa/Malabo', value: 'Africa/Malabo' },
  { label: 'Africa/Maputo', value: 'Africa/Maputo' },
  { label: 'Africa/Maseru', value: 'Africa/Maseru' },
  { label: 'Africa/Mbabane', value: 'Africa/Mbabane' },
  { label: 'Africa/Mogadishu', value: 'Africa/Mogadishu' },
  { label: 'Africa/Monrovia', value: 'Africa/Monrovia' },
  { label: 'Africa/Nairobi', value: 'Africa/Nairobi' },
  { label: 'Africa/Ndjamena', value: 'Africa/Ndjamena' },
  { label: 'Africa/Niamey', value: 'Africa/Niamey' },
  { label: 'Africa/Nouakchott', value: 'Africa/Nouakchott' },
  { label: 'Africa/Ouagadougou', value: 'Africa/Ouagadougou' },
  { label: 'Africa/Porto-Novo', value: 'Africa/Porto-Novo' },
  { label: 'Africa/Sao_Tome', value: 'Africa/Sao_Tome' },
  { label: 'Africa/Tripoli', value: 'Africa/Tripoli' },
  { label: 'Africa/Tunis', value: 'Africa/Tunis' },
  { label: 'Africa/Windhoek', value: 'Africa/Windhoek' },
];

const CALENDAR_COLUMN_WIDTH = `${100 / 7}%` as const;

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

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function getTimezoneTodayIso(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(new Date());

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
}

function getCalendarDateState({
  dateIso,
  field,
  form,
}: {
  dateIso: string;
  field: ActiveDateField;
  form: TaskForm;
}) {
  if (!field) {
    return { disabled: true, past: false };
  }

  const timezone = form.timezone.trim() || 'Africa/Nairobi';
  const timezoneToday = getTimezoneTodayIso(timezone);

  if (field === 'oneOffDate') {
    const isPast = dateIso < timezoneToday;
    return { disabled: isPast, past: isPast };
  }

  if (field === 'seriesStartDate') {
    const exceedsEnd = isIsoDate(form.seriesEndDate) && dateIso > form.seriesEndDate;
    return { disabled: exceedsEnd, past: false };
  }

  if (field === 'seriesEndDate') {
    const beforeStart = isIsoDate(form.seriesStartDate) && dateIso < form.seriesStartDate;
    return { disabled: beforeStart, past: false };
  }

  return { disabled: false, past: false };
}

function buildIsoDateTime(dateStr: string, timeStr: string, timezone: string) {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: timezone,
    year: 'numeric',
    day: '2-digit',
  });

  const timezoneClock = formatter.format(naive);
  const timezoneMs = new Date(timezoneClock.replace(' ', 'T') + 'Z').getTime();
  const timezoneOffset = timezoneMs - naive.getTime();

  return new Date(naive.getTime() - timezoneOffset).toISOString();
}

function getDatePartsFromIso(isoDateTime: string, timezone: string) {
  const date = new Date(isoDateTime);

  if (Number.isNaN(date.getTime())) {
    return { date: '', time: '' };
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    time: `${getPart('hour')}:${getPart('minute')}`,
  };
}

export default function TaskFormScreen() {
  const { session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string | string[]; mode?: string | string[] }>();
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const rawTaskId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isEditMode = rawMode === 'edit';
  const taskId = rawTaskId ?? null;

  const [form, setForm] = useState<TaskForm>(INITIAL_FORM);
  const [touched, setTouched] = useState<TaskTouched>(INITIAL_TOUCHED);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTask, setLoadingTask] = useState(isEditMode);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<ActiveDateField>(null);
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

  const formErrors = useMemo(() => {
    const descriptionWords = countWords(form.description);
    const timezone = form.timezone.trim() || 'Africa/Nairobi';
    const timezoneToday = getTimezoneTodayIso(timezone);
    const dateTimeError =
      form.oneOffDate && form.oneOffTime
        ? (() => {
            try {
              const isoDateTime = buildIsoDateTime(form.oneOffDate, form.oneOffTime, timezone);
              return new Date(isoDateTime) <= new Date() ? 'Select a future date and time.' : '';
            } catch {
              return 'Select a valid future date and time.';
            }
          })()
        : '';

    return {
      description:
        form.description.trim() && descriptionWords > 20 ? 'Description must not exceed 20 words.' : '',
      oneOffDate:
        form.taskType === 'ONE_OFF' && !form.oneOffDate.trim()
          ? 'Select a scheduled date.'
          : form.taskType === 'ONE_OFF' && isIsoDate(form.oneOffDate) && form.oneOffDate < timezoneToday
            ? 'Select today or a future date for a one-off task.'
          : form.taskType === 'ONE_OFF'
            ? dateTimeError
            : '',
      oneOffTime:
        form.taskType === 'ONE_OFF' && !form.oneOffTime.trim()
          ? 'Select a scheduled time.'
          : form.taskType === 'ONE_OFF'
            ? dateTimeError
            : '',
      recurrence:
        form.taskType === 'REPETITIVE' && !form.recurrence ? 'Select a recurrence pattern.' : '',
      seriesEndDate:
        form.taskType === 'REPETITIVE' && !form.seriesEndDate.trim()
          ? 'Select an end date.'
          : form.taskType === 'REPETITIVE' &&
              form.seriesStartDate &&
              form.seriesEndDate &&
              new Date(`${form.seriesEndDate}T00:00:00`) < new Date(`${form.seriesStartDate}T00:00:00`)
            ? 'End date must be on or after the start date.'
            : '',
      seriesStartDate:
        form.taskType === 'REPETITIVE' && !form.seriesStartDate.trim()
          ? 'Select a start date.'
          : form.taskType === 'REPETITIVE' &&
              form.seriesStartDate &&
              form.seriesEndDate &&
              new Date(`${form.seriesStartDate}T00:00:00`) > new Date(`${form.seriesEndDate}T00:00:00`)
            ? 'Start date must be on or before the end date.'
            : '',
      taskTime:
        form.taskType === 'REPETITIVE' && !form.taskTime.trim() ? 'Select a task time.' : '',
      taskType: !form.taskType ? 'Select a task type.' : '',
      title: !form.title.trim() ? 'Task title is required.' : form.title.trim().length > 100 ? 'Task title is too long.' : '',
    };
  }, [form]);

  const canSubmitForm = useMemo(() => Object.values(formErrors).every((value) => !value), [formErrors]);

  useEffect(() => {
    const accessToken: string | null = session?.accessToken ?? null;

    if (!isEditMode || !taskId || !accessToken) {
      setLoadingTask(false);
      return;
    }

    const resolvedAccessToken = accessToken;
    const resolvedTaskId = taskId;
    let active = true;

    async function loadTask() {
      setLoadingTask(true);

      try {
        const task = await getTaskById(resolvedAccessToken, resolvedTaskId);

        if (!active) {
          return;
        }

        const oneOffParts = task.taskDateTime ? getDatePartsFromIso(task.taskDateTime, task.timezone) : { date: '', time: '' };

        setForm({
          description: task.description ?? '',
          oneOffDate: oneOffParts.date,
          oneOffTime: oneOffParts.time,
          priority: task.priority,
          pushNotifications: task.pushNotifications,
          recurrence: task.recurrence ?? 'DAILY',
          seriesEndDate: task.seriesEndDate ?? '',
          seriesStartDate: task.seriesStartDate ?? '',
          taskTime: task.taskTime ?? '',
          taskType: task.taskType,
          timezone: task.timezone,
          title: task.title,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        if (!(error instanceof UnauthorizedError)) {
          const message = error instanceof Error ? error.message : 'Unable to load task details.';
          showToast(message, 'error');
          setInfoModal({
            eyebrow: 'Task editor',
            message,
            title: 'Edit task unavailable',
            visible: true,
          });
        }
      } finally {
        if (active) {
          setLoadingTask(false);
        }
      }
    }

    loadTask();

    return () => {
      active = false;
    };
  }, [isEditMode, session?.accessToken, showToast, taskId]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  if (isEditMode && !taskId) {
    return <Redirect href="/tasks" />;
  }

  function closeEditor() {
    router.replace('/tasks');
  }

  function updateForm<K extends keyof TaskForm>(key: K, value: TaskForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function markTouched(field: keyof TaskTouched) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function getFieldError(field: keyof TaskTouched) {
    return touched[field] ? formErrors[field] : '';
  }

  function openDatePicker(field: ActiveDateField) {
    const sourceValue = field ? form[field] : '';
    const source = /^\d{4}-\d{2}-\d{2}$/.test(sourceValue)
      ? new Date(`${sourceValue}T00:00:00`)
      : new Date();
    setPickerMonth(new Date(source.getFullYear(), source.getMonth(), 1));
    setActiveDateField(field);
    setDatePickerOpen(true);
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }

    if (!canSubmitForm) {
      setTouched({
        description: true,
        oneOffDate: true,
        oneOffTime: true,
        recurrence: true,
        seriesEndDate: true,
        seriesStartDate: true,
        taskTime: true,
        taskType: true,
        title: true,
      });
      return;
    }

    const timezone = form.timezone.trim() || 'Africa/Nairobi';

    setSubmitting(true);

    try {
      const commonPayload = {
        description: form.description.trim() || undefined,
        priority: form.priority,
        pushNotifications: form.pushNotifications,
        timezone,
        title: form.title.trim(),
      };

      if (form.taskType === 'ONE_OFF') {
        const taskDateTime = buildIsoDateTime(form.oneOffDate, form.oneOffTime, timezone);
        const payload = {
          ...commonPayload,
          taskDateTime,
          taskType: 'ONE_OFF' as const,
        };

        if (isEditMode && taskId) {
          await updateTask(session.accessToken, taskId, payload);
        } else {
          await createTask(session.accessToken, payload);
        }
      } else {
        const payload = {
          ...commonPayload,
          recurrence: form.recurrence,
          seriesEndDate: form.seriesEndDate.trim(),
          seriesStartDate: form.seriesStartDate.trim(),
          taskTime: form.taskTime.trim(),
          taskType: 'REPETITIVE' as const,
        };

        if (isEditMode && taskId) {
          await updateTask(session.accessToken, taskId, payload);
        } else {
          await createTask(session.accessToken, payload);
        }
      }

      showToast(isEditMode ? 'Task updated successfully.' : 'Task created successfully.');
      router.replace('/tasks');
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        const message = error instanceof Error ? error.message : 'Unable to save task.';
        showToast(message, 'error');
        setInfoModal({
          eyebrow: isEditMode ? 'Update failed' : 'Create failed',
          message,
          title: isEditMode ? 'Task update failed' : 'Task creation failed',
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
            message: 'Task reminders and alerts are available from the main tasks screen.',
            title: 'Notifications',
            visible: true,
          })
        }
        onProfilePress={() => router.push('/profile')}
        profileImageUrl={session.profileImageUrl}
        title={isEditMode ? 'Edit task' : 'Add task'}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{isEditMode ? 'Update Task' : 'Create Task'}</Text>
          <Text style={styles.heroBody}>
            {isEditMode
              ? 'Adjust the task details below to keep the schedule and follow-up plan accurate.'
              : 'Set up a one-off or repetitive task using the same dashboard patterns already in your workspace.'}
          </Text>
        </View>

        <View style={styles.contentWrap}>
          {loadingTask ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={palette.primary} size="small" />
              <Text style={styles.loadingText}>Loading task details...</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Task Details</Text>
                <View style={styles.formStack}>
                  <AuthSelectField
                    error={getFieldError('taskType')}
                    label="Task type"
                    options={TASK_TYPE_OPTIONS}
                    placeholder="Select task type"
                    value={form.taskType}
                    onSelect={(value) => {
                      updateForm('taskType', value as TaskType);
                      markTouched('taskType');
                    }}
                  />
                  <AuthTextField
                    autoCapitalize="sentences"
                    error={getFieldError('title')}
                    icon="assignment"
                    label="Title"
                    placeholder="Client meeting prep"
                    value={form.title}
                    onBlur={() => markTouched('title')}
                    onChangeText={(value) => updateForm('title', value)}
                  />
                  <AuthTextField
                    autoCapitalize="sentences"
                    error={getFieldError('description')}
                    icon="notes"
                    label="Description"
                    optionalLabel="(Optional)"
                    placeholder="Prepare agenda and key talking points"
                    value={form.description}
                    onBlur={() => markTouched('description')}
                    onChangeText={(value) => updateForm('description', value)}
                  />
                  <AuthSelectField
                    label="Priority"
                    options={PRIORITY_OPTIONS}
                    placeholder="Select priority"
                    value={form.priority}
                    onSelect={(value) => updateForm('priority', value as TaskPriority)}
                  />
                  <AuthSearchSelectField
                    label="Timezone"
                    options={TIMEZONE_OPTIONS}
                    placeholder="Select timezone"
                    searchPlaceholder="Search timezone"
                    value={form.timezone}
                    onSelect={(value) => updateForm('timezone', value)}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Schedule</Text>
                <View style={styles.formStack}>
                  {form.taskType === 'ONE_OFF' ? (
                    <>
                      <AuthPressableField
                        error={getFieldError('oneOffDate')}
                        icon="event"
                        label="Scheduled date"
                        placeholder="16 May 2026"
                        value={form.oneOffDate ? formatReadableDate(form.oneOffDate) : ''}
                        onPress={() => {
                          markTouched('oneOffDate');
                          openDatePicker('oneOffDate');
                        }}
                      />
                      <AuthSelectField
                        error={getFieldError('oneOffTime')}
                        label="Scheduled time"
                        options={TIME_OPTIONS}
                        placeholder="Select time"
                        value={form.oneOffTime}
                        onSelect={(value) => {
                          updateForm('oneOffTime', value);
                          markTouched('oneOffTime');
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <AuthSelectField
                        error={getFieldError('recurrence')}
                        label="Recurrence"
                        options={RECURRENCE_OPTIONS}
                        placeholder="Select recurrence"
                        value={form.recurrence}
                        onSelect={(value) => {
                          updateForm('recurrence', value as TaskRecurrence);
                          markTouched('recurrence');
                        }}
                      />
                      <AuthPressableField
                        error={getFieldError('seriesStartDate')}
                        icon="event-available"
                        label="Series start date"
                        placeholder="16 May 2026"
                        value={form.seriesStartDate ? formatReadableDate(form.seriesStartDate) : ''}
                        onPress={() => {
                          markTouched('seriesStartDate');
                          openDatePicker('seriesStartDate');
                        }}
                      />
                      <AuthPressableField
                        error={getFieldError('seriesEndDate')}
                        icon="event-busy"
                        label="Series end date"
                        placeholder="30 June 2026"
                        value={form.seriesEndDate ? formatReadableDate(form.seriesEndDate) : ''}
                        onPress={() => {
                          markTouched('seriesEndDate');
                          openDatePicker('seriesEndDate');
                        }}
                      />
                      <AuthSelectField
                        error={getFieldError('taskTime')}
                        label="Task time"
                        options={TIME_OPTIONS}
                        placeholder="Select time"
                        value={form.taskTime}
                        onSelect={(value) => {
                          updateForm('taskTime', value);
                          markTouched('taskTime');
                        }}
                      />
                    </>
                  )}
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <Pressable style={styles.switchRow} onPress={() => updateForm('pushNotifications', !form.pushNotifications)}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchTitle}>Allow notifications</Text>
                    <Text style={styles.switchSubtitle}>Keep reminder notifications enabled for this task.</Text>
                  </View>
                  <View style={[styles.switchPill, form.pushNotifications ? styles.switchPillActive : null]}>
                    <View style={[styles.switchThumb, form.pushNotifications ? styles.switchThumbActive : null]} />
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
                      <Text style={styles.actionButtonText}>{isEditMode ? 'Save changes' : 'Create task'}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </FloatingPageShell>

      <DatePickerModal
        title="Select date"
        month={pickerMonth}
        selectedDate={activeDateField ? form[activeDateField] : null}
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onMonthChange={setPickerMonth}
        onSelectDate={(dateIso) => {
          if (!activeDateField) {
            return;
          }

          updateForm(activeDateField, dateIso);
          setDatePickerOpen(false);
        }}
        getDateState={(_, dateIso) => {
          const dateState = activeDateField
            ? getCalendarDateState({
                dateIso,
                field: activeDateField,
                form,
              })
            : { disabled: true, past: false };

          return {
            disabled: dateState.disabled,
            muted: dateState.past,
          };
        }}
      />

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
    width: CALENDAR_COLUMN_WIDTH,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontSize: typography.label,
    fontWeight: '700',
    textAlign: 'center',
    width: CALENDAR_COLUMN_WIDTH,
  },
  calendarWeekdays: {
    flexDirection: 'row',
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
