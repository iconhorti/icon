import { baseApi } from './baseApi';

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
}

export interface ReviewInput {
  id:          number;
  status:      'approved' | 'rejected' | 'held';
  note?:       string;
  version?:    number;   // concurrency token (optimistic locking)
  updated_at?: string;
}

export const documentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDocuments: build.query<ProjectDocument[], { status?: DocumentStatus; project_id?: number }>({
      query: (params) => ({ url: '/documents', params }),
      providesTags: ['Documents'],
    }),
    reviewDocument: build.mutation<ProjectDocument, ReviewInput>({
      query: ({ id, ...body }) => ({
        url:    `/documents/${id}/review`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Documents'],
    }),
  }),
});

export const { useGetDocumentsQuery, useReviewDocumentMutation } = documentsApi;
