import { useState, useEffect } from "react";
import PageIntro from "../components/common/PageIntro";
import { CheckCircle2, Circle } from "lucide-react";
import { analyticsAPI } from "../../api/analytics";

export default function Progress() {
  const [loading, setLoading] = useState(true);
  const [syllabus, setSyllabus] = useState([]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await analyticsAPI.getProgress();
        setSyllabus(data);
      } catch (error) {
        console.error("Failed to load progress data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  return (
    <div className="page">
      <PageIntro
        title="Syllabus Progress"
        subtitle="Track your study completion status against the official SSC JE syllabus."
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="card">
          <div className="space-y-6">
            {syllabus.map((sub, i) => (
              <div key={i} className="border-b last:border-0 pb-6 last:pb-0">
                <div className="flex justify-between items-end mb-2">
                  <h3 className="font-medium text-lg text-slate-800">
                    {sub.subject}
                  </h3>
                  <span className="text-sm font-bold text-blue-600">
                    {sub.progress}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000"
                    style={{ width: `${sub.progress}%` }}
                  ></div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-green-500" />
                    {sub.completedTopics} Completed
                  </span>
                  <span className="flex items-center gap-1">
                    <Circle size={14} />
                    {sub.totalTopics - sub.completedTopics} Remaining
                  </span>
                </div>
              </div>
            ))}
            {syllabus.length === 0 && (
              <div className="text-slate-500 text-center py-8">
                No syllabus data available to track progress.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
