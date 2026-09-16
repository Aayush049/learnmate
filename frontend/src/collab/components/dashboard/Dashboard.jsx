import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import DashboardStats from "./DashboardStats";
import ContinueLearning from "./ContinueLearning";
import AIRecommendation from "./AIRecommendation";
import Goal from "./Goal";
import WeeklyActivity from "./WeeklyActivity";
import ExamCountdown from "./ExamCountdown";
import { useAuth } from "../../../contexts/AuthContext";
import { hierarchyAPI } from "../../../api/hierarchy";
import { goalsAPI } from "../../../api/goals";
import { analyticsAPI } from "../../../api/analytics";

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || 'User';

  const [subjects, setSubjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [newGoalText, setNewGoalText] = useState("");

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [hierachyData, progressData] = await Promise.all([
          hierarchyAPI.getSubjects(),
          analyticsAPI.getProgress() // from /analytics/progress
        ]);

        const colors = ["purple", "blue", "orange", "cyan", "red", "green"];

        const authSubjects = hierachyData.slice(0, 4).map((sub, index) => {
          // Find matching progress data
          const prog = progressData.find(p => p.subject === sub.name);
          const currentProgress = prog ? prog.progress : 0;
          const currentTopics = prog ? prog.totalTopics : 0;

          return {
            name: sub.name,
            progress: currentProgress,
            topics: currentTopics,
            color: colors[index % colors.length],
            icon: sub.icon || sub.name.substring(0, 2).toUpperCase()
          };
        });

        setSubjects(authSubjects);
      } catch (error) {
        console.error("Failed to load subjects:", error);
      }
    };

    const fetchGoals = async () => {
      try {
        const data = await goalsAPI.getGoals();
        setGoals(data.slice(0, 5)); // show latest 5
      } catch (error) {
        console.error("Failed to load goals", error);
      }
    };

    fetchDependencies();
    fetchGoals();
  }, []);

  const handleToggleGoal = async (id, is_completed) => {
    try {
      const updated = await goalsAPI.updateGoal(id, is_completed);
      setGoals(goals.map(g => g.id === id ? updated : g));
    } catch(err) {}
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    try {
      const g = await goalsAPI.createGoal(newGoalText);
      setGoals([g, ...goals].slice(0, 5));
      setNewGoalText("");
    } catch(err) {}
  };

  const handleDeleteGoal = async (id) => {
    try {
      await goalsAPI.deleteGoal(id);
      setGoals(goals.filter(g => g.id !== id));
    } catch(err) {}
  };

  const remainingGoals = goals.filter(g => !g.is_completed).length;

  return (
    <div className="page">
      <section className="hero">
        <div>
          <span className="eyebrow">SSC JE CIVIL • PERSONALIZED PREPARATION</span>
          <h2>Good morning, {firstName} 👋</h2>
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
              <p>{remainingGoals} tasks remaining</p>
            </div>
            <NavLink to="/track/goals" className="text-link">
              Manage
            </NavLink>
          </div>

          <form onSubmit={handleAddGoal} className="flex gap-2 mb-4">
            <input 
              type="text" 
              className="flex-1 p-2 border rounded" 
              placeholder="Add a new goal..." 
              value={newGoalText}
              onChange={e => setNewGoalText(e.target.value)}
            />
            <button className="primary-button text-sm whitespace-nowrap">Add</button>
          </form>

          <div className="goal-list">
            {goals.map(g => (
              <Goal 
                key={g.id} 
                goal={g} 
                onToggle={handleToggleGoal} 
                onDelete={handleDeleteGoal} 
              />
            ))}
            {goals.length === 0 && (
              <p className="text-gray-500 text-sm italic py-2">No goals set yet.</p>
            )}
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
