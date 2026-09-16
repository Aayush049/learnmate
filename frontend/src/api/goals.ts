import api from './client';

export interface Goal {
  id: number;
  user_id: number;
  text: string;
  is_completed: boolean;
  created_at: string;
  completed_at?: string;
}

export const goalsAPI = {
  getGoals: async (): Promise<Goal[]> => {
    const response = await api.get('/goals/');
    return response.data as any;
  },
  createGoal: async (text: string): Promise<Goal> => {
    const response = await api.post('/goals/', { text });
    return response.data as any;
  },
  updateGoal: async (id: number, is_completed: boolean): Promise<Goal> => {
    const response = await api.patch(`/goals/${id}`, { is_completed });
    return response.data as any;
  },
  deleteGoal: async (id: number): Promise<void> => {
    await api.delete(`/goals/${id}`);
  }
};
