import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { useState } from "react";

export default function Goal({ goal, onToggle, onDelete }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    await onToggle(goal.id, !goal.is_completed);
    setLoading(false);
  };

  return (
    <div className={`goal ${goal.is_completed ? "done" : ""} flex items-center justify-between`}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={handleToggle} style={{ opacity: loading ? 0.7 : 1 }}>
        {goal.is_completed ? <CheckCircle2 size={19} className="text-green-500" /> : <Circle size={19} className="text-gray-400" />}
        <span>{goal.text}</span>
      </div>
      {onDelete && (
        <button onClick={() => onDelete(goal.id)} className="text-gray-400 hover:text-red-500 p-1 rounded border-none bg-transparent cursor-pointer">
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
