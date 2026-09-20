import { useState, useEffect } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import PageIntro from "../common/PageIntro";
import { questionsAPI } from "../../../api/questions";

export default function PracticeQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await questionsAPI.getQuestions({ limit: 100 });
        setQuestions(data);
      } catch (error) {
        console.error("Failed to load questions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const filteredQuestions = difficultyFilter === "All"
    ? questions
    : questions.filter(q => q.difficulty.toLowerCase() === difficultyFilter.toLowerCase());

  if (loading) return <div className="p-8 text-center text-gray-500">Loading questions...</div>;

  return (
    <div className="page">
      <PageIntro
        title="SSC JE Civil PYQs & Practice"
        subtitle="Practice previous-year style questions and strengthen weak areas."
      />

      <section className="card">
        <div className="practice-toolbar">
          <div className="tabs">
            {["All", "Easy", "Medium", "Hard"].map(diff => (
              <button
                key={diff}
                className={`tab ${difficultyFilter === diff ? 'active' : ''}`}
                onClick={() => setDifficultyFilter(diff)}
              >
                {diff}
              </button>
            ))}
          </div>

          <button className="filter-button">
            <SlidersHorizontal size={15} /> Filters
          </button>
        </div>

        <div className="question-list">
          {filteredQuestions.map((q, index) => (
            <div className="question-row" key={q.id}>
              <span className="question-index">{index + 1}</span>

              <div>
                <strong>{q.question_text.length > 60 ? q.question_text.substring(0, 60) + "..." : q.question_text}</strong>
                <span>{q.is_pyq ? 'PYQ' : 'Practice'} {q.year ? `(${q.year})` : ''} · Topic #{q.topic_id}</span>
              </div>

              <span className={`difficulty ${q.difficulty.toLowerCase()}`}>
                {q.difficulty}
              </span>

              <button className="circle-arrow">
                <ChevronRight size={17} />
              </button>
            </div>
          ))}
          {filteredQuestions.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No questions found. Try running the PDF extractor and ingestion scripts!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
