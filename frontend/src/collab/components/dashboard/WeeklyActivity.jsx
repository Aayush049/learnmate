import { useState, useEffect } from "react";
import { analyticsAPI } from "../../../api/analytics";

export default function WeeklyActivity() {
  const [activity, setActivity] = useState([
    { day: "M", hours: 0 },
    { day: "T", hours: 0 },
    { day: "W", hours: 0 },
    { day: "T", hours: 0 },
    { day: "F", hours: 0 },
    { day: "S", hours: 0 },
    { day: "S", hours: 0 },
  ]);

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const data = await analyticsAPI.getWeeklyActivity();
        setActivity(data);
      } catch (err) {
        console.error("Failed to load activity", err);
      }
    };
    fetchAuth();
  }, []);

  // Assuming max 10 hours for 100%
  const maxHours = 10;

  // Real weekly total, derived from the same data the chart already plots.
  const totalHours = activity.reduce((sum, item) => sum + (item.hours || 0), 0);
  const totalLabel = `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`;

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>Study Activity</h3>
          <p>{totalLabel} this week</p>
        </div>
      </div>

      <div className="activity-chart">
        {activity.map((item, index) => {
          let h = (item.hours / maxHours) * 100;
          if (h > 100) h = 100;
          const displayDay = item.day.substring(0, 1);

          return (
            <div className="bar-wrap" key={index} title={`${item.hours} hours`}>
              <div className="bar" style={{ height: `${h}%` }} />
              <span>{displayDay}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
