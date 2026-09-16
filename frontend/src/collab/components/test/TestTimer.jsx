import React, { useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { formatTime } from "./timerUtils.js";

const TestTimer = ({ initialSeconds, running, onExpire, onTick }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const expiredRef = useRef(false);

  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);
  
  useEffect(() => {
    onExpireRef.current = onExpire;
    onTickRef.current = onTick;
  }, [onExpire, onTick]);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 0) return 0;
        const next = Math.max(current - 1, 0);
        
        if (onTickRef.current) {
          onTickRef.current(initialSeconds - next);
        }

        if (next === 0 && !expiredRef.current) {
          expiredRef.current = true;
          if (onExpireRef.current) {
            onExpireRef.current();
          }
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, initialSeconds]); 

  const danger = secondsLeft <= 60;
  const warning = secondsLeft <= 180 && !danger;

  return (
    <div className={`test-timer ${danger ? "danger" : warning ? "warning" : ""}`}>
      <Clock3 size={18} />
      <span>Test time</span>
      <strong>{formatTime(secondsLeft)}</strong>
    </div>
  );
};

export default TestTimer;
