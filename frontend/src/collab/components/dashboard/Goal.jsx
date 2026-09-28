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
    <div className={`goal ${goal.is_completed ? "done" : ""} flex items-center justify-between py-3 border-t border-gray-100 first:border-t-0`}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={handleToggle} style={{ opacity: loading ? 0.7 : 1 }}>
        {goal.is_completed ? (
          <div className="w-5 h-5 rounded border-2 border-primary bg-primary flex items-center justify-center">
            <CheckCircle2 size={14} className="text-white" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center">
            <Circle size={14} className="text-transparent" />
          </div>
        )}
        <div className="flex flex-col">
          <span className={`text-sm ${goal.is_completed ? "text-gray-400 line-through" : "text-gray-800"}`}>
            {goal.text}
          </span>
          {/* Optional: Add duration if stored in goal object, e.g. goal.duration */}
        </div>
      </div>
      {onDelete && (
        <button onClick={() => onDelete(goal.id)} className="text-gray-400 hover:text-red-500 p-1 rounded border-none bg-transparent cursor-pointer">
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
