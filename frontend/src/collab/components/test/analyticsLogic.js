function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildTopicAnalytics(questionStats) {
  const grouped = {};

  questionStats.forEach((item) => {
    if (!grouped[item.topic]) {
      grouped[item.topic] = [];
    }

    grouped[item.topic].push(item);
  });

  return Object.entries(grouped).map(([topic, items]) => {
    const attempted = items.filter((item) => item.selectedAnswer !== null);
    const correct = attempted.filter(
      (item) => item.selectedAnswer === item.answer
    );

    const avgTime = average(items.map((item) => item.timeSpent));
    const avgTarget = average(items.map((item) => item.targetTime));
    const accuracy = attempted.length
      ? (correct.length / attempted.length) * 100
      : 0;

    const speedRatio = avgTarget > 0 ? avgTime / avgTarget : 1;

    let status = "Developing";
    let reason = "Keep practicing this topic.";

    // Important:
    // Fast + wrong is NOT considered strong.
    // Strength requires both accuracy and reasonable speed.
    if (accuracy >= 75 && speedRatio <= 1.15) {
      status = "Strong";
      reason = "Good accuracy with efficient solving time.";
    } else if (accuracy >= 75 && speedRatio > 1.15) {
      status = "Accurate but slow";
      reason = "You understand the topic, but need faster recall or calculation.";
    } else if (accuracy < 60 && speedRatio > 1.15) {
      status = "Weak";
      reason = "Low accuracy and high time indicate a concept/revision gap.";
    } else if (accuracy < 60) {
      status = "Needs revision";
      reason = "Accuracy is currently below your target.";
    } else if (speedRatio > 1.25) {
      status = "Slow";
      reason = "Accuracy is acceptable, but this topic is consuming too much time.";
    }

    return {
      topic,
      attempted: attempted.length,
      total: items.length,
      correct: correct.length,
      accuracy: Math.round(accuracy),
      avgTime: Math.round(avgTime),
      avgTarget: Math.round(avgTarget),
      speedRatio: Number(speedRatio.toFixed(2)),
      status,
      reason,
    };
  });
}

export function buildOverallInsights(topicAnalytics) {
  if (!topicAnalytics.length) {
    return {
      strongest: null,
      slowest: null,
      fastest: null,
      weakest: null,
    };
  }

  const strongest = [...topicAnalytics]
    .filter((item) => item.attempted > 0)
    .sort((a, b) => {
      const aScore = a.accuracy - Math.max(0, a.speedRatio - 1) * 25;
      const bScore = b.accuracy - Math.max(0, b.speedRatio - 1) * 25;
      return bScore - aScore;
    })[0];

  const slowest = [...topicAnalytics]
    .sort((a, b) => b.avgTime - a.avgTime)[0];

  const fastest = [...topicAnalytics]
    .sort((a, b) => a.avgTime - b.avgTime)[0];

  const weakest = [...topicAnalytics]
    .sort((a, b) => a.accuracy - b.accuracy)[0];

  return {
    strongest,
    slowest,
    fastest,
    weakest,
  };
}
