import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  BookOpen,
  Target,
  TrendingUp,
  Hash,
  Search
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PageIntro from "../common/PageIntro";
import ConfirmModal from "./ConfirmModal";
import { questionsAPI } from "../../../api/questions";
import apiClient from "../../../api/client";

export default function PracticeQuestions() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const topicId = searchParams.get("topic_id");
  const isPyq = searchParams.get("is_pyq") === "true";
  const year = searchParams.get("year");
  const shift = searchParams.get("shift");

  // ── Index (PYQ) ─────────────────────────────────────────────────────────────
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [indexError, setIndexError] = useState(null);
  const [questionIndex, setQuestionIndex] = useState([]); // [{ id, number, year, shift, subject, topic }]

  // ── Full detail cache (PYQ) ────────────────────────────────────────────────
  const [questionCache, setQuestionCache] = useState({}); // { [questionId]: QuestionDetail }
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const detailRequestIdRef = useRef(0);

  // ── Full questions (non-PYQ) ────────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [topicDetails, setTopicDetails] = useState(null);


  // ── Engine ─────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // { [questionId]: { selected, is_correct, correct_option, explanation, loading } }
  const [answers, setAnswers] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Auto-scroll active item in left list into view
  const activeListItemRef = useRef(null);
  useEffect(() => {
    activeListItemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  const totalQuestions = isPyq ? questionIndex.length : questions.length;

  const selectedQuestionId = isPyq
    ? questionIndex[activeIndex]?.id
    : questions[activeIndex]?.id;

  const activeQuestion = isPyq
    ? questionCache[selectedQuestionId]
    : questions[activeIndex];

  const activeAnswer = answers[activeQuestion?.id];
  const isLocked = !!(activeAnswer && activeAnswer.selected && !activeAnswer.loading);

  // ── Fetch index (PYQ) OR questions list (non-PYQ) ────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoadingIndex(true);
      setIndexError(null);
      setDetailLoading(false);
      setDetailError(null);

      // Reset engine state
      setActiveIndex(0);
      setAnswers({});
      setIsFinished(false);

      if (isPyq) {
        setQuestionCache({});
        setQuestionIndex([]);
      }

      try {
        if (isPyq) {
          const y = year ? parseInt(year, 10) : null;
          const idx = await questionsAPI.getPYQIndex({
            year: y,
            shift,
          });
          setQuestionIndex(idx);
        } else {
          // Topic practice: keep existing behavior (bulk questions for that topic).
          let qData = [];
          if (topicId) {
            try {
              const topicRes = await apiClient.get(`/topics/${topicId}`);
              setTopicDetails(topicRes.data);
            } catch {
              /* topic details optional */
            }

            // For topic practice, we can keep loading a full batch.
            qData = await questionsAPI.getQuestions({ topic_id: parseInt(topicId, 10), limit: 1000 });
          } else {
            qData = await questionsAPI.getQuestions({ limit: 1000 });
          }

          setQuestions(qData);
        }
      } catch (err) {
        console.error("Failed to load practice index/questions:", err);
        setIndexError("Failed to load practice data.");
      } finally {
        setLoadingIndex(false);
      }
    };

    fetchData();
  }, [topicId, isPyq, year, shift]);

  // ── Lazy load detail when PYQ selection changes ─────────────────────────────
  const loadDetailForQuestionId = async (questionId) => {
    if (!questionId) return;

    // Cache hit
    if (questionCache[questionId]) {
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    const myReqId = ++detailRequestIdRef.current;
    setDetailLoading(true);
    setDetailError(null);

    try {
      const detail = await questionsAPI.getQuestionDetail(questionId);

      // Race condition safety: ignore stale response
      if (myReqId !== detailRequestIdRef.current) return;

      setQuestionCache((prev) => ({ ...prev, [questionId]: detail }));
      setDetailLoading(false);
    } catch (err) {
      console.error("Unable to load question detail:", err);

      if (myReqId !== detailRequestIdRef.current) return;

      setDetailLoading(false);
      setDetailError("Unable to load this question.");
    }
  };

  useEffect(() => {
    if (!isPyq) return;
    if (!selectedQuestionId) return;

    loadDetailForQuestionId(selectedQuestionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPyq, selectedQuestionId]);

  // ── Option select & submit ─────────────────────────────────────────────────
  const handleSelectOption = async (question, optionLabel) => {
    const qId = question.id;
    const existing = answers[qId];

    // Already answered or currently submitting
    if (existing && (existing.selected || existing.loading)) return;

    // Optimistic loading state
    setAnswers((prev) => ({ ...prev, [qId]: { loading: true, selected: optionLabel } }));

    try {
      const result = await questionsAPI.submitAnswer({
        question_id: qId,
        selected_option: optionLabel,
        time_taken_seconds: 15,
      });

      setAnswers((prev) => ({
        ...prev,
        [qId]: {
          selected: result.selected_option,
          is_correct: result.is_correct,
          correct_option: result.correct_option,
          explanation: result.explanation,
          loading: false,
        },
      }));
    } catch (err) {
      console.error("Submit failed:", err);
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const answered = Object.values(answers).filter((a) => !a.loading && a.selected);
  const correctCount = answered.filter((a) => a.is_correct).length;
  const wrongCount = answered.length - correctCount;
  const unattempted = totalQuestions - answered.length;
  const accuracy = answered.length > 0 ? Math.round((correctCount / answered.length) * 100) : 0;

  const getQuestionStatus = (q) => {
    const a = answers[q.id];
    if (!a || a.loading) return "unattempted";
    return a.is_correct ? "correct" : "wrong";
  };

  const pageTitle = isPyq
    ? `SSC JE Civil ${year || ""} • Paper 1 • ${shift || ""}`
    : topicDetails
      ? `Practice: ${topicDetails.name}`
      : "Practice Session";

  // ── Loading / error / empty ─────────────────────────────────────────────────
  if (loadingIndex) {
    return (
      <div className="page">
        <div className="card flex items-center justify-center gap-3 p-12 text-gray-500">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          Loading practice session…
        </div>
      </div>
    );
  }

  if (indexError) {
    return (
      <div className="page">
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">{indexError}</div>
        <button className="secondary-button" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="page">
        <PageIntro
          title={pageTitle}
          subtitle={isPyq ? "No PYQs found for this filter." : "No questions found for this topic."}
        />
        <div className="card p-8 text-center text-gray-500">
          We are currently adding questions. Please check back later.
          <br />
          <br />
          <button
            className="primary-button mx-auto"
            onClick={() => navigate(isPyq ? "/learn/pyqs" : "/learn/topics")}
          >
            {isPyq ? "Browse PYQs" : "Browse Other Topics"}
          </button>
        </div>
      </div>
    );
  }

  // ── Summary (finished) ───────────────────────────────────────────────────────
  if (isFinished) {
    return (
      <div className="page">
        <PageIntro
          title={isPyq ? `Results: ${year} ${shift}` : "Practice Summary"}
          subtitle={
            topicDetails
              ? topicDetails.name
              : isPyq
                ? "Previous Year Question Paper"
                : "Practice Session"
          }
        />

        <section className="card mb-6 p-6">
          <div className="flex flex-wrap gap-8">
            <StatChip icon={<Hash size={18} className="text-blue-500" />} label="Total" value={totalQuestions} valueClass="text-gray-800" />
            <StatChip icon={<BookOpen size={18} className="text-purple-500" />} label="Attempted" value={answered.length} valueClass="text-purple-700" />
            <StatChip icon={<Target size={18} className="text-green-500" />} label="Correct" value={correctCount} valueClass="text-green-700" />
            <StatChip icon={<XCircle size={18} className="text-red-400" />} label="Wrong" value={wrongCount} valueClass="text-red-600" />
            <StatChip icon={<TrendingUp size={18} className="text-orange-500" />} label="Accuracy" value={`${accuracy}%`} valueClass={accuracy >= 60 ? "text-green-700" : "text-orange-600"} />
            <StatChip label="Skipped" value={unattempted} valueClass="text-gray-500" />
          </div>
        </section>

        {answered.length > 0 && (
          <div className="card p-4 mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Score</span>
              <span>
                {correctCount} / {totalQuestions}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-green-500 transition-all duration-700"
                style={{ width: `${(correctCount / totalQuestions) * 100}%` }}
              />
              <div
                className="h-full bg-red-400 transition-all duration-700"
                style={{ width: `${(wrongCount / totalQuestions) * 100}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Correct
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Wrong
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Skipped
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            className="secondary-button"
            onClick={() => {
              setAnswers({});
              setActiveIndex(0);
              setIsFinished(false);
            }}
          >
            Retry Practice
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              // Return to practice view with all answers intact (review mode)
              setIsFinished(false);
            }}
          >
            Review Answers
          </button>
          <button
            className="primary-button"
            onClick={() =>
              navigate(isPyq ? "/learn/pyqs" : topicId ? `/learn/topic/${topicId}` : "/learn/topics")
            }
          >
            {isPyq ? "Back to PYQs" : "Back to Topics"}
          </button>
        </div>
      </div>
    );
  }

  // ── Main split-layout view ────────────────────────────────────────────────
  return (
    <div className="page">
      <ConfirmModal
        isOpen={showConfirm}
        title="End Practice?"
        message="Are you sure you want to end this practice session? You will see a summary of your results."
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          setIsFinished(true);
        }}
        confirmText="Yes, End Practice"
      />

      <div className="flex justify-between items-start mb-5">
        <PageIntro title={pageTitle} subtitle="Click any question on the left to attempt it." />
        <button className="secondary-button whitespace-nowrap mt-1" onClick={() => setShowConfirm(true)}>
          End Session
        </button>
      </div>

      <div className="card flex flex-wrap gap-6 px-5 py-3 mb-5 text-xs">
        <span className="text-gray-500">
          Total: <strong className="text-gray-800">{totalQuestions}</strong>
        </span>
        <span className="text-gray-500">
          Attempted: <strong className="text-purple-700">{answered.length}</strong>
        </span>
        <span className="text-gray-500">
          Correct: <strong className="text-green-600">{correctCount}</strong>
        </span>
        <span className="text-gray-500">
          Wrong: <strong className="text-red-500">{wrongCount}</strong>
        </span>
        <span className="text-gray-500">
          Accuracy:{" "}
          <strong className={accuracy >= 60 ? "text-green-600" : "text-orange-500"}>
            {answered.length > 0 ? `${accuracy}%` : "—"}
          </strong>
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          gap: "18px",
          alignItems: "start",
        }}
      >
        {/* Left: navigator (PYQ index or full questions list) */}
        <aside className="card question-palette">
          <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Questions</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search subject, topic, or #..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div
            className="palette-grid"
            style={{ maxHeight: "72vh", overflowY: "auto", padding: "14px", margin: 0 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "8px",
              }}
            >
              {(() => {
                const sourceList = isPyq ? questionIndex : questions;
                const filteredList = sourceList.map((q, idx) => ({ ...q, originalIndex: idx })).filter((q) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  
                  // if pyq index has subject/topic
                  if (q.subject && q.subject.toLowerCase().includes(query)) return true;
                  if (q.topic && q.topic.toLowerCase().includes(query)) return true;
                  
                  // if full questions list has those fields
                  if (q.subject_name && q.subject_name.toLowerCase().includes(query)) return true;
                  if (q.topic_name && q.topic_name.toLowerCase().includes(query)) return true;
                  
                  // if searching for exact question number
                  const numStr = (isPyq && q.number) ? q.number.toString() : (q.originalIndex + 1).toString();
                  if (numStr === query) return true;
                  
                  // if full question has question_text
                  if (q.question_text && q.question_text.toLowerCase().includes(query)) return true;
                  
                  return false;
                });
                
                if (filteredList.length === 0) {
                  return <div className="col-span-5 text-gray-400 text-xs text-center py-4">No matches</div>;
                }
                
                return filteredList.map((q) => {
                  const idx = q.originalIndex;
                  const status = getQuestionStatus(q);
                  const isActive = idx === activeIndex;

                  let cls = "palette-number";
                  if (isActive) cls += " current";
                  else if (status === "correct") cls += " correct";
                  else if (status === "wrong") cls += " wrong";

                  const displayNumber = isPyq && q?.number ? q.number : idx + 1;

                  return (
                    <button
                      key={q.id}
                      ref={isActive ? activeListItemRef : null}
                      className={cls}
                      onClick={() => setActiveIndex(idx)}
                      title={q.topic ? `${q.subject || ''} > ${q.topic}` : `Question ${displayNumber}`}
                      style={{ fontSize: "11px", fontWeight: 600 }}
                    >
                      {displayNumber}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          <div className="px-4 pb-4 flex flex-col gap-1 border-t border-gray-50 pt-3">
            <LegendRow color="bg-gray-200" label="Not attempted" />
            <LegendRow color="bg-green-300" label="Correct" />
            <LegendRow color="bg-red-300" label="Wrong" />
            <LegendRow color="bg-purple-500" label="Currently viewing" />
          </div>
        </aside>

        {/* Right: MCQ engine */}
        <section className="card question-card">
          <div className="question-card-header flex justify-between items-center bg-gray-50 px-5 py-4 border-b border-gray-100 rounded-t-xl">
            <div>
              <span className="font-bold text-gray-700 text-sm">
                Question {activeIndex + 1} <span className="font-normal text-gray-400">of {totalQuestions}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeQuestion?.subject_name && (
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">{activeQuestion.subject_name}</span>
              )}
              {activeQuestion?.topic_name && (
                <>
                  <span className="text-gray-300 text-xs">/</span>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded">{activeQuestion.topic_name}</span>
                </>
              )}
              {activeQuestion?.difficulty && (
                <span
                  className={`difficulty ${activeQuestion.difficulty.toLowerCase()} px-2 py-1 rounded text-xs font-semibold capitalize`}
                >
                  {activeQuestion.difficulty}
                </span>
              )}
            </div>
          </div>

          <div className="px-6 py-5">
            {!activeQuestion && (detailLoading || isPyq) && <div className="text-gray-500">Loading question...</div>}

            {detailError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <div className="font-semibold mb-2">{detailError}</div>
                <button
                  className="primary-button"
                  onClick={() => loadDetailForQuestionId(selectedQuestionId)}
                >
                  Retry
                </button>
              </div>
            )}

            {activeQuestion && (
              <>
                <h2 className="text-base font-medium text-gray-900 mb-5 leading-relaxed">
                  {activeQuestion.question_text}
                </h2>

                <div className="space-y-3">
                  {activeQuestion.options.map((option) => {
                    const isSelected = activeAnswer?.selected === option.option_label;
                    const isCorrectOpt = activeAnswer?.correct_option === option.option_label;

                    let optCls =
                      "answer-option w-full border p-4 rounded-xl flex items-start gap-3 transition-all text-left ";

                    if (activeAnswer?.loading && isSelected) {
                      optCls += "bg-blue-50 border-blue-400 opacity-70 cursor-wait ";
                    } else if (isLocked) {
                      optCls += "cursor-default ";
                      if (isCorrectOpt) {
                        optCls += "bg-green-50 border-green-400 ";
                      } else if (isSelected && !activeAnswer.is_correct) {
                        optCls += "bg-red-50 border-red-400 ";
                      } else {
                        optCls += "bg-white border-gray-200 opacity-50 ";
                      }
                    } else {
                      optCls +=
                        "bg-white border-gray-200 hover:border-purple-400 hover:bg-purple-50 cursor-pointer ";
                    }

                    return (
                      <button
                        key={option.id}
                        className={optCls}
                        onClick={() => handleSelectOption(activeQuestion, option.option_label)}
                        disabled={isLocked || !!activeAnswer?.loading}
                      >
                        <span
                          className={`option-letter flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border transition-colors
                            ${
                              isLocked && isCorrectOpt
                                ? "bg-green-500 border-green-600 text-white"
                                : isLocked && isSelected && !activeAnswer.is_correct
                                  ? "bg-red-500 border-red-600 text-white"
                                  : "bg-gray-100 border-gray-300 text-gray-700"
                            }`}
                        >
                          {option.option_label}
                        </span>
                        <span className="flex-1 mt-1 text-sm">{option.option_text}</span>

                        {isLocked && isCorrectOpt && (
                          <CheckCircle2 size={20} className="flex-shrink-0 text-green-500 mt-0.5" />
                        )}
                        {isLocked && isSelected && !activeAnswer.is_correct && (
                          <XCircle size={20} className="flex-shrink-0 text-red-500 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {isLocked && activeAnswer.explanation && (
                  <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 font-semibold text-blue-900 text-sm">
                      <AlertCircle size={16} />
                      Explanation
                    </div>
                    <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-wrap">{activeAnswer.explanation}</p>
                  </div>
                )}

                {isLocked && !activeAnswer.explanation && (
                  <div
                    className={`mt-4 flex items-center gap-2 text-sm font-semibold ${
                      activeAnswer.is_correct ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {activeAnswer.is_correct ? (
                      <>
                        <CheckCircle2 size={18} /> Correct! Correct answer: {activeAnswer.correct_option}
                      </>
                    ) : (
                      <>
                        <XCircle size={18} /> Incorrect. Correct answer: {activeAnswer.correct_option}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="question-actions flex justify-between items-center px-6 py-4 border-t border-gray-100">
            <button
              className="secondary-button flex items-center gap-1"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((i) => i - 1)}
            >
              ← Prev
            </button>

            <span className="text-xs text-gray-400">
              {answered.length} / {totalQuestions} answered
            </span>

            {activeIndex < totalQuestions - 1 ? (
              <button
                className="primary-button flex items-center gap-1"
                onClick={() => setActiveIndex((i) => i + 1)}
              >
                Next →
              </button>
            ) : (
              <button className="primary-button" onClick={() => setShowConfirm(true)}>
                View Results
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, valueClass }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 flex items-center gap-1">
        {icon}
        {label}
      </span>
      <strong className={`text-2xl font-bold ${valueClass}`}>{value}</strong>
    </div>
  );
}

function LegendRow({ color, label }) {
  return (
    <span className="flex items-center gap-2 text-xs text-gray-500">
      <span className={`w-3 h-3 rounded ${color} inline-block`} />
      {label}
    </span>
  );
}
