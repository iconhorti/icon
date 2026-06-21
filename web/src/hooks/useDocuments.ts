import { useQuery } from '@tanstack/react-query';
import { getDocumentTypes, getProjectDocuments } from '../api/client';

// Normalize the various shapes getDocumentTypes might return into a string[].
function toTypeNames(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((t: any) => (typeof t === 'string' ? t : t?.name ?? t?.document_type)).filter(Boolean);
  }
  if (Array.isArray(raw.document_types)) {
    return raw.document_types.map((t: any) => (typeof t === 'string' ? t : t?.name)).filter(Boolean);
  }
  return [];
}

export interface RequiredDocsResult {
  required: string[];
  presentSet: Set<string>;
  missing: string[];
  /** True when the backend doesn't expose required-docs metadata yet. */
  notConfigured: boolean;
}

/**
 * Required-document gate for a stage. Compares the document types the backend
 * marks required for `stage` against what's actually uploaded on the project.
 *
 * Backend contract (proposed): GET /uploads/types?stage={stage}&required=true
 *   → { document_types: ["7/12 Extract", ...] }  (or a bare string[])
 *
 * Degrades gracefully: if the endpoint ignores the params or 404s, `required`
 * is empty and `notConfigured` is true, so the UI shows a neutral hint instead
 * of blocking anything.
 */
export function useRequiredDocs(projectId: string | number | undefined, stage: string | undefined) {
  return useQuery<RequiredDocsResult>({
    queryKey: ['requiredDocs', String(projectId), stage ?? ''],
    enabled: !!projectId && !!stage,
    retry: (count, err: any) => (err?.response?.status === 404 ? false : count < 1),
    queryFn: async () => {
      const [typesRaw, docsRaw] = await Promise.all([
        getDocumentTypes({ stage: stage as string, required: true }).catch(() => null),
        getProjectDocuments(projectId as string).catch(() => ({ documents: [] })),
      ]);
      const required = toTypeNames(typesRaw);
      const docs: any[] = Array.isArray(docsRaw) ? docsRaw : (docsRaw?.documents ?? []);
      const presentSet = new Set<string>(docs.map((d: any) => d.document_type).filter(Boolean));
      const missing = required.filter((r) => !presentSet.has(r));
      return { required, presentSet, missing, notConfigured: required.length === 0 };
    },
  });
}
