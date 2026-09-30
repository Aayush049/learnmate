import { NavLink } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Botanical & geometric line art illustration - decorative watermark
function CivilBlueprintArt() {
  return (
    <svg className="motivational-banner-art" viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        {/* Connected outline geometric boxes */}
        <rect x="140" y="70" width="40" height="40" rx="4" opacity="0.6"/>
        <rect x="170" y="40" width="30" height="30" rx="3" opacity="0.5"/>
        <line x1="160" y1="70" x2="170" y2="55" strokeDasharray="3 3"/>

        {/* Main botanical stem & leaves */}
        <path d="M240 170C200 150 160 110 130 30" strokeWidth="1.5"/>
        <path d="M185 115C205 105 225 110 235 95C220 90 195 100 185 115Z" fill="currentColor" fillOpacity="0.12"/>
        <path d="M155 80C140 65 120 70 110 60C125 55 145 62 155 80Z" fill="currentColor" fillOpacity="0.12"/>

        {/* Stylized blooming bud */}
        <path d="M130 30C125 15 135 5 140 0C145 10 142 22 130 30Z" fill="currentColor" fillOpacity="0.18"/>
        <path d="M130 30C118 22 115 10 120 2C128 8 130 18 130 30Z" fill="currentColor" fillOpacity="0.18"/>

        {/* Trailing botanical leaf stem */}
        <path d="M210 145C170 160 120 165 70 170" strokeWidth="1" strokeDasharray="4 2"/>
        <path d="M120 165C105 155 90 158 80 150C92 146 108 152 120 165Z" fill="currentColor" fillOpacity="0.12"/>
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
