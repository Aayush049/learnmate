import React from 'react';
import { getUnitTopicIdentifier } from '../../collab/data/syllabusData';

export const TopicMasteryBars = ({ topics = [] }) => {
  if (!topics || topics.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-[var(--text-muted)]">
        No topic mastery data recorded yet.
      </div>
    );
  }

  const getBarColor = (score) => {
    if (score >= 75) return 'bg-emerald-500';
    if (score >= 50) return 'bg-sky-500';
    if (score >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-3">
      {topics.map((t, idx) => {
        const topicNumber = getUnitTopicIdentifier(t.topic_name);
        return (
          <div key={t.topic_id || idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                {topicNumber && (
                  <span className="font-mono text-[10px] font-bold text-[var(--primary-color)] bg-[var(--primary-light)] px-1 py-0.5 rounded shrink-0">
                    {topicNumber}
                  </span>
                )}
                <span className="font-medium text-[var(--text-main)] truncate">
                  {t.topic_name}
                </span>
              </div>
              <span className="font-mono text-[var(--text-muted)]">
                {t.tmi_score || 10}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--border-color)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(t.tmi_score || 10)}`}
                style={{ width: `${Math.min(100, Math.max(5, t.tmi_score || 10))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopicMasteryBars;
