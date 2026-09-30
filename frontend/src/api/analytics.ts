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
  },

  getAIProfile: async (): Promise<{ profile: string }> => {
    const response = await api.get<{ profile: string }>('/analytics/ai-profile');
    return response.data;
  },

  getWeaknessProfile: async () => {
    const response = await api.get('/analytics/weakness-profile');
    return response.data;
  },

  generateStudyPlan: async (availableHours: number = 2, upcomingTests: any[] = []) => {
    const response = await api.post('/analytics/generate-study-plan', {
      available_hours: availableHours,
      upcoming_tests: upcomingTests
    });
    return response.data;
  },

  getMistakeExplanation: async (topic: string, incorrectAnswer: string, correctAnswer: string) => {
    const response = await api.post('/analytics/mistake-explanation', {
      topic,
      incorrect_answer: incorrectAnswer,
      correct_answer: correctAnswer
    });
    return response.data;
  },

  postHeartbeat: async (data: { topic_id: number; duration_seconds: number; activity_type?: string }) => {
    const response = await api.post('/analytics/study-session/heartbeat', data);
    return response.data;
  },

  getPerformanceOverview: async () => {
    const response = await api.get('/analytics/performance-overview');
    return response.data;
  },

  getTopicBreakdown: async () => {
    const response = await api.get('/analytics/topic-breakdown');
    return response.data;
  }
};

