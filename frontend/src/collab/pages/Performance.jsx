import { useState, useEffect } from "react";
import PageIntro from "../components/common/PageIntro";
import { TrendingUp, Target, Activity, AlertCircle } from "lucide-react";
import { analyticsAPI } from "../../api/analytics";

export default function Performance() {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);

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
  }, []);

  return (
    <div className="page">
      <PageIntro
        title="Performance Analytics"
        subtitle="Deep dive into your accuracy and topic-wise strengths."
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : performanceData ? (
        <>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="card text-center p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
              <TrendingUp className="mx-auto mb-2 opacity-80" size={32} />
              <div className="text-4xl font-bold mb-1">
                {performanceData.overallScore}%
              </div>
              <div className="text-blue-100 text-sm">Overall Score Average</div>
            </div>

            <div className="card text-center p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
              <Target className="mx-auto mb-2 opacity-80" size={32} />
              <div className="text-4xl font-bold mb-1">
                {performanceData.accuracy}%
              </div>
              <div className="text-green-100 text-sm">Overall Accuracy</div>
            </div>

            <div className="card text-center p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
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
                <h3 className="font-semibold text-lg text-slate-800">
                  Focus Areas (Weak Topics)
                </h3>
              </div>
              <div className="space-y-4">
                {performanceData.weakTopics.map((topic, i) => (
                  <div key={i} className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100">
                    <div>
                      <div className="font-medium text-slate-700">
                        {topic.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {topic.totalAttempted} questions attempted
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-500">
                        {topic.accuracy}%
                      </div>
                      <div className="text-xs text-slate-500">accuracy</div>
                    </div>
                  </div>
                ))}
                {performanceData.weakTopics.length === 0 && (
                  <div className="text-slate-500 text-sm py-2">No weak topics identified yet. Keep practicing!</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-4 border-b pb-4">
                <Target className="text-green-500" />
                <h3 className="font-semibold text-lg text-slate-800">
                  Strengths
                </h3>
              </div>
              <div className="space-y-4">
                {performanceData.strongTopics.map((topic, i) => (
                  <div key={i} className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100">
                    <div>
                      <div className="font-medium text-slate-700">
                        {topic.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {topic.totalAttempted} questions attempted
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-500">
                        {topic.accuracy}%
                      </div>
                      <div className="text-xs text-slate-500">accuracy</div>
                    </div>
                  </div>
                ))}
                {performanceData.strongTopics.length === 0 && (
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
