import { apiClient } from '../lib/api';

export type SubmissionStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_MORE_INFO'
  | 'DUPLICATE';

export interface PlaceSubmissionPayload {
  name: string;
  category: string;
  categoryTags?: string[];
  address: string;
  cityRegency: string;
  district?: string;
  village?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  description?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  facilities?: string[];
  primaryPhotoUrl?: string;
}

export interface PlaceSubmission {
  id: string;
  name: string;
  category: string;
  address: string;
  cityRegency: string;
  district?: string;
  village?: string;
  latitude: number;
  longitude: number;
  description?: string;
  primaryPhotoUrl?: string;
  status: SubmissionStatus;
  moderationNotes?: string;
  rejectionReason?: string;
  duplicateOfId?: string;
  duplicateNotes?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface SubmissionPage {
  data: PlaceSubmission[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function submitPlace(payload: PlaceSubmissionPayload): Promise<PlaceSubmission> {
  const response = await apiClient.post('/places/submissions', payload);
  return response.data?.data ?? response.data;
}

export async function fetchMySubmissions(params?: {
  status?: SubmissionStatus;
  page?: number;
  limit?: number;
}): Promise<SubmissionPage> {
  const response = await apiClient.get('/places/submissions/me', { params });
  const body = response.data?.data && response.data?.meta ? response.data : response.data;
  return {
    data: body?.data ?? [],
    meta: body?.meta ?? { page: 1, limit: params?.limit ?? 20, total: 0, totalPages: 0 },
  };
}
