import type { BulkImportFieldDefinition, FieldMappingConfig } from '@/features/covers/bulk-import/types';

export const bulkCoverImportFieldDefinitions: BulkImportFieldDefinition[] = [
  {
    field: 'customerIdentifier',
    helperText: 'Customer name or reference used by the cover record.',
    label: 'Customer Identifier',
    required: true,
    type: 'string',
  },
  {
    field: 'cycle',
    helperText: 'Expected values: MONTHLY or ANNUAL.',
    label: 'Payment Cycle',
    options: [
      { label: 'Monthly', value: 'MONTHLY' },
      { label: 'Annual', value: 'ANNUAL' },
    ],
    required: true,
    type: 'enum',
  },
  {
    field: 'expiryDate',
    helperText: 'Supported formats include Excel serial dates, ISO, DD/MM/YYYY, DD-MM-YYYY, and safe US dates.',
    label: 'Expiry Date',
    required: true,
    type: 'date',
  },
  {
    field: 'insurancePremium',
    helperText: 'Numeric amount only. Commas are supported and cleaned automatically.',
    label: 'Insurance Premium',
    required: true,
    type: 'number',
  },
  {
    field: 'insuranceProduct',
    helperText: 'Product name such as Motor Comprehensive.',
    label: 'Insurance Product',
    required: true,
    type: 'string',
  },
  {
    field: 'insuranceProvider',
    helperText: 'Provider name such as CIC or APA Insurance.',
    label: 'Insurance Provider',
    required: true,
    type: 'string',
  },
  {
    field: 'allowPushNotif',
    helperText: 'Supports true, false, yes, no, 1, and 0.',
    label: 'Allow Push Notifications',
    required: false,
    type: 'boolean',
  },
  {
    field: 'currency',
    helperText: 'Currency code such as KES.',
    label: 'Currency',
    required: false,
    type: 'string',
  },
  {
    field: 'email',
    helperText: 'Optional email address for the customer.',
    label: 'Email',
    required: false,
    type: 'string',
  },
  {
    field: 'phone',
    helperText: 'Optional phone number in local or international format.',
    label: 'Phone',
    required: false,
    type: 'string',
  },
  {
    field: 'policyNumber',
    helperText: 'Optional insurer policy reference.',
    label: 'Policy Number',
    required: false,
    type: 'string',
  },
  {
    field: 'vehicleReg',
    helperText: 'Optional vehicle registration such as KDA 123A.',
    label: 'Vehicle Registration',
    required: false,
    type: 'string',
  },
];

export const initialBulkCoverFieldMappings: FieldMappingConfig[] = bulkCoverImportFieldDefinitions.map(
  (definition) => ({
    defaultValue:
      definition.field === 'currency'
        ? 'KES'
        : definition.field === 'cycle'
          ? 'MONTHLY'
          : definition.field === 'allowPushNotif'
            ? true
            : undefined,
    field: definition.field,
    mode:
      definition.field === 'currency' || definition.field === 'cycle' || definition.field === 'allowPushNotif'
        ? 'default'
        : 'empty',
    sourceColumn: undefined,
  })
);
