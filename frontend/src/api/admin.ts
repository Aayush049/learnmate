import apiClient from './client';

export interface AdminDashboardStats {
  total_users: number;
  active_exams: number;
  questions_bank: number;
  mock_tests: number;
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  total_attempts: number;
}

export interface AdminUserProgress {
  user: {
    id: number;
    full_name: string;
    email: string;
  };
  overall: {
    total_questions_attempted: number;
    overall_accuracy: number;
  };
  subject_stats: Array<{
    subject: string;
    attempted: number;
    accuracy: number;
  }>;
  test_history: Array<{
    id: number;
    test_name: string;
    score: number;
    total_questions: number;
    completed_at: string;
  }>;
}

export const adminAPI = {
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const response = await apiClient.get<AdminDashboardStats>('/admin/dashboard-stats');
    return response.data;
  },
  
  getUsers: async (): Promise<AdminUser[]> => {
    const response = await apiClient.get<AdminUser[]>('/admin/users');
    return response.data;
  },
  
  deleteUser: async (userId: number): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },
  
  getUserProgress: async (userId: number): Promise<AdminUserProgress> => {
    const response = await apiClient.get<AdminUserProgress>(`/admin/users/${userId}/progress`);
    return response.data;
  }
};
