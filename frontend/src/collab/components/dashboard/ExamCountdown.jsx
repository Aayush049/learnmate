import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import api from "../../../api/client";

export default function ExamCountdown() {
  const [examDate, setExamDate] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);

  useEffect(() => {
    async function fetchExamDate() {
      try {
        // Find SSC JE exam
        const response = await api.get("/api/v1/exams/");
        const exams = response.data;
        if (exams && exams.length > 0) {
          // Assuming the latest or matching name
          setExamDate("2026-12-01"); // We will hardcode date since exams might not have date field yet or we can simulate
        }
      } catch (error) {
        console.error("Could not load exam data:", error);
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
