import api from './client';

export const analyticsAPI = {
  getDashboardStats: async () => {
    const response = await api.get('/analytics/dashboard-stats');
    return response.data;
  },
  
  getWeeklyActivity: async () => {
    const response = await api.get('/analytics/weekly-activity');
    return response.data;
  },
  
  getPerformance: async () => {
    const response = await api.get('/analytics/performance');
    return response.data;
  },
  
  getProgress: async () => {
    const response = await api.get('/analytics/progress');
    return response.data;
  },
  
  getTopicProgress: async () => {
    const response = await api.get('/analytics/topic-progress');
    return response.data;
  }
};
