import type { DocumentPickerAsset } from 'expo-document-picker';

import type { CoverCycle, CreateCoverPayload } from '@/features/covers/covers-api';

export type BulkImportStep = 'file' | 'mapping' | 'defaults' | 'preview';

export type MappingMode = 'column' | 'default' | 'column_with_fallback' | 'empty';

export type BulkImportFieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum';

export type BulkImportFieldDefinition = {
  field: keyof CreateCoverPayload;
  helperText: string;
  label: string;
  required: boolean;
  type: BulkImportFieldType;
  options?: { label: string; value: CoverCycle }[];
};

export type ParsedExcelRow = {
  raw: Record<string, unknown>;
  rowNumber: number;
};

export type ParsedExcelFile = {
  columnCount: number;
  file: DocumentPickerAsset;
  fileName: string;
  headers: string[];
  previewRows: ParsedExcelRow[];
  rowCount: number;
  rows: ParsedExcelRow[];
  sheetName: string;
};

export type FieldMappingConfig = {
  defaultValue?: unknown;
  field: keyof CreateCoverPayload;
  mode: MappingMode;
  sourceColumn?: string;
};

export type BulkImportValidationError = {
  field: keyof CreateCoverPayload;
  message: string;
  rowNumber: number;
};

export type BulkImportPreviewRow = {
  errors: BulkImportValidationError[];
  isValid: boolean;
  payload?: CreateCoverPayload;
  raw: Record<string, unknown>;
  rowNumber: number;
};

export type PreviewFilter = 'ALL' | 'VALID' | 'INVALID';

export type BulkImportSummary = {
  invalidRows: number;
  totalRows: number;
  validRows: number;
};
