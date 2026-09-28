import apiClient from './client';
import type { Question, AnswerSubmission } from './questions';

export enum MockTestType {
  FULL_SYLLABUS = 'full_syllabus',
  SUBJECT_WISE = 'subject_wise',
  TOPIC_WISE = 'topic_wise',
  CUSTOM = 'custom',
}

export interface MockTest {
  id: number;
  name: string;
  description?: string;
  test_type: MockTestType | string;
  duration_minutes: number;
  total_marks: number;
  negative_marking?: number;
  is_baseline?: boolean;
}

export interface MockTestStartResponse {
  attempt_id: number;
  mock_test: MockTest;
  started_at: string;
  total_questions: number;
  questions: Question[];
}

export interface MockTestSubmissionResult {
  attempt_id: number;
  score: number;
  total_marks: number;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unattempted: number;
  accuracy: number;
  total_time_seconds: number;
}

export interface QuestionReview {
  id: number;
  topic_id?: number;
  question_text: string;
  difficulty: string;
  marks: number;
  options: Array<{ id: number; option_text: string; option_label: string }>;
  explanation?: string;
  correct_option: string;
  user_answer?: string | null;
  is_correct?: boolean | null;
  time_taken_seconds?: number | null;
}

export interface MockTestAttempt {
  attempt_id: number;
  mock_test_id: number;
  mock_test_name: string;
  started_at: string;
  completed_at?: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unattempted: number;
}

export interface MockTestResult {
  attempt_id: number;
  mock_test_id: number;
  mock_test_name: string;
  score: number;
  total_marks: number;
  negative_marking?: number;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unattempted: number;
  accuracy: number;
  total_time_seconds: number;
  questions: QuestionReview[];
}

export interface QuestionPaletteItem {
  question_id: number;
  question_order: number;
  status: 'answered' | 'marked' | 'unanswered';
  marked_for_review: boolean;
}

export interface QuestionPalette {
  attempt_id: number;
  questions: QuestionPaletteItem[];
  summary: {
    total: number;
    answered: number;
    marked: number;
    unanswered: number;
  };
}

export interface MockTestAnalytics {
  attempt_id: number;
  subject_performance: {
    subject: string;
    correct: number;
    total: number;
    accuracy: number;
    marks_obtained: number;
  }[];
  difficulty_performance: {
    difficulty: string;
    correct: number;
    total: number;
    accuracy: number;
  }[];
  time_analysis: {
    total_time_seconds: number;
    average_time_per_question: number;
    fastest_question: number;
    slowest_question: number;
  };
}

export interface GeneratePersonalizedTestParams {
  branch_id: number;
  total_questions?: number;
  adaptation_weight?: number;
  name?: string;
  description?: string;
}

export const mockTestsAPI = {
  async generateSmartTest(): Promise<MockTest> {
    const response = await apiClient.post<MockTest>('/mock-tests/generate-smart');
    return response.data;
  },

  async generatePersonalizedTest(data: GeneratePersonalizedTestParams): Promise<MockTest> {
    const response = await apiClient.post<MockTest>('/mock-tests/generate-personalized', data);
    return response.data;
  },

  async generateAITest(data: GeneratePersonalizedTestParams): Promise<MockTest> {
    return this.generatePersonalizedTest(data);
  },

  async generateBaselineTest(data: GeneratePersonalizedTestParams): Promise<MockTest> {
    const response = await apiClient.post<MockTest>('/mock-tests/generate-baseline', data);
    return response.data;
  },

  // Get all available mock tests
  async getAllTests(): Promise<MockTest[]> {
    const response = await apiClient.get<MockTest[]>('/mock-tests/');
    return response.data;
  },

  // Start a mock test
  async startTest(testId: number): Promise<MockTestStartResponse> {
    const response = await apiClient.get<MockTestStartResponse>(`/mock-tests/${testId}/start`);
    return response.data;
  },

  // Submit complete mock test
  async submitTest(attemptId: number, answers: AnswerSubmission[]): Promise<MockTestSubmissionResult> {
    const response = await apiClient.post<MockTestSubmissionResult>(
      `/mock-tests/attempt/${attemptId}/submit`,
      answers
    );
    return response.data;
  },

  // Get user's test attempts history
  async getUserAttempts(): Promise<MockTestAttempt[]> {
    const response = await apiClient.get<MockTestAttempt[]>('/mock-tests/attempts');
    return response.data;
  },

  // Get detailed result for a specific attempt
  async getTestResult(attemptId: number): Promise<MockTestResult> {
    const response = await apiClient.get<MockTestResult>(`/mock-tests/result/${attemptId}`);
    return response.data;
  },

  // --- Advanced Mock Test Features ---

  async getQuestionPalette(testId: number, attemptId: number): Promise<QuestionPalette> {
    const response = await apiClient.get<QuestionPalette>(
      `/mock-tests/${testId}/palette`,
      { params: { attempt_id: attemptId } }
    );
    return response.data;
  },

  async markForReview(testId: number, attemptId: number, questionId: number): Promise<{ question_id: number; marked_for_review: boolean }> {
    const response = await apiClient.post<{ question_id: number; marked_for_review: boolean }>(
      `/mock-tests/${testId}/mark-for-review`,
      null,
      { params: { attempt_id: attemptId, question_id: questionId } }
    );
    return response.data;
  },

  async autoSubmit(testId: number, attemptId: number): Promise<{ attempt_id: number; auto_submitted: boolean; message: string }> {
    const response = await apiClient.post<{ attempt_id: number; auto_submitted: boolean; message: string }>(
      `/mock-tests/${testId}/auto-submit`,
      null,
      { params: { attempt_id: attemptId } }
    );
    return response.data;
  },

  async getAnalytics(testId: number, attemptId: number): Promise<MockTestAnalytics> {
    const response = await apiClient.get<MockTestAnalytics>(`/mock-tests/${testId}/analytics/${attemptId}`);
    return response.data;
  },
};
