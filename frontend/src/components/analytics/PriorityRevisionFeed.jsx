import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../../assets/icons';
import { getUnitTopicIdentifier } from '../../collab/data/syllabusData';

export const PriorityRevisionFeed = ({ feed = [] }) => {
  const navigate = useNavigate();

  if (!feed || feed.length === 0) {
    return (
      <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-[var(--text-main)] flex items-center gap-2 mb-2">
          <Icons.Bookmark className="w-5 h-5 text-amber-400" />
          Priority Revision Feed
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          Complete mock tests or practice sessions to generate your personalized AI revision priority feed.
        </p>
      </div>
    );
  }

  const getUrgencyBadge = (reason) => {
    if (reason.includes('Speed Trap')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (reason.includes('Memory Decay')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
    if (reason.includes('Speed Optimization')) {
      return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    }
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  return (
    <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
            <Icons.Target className="w-5 h-5 text-emerald-400" />
            AI Priority Revision Feed
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Ranked by Time-Decayed Mastery (TMI) & Cognitive Overload
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {feed.map((item, idx) => {
          const topicNumber = getUnitTopicIdentifier(item.topic_name);
          return (
            <div
              key={item.topic_id || idx}
              className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)]/60 hover:bg-[var(--primary-light)]/20 transition-all flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {topicNumber && (
                    <span className="text-xs font-mono font-bold text-[var(--primary-color)] bg-[var(--primary-light)] px-1.5 py-0.5 rounded">
                      {topicNumber}
                    </span>
                  )}
                  <span className="font-semibold text-sm text-[var(--text-main)] truncate">
                    {item.topic_name}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getUrgencyBadge(
                      item.recommendation_reason
                    )}`}
                  >
                    {item.recommendation_reason}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] font-mono">
                  <span>TMI Score: <strong className="text-[var(--text-main)]">{item.tmi_score}%</strong></span>
                  <span>BKT: <strong className="text-[var(--text-main)]">{Math.round(item.bkt_prob * 100)}%</strong></span>
                  <span>Error Rate: <strong className="text-rose-400">{item.error_rate_percent}%</strong></span>
                </div>
              </div>

              <button
                onClick={() => navigate(`/practice?topic_id=${item.topic_id}`)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--primary-color)] text-white hover:opacity-90 transition-opacity flex items-center gap-1.5 flex-shrink-0"
              >
                <Icons.Play className="w-3.5 h-3.5" />
                Practice
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriorityRevisionFeed;
