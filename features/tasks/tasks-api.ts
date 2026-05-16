import { apiConfig } from '@/constants/api';
import { parseApiEnvelope, parseApiEnvelopeNullable } from '@/features/api/api-client';

export type TaskType = 'ONE_OFF' | 'REPETITIVE';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskRecurrence = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type CompletionStatus = 'NOT_COMPLETE' | 'COMPLETED';
export type DueStatus = 'NOT_YET_DUE' | 'ALMOST_DUE' | 'OVERDUE' | 'COMPLETED';

export type TaskRecord = {
  createdAt: string;
  deletedAt: string | null;
  description: string | null;
  id: string;
  notificationsSent: {
    almostDueIds: string[];
    overdueIds: string[];
  } | null;
  priority: TaskPriority;
  pushNotifications: boolean;
  recurrence: TaskRecurrence | null;
  seriesEndDate: string | null;
  seriesStartDate: string | null;
  taskCode: string;
  taskDateTime: string | null;
  taskTime: string | null;
  taskType: TaskType;
  timezone: string;
  title: string;
  updatedAt: string;
  userId: string;
};

export type TaskOccurrenceRecord = {
  completedAt: string | null;
  completionStatus: CompletionStatus;
  createdAt: string;
  dueStatus: DueStatus;
  id: string;
  notificationSent: boolean;
  scheduledAt: string;
  taskId: string;
  updatedAt: string;
};

export type TaskListResponse = {
  data: TaskRecord[];
  meta: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type GetTasksParams = {
  page?: number;
  pageSize?: number;
  priority?: TaskPriority;
  search?: string;
  taskType?: TaskType;
};

export type CreateTaskPayload = {
  description?: string;
  priority: TaskPriority;
  pushNotifications?: boolean;
  recurrence?: TaskRecurrence;
  seriesEndDate?: string;
  seriesStartDate?: string;
  taskDateTime?: string;
  taskTime?: string;
  taskType: TaskType;
  timezone?: string;
  title: string;
};

export type UpdateTaskPayload = Partial<Omit<CreateTaskPayload, 'taskType'>>;

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

function buildQueryString(params?: GetTasksParams) {
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

  if (params.priority) {
    searchParams.set('priority', params.priority);
  }

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  if (params.taskType) {
    searchParams.set('taskType', params.taskType);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getTasks(accessToken: string, params?: GetTasksParams): Promise<TaskListResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/tasks${buildQueryString(params)}`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<TaskListResponse>(response);
}

export async function getTaskById(accessToken: string, taskId: string): Promise<TaskRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/tasks/${taskId}`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<TaskRecord>(response);
}

export async function getTaskOccurrences(
  accessToken: string,
  taskId: string,
): Promise<TaskOccurrenceRecord[]> {
  const response = await fetch(`${apiConfig.baseUrl}/tasks/${taskId}/occurrences`, {
    headers: authHeaders(accessToken),
  });

  return parseApiEnvelope<TaskOccurrenceRecord[]>(response);
}

export async function createTask(accessToken: string, payload: CreateTaskPayload): Promise<TaskRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/tasks`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(accessToken),
    method: 'POST',
  });

  return parseApiEnvelope<TaskRecord>(response);
}

export async function updateTask(
  accessToken: string,
  taskId: string,
  payload: UpdateTaskPayload,
): Promise<TaskRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/tasks/${taskId}`, {
    body: JSON.stringify(payload),
    headers: jsonHeaders(accessToken),
    method: 'PATCH',
  });

  return parseApiEnvelope<TaskRecord>(response);
}

export async function completeTaskOccurrence(
  accessToken: string,
  taskId: string,
  occurrenceId: string,
): Promise<TaskOccurrenceRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/tasks/${taskId}/occurrences/${occurrenceId}/complete`, {
    headers: jsonHeaders(accessToken),
    method: 'POST',
  });

  return parseApiEnvelope<TaskOccurrenceRecord>(response);
}

export async function deleteTask(accessToken: string, taskId: string): Promise<void> {
  const response = await fetch(`${apiConfig.baseUrl}/tasks/${taskId}`, {
    headers: authHeaders(accessToken),
    method: 'DELETE',
  });

  await parseApiEnvelopeNullable(response);
}
