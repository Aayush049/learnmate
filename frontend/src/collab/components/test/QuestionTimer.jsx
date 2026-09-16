import React, { useEffect, useRef } from "react";
import { Timer } from "lucide-react";
import { formatLongTime } from "./timerUtils.js";

const QuestionTimer = ({ elapsedSeconds, onTick, running }) => {
  const onTickRef = useRef(onTick);
  
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      if (onTickRef.current) {
        onTickRef.current();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <div className="question-timer">
      <Timer size={15} />
      <span>Question time</span>
      <strong>{formatLongTime(elapsedSeconds)}</strong>
    </div>
  );
};

export default QuestionTimer;
