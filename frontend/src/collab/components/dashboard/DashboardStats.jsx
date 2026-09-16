import { useState, useEffect } from "react";
import { BookOpen, Clock3, Brain, Flame } from "lucide-react";
import StatCard from "../common/StatCard";
import { analyticsAPI } from "../../../api/analytics";

export default function DashboardStats() {
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
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <section className="stats-grid">
      <StatCard icon={<BookOpen />} label="Civil Syllabus" value={`${stats.syllabus_completion_percent}%`} sub="Current progress" />
      <StatCard icon={<Clock3 />} label="Study Time" value={`${stats.total_study_time_hours}h`} sub="This preparation cycle" />
      <StatCard icon={<Brain />} label="PYQs Solved" value={stats.pyqs_solved} sub="Total solved" />
      <StatCard icon={<Flame />} label="Study Streak" value={`${stats.streak_days} days`} sub="Keep it going!" />
    </section>
  );
}
