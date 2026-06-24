import { File } from 'expo-file-system';
import type { DocumentPickerAsset } from 'expo-document-picker';
import * as XLSX from 'xlsx';

import type { CoverCycle, CreateCoverPayload } from '@/features/covers/covers-api';
import { bulkCoverImportFieldDefinitions } from '@/features/covers/bulk-import/config';
import { parseExcelDate } from '@/features/covers/bulk-import/date-utils';
import type {
  BulkImportFieldDefinition,
  BulkImportPreviewRow,
  BulkImportSummary,
  BulkImportValidationError,
  FieldMappingConfig,
  ParsedExcelFile,
  ParsedExcelRow,
} from '@/features/covers/bulk-import/types';

function trimStringValue(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeHeaderLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function sanitizeString(value: unknown) {
  if (typeof value === 'string') {
    return trimStringValue(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return trimStringValue(String(value));
  }

  return undefined;
}

export function sanitizeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) {
      return undefined;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function sanitizeBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
    if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  }

  return undefined;
}

export function sanitizeCurrency(value: unknown) {
  const normalized = sanitizeString(value);
  return normalized ? normalized.toUpperCase() : undefined;
}

export function sanitizePhone(value: unknown) {
  const normalized = sanitizeString(value);
  if (!normalized) {
    return undefined;
  }

  const cleaned = normalized.replace(/[^\d+]/g, '');
  return cleaned || undefined;
}

function sanitizeCycle(value: unknown): CoverCycle | undefined {
  const normalized = sanitizeString(value)?.toUpperCase();
  if (normalized === 'MONTHLY' || normalized === 'ANNUAL') {
    return normalized;
  }

  return undefined;
}

function getFieldDefinition(field: keyof CreateCoverPayload): BulkImportFieldDefinition {
  return bulkCoverImportFieldDefinitions.find((definition) => definition.field === field)!;
}

const fieldHeaderAliases: Partial<Record<keyof CreateCoverPayload, string[]>> = {
  allowPushNotif: ['allow push notifications', 'push notifications', 'allow push notif'],
  currency: ['currency', 'currency code'],
  customerIdentifier: ['customer id', 'customer identifier', 'customer reference', 'customer name'],
  cycle: ['cycle', 'payment cycle', 'cover cycle'],
  email: ['email', 'email address'],
  expiryDate: ['expiry date', 'end date', 'cover expiry'],
  insurancePremium: ['premium', 'premium amount', 'insurance premium', 'amount'],
  insuranceProduct: ['product', 'insurance product', 'product name'],
  insuranceProvider: ['provider', 'insurance provider', 'insurer'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number'],
  policyNumber: ['policy number', 'policy no', 'policy'],
  vehicleReg: ['vehicle reg', 'vehicle registration', 'registration number', 'reg number'],
};

function splitCamelCase(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function getFieldHeaderAliases(field: keyof CreateCoverPayload) {
  const definition = getFieldDefinition(field);

  return Array.from(
    new Set([field, splitCamelCase(field), definition.label, ...(fieldHeaderAliases[field] ?? [])].map(normalizeHeaderLabel))
  );
}

export function headerMatchesField(header: string, field: keyof CreateCoverPayload) {
  const normalizedHeader = normalizeHeaderLabel(header);

  return getFieldHeaderAliases(field).some(
    (alias) => normalizedHeader === alias || normalizedHeader.includes(alias) || alias.includes(normalizedHeader)
  );
}

function getValueFromMapping(row: ParsedExcelRow, mapping: FieldMappingConfig): unknown {
  if (!mapping.sourceColumn) {
    return undefined;
  }

  return row.raw[mapping.sourceColumn];
}

function normalizeMappedValue(field: keyof CreateCoverPayload, value: unknown) {
  switch (field) {
    case 'allowPushNotif':
      return sanitizeBoolean(value);
    case 'currency':
      return sanitizeCurrency(value);
    case 'customerIdentifier':
    case 'insuranceProduct':
    case 'insuranceProvider':
    case 'email':
    case 'policyNumber':
    case 'vehicleReg':
      return sanitizeString(value);
    case 'phone':
      return sanitizePhone(value);
    case 'insurancePremium':
      return sanitizeNumber(value);
    case 'cycle':
      return sanitizeCycle(value);
    case 'expiryDate':
      return parseExcelDate(value) ?? undefined;
    default:
      return value;
  }
}

function resolveFieldValue(row: ParsedExcelRow, mapping: FieldMappingConfig): unknown {
  const rawColumnValue = getValueFromMapping(row, mapping);

  if (mapping.mode === 'default') {
    return mapping.defaultValue;
  }

  if (mapping.mode === 'column') {
    return rawColumnValue;
  }

  if (mapping.mode === 'column_with_fallback') {
    const normalizedColumnValue = normalizeMappedValue(mapping.field, rawColumnValue);
    return normalizedColumnValue === undefined ? mapping.defaultValue : rawColumnValue;
  }

  return undefined;
}

function validatePayload(payload: Partial<CreateCoverPayload>, rowNumber: number) {
  const errors: BulkImportValidationError[] = [];

  if (!payload.customerIdentifier) {
    errors.push({ field: 'customerIdentifier', message: 'Customer identifier is required.', rowNumber });
  }

  if (!payload.cycle) {
    errors.push({ field: 'cycle', message: 'Cycle is required.', rowNumber });
  }

  if (!payload.expiryDate) {
    errors.push({ field: 'expiryDate', message: 'Expiry date is invalid or missing.', rowNumber });
  }

  if (typeof payload.insurancePremium !== 'number' || Number.isNaN(payload.insurancePremium)) {
    errors.push({ field: 'insurancePremium', message: 'Insurance premium must be a valid number.', rowNumber });
  }

  if (!payload.insuranceProduct) {
    errors.push({ field: 'insuranceProduct', message: 'Insurance product is required.', rowNumber });
  }

  if (!payload.insuranceProvider) {
    errors.push({ field: 'insuranceProvider', message: 'Insurance provider is required.', rowNumber });
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push({ field: 'email', message: 'Email format is invalid.', rowNumber });
  }

  if (payload.phone && !/^\+?\d{7,15}$/.test(payload.phone)) {
    errors.push({ field: 'phone', message: 'Phone format is invalid.', rowNumber });
  }

  return errors;
}

export function extractExcelHeaders(rows: Record<string, unknown>[]) {
  if (!rows.length) {
    return [];
  }

  const firstRow = rows[0] ?? {};
  return Object.keys(firstRow)
    .map((header) => header.trim())
    .filter(Boolean);
}

function makeUniqueHeader(header: string, usedHeaders: Set<string>, columnIndex: number) {
  const baseHeader = sanitizeString(header) ?? `Column ${columnIndex + 1}`;

  if (!usedHeaders.has(baseHeader)) {
    usedHeaders.add(baseHeader);
    return baseHeader;
  }

  let duplicateIndex = 2;
  let candidate = `${baseHeader} (${duplicateIndex})`;

  while (usedHeaders.has(candidate)) {
    duplicateIndex += 1;
    candidate = `${baseHeader} (${duplicateIndex})`;
  }

  usedHeaders.add(candidate);
  return candidate;
}

function resolveHeaderRowIndex(worksheetRows: unknown[][]) {
  let bestRowIndex = -1;
  let bestScore = -1;

  for (let rowIndex = 0; rowIndex < worksheetRows.length; rowIndex += 1) {
    const row = worksheetRows[rowIndex] ?? [];
    const candidateHeaders = row.map((cell) => sanitizeString(cell) ?? '').filter(Boolean);

    if (candidateHeaders.length < 2) {
      continue;
    }

    const matchedFields = new Set<keyof CreateCoverPayload>();

    for (const header of candidateHeaders) {
      const matchedField = bulkCoverImportFieldDefinitions.find((definition) =>
        headerMatchesField(header, definition.field)
      );

      if (matchedField) {
        matchedFields.add(matchedField.field);
      }
    }

    if (matchedFields.size > bestScore) {
      bestScore = matchedFields.size;
      bestRowIndex = rowIndex;
    }
  }

  if (bestRowIndex >= 0 && bestScore >= 2) {
    return bestRowIndex;
  }

  return worksheetRows.findIndex((row) => row.some((cell) => sanitizeString(cell) !== undefined));
}

function buildWorksheetHeaders(headerRow: unknown[]) {
  const usedHeaders = new Set<string>();

  return headerRow.map((cell, columnIndex) => makeUniqueHeader(typeof cell === 'string' ? cell : String(cell ?? ''), usedHeaders, columnIndex));
}

function normalizeWorksheetRows(worksheetRows: unknown[][], headers: string[], headerRowIndex: number) {
  return worksheetRows.slice(headerRowIndex + 1).map<ParsedExcelRow>((row, index) => {
    const normalizedRaw = headers.reduce<Record<string, unknown>>((accumulator, header, columnIndex) => {
      accumulator[header] = row[columnIndex] ?? '';
      return accumulator;
    }, {});

    return {
      raw: normalizedRaw,
      rowNumber: headerRowIndex + index + 2,
    };
  });
}

export function normalizeExcelRows(rows: Record<string, unknown>[]) {
  return rows.map<ParsedExcelRow>((row, index) => {
    const normalizedRaw = Object.entries(row).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
      const normalizedKey = key.trim();
      if (!normalizedKey) {
        return accumulator;
      }

      accumulator[normalizedKey] = value;
      return accumulator;
    }, {});

    return {
      raw: normalizedRaw,
      rowNumber: index + 2,
    };
  });
}

export async function parseExcelFile(file: DocumentPickerAsset): Promise<ParsedExcelFile> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const supportedExtensions = ['xlsx', 'xls', 'csv'];

  if (!supportedExtensions.includes(extension)) {
    throw new Error('Unsupported file type. Use .xlsx, .xls, or .csv.');
  }

  const sourceFile = new File(file.uri);
  const base64 = await sourceFile.base64();
  const workbook = XLSX.read(base64, { cellDates: true, type: 'base64' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('No worksheet was found in the selected file.');
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  if (!firstSheet) {
    throw new Error('Unable to read the first worksheet from the selected file.');
  }

  const worksheetRows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    blankrows: false,
    defval: '',
    header: 1,
    raw: true,
  });

  if (!worksheetRows.length) {
    throw new Error('The selected file does not contain any rows to import.');
  }

  const headerRowIndex = resolveHeaderRowIndex(worksheetRows);
  if (headerRowIndex < 0) {
    throw new Error('No headers were detected in the selected file.');
  }

  const headers = buildWorksheetHeaders(worksheetRows[headerRowIndex] ?? []);

  if (!headers.length) {
    throw new Error('No headers were detected in the selected file.');
  }

  const normalizedRows = normalizeWorksheetRows(worksheetRows, headers, headerRowIndex);
  const nonEmptyRows = normalizedRows.filter((row) =>
    Object.values(row.raw).some((value) => sanitizeString(value) !== undefined || typeof value === 'number')
  );

  if (!nonEmptyRows.length) {
    throw new Error('The selected file does not contain any usable data rows.');
  }

  return {
    columnCount: headers.length,
    file,
    fileName: file.name,
    headers,
    previewRows: nonEmptyRows.slice(0, 5),
    rowCount: nonEmptyRows.length,
    rows: nonEmptyRows,
    sheetName: firstSheetName,
  };
}

export function validateFieldMappings(mappings: FieldMappingConfig[]) {
  return mappings.reduce<Record<string, string>>((accumulator, mapping) => {
    const definition = getFieldDefinition(mapping.field);

    if (definition.required && mapping.mode === 'empty') {
      accumulator[mapping.field] = `${definition.label} is required. Map a column or set a default value.`;
      return accumulator;
    }

    if ((mapping.mode === 'column' || mapping.mode === 'column_with_fallback') && !mapping.sourceColumn) {
      accumulator[mapping.field] = `Choose a source column for ${definition.label}.`;
      return accumulator;
    }

    if ((mapping.mode === 'default' || mapping.mode === 'column_with_fallback') && mapping.defaultValue === undefined) {
      accumulator[mapping.field] = `Set a default value for ${definition.label}.`;
      return accumulator;
    }

    return accumulator;
  }, {});
}

export function mapRowsToCreateCoverPayload(
  rows: ParsedExcelRow[],
  mappings: FieldMappingConfig[]
): BulkImportPreviewRow[] {
  const mappingLookup = new Map(mappings.map((mapping) => [mapping.field, mapping]));

  return rows.map((row) => {
    const partialPayload: Partial<CreateCoverPayload> = {};

    for (const definition of bulkCoverImportFieldDefinitions) {
      const mapping = mappingLookup.get(definition.field);
      if (!mapping) {
        continue;
      }

      const resolvedValue = resolveFieldValue(row, mapping);
      const normalizedValue = normalizeMappedValue(definition.field, resolvedValue);

      if (normalizedValue !== undefined) {
        partialPayload[definition.field] = normalizedValue as never;
      }
    }

    const errors = validatePayload(partialPayload, row.rowNumber);

    return {
      errors,
      isValid: errors.length === 0,
      payload: errors.length === 0 ? (partialPayload as CreateCoverPayload) : undefined,
      raw: row.raw,
      rowNumber: row.rowNumber,
    };
  });
}

export function validateBulkCoverRows(previewRows: BulkImportPreviewRow[]) {
  return previewRows.reduce<BulkImportSummary>(
    (summary, row) => {
      summary.totalRows += 1;
      if (row.isValid) {
        summary.validRows += 1;
      } else {
        summary.invalidRows += 1;
      }
      return summary;
    },
    { invalidRows: 0, totalRows: 0, validRows: 0 }
  );
}
