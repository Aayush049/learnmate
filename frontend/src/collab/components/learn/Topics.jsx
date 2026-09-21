import { useState, useMemo, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Search, ChevronRight, BookOpen, CircleDashed, CheckCircle2, PlayCircle, Layers } from "lucide-react";
import { syllabusData } from "../../data/syllabusData";
import { hierarchyAPI } from "../../../api/hierarchy";
import { analyticsAPI } from "../../../api/analytics";

export default function Topics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [progressFilter, setProgressFilter] = useState("All");

  const [backendTopics, setBackendTopics] = useState({});
  const [topicProgress, setTopicProgress] = useState({});
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // 1. Fetch backend map and progress to align with syllabusData.js (Single Source of Truth)
  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [data, progressData] = await Promise.all([
          hierarchyAPI.getSubjects(),
          analyticsAPI.getTopicProgress()
        ]);

        // Map string names to DB IDs for routing
        const topicsMap = {};
        data.forEach(subject => {
          subject.chapters?.forEach(chapter => {
            chapter.topics?.forEach(topic => {
              const normalizedName = topic.name.trim().toLowerCase();
              topicsMap[normalizedName] = topic.id;
            });
          });
        });
        setBackendTopics(topicsMap);

        // Map DB IDs to progress
        const pDict = {};
        progressData.forEach(p => {
          pDict[p.topic_id] = p.progress;
        });
        setTopicProgress(pDict);
      } catch (error) {
        console.error("Failed to load topic dependencies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDependencies();
  }, []);

  const getTopicProgressData = (topicTitle) => {
    const normName = topicTitle.trim().toLowerCase();
    const tId = backendTopics[normName];
    if (!tId) return { id: null, state: "Not Started", value: 0 };

    const prog = topicProgress[tId] || 0;
    let state = "Not Started";
    if (prog === 100) state = "Completed";
    else if (prog > 0) state = "In Progress";

    return { id: tId, state, value: prog };
  };

  // 2. Compute flat list from syllabusData
  const allTopicsFlat = useMemo(() => {
    const flat = [];
    syllabusData.forEach(unit => {
      unit.sections?.forEach(section => {
        section.topics?.forEach(topic => {
          const pData = getTopicProgressData(topic.title);
          flat.push({
            ...topic,
            unitId: unit.id,
            unitNumber: unit.unitNumber,
            unitTitle: unit.title,
            sectionType: section.type === "core" ? "Core" : section.type === "advanced" ? "Advanced" : "General",
            backendId: pData.id,
            progressState: pData.state,
            progressValue: pData.value
          });
        });
      });
    });
    return flat;
  }, [backendTopics, topicProgress]);

  // 3. Filter applied to the flat list
  const filteredTopics = useMemo(() => {
    let result = allTopicsFlat;

    // A. Text Search (Topic name or Unit title)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.unitTitle.toLowerCase().includes(q)
      );
    }

    // B. Unit Filter
    if (unitFilter !== "All") {
      result = result.filter(t => t.unitId === unitFilter);
    }

    // C. Level Filter (Core/Advanced)
    if (levelFilter !== "All") {
      result = result.filter(t => t.sectionType === levelFilter);
    }

    // D. Progress Filter
    if (progressFilter !== "All") {
      result = result.filter(t => t.progressState === progressFilter);
    }

    return result;
  }, [allTopicsFlat, searchQuery, unitFilter, levelFilter, progressFilter]);

  // Determine unique units for the dropdown quickly
  const availableUnits = syllabusData.filter(u => u.sections && u.sections.length > 0);

  if (loading) {
    return (
      <div className="page max-w-6xl mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse text-gray-500 font-medium">Loading topics...</div>
      </div>
    );
  }

  return (
    <div className="page max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Topics</h1>
        <p className="text-gray-600 text-lg">Explore SSC JE Civil topics and start studying or practicing.</p>
      </div>

      {/* Discovery UI: Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-8">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search topics or units (e.g. 'Soil Mechanics', 'Cement')..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-medium"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
          >
            <option value="All">All Units</option>
            {availableUnits.map(u => (
              <option key={u.id} value={u.id}>Unit {u.unitNumber}: {u.title}</option>
            ))}
          </select>

          <select
            className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-medium"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="All">All Levels</option>
            <option value="Core">Core Topics</option>
            <option value="Advanced">Advanced Topics</option>
            <option value="General">General Topics</option>
          </select>

          <select
            className="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-medium"
            value={progressFilter}
            onChange={(e) => setProgressFilter(e.target.value)}
          >
            <option value="All">All Progress States</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            {filteredTopics.length} {filteredTopics.length === 1 ? 'Topic' : 'Topics'} Found
          </h2>
        </div>

        {filteredTopics.length === 0 ? (
           <div className="py-16 text-center bg-white border border-gray-100 rounded-xl">
             <Layers className="mx-auto text-gray-300 mb-3" size={48} />
             <h3 className="text-lg font-semibold text-gray-800">No topics found</h3>
             <p className="text-gray-500 mt-1 mb-4">Try a different search term or remove some filters.</p>
             <button
                onClick={() => {
                  setSearchQuery("");
                  setUnitFilter("All");
                  setLevelFilter("All");
                  setProgressFilter("All");
                }}
                className="text-blue-600 font-semibold bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition"
              >
               Clear Filters
             </button>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((topic, idx) => (
              <div key={`${topic.unitId}-${topic.number}-${idx}`} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col">
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      UNIT {topic.unitNumber}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      topic.sectionType === 'Core' ? 'bg-blue-50 text-blue-700' :
                      topic.sectionType === 'Advanced' ? 'bg-purple-50 text-purple-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {topic.sectionType}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{topic.title}</h3>
                  <p className="text-sm text-gray-500 font-medium truncate">{topic.unitTitle}</p>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                  <div className="flex items-center gap-1.5">
                    {topic.progressState === "Completed" && <><CheckCircle2 size={16} className="text-green-500"/><span className="text-xs font-semibold text-gray-700">100%</span></>}
                    {topic.progressState === "In Progress" && <><CircleDashed size={16} className="text-orange-500"/><span className="text-xs font-semibold text-gray-700">{topic.progressValue}%</span></>}
                    {topic.progressState === "Not Started" && <><CircleDashed size={16} className="text-gray-300"/><span className="text-xs font-semibold text-gray-500">0%</span></>}
                  </div>

                  {topic.backendId ? (
                    <button
                      onClick={() => navigate(`/learn/topic/${topic.backendId}`)}
                      className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors group"
                    >
                      Open <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded">Coming Soon</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
