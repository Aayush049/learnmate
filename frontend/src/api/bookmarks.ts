import api from './client';
import { Question } from './questions';

export interface Bookmark {
  id: number;
  user_id: number;
  question_id: number;
  created_at: string;
  question?: Question;
}

export const bookmarksAPI = {
  // Get all bookmarks for current user
  getAllBookmarks: async (): Promise<Bookmark[]> => {
    const response = await api.get('/bookmarks/');
    return response.data as any;
  },

  // Create bookmark
  createBookmark: async (questionId: number): Promise<Bookmark> => {
    const response = await api.post('/bookmarks/', { question_id: questionId });
    return response.data as any;
  },

  // Delete bookmark
  deleteBookmark: async (questionId: number): Promise<void> => {
    await api.delete(`/bookmarks/${questionId}`);
  },

  // Check if bookmarked
  checkStatus: async (questionId: number): Promise<boolean> => {
    const response = await api.get(`/bookmarks/${questionId}/status`);
    return response.data as any;
  }
};
