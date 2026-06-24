import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { useMemo, useState } from 'react';

import { bulkCoverImportFieldDefinitions, initialBulkCoverFieldMappings } from '@/features/covers/bulk-import/config';
import {
  headerMatchesField,
  mapRowsToCreateCoverPayload,
  parseExcelFile,
  validateBulkCoverRows,
  validateFieldMappings,
} from '@/features/covers/bulk-import/utils';
import type {
  BulkImportPreviewRow,
  BulkImportStep,
  FieldMappingConfig,
  ParsedExcelFile,
  PreviewFilter,
} from '@/features/covers/bulk-import/types';

const stepOrder: BulkImportStep[] = ['file', 'mapping', 'defaults', 'preview'];

function getNextStep(step: BulkImportStep) {
  const index = stepOrder.indexOf(step);
  return stepOrder[Math.min(stepOrder.length - 1, index + 1)];
}

function getPreviousStep(step: BulkImportStep) {
  const index = stepOrder.indexOf(step);
  return stepOrder[Math.max(0, index - 1)];
}

function getSuggestedFieldMapping(field: string, headers: string[]) {
  return headers.find((header) => headerMatchesField(header, field as FieldMappingConfig['field']));
}

export function useBulkCoverImport() {
  const [step, setStep] = useState<BulkImportStep>('file');
  const [selectedFile, setSelectedFile] = useState<DocumentPickerAsset | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedExcelFile | null>(null);
  const [mappings, setMappings] = useState<FieldMappingConfig[]>(initialBulkCoverFieldMappings);
  const [previewRows, setPreviewRows] = useState<BulkImportPreviewRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('ALL');
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [mappingErrors, setMappingErrors] = useState<Record<string, string>>({});
  const [submissionPreviewVisible, setSubmissionPreviewVisible] = useState(false);
  const [submittedPayloadText, setSubmittedPayloadText] = useState('');

  const summary = useMemo(() => validateBulkCoverRows(previewRows), [previewRows]);

  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === 'VALID') {
      return previewRows.filter((row) => row.isValid);
    }

    if (previewFilter === 'INVALID') {
      return previewRows.filter((row) => !row.isValid);
    }

    return previewRows;
  }, [previewFilter, previewRows]);

  function updateMapping(field: FieldMappingConfig['field'], update: Partial<FieldMappingConfig>) {
    setMappings((current) =>
      current.map((mapping) => {
        if (mapping.field !== field) {
          return mapping;
        }

        return { ...mapping, ...update };
      })
    );
    setMappingErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function applyHeaderSuggestions(file: ParsedExcelFile) {
    setMappings((current) =>
      current.map((mapping) => {
        if (mapping.mode !== 'empty') {
          return mapping;
        }

        const suggestedColumn = getSuggestedFieldMapping(mapping.field, file.headers);
        if (!suggestedColumn) {
          return mapping;
        }

        return {
          ...mapping,
          mode: 'column',
          sourceColumn: suggestedColumn,
        };
      })
    );
  }

  async function pickFile() {
    setFileError('');
    setLoading(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
      });

      if (result.canceled || !result.assets?.[0]) {
        setLoading(false);
        return;
      }

      const asset = result.assets[0];
      const nextParsedFile = await parseExcelFile(asset);
      setSelectedFile(asset);
      setParsedFile(nextParsedFile);
      setPreviewRows([]);
      setPreviewFilter('ALL');
      setStep('mapping');
      applyHeaderSuggestions(nextParsedFile);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Unable to parse the selected file.');
    } finally {
      setLoading(false);
    }
  }

  function resetImport() {
    setSelectedFile(null);
    setParsedFile(null);
    setMappings(initialBulkCoverFieldMappings);
    setPreviewRows([]);
    setPreviewFilter('ALL');
    setLoading(false);
    setFileError('');
    setMappingErrors({});
    setStep('file');
    setSubmissionPreviewVisible(false);
    setSubmittedPayloadText('');
  }

  function goBack() {
    if (step === 'file') {
      return;
    }

    setStep(getPreviousStep(step));
  }

  function goNext() {
    if (step === 'file') {
      if (parsedFile) {
        setStep('mapping');
      }
      return;
    }

    if (step === 'mapping' || step === 'defaults') {
      const nextErrors = validateFieldMappings(mappings);
      setMappingErrors(nextErrors);

      if (Object.keys(nextErrors).length) {
        return;
      }

      if (step === 'defaults') {
        const rows = parsedFile?.rows ?? [];
        const nextPreviewRows = mapRowsToCreateCoverPayload(rows, mappings);
        setPreviewRows(nextPreviewRows);
      }
    }

    setStep(getNextStep(step));
  }

  function generatePreview() {
    const nextErrors = validateFieldMappings(mappings);
    setMappingErrors(nextErrors);

    if (Object.keys(nextErrors).length || !parsedFile) {
      return false;
    }

    const nextPreviewRows = mapRowsToCreateCoverPayload(parsedFile.rows, mappings);
    setPreviewRows(nextPreviewRows);
    setStep('preview');
    return true;
  }

  function submitPreview() {
    const validPayload = previewRows
      .filter((row) => row.isValid && row.payload)
      .map((row) => row.payload!);

    const payloadText = JSON.stringify(validPayload, null, 2);
    console.log('Bulk cover import payload preview:', validPayload);
    setSubmittedPayloadText(payloadText);
    setSubmissionPreviewVisible(true);
  }

  return {
    fieldDefinitions: bulkCoverImportFieldDefinitions,
    fileError,
    filteredPreviewRows,
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
    selectedFile,
    setPreviewFilter,
    step,
    submissionPreviewVisible,
    submittedPayloadText,
    summary,
    submitPreview,
    setSubmissionPreviewVisible,
    updateMapping,
    generatePreview,
  };
}
