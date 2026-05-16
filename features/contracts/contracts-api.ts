import type { DocumentPickerAsset } from 'expo-document-picker';

import { apiConfig } from '@/constants/api';
import { parseApiEnvelope, parseApiEnvelopeNullable } from '@/features/api/api-client';

export type ContractRecord = {
  allowPushNotif: boolean;
  contractExpiryDate: string;
  contractFileMimeType: string | null;
  contractFileName: string | null;
  contractFileObjectKey: string | null;
  contractFileSize: number | null;
  contractFileUrl: string | null;
  contractNumber: string;
  contractStartDate: string;
  contractingParties: string;
  createdAt: string;
  deletedAt: string | null;
  description: string | null;
  id: string;
  notificationsSent: {
    annualDue: boolean;
    expiryDays: number[];
  } | null;
  renewalTimeline?: ContractRenewalTimelineItem[];
  renewedAt: string | null;
  updatedAt: string;
  userId: string;
};

export type ContractRenewalTimelineItem = {
  endDate: string;
  renewedAt: string;
  startDate: string;
};

export type CreateContractPayload = {
  allowPushNotif?: boolean;
  contractExpiryDate: string;
  contractFile?: DocumentPickerAsset | null;
  contractNumber: string;
  contractStartDate: string;
  contractingParties: string;
  description?: string;
};

export type UpdateContractPayload = Partial<Omit<CreateContractPayload, 'contractFile'>> & {
  contractFile?: DocumentPickerAsset | null;
};

export type MarkContractExpiryCompletePayload = {
  contractExpiryDate: string;
};

function authHeaders(accessToken: string) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

function jsonHeaders(accessToken: string) {
  return {
    ...authHeaders(accessToken),
    'Content-Type': 'application/json',
  };
}

function buildContractFormData(payload: CreateContractPayload | UpdateContractPayload) {
  const formData = new FormData();

  if (payload.contractNumber !== undefined) {
    formData.append('contractNumber', payload.contractNumber);
  }

  if (payload.contractingParties !== undefined) {
    formData.append('contractingParties', payload.contractingParties);
  }

  if (payload.description !== undefined) {
    formData.append('description', payload.description);
  }

  if (payload.contractStartDate !== undefined) {
    formData.append('contractStartDate', payload.contractStartDate);
  }

  if (payload.contractExpiryDate !== undefined) {
    formData.append('contractExpiryDate', payload.contractExpiryDate);
  }

  if (payload.allowPushNotif !== undefined) {
    formData.append('allowPushNotif', String(payload.allowPushNotif));
  }

  if (payload.contractFile) {
    if (payload.contractFile.file) {
      formData.append('contractFile', payload.contractFile.file);
    } else {
      formData.append('contractFile', {
        name: payload.contractFile.name,
        type: payload.contractFile.mimeType ?? 'application/octet-stream',
        uri: payload.contractFile.uri,
      } as never);
    }
  }

  return formData;
}

function hasContractFile(
  payload: CreateContractPayload | UpdateContractPayload
): payload is (CreateContractPayload | UpdateContractPayload) & {
  contractFile: DocumentPickerAsset;
} {
  return Boolean(payload.contractFile);
}

function buildContractJsonPayload(payload: CreateContractPayload | UpdateContractPayload) {
  return JSON.stringify({
    allowPushNotif: payload.allowPushNotif,
    contractExpiryDate: payload.contractExpiryDate,
    contractNumber: payload.contractNumber,
    contractStartDate: payload.contractStartDate,
    contractingParties: payload.contractingParties,
    description: payload.description,
  });
}

export async function getContracts(accessToken: string): Promise<ContractRecord[]> {
  const response = await fetch(`${apiConfig.baseUrl}/contracts`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<ContractRecord[]>(response);
}

export async function getContractById(
  accessToken: string,
  contractId: string
): Promise<ContractRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/contracts/${contractId}`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<ContractRecord>(response);
}

export async function createContract(
  accessToken: string,
  payload: CreateContractPayload
): Promise<ContractRecord> {
  const requestHasFile = hasContractFile(payload);
  const response = await fetch(`${apiConfig.baseUrl}/contracts`, {
    body: requestHasFile ? buildContractFormData(payload) : buildContractJsonPayload(payload),
    headers: requestHasFile ? authHeaders(accessToken) : jsonHeaders(accessToken),
    method: 'POST',
  });

  return parseApiEnvelope<ContractRecord>(response);
}

export async function updateContract(
  accessToken: string,
  contractId: string,
  payload: UpdateContractPayload
): Promise<ContractRecord> {
  const requestHasFile = hasContractFile(payload);
  const response = await fetch(`${apiConfig.baseUrl}/contracts/${contractId}`, {
    body: requestHasFile ? buildContractFormData(payload) : buildContractJsonPayload(payload),
    headers: requestHasFile ? authHeaders(accessToken) : jsonHeaders(accessToken),
    method: 'PATCH',
  });

  return parseApiEnvelope<ContractRecord>(response);
}

export async function markContractExpiryComplete(
  accessToken: string,
  contractId: string,
  payload: MarkContractExpiryCompletePayload
): Promise<ContractRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/contracts/${contractId}/mark-expiry-complete`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(accessToken),
    method: 'POST',
  });

  return parseApiEnvelope<ContractRecord>(response);
}

export async function getContractRenewalTimeline(
  accessToken: string,
  contractId: string
): Promise<ContractRenewalTimelineItem[]> {
  const response = await fetch(`${apiConfig.baseUrl}/contracts/${contractId}/renewal-timeline`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<ContractRenewalTimelineItem[]>(response);
}

export async function deleteContract(accessToken: string, contractId: string): Promise<void> {
  const response = await fetch(`${apiConfig.baseUrl}/contracts/${contractId}`, {
    headers: authHeaders(accessToken),
    method: 'DELETE',
  });

  await parseApiEnvelopeNullable(response);
}
