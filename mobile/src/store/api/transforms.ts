import type { Project } from './projectsApi';
import type { ProjectDocument, DocumentStatus } from './documentsApi';
import type { AppNotification } from './notificationsApi';
import type { Farmer } from './farmersApi';

/** Backend returns a bare array; mobile screens expect { items, total }. */
export function wrapListResponse<T>(response: T[] | { items?: T[]; total?: number }): { items: T[]; total: number } {
  if (Array.isArray(response)) {
    return { items: response, total: response.length };
  }
  const items = response.items ?? [];
  return { items, total: response.total ?? items.length };
}

interface BackendDocument {
  id: number;
  project_id: number;
  document_type: string;
  file_name: string;
  file_size?: number;
  is_verified: boolean;
  verified_at?: string | null;
  remarks?: string | null;
  created_at?: string | null;
}

export function mapBackendDocument(d: BackendDocument): ProjectDocument {
  const status: DocumentStatus = d.is_verified ? 'approved' : 'pending';
  return {
    id:            d.id,
    project_id:    d.project_id,
    document_type: d.document_type,
    file_name:     d.file_name,
    file_size:     d.file_size,
    status,
    uploaded_at:   d.created_at ?? '',
    reviewed_at:   d.verified_at ?? undefined,
    review_note:   d.remarks ?? undefined,
  };
}

interface BackendNotification {
  id: number;
  title: string;
  message: string;
  type?: string | null;
  is_read: number | boolean;
  created_at?: string | null;
  project_id?: number | null;
}

export function mapBackendNotification(n: BackendNotification): AppNotification {
  return {
    id:                n.id,
    title:             n.title,
    body:              n.message,
    is_read:           Boolean(n.is_read),
    notification_type: n.type ?? 'general',
    created_at:        n.created_at ?? new Date().toISOString(),
    project_id:        n.project_id ?? undefined,
  };
}

export function mapBackendFarmer(p: {
  id: number;
  first_name: string;
  last_name?: string | null;
  phone_primary: string;
  village_id?: number | null;
  is_active: number | boolean;
  created_at?: string | null;
}): Farmer {
  return {
    id:            p.id,
    first_name:    p.first_name,
    last_name:     p.last_name ?? undefined,
    phone_primary: p.phone_primary,
    village_id:    p.village_id ?? undefined,
    is_active:     Boolean(p.is_active),
    created_at:    p.created_at ?? new Date().toISOString(),
  };
}

export function mapProjectsResponse(response: Project[] | { items?: Project[]; total?: number }) {
  return wrapListResponse(response);
}
