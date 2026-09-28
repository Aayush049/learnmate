export default function StatCard({ icon, label, value, sub, tone = "purple", progress = null }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon ${tone}`}>{icon}</div>
        <span className="stat-label">{label}</span>
      </div>

      <strong className="stat-value">{value}</strong>
      <small className="stat-sub">{sub}</small>

      {/* Mini visual. Ring when we have a real percentage, sparkline-style
          dashes when we only have a raw count - so a zero value still reads
          as "intentional" rather than "broken". */}
      {progress !== null ? (
        <div className="stat-mini stat-ring-wrap">
          <div className="stat-ring" style={{ "--pct": `${Math.max(progress, 3)}%` }}>
            <span />
          </div>
          <div className="stat-ring-meta">
            <strong>{progress}%</strong>
            <span>complete</span>
          </div>
        </div>
      ) : (
        <div className="stat-mini stat-dashes" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
