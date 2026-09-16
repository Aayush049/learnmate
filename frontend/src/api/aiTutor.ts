import api from "./client";

export const aiTutorAPI = {
  solveDoubt: async (query: string, topicContext: string = "") => {
    const response = await api.post("/ai-tutor/solve", {
      query,
      topic_context: topicContext
    });
    return response.data;
  }
};
