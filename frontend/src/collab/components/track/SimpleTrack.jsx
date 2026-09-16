import { Brain, Trophy, Clock3, Flame } from "lucide-react";
import PageIntro from "../common/PageIntro";
import StatCard from "../common/StatCard";
import { useState, useEffect } from "react";
import { analyticsAPI } from "../../../api/analytics";

export default function SimpleTrack({ title, subtitle, type }) {
  const [stats, setStats] = useState({
    syllabus_completion_percent: 0,
    total_study_time_hours: 0,
    pyqs_solved: 0,
    streak_days: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await analyticsAPI.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch tracking stats", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="page">
      <PageIntro title={title} subtitle={subtitle} />

      <section className="stats-grid">
        <StatCard icon={<Brain />} label="PYQs Completed" value={stats.pyqs_solved} sub="All time" />
        <StatCard icon={<Trophy />} label="Syllabus Completion" value={`${stats.syllabus_completion_percent}%`} sub="Overall progress" />
        <StatCard icon={<Clock3 />} label="Total Study Time" value={`${stats.total_study_time_hours}h`} sub="This cycle" />
        <StatCard icon={<Flame />} label="Study Streak" value={`${stats.streak_days} days`} sub="Keep it going!" />
      </section>

      <section className="card mb-6">
        <div className="card-header pb-4 border-b border-gray-100">
            <div>
              <h3>
                {type === "calendar"
                  ? "SSC JE Study Calendar"
                  : type === "progress" 
                    ? "Module Progress Overview"
                    : "SSC JE Performance Overview"}
              </h3>
              <p className="text-gray-500 text-sm mt-1">Detailed visualization (Coming Soon)</p>
            </div>
        </div>

        <div className="big-placeholder" style={{ minHeight: "300px", display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', marginTop: '1rem', border: '1px dashed #cbd5e1' }}>
          {type === "calendar"
            ? "📅 Your study calendar will appear here"
            : type === "progress" 
              ? "📊 Detailed syllabus breakdown map will appear here" 
              : "📈 Civil subject-wise accuracy and mock-test graph will appear here"}
        </div>
      </section>
    </div>
  );
}
