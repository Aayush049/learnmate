import React from 'react';
import { Icons } from '../../assets/icons';

export const CognitiveLoadMatrix = ({ matrix }) => {
  const {
    fast_master = 0,
    methodical = 0,
    speed_trap = 0,
    high_load = 0,
    total_analyzed = 0,
  } = matrix || {};

  const getPercent = (count) => {
    if (!total_analyzed || total_analyzed === 0) return 0;
    return Math.round((count / total_analyzed) * 100);
  };

  return (
    <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
            <Icons.Activity className="w-5 h-5 text-indigo-400" />
            4-Quadrant Cognitive Load Matrix
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Speed vs Accuracy Profiling (RTI Relative Time Index)
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[var(--primary-light)]/30 text-[var(--primary-color)]">
          {total_analyzed} Questions Evaluated
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Quadrant 1: Fast Master */}
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 transition-all hover:bg-emerald-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Q1 · Fast Master (Fluency)
            </span>
            <span className="text-base font-bold text-emerald-400">{getPercent(fast_master)}%</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)] mt-1">{fast_master}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Fast & Correct. Concepts internalized with high automaticity.
          </p>
        </div>

        {/* Quadrant 2: Methodical */}
        <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 transition-all hover:bg-sky-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Q2 · Methodical (Deliberate)
            </span>
            <span className="text-base font-bold text-sky-400">{getPercent(methodical)}%</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)] mt-1">{methodical}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Slow & Correct. Strong fundamentals; practice speed drills to improve pace.
          </p>
        </div>

        {/* Quadrant 3: Speed Trap */}
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 transition-all hover:bg-amber-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Q3 · Speed Trap (Careless)
            </span>
            <span className="text-base font-bold text-amber-400">{getPercent(speed_trap)}%</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)] mt-1">{speed_trap}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Fast & Incorrect. Rushed reading or falling into trap options. Slow down.
          </p>
        </div>

        {/* Quadrant 4: High Load */}
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 transition-all hover:bg-rose-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Q4 · High Load (Struggle)
            </span>
            <span className="text-base font-bold text-rose-400">{getPercent(high_load)}%</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-main)] mt-1">{high_load}</div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Slow & Incorrect. High cognitive overload. Review chapter theory first.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CognitiveLoadMatrix;
