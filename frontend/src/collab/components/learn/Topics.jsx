import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import PageIntro from "../common/PageIntro";
import ProgressBar from "../common/ProgressBar";
import { hierarchyAPI } from "../../../api/hierarchy";
import { analyticsAPI } from "../../../api/analytics";

export default function Topics() {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("All");

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [data, topicProgressData] = await Promise.all([
          hierarchyAPI.getSubjects(),
          analyticsAPI.getTopicProgress()
        ]);
        setSubjects(data);

        // Create dictionary of topic progress for O(1) lookup
        const progressDict = {};
        topicProgressData.forEach(tp => {
          progressDict[tp.topic_id] = tp.progress;
        });

        // Flatten topics from all chapters and subjects
        const allTopics = [];
        data.forEach(subject => {
          subject.chapters?.forEach(chapter => {
            chapter.topics?.forEach(topic => {
              allTopics.push({
                ...topic,
                subject_name: subject.name,
                progress: progressDict[topic.id] || 0
              });
            });
          });
        });

        setTopics(allTopics);
      } catch (error) {
        console.error("Failed to load topics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, []);

  const filteredTopics = selectedSubject === "All"
    ? topics
    : topics.filter(t => t.subject_name === selectedSubject);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading topics...</div>;

  return (
    <div className="page">
      <PageIntro
        title="Civil Engineering Topics"
        subtitle="Study SSC JE Civil topics and track your preparation."
      />

      <section className="card">
        <div className="select-row">
          <label>Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="All">All Civil Engineering</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.name}>{sub.name}</option>
            ))}
          </select>
        </div>

        <div className="tabs">
          <button className="tab active">Topics</button>
          <button className="tab">Weak Topics</button>
          <button className="tab">Completed</button>
        </div>

        <div className="topic-list">
          {filteredTopics.map((topic, index) => (
            <NavLink className="topic-row" to={`/learn/topic/${topic.id}`} key={topic.id || topic.name}>
              <div className="topic-number">{index + 1}</div>
              <div className="topic-info">
                <strong>{topic.name}</strong>
                <span>{topic.progress || 0}% complete</span>
              </div>
              <ProgressBar value={topic.progress || 0} />
              <span className="topic-percent">{topic.progress || 0}%</span>
              <ChevronRight size={17} />
            </NavLink>
          ))}
          {filteredTopics.length === 0 && (
            <div className="p-8 text-center text-gray-500">No topics found for this subject.</div>
          )}
        </div>
      </section>
    </div>
  );
}
