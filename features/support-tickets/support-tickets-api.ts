import type { DocumentPickerAsset } from 'expo-document-picker';

import { apiConfig } from '@/constants/api';
import { parseApiEnvelope, parseApiEnvelopeNullable } from '@/features/api/api-client';

export type TicketCategory =
  | 'GENERAL_ENQUIRY'
  | 'TECHNICAL_ISSUES'
  | 'BUG_REPORT'
  | 'FEATURE_REQUEST'
  | 'ACCOUNT_SUPPORT';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';

export type TicketAttachmentMeta = {
  fileName: string;
  mimeType: string;
  objectKey: string;
  size: number;
};

export type TicketTimelineEntry = {
  actorId: string;
  actorRole: 'USER' | 'ADMIN';
  event: 'OPENED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED' | 'COMMENT_ADDED';
  note?: string;
  timestamp: string;
};

export type TicketCommentRecord = {
  attachment: TicketAttachmentMeta | null;
  attachmentUrl: string | null;
  authorRole: 'USER' | 'ADMIN';
  createdAt: string;
  id: string;
  message: string;
  ticketId: string;
  updatedAt: string;
  userId: string;
};

export type SupportTicketRecord = {
  attachmentUrls: { fileName: string; url: string }[];
  attachments: TicketAttachmentMeta[];
  category: TicketCategory;
  closedAt: string | null;
  commentCount?: number;
  comments: TicketCommentRecord[];
  createdAt: string;
  id: string;
  message: string;
  priority: TicketPriority;
  resolvedAt: string | null;
  status: TicketStatus;
  subject: string;
  ticketNumber: string;
  timeline: TicketTimelineEntry[];
  updatedAt: string;
  userId: string;
};

export type CreateTicketPayload = {
  attachments?: DocumentPickerAsset[];
  category: TicketCategory;
  message: string;
  priority: TicketPriority;
  subject: string;
};

export type AddCommentPayload = {
  attachment?: DocumentPickerAsset | null;
  message: string;
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

function buildTicketFormData(payload: CreateTicketPayload): FormData {
  const formData = new FormData();
  formData.append('category', payload.category);
  formData.append('priority', payload.priority);
  formData.append('subject', payload.subject);
  formData.append('message', payload.message);

  for (const file of payload.attachments ?? []) {
    if (file.file) {
      formData.append('attachments', file.file);
    } else {
      formData.append('attachments', {
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
        uri: file.uri,
      } as never);
    }
  }

  return formData;
}

function buildCommentFormData(payload: AddCommentPayload): FormData {
  const formData = new FormData();
  formData.append('message', payload.message);

  if (payload.attachment) {
    if (payload.attachment.file) {
      formData.append('attachment', payload.attachment.file);
    } else {
      formData.append('attachment', {
        name: payload.attachment.name,
        type: payload.attachment.mimeType ?? 'application/octet-stream',
        uri: payload.attachment.uri,
      } as never);
    }
  }

  return formData;
}

export async function createSupportTicket(
  accessToken: string,
  payload: CreateTicketPayload,
): Promise<SupportTicketRecord> {
  const hasFiles = (payload.attachments?.length ?? 0) > 0;
  const response = await fetch(`${apiConfig.baseUrl}/support-tickets`, {
    body: hasFiles ? buildTicketFormData(payload) : JSON.stringify({
      category: payload.category,
      priority: payload.priority,
      subject: payload.subject,
      message: payload.message,
    }),
    headers: hasFiles ? authHeaders(accessToken) : jsonHeaders(accessToken),
    method: 'POST',
  });
  return parseApiEnvelope<SupportTicketRecord>(response);
}

export async function getSupportTickets(accessToken: string): Promise<SupportTicketRecord[]> {
  const response = await fetch(`${apiConfig.baseUrl}/support-tickets`, {
    headers: authHeaders(accessToken),
  });
  return parseApiEnvelope<SupportTicketRecord[]>(response);
}

export async function getSupportTicketById(
  accessToken: string,
  ticketId: string,
): Promise<SupportTicketRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/support-tickets/${ticketId}`, {
    headers: authHeaders(accessToken),
  });
  return parseApiEnvelope<SupportTicketRecord>(response);
}

export async function addTicketComment(
  accessToken: string,
  ticketId: string,
  payload: AddCommentPayload,
): Promise<SupportTicketRecord> {
  const hasFile = Boolean(payload.attachment);
  const response = await fetch(`${apiConfig.baseUrl}/support-tickets/${ticketId}/comments`, {
    body: hasFile ? buildCommentFormData(payload) : JSON.stringify({ message: payload.message }),
    headers: hasFile ? authHeaders(accessToken) : jsonHeaders(accessToken),
    method: 'POST',
  });
  return parseApiEnvelope<SupportTicketRecord>(response);
}

export async function closeTicket(
  accessToken: string,
  ticketId: string,
): Promise<SupportTicketRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/support-tickets/${ticketId}/close`, {
    headers: jsonHeaders(accessToken),
    method: 'POST',
  });
  return parseApiEnvelope<SupportTicketRecord>(response);
}

export async function reopenTicket(
  accessToken: string,
  ticketId: string,
): Promise<SupportTicketRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/support-tickets/${ticketId}/reopen`, {
    headers: jsonHeaders(accessToken),
    method: 'POST',
  });
  return parseApiEnvelope<SupportTicketRecord>(response);
}

// Admin API functions

export async function adminGetAllTickets(accessToken: string): Promise<SupportTicketRecord[]> {
  const response = await fetch(`${apiConfig.baseUrl}/support-tickets/admin`, {
    headers: authHeaders(accessToken),
  });
  return parseApiEnvelope<SupportTicketRecord[]>(response);
}

export async function adminGetTicketById(
  accessToken: string,
  ticketId: string,
): Promise<SupportTicketRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/support-tickets/admin/${ticketId}`, {
    headers: authHeaders(accessToken),
  });
  return parseApiEnvelope<SupportTicketRecord>(response);
}

export async function adminMarkInProgress(
  accessToken: string,
  ticketId: string,
): Promise<SupportTicketRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/support-tickets/admin/${ticketId}/in-progress`, {
    headers: jsonHeaders(accessToken),
    method: 'POST',
  });
  return parseApiEnvelope<SupportTicketRecord>(response);
}

export async function adminResolveTicket(
  accessToken: string,
  ticketId: string,
): Promise<SupportTicketRecord> {
  const response = await fetch(`${apiConfig.baseUrl}/support-tickets/admin/${ticketId}/resolve`, {
    headers: jsonHeaders(accessToken),
    method: 'POST',
  });
  return parseApiEnvelope<SupportTicketRecord>(response);
}

export async function adminAddComment(
  accessToken: string,
  ticketId: string,
  payload: AddCommentPayload,
): Promise<SupportTicketRecord> {
  const hasFile = Boolean(payload.attachment);
  const response = await fetch(
    `${apiConfig.baseUrl}/support-tickets/admin/${ticketId}/comments`,
    {
      body: hasFile ? buildCommentFormData(payload) : JSON.stringify({ message: payload.message }),
      headers: hasFile ? authHeaders(accessToken) : jsonHeaders(accessToken),
      method: 'POST',
    },
  );
  return parseApiEnvelope<SupportTicketRecord>(response);
}
