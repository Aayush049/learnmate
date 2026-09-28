import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import api from "../../../api/client";
import { analyticsAPI } from "../../../api/analytics";

export default function ExamCountdown() {
  const [examDate, setExamDate] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function fetchExamData() {
      try {
        const [examRes, progRes] = await Promise.all([
          api.get("/api/v1/exams/"),
          analyticsAPI.getProgress()
        ]);

        const exams = examRes.data;
        if (exams && exams.length > 0) {
          setExamDate("2026-12-01");
        }

        // Calculate aggregate progress percent
        if (progRes && progRes.length > 0) {
          const totalProgress = progRes.reduce((acc, curr) => acc + curr.progress, 0);
          setProgress(Math.round(totalProgress / progRes.length));
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
