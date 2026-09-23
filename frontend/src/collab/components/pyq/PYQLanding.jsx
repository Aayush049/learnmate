import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, Layers, GraduationCap, Calendar, Clock } from "lucide-react";
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
    let result = meta.papers.filter(p => p.year !== null && p.shift !== null); // Filter out incomplete metadata for strict authentic papers display

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
      <div className="page max-w-6xl mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse text-gray-500 font-medium">Loading previous year question sets...</div>
      </div>
    );
  }

  const hasActiveFilters = searchQuery.trim() || yearFilter !== "All" || shiftFilter !== "All";

  return (
    <div className="page max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Previous Year Questions</h1>
        <p className="text-gray-600 text-lg">Practice authentic SSC JE Civil questions from previous examinations.</p>
      </div>

      {/* Discovery UI: Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-8">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search PYQs by year or shift..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-medium"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="All">All Years</option>
            {meta.years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-medium"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
          >
            <option value="All">All Shifts</option>
            {meta.shifts.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            {filteredPapers.length} {filteredPapers.length === 1 ? 'Paper' : 'Papers'} Found
          </h2>
        </div>

        {filteredPapers.length === 0 ? (
           <div className="py-16 text-center bg-white border border-gray-100 rounded-xl">
             <Layers className="mx-auto text-gray-300 mb-3" size={48} />
             <h3 className="text-lg font-semibold text-gray-800">
                {hasActiveFilters ? "No PYQs found" : "No previous-year papers available yet."}
             </h3>
             <p className="text-gray-500 mt-1 mb-4">
                {hasActiveFilters
                  ? "Try changing or clearing your filters."
                  : "We're currently preparing the PYQ collection."}
             </p>
             {hasActiveFilters && (
               <button
                  onClick={() => {
                    setSearchQuery("");
                    setYearFilter("All");
                    setShiftFilter("All");
                  }}
                  className="text-blue-600 font-semibold bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition"
                >
                 Clear Filters
               </button>
             )}
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPapers.map((paper, idx) => (
              <div key={`${paper.year}-${paper.shift}-${idx}`} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col">
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      SSC JE Civil
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      PYQ
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{paper.year}</h3>
                  <div className="flex gap-4 text-sm text-gray-600 font-medium">
                     <div className="flex items-center gap-1">
                        <GraduationCap size={16} className="text-gray-400" />
                        <span>Paper 1</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <Clock size={16} className="text-gray-400" />
                        <span>{paper.shift}</span>
                     </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 mb-4">
                    <span className="text-sm font-semibold text-gray-700">{paper.count} Questions</span>
                </div>

                <div className="mt-auto flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/learn/practice?is_pyq=true&year=${paper.year}&shift=${encodeURIComponent(paper.shift)}`)}
                    className="flex w-full items-center justify-center gap-1 bg-gray-900 text-white px-4 py-2 text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    Practice Paper <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
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
