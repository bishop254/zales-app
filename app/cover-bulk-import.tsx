import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppModal } from '@/components/app/app-modal';
import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { BulkImportActions } from '@/components/covers/bulk-import/bulk-import-actions';
import { BulkImportStepper } from '@/components/covers/bulk-import/bulk-import-stepper';
import { ColumnMappingForm } from '@/components/covers/bulk-import/column-mapping-form';
import { DefaultValuesForm } from '@/components/covers/bulk-import/default-values-form';
import { ExcelFilePicker } from '@/components/covers/bulk-import/excel-file-picker';
import { ImportPreviewTable } from '@/components/covers/bulk-import/import-preview-table';
import { ImportValidationSummary } from '@/components/covers/bulk-import/import-validation-summary';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { useBulkCoverImport } from '@/features/covers/bulk-import/useBulkCoverImport';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

export default function CoverBulkImportScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const {
    fieldDefinitions,
    fileError,
    filteredPreviewRows,
    generatePreview,
    goBack,
    goNext,
    loading,
    mappingErrors,
    mappings,
    parsedFile,
    pickFile,
    previewFilter,
    previewRows,
    resetImport,
    setPreviewFilter,
    setSubmissionPreviewVisible,
    step,
    submissionPreviewVisible,
    submitPreview,
    submittedPayloadText,
    summary,
    updateMapping,
  } = useBulkCoverImport();

  if (!session) {
    return <Redirect href="/login" />;
  }

  const avatarLetter = ((session.name?.trim() || session.email || '?').slice(0, 1)).toUpperCase();

  function handleNext() {
    if (step === 'defaults') {
      const previewReady = generatePreview();
      if (!previewReady) {
        showToast('Resolve the highlighted mapping or default value issues first.', 'error');
      }
      return;
    }

    if (step === 'file' && !parsedFile) {
      showToast('Choose a file first to continue.', 'error');
      return;
    }

    goNext();
  }

  function handleSubmit() {
    if (summary.invalidRows > 0) {
      showToast('Fix invalid rows before showing the final array.', 'error');
      return;
    }

    submitPreview();
    showToast('Final payload array prepared. Review it before backend integration.');
  }

  return (
    <>
      <FloatingPageShell
        avatarLetter={avatarLetter}
        notificationCount={0}
        onBackPress={() => router.back()}
        onNotificationPress={() => showToast('You are all caught up right now.')}
        onProfilePress={() => router.push('/profile')}
        profileImageUrl={session.profileImageUrl}
        title="Bulk Cover Import">
        <BulkImportStepper step={step} />

        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <MaterialIcons color={palette.primary} name="upload-file" size={26} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Import multiple covers in one guided flow</Text>
            <Text style={styles.heroBody}>
              Upload a file, map columns, add defaults, validate transformed rows, and preview the final array before backend integration.
            </Text>
          </View>
        </View>

        {step === 'file' ? (
          <ExcelFilePicker error={fileError} loading={loading} onPickFile={pickFile} parsedFile={parsedFile} />
        ) : null}

        {step === 'mapping' && parsedFile ? (
          <ColumnMappingForm
            fieldDefinitions={fieldDefinitions}
            headers={parsedFile.headers}
            mappingErrors={mappingErrors}
            mappings={mappings}
            onUpdateMapping={updateMapping}
          />
        ) : null}

        {step === 'defaults' ? (
          <DefaultValuesForm
            fieldDefinitions={fieldDefinitions}
            mappingErrors={mappingErrors}
            mappings={mappings}
            onUpdateMapping={updateMapping}
          />
        ) : null}

        {step === 'preview' ? (
          <>
            <View style={styles.summaryWrap}>
              <ImportValidationSummary summary={summary} />
            </View>
            <ImportPreviewTable filter={previewFilter} onChangeFilter={setPreviewFilter} rows={filteredPreviewRows} />
          </>
        ) : null}

        <BulkImportActions
          disableSubmit={summary.invalidRows > 0 || previewRows.length === 0}
          loading={loading}
          onBack={goBack}
          onNext={handleNext}
          onReset={resetImport}
          onSubmit={handleSubmit}
          step={step}
        />
      </FloatingPageShell>

      <AppModal
        footer={
          <Pressable style={styles.modalButton} onPress={() => setSubmissionPreviewVisible(false)}>
            <Text style={styles.modalButtonText}>Close</Text>
          </Pressable>
        }
        frameStyle={styles.previewModalFrame}
        title="Final Payload Array"
        visible={submissionPreviewVisible}
        onClose={() => setSubmissionPreviewVisible(false)}>
        <Text style={styles.modalIntro}>
          This is the transformed `CreateCoverPayload[]` that would be sent to the backend once the API endpoint is ready.
        </Text>

        <View style={styles.payloadPreviewCard}>
          <ScrollView nestedScrollEnabled style={styles.payloadScroll}>
            <Text style={styles.payloadText}>{submittedPayloadText}</Text>
          </ScrollView>
        </View>
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  heroBody: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 21,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
    padding: spacing.md,
    shadowColor: '#001B3A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 92, 171, 0.1)',
    borderRadius: radius.xl,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  heroTitle: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
  modalButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  modalButtonText: {
    color: palette.white,
    fontSize: typography.bodySmall,
    fontWeight: '700',
  },
  modalIntro: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  payloadPreviewCard: {
    backgroundColor: 'rgba(246, 249, 255, 0.94)',
    borderColor: 'rgba(0, 92, 171, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    maxHeight: 420,
    padding: spacing.sm,
  },
  payloadScroll: {
    maxHeight: 392,
  },
  payloadText: {
    color: palette.onSurface,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  previewModalFrame: {
    width: '92%',
  },
  summaryWrap: {
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
  },
});
