import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import DashboardStats from "./DashboardStats";
import ContinueLearning from "./ContinueLearning";
import AIRecommendation from "./AIRecommendation";
import Goal from "./Goal";
import WeeklyActivity from "./WeeklyActivity";
import ExamCountdown from "./ExamCountdown";
import Achievements from "./Achievements";
import SubjectPerformance from "./SubjectPerformance";
import Motivation from "./Motivation";
import { useAuth } from "../../../contexts/AuthContext";
import { hierarchyAPI } from "../../../api/hierarchy";
import { goalsAPI } from "../../../api/goals";
import { analyticsAPI } from "../../../api/analytics";
import bgimg from "../../../assets/bgimg.jpg";


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

        const colors = ["purple", "blue", "teal", "orange", "red", "cyan"];

        const authSubjects = hierachyData.slice(0, 4).map((sub, index) => {
          // Find matching progress data
          const prog = progressData.find(p => p.subject === sub.name);
          const currentProgress = prog ? prog.progress : 0;
          const currentTopics = prog ? prog.totalTopics : 0;
          const completedTopics = prog ? prog.completedTopics : 0;

          return {
            name: sub.name,
            progress: currentProgress,
            topics: currentTopics,
            completedTopics: completedTopics,
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
    <div className="page dashboard-page">
      {/* LEVEL 1 - Welcome + countdown */}
      <div className="hero-row">
        <section className="hero-card welcome-hero">
          <div className="hero-text">
            <span className="eyebrow">SSC JE CIVIL • PERSONALIZED PREPARATION</span>
            <h2>Good morning, {firstName} 👋</h2>
            <p>Let's crack SSC JE Civil today. Focus on your weakest topics first.</p>
          </div>
          <div className="hero-right-zone">
            <img src={bgimg} alt="Engineering" className="hero-illustration-img" />
          </div>
        </section>
        <ExamCountdown />
      </div>

      {/* LEVEL 2 - Four key statistics */}
      <DashboardStats />

      {/* Columns for Level 3 & 4 Layout */}
      <div className="dashboard-columns">
        <div className="dashboard-left">
          <section>
            <ContinueLearning subjects={subjects} />
          </section>
          <SubjectPerformance />
          <section className="card card-checklist">
            <div className="card-header">
              <div>
                <h3>Today's Study Plan</h3>
                <p>{remainingGoals} tasks remaining</p>
              </div>
              <NavLink to="/track/goals" className="text-link">
                Manage
              </NavLink>
            </div>

            {goals.length === 0 ? (
              <div className="mini-empty compact">
                <div className="flex justify-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <p>No tasks planned yet</p>
                <span>Add your first study task to start your day.</span>
              </div>
            ) : (
                <div className="goal-list">
                  {goals.map(g => (
                    <Goal
                      key={g.id}
                      goal={g}
                      onToggle={handleToggleGoal}
                      onDelete={handleDeleteGoal}
                    />
                  ))}
                </div>
            )}

            <form onSubmit={handleAddGoal} className="goal-add-form mt-4 pt-4 border-t border-gray-100">
              <input
                type="text"
                className="goal-input"
                placeholder="+ Add task"
                value={newGoalText}
                onChange={e => setNewGoalText(e.target.value)}
              />
            </form>
          </section>
        </div>

        <div className="dashboard-right">
          <AIRecommendation />
          <WeeklyActivity />
          <Achievements />
        </div>
      </div>

      {/* LEVEL 5 - Motivational banner */}
      <Motivation />
    </div>
  );
}
