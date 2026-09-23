import apiClient from './client';

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export interface QuestionOption {
  id: number;
  option_text: string;
  option_label: string;
}

export interface Question {
  id: number;
  topic_id: number;
  question_text: string;
  difficulty: DifficultyLevel;
  marks: number;
  is_pyq?: boolean;
  year?: number;
  shift?: string;
  source?: string;
  topic_name?: string;
  subject_name?: string;
  options: QuestionOption[];
}

export interface QuestionDetail extends Question {
  explanation?: string;
  correct_option?: string;
}

export interface AnswerSubmission {
  question_id: number;
  selected_option?: string | null;
  time_taken_seconds?: number;
}

export interface AnswerResult {
  question_id: number;
  is_correct: boolean;
  correct_option: string;
  explanation?: string;
  selected_option?: string;
  time_taken_seconds?: number;
}

export interface PyqIndexItem {
  id: number;
  number: number; // 1-based ordering
  year: number | null;
  shift: string | null;
  subject?: string | null;
  topic?: string | null;
}

export const questionsAPI = {
  // Get questions with filtering
  async getQuestions(params: {
    topic_id?: number;
    chapter_id?: number;
    subject_id?: number;
    branch_id?: number;
    difficulty?: DifficultyLevel;
    is_pyq?: boolean;
    year?: number;
    shift?: string;
    limit?: number;
    shuffle?: boolean;
  } = {}): Promise<Question[]> {
    const limitVal = params?.limit;

    // Practice mode can load thousands of questions in one request.
    // Increase axios timeout for large payloads to avoid premature client failures.
    // Give slow local dev/proxy/CDN setups enough time for large payloads.
    const timeoutMs = typeof limitVal === 'number' && limitVal >= 2000 ? 300000 : 120000;

    const response = await apiClient.get<Question[]>('/questions/', {
      params,
      timeout: timeoutMs,
    });
    return response.data;
  },

  // Get single question with details (includes correct answer)
  async getQuestionDetail(questionId: number): Promise<QuestionDetail> {
    const response = await apiClient.get<QuestionDetail>(`/questions/${questionId}`);
    return response.data;
  },

  // Submit answer
  async submitAnswer(answer: AnswerSubmission): Promise<AnswerResult> {
    const response = await apiClient.post<AnswerResult>('/questions/submit', answer);
    return response.data;
  },

  // Get PYQ metadata
  async getPYQMetadata(params: { subject_id?: number; topic_id?: number } = {}): Promise<{
    years: number[];
    shifts: string[];
    papers: { year: number; shift: string; count: number }[];
  }> {
    const response = await apiClient.get<{
      years: number[];
      shifts: string[];
      papers: { year: number; shift: string; count: number }[];
    }>('/questions/pyq-meta', { params });
    return response.data;
  },

  // Lightweight navigator index for a single PYQ paper.
  // Does NOT return question_text/options/explanations.
  async getPYQIndex(params: { year: number | null; shift: string | null }): Promise<PyqIndexItem[]> {
    const response = await apiClient.get<PyqIndexItem[]>('/questions/pyq-index', {
      params: { is_pyq: true, year: params.year, shift: params.shift },
    });
    return response.data;
  },
};