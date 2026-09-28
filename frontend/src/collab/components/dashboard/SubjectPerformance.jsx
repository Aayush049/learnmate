import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { analyticsAPI } from "../../../api/analytics";

const MAX_ROWS = 5;

// Subject table built from the two endpoints that already back the Progress
// and Performance pages. Accuracy is only shown for subjects the performance
// endpoint actually reports on; the rest show a dash rather than a fabricated
// number. Capped at MAX_ROWS with a "View all" link to the full page.
export default function SubjectPerformance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const [progressData, perfData] = await Promise.all([
          analyticsAPI.getProgress(),
          analyticsAPI.getPerformance()
        ]);

        const accuracyByName = {};
        [...(perfData?.weakTopics || []), ...(perfData?.strongTopics || [])].forEach((t) => {
          accuracyByName[t.name] = t.accuracy;
        });

        setRows(
          progressData.map((subject) => ({
            name: subject.subject,
            progress: subject.progress,
            accuracy:
              accuracyByName[subject.subject] !== undefined
                ? accuracyByName[subject.subject]
                : null
          }))
        );
      } catch (err) {
        console.error("Failed to load subject performance", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  // Weakest = lowest accuracy among subjects we actually have accuracy for.
  const scored = rows.filter((r) => r.accuracy !== null);
  const weakest = scored.length ? scored.reduce((a, b) => (a.accuracy <= b.accuracy ? a : b)) : null;

  // Surface the weakest subject first so the callout is always in view.
  const ordered = weakest
    ? [weakest, ...rows.filter((r) => r.name !== weakest.name)]
    : rows;
  const visible = ordered.slice(0, MAX_ROWS);
  const hidden = rows.length - visible.length;

  return (
    <section className="card subject-performance-card">
      <div className="card-header">
        <div>
          <h3>Subject Performance</h3>
          <p>Accuracy and syllabus progress</p>
        </div>
        {rows.length > 0 && (
          <NavLink to="/track/progress" className="text-link">
            View all {hidden > 0 ? `(${rows.length})` : ""} <ArrowRight size={13} />
          </NavLink>
        )}
      </div>

      {loading ? (
        <div className="skeleton-rows">
          {[1, 2, 3].map((i) => (
            <div className="skeleton-row" key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mini-empty compact">
          <p>No subject data yet</p>
          <span>Attempt a mock test to unlock this view.</span>
        </div>
      ) : (
        <>
          <div className="subject-table">
            <div className="subject-table-head">
              <span>Subject</span>
              <span>Accuracy</span>
              <span>Progress</span>
            </div>

            {visible.map((row) => {
              const isWeak = weakest !== null && row.name === weakest.name;
              return (
                <div className={`subject-table-row ${isWeak ? "weak" : ""}`} key={row.name}>
                  <span className="subject-name">
                    {row.name}
                    {isWeak && <AlertTriangle size={13} />}
                  </span>

                  <span className={`subject-accuracy ${isWeak ? "weak" : ""}`}>
                    {row.accuracy === null ? "—" : `${row.accuracy}%`}
                  </span>

                  <span className="subject-progress-cell">
                    <span className="progress-track">
                      <span
                        className={`progress-fill ${isWeak ? "orange" : "purple"}`}
                        style={{ width: `${row.progress}%` }}
                      />
                    </span>
                    <small>{row.progress}%</small>
                  </span>
                </div>
              );
            })}
          </div>

          {weakest && (
            <div className="weak-callout">
              <div>
                <strong>{weakest.name} needs attention</strong>
                <span>Lowest accuracy at {weakest.accuracy}% — targeted practice helps most here.</span>
              </div>
              <NavLink to="/learn/practice" className="primary-button">
                Practice <ArrowRight size={14} />
              </NavLink>
            </div>
          )}
        </>
      )}
    </section>
  );
}
