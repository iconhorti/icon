import { baseApi } from './baseApi';
import { mapBackendDocument } from './transforms';

export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'held';

export interface ProjectDocument {
  id:            number;
  project_id:    number;
  document_type: string;
  file_name:     string;
  file_size?:    number;
  status:        DocumentStatus;
  uploaded_at:   string;
  reviewed_at?:  string;
  review_note?:  string;
  farmer_name?:  string;
  version?:      number;
  updated_at?:   string;
}

export interface ReviewInput {
  id:          number;
  status:      'approved' | 'rejected' | 'held';
  note?:       string;
  version?:    number;
  updated_at?: string;
}

export const documentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDocuments: build.query<ProjectDocument[], { status?: DocumentStatus; project_id?: number }>({
      query: ({ status, project_id }) => {
        const params: Record<string, string | number> = {};
        if (project_id !== undefined) params.project_id = project_id;
        if (status === 'pending') params.verified = 0;
        else if (status === 'approved') params.verified = 1;
        return { url: '/uploads/all', params };
      },
      transformResponse: (response: { documents: Parameters<typeof mapBackendDocument>[0][] }) =>
        response.documents.map(mapBackendDocument),
      providesTags: ['Documents'],
    }),
    reviewDocument: build.mutation<ProjectDocument, ReviewInput>({
      query: ({ id, status, note }) => {
        if (status === 'approved') {
          const qs = note ? `?remarks=${encodeURIComponent(note)}` : '';
          return { url: `/uploads/${id}/verify${qs}`, method: 'PATCH' };
        }
        return { url: `/uploads/${id}/unverify`, method: 'PATCH' };
      },
      invalidatesTags: ['Documents'],
    }),
  }),
});

export const { useGetDocumentsQuery, useReviewDocumentMutation } = documentsApi;
