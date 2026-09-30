import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, Layers, FileText, Clock, Filter, History } from "lucide-react";
import { questionsAPI } from "../../../api/questions";

export default function PYQLanding() {
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");

  const [meta, setMeta] = useState({ years: [], shifts: [], papers: [] });
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const data = await questionsAPI.getPYQMetadata();
        setMeta(data);
      } catch (error) {
        console.error("Failed to load PYQ metadata:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMeta();
  }, []);

  // Filter applied to the flat list of authentic papers
  const filteredPapers = useMemo(() => {
    let result = meta.papers.filter(p => p.year !== null && p.shift !== null); // Filter out incomplete metadata

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.year?.toString().includes(q)) ||
        (p.shift?.toLowerCase().includes(q)) ||
        ("ssc je civil".includes(q)) ||
        ("paper 1".includes(q)) ||
        ("pyq".includes(q))
      );
    }

    if (yearFilter !== "All") {
      result = result.filter(p => p.year?.toString() === yearFilter.toString());
    }

    if (shiftFilter !== "All") {
      result = result.filter(p => p.shift === shiftFilter);
    }

    return result;
  }, [meta.papers, searchQuery, yearFilter, shiftFilter]);

  if (loading) {
    return (
      <div className="page max-w-6xl mx-auto px-4 py-8">
        <div className="h-40 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl animate-pulse mb-8" />
        <div className="h-20 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-48 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hasActiveFilters = searchQuery.trim() || yearFilter !== "All" || shiftFilter !== "All";

  return (
    <div className="page max-w-6xl mx-auto px-4 py-8">
      {/* Previous Year Question Archive Header */}
      <div className="mb-8 p-6 md:p-8 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl shadow-xs relative overflow-hidden">
        {/* Decorative Radial Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[var(--primary-color)]/10 to-transparent pointer-events-none rounded-bl-full" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-[var(--primary-light)] text-[var(--primary-color)] rounded-full border border-[var(--primary-color)]/20 flex items-center gap-1.5">
                <FileText size={13} /> EXAM ARCHIVE
              </span>
              <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-[var(--bg-color)] text-[var(--text-muted)] rounded-md border border-[var(--border-color)]">
                SSC JE CIVIL
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-main)] tracking-tight mb-2">
              Previous Year Questions
            </h1>
            <p className="text-base text-[var(--text-muted)] max-w-2xl font-medium">
              Practice authentic previous-year exam papers with full solution breakdowns and timing analysis.
            </p>
          </div>

          {/* Archive Status Pill */}
          <div className="flex items-center gap-4 bg-[var(--bg-color)] border border-[var(--border-color)] p-3 px-5 rounded-xl self-start md:self-auto shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary-light)] text-[var(--primary-color)] flex items-center justify-center shrink-0">
              <History size={20} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Archive Collection</div>
              <div className="text-lg font-extrabold text-[var(--text-main)]">
                {meta.papers?.length || 0} Official Papers
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search and Filter Controls */}
      <div className="bg-[var(--surface-color)] rounded-2xl border border-[var(--border-color)] shadow-xs p-4 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={18} />
            <input
              type="text"
              placeholder="Search by year (e.g. 2024), shift, or paper..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all font-medium text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]/70"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative min-w-[140px] flex-1 md:flex-none">
              <select
                className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3.5 pr-8 rounded-xl focus:outline-none focus:border-[var(--primary-color)] text-sm font-semibold cursor-pointer transition-colors appearance-none"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="All">All Years ({meta.years.length})</option>
                {meta.years.map(y => (
                  <option key={y} value={y}>{y} Papers</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                <Filter size={14} />
              </div>
            </div>

            <div className="relative min-w-[140px] flex-1 md:flex-none">
              <select
                className="w-full bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3.5 pr-8 rounded-xl focus:outline-none focus:border-[var(--primary-color)] text-sm font-semibold cursor-pointer transition-colors appearance-none"
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
              >
                <option value="All">All Shifts ({meta.shifts.length})</option>
                {meta.shifts.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                <Clock size={14} />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setYearFilter("All");
                  setShiftFilter("All");
                }}
                className="px-3.5 py-2.5 text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-light)] hover:opacity-90 rounded-xl transition-all whitespace-nowrap border border-[var(--primary-color)]/20"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Header & Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--primary-color)]"></span>
            <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {filteredPapers.length} {filteredPapers.length === 1 ? 'Authentic Paper' : 'Authentic Papers'} Found
            </h2>
          </div>
        </div>

        {filteredPapers.length === 0 ? (
          <div className="py-16 text-center bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--primary-light)] text-[var(--primary-color)] flex items-center justify-center">
              <Layers size={32} />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">
              {hasActiveFilters ? "No matching PYQ papers found" : "No previous-year papers available yet."}
            </h3>
            <p className="text-sm font-medium text-[var(--text-muted)] max-w-md mx-auto mb-6">
              {hasActiveFilters
                ? "Try broadening your search or resetting year and shift filters."
                : "We are currently compiling and verifying authentic exam papers."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setYearFilter("All");
                  setShiftFilter("All");
                }}
                className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-color)] bg-[var(--primary-light)] px-5 py-2.5 rounded-xl hover:opacity-90 transition-all border border-[var(--primary-color)]/20"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPapers.map((paper, idx) => (
              <div
                key={`${paper.year}-${paper.shift}-${idx}`}
                className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-[var(--primary-color)]/40 hover:shadow-md transition-all duration-200 flex flex-col relative overflow-hidden group"
              >
                {/* Subtle top corner gradient tint */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[var(--primary-color)]/10 to-transparent pointer-events-none transition-opacity duration-200" />

                {/* Card Content */}
                <div className="relative z-10 flex flex-col h-full">
                  {/* Document / Year Visual Stamp Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Year Stamp Badge */}
                      <div className="w-14 h-14 rounded-xl bg-[var(--primary-light)] border border-[var(--primary-color)]/20 flex flex-col items-center justify-center shrink-0 group-hover:border-[var(--primary-color)]/40 transition-colors">
                        <span className="text-[10px] font-extrabold uppercase text-[var(--primary-color)] tracking-tighter leading-none mb-0.5">YEAR</span>
                        <span className="text-xl font-black text-[var(--primary-color)] tracking-tight leading-none">{paper.year}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-color)] text-[var(--text-main)] border border-[var(--border-color)]">
                            SSC JE CIVIL
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--primary-light)] text-[var(--primary-color)]">
                            PYQ
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-[var(--text-main)] leading-tight">
                          Paper 1 &bull; {paper.shift}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Paper Info Block */}
                  <div className="mt-auto py-3 px-3.5 bg-[var(--bg-color)] border border-[var(--border-color)] rounded-xl flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] mb-4">
                    <div className="flex items-center gap-1.5 text-[var(--text-main)] font-bold">
                      <FileText size={15} className="text-[var(--primary-color)]" />
                      <span>{paper.count} Questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>Official Shift</span>
                    </div>
                  </div>

                  {/* CTA Action Button */}
                  <button
                    onClick={() => navigate(`/learn/practice?is_pyq=true&year=${paper.year}&shift=${encodeURIComponent(paper.shift)}`)}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--primary-color)] text-white px-4 py-2.5 text-sm font-bold rounded-xl hover:brightness-110 active:scale-[0.99] transition-all shadow-xs group/btn"
                  >
                    <span>Practice Paper</span>
                    <ChevronRight size={16} className="transform group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
