import { apiClient } from '../lib/api';

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  title: string;
  subtitle?: string;
  iconType?: string;
  createdAt: string;
}

export const fetchUserActivities = async (): Promise<UserActivity[]> => {
  try {
    const res = await apiClient.get('/activities');
    return res.data?.data || [];
  } catch (error) {
    return [];
  }
};

export const logUserActivity = async (
  action: string,
  title: string,
  subtitle?: string,
  iconType?: string,
): Promise<UserActivity | null> => {
  try {
    const res = await apiClient.post('/activities', {
      action,
      title,
      subtitle,
      iconType,
    });
    return res.data?.data || null;
  } catch (error) {
    return null;
  }
};
