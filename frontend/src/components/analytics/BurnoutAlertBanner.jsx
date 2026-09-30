import React from 'react';
import { Icons } from '../../assets/icons';

export const BurnoutAlertBanner = ({ burnoutFlag, dropPercentage, zScore }) => {
  if (!burnoutFlag || burnoutFlag === 'Normal') {
    return null;
  }

  const isCritical = burnoutFlag === 'Critical';

  return (
    <div
      className={`p-4 rounded-xl border flex items-start gap-3.5 mb-6 transition-all shadow-sm ${
        isCritical
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      }`}
    >
      <div className={`p-2 rounded-lg ${isCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
        <Icons.AlertCircle className="w-5 h-5 flex-shrink-0" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-wide uppercase">
            {isCritical ? 'Burnout / Cognitive Fatigue Detected' : 'Performance Fluctuation Warning'}
          </span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 font-mono">
            {isCritical ? 'Action Recommended' : 'Monitoring'}
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
          {isCritical
            ? `Your score dropped significantly below your running baseline (Drop: ${dropPercentage || '15+'}%, Z: ${zScore || '-2.0'}). Consider taking a 15-minute rest, reviewing fundamentals, or switching to lower-intensity flashcard review.`
            : `Your recent attempt showed minor regression from your average. Maintain a steady cadence and avoid rush answering.`}
        </p>
      </div>
    </div>
  );
};

export default BurnoutAlertBanner;
