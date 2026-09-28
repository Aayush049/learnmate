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
  Target
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

  // State 1: Test Selection
  if (!selectedTest) {
    const isAiUnlocked = completedAttemptsCount >= 4;
    const remainingBaseline = Math.max(0, 4 - completedAttemptsCount);

    return (
      <div className="page max-w-6xl mx-auto">
        <PageIntro
          title="SSC JE Mock Test Arena"
          subtitle="Real exam simulations with PYQ distribution weightage and AI-driven weakness profiling."
        />

        {/* Diagnostic Calibration Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <Compass className="text-blue-400" size={20} />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Adaptive Calibration Engine
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">
                {isAiUnlocked
                  ? "AI Personalized Mode Unlocked!"
                  : `Baseline Diagnostic Phase (${completedAttemptsCount}/4 Complete)`}
              </h3>
              <p className="text-sm text-blue-200 leading-relaxed">
                {isAiUnlocked
                  ? "Your weakness profile is fully calibrated. Tests are dynamically generated to target your specific improvement areas."
                  : `Complete your first 4 baseline diagnostic tests to calibrate your weakness matrix and unlock AI adaptive personalized tests.`}
              </p>

              {/* Progress Bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 bg-blue-950/60 h-2.5 rounded-full overflow-hidden border border-blue-700/50">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (completedAttemptsCount / 4) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-blue-200">
                  {completedAttemptsCount} / 4 Tests
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                className="px-5 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
                onClick={handleGenerateBaselineTest}
                disabled={generating}
              >
                {generating ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                Generate Baseline #{completedAttemptsCount + 1}
              </button>

              <button
                className={`px-5 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                  isAiUnlocked
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                }`}
                onClick={handleGeneratePersonalizedTest}
                disabled={generating || !isAiUnlocked}
              >
                {generating ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : isAiUnlocked ? (
                  <Sparkles size={16} className="text-yellow-300" />
                ) : (
                  <Lock size={16} />
                )}
                {isAiUnlocked ? "Generate AI Adaptive Test" : `Locked (${remainingBaseline} more)`}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex justify-between items-center shadow-sm">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">✕</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Available Mock Tests</h3>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {testList.length} Tests Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testList.map(t => (
             <section className="bg-white border border-gray-100 hover:border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between" key={t.id}>
               <div>
                 <div className="flex items-center justify-between mb-3">
                   <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                     t.is_baseline
                       ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                       : "bg-purple-50 text-purple-700 border border-purple-200/60"
                   }`}>
                     {t.is_baseline ? "Baseline Diagnostic" : "AI Personalized"}
                   </span>
                   <span className="text-xs font-semibold text-gray-500">{t.duration_minutes} mins</span>
                 </div>
                 <h4 className="font-bold text-gray-900 text-lg">{t.name}</h4>
                 <p className="text-gray-500 text-sm mt-1 line-clamp-2">{t.description || "Standard PYQ-based exam pattern."}</p>
                 <div className="flex gap-4 mt-4 text-xs font-medium text-gray-600 bg-gray-50 p-2.5 rounded-lg">
                    <span><strong>{t.total_marks}</strong> Marks</span>
                    <span><strong>{t.total_marks}</strong> Questions</span>
                    <span><strong>0.25</strong> Negative</span>
                 </div>
               </div>
               <button
                 className="mt-6 w-full py-2.5 px-4 bg-gray-900 hover:bg-blue-600 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2"
                 onClick={() => startTest(t.id)}
               >
                 Start Test <Play size={15} />
               </button>
             </section>
          ))}
          {testList.length === 0 && (
             <div className="col-span-2 p-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
               <Target size={36} className="mx-auto mb-2 text-gray-300" />
               <p className="font-medium text-gray-600">No mock tests generated yet.</p>
               <p className="text-xs text-gray-400 mt-1">Click "Generate Baseline" above to create your first test.</p>
             </div>
          )}
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