import { NavLink } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Civil line art illustration - decorative only
function CivilBlueprintArt() {
  return (
    <svg className="motivational-banner-art" viewBox="0 0 200 100" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3">
        <path d="M10 80h180M30 80V40l40-20 40 20v40M150 80V50h40v30" />
        <circle cx="70" cy="40" r="8" />
        <path d="M70 32v-8M70 48v8M62 40h-8M78 40h8" />
      </g>
    </svg>
  );
}

// Full-width motivational banner
export default function Motivation() {
  return (
    <section className="motivational-banner">
      <div className="motivational-banner-text">
        <h2>Better Preparation.<br />Bigger Dreams.</h2>
        <p>Your SSC JE journey is built one focused session at a time.</p>
        <NavLink to="/track/progress" className="primary-button">
          View My Progress <ArrowRight size={15} />
        </NavLink>
      </div>
      <CivilBlueprintArt />
    </section>
  );
}
