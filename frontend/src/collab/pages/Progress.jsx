import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Compass,
  BookOpen,
  Calendar,
  Layers,
  Clock,
  TrendingUp,
  Award,
  Milestone
} from "lucide-react";
import { analyticsAPI } from "../../api/analytics";

// Preparation Journey Roadmap Stages
const JOURNEY_STAGES = [
  { id: "started", label: "Started", desc: "Journey Begins" },
  { id: "foundation", label: "Foundation", desc: "Basic Concepts" },
  { id: "core", label: "Core Subjects", desc: "Civil Engineering" },
  { id: "pyq", label: "PYQs", desc: "Past Papers" },
  { id: "mock", label: "Mock Tests", desc: "Full Exam Mode" },
  { id: "ready", label: "Exam Ready", desc: "Final Polish" },
];

// Helper to determine stage based on real stats
const getJourneyStageIndex = (syllabusPercent, pyqsCount) => {
  if (syllabusPercent >= 90 && pyqsCount >= 300) return 5; // Exam Ready
  if (syllabusPercent >= 75 || pyqsCount >= 150) return 4; // Mock Tests
  if (syllabusPercent >= 50 || pyqsCount >= 50) return 3;  // PYQs
  if (syllabusPercent >= 25) return 2;                     // Core Subjects
  if (syllabusPercent > 0) return 1;                      // Foundation
  return 0;                                               // Started
};

export default function Progress() {
  const [loading, setLoading] = useState(true);
  const [syllabus, setSyllabus] = useState([]);
  const [stats, setStats] = useState({
    syllabus_completion_percent: 0,
    total_study_time_hours: 0,
    pyqs_solved: 0,
    streak_days: 0
  });
  const [weeklyActivity, setWeeklyActivity] = useState([
    { day: "MON", hours: 0 },
    { day: "TUE", hours: 0 },
    { day: "WED", hours: 0 },
    { day: "THU", hours: 0 },
    { day: "FRI", hours: 0 },
    { day: "SAT", hours: 0 },
    { day: "SUN", hours: 0 },
  ]);

  useEffect(() => {
    const fetchAllProgressData = async () => {
      try {
        const [progressRes, statsRes, activityRes] = await Promise.all([
          analyticsAPI.getProgress().catch(() => []),
          analyticsAPI.getDashboardStats().catch(() => null),
          analyticsAPI.getWeeklyActivity().catch(() => [])
        ]);

        if (progressRes) setSyllabus(progressRes);
        if (statsRes) setStats(statsRes);
        if (activityRes && activityRes.length > 0) {
          // Format day names nicely to 3 letters
          const formattedActivity = activityRes.map(item => ({
            ...item,
            day: item.day ? item.day.substring(0, 3).toUpperCase() : "DAY"
          }));
          setWeeklyActivity(formattedActivity);
        }
      } catch (error) {
        console.error("Failed to load preparation journey data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProgressData();
  }, []);

  // Derived Totals
  const totalCompletedTopics = syllabus.reduce((acc, sub) => acc + (sub.completedTopics || 0), 0);
  const totalTopicsCount = syllabus.reduce((acc, sub) => acc + (sub.totalTopics || 0), 0);
  const overallPercent = stats.syllabus_completion_percent ||
    (totalTopicsCount > 0 ? Math.round((totalCompletedTopics / totalTopicsCount) * 100) : 0);

  const currentStageIndex = getJourneyStageIndex(overallPercent, stats.pyqs_solved || 0);

  // Weekly study time formatted
  const weeklyTotalHours = weeklyActivity.reduce((sum, item) => sum + (item.hours || 0), 0);
  const weeklyHoursInt = Math.floor(weeklyTotalHours);
  const weeklyMinsInt = Math.round((weeklyTotalHours % 1) * 60);
  const weeklyTotalTimeFormatted = weeklyTotalHours > 0
    ? `${weeklyHoursInt > 0 ? `${weeklyHoursInt}h ` : ""}${weeklyMinsInt > 0 ? `${weeklyMinsInt}m` : ""}`
    : "0h";

  if (loading) {
    return (
      <div className="page max-w-6xl mx-auto px-4 py-8">
        <div className="h-20 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl animate-pulse mb-8" />
        <div className="h-44 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="h-64 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl animate-pulse" />
          <div className="h-64 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // SVG Circular Progress Constants
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPercent / 100) * circumference;

  return (
    <div className="page max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-[var(--primary-light)] text-[var(--primary-color)] rounded-full border border-[var(--primary-color)]/20 flex items-center gap-1.5">
              <Milestone size={13} /> PREPARATION JOURNEY
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Your Progress
          </h1>
          <p className="text-sm font-medium text-[var(--text-muted)] mt-1">
            Track how far you've come in your SSC JE preparation.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-4 py-2 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl shadow-xs text-right">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Current Milestone</div>
            <div className="text-sm font-black text-[var(--primary-color)]">
              Stage {currentStageIndex + 1}: {JOURNEY_STAGES[currentStageIndex].label}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Preparation Journey Roadmap */}
      <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs relative overflow-hidden">
        {/* Subtle Civil Engineering Blueprint Background Decoration */}
        <svg className="absolute inset-0 opacity-[0.03] pointer-events-none stroke-current text-[var(--text-main)]" width="100%" height="100%">
          <defs>
            <pattern id="blueprint-grid-roadmap" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#blueprint-grid-roadmap)" />
        </svg>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-extrabold text-[var(--text-main)] flex items-center gap-2">
                <Compass className="text-[var(--primary-color)]" size={18} />
                <span>Preparation Roadmap</span>
              </h2>
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Your sequential milestone progression based on overall syllabus and practice history.
              </p>
            </div>
          </div>

          {/* Horizontal Roadmap Node Container */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 relative">
            {JOURNEY_STAGES.map((stage, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              return (
                <div
                  key={stage.id}
                  className={`relative flex flex-col items-center text-center p-3.5 rounded-xl transition-all duration-200 ${
                    isCurrent
                      ? "bg-[var(--primary-light)]/50 border border-[var(--primary-color)]/40 shadow-xs scale-[1.02]"
                      : isCompleted
                      ? "bg-[var(--bg-color)]/60 border border-[var(--border-color)]"
                      : "bg-[var(--bg-color)]/30 border border-[var(--border-color)]/40 opacity-70"
                  }`}
                >
                  {/* Connecting line (desktop) */}
                  {idx < JOURNEY_STAGES.length - 1 && (
                    <div className="hidden md:block absolute top-7 left-[calc(50%+18px)] right-[calc(-50%+18px)] h-0.5 z-0">
                      <div className={`h-full transition-colors ${
                        idx < currentStageIndex ? "bg-[var(--primary-color)]" : "bg-[var(--border-color)]"
                      }`} />
                    </div>
                  )}

                  {/* Stage Node Circle */}
                  <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs transition-all duration-300 mb-2 ${
                    isCurrent
                      ? "bg-[var(--primary-color)] text-white ring-4 ring-[var(--primary-color)]/20 shadow-xs animate-pulse"
                      : isCompleted
                      ? "bg-[var(--primary-color)] text-white"
                      : "bg-[var(--bg-color)] text-[var(--text-muted)] border border-[var(--border-color)]"
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 size={16} />
                    ) : isCurrent ? (
                      <Compass size={16} />
                    ) : (
                      <span>0{idx + 1}</span>
                    )}
                  </div>

                  {/* Stage Label */}
                  <div className="relative z-10">
                    <div className={`text-xs font-extrabold ${
                      isCurrent
                        ? "text-[var(--primary-color)] font-black"
                        : isCompleted
                        ? "text-[var(--text-main)]"
                        : "text-[var(--text-muted)]"
                    }`}>
                      {stage.label}
                    </div>
                    <div className="text-[10px] font-medium text-[var(--text-muted)] mt-0.5">
                      {stage.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Syllabus Progress + This Week (2-Column Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Syllabus Circular Progress */}
        <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={14} className="text-[var(--primary-color)]" />
              Syllabus Completion
            </h3>
            <span className="text-xs font-extrabold text-[var(--primary-color)] bg-[var(--primary-light)] px-2.5 py-0.5 rounded-full">
              Overall Status
            </span>
          </div>

          <div className="flex flex-col items-center my-auto py-2">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 150 150">
                <circle
                  cx="75"
                  cy="75"
                  r={radius}
                  className="stroke-[var(--border-color)]"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <circle
                  cx="75"
                  cy="75"
                  r={radius}
                  className="stroke-[var(--primary-color)] transition-all duration-1000 ease-out"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-[var(--text-main)] tracking-tight">
                  {overallPercent}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
                  Syllabus
                </span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm font-semibold text-[var(--text-main)]">
                <span className="text-[var(--primary-color)] font-extrabold">{totalCompletedTopics}</span> / {totalTopicsCount} topics completed
              </p>
            </div>
          </div>
        </div>

        {/* This Week Activity */}
        <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-[var(--primary-color)]" />
              This Week Summary
            </h3>
            <span className="text-xs font-extrabold text-[var(--text-main)] bg-[var(--bg-color)] border border-[var(--border-color)] px-2.5 py-0.5 rounded-full">
              Active Sprint
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5 my-auto">
            <div className="p-3.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl">
              <div className="text-2xl font-black text-[var(--primary-color)]">
                +{totalCompletedTopics}
              </div>
              <div className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">
                Topics Completed
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl">
              <div className="text-2xl font-black text-[var(--text-main)]">
                +{stats.pyqs_solved || 0}
              </div>
              <div className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">
                PYQs Solved
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl">
              <div className="text-2xl font-black text-[var(--text-main)]">
                {stats.streak_days || 0}d
              </div>
              <div className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">
                Study Streak
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl">
              <div className="text-2xl font-black text-[var(--text-main)]">
                {weeklyTotalTimeFormatted}
              </div>
              <div className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">
                Study Time
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Subject Progress Section */}
      <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-main)] flex items-center gap-2">
              <Layers className="text-[var(--primary-color)]" size={18} />
              <span>Subject Progress</span>
            </h2>
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Detailed breakdown across all SSC JE Civil Engineering subjects.
            </p>
          </div>
          <span className="text-xs font-bold text-[var(--text-muted)]">
            {syllabus.length} Subjects Total
          </span>
        </div>

        {syllabus.length === 0 ? (
          <div className="text-center py-8 text-sm font-medium text-[var(--text-muted)] bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl">
            No subject progress data available yet.
          </div>
        ) : (
          <div className="space-y-4">
            {syllabus.map((sub, idx) => (
              <div
                key={idx}
                className="p-4 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl transition-all duration-200 hover:border-[var(--primary-color)]/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--text-main)]">
                      {sub.subject}
                    </h3>
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      {sub.completedTopics || 0} of {sub.totalTopics || 0} topics completed
                    </span>
                  </div>
                  <span className="text-base font-black text-[var(--primary-color)]">
                    {sub.progress}%
                  </span>
                </div>

                <div className="w-full bg-[var(--surface-color)] border border-[var(--border-color)] rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[var(--primary-color)] h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${sub.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Weekly Study Rhythm Section */}
      <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-main)] flex items-center gap-2">
              <Clock className="text-[var(--primary-color)]" size={18} />
              <span>Weekly Study Rhythm</span>
            </h2>
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Daily study activity consistency throughout the current week.
            </p>
          </div>
          <div className="text-xs font-extrabold text-[var(--primary-color)] bg-[var(--primary-light)] px-3 py-1 rounded-full border border-[var(--primary-color)]/20">
            Total: {weeklyTotalTimeFormatted}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 md:gap-4">
          {weeklyActivity.map((item, idx) => {
            const hasHours = item.hours > 0;
            const hoursInt = Math.floor(item.hours);
            const minsInt = Math.round((item.hours % 1) * 60);
            const timeStr = hasHours
              ? `${hoursInt > 0 ? `${hoursInt}h ` : ""}${minsInt > 0 ? `${minsInt}m` : ""}`
              : "—";

            return (
              <div
                key={idx}
                className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                  hasHours
                    ? "bg-[var(--bg-color)] border-[var(--primary-color)]/30"
                    : "bg-[var(--bg-color)]/50 border-[var(--border-color)]"
                }`}
              >
                <span className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  {item.day}
                </span>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-2 transition-all ${
                  hasHours
                    ? "bg-[var(--primary-color)] text-white shadow-xs"
                    : "border-2 border-[var(--border-color)] text-[var(--text-muted)]"
                }`}>
                  {hasHours ? <CheckCircle2 size={14} /> : <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-color)]" />}
                </div>
                <span className={`text-xs font-bold ${hasHours ? "text-[var(--text-main)]" : "text-[var(--text-muted)]/60"}`}>
                  {timeStr}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
