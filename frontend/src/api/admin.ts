import apiClient from './client';

export interface AdminDashboardStats {
  total_users: number;
  active_exams: number;
  questions_bank: number;
  mock_tests: number;
}

export const adminAPI = {
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const response = await apiClient.get<AdminDashboardStats>('/admin/dashboard-stats');
    return response.data;
  },
};
