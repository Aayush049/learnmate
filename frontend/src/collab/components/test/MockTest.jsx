import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Pause,
  Play,
  Send,
  Loader2
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
  const [selectedTest, setSelectedTest] = useState(null);
  const [attemptData, setAttemptData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const [questionStats, setQuestionStats] = useState([]);

  // 1. Fetch available tests on mount
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const tests = await mockTestsAPI.getAllTests();
        setTestList(tests);
      } catch (err) {
        setError("Failed to load available mock tests.");
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

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
    return (
      <div className="page">
        <PageIntro
          title="Mock Tests"
          subtitle="Select a dynamic test to start practicing."
        />
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="flex flex-col gap-4">
          {testList.map(t => (
             <section className="card flex items-center justify-between p-6" key={t.id}>
               <div>
                 <h3 className="font-semibold text-lg">{t.name}</h3>
                 <p className="text-gray-500 text-sm mt-1">{t.description}</p>
                 <div className="flex gap-4 mt-3 text-sm text-gray-600">
                    <span>{t.duration_minutes} mins</span>
                    <span>{t.total_marks} Marks</span>
                 </div>
               </div>
               <button className="primary-button" onClick={() => startTest(t.id)}>
                 Start Test <Play size={16} className="ml-1" />
               </button>
             </section>
          ))}
          {testList.length === 0 && (
             <div className="p-8 text-center text-gray-500">No mock tests available in the database yet.</div>
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