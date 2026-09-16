import api from "./client";

export interface Flashcard {
  id: number;
  user_id: number;
  front: string;
  back: string;
  box: number;
  next_review_at: string;
  created_at: string;
  updated_at: string;
}

export const flashcardsAPI = {
  getFlashcards: async (skip: number = 0, limit: number = 100) => {
    const response = await api.get('/flashcards/', { params: { skip, limit } });
    return response.data;
  },

  getDueFlashcards: async (limit: number = 50) => {
    const response = await api.get('/flashcards/due', { params: { limit } });
    return response.data;
  },

  createFlashcard: async (data: { front: string; back: string }) => {
    const response = await api.post('/flashcards/', data);
    return response.data;
  },

  updateFlashcard: async (id: number, data: { front?: string; back?: string; box?: number; next_review_at?: string }) => {
    const response = await api.patch(`/flashcards/${id}`, data);
    return response.data;
  },

  reviewFlashcard: async (id: number, success: boolean) => {
    const response = await api.post(`/flashcards/${id}/review`, { success });
    return response.data;
  },

  deleteFlashcard: async (id: number) => {
    await api.delete(`/flashcards/${id}`);
  }
};
