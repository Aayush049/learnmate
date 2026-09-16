// API exports
export { authAPI } from './auth';
export { hierarchyAPI } from './hierarchy';
export { questionsAPI } from './questions';
export { practiceAPI } from './practice';
export { mockTestsAPI } from './mockTests';
export { adminAPI } from './admin';
export { default as apiClient } from './client';

export type { User, LoginCredentials, RegisterData, AuthResponse } from './auth';
// Type exports for questions, practice, etc.
export type { Question, QuestionDetail, AnswerSubmission, AnswerResult } from './questions';
export type { PracticeSession, Bookmark } from './practice';
export type {
  MockTest,
  MockTestStartResponse,
  MockTestSubmissionResult,
  MockTestAttempt,
  MockTestResult,
  QuestionReview,
} from './mockTests';
export { MockTestType } from './mockTests';
export { DifficultyLevel } from './questions';
