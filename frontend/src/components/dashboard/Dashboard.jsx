import { NavLink } from "react-router-dom";
import { subjects } from "../../data/data";
import DashboardStats from "./DashboardStats";
import ContinueLearning from "./ContinueLearning";
import AIRecommendation from "./AIRecommendation";
import Goal from "./Goal";
import WeeklyActivity from "./WeeklyActivity";
import ExamCountdown from "./ExamCountdown";

export default function Dashboard() {
  return (
    <div className="page dashboard-page">
      <section className="hero">
        <div>
          <span className="eyebrow">SSC JE CIVIL • PERSONALIZED PREPARATION</span>
          <h2>Good morning, Arav 👋</h2>
          <p>
            Your SSC JE Civil study plan is ready. Focus on your weakest
            topics first.
          </p>
        </div>

        <ExamCountdown />
      </section>

      <DashboardStats />

      <div className="dashboard-grid">
        <ContinueLearning subjects={subjects} />
        <AIRecommendation />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <h3>Today's SSC JE Goals</h3>
              <p>3 tasks remaining</p>
            </div>
            <NavLink to="/track/goals" className="text-link">
              Manage
            </NavLink>
          </div>

          <div className="goal-list">
            <Goal text="Revise Surveying formulas" done />
            <Goal text="Solve 25 Civil Engineering PYQs" />
            <Goal text="Complete one Soil Mechanics topic" />
            <Goal text="Attempt one timed reasoning set" />
          </div>
        </section>

        <WeeklyActivity />
      </div>

      <section className="card exam-focus-card">
        <div className="card-header">
          <div>
            <h3>SSC JE Civil Focus</h3>
            <p>Use your recent performance to decide what to study next.</p>
          </div>
          <NavLink to="/track/performance" className="text-link">
            View performance
          </NavLink>
        </div>

        <div className="focus-grid">
          <div>
            <span>Priority</span>
            <strong>Soil Mechanics</strong>
            <small>Needs more practice based on recent accuracy.</small>
          </div>
          <div>
            <span>Next target</span>
            <strong>25 PYQs</strong>
            <small>Mix conceptual and numerical questions.</small>
          </div>
          <div>
            <span>Revision mode</span>
            <strong>Formula Review</strong>
            <small>Revise formulas before starting the next mock.</small>
          </div>
        </div>
      </section>
    </div>
  );
}
