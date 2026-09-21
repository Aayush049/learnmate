import { useState, useEffect } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import PageIntro from "../common/PageIntro";
import { questionsAPI } from "../../../api/questions";
import { hierarchyAPI } from "../../../api/hierarchy";

import { useSearchParams } from "react-router-dom";
export default function PracticeQuestions() {
  
  const [searchParams] = useSearchParams();
  const initialTopicId = searchParams.get("topic_id");
  const [questions, setQuestions] = useState([]);
  const [topicMap, setTopicMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch questions
        let qData = [];
        if (initialTopicId) {
          qData = await questionsAPI.getQuestions({ topic_id: initialTopicId, limit: 1000 });
        } else {
          qData = await questionsAPI.getQuestions({ limit: 1000 });
        }
        
        // Fetch subjects to map topic IDs to names
        const subjects = await hierarchyAPI.getSubjects();
        const tMap = {};
        subjects.forEach(sub => {
          sub.chapters?.forEach(chap => {
            chap.topics?.forEach(top => {
              tMap[top.id] = { topicName: top.name, subjectName: sub.name, chapterName: chap.name };
            });
          });
        });

        setTopicMap(tMap);
        setQuestions(qData);
      } catch (error) {
        console.error("Failed to load questions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialTopicId]);

  const filteredQuestions = difficultyFilter === "All"
    ? questions
    : questions.filter(q => (q.difficulty || "medium").toLowerCase() === difficultyFilter.toLowerCase());

  // Group by topic
  const groupedQuestions = {};
  filteredQuestions.forEach(q => {
    const tid = q.topic_id;
    if (!groupedQuestions[tid]) {
      groupedQuestions[tid] = [];
    }
    groupedQuestions[tid].push(q);
  });

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

        
        <div className="question-list-container">
          {Object.keys(groupedQuestions).length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No questions found. Try running the PDF extractor and ingestion scripts!
            </div>
          )}
          
          {Object.keys(groupedQuestions).map(tId => {
            const groupQ = groupedQuestions[tId];
            const meta = topicMap[tId] || { subjectName: "Unknown Subject", topicName: `Topic #${tId}` };
            return (
              <div key={tId} className="mb-8">
                <div className="bg-gray-50 border-x border-t border-gray-200 px-4 py-2 rounded-t-lg">
                  <h3 className="font-bold text-gray-800 text-sm">
                    {meta.subjectName} <ChevronRight size={12} className="inline text-gray-400" /> {meta.topicName}
                  </h3>
                </div>
                <div className="question-list !mt-0 !rounded-t-none border border-gray-200">
                  {groupQ.map((q, index) => (
                    <div className="question-row border-b last:border-b-0" key={q.id}>
                      <span className="question-index">{index + 1}</span>

                      <div className="flex-1">
                        <strong className="block text-gray-900">{q.question_text.length > 80 ? q.question_text.substring(0, 80) + "..." : q.question_text}</strong>
                        <span className="text-xs text-gray-500 mt-1">{q.is_pyq ? 'PYQ' : 'Practice'} {q.year ? `(${q.year})` : ''}</span>
                      </div>

                      <span className={`difficulty ${(q.difficulty || "medium").toLowerCase()}`}>
                        {q.difficulty || "Medium"}
                      </span>

                      <button className="circle-arrow">
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </section>
    </div>
  );
}
