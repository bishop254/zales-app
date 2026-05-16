import type { DocumentPickerAsset } from 'expo-document-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppMessageModal } from '@/components/app/app-message-modal';
import { AppModal } from '@/components/app/app-modal';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { AuthTextField } from '@/components/auth/auth-primitives';
import { apiConfig } from '@/constants/api';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import {
  createContract,
  getContractById,
  updateContract,
} from '@/features/contracts/contracts-api';
import { useAuth } from '@/providers/auth-provider';
import { useSubscription } from '@/providers/subscription-provider';
import { useToast } from '@/providers/toast-provider';

type ContractForm = {
  allowPushNotif: boolean;
  contractExpiryDate: string;
  contractNumber: string;
  contractStartDate: string;
  contractingParties: string;
  description: string;
};

type ContractTouched = {
  contractExpiryDate: boolean;
  contractNumber: boolean;
  contractStartDate: boolean;
  contractingParties: boolean;
};

type DateFieldKey = 'contractStartDate' | 'contractExpiryDate';

type ExistingFileState = {
  name: string;
  url: string | null;
} | null;

type InfoModalState = {
  eyebrow: string;
  message: string;
  title: string;
  visible: boolean;
};

const INITIAL_FORM: ContractForm = {
  allowPushNotif: true,
  contractExpiryDate: '',
  contractNumber: '',
  contractStartDate: '',
  contractingParties: '',
  description: '',
};

const INITIAL_TOUCHED: ContractTouched = {
  contractExpiryDate: false,
  contractNumber: false,
  contractStartDate: false,
  contractingParties: false,
};

function formatDateIso(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  if (!size || size <= 0) {
    return 'Unknown size';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function validateContractForm(form: ContractForm) {
  if (!form.contractNumber.trim()) return 'Contract number is required.';
  if (!form.contractingParties.trim()) return 'Contracting parties are required.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.contractStartDate.trim())) return 'Select a valid start date.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.contractExpiryDate.trim())) return 'Select a valid expiry date.';
  if (new Date(`${form.contractExpiryDate}T00:00:00`) < new Date(`${form.contractStartDate}T00:00:00`)) {
    return 'Contract expiry date cannot be earlier than the start date.';
  }
  return null;
}

export default function ContractFormScreen() {
  const { session } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string | string[]; mode?: string | string[] }>();
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const rawContractId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isEditMode = rawMode === 'edit';
  const contractId = rawContractId ?? null;

  const [form, setForm] = useState<ContractForm>(INITIAL_FORM);
  const [touched, setTouched] = useState<ContractTouched>(INITIAL_TOUCHED);
  const [submitting, setSubmitting] = useState(false);
  const [loadingContract, setLoadingContract] = useState(isEditMode);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateFieldKey>('contractStartDate');
  const [selectedFile, setSelectedFile] = useState<DocumentPickerAsset | null>(null);
  const [existingFile, setExistingFile] = useState<ExistingFileState>(null);
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

  const formErrors = useMemo(
    () => ({
      contractExpiryDate: /^\d{4}-\d{2}-\d{2}$/.test(form.contractExpiryDate.trim())
        ? ''
        : 'Select a valid expiry date.',
      contractNumber: !form.contractNumber.trim() ? 'Contract number is required.' : '',
      contractStartDate: /^\d{4}-\d{2}-\d{2}$/.test(form.contractStartDate.trim())
        ? ''
        : 'Select a valid start date.',
      contractingParties: !form.contractingParties.trim() ? 'Contracting parties are required.' : '',
    }),
    [form]
  );

  const validationMessage = useMemo(() => validateContractForm(form), [form]);
  const canSubmitForm = useMemo(
    () => Object.values(formErrors).every((value) => !value) && !validationMessage,
    [formErrors, validationMessage]
  );

  useEffect(() => {
    const accessToken: string | null = session?.accessToken ?? null;

    if (!isEditMode || !contractId || !accessToken) {
      setLoadingContract(false);
      return;
    }

    let active = true;

    async function loadContract() {
      setLoadingContract(true);

      try {
        const contract = await getContractById(accessToken!, contractId!);

        if (!active) {
          return;
        }

        setForm({
          allowPushNotif: contract.allowPushNotif,
          contractExpiryDate: contract.contractExpiryDate,
          contractNumber: contract.contractNumber,
          contractStartDate: contract.contractStartDate,
          contractingParties: contract.contractingParties,
          description: contract.description ?? '',
        });
        setExistingFile(
          contract.contractFileName
            ? { name: contract.contractFileName, url: contract.contractFileUrl }
            : null
        );
      } catch (error) {
        if (!active) {
          return;
        }

        if (!(error instanceof UnauthorizedError)) {
          const message = error instanceof Error ? error.message : 'Unable to load contract details.';
          showToast(message, 'error');
          setInfoModal({
            eyebrow: 'Contract editor',
            message,
            title: 'Edit contract unavailable',
            visible: true,
          });
        }
      } finally {
        if (active) {
          setLoadingContract(false);
        }
      }
    }

    loadContract();

    return () => {
      active = false;
    };
  }, [contractId, isEditMode, session?.accessToken, showToast]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!subscriptionLoading && !hasActiveSubscription) {
    return <Redirect href="/billing" />;
  }

  if (isEditMode && !contractId) {
    return <Redirect href="/contracts" />;
  }

  function closeEditor() {
    router.replace('/contracts');
  }

  function updateForm<K extends keyof ContractForm>(key: K, value: ContractForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function markTouched(field: keyof ContractTouched) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function getFieldError(field: keyof ContractTouched) {
    return touched[field] ? formErrors[field] : '';
  }

  function openDatePicker(field: DateFieldKey) {
    const source = form[field] && /^\d{4}-\d{2}-\d{2}$/.test(form[field])
      ? new Date(`${form[field]}T00:00:00`)
      : new Date();
    setPickerMonth(new Date(source.getFullYear(), source.getMonth(), 1));
    setActiveDateField(field);
    setDatePickerOpen(true);
    markTouched(field);
  }

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: '*/*',
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      setSelectedFile(result.assets[0]);
    } catch {
      showToast('Unable to open file picker.', 'error');
    }
  }

  async function handleOpenExistingFile() {
    if (!session?.accessToken || !contractId || !existingFile?.name) {
      return;
    }

    try {
      const downloadedFile = await File.downloadFileAsync(
        `${apiConfig.baseUrl}/contracts/${contractId}/file`,
        new File(Paths.cache, `${contractId}-${sanitizeFileName(existingFile.name)}`),
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          idempotent: true,
        }
      );

      const mimeType = 'application/octet-stream';
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadedFile.uri, {
          UTI: mimeType,
          dialogTitle: existingFile.name,
          mimeType,
        });
        return;
      }

      showToast('File sharing is not available on this device.', 'error');
    } catch {
      showToast('Unable to open the saved contract file.', 'error');
    }
  }

  async function handleSubmit() {
    const accessToken: string | null = session?.accessToken ?? null;

    if (!accessToken) {
      return;
    }

    if (!canSubmitForm) {
      setTouched({
        contractExpiryDate: true,
        contractNumber: true,
        contractStartDate: true,
        contractingParties: true,
      });

      if (validationMessage) {
        showToast(validationMessage, 'error');
      }

      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        allowPushNotif: form.allowPushNotif,
        contractExpiryDate: form.contractExpiryDate.trim(),
        contractFile: selectedFile,
        contractNumber: form.contractNumber.trim(),
        contractStartDate: form.contractStartDate.trim(),
        contractingParties: form.contractingParties.trim(),
        description: form.description.trim() || undefined,
      };

      if (isEditMode && contractId) {
        await updateContract(accessToken, contractId, payload);
      } else {
        await createContract(accessToken, payload);
      }

      showToast(isEditMode ? 'Contract updated successfully.' : 'Contract created successfully.');
      router.replace('/contracts');
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        const message = error instanceof Error ? error.message : 'Unable to save contract.';
        showToast(message, 'error');
        setInfoModal({
          eyebrow: isEditMode ? 'Update failed' : 'Create failed',
          message,
          title: isEditMode ? 'Contract update failed' : 'Contract creation failed',
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
            message: 'Contract reminders and alerts will show from the contracts workspace.',
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
        title={isEditMode ? 'Edit contract' : 'Add contract'}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{isEditMode ? 'Update Contract' : 'Create Contract'}</Text>
          <Text style={styles.heroBody}>
            {isEditMode
              ? 'Keep this agreement current by updating the key dates, parties, and file attachment.'
              : 'Capture the key contract details below so your records and reminders stay organised.'}
          </Text>
        </View>

        <View style={styles.contentWrap}>
          {loadingContract ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={palette.primary} size="small" />
              <Text style={styles.loadingText}>Loading contract details...</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Contract Details</Text>
                <View style={styles.formStack}>
                  <AuthTextField
                    autoCapitalize="characters"
                    error={getFieldError('contractNumber')}
                    icon="confirmation-number"
                    label="Contract Number"
                    placeholder="CTR-2026-001"
                    value={form.contractNumber}
                    onBlur={() => markTouched('contractNumber')}
                    onChangeText={(value) => updateForm('contractNumber', value)}
                  />
                  <AuthTextField
                    autoCapitalize="words"
                    error={getFieldError('contractingParties')}
                    icon="groups"
                    label="Contracting Parties"
                    placeholder="Zales Ltd and Horizon Retail"
                    value={form.contractingParties}
                    onBlur={() => markTouched('contractingParties')}
                    onChangeText={(value) => updateForm('contractingParties', value)}
                  />
                  <AuthTextField
                    autoCapitalize="sentences"
                    icon="description"
                    label="Description"
                    multiline
                    numberOfLines={4}
                    optionalLabel="(Optional)"
                    placeholder="Short contract summary, scope, or context"
                    style={styles.textAreaInput}
                    textAlignVertical="top"
                    value={form.description}
                    onChangeText={(value) => updateForm('description', value)}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Timeline</Text>
                <View style={styles.formStack}>
                  <AuthTextField
                    error={getFieldError('contractStartDate')}
                    icon="event-available"
                    label="Contract Start Date"
                    placeholder="Select start date"
                    showSoftInputOnFocus={false}
                    value={form.contractStartDate ? formatReadableDate(form.contractStartDate) : ''}
                    onFocus={() => openDatePicker('contractStartDate')}
                  />
                  <AuthTextField
                    error={getFieldError('contractExpiryDate')}
                    icon="event-busy"
                    label="Contract Expiry Date"
                    placeholder="Select expiry date"
                    showSoftInputOnFocus={false}
                    value={form.contractExpiryDate ? formatReadableDate(form.contractExpiryDate) : ''}
                    onFocus={() => openDatePicker('contractExpiryDate')}
                  />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Document</Text>
                <View style={styles.formStack}>
                  <View style={styles.documentCard}>
                    <View style={styles.documentIconWrap}>
                      <MaterialIcons color={palette.primary} name="attach-file" size={22} />
                    </View>
                    <View style={styles.documentCopy}>
                      <Text style={styles.documentTitle}>
                        {selectedFile?.name ?? existingFile?.name ?? 'No contract file attached'}
                      </Text>
                      <Text style={styles.documentBody}>
                        {selectedFile
                          ? `${formatFileSize(selectedFile.size)} selected for upload`
                          : existingFile
                            ? 'Saved contract file attached to this record'
                            : 'Attach a PDF, image, or supporting document if needed.'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.documentActions}>
                    <Pressable style={styles.inlineActionButton} onPress={handlePickFile}>
                      <MaterialIcons color={palette.primary} name="upload-file" size={18} />
                      <Text style={styles.inlineActionButtonText}>
                        {selectedFile || existingFile ? 'Replace file' : 'Choose file'}
                      </Text>
                    </Pressable>
                    {selectedFile ? (
                      <Pressable
                        style={[styles.inlineActionButton, styles.inlineActionButtonMuted]}
                        onPress={() => setSelectedFile(null)}>
                        <MaterialIcons color={palette.onSurface} name="close" size={18} />
                        <Text style={[styles.inlineActionButtonText, styles.inlineActionButtonTextMuted]}>
                          Clear selection
                        </Text>
                      </Pressable>
                    ) : null}
                    {!selectedFile && existingFile ? (
                      <Pressable
                        style={[styles.inlineActionButton, styles.inlineActionButtonMuted]}
                        onPress={handleOpenExistingFile}>
                        <MaterialIcons color={palette.onSurface} name="open-in-new" size={18} />
                        <Text style={[styles.inlineActionButtonText, styles.inlineActionButtonTextMuted]}>
                          Open current file
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <Pressable style={styles.switchRow} onPress={() => updateForm('allowPushNotif', !form.allowPushNotif)}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchTitle}>Allow notifications</Text>
                    <Text style={styles.switchSubtitle}>Keep reminder notifications enabled for this contract.</Text>
                  </View>
                  <View style={[styles.switchPill, form.allowPushNotif ? styles.switchPillActive : null]}>
                    <View
                      style={[
                        styles.switchThumb,
                        form.allowPushNotif ? styles.switchThumbActive : null,
                      ]}
                    />
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
                      <Text style={styles.actionButtonText}>{isEditMode ? 'Save changes' : 'Create contract'}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </FloatingPageShell>

      <AppModal
        footer={
          <View style={styles.modalFooter}>
            <Pressable style={[styles.modalButton, styles.modalButtonOutline]} onPress={() => setDatePickerOpen(false)}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextOutline]}>Cancel</Text>
            </Pressable>
          </View>
        }
        frameStyle={styles.dateModalFrame}
        title={activeDateField === 'contractStartDate' ? 'Select start date' : 'Select expiry date'}
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}>
        <View style={styles.calendarHeader}>
          <Pressable
            style={styles.calendarNavButton}
            onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
            <MaterialIcons color={palette.primary} name="chevron-left" size={22} />
          </Pressable>
          <Text style={styles.calendarTitle}>
            {pickerMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable
            style={styles.calendarNavButton}
            onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
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
          {buildCalendarDays(pickerMonth).map((day, index) => {
            const iso = day ? formatDateIso(day) : null;
            const selected = iso === form[activeDateField];
            const isDisabled =
              activeDateField === 'contractExpiryDate' &&
              day &&
              form.contractStartDate &&
              /^\d{4}-\d{2}-\d{2}$/.test(form.contractStartDate)
                ? new Date(`${iso}T00:00:00`) < new Date(`${form.contractStartDate}T00:00:00`)
                : false;

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
                  updateForm(activeDateField, formatDateIso(day!));
                  setDatePickerOpen(false);
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

      <AppMessageModal
        eyebrow={infoModal.eyebrow}
        message={infoModal.message}
        title={infoModal.title}
        visible={infoModal.visible}
        onClose={() =>
          setInfoModal((current) => ({
            ...current,
            visible: false,
          }))
        }
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
  contentWrap: {
    gap: spacing.lg,
    paddingHorizontal: spacing.marginMobile,
  },
  dateModalFrame: {
    maxHeight: '56%',
    maxWidth: 420,
  },
  documentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  documentBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
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
  documentTitle: {
    color: palette.onSurface,
    fontSize: typography.body,
    fontWeight: '700',
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
  inlineActionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.08)',
    borderColor: 'rgba(0, 92, 171, 0.16)',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  inlineActionButtonMuted: {
    backgroundColor: 'transparent',
    borderColor: palette.outlineVariant,
  },
  inlineActionButtonText: {
    color: palette.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  inlineActionButtonTextMuted: {
    color: palette.onSurface,
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
  textAreaInput: {
    minHeight: 112,
    paddingTop: spacing.sm,
  },
});
