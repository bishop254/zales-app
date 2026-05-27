import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppMessageModal } from '@/components/app/app-message-modal';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { AuthSelectField, AuthTextField } from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import {
  createSupportTicket,
  type TicketCategory,
  type TicketPriority,
} from '@/features/support-tickets/support-tickets-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type TicketForm = {
  category: TicketCategory | '';
  message: string;
  priority: TicketPriority | '';
  subject: string;
};

type TicketTouched = {
  category: boolean;
  message: boolean;
  priority: boolean;
  subject: boolean;
};

type InfoModalState = {
  eyebrow: string;
  message: string;
  title: string;
  visible: boolean;
};

const CATEGORY_OPTIONS = [
  { label: 'General Enquiry', value: 'GENERAL_ENQUIRY' as TicketCategory },
  { label: 'Technical Issues', value: 'TECHNICAL_ISSUES' as TicketCategory },
  { label: 'Bug Report', value: 'BUG_REPORT' as TicketCategory },
  { label: 'Feature / Customization Request', value: 'FEATURE_REQUEST' as TicketCategory },
  { label: 'Account Support', value: 'ACCOUNT_SUPPORT' as TicketCategory },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' as TicketPriority },
  { label: 'Medium', value: 'MEDIUM' as TicketPriority },
  { label: 'High', value: 'HIGH' as TicketPriority },
  { label: 'Urgent', value: 'URGENT' as TicketPriority },
];

const INITIAL_FORM: TicketForm = {
  category: '',
  message: '',
  priority: '',
  subject: '',
};

const INITIAL_TOUCHED: TicketTouched = {
  category: false,
  message: false,
  priority: false,
  subject: false,
};

const INITIAL_INFO_MODAL: InfoModalState = {
  eyebrow: '',
  message: '',
  title: '',
  visible: false,
};

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SupportTicketFormScreen() {
  const { session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();

  const [form, setForm] = useState<TicketForm>(INITIAL_FORM);
  const [touched, setTouched] = useState<TicketTouched>(INITIAL_TOUCHED);
  const [attachments, setAttachments] = useState<DocumentPickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [infoModal, setInfoModal] = useState<InfoModalState>(INITIAL_INFO_MODAL);

  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();

  const subjectWordCount = useMemo(() => countWords(form.subject), [form.subject]);
  const messageWordCount = useMemo(() => countWords(form.message), [form.message]);

  const errors = useMemo(
    () => ({
      category: !form.category ? 'Select a category.' : null,
      message: !form.message.trim()
        ? 'Enter your message.'
        : messageWordCount > 50
          ? 'Message must be 50 words or fewer.'
          : null,
      priority: !form.priority ? 'Select a priority.' : null,
      subject: !form.subject.trim()
        ? 'Enter a subject.'
        : subjectWordCount > 10
          ? 'Subject must be 10 words or fewer.'
          : null,
    }),
    [form, messageWordCount, subjectWordCount]
  );

  const hasErrors = Object.values(errors).some(Boolean);

  if (!session) return <Redirect href="/login" />;
  if (!subscriptionLoading && !hasActiveSubscription) return <Redirect href="/billing" />;

  function closeForm() {
    router.replace('/support-tickets');
  }

  function setField<K extends keyof TicketForm>(key: K, value: TicketForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function touchField(key: keyof TicketTouched) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function getFieldError(key: keyof TicketTouched) {
    return touched[key] && errors[key] ? errors[key] : '';
  }

  async function handlePickAttachment() {
    if (attachments.length >= 3) {
      showToast('Maximum 3 attachments allowed.', 'error');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (!asset) return;

      const already = attachments.some((item) => item.name === asset.name && item.size === asset.size);
      if (already) {
        showToast('This file is already added.', 'error');
        return;
      }

      setAttachments((prev) => [...prev, asset]);
    } catch {
      showToast('Unable to open file picker.', 'error');
    }
  }

  function handleRemoveAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit() {
    setTouched({
      category: true,
      message: true,
      priority: true,
      subject: true,
    });

    if (hasErrors || !form.category || !form.priority) {
      return;
    }

    if (!session?.accessToken) {
      return;
    }

    setSubmitting(true);
    try {
      await createSupportTicket(session.accessToken, {
        attachments,
        category: form.category as TicketCategory,
        message: form.message.trim(),
        priority: form.priority as TicketPriority,
        subject: form.subject.trim(),
      });

      showToast('Support ticket submitted successfully.');
      router.replace('/support-tickets');
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        const message = error instanceof Error ? error.message : 'Failed to submit ticket.';
        showToast(message, 'error');
        setInfoModal({
          eyebrow: 'Submission failed',
          message,
          title: 'Ticket could not be created',
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
        onBackPress={closeForm}
        onNotificationPress={() =>
          setInfoModal({
            eyebrow: 'Support',
            message: 'You can review ticket responses and status updates from the support tickets workspace.',
            title: 'Support updates',
            visible: true,
          })
        }
        onProfilePress={() => router.push('/profile')}
        profileImageUrl={session.profileImageUrl}
        title="Create ticket">
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Create Support Ticket</Text>
          <Text style={styles.heroBody}>
            Share the issue clearly so the support team can triage it quickly and reply with the right next step.
          </Text>
        </View>

        <View style={styles.contentWrap}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ticket Setup</Text>
            <View style={styles.formStack}>
              <View style={styles.readonlyCard}>
                <View style={styles.readonlyIconWrap}>
                  <MaterialIcons color={palette.primary} name="confirmation-number" size={18} />
                </View>
                <View style={styles.readonlyCopy}>
                  <Text style={styles.readonlyTitle}>Ticket number</Text>
                  <Text style={styles.readonlyBody}>Generated automatically once you submit this request.</Text>
                </View>
              </View>

              <AuthSelectField
                error={getFieldError('category')}
                label="Category"
                options={CATEGORY_OPTIONS}
                placeholder="Select category"
                value={form.category}
                onSelect={(value) => {
                  setField('category', value as TicketCategory);
                  touchField('category');
                }}
              />

              <AuthSelectField
                error={getFieldError('priority')}
                label="Priority"
                options={PRIORITY_OPTIONS}
                placeholder="Select priority"
                value={form.priority}
                onSelect={(value) => {
                  setField('priority', value as TicketPriority);
                  touchField('priority');
                }}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Issue Details</Text>
            <View style={styles.formStack}>
              <AuthTextField
                actionLabel={`${subjectWordCount} / 10 words`}
                autoCapitalize="sentences"
                error={getFieldError('subject')}
                icon="short-text"
                label="Subject"
                placeholder="Brief description of your issue"
                value={form.subject}
                onBlur={() => touchField('subject')}
                onChangeText={(value) => setField('subject', value)}
              />

              <AuthTextField
                actionLabel={`${messageWordCount} / 50 words`}
                autoCapitalize="sentences"
                error={getFieldError('message')}
                icon="notes"
                label="Message"
                multiline
                numberOfLines={6}
                placeholder="Describe your issue in detail"
                style={styles.textAreaInput}
                textAlignVertical="top"
                value={form.message}
                onBlur={() => touchField('message')}
                onChangeText={(value) => setField('message', value)}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            <View style={styles.formStack}>
              <View style={styles.attachmentIntroCard}>
                <View style={styles.attachmentIntroIconWrap}>
                  <MaterialIcons color={palette.primary} name="attach-file" size={20} />
                </View>
                <View style={styles.attachmentIntroCopy}>
                  <Text style={styles.attachmentIntroTitle}>Supporting files</Text>
                  <Text style={styles.attachmentIntroBody}>
                    Add screenshots, PDFs, or other files that help explain the issue. Up to 3 attachments.
                  </Text>
                </View>
              </View>

              {attachments.map((file, index) => (
                <View key={`${file.name}-${index}`} style={styles.attachmentRow}>
                  <View style={styles.attachmentIconWrap}>
                    <MaterialIcons color={palette.primary} name="description" size={18} />
                  </View>
                  <View style={styles.attachmentCopy}>
                    <Text numberOfLines={1} style={styles.attachmentName}>
                      {file.name}
                    </Text>
                    <Text style={styles.attachmentSize}>{formatFileSize(file.size ?? 0)}</Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => handleRemoveAttachment(index)}>
                    <MaterialIcons color={palette.error} name="close" size={20} />
                  </Pressable>
                </View>
              ))}

              {attachments.length < 3 ? (
                <Pressable style={styles.inlineActionButton} onPress={handlePickAttachment}>
                  <MaterialIcons color={palette.primary} name="upload-file" size={18} />
                  <Text style={styles.inlineActionButtonText}>
                    {attachments.length === 0 ? 'Add attachment' : 'Add another file'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.actionCard}>
            <View style={styles.actions}>
              <Pressable
                style={[
                  styles.actionButton,
                  styles.actionButtonSecondary,
                  submitting ? styles.actionButtonDisabled : null,
                ]}
                disabled={submitting}
                onPress={closeForm}>
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, submitting || hasErrors ? styles.actionButtonDisabled : null]}
                disabled={submitting || hasErrors}
                onPress={handleSubmit}>
                {submitting ? (
                  <ActivityIndicator color={palette.onPrimary} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>Submit ticket</Text>
                )}
              </Pressable>
            </View>
          </View>
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
  attachmentCopy: {
    flex: 1,
    gap: 2,
  },
  attachmentIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  attachmentIntroBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  attachmentIntroCard: {
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  attachmentIntroCopy: {
    flex: 1,
    gap: 4,
  },
  attachmentIntroIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  attachmentIntroTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
  },
  attachmentName: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  attachmentRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.04)',
    borderColor: 'rgba(0, 92, 171, 0.16)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  attachmentSize: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
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
  inlineActionButton: {
    alignItems: 'center',
    borderColor: 'rgba(0, 92, 171, 0.24)',
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inlineActionButtonText: {
    color: palette.primary,
    fontSize: typography.bodySmall,
    fontWeight: '700',
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
});
