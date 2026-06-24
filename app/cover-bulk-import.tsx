import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FloatingPageShell } from '@/components/app/floating-page-shell';
import { BulkImportActions } from '@/components/covers/bulk-import/bulk-import-actions';
import { BulkImportStepper } from '@/components/covers/bulk-import/bulk-import-stepper';
import { ColumnMappingForm } from '@/components/covers/bulk-import/column-mapping-form';
import { DefaultValuesForm } from '@/components/covers/bulk-import/default-values-form';
import { ExcelFilePicker } from '@/components/covers/bulk-import/excel-file-picker';
import { ImportPreviewTable } from '@/components/covers/bulk-import/import-preview-table';
import { ImportValidationSummary } from '@/components/covers/bulk-import/import-validation-summary';
import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { UnauthorizedError } from '@/features/api/auth-session';
import { bulkImportCovers } from '@/features/covers/covers-api';
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
    resetImport,
    setPreviewFilter,
    step,
    summary,
    updateMapping,
    getValidPayload,
  } = useBulkCoverImport();
  const [submitting, setSubmitting] = useState(false);

  if (!session) {
    return <Redirect href="/login" />;
  }

  const avatarLetter = ((session.name?.trim() || session.email || '?').slice(0, 1)).toUpperCase();
  const validPayload = getValidPayload();

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
    if (!session?.accessToken || submitting) {
      return;
    }

    if (!validPayload.length) {
      showToast('Add at least one valid row before importing covers.', 'error');
      return;
    }

    void (async () => {
      try {
        setSubmitting(true);
        const result = await bulkImportCovers(session.accessToken, { items: validPayload });
        showToast(
          result.createdCount === 1
            ? '1 cover imported successfully.'
            : `${result.createdCount} covers imported successfully.`
        );
        router.replace('/covers');
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) {
          showToast(error instanceof Error ? error.message : 'Unable to import covers.', 'error');
        }
      } finally {
        setSubmitting(false);
      }
    })();
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
          disableSubmit={validPayload.length === 0}
          loading={loading || submitting}
          onBack={goBack}
          onNext={handleNext}
          onReset={resetImport}
          onSubmit={handleSubmit}
          step={step}
        />
      </FloatingPageShell>
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
  summaryWrap: {
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.lg,
  },
});
