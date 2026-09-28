import { useState, useEffect } from "react";
import PageIntro from "../components/common/PageIntro";
import { TrendingUp, Target, Activity, AlertCircle, Brain, Sparkles } from "lucide-react";
import { analyticsAPI } from "../../api/analytics";

export default function Performance() {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [aiProfile, setAiProfile] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const data = await analyticsAPI.getPerformance();
        setPerformanceData(data);
      } catch (error) {
        console.error("Failed to load performance data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();

    const fetchAIProfile = async () => {
      try {
        setLoadingAi(true);
        const data = await analyticsAPI.getAIProfile();
        if (data && data.profile) setAiProfile(data.profile);
      } catch (error) {
        console.error("Failed to load AI profile", error);
      } finally {
        setLoadingAi(false);
      }
    };
    fetchAIProfile();
  }, []);

  return (
    <div className="page">
      <PageIntro
        title="Performance Analytics"
        subtitle="Deep dive into your accuracy and topic-wise strengths."
      />

      {/* AI Test Personality */}
      <div className="card mb-6 border-2 border-amber-500/20 shadow-sm bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5">
        <div className="border-b border-amber-500/10 pb-3 mb-4 flex items-center gap-2">
          <Brain className="text-amber-600 dark:text-amber-400" size={22} />
          <h3 className="font-semibold text-lg text-theme-text-primary m-0">AI Copilot Analysis</h3>
          <Sparkles className="text-amber-500 w-4 h-4 ml-auto" />
        </div>
        <div className="text-theme-text-secondary leading-relaxed max-w-prose whitespace-pre-line text-sm">
          {loadingAi ? (
            <div className="animate-pulse flex items-center gap-2 text-amber-600 dark:text-amber-400 italic">
              <Brain className="w-4 h-4 animate-spin" /> Analyzing your performance trends...
            </div>
          ) : aiProfile ? (
            aiProfile
          ) : (
            <span className="italic text-theme-text-muted text-sm">Attempt more tests to unlock your AI test-taking personality report.</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : performanceData ? (
        <>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="card text-center p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-md">
              <TrendingUp className="mx-auto mb-2 opacity-80" size={32} />
              <div className="text-4xl font-bold mb-1">
                {performanceData.overallScore}%
              </div>
              <div className="text-blue-100 text-sm">Overall Score Average</div>
            </div>

            <div className="card text-center p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-md">
              <Target className="mx-auto mb-2 opacity-80" size={32} />
              <div className="text-4xl font-bold mb-1">
                {performanceData.accuracy}%
              </div>
              <div className="text-green-100 text-sm">Overall Accuracy</div>
            </div>

            <div className="card text-center p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-md">
              <Activity className="mx-auto mb-2 opacity-80" size={32} />
              <div className="text-4xl font-bold mb-1">
                {performanceData.percentile}
              </div>
              <div className="text-purple-100 text-sm">
                Estimated Percentile
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center gap-2 mb-4 border-b pb-4">
                <AlertCircle className="text-red-500" />
                <h3 className="font-semibold text-lg text-theme-text-primary">
                  Focus Areas (Weak Topics)
                </h3>
              </div>
              <div className="space-y-4">
                {performanceData.weakTopics && performanceData.weakTopics.map((topic, i) => (
                  <div key={i} className="flex justify-between items-center bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {topic.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {topic.totalAttempted} questions attempted
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-500">
                        {topic.accuracy}%
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">accuracy</div>
                    </div>
                  </div>
                ))}
                {(!performanceData.weakTopics || performanceData.weakTopics.length === 0) && (
                  <div className="text-slate-500 text-sm py-2">No weak topics identified yet. Keep practicing!</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-4 border-b pb-4">
                <Target className="text-green-500" />
                <h3 className="font-semibold text-lg text-theme-text-primary">
                  Strengths
                </h3>
              </div>
              <div className="space-y-4">
                {performanceData.strongTopics && performanceData.strongTopics.map((topic, i) => (
                  <div key={i} className="flex justify-between items-center bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {topic.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {topic.totalAttempted} questions attempted
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-500">
                        {topic.accuracy}%
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">accuracy</div>
                    </div>
                  </div>
                ))}
                {(!performanceData.strongTopics || performanceData.strongTopics.length === 0) && (
                  <div className="text-slate-500 text-sm py-2">No strong topics identified yet. Keep practicing!</div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-slate-500">Failed to load data</div>
      )}
    </div>
  );
}
