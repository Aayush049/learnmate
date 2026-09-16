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

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>Weekly Study Activity</h3>
          <p>Your previous 7 days preparation consistency</p>
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
