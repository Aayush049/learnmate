import React from 'react';

export const WeaknessPill = ({ label, score, trend }) => {
  const getTrendColor = () => {
    if (trend === 'improving') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (trend === 'declining') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${getTrendColor()}`}>
      <span>{label}</span>
      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/20">
        {Math.round(score)}%
      </span>
    </div>
  );
};

export default WeaknessPill;
