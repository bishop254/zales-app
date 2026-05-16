import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { AuthSelectField } from '@/components/auth/auth-primitives';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import { type TicketCategory, type TicketPriority, createSupportTicket } from '@/features/support-tickets/support-tickets-api';
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

  const avatarLetter = ((session?.name?.trim() || session?.email || '?').slice(0, 1)).toUpperCase();

  const subjectWordCount = useMemo(() => countWords(form.subject), [form.subject]);
  const messageWordCount = useMemo(() => countWords(form.message), [form.message]);

  const errors = useMemo(() => {
    return {
      category: !form.category ? 'Select a category' : null,
      message: !form.message.trim()
        ? 'Enter your message'
        : messageWordCount > 50
          ? 'Message must be 50 words or fewer'
          : null,
      priority: !form.priority ? 'Select a priority' : null,
      subject: !form.subject.trim()
        ? 'Enter a subject'
        : subjectWordCount > 10
          ? 'Subject must be 10 words or fewer'
          : null,
    };
  }, [form, subjectWordCount, messageWordCount]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (!session) return <Redirect href="/login" />;
  if (!subscriptionLoading && !hasActiveSubscription) return <Redirect href="/billing" />;

  async function handlePickAttachment() {
    if (attachments.length >= 3) {
      showToast('Maximum 3 attachments allowed.', 'error');
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    if (!asset) return;

    const already = attachments.some((a) => a.name === asset.name && a.size === asset.size);
    if (already) {
      showToast('This file is already added.', 'error');
      return;
    }

    setAttachments((prev) => [...prev, asset]);
  }

  function handleRemoveAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setTouched({ category: true, message: true, priority: true, subject: true });

    if (hasErrors || !form.category || !form.priority) return;
    if (!session?.accessToken) return;

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
        showToast(error instanceof Error ? error.message : 'Failed to submit ticket.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function setField<K extends keyof TicketForm>(key: K, value: TicketForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function touchField(key: keyof TicketTouched) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  return (
    <FloatingPageShell
      avatarLetter={avatarLetter}
      onBackPress={() => router.back()}
      onNotificationPress={() => {}}
      onProfilePress={() => {}}
      profileImageUrl={session.profileImageUrl}
      title="New Ticket">
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Create Support Ticket</Text>
        <Text style={styles.heroBody}>
          Describe your issue and our team will respond as soon as possible.
        </Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Ticket Number</Text>
          <View style={styles.readonlyField}>
            <MaterialIcons color={palette.onSurfaceVariant} name="confirmation-number" size={16} />
            <Text style={styles.readonlyText}>Auto-generated on submission</Text>
          </View>
        </View>

        <AuthSelectField
          error={touched.category && errors.category ? errors.category : ''}
          label="Category"
          options={CATEGORY_OPTIONS}
          placeholder="Select category"
          value={form.category}
          onSelect={(v) => {
            setField('category', v as TicketCategory);
            touchField('category');
          }}
        />

        <AuthSelectField
          error={touched.priority && errors.priority ? errors.priority : ''}
          label="Priority"
          options={PRIORITY_OPTIONS}
          placeholder="Select priority"
          value={form.priority}
          onSelect={(v) => {
            setField('priority', v as TicketPriority);
            touchField('priority');
          }}
        />

        <View style={styles.fieldBlock}>
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, touched.subject && errors.subject ? styles.fieldLabelError : null]}>
              Subject
            </Text>
            <Text style={[styles.wordCount, subjectWordCount > 10 ? styles.wordCountError : null]}>
              {subjectWordCount} / 10 words
            </Text>
          </View>
          <TextInput
            placeholder="Brief description of your issue"
            placeholderTextColor={palette.onSurfaceVariant}
            returnKeyType="next"
            style={[styles.textInput, touched.subject && errors.subject ? styles.textInputError : null]}
            value={form.subject}
            onBlur={() => touchField('subject')}
            onChangeText={(v) => setField('subject', v)}
          />
          {touched.subject && errors.subject ? (
            <Text style={styles.fieldError}>{errors.subject}</Text>
          ) : null}
        </View>

        <View style={styles.fieldBlock}>
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, touched.message && errors.message ? styles.fieldLabelError : null]}>
              Message
            </Text>
            <Text style={[styles.wordCount, messageWordCount > 50 ? styles.wordCountError : null]}>
              {messageWordCount} / 50 words
            </Text>
          </View>
          <TextInput
            multiline
            numberOfLines={5}
            placeholder="Describe your issue in detail"
            placeholderTextColor={palette.onSurfaceVariant}
            style={[styles.textArea, touched.message && errors.message ? styles.textInputError : null]}
            value={form.message}
            onBlur={() => touchField('message')}
            onChangeText={(v) => setField('message', v)}
          />
          {touched.message && errors.message ? (
            <Text style={styles.fieldError}>{errors.message}</Text>
          ) : null}
        </View>

        <View style={styles.fieldBlock}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Attachments</Text>
            <Text style={styles.optionalLabel}>Optional · up to 3 files</Text>
          </View>

          {attachments.map((file, index) => (
            <View key={`${file.name}-${index}`} style={styles.attachmentRow}>
              <View style={styles.attachmentIconWrap}>
                <MaterialIcons color={palette.primary} name="attach-file" size={18} />
              </View>
              <View style={styles.attachmentCopy}>
                <Text numberOfLines={1} style={styles.attachmentName}>{file.name}</Text>
                <Text style={styles.attachmentSize}>{formatFileSize(file.size ?? 0)}</Text>
              </View>
              <Pressable hitSlop={8} onPress={() => handleRemoveAttachment(index)}>
                <MaterialIcons color={palette.error} name="close" size={20} />
              </Pressable>
            </View>
          ))}

          {attachments.length < 3 ? (
            <Pressable style={styles.attachButton} onPress={handlePickAttachment}>
              <MaterialIcons color={palette.primary} name="add" size={18} />
              <Text style={styles.attachButtonText}>
                {attachments.length === 0 ? 'Add attachment' : 'Add another file'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.submitRow}>
        <Pressable
          disabled={submitting}
          style={[styles.submitButton, submitting ? styles.submitButtonDisabled : null]}
          onPress={handleSubmit}>
          {submitting ? (
            <ActivityIndicator color={palette.onPrimary} size="small" />
          ) : (
            <>
              <MaterialIcons color={palette.onPrimary} name="send" size={18} />
              <Text style={styles.submitButtonText}>Submit Ticket</Text>
            </>
          )}
        </Pressable>
      </View>
    </FloatingPageShell>
  );
}

const styles = StyleSheet.create({
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
  heroBody: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: typography.body,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginHorizontal: spacing.marginMobile,
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  fieldBlock: {
    gap: spacing.xs,
  },
  fieldLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    color: palette.onSurface,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  fieldLabelError: {
    color: palette.error,
  },
  fieldError: {
    color: palette.error,
    fontSize: typography.label,
    marginTop: 2,
  },
  wordCount: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
    fontWeight: '600',
  },
  wordCountError: {
    color: palette.error,
  },
  optionalLabel: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
  },
  readonlyField: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  readonlyText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.body,
    fontStyle: 'italic',
  },
  textInput: {
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.onSurface,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textInputError: {
    borderColor: palette.error,
  },
  textArea: {
    borderColor: palette.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.onSurface,
    fontSize: typography.body,
    minHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
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
  attachmentIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  attachmentCopy: {
    flex: 1,
    gap: 2,
  },
  attachmentName: {
    color: palette.onSurface,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  attachmentSize: {
    color: palette.onSurfaceVariant,
    fontSize: typography.label,
  },
  attachButton: {
    alignItems: 'center',
    borderColor: 'rgba(0, 92, 171, 0.24)',
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  attachButtonText: {
    color: palette.primary,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  submitRow: {
    marginBottom: spacing.xl,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 52,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: palette.onPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
