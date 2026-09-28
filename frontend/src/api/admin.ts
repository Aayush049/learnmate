import apiClient from './client';

// ── Shared pagination envelope ────────────────────────────────────────────────
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  active_exams: number;
  questions_bank: number;
  pyq_count: number;
  mock_tests: number;
  total_test_attempts: number;
}

export interface RecentActivityItem {
  attempt_id: number;
  test_name: string;
  user_name: string;
  user_email: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  completed_at: string;
  started_at: string;
}

// ── Users ─────────────────────────────────────────────────────────────────────

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

export interface UserQueryParams {
  search?: string;
  status_filter?: 'active' | 'disabled' | 'admin' | 'student';
  sort_by?: 'created_at' | 'full_name' | 'email';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

// ── Question bank ─────────────────────────────────────────────────────────────

export interface AdminQuestion {
  id: number;
  topic_id: number;
  topic_name?: string | null;
  question_text: string;
  explanation?: string | null;
  difficulty: string;
  marks: number;
  is_pyq: boolean;
  year?: number | null;
  shift?: string | null;
  source?: string | null;
  option_count: number;
}

export interface QuestionQueryParams {
  search?: string;
  subject_id?: number;
  chapter_id?: number;
  topic_id?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  is_pyq?: boolean;
  year?: number;
  shift?: string;
  page?: number;
  page_size?: number;
}

export interface ImportValidationRow {
  index: number;
  valid: boolean;
  errors: string[];
  preview?: string | null;
}

export interface ImportValidationResult {
  total: number;
  valid_count: number;
  invalid_count: number;
  results: ImportValidationRow[];
}

export interface ImportResult {
  created: number;
  skipped: number;
  question_ids: number[];
  errors: Array<{ index: number; error: string }>;
}

// ── Hierarchy ─────────────────────────────────────────────────────────────────

export interface HierarchyTopic {
  id: number;
  name: string;
  description?: string | null;
  question_count: number;
}

export interface HierarchyChapter {
  id: number;
  name: string;
  description?: string | null;
  question_count: number;
  topics: HierarchyTopic[];
}

export interface HierarchySubject {
  id: number;
  name: string;
  description?: string | null;
  question_count: number;
  chapters: HierarchyChapter[];
}

export interface HierarchyBranch {
  id: number;
  name: string;
  description?: string | null;
  question_count: number;
  subjects: HierarchySubject[];
}

// ── Mock tests ────────────────────────────────────────────────────────────────

export interface AdminMockTest {
  id: number;
  name: string;
  description?: string | null;
  test_type: string;
  duration_minutes: number;
  total_marks: number;
  negative_marking: number;
  is_baseline: number;
  created_at?: string;
  question_count: number;
  attempt_count: number;
  avg_score: number | null;
}

export interface AdminMockTestQuestionItem {
  id: number;
  mock_test_question_id: number;
  question_order: number;
  question_text: string;
  explanation?: string | null;
  difficulty: string;
  marks: number;
  is_pyq: boolean;
  year?: number | null;
  shift?: string | null;
  subject_name?: string | null;
  chapter_name?: string | null;
  topic_name?: string | null;
  options: Array<{ id: number; label: string; text: string; is_correct: boolean }>;
  correct_answer?: string | null;
}

export interface AdminMockTestDetail {
  id: number;
  name: string;
  description?: string | null;
  test_type: string;
  duration_minutes: number;
  total_marks: number;
  negative_marking: number;
  is_baseline: number;
  created_at?: string;
  question_count: number;
  attempt_count: number;
  avg_score: number | null;
  questions: AdminMockTestQuestionItem[];
}

export interface AdminMockTestAttemptItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unattempted: number;
  total_time_seconds?: number | null;
  started_at: string;
  completed_at?: string | null;
}

export const adminAPI = {
  // ── Dashboard ──
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const response = await apiClient.get<AdminDashboardStats>('/admin/dashboard-stats');
    return response.data;
  },

  getRecentActivity: async (limit = 10): Promise<RecentActivityItem[]> => {
    const response = await apiClient.get<RecentActivityItem[]>('/admin/recent-activity', {
      params: { limit },
    });
    return response.data;
  },

  // ── Users ──
  getUsers: async (params: UserQueryParams = {}): Promise<Paginated<AdminUser>> => {
    const response = await apiClient.get<Paginated<AdminUser>>('/admin/users', { params });
    return response.data;
  },

  updateUserStatus: async (userId: number, isActive: boolean): Promise<void> => {
    await apiClient.patch(`/admin/users/${userId}/status`, { is_active: isActive });
  },

  deleteUser: async (userId: number): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  getUserProgress: async (userId: number): Promise<AdminUserProgress> => {
    const response = await apiClient.get<AdminUserProgress>(`/admin/users/${userId}/progress`);
    return response.data;
  },

  // ── Question bank ──
  getQuestions: async (params: QuestionQueryParams = {}): Promise<Paginated<AdminQuestion>> => {
    const response = await apiClient.get<Paginated<AdminQuestion>>('/admin/questions', { params });
    return response.data;
  },

  deleteQuestion: async (questionId: number): Promise<void> => {
    await apiClient.delete(`/questions/${questionId}`);
  },

  getQuestionDetail: async (questionId: number): Promise<any> => {
    const response = await apiClient.get(`/questions/${questionId}`);
    return response.data;
  },

  createQuestion: async (payload: {
    topic_id: number;
    question_text: string;
    explanation?: string | null;
    difficulty: string;
    marks: number;
    is_pyq: boolean;
    year?: number | null;
    shift?: string | null;
    options: Array<{ option_label: string; option_text: string; is_correct: boolean }>;
  }): Promise<any> => {
    const response = await apiClient.post('/questions/', payload);
    return response.data;
  },

  updateQuestion: async (questionId: number, payload: any): Promise<any> => {
    const response = await apiClient.put(`/questions/${questionId}`, payload);
    return response.data;
  },

  validateQuestionImport: async (
    questions: any[],
    defaultTopicId?: number
  ): Promise<ImportValidationResult> => {
    const response = await apiClient.post<ImportValidationResult>('/admin/questions/import/validate', {
      questions,
      topic_id: defaultTopicId,
    });
    return response.data;
  },

  importQuestions: async (
    questions: any[],
    defaultTopicId?: number
  ): Promise<ImportResult> => {
    const response = await apiClient.post<ImportResult>('/admin/questions/import', {
      questions,
      topic_id: defaultTopicId,
    });
    return response.data;
  },

  // ── Hierarchy ──
  getHierarchyTree: async (): Promise<{ branches: HierarchyBranch[] }> => {
    const response = await apiClient.get<{ branches: HierarchyBranch[] }>('/admin/hierarchy/tree');
    return response.data;
  },

  // ── Mock tests ──
  getMockTests: async (
    params: { search?: string; test_type?: string; page?: number; page_size?: number } = {}
  ): Promise<Paginated<AdminMockTest>> => {
    const response = await apiClient.get<Paginated<AdminMockTest>>('/admin/mock-tests', { params });
    return response.data;
  },

  createMockTest: async (payload: {
    name: string;
    description?: string;
    test_type: string;
    duration_minutes: number;
    total_marks: number;
    negative_marking?: number;
  }): Promise<any> => {
    const response = await apiClient.post('/admin/mock-tests', payload);
    return response.data;
  },

  deleteMockTest: async (testId: number): Promise<void> => {
    await apiClient.delete(`/admin/mock-tests/${testId}`);
  },

  getMockTestDetail: async (testId: number): Promise<AdminMockTestDetail> => {
    const response = await apiClient.get<AdminMockTestDetail>(`/admin/mock-tests/${testId}`);
    return response.data;
  },

  updateMockTest: async (
    testId: number,
    payload: {
      name?: string;
      description?: string | null;
      test_type?: string;
      duration_minutes?: number;
      total_marks?: number;
      negative_marking?: number;
      is_baseline?: number;
    }
  ): Promise<any> => {
    const response = await apiClient.put(`/admin/mock-tests/${testId}`, payload);
    return response.data;
  },

  setMockTestQuestions: async (
    testId: number,
    payload: { question_ids: number[]; auto_calculate_marks?: boolean }
  ): Promise<any> => {
    const response = await apiClient.put(`/admin/mock-tests/${testId}/questions`, payload);
    return response.data;
  },

  getMockTestAttempts: async (
    testId: number,
    params: { page?: number; page_size?: number } = {}
  ): Promise<Paginated<AdminMockTestAttemptItem>> => {
    const response = await apiClient.get<Paginated<AdminMockTestAttemptItem>>(
      `/admin/mock-tests/${testId}/attempts`,
      { params }
    );
    return response.data;
  },
};
