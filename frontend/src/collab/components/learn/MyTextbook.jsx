import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import PageIntro from "../common/PageIntro";
import ProgressBar from "../common/ProgressBar";
import { hierarchyAPI } from "../../../api/hierarchy";
import { analyticsAPI } from "../../../api/analytics";

export default function MyTextbook() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [data, progressData] = await Promise.all([
          hierarchyAPI.getSubjects(),
          analyticsAPI.getProgress()
        ]);

        // Map backend API data to frontend component expected structure
        const colors = ["purple", "blue", "orange", "cyan", "red", "green"];
        const formattedSubjects = data.map((sub, index) => {
          const numTopics = sub.chapters?.reduce((count, chapter) => count + (chapter.topics?.length || 0), 0) || 0;
          
          const prog = progressData.find(p => p.subject === sub.name);
          const currentProgress = prog ? prog.progress : 0;

          return {
            name: sub.name,
            progress: currentProgress,
            color: colors[index % colors.length],
            icon: sub.icon || sub.name.substring(0, 2).toUpperCase(),
            topics: numTopics,
            id: sub.id
          };
        });

        setSubjects(formattedSubjects);
      } catch (error) {
        console.error("Failed to load subjects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading subjects...</div>;

  return (
    <div className="page">
      <PageIntro
        title="SSC JE Civil Syllabus"
        subtitle="Your Civil Engineering subjects and preparation progress."
        action="+ Add Topic"
      />

      <div className="subject-grid">
        {subjects.map((subject) => (
          <div className="subject-card card" key={subject.id || subject.name}>
            <div className={`subject-icon ${subject.color}`}>
              {subject.icon}
            </div>

            <div className="subject-card-content">
              <h3>{subject.name}</h3>
              <p>{subject.topics} topics · {subject.progress}% complete</p>

              <ProgressBar value={subject.progress} color={subject.color} />

              <div className="subject-footer">
                <span>{subject.progress}%</span>
                <NavLink to="/learn/topics">
                  Study <ChevronRight size={14} />
                </NavLink>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// Trigger HMR update

