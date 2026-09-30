export default function StatCard({ icon, label, value, sub, tone = "purple", progress = null }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon ${tone}`}>{icon}</div>
        <span className="stat-label">{label}</span>
      </div>

      <div className="stat-middle">
        {progress !== null ? (
          <div className="stat-progress-centered">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path
                className="circle-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="circle"
                strokeDasharray={`${progress}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="18" className="percentage">{progress}%</text>
            </svg>
          </div>
        ) : (
          <strong className="stat-value">{value}</strong>
        )}
      </div>

      <small className="stat-sub">{sub}</small>

      <div className={`stat-mini stat-dashes ${progress !== null ? "invisible-dashes" : ""}`} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}
