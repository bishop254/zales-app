import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppMessageModal } from '@/components/app/app-message-modal';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { AuthTextField } from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import {
  createJournal,
  getJournalById,
  type JournalRecord,
  updateJournal,
} from '@/features/journal/journal-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type JournalForm = {
  accomplishments: string;
  affirmation: string;
  gratefulFor: string;
  mood: string;
  quoteOfTheDay: string;
  thoughts: string;
};

type JournalTouched = Record<keyof JournalForm, boolean>;

type InfoModalState = {
  eyebrow: string;
  message: string;
  title: string;
  visible: boolean;
};

const INITIAL_FORM: JournalForm = {
  accomplishments: '',
  affirmation: '',
  gratefulFor: '',
  mood: '',
  quoteOfTheDay: '',
  thoughts: '',
};

const INITIAL_TOUCHED: JournalTouched = {
  accomplishments: false,
  affirmation: false,
  gratefulFor: false,
  mood: false,
  quoteOfTheDay: false,
  thoughts: false,
};

function formatReadableDate(dateValue?: string | null) {
  if (!dateValue) {
    return 'Generated automatically for today';
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

function hasAnyContent(form: JournalForm) {
  return Object.values(form).some((value) => value.trim().length > 0);
}

function getEditPayload(form: JournalForm) {
  return {
    accomplishments: form.accomplishments.trim() || null,
    affirmation: form.affirmation.trim() || null,
    gratefulFor: form.gratefulFor.trim() || null,
    mood: form.mood.trim() || null,
    quoteOfTheDay: form.quoteOfTheDay.trim() || null,
    thoughts: form.thoughts.trim() || null,
  };
}

function getCreatePayload(form: JournalForm) {
  return {
    accomplishments: form.accomplishments.trim() || undefined,
    affirmation: form.affirmation.trim() || undefined,
    gratefulFor: form.gratefulFor.trim() || undefined,
    mood: form.mood.trim() || undefined,
    quoteOfTheDay: form.quoteOfTheDay.trim() || undefined,
    thoughts: form.thoughts.trim() || undefined,
  };
}

export default function JournalFormScreen() {
  const { session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string | string[]; mode?: string | string[] }>();
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const rawJournalId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isEditMode = rawMode === 'edit';
  const journalId = rawJournalId ?? null;

  const [form, setForm] = useState<JournalForm>(INITIAL_FORM);
  const [touched, setTouched] = useState<JournalTouched>(INITIAL_TOUCHED);
  const [submitting, setSubmitting] = useState(false);
  const [loadingJournal, setLoadingJournal] = useState(isEditMode);
  const [journalDate, setJournalDate] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<InfoModalState>({
    eyebrow: '',
    message: '',
    title: '',
    visible: false,
  });

  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();

  const formErrors = useMemo(
    () => ({
      accomplishments: form.accomplishments.trim().length > 0 && form.accomplishments.trim().length > 1000
        ? 'Keep accomplishments under 1000 characters.'
        : '',
      affirmation: form.affirmation.trim().length > 500 ? 'Keep affirmation under 500 characters.' : '',
      gratefulFor: form.gratefulFor.trim().length > 1000 ? 'Keep gratitude notes under 1000 characters.' : '',
      mood: form.mood.trim().length > 200 ? 'Keep mood under 200 characters.' : '',
      quoteOfTheDay: form.quoteOfTheDay.trim().length > 500 ? 'Keep quote under 500 characters.' : '',
      thoughts: form.thoughts.trim().length > 2000 ? 'Keep thoughts under 2000 characters.' : '',
    }),
    [form],
  );

  const canSubmitForm = useMemo(
    () => hasAnyContent(form) && Object.values(formErrors).every((value) => !value),
    [form, formErrors],
  );

  useEffect(() => {
    const accessToken: string | null = session?.accessToken ?? null;

    if (!isEditMode || !journalId || !accessToken) {
      setLoadingJournal(false);
      return;
    }

    let active = true;

    async function loadJournal() {
      setLoadingJournal(true);

      try {
        const journal: JournalRecord = await getJournalById(accessToken, journalId);

        if (!active) {
          return;
        }

        setForm({
          accomplishments: journal.accomplishments ?? '',
          affirmation: journal.affirmation ?? '',
          gratefulFor: journal.gratefulFor ?? '',
          mood: journal.mood ?? '',
          quoteOfTheDay: journal.quoteOfTheDay ?? '',
          thoughts: journal.thoughts ?? '',
        });
        setJournalDate(journal.journalDate);
      } catch (error) {
        if (!active) {
          return;
        }

        if (!(error instanceof UnauthorizedError)) {
          const message = error instanceof Error ? error.message : 'Unable to load journal details.';
          showToast(message, 'error');
          setInfoModal({
            eyebrow: 'Journal editor',
            message,
            title: 'Journal unavailable',
            visible: true,
          });
        }
      } finally {
        if (active) {
          setLoadingJournal(false);
        }
      }
    }

    loadJournal();

    return () => {
      active = false;
    };
  }, [isEditMode, journalId, session?.accessToken, showToast]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  if (isEditMode && !journalId) {
    return <Redirect href="/journals" />;
  }

  function closeEditor() {
    router.replace('/journals');
  }

  function updateForm<K extends keyof JournalForm>(key: K, value: JournalForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function markTouched(field: keyof JournalTouched) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function getFieldError(field: keyof JournalTouched) {
    return touched[field] ? formErrors[field] : '';
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }

    if (!canSubmitForm) {
      setTouched({
        accomplishments: true,
        affirmation: true,
        gratefulFor: true,
        mood: true,
        quoteOfTheDay: true,
        thoughts: true,
      });
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode && journalId) {
        await updateJournal(session.accessToken, journalId, getEditPayload(form));
      } else {
        await createJournal(session.accessToken, getCreatePayload(form));
      }

      showToast(isEditMode ? 'Journal updated successfully.' : 'Journal created successfully.');
      router.replace('/journals');
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        const message = error instanceof Error ? error.message : 'Unable to save journal entry.';
        showToast(message, 'error');
        setInfoModal({
          eyebrow: isEditMode ? 'Update failed' : 'Create failed',
          message,
          title: isEditMode ? 'Journal update failed' : 'Journal creation failed',
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
            eyebrow: 'Journal',
            message: 'Your journal timeline and entries are available from the main journal workspace.',
            title: 'Journal workspace',
            visible: true,
          })
        }
        onProfilePress={() => router.push('/profile')}
        profileImageUrl={session.profileImageUrl}
        title={isEditMode ? 'Edit journal' : 'New journal'}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{isEditMode ? 'Update Journal Entry' : 'Create Journal Entry'}</Text>
          <Text style={styles.heroBody}>
            {isEditMode
              ? 'Refine today’s notes, reflections, and wins from the same journal workspace.'
              : 'Capture today’s thoughts, gratitude, affirmation, and accomplishments in one focused place.'}
          </Text>
        </View>

        <View style={styles.contentWrap}>
          {loadingJournal ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={palette.primary} size="small" />
              <Text style={styles.loadingText}>Loading journal details...</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Entry Setup</Text>
                <View style={styles.formStack}>
                  <View style={styles.readonlyCard}>
                    <View style={styles.readonlyIconWrap}>
                      <MaterialIcons color={palette.primary} name="calendar-today" size={18} />
                    </View>
                    <View style={styles.readonlyCopy}>
                      <Text style={styles.readonlyTitle}>Journal date</Text>
                      <Text style={styles.readonlyBody}>{formatReadableDate(journalDate)}</Text>
                    </View>
                  </View>

                  <AuthTextField
                    autoCapitalize="sentences"
                    error={getFieldError('mood')}
                    icon="mood"
                    label="Mood"
                    optionalLabel="(Optional)"
                    placeholder="Focused and optimistic"
                    value={form.mood}
                    onBlur={() => markTouched('mood')}
                    onChangeText={(value) => updateForm('mood', value)}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Reflections</Text>
                <View style={styles.formStack}>
                  <AuthTextField
                    autoCapitalize="sentences"
                    error={getFieldError('thoughts')}
                    icon="notes"
                    label="Thoughts"
                    optionalLabel="(Optional)"
                    multiline
                    numberOfLines={6}
                    placeholder="What is on your mind today?"
                    style={styles.textAreaInput}
                    textAlignVertical="top"
                    value={form.thoughts}
                    onBlur={() => markTouched('thoughts')}
                    onChangeText={(value) => updateForm('thoughts', value)}
                  />

                  <AuthTextField
                    autoCapitalize="sentences"
                    error={getFieldError('quoteOfTheDay')}
                    icon="format-quote"
                    label="Quote of the day"
                    optionalLabel="(Optional)"
                    multiline
                    numberOfLines={3}
                    placeholder="A quote or mantra guiding your day"
                    style={styles.textAreaSmall}
                    textAlignVertical="top"
                    value={form.quoteOfTheDay}
                    onBlur={() => markTouched('quoteOfTheDay')}
                    onChangeText={(value) => updateForm('quoteOfTheDay', value)}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Personal Notes</Text>
                <View style={styles.formStack}>
                  <AuthTextField
                    autoCapitalize="sentences"
                    error={getFieldError('gratefulFor')}
                    icon="favorite-border"
                    label="Grateful for"
                    optionalLabel="(Optional)"
                    multiline
                    numberOfLines={4}
                    placeholder="What are you grateful for today?"
                    style={styles.textAreaSmall}
                    textAlignVertical="top"
                    value={form.gratefulFor}
                    onBlur={() => markTouched('gratefulFor')}
                    onChangeText={(value) => updateForm('gratefulFor', value)}
                  />

                  <AuthTextField
                    autoCapitalize="sentences"
                    error={getFieldError('affirmation')}
                    icon="wb-sunny"
                    label="Affirmation"
                    optionalLabel="(Optional)"
                    multiline
                    numberOfLines={3}
                    placeholder="A positive intention for the day"
                    style={styles.textAreaSmall}
                    textAlignVertical="top"
                    value={form.affirmation}
                    onBlur={() => markTouched('affirmation')}
                    onChangeText={(value) => updateForm('affirmation', value)}
                  />

                  <AuthTextField
                    autoCapitalize="sentences"
                    error={getFieldError('accomplishments')}
                    icon="task-alt"
                    label="Accomplishments"
                    optionalLabel="(Optional)"
                    multiline
                    numberOfLines={4}
                    placeholder="Wins, lessons, or goals completed today"
                    style={styles.textAreaSmall}
                    textAlignVertical="top"
                    value={form.accomplishments}
                    onBlur={() => markTouched('accomplishments')}
                    onChangeText={(value) => updateForm('accomplishments', value)}
                  />
                </View>
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
                    style={[styles.actionButton, !canSubmitForm || submitting ? styles.actionButtonDisabled : null]}
                    disabled={!canSubmitForm || submitting}
                    onPress={handleSubmit}>
                    {submitting ? (
                      <ActivityIndicator color={palette.onPrimary} size="small" />
                    ) : (
                      <Text style={styles.actionButtonText}>{isEditMode ? 'Save changes' : 'Create entry'}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </FloatingPageShell>

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

const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
};

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
    fontSize: typography.body,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: palette.onSurface,
  },
  actionCard: {
    ...cardShadow,
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contentWrap: {
    gap: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
  },
  formStack: {
    gap: spacing.md,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 520,
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
  readonlyBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  readonlyCard: {
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  readonlyCopy: {
    flex: 1,
    gap: 4,
  },
  readonlyIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  readonlyTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  sectionCard: {
    ...cardShadow,
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  textAreaInput: {
    minHeight: 128,
    paddingTop: spacing.sm,
  },
  textAreaSmall: {
    minHeight: 104,
    paddingTop: spacing.sm,
  },
});
