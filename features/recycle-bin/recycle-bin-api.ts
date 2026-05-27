import { apiConfig } from '@/constants/api';
import { parseApiEnvelope, parseApiEnvelopeNullable } from '@/features/api/api-client';

export type RecycleBinEntityType = 'COVER' | 'CONTRACT' | 'JOURNAL' | 'TASK' | 'SUPPORT_TICKET';

export type RecycleBinItemRecord = {
  createdAt: string;
  daysRemaining: number;
  deletedAt: string;
  deletedBy: string;
  displayDescription: string | null;
  displayTitle: string;
  entityId: string;
  entityType: RecycleBinEntityType;
  id: string;
  metadata: Record<string, unknown>;
  permanentlyDeletedAt: string | null;
  permanentlyDeletedBy: string | null;
  purgeAfter: string;
  restoredAt: string | null;
  restoredBy: string | null;
  retentionDays: number;
  updatedAt: string;
  userId: string;
};

export type RecycleBinListResponse = {
  data: RecycleBinItemRecord[];
  meta: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type GetRecycleBinParams = {
  entityType?: RecycleBinEntityType;
  page?: number;
  pageSize?: number;
  search?: string;
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

function buildQueryString(params?: GetRecycleBinParams) {
  const searchParams = new URLSearchParams();

  if (!params) {
    return '';
  }

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }

  if (params.pageSize !== undefined) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  if (params.entityType) {
    searchParams.set('entityType', params.entityType);
  }

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getRecycleBinItems(
  accessToken: string,
  params?: GetRecycleBinParams,
): Promise<RecycleBinListResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/recycle-bin${buildQueryString(params)}`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<RecycleBinListResponse>(response);
}

export async function getRecycleBinItemById(
  accessToken: string,
  recycleBinItemId: string,
): Promise<RecycleBinItemRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/recycle-bin/${recycleBinItemId}`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<RecycleBinItemRecord>(response);
}

export async function restoreRecycleBinItem(
  accessToken: string,
  recycleBinItemId: string,
): Promise<RecycleBinItemRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/recycle-bin/${recycleBinItemId}/restore`, {
    headers: jsonHeaders(accessToken),
    method: 'POST',
  });

  return parseApiEnvelope<RecycleBinItemRecord>(response);
}

export async function permanentlyDeleteRecycleBinItem(
  accessToken: string,
  recycleBinItemId: string,
): Promise<void> {
  const response = await fetch(`${apiConfig.baseUrl}/recycle-bin/${recycleBinItemId}/permanent`, {
    headers: authHeaders(accessToken),
    method: 'DELETE',
  });

  await parseApiEnvelopeNullable(response);
}
