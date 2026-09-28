import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { hierarchyAPI } from "../../../api/hierarchy";
import { analyticsAPI } from "../../../api/analytics";

export default function ExamCountdown() {
  const [examDate, setExamDate] = useState("2026-12-01");
  const [daysLeft, setDaysLeft] = useState(() => {
    const today = new Date();
    const exam = new Date("2026-12-01");
    const difference = exam.getTime() - today.getTime();
    return Math.max(Math.ceil(difference / (1000 * 60 * 60 * 24)), 0);
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function fetchExamData() {
      try {
        const [examsResult, progResult, statsResult] = await Promise.allSettled([
          hierarchyAPI.getExams(),
          analyticsAPI.getProgress(),
          analyticsAPI.getDashboardStats()
        ]);

        if (examsResult.status === "fulfilled" && examsResult.value?.length > 0) {
          const sscExam = examsResult.value.find(
            (e) => e.name?.toLowerCase().includes("ssc") || e.code?.toLowerCase().includes("ssc")
          ) || examsResult.value[0];
          if (sscExam?.exam_date) {
            setExamDate(sscExam.exam_date);
          }
        }

        if (statsResult.status === "fulfilled" && statsResult.value?.syllabus_completion_percent !== undefined) {
          setProgress(Math.round(statsResult.value.syllabus_completion_percent));
        } else if (progResult.status === "fulfilled" && progResult.value?.length > 0) {
          const totalProgress = progResult.value.reduce((acc, curr) => acc + (curr.progress || 0), 0);
          setProgress(Math.round(totalProgress / progResult.value.length));
        }
      } catch (error) {
        console.error("Could not load exam data:", error);
      }
    }
    fetchExamData();
  }, []);

  useEffect(() => {
    if (!examDate) return;

    function calculateDays() {
      const today = new Date();
      const exam = new Date(examDate);
      const difference = exam.getTime() - today.getTime();

      setDaysLeft(
        Math.max(
          Math.ceil(difference / (1000 * 60 * 60 * 24)),
          0
        )
      );
    }

    calculateDays();
    const interval = setInterval(calculateDays, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [examDate]);

  return (
    <div className="exam-card">
      <div className="exam-icon">
        <Clock3 size={22} />
      </div>

      <div className="exam-body">
        <span className="exam-label">SSC JE 2026</span>
        {daysLeft === null ? (
          <strong className="exam-value">Loading…</strong>
        ) : (
          <strong className="exam-value">
            {daysLeft}
            <em>days left</em>
          </strong>
        )}
        <div className="exam-progress-wrap">
            <div className="exam-progress-bar">
                <div className="exam-progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="exam-progress-text">Your preparation {progress}%</span>
        </div>
      </div>
    </div>
  );
}
