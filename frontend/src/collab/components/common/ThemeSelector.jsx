import React, { useState, useEffect } from "react";
import { Palette } from "lucide-react";

export const THEMES = [
  { id: "warm-botanical", name: "Warm Botanical (Default)", color: "#0B6E67" },
  { id: "ocean-slate", name: "Ocean Slate (Blue)", color: "#1E40AF" },
  { id: "nordic-sage", name: "Nordic Sage (Green)", color: "#2D5A47" },
  { id: "royal-indigo", name: "Royal Indigo (Purple)", color: "#4F46E5" },
  { id: "warm-amber", name: "Warm Amber (Amber)", color: "#C25E00" },
  { id: "midnight-dark", name: "Midnight Dark (Dark)", color: "#38BDF8" },
  { id: "rose-blush", name: "Rose Blush (Pink)", color: "#C44569" }
];

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("app-theme") || "warm-botanical";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
    localStorage.setItem("app-theme", currentTheme);
  }, [currentTheme]);

  return (
    <div className="flex items-center gap-1.5 bg-[var(--surface-color)] border border-[var(--border-color)] px-3 py-1.5 rounded-xl shadow-sm text-xs font-semibold text-[var(--text-main)]">
      <Palette size={15} className="text-[var(--primary-color)]" />
      <span className="hidden sm:inline text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-1">
        Theme:
      </span>
      <select
        value={currentTheme}
        onChange={(e) => setCurrentTheme(e.target.value)}
        className="bg-transparent border-none text-xs font-bold text-[var(--primary-color)] focus:outline-none cursor-pointer pr-1"
        title="Select color scheme to preview"
      >
        {THEMES.map((theme) => (
          <option key={theme.id} value={theme.id} className="text-[var(--text-main)] bg-[var(--surface-color)] font-medium">
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );
}
