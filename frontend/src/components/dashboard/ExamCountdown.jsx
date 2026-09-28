import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { hierarchyAPI } from "../../api/hierarchy";

export default function ExamCountdown() {
  const [examDate, setExamDate] = useState("2026-12-01");
  const [daysLeft, setDaysLeft] = useState(() => {
    const today = new Date();
    const exam = new Date("2026-12-01");
    const difference = exam.getTime() - today.getTime();
    return Math.max(Math.ceil(difference / (1000 * 60 * 60 * 24)), 0);
  });

  useEffect(() => {
    async function fetchExamDate() {
      try {
        const exams = await hierarchyAPI.getExams();
        if (exams && exams.length > 0) {
          const sscExam = exams.find(
            (e) => e.name?.toLowerCase().includes("ssc") || e.code?.toLowerCase().includes("ssc")
          ) || exams[0];
          if (sscExam?.exam_date) {
            setExamDate(sscExam.exam_date);
          }
        }
      } catch (error) {
        console.error("Could not load exam date:", error);
      }
    }

    fetchExamDate();
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
        <Clock3 size={20} />
      </div>

      <div>
        <span>SSC JE exam countdown</span>
        <strong>
          {daysLeft === null ? "Loading..." : `${daysLeft} days`}
        </strong>
      </div>
    </div>
  );
}
