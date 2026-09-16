import { Clock3, Gauge, Target, TrendingUp } from "lucide-react";
import { buildOverallInsights } from "./analyticsLogic.js";
import { formatLongTime } from "./timerUtils";

export default function TestAnalytics({ topicAnalytics }) {
  const insights = buildOverallInsights(topicAnalytics);

  return (
    <div className="test-analytics">
      <div className="analytics-summary">
        <div className="analytics-insight">
          <TrendingUp size={18} />
          <span>AI strength</span>
          <strong>{insights.strongest?.topic || "Not enough data"}</strong>
          <small>
            {insights.strongest?.reason || "Complete more questions to identify a strong topic."}
          </small>
        </div>

        <div className="analytics-insight">
          <Clock3 size={18} />
          <span>Taking most time</span>
          <strong>{insights.slowest?.topic || "—"}</strong>
          <small>
            {insights.slowest
              ? `${formatLongTime(insights.slowest.avgTime)} average`
              : "—"}
          </small>
        </div>

        <div className="analytics-insight">
          <Gauge size={18} />
          <span>Fastest topic</span>
          <strong>{insights.fastest?.topic || "—"}</strong>
          <small>
            {insights.fastest
              ? `${formatLongTime(insights.fastest.avgTime)} average`
              : "—"}
          </small>
        </div>

        <div className="analytics-insight">
          <Target size={18} />
          <span>Needs attention</span>
          <strong>{insights.weakest?.topic || "—"}</strong>
          <small>
            {insights.weakest
              ? `${insights.weakest.accuracy}% accuracy`
              : "—"}
          </small>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Topic Time Analysis</h3>
            <p>Speed is evaluated together with accuracy.</p>
          </div>
        </div>

        <div className="topic-analysis-list">
          {topicAnalytics.map((item) => (
            <div className="topic-analysis-row" key={item.topic}>
              <div className="topic-analysis-main">
                <strong>{item.topic}</strong>
                <span>
                  {item.attempted}/{item.total} attempted · {item.accuracy}% accuracy
                </span>
              </div>

              <div className="topic-analysis-time">
                <strong>{formatLongTime(item.avgTime)}</strong>
                <span>target {formatLongTime(item.avgTarget)}</span>
              </div>

              <span className={`analysis-status ${item.status.toLowerCase().replaceAll(" ", "-")}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
