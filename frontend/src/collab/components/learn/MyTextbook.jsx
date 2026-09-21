import { useState, useMemo, useEffect } from "react";
import { Search, ChevronDown, ChevronUp, ChevronRight, CheckCircle2, CircleDashed, PlayCircle } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import PageIntro from "../common/PageIntro";
import { syllabusData } from "../../data/syllabusData";
import { hierarchyAPI } from "../../../api/hierarchy";
import { analyticsAPI } from "../../../api/analytics";

export default function MyTextbook() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [expandedUnits, setExpandedUnits] = useState({});
  const [topicProgress, setTopicProgress] = useState({});
  const [backendTopics, setBackendTopics] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [data, progressData] = await Promise.all([
          hierarchyAPI.getSubjects(),
          analyticsAPI.getTopicProgress()
        ]);

        // Map backend topic IDs based on string matching to support routing
        const topicsMap = {};
        data.forEach(subject => {
          subject.chapters?.forEach(chapter => {
            chapter.topics?.forEach(topic => {
              // Normalize name to map correctly
              const normalizedName = topic.name.trim().toLowerCase();
              topicsMap[normalizedName] = topic.id;
            });
          });
        });
        setBackendTopics(topicsMap);

        // Map topic progress using topic IDs
        const pDict = {};
        progressData.forEach(p => {
          pDict[p.topic_id] = p.progress;
        });
        setTopicProgress(pDict);
      } catch (error) {
        console.error("Failed to load progress:", error);
      }
    };
    fetchDependencies();
  }, []);

  const getTopicState = (topicName) => {
    const normName = topicName.trim().toLowerCase();
    const tId = backendTopics[normName];
    if (tId) {
      const prog = topicProgress[tId] || 0;
      if (prog === 100) return 'Completed';
      if (prog > 0) return 'In Progress';
      return 'Not Started';
    }
    return 'Not Started'; // fallback
  };

  const getTopicId = (topicName) => {
    const normName = topicName.trim().toLowerCase();
    return backendTopics[normName] || null;
  };

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const filteredData = useMemo(() => {
    return syllabusData.map(unit => {
      let matchesSearch = unit.title.toLowerCase().includes(searchQuery.toLowerCase());

      const filteredSections = unit.sections
        .map(section => {
          // If filter is Core, only show core. If filter is Advanced, only show advanced.
          if (filter === "Core" && section.type !== "core") return null;
          if (filter === "Advanced" && section.type !== "advanced") return null;

          const filteredTopics = section.topics.filter(topic => {
            const matchesTopicSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch || matchesTopicSearch;
          });

          if (filteredTopics.length > 0) {
            matchesSearch = true;
            return {
              ...section,
              topics: filteredTopics
            };
          }
          return null;
        })
        .filter(Boolean);

      if (!matchesSearch) return null;

      // Calculate unit progress
      let totalTopics = 0;
      let completedTopics = 0;
      unit.sections.forEach(sec => {
        sec.topics.forEach(t => {
          totalTopics++;
          if (getTopicState(t.title) === 'Completed') {
            completedTopics++;
          } else if (getTopicState(t.title) === 'In Progress') {
            completedTopics += 0.5;
          }
        });
      });
      const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      return {
        ...unit,
        sections: filteredSections,
        totalTopics,
        progressPercent
      };
    }).filter(Boolean);
  }, [searchQuery, filter, backendTopics, topicProgress]);

  // Expand all matching units when searching
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const allIds = {};
      filteredData.forEach(u => allIds[u.id] = true);
      setExpandedUnits(allIds);
    }
  }, [searchQuery]);

  const totalSyllabusTopics = syllabusData.reduce((acc, unit) => {
    unit.sections.forEach(sec => { acc += sec.topics.length; });
    return acc;
  }, 0);

  return (
    <div className="page max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Civil Engineering Syllabus</h1>
        <p className="text-gray-600 text-lg">Complete SSC JE Civil Engineering syllabus — organized unit by unit for structured preparation.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-3xl font-black text-blue-600">{syllabusData.length}</span>
          <span className="text-gray-500 font-medium mt-1">Units</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-3xl font-black text-indigo-600">{totalSyllabusTopics}+</span>
          <span className="text-gray-500 font-medium mt-1">Topics</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xl font-bold text-gray-800">Core + Advanced</span>
          <span className="text-gray-500 font-medium mt-1 tracking-tight">Structured Coverage</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-between items-center bg-white p-2 rounded-lg border border-gray-200">
        <div className="relative flex-1 w-full flex items-center">
          <Search className="absolute left-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search topics or units..."
            className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:outline-none text-gray-700 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 p-1 bg-gray-50 rounded-md shrink-0">
          {["All", "Core", "Advanced"].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors ${filter === tab ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-white border border-gray-100 rounded-xl">
            No units or topics match your search.
          </div>
        ) : (
          filteredData.map(unit => (
            <div key={unit.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200">
              <div
                className="p-5 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                onClick={() => toggleUnit(unit.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      UNIT {unit.unitNumber}
                    </span>
                    {unit.pageRange && (
                       <span className="text-xs text-gray-400 font-medium">Pages {unit.pageRange}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{unit.title}</h3>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-sm font-medium text-gray-500">
                      {unit.topicsAvailable === false ? '0 Topics' : `${unit.totalTopics} Topics`}
                    </span>
                    {unit.totalTopics > 0 && (
                      <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${unit.progressPercent}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{unit.progressPercent}%</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 ml-4 flex flex-col items-end gap-2">
                  <button className="flex items-center gap-1 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition">
                    {expandedUnits[unit.id] ? (
                      <>Collapse <ChevronUp size={16} /></>
                    ) : (
                      <>View Topics <ChevronDown size={16} /></>
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedUnits[unit.id] && (
                <div className="bg-gray-50 border-t border-gray-100 p-5">
                  {unit.topicsAvailable === false ? (
                    <div className="text-center py-6 text-gray-500 text-sm italic">
                      Topics will be added soon.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {unit.sections.map((section, idx) => (
                        <div key={idx}>
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                            {section.title}
                            <hr className="flex-1 border-gray-200" />
                          </h4>
                          <div className="space-y-2">
                            {section.topics.map(topic => {
                              const tId = getTopicId(topic.title);
                              const state = getTopicState(topic.title);
                              return (
                                <div
                                  key={topic.number}
                                  onClick={() => tId ? navigate(`/learn/topic/${tId}`) : null}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition ${
                                    tId ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer group' : 'bg-white/50 border-gray-100 opacity-70'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-500 text-xs font-bold rounded">
                                      {topic.number}
                                    </span>
                                    <span className={`font-semibold ${tId ? 'text-gray-800 group-hover:text-blue-700' : 'text-gray-600'}`}>
                                      {topic.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {state === "Completed" && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 size={14}/> Completed</span>}
                                    {state === "In Progress" && <span className="flex items-center gap-1 text-xs text-orange-500 font-medium"><CircleDashed size={14}/> In Progress</span>}
                                    {state === "Not Started" && <span className="flex items-center gap-1 text-xs text-gray-400 font-medium"><CircleDashed size={14}/> Not Started</span>}

                                    {tId && (
                                      <div className="text-blue-500 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all">
                                        <ChevronRight size={18} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
