import api from './client';

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  topic_id?: number;
  created_at: string;
  updated_at?: string;
}

export const notesAPI = {
  getNotes: async (): Promise<Note[]> => {
    const response = await api.get('/notes/');
    return response.data as any;
  },
  createNote: async (data: { title: string, content?: string, topic_id?: number }): Promise<Note> => {
    const response = await api.post('/notes/', data);
    return response.data as any;
  },
  updateNote: async (id: number, data: { title?: string, content?: string, topic_id?: number }): Promise<Note> => {
    const response = await api.patch(`/notes/${id}`, data);
    return response.data as any;
  },
  deleteNote: async (id: number): Promise<void> => {
    await api.delete(`/notes/${id}`);
  }
};
