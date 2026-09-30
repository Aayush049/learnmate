import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Pause,
  Play,
  Send,
  Loader2,
  Sparkles,
  Lock,
  Compass,
  Zap,
  Target,
  Search,
  Clock,
  BookOpen,
  Award,
  AlertCircle,
  BarChart2,
  Check,
  FileText,
  Layers
} from "lucide-react";
import PageIntro from "../common/PageIntro.jsx";
import TestTimer from "./TestTimer.jsx";
import QuestionTimer from "./QuestionTimer.jsx";
import TestAnalytics from "./TestAnalytics.jsx";
import ConfirmSubmitModal from "./ConfirmSubmitModal.jsx";
import { buildTopicAnalytics } from "./analyticsLogic.js";
import { mockTestsAPI } from "../../../api/mockTests.ts";

export default function MockTest() {
  const [testList, setTestList] = useState([]);
  const [completedAttemptsCount, setCompletedAttemptsCount] = useState(0);
  const [selectedTest, setSelectedTest] = useState(null);
  const [attemptData, setAttemptData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const [questionStats, setQuestionStats] = useState([]);

  // Command Center UI filter & selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [activeTestId, setActiveTestId] = useState(null);

  const filteredTests = useMemo(() => {
    return testList.filter((test) => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "baseline" && test.is_baseline) ||
        (activeTab === "personalized" && !test.is_baseline);

      const matchesSearch =
        !searchQuery ||
        test.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (test.description && test.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesTab && matchesSearch;
    });
  }, [testList, activeTab, searchQuery]);

  const selectedDetailTest = useMemo(() => {
    return (
      testList.find((t) => t.id === activeTestId) ||
      filteredTests[0] ||
      testList[0] ||
      null
    );
  }, [testList, filteredTests, activeTestId]);

  useEffect(() => {
    if (!activeTestId && testList.length > 0) {
      setActiveTestId(testList[0].id);
    }
  }, [testList, activeTestId]);

  // 1. Fetch available tests and attempt counts on mount
  useEffect(() => {
    fetchTestsAndAttempts();
  }, []);

  const fetchTestsAndAttempts = async () => {
    try {
      const [tests, attempts] = await Promise.all([
        mockTestsAPI.getAllTests(),
        mockTestsAPI.getUserAttempts().catch(() => [])
      ]);
      setTestList(tests);
      const completed = attempts.filter(a => a.completed_at != null).length;
      setCompletedAttemptsCount(completed);
    } catch (err) {
      setError("Failed to load available mock tests.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBaselineTest = async () => {
    setGenerating(true);
    setError(null);
    try {
      const newTest = await mockTestsAPI.generateBaselineTest({
        branch_id: 1,
        total_questions: 100,
        name: `Mock Test ${completedAttemptsCount + 1}`
      });
      await fetchTestsAndAttempts();
      await startTest(newTest.id);
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Failed to generate baseline mock test. Please check backend connection.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePersonalizedTest = async () => {
    if (completedAttemptsCount < 4) {
      setError(`You need to complete ${4 - completedAttemptsCount} more baseline test${4 - completedAttemptsCount > 1 ? 's' : ''} to unlock AI Personalized Tests.`);
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const newTest = await mockTestsAPI.generatePersonalizedTest({
        branch_id: 1,
        total_questions: 100,
        adaptation_weight: 0.6,
        name: `AI Adaptive Test #${testList.filter(t => !t.is_baseline).length + 1}`
      });
      await fetchTestsAndAttempts();
      await startTest(newTest.id);
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Failed to generate AI Personalized mock test.");
      }
    } finally {
      setGenerating(false);
    }
  };

  // 2. Start a specific test
  const startTest = async (testId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await mockTestsAPI.startTest(testId);
      setAttemptData(data);
      setSelectedTest(data.mock_test);

      // Map API questions into local format compatible with TestAnalytics
      const formatted = data.questions.map((q) => ({
        id: q.id,
        topic: `Topic #${q.topic_id}`,
        subtopic: q.difficulty,
        question: q.question_text,
        options: q.options.map(opt => opt.option_text),
        optionLabels: q.options.map(opt => opt.option_label),
        selectedAnswer: null,
        timeSpent: 0,
        startedAt: Date.now(),
      }));
      setQuestionStats(formatted);
      setCurrentIndex(0);
      setRunning(true);
      setSubmitted(false);
      setResultData(null);
    } catch (err) {
      setError("Failed to start the test. Ensure questions are available.");
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questionStats[currentIndex];
  const currentStat = questionStats[currentIndex];

  const recordCurrentSecond = useCallback(() => {
    if (!running || submitted) return;
    setQuestionStats((current) =>
      current.map((item, index) =>
        index === currentIndex
          ? { ...item, timeSpent: item.timeSpent + 1 }
          : item
      )
    );
  }, [currentIndex, running, submitted]);

  const selectAnswer = (answerIndex) => {
    if (!running || submitted) return;
    setQuestionStats((current) =>
      current.map((item, index) =>
        index === currentIndex
          ? { ...item, selectedAnswer: answerIndex }
          : item
      )
    );
  };

  const goToQuestion = (index) => {
    if (index < 0 || index >= questionStats.length) return;

    setQuestionStats((current) =>
      current.map((item, i) =>
        i === index ? { ...item, startedAt: Date.now() } : item
      )
    );
    setCurrentIndex(index);
  };

  const submitTest = useCallback(async () => {
    setIsSubmitModalOpen(false);
    setRunning(false);
    setLoading(true);
    try {
      // Map back to API format (AnswerSubmission)
      const answers = questionStats.map((qs) => ({
        question_id: qs.id,
        selected_option: qs.selectedAnswer !== null ? qs.optionLabels[qs.selectedAnswer] : null,
        time_taken_seconds: qs.timeSpent
      }));

      const res = await mockTestsAPI.submitTest(attemptData.attempt_id, answers);
      setResultData(res);
      setSubmitted(true);
      await fetchTestsAndAttempts();
    } catch (err) {
      setError("Failed to submit test. Try again.");
      setRunning(true);
    } finally {
      setLoading(false);
    }
  }, [attemptData, questionStats]);

  const handleRequestSubmit = () => {
    setIsSubmitModalOpen(true);
  };

  useEffect(() => {
    if (submitted || !selectedTest) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [submitted, selectedTest]);

  const topicAnalytics = useMemo(
    () => buildTopicAnalytics(questionStats),
    [questionStats]
  );

  const answeredCount = questionStats.filter(q => q.selectedAnswer !== null).length;

  // VIEW STATES

  if (loading && !selectedTest) {
    return <div className="p-8 text-center text-gray-500">Loading tests...</div>;
  }

  // State 1: Test Selection (SSC JE Mock Test Command Center)
  if (!selectedTest) {
    const isAiUnlocked = completedAttemptsCount >= 4;
    const remainingBaseline = Math.max(0, 4 - completedAttemptsCount);
    const calibrationPercent = Math.min(100, Math.round((completedAttemptsCount / 4) * 100));

    return (
      <div className="page max-w-7xl mx-auto px-4 py-6">
        {/* Command Center Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="flex-1 z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-[var(--primary-light)] text-[var(--primary-color)] rounded-full border border-[var(--primary-color)]/20 flex items-center gap-1.5">
                <Target size={14} /> SSC JE CIVIL EXAM ARENA
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight mb-1">
              MOCK TESTS
            </h1>
            <p className="text-sm font-medium text-[var(--text-muted)] italic">
              "Simulate. Analyse. Improve."
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-2 max-w-xl">
              Official Civil Engineering PYQ pattern simulations paired with real-time weakness calibration engine.
            </p>
          </div>

          {/* Header Diagnostic Progress Card */}
          <div className="z-10 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-4 min-w-[280px]">
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[var(--border-color)]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[var(--primary-color)] transition-all duration-700"
                  strokeDasharray={`${calibrationPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold text-[var(--text-main)]">
                {calibrationPercent}%
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-main)]">
                {completedAttemptsCount} of 4 Baseline Completed
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {isAiUnlocked ? "AI Personalized Unlocked" : `${remainingBaseline} more to calibrate`}
              </div>
              <div className="mt-1.5 w-full bg-[var(--border-color)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--primary-color)] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${calibrationPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Adaptive Calibration Engine Feature Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 rounded-2xl text-white shadow-lg relative overflow-hidden border border-slate-800">
          {/* Civil Engineering Blueprint Line-Art SVG Decoration */}
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
            <svg width="320" height="180" viewBox="0 0 320 180" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 160 L160 30 L300 160 Z" />
              <path d="M20 160 L300 160" />
              <path d="M90 95 L90 160" />
              <path d="M160 30 L160 160" />
              <path d="M230 95 L230 160" />
              <path d="M20 160 L90 95 L160 160 L230 95 L300 160" />
              <circle cx="160" cy="30" r="4" fill="currentColor" />
              <circle cx="90" cy="95" r="3" fill="currentColor" />
              <circle cx="230" cy="95" r="3" fill="currentColor" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Compass className="text-emerald-400 animate-pulse" size={20} />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                  Adaptive Calibration Engine
                </span>
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight mb-2 text-white">
                {isAiUnlocked
                  ? "AI Personalized Mode Active!"
                  : `Baseline Diagnostic Calibration (${completedAttemptsCount}/4)`}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {isAiUnlocked
                  ? "Your weakness matrix has been fully calibrated. Generate tests targeted dynamically to your specific Civil Engineering topic deficiencies."
                  : "Complete 4 baseline tests to initialize your weakness matrix. Our AI engine analyzes accuracy per topic to generate personalized adaptive tests."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
              <button
                className="px-5 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-2 shadow-md hover:shadow-blue-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                onClick={handleGenerateBaselineTest}
                disabled={generating}
              >
                {generating ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                Generate Baseline #{completedAttemptsCount + 1}
              </button>

              <button
                className={`px-5 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                  isAiUnlocked
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:shadow-emerald-500/25 active:scale-95 cursor-pointer"
                    : "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                }`}
                onClick={handleGeneratePersonalizedTest}
                disabled={generating || !isAiUnlocked}
              >
                {generating ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : isAiUnlocked ? (
                  <Sparkles size={16} className="text-amber-300" />
                ) : (
                  <Lock size={16} />
                )}
                {isAiUnlocked ? "Generate AI Adaptive Test" : `Locked (${remainingBaseline} more)`}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle size={18} className="text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Exam Readiness & Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--surface-color)] border border-[var(--border-color)] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary-light)] text-[var(--primary-color)] flex items-center justify-center shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] font-semibold uppercase">Total Tests</div>
              <div className="text-lg font-bold text-[var(--text-main)]">{testList.length} Available</div>
            </div>
          </div>

          <div className="bg-[var(--surface-color)] border border-[var(--border-color)] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] font-semibold uppercase">Completed Attempts</div>
              <div className="text-lg font-bold text-[var(--text-main)]">{completedAttemptsCount} Completed</div>
            </div>
          </div>

          <div className="bg-[var(--surface-color)] border border-[var(--border-color)] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <BarChart2 size={20} />
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] font-semibold uppercase">Calibration Status</div>
              <div className="text-lg font-bold text-[var(--text-main)]">
                {isAiUnlocked ? "Calibrated (100%)" : `${calibrationPercent}% Matrix`}
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-color)] border border-[var(--border-color)] p-4 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Award size={20} />
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] font-semibold uppercase">Exam Pattern</div>
              <div className="text-lg font-bold text-[var(--text-main)]">100 Qs • 120 Mins</div>
            </div>
          </div>
        </div>

        {/* Controls: Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "all"
                  ? "bg-[var(--primary-color)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              All Tests ({testList.length})
            </button>
            <button
              onClick={() => setActiveTab("baseline")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "baseline"
                  ? "bg-[var(--primary-color)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Baseline ({testList.filter((t) => t.is_baseline).length})
            </button>
            <button
              onClick={() => setActiveTab("personalized")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === "personalized"
                  ? "bg-[var(--primary-color)] text-white shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              AI Adaptive ({testList.filter((t) => !t.is_baseline).length})
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              type="text"
              placeholder="Search mock tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary-color)] text-[var(--text-main)]"
            />
          </div>
        </div>

        {/* 2-Column Command Center Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Test Cards Grid */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {filteredTests.map((t) => {
              const isSelected = selectedDetailTest?.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTestId(t.id)}
                  className={`bg-[var(--surface-color)] border rounded-2xl p-5 transition cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? "border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]/20 shadow-md"
                      : "border-[var(--border-color)] hover:border-[var(--primary-color)]/50 hover:shadow-xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          t.is_baseline
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {t.is_baseline ? "Baseline Diagnostic" : "AI Personalized"}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold uppercase bg-[var(--primary-light)] text-[var(--primary-color)] px-2 py-0.5 rounded">
                          Selected
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-medium">
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {t.duration_minutes} mins
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FileText size={13} /> {t.total_marks} Qs
                      </span>
                    </div>
                  </div>

                  <h4 className="font-extrabold text-[var(--text-main)] text-lg mb-1">{t.name}</h4>
                  <p className="text-[var(--text-muted)] text-xs line-clamp-2 leading-relaxed">
                    {t.description || "Standard PYQ-based Civil Engineering exam simulation pattern."}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                      <span><strong>{t.total_marks}</strong> Marks</span>
                      <span>•</span>
                      <span><strong className="text-amber-600">-0.25</strong> Negative</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startTest(t.id);
                      }}
                      className="px-4 py-2 bg-[var(--primary-color)] hover:opacity-90 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    >
                      Start Test <Play size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredTests.length === 0 && (
              <div className="p-12 text-center bg-[var(--surface-color)] rounded-2xl border border-dashed border-[var(--border-color)]">
                <Target size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
                <h4 className="font-bold text-[var(--text-main)]">No mock tests match your filter</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Try adjusting your search query or click "Generate Baseline" above to create a test.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Selected Test Detail Panel */}
          <div className="lg:col-span-5 xl:col-span-4">
            {selectedDetailTest ? (
              <div className="sticky top-6 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        selectedDetailTest.is_baseline
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}
                    >
                      {selectedDetailTest.is_baseline ? "Baseline Diagnostic" : "AI Personalized"}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      ID: #{selectedDetailTest.id}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[var(--text-main)] leading-tight mb-2">
                    {selectedDetailTest.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {selectedDetailTest.description ||
                      "Complete official exam blueprint coverage calibrated for SSC JE Civil Engineering Paper-1 pattern."}
                  </p>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-3 bg-[var(--bg-color)] p-4 rounded-xl border border-[var(--border-color)]">
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold">Total Duration</div>
                    <div className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 mt-0.5">
                      <Clock size={14} className="text-[var(--primary-color)]" />
                      {selectedDetailTest.duration_minutes} Minutes
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold">Total Marks</div>
                    <div className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 mt-0.5">
                      <Award size={14} className="text-amber-600" />
                      {selectedDetailTest.total_marks} Marks
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold">Total Questions</div>
                    <div className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 mt-0.5">
                      <FileText size={14} className="text-blue-600" />
                      {selectedDetailTest.total_marks} Questions
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold">Negative Marking</div>
                    <div className="text-sm font-bold text-rose-600 flex items-center gap-1.5 mt-0.5">
                      <AlertCircle size={14} />
                      -0.25 per wrong
                    </div>
                  </div>
                </div>

                {/* Test Syllabus Highlights */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] mb-3 flex items-center gap-1.5">
                    <Layers size={14} className="text-[var(--primary-color)]" /> Exam Simulation Features
                  </h4>
                  <ul className="space-y-2.5 text-xs text-[var(--text-muted)]">
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Civil Engineering Technical Paper (100 Qs distribution)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Real-time per-question timers & time analysis logging</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Instant topic accuracy & weakness matrix update upon submit</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>PYQ Difficulty distribution calibration</span>
                    </li>
                  </ul>
                </div>

                {/* Primary CTA */}
                <button
                  onClick={() => startTest(selectedDetailTest.id)}
                  className="w-full py-3 px-4 bg-[var(--primary-color)] hover:opacity-90 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
                >
                  Start Test Now <Play size={16} />
                </button>
              </div>
            ) : (
              <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 text-center text-[var(--text-muted)]">
                Select a test from the list to view detailed specs.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // State 2: Submitting / Loading Test
  if (loading && selectedTest && !submitted) {
     return <div className="p-8 text-center text-gray-500 flex flex-col items-center">
       <Loader2 size={32} className="animate-spin mb-4" />
       {attemptData ? "Submitting exam..." : "Starting exam..."}
     </div>;
  }

  // State 3: Test Submitted (Analytics View)
  if (submitted) {
    return (
      <div className="page">
        <PageIntro
          title="Test Analysis"
          subtitle="Your performance, timing and topic-level strengths."
        />

        {resultData && (
          <section className="card mb-6 flex gap-8 p-6">
             <div>
                <span className="block text-sm text-gray-500">Score</span>
                <strong className="text-2xl">{resultData.score} / {resultData.total_marks}</strong>
             </div>
             <div>
                <span className="block text-sm text-gray-500">Accuracy</span>
                <strong className="text-2xl">{resultData.accuracy}%</strong>
             </div>
             <div>
                <span className="block text-sm text-gray-500">Correct Answers</span>
                <strong className="text-2xl text-green-600">{resultData.correct_answers}</strong>
             </div>
             <div>
                <span className="block text-sm text-gray-500">Incorrect</span>
                <strong className="text-2xl text-red-600">{resultData.incorrect_answers}</strong>
             </div>
          </section>
        )}

        <TestAnalytics topicAnalytics={topicAnalytics} />

        <button
          className="primary-button mt-6"
          onClick={() => {
            setSelectedTest(null);
            setSubmitted(false);
          }}
        >
          <Play size={17} /> Back to Mock Tests
        </button>
      </div>
    );
  }

  if (!currentQuestion) return null;

  // State 4: Taking the Test
  return (
    <div className="page">
      <ConfirmSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={submitTest}
        totalQuestions={questionStats.length}
        answeredCount={answeredCount}
      />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      <div className="test-header">
        <div>
          <span className="eyebrow">Mock Test Engine</span>
          <h2>{selectedTest.name}</h2>
          <p>
            Question {currentIndex + 1} of {questionStats.length} ·{" "}
            {currentQuestion.topic}
          </p>
        </div>

        <div className="test-controls">
          <TestTimer
            initialSeconds={selectedTest.duration_minutes * 60}
            running={running}
            onExpire={submitTest}
          />

          <button
            className="secondary-button"
            onClick={() => setRunning((value) => !value)}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : "Resume"}
          </button>

          <button
            className="primary-button"
            style={{ backgroundColor: "#1e40af", color: "white", borderColor: "#1e40af" }}
            onClick={handleRequestSubmit}
          >
            <Send size={16} /> Submit
          </button>
        </div>
      </div>

      <div className="test-layout">
        <section className="card question-card">
          <div className="question-card-header">
            <div>
              <span className="question-label">
                Question {currentIndex + 1}
              </span>
              <span className="question-topic">
                {currentQuestion.topic} · {currentQuestion.subtopic}
              </span>
            </div>

            <QuestionTimer
              elapsedSeconds={currentStat.timeSpent}
              running={running}
              onTick={recordCurrentSecond}
            />
          </div>

          <h2>{currentQuestion.question}</h2>

          <div className="options-list">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                className={`answer-option ${
                  currentStat.selectedAnswer === index ? "selected" : ""
                }`}
                onClick={() => selectAnswer(index)}
              >
                <span className="option-letter">
                  {currentQuestion.optionLabels[index]}
                </span>
                <span>{option}</span>

                {currentStat.selectedAnswer === index && (
                  <CheckCircle2 size={18} />
                )}
              </button>
            ))}
          </div>

          <div className="question-actions">
            <button
              className="secondary-button"
              disabled={currentIndex === 0}
              onClick={() => goToQuestion(currentIndex - 1)}
            >
              <ChevronLeft size={17} /> Previous
            </button>

            <button className="secondary-button">
              <Flag size={16} /> Mark for review
            </button>

            {currentIndex === questionStats.length - 1 ? (
              <button className="primary-button" onClick={handleRequestSubmit}>
                <Send size={16} /> Submit Test
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={() => goToQuestion(currentIndex + 1)}
              >
                Next <ChevronRight size={17} />
              </button>
            )}
          </div>
        </section>

        <aside className="card question-palette flex flex-col h-full">
          <h3>Question Palette</h3>

          <div className="palette-grid flex-1">
            {questionStats.map((question, index) => {
              const answered =
                questionStats[index].selectedAnswer !== null;

              return (
                <button
                  key={question.id}
                  className={`palette-number ${
                    index === currentIndex ? "current" : ""
                  } ${answered ? "answered" : ""}`}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="palette-legend mt-4 pb-4 border-b">
            <span><i className="current-dot" /> Current</span>
            <span><i className="answered-dot" /> Answered</span>
            <span><i className="unanswered-dot" /> Unanswered</span>
          </div>

          <div className="mt-4 pt-2">
            <button
               className="primary-button w-full justify-center bg-blue-700 text-white"
               onClick={handleRequestSubmit}
            >
              <Send size={16} /> Submit Test Early
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}