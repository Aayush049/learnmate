import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Bot, Sparkles, ArrowRight } from "lucide-react";
import api from "../../../api/client";

// Same endpoint, same response shape as before. Only the presentation
// changes - the old version used a large gradient panel that dominated
// the layout; this is a compact card that matches the reference.
export default function AIRecommendation() {
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRec() {
      try {
        const res = await api.get("/api/v1/recommendations/");
        setRec(res.data);
      } catch (err) {
        console.error("AI Recommendation error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRec();
  }, []);

  // Subject name, when the backend framed the rec as "Focus on <subject>".
  // Derived from the existing title string - no new data requested.
  const subject = rec?.title?.startsWith("Focus on ") ? rec.title.replace("Focus on ", "") : null;

  return (
    <section className="card ai-card">
      <div className="card-header">
        <div>
          <h3>Today's Focus</h3>
          <p>Recommended from your recent activity</p>
        </div>
        <span className="ai-badge">
          <Sparkles size={12} /> AI Recommended
        </span>
      </div>

      {loading ? (
        <div className="ai-loading">
          <div className="ai-spark">
            <Bot size={17} />
          </div>
          <div className="ai-loading-lines">
            <span />
            <span />
            <span />
          </div>
          <p>Analysing your recent performance…</p>
        </div>
      ) : rec ? (
        <>
          <div className="ai-message">
            <strong>{subject || rec.title}</strong>
            <p>{rec.rationale}</p>
          </div>

          <div className="ai-actions">
            <NavLink to="/learn/ai-tutor" className="primary-button">
              Start Focus Session <ArrowRight size={14} />
            </NavLink>
            <NavLink to="/learn/pyqs" className="text-link">
              {rec.action}
            </NavLink>
          </div>
        </>
      ) : (
        <div className="mini-empty">
          <p>No recommendation available yet.</p>
          <span>Take a mock test so we can analyse your performance.</span>
        </div>
      )}
    </section>
  );
}
