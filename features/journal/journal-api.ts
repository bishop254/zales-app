import { apiConfig } from '@/constants/api';
import { parseApiEnvelope, parseApiEnvelopeNullable } from '@/features/api/api-client';

export type JournalRecord = {
  accomplishments: string | null;
  affirmation: string | null;
  createdAt: string;
  deletedAt: string | null;
  deleteReason: string | null;
  deletedBy: string | null;
  gratefulFor: string | null;
  id: string;
  journalDate: string;
  mood: string | null;
  purgeAfter: string | null;
  quoteOfTheDay: string | null;
  thoughts: string | null;
  updatedAt: string;
  userId: string;
};

export type JournalListResponse = {
  data: JournalRecord[];
  meta: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type GetJournalsParams = {
  month?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  year?: number;
};

export type CreateJournalPayload = {
  accomplishments?: string;
  affirmation?: string;
  gratefulFor?: string;
  mood?: string;
  quoteOfTheDay?: string;
  thoughts?: string;
};

export type UpdateJournalPayload = {
  accomplishments?: string | null;
  affirmation?: string | null;
  gratefulFor?: string | null;
  mood?: string | null;
  quoteOfTheDay?: string | null;
  thoughts?: string | null;
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

function buildQueryString(params?: GetJournalsParams) {
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

  if (params.year !== undefined) {
    searchParams.set('year', String(params.year));
  }

  if (params.month !== undefined) {
    searchParams.set('month', String(params.month));
  }

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getJournals(accessToken: string, params?: GetJournalsParams): Promise<JournalListResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/journals${buildQueryString(params)}`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<JournalListResponse>(response);
}

export async function getJournalById(accessToken: string, journalId: string): Promise<JournalRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/journals/${journalId}`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<JournalRecord>(response);
}

export async function getTodayJournal(accessToken: string): Promise<JournalRecord | null> {
  const response = await fetch(`${apiConfig.baseUrl}/journals/today`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelopeNullable<JournalRecord>(response);
}

export async function createJournal(accessToken: string, payload: CreateJournalPayload): Promise<JournalRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/journals`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(accessToken),
    method: 'POST',
  });

  return parseApiEnvelope<JournalRecord>(response);
}

export async function updateJournal(
  accessToken: string,
  journalId: string,
  payload: UpdateJournalPayload,
): Promise<JournalRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/journals/${journalId}`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(accessToken),
    method: 'PATCH',
  });

  return parseApiEnvelope<JournalRecord>(response);
}

export async function deleteJournal(accessToken: string, journalId: string): Promise<void> {
  const response = await fetch(`${apiConfig.baseUrl}/journals/${journalId}`, {
    headers: authHeaders(accessToken),
    method: 'DELETE',
  });

  await parseApiEnvelopeNullable(response);
}
