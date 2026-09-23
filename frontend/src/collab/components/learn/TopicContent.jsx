import { useState, useEffect } from "react";
import { ChevronRight, PlayCircle, FileText, CheckCircle } from "lucide-react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import apiClient from "../../../api/client";
import { questionsAPI } from "../../../api/questions";

export default function TopicContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Learn");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Topic Details
        const topicRes = await apiClient.get(`/topics/${id}`);
        setTopic(topicRes.data);

        // Fetch Questions for this Topic
        const qData = await questionsAPI.getQuestions({ topic_id: id, limit: 100 });
        setQuestions(qData);
      } catch (error) {
        console.error("Failed to load topic data", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading topic...</div>;
  }

  if (!topic) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl text-red-500 mb-4">Topic Not Found</h2>
        <button className="primary-button" onClick={() => navigate("/learn/topics")}>Go Back to Topics</button>
      </div>
    );
  }

  const pyqs = questions.filter(q => q.is_pyq);

  return (
    <div className="page">
      <div className="breadcrumb">
        SSC JE Civil <ChevronRight size={13} /> Chapter #{topic.chapter_id} <ChevronRight size={13} /> {topic.name}
      </div>

      <section className="card topic-content">
        <div className="topic-content-header pb-4 border-b border-gray-100">
          <span className="eyebrow uppercase text-blue-600 font-bold text-xs tracking-wider">TOPIC #{topic.id}</span>
          <h2 className="text-2xl font-bold mt-1 mb-2 text-gray-900">{topic.name}</h2>
          <p className="text-gray-600">{topic.description || "Master this concept to score well in SSC JE."}</p>
        </div>

        <div className="tabs mt-4">
          {["Learn", "PYQs", "Summary"].map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <article className="mt-6">
          {activeTab === "Learn" && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><FileText size={18} className="text-blue-500"/> What to Learn</h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                Understand the fundamental principles of <strong>{topic.name}</strong>. Focus on standard definitions, formulas, and their practical applications in Civil Engineering.
              </p>

              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><CheckCircle size={18} className="text-green-500"/> SSC JE Focus</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
                <li>Memorize key standard relationships and values.</li>
                <li>Practice numericals commonly asked in Objective Papers.</li>
                <li>Ensure you understand the edge cases and typical tricks used in previous year questions.</li>
              </ul>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <button className="primary-button flex items-center gap-2" onClick={() => navigate(`/learn/practice?topic_id=${topic.id}`)}>
                  <PlayCircle size={16} /> Start Topic Practice
                </button>
              </div>
            </div>
          )}

          {activeTab === "PYQs" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Previous Year Questions ({pyqs.length})</h3>
              {pyqs.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
                  No PYQs available for this topic yet. Check out the general Practice mode instead.
                </div>
              ) : (
                <div className="space-y-4">
                  {pyqs.map((q, idx) => (
                    <div key={q.id} className="p-4 border border-gray-100 rounded-lg bg-white shadow-sm hover:shadow-md transition">
                      <div className="flex gap-2 mb-2">
                        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">PYQ {q.year || ""}</span>
                        {q.source && <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{q.source}</span>}
                      </div>
                      <p className="text-gray-900 font-medium mb-3">{q.question_text}</p>
                      <button className="text-sm font-semibold text-blue-600 hover:text-blue-800" onClick={() => navigate(`/learn/practice?topic_id=${topic.id}`)}>
                        Solve in Practice Mode →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "Summary" && (
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Quick Recap</h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                You've completed the overview of {topic.name}. To solidify your understanding, we highly recommend taking a Mock Test covering Chapter #{topic.chapter_id} or running through the Practice Module 2-3 times.
              </p>
            </div>
          )}
        </article>

        <div className="content-actions mt-8 pt-4 border-t border-gray-100 flex justify-between">
          <button className="secondary-button" onClick={() => navigate(-1)}>← Back</button>
          <button className="primary-button" onClick={() => navigate(`/learn/practice?topic_id=${topic.id}`)}>Start Practice →</button>
        </div>
      </section>
    </div>
  );
}
