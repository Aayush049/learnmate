import { NavLink } from "react-router-dom";
import { ChevronRight, ArrowRight } from "lucide-react";
import ProgressBar from "../common/ProgressBar";

// Reuses the exact same `subjects` prop the Dashboard already passes in
// (built from hierarchyAPI.getSubjects + analyticsAPI.getProgress).
export default function ContinueLearning({ subjects }) {
  const [active, ...rest] = subjects || [];

  return (
    <section className="card large-card">
      <div className="card-header">
        <div>
          <h3>Continue Learning</h3>
          <p>Pick up where you left off</p>
        </div>
        <NavLink to="/learn/textbook" className="text-link">
          View all <ChevronRight size={15} />
        </NavLink>
      </div>

      {!active ? (
        <div className="mini-empty">
          <p>No subjects available yet.</p>
          <span>Your syllabus will appear here once it loads.</span>
        </div>
      ) : (
        <>
          {/* Primary subject - the one to resume */}
          <div className="resume-block">
            <div className="resume-top">
              <div className={`subject-icon ${active.color}`}>{active.icon}</div>
              <div className="resume-meta">
                <strong>{active.name}</strong>
                <span>
                  {active.completedTopics} / {active.topics} topics completed
                </span>
              </div>
              <span className="resume-pct">{active.progress}%</span>
            </div>

            <ProgressBar value={active.progress} color={active.color} />

            <NavLink to="/learn/textbook" className="primary-button resume-cta">
              Continue <ArrowRight size={14} />
            </NavLink>
          </div>

          {/* Remaining subjects, compact */}
          {rest.length > 0 && (
            <div className="continue-list">
              {rest.slice(0, 3).map((subject) => (
                <div className="continue-row" key={subject.name}>
                  <div className={`subject-icon ${subject.color}`}>{subject.icon}</div>
                  <div className="row-main">
                    <strong>{subject.name}</strong>
                    <span>
                      {subject.completedTopics} / {subject.topics} topics
                    </span>
                    <ProgressBar value={subject.progress} color={subject.color} />
                  </div>
                  <span className="row-pct">{subject.progress}%</span>
                  <NavLink
                    to="/learn/textbook"
                    className="circle-arrow"
                    aria-label={`Continue ${subject.name}`}
                  >
                    <ChevronRight size={17} />
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
