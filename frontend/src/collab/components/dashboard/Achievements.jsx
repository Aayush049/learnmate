import { useState, useEffect } from "react";
import { Flame, Target, BookOpenCheck, Zap, Sparkles } from "lucide-react";
import { analyticsAPI } from "../../../api/analytics";

// Compact milestone strip. Every value is derived from existing analytics
// endpoints - nothing invented. With no activity yet we show a muted
// "ready to unlock" rail rather than an empty card.
export default function Achievements() {
  const [stats, setStats] = useState(null);
  const [perf, setPerf] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const [statsData, perfData] = await Promise.all([
          analyticsAPI.getDashboardStats(),
          analyticsAPI.getPerformance()
        ]);
        setStats(statsData);
        setPerf(perfData);
      } catch (err) {
        console.error("Failed to load achievements", err);
      } finally {
        setLoaded(true);
      }
    };
    fetchAchievements();
  }, []);

  const items = [];

  if (stats?.streak_days > 0) {
    items.push({ icon: <Flame />, tone: "orange", value: stats.streak_days, label: "Day Streak" });
  }
  if (stats?.pyqs_solved > 0) {
    items.push({ icon: <Target />, tone: "purple", value: stats.pyqs_solved, label: "PYQs Solved" });
  }
  if (stats?.syllabus_completion_percent > 0) {
    items.push({
      icon: <BookOpenCheck />,
      tone: "teal",
      value: `${stats.syllabus_completion_percent}%`,
      label: "Syllabus"
    });
  }
  if (perf?.accuracy > 0) {
    items.push({ icon: <Zap />, tone: "blue", value: `${perf.accuracy}%`, label: "Accuracy" });
  }

  const hasAny = items.length > 0;

  // Placeholder rail shown before any milestone exists - same footprint,
  // so the card never collapses or balloons.
  const rail = hasAny
    ? items
    : [
        { icon: <Flame />, tone: "muted", value: "–", label: "Day Streak" },
        { icon: <Target />, tone: "muted", value: "–", label: "PYQs Solved" },
        { icon: <BookOpenCheck />, tone: "muted", value: "–", label: "Syllabus" },
        { icon: <Zap />, tone: "muted", value: "–", label: "Accuracy" }
      ];

  return (
    <section className="card achievement-card">
      <div className="card-header">
        <div>
          <h3>Achievements</h3>
          <p>{hasAny ? "Milestones from your preparation" : "Milestones unlock as you practise"}</p>
        </div>
        {!hasAny && loaded && <Sparkles size={16} className="ach-sparkle" />}
      </div>

      <div className="achievement-rail">
        {rail.map((item) => (
          <div className={`achievement-item ${item.tone === "muted" ? "locked" : ""}`} key={item.label}>
            <span className={`achievement-icon ${item.tone}`}>{item.icon}</span>
            <div>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
