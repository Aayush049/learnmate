import { Target, Loader2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import PageIntro from "../components/common/PageIntro";
import ProgressBar from "../components/common/ProgressBar";
import { goalsAPI } from "../../api/goals";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pre-defined colors for UI flair
  const colors = ["purple", "blue", "green", "red", "orange", "cyan"];

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const data = await goalsAPI.getGoals();
      setGoals(data);
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGoal = async (id, currentStatus) => {
    try {
      await goalsAPI.updateGoal(id, !currentStatus);
      await fetchGoals();
    } catch (err) {
      console.error("Failed to update goal:", err);
    }
  };

  const handleAddGoal = async () => {
    const text = prompt("Enter a new goal:");
    if (!text) return;
    setLoading(true);
    try {
      await goalsAPI.createGoal(text);
      await fetchGoals();
    } catch (err) {
      console.error("Failed to create goal", err);
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="flex justify-between items-end mb-6">
        <PageIntro
          title="SSC JE Preparation Goals"
          subtitle="Turn your exam target into measurable milestones."
        />
        <button className="primary-button" onClick={handleAddGoal}>
          + New Goal
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="goal-cards">
          {goals.map((goal, index) => {
            const color = colors[index % colors.length];
            const progress = goal.is_completed ? 100 : 0;
            return (
              <div className={`card goal-card ${goal.is_completed ? 'opacity-70' : ''}`} key={goal.id}>
                <div className={`goal-icon ${color}`}>
                  <Target size={20} />
                </div>

                <div className="flex-1">
                  <h3>{goal.text}</h3>
                  <ProgressBar value={progress} color={color} />

                  <div className="goal-meta">
                    <span>{progress}% complete</span>
                    <span>{goal.is_completed ? "Completed!" : "Keep going"}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleGoal(goal.id, goal.is_completed)}
                  className={`ml-4 p-2 rounded-full flex items-center justify-center transition-colors ${goal.is_completed ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  title="Toggle status"
                >
                  <Check size={20} />
                </button>
              </div>
            );
          })}
          {goals.length === 0 && (
            <div className="p-8 text-center text-gray-500 w-full col-span-2">
              No goals added yet. Stay focused!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
