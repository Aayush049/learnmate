import { useState, useMemo, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  ChevronRight,
  BookOpen,
  CircleDashed,
  CheckCircle2,
  PlayCircle,
  Layers,
  Compass,
  Filter,
  Lightbulb,
  ArrowRight,
  Check,
  ChevronDown
} from "lucide-react";
import { syllabusData } from "../../data/syllabusData";
import { hierarchyAPI } from "../../../api/hierarchy";
import { analyticsAPI } from "../../../api/analytics";

export default function Topics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("unit-01");
  const [selectedTopicTitle, setSelectedTopicTitle] = useState("");
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

        const topicsMap = {};
        data.forEach(subject => {
          subject.chapters?.forEach(chapter => {
            chapter.topics?.forEach(topic => {
              let normalizedName = topic.name.trim().toLowerCase();
              if (normalizedName.endsWith(" concepts")) {
                normalizedName = normalizedName.replace(" concepts", "").trim();
              }
              normalizedName = normalizedName.replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
              topicsMap[normalizedName] = topic.id;
            });
          });
        });
        setBackendTopics(topicsMap);

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

  const getTopicProgressData = (topicTitle, fallbackProgress = 0) => {
    let normName = topicTitle.trim().toLowerCase();
    normName = normName.replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

    const tId = backendTopics[normName];
    const backendProg = (tId && topicProgress[tId] !== undefined) ? topicProgress[tId] : 0;
    const prog = backendProg > 0 ? backendProg : (fallbackProgress || 0);

    let state = "Not Started";
    if (prog === 100) state = "Completed";
    else if (prog > 0) state = "In Progress";

    return { id: tId || null, state, value: prog };
  };

  // 2. Process units and topics from syllabusData
  const processedUnits = useMemo(() => {
    return syllabusData.map(unit => {
      let totalTopics = 0;
      let completedCount = 0;

      const processedSections = unit.sections?.map(section => {
        const processedTopics = section.topics?.map(topic => {
          totalTopics++;
          const pData = getTopicProgressData(topic.title, topic.progress || 0);
          if (pData.state === "Completed") completedCount += 1;
          else if (pData.state === "In Progress") completedCount += 0.5;

          return {
            ...topic,
            unitId: unit.id,
            unitNumber: unit.unitNumber,
            unitTitle: unit.title,
            sectionType: section.type === "core" ? "Core" : section.type === "advanced" ? "Advanced" : "General",
            backendId: pData.id,
            progressState: pData.state,
            progressValue: pData.value
          };
        }) || [];

        return {
          ...section,
          topics: processedTopics
        };
      }) || [];

      const progressPercent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

      return {
        ...unit,
        totalTopics,
        completedCount,
        progressPercent,
        sections: processedSections
      };
    });
  }, [backendTopics, topicProgress]);

  // Overall statistics across all topics
  const overallStats = useMemo(() => {
    let totalTopics = 0;
    let completedCount = 0;

    processedUnits.forEach(unit => {
      unit.sections?.forEach(sec => {
        sec.topics?.forEach(t => {
          totalTopics++;
          if (t.progressState === "Completed") completedCount += 1;
          else if (t.progressState === "In Progress") completedCount += 0.5;
        });
      });
    });

    const percentage = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
    return {
      totalTopics,
      completedCount: Math.floor(completedCount),
      percentage
    };
  }, [processedUnits]);

  // Currently active unit
  const activeUnit = useMemo(() => {
    return processedUnits.find(u => u.id === selectedUnitId) || processedUnits[0] || null;
  }, [processedUnits, selectedUnitId]);

  // Filtered topics for the active unit based on level, progress state, and search query
  const activeUnitTopics = useMemo(() => {
    if (!activeUnit) return [];

    let topics = [];
    activeUnit.sections?.forEach(sec => {
      sec.topics?.forEach(t => {
        topics.push(t);
      });
    });

    if (levelFilter !== "All") {
      topics = topics.filter(t => t.sectionType === levelFilter);
    }
    if (progressFilter !== "All") {
      topics = topics.filter(t => t.progressState === progressFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      topics = topics.filter(t => t.title.toLowerCase().includes(q));
    }

    return topics;
  }, [activeUnit, levelFilter, progressFilter, searchQuery]);

  // Set default selected topic title when unit changes or when list updates
  useEffect(() => {
    if (activeUnitTopics.length > 0) {
      if (!activeUnitTopics.some(t => t.title === selectedTopicTitle)) {
        setSelectedTopicTitle(activeUnitTopics[0].title);
      }
    } else {
      setSelectedTopicTitle("");
    }
  }, [activeUnitTopics, selectedTopicTitle]);

  // Currently selected topic
  const selectedTopic = useMemo(() => {
    if (!activeUnitTopics.length) return null;
    return activeUnitTopics.find(t => t.title === selectedTopicTitle) || activeUnitTopics[0];
  }, [activeUnitTopics, selectedTopicTitle]);

  // Generated subtopics for selected topic (dynamically calculated based on topic progress)
  const selectedTopicSubtopics = useMemo(() => {
    if (!selectedTopic) return [];

    const prog = selectedTopic.progressValue || 0;

    const baseConcepts = [
      { name: `Fundamentals & Core Concepts`, type: "Theory" },
      { name: `IS Codes & Standard Specifications`, type: "Theory" },
      { name: `Key Properties & Material Behavior`, type: "Theory" },
      { name: `Laboratory & Field Testing Methods`, type: "Practice" },
      { name: `Design Calculations & Formulae`, type: "Practice" },
      { name: `SSC JE Previous Year Questions`, type: "Practice" }
    ];

    return baseConcepts.map((item, index) => {
      const threshold = (index + 1) * (100 / baseConcepts.length);
      const isCompleted = prog >= threshold;
      const isInProgress = !isCompleted && prog > (index * (100 / baseConcepts.length));

      return {
        id: index + 1,
        name: `${selectedTopic.title}: ${item.name}`,
        type: item.type,
        status: isCompleted ? "Completed" : isInProgress ? "In Progress" : "Not Started"
      };
    });
  }, [selectedTopic]);

  if (loading) {
    return (
      <div className="page max-w-6xl mx-auto px-4 py-12 flex justify-center">
        <div className="animate-pulse text-[var(--text-muted)] font-medium">Loading workspace topics...</div>
      </div>
    );
  }

  return (
    <div className="page max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6">

      {/* 1. TOP HEADER WITH OVERALL PROGRESS & CIVIL LINE-ART */}
      <div className="relative overflow-hidden bg-[var(--surface-color)] bg-[var(--card-gradient)] rounded-2xl border border-[var(--border-color)] p-5 md:p-6 shadow-xs">
        {/* Civil Engineering Structural Blueprint Line-Art SVG Graphic Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none flex items-center justify-end pr-4">
          <svg width="320" height="160" viewBox="0 0 320 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--primary-color)] stroke-current">
            <path d="M10 140H310M40 140V30L130 10L220 30V140M40 70H220M40 105H220M130 10V140M170 30V140M80 30V140" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M240 140L270 70L300 140M255 105H285" strokeWidth="2" />
            <circle cx="130" cy="10" r="4" fill="currentColor" />
            <circle cx="40" cy="30" r="3" fill="currentColor" />
            <circle cx="220" cy="30" r="3" fill="currentColor" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Header Title */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--primary-color)] bg-[var(--primary-light)] px-2.5 py-0.5 rounded-md border border-[var(--primary-color)]/20">
                SSC JE CIVIL
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1">
                <Compass size={13} className="text-[var(--primary-color)]" /> Workspace View
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              Topics
            </h1>
            <p className="text-[var(--text-muted)] text-sm md:text-base mt-0.5">
              Your Civil Engineering learning workspace
            </p>
          </div>

          {/* Overall Progress Card */}
          <div className="flex items-center gap-4 bg-[var(--bg-color)]/70 backdrop-blur-xs p-3.5 rounded-xl border border-[var(--border-color)]">
            {/* Circular SVG Ring */}
            <div className="relative shrink-0 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="25"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="transparent"
                  className="text-[var(--sidebar-bg)]"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="25"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 25}
                  strokeDashoffset={2 * Math.PI * 25 * (1 - overallStats.percentage / 100)}
                  strokeLinecap="round"
                  className="text-[var(--primary-color)] transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-black text-[var(--text-main)] leading-none">
                  {overallStats.percentage}%
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="min-w-[140px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[var(--text-main)]">Syllabus Progress</span>
                <span className="text-[11px] font-black text-[var(--primary-color)]">
                  {overallStats.completedCount}/{overallStats.totalTopics}
                </span>
              </div>
              <div className="w-full bg-[var(--sidebar-bg)] rounded-full h-2 overflow-hidden border border-[var(--border-color)]/40">
                <div
                  className="bg-[var(--primary-color)] h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallStats.percentage}%` }}
                ></div>
              </div>
              <span className="block text-[10px] font-semibold text-[var(--text-muted)] mt-1">
                Topics Mastered
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. HORIZONTAL SUBJECT FILTER ROW (PILL CAROUSEL) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
        <button
          onClick={() => setSelectedUnitId("all")}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all ${
            selectedUnitId === "all"
              ? "bg-[var(--primary-color)] text-white shadow-xs"
              : "bg-[var(--surface-color)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-[var(--primary-color)]/50 hover:text-[var(--text-main)]"
          }`}
        >
          All Subjects ({processedUnits.length})
        </button>

        {processedUnits.map((unit) => {
          const isSelected = selectedUnitId === unit.id;
          return (
            <button
              key={unit.id}
              onClick={() => setSelectedUnitId(unit.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                isSelected
                  ? "bg-[var(--primary-color)] text-white shadow-xs"
                  : "bg-[var(--surface-color)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-[var(--primary-color)]/50 hover:text-[var(--text-main)]"
              }`}
            >
              <span>{unit.title}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? "bg-white/20 text-white" : "bg-[var(--bg-color)] text-[var(--text-muted)]"
              }`}>
                {unit.totalTopics}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[var(--surface-color)] bg-[var(--card-gradient)] p-3 rounded-2xl border border-[var(--border-color)] shadow-xs">
        {/* Search Bar */}
        <div className="relative flex-1 w-full flex items-center">
          <Search className="absolute left-3.5 text-[var(--text-muted)]" size={17} />
          <input
            type="text"
            placeholder="Search topics in workspace..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-color)]/50 border border-[var(--border-color)] rounded-xl focus:outline-none focus:border-[var(--primary-color)] text-sm font-medium text-[var(--text-main)] placeholder-[var(--text-muted)]/60 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] px-2">
            <Filter size={14} className="text-[var(--primary-color)]" />
          </div>

          <select
            className="bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] py-2 px-3 rounded-xl focus:outline-none focus:border-[var(--primary-color)] text-xs font-semibold"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="All">All Levels</option>
            <option value="Core">Core Topics</option>
            <option value="Advanced">Advanced Topics</option>
          </select>

          <select
            className="bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] py-2 px-3 rounded-xl focus:outline-none focus:border-[var(--primary-color)] text-xs font-semibold"
            value={progressFilter}
            onChange={(e) => setProgressFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
            <option value="Not Started">Not Started</option>
          </select>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE CONTENT — TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN (~40%): SUBJECT / TOPIC EXPLORER */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--surface-color)] bg-[var(--card-gradient)] rounded-2xl border border-[var(--border-color)] p-5 shadow-xs">
            {/* Header info for selected subject */}
            <div className="pb-4 mb-4 border-b border-[var(--border-color)]/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary-color)] bg-[var(--primary-light)] px-2.5 py-0.5 rounded-md">
                  {activeUnit ? `UNIT ${String(activeUnit.unitNumber).padStart(2, '0')}` : 'ALL SUBJECTS'}
                </span>
                <span className="text-xs font-bold text-[var(--primary-color)]">
                  {activeUnit ? `${activeUnit.progressPercent}% Completed` : ''}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[var(--text-main)] tracking-tight truncate">
                {activeUnit ? activeUnit.title : "All Workspace Topics"}
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                {activeUnitTopics.length} {activeUnitTopics.length === 1 ? 'topic' : 'topics'} in this section
              </p>
            </div>

            {/* Vertical Topic Progression List */}
            {activeUnitTopics.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
                No topics match your filter.
              </div>
            ) : (
              <div className="relative pl-3 space-y-1">
                {/* Vertical connecting line */}
                <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-[var(--border-color)] pointer-events-none"></div>

                {activeUnitTopics.map((topic, index) => {
                  const isSelected = selectedTopic?.title === topic.title;

                  return (
                    <div
                      key={`${topic.unitId}-${topic.number}-${index}`}
                      onClick={() => setSelectedTopicTitle(topic.title)}
                      className={`relative z-10 p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-[var(--surface-color)] border-[var(--primary-color)] shadow-xs ring-1 ring-[var(--primary-color)]/30"
                          : "bg-[var(--surface-color)]/60 hover:bg-[var(--surface-color)] border-transparent hover:border-[var(--border-color)]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Status Icon Marker */}
                        <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--surface-color)]">
                          {topic.progressState === "Completed" ? (
                            <CheckCircle2 size={20} className="text-emerald-700 dark:text-emerald-400 fill-emerald-500/20" />
                          ) : topic.progressState === "In Progress" ? (
                            <CircleDashed size={20} className="text-amber-700 dark:text-amber-400 animate-spin-slow" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-[var(--border-color)] bg-[var(--bg-color)]"></div>
                          )}
                        </div>

                        {/* Topic Title & Subtitle */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[var(--text-muted)]">
                              {topic.unitNumber ? `${topic.unitNumber}.${topic.number || index + 1}` : `#${topic.number || index + 1}`}
                            </span>
                            <h3 className={`text-xs md:text-sm font-bold truncate transition-colors ${
                              isSelected ? "text-[var(--primary-color)]" : "text-[var(--text-main)]"
                            }`}>
                              {topic.title}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* Right Status Badge */}
                      <div className="shrink-0 flex items-center gap-2">
                        {topic.progressValue > 0 && (
                          <span className="text-[10px] font-bold text-[var(--primary-color)] bg-[var(--primary-light)] px-2 py-0.5 rounded-md">
                            {topic.progressValue}%
                          </span>
                        )}
                        <ChevronRight size={16} className={`transition-transform ${isSelected ? "text-[var(--primary-color)] translate-x-0.5" : "text-[var(--text-muted)]/40"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (~60%): SELECTED TOPIC PANEL */}
        <div className="lg:col-span-7 space-y-4">
          {selectedTopic ? (
            <div className="space-y-4">

              {/* Selected Topic Header Card */}
              <div className="bg-[var(--surface-color)] bg-[var(--card-gradient)] rounded-2xl border border-[var(--border-color)] p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary-color)] bg-[var(--primary-light)] px-2.5 py-0.5 rounded-md">
                        TOPIC {selectedTopic.unitNumber}.{selectedTopic.number} • UNIT {String(selectedTopic.unitNumber).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--bg-color)] text-[var(--text-muted)] border border-[var(--border-color)]">
                        {selectedTopic.sectionType}
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">
                      {selectedTopic.title}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                      {selectedTopic.unitTitle}
                    </p>
                  </div>

                  {/* Percentage Badge */}
                  <div className="shrink-0 text-right">
                    <span className="text-2xl font-black text-[var(--primary-color)]">
                      {selectedTopic.progressValue}%
                    </span>
                    <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      {selectedTopic.progressState}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-[var(--text-muted)]">
                    <span>Topic Progress</span>
                    <span>{selectedTopic.progressValue}% Mastered</span>
                  </div>
                  <div className="w-full bg-[var(--sidebar-bg)] rounded-full h-2.5 overflow-hidden border border-[var(--border-color)]/40">
                    <div
                      className="bg-[var(--primary-color)] h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedTopic.progressValue}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Subtopics Section */}
              <div className="bg-[var(--surface-color)] bg-[var(--card-gradient)] rounded-2xl border border-[var(--border-color)] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]/60">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <BookOpen size={14} className="text-[var(--primary-color)]" /> Subtopics & Concepts
                  </h3>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                    {selectedTopicSubtopics.length} Concepts
                  </span>
                </div>

                {/* Subtopic Rows */}
                <div className="space-y-2 pt-1">
                  {selectedTopicSubtopics.map((subtopic) => (
                    <div
                      key={subtopic.id}
                      onClick={() => selectedTopic.backendId ? navigate(`/learn/topic/${selectedTopic.backendId}`) : null}
                      className="p-3.5 rounded-xl border border-[var(--border-color)]/60 bg-[var(--bg-color)]/30 hover:bg-[var(--surface-color)] hover:border-[var(--primary-color)]/50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Status Icon */}
                        {subtopic.status === "Completed" ? (
                          <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                        ) : subtopic.status === "In Progress" ? (
                          <CircleDashed size={18} className="text-amber-700 dark:text-amber-400 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-[var(--border-color)] shrink-0"></div>
                        )}

                        <span className="text-xs md:text-sm font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-color)] transition-colors truncate">
                          {subtopic.name}
                        </span>
                      </div>

                      {/* Right Badge & Arrow */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          subtopic.type === "Theory"
                            ? "bg-[var(--primary-light)] text-[var(--primary-color)]"
                            : "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                        }`}>
                          {subtopic.type}
                        </span>
                        <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--primary-color)] transform group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Tip Box */}
              <div className="bg-[var(--primary-light)]/40 border border-[var(--primary-color)]/20 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[var(--primary-color)] text-white shrink-0">
                  <Lightbulb size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--primary-color)] uppercase tracking-wider mb-0.5">
                    Study Quick Tip
                  </h4>
                  <p className="text-xs text-[var(--text-main)] font-medium leading-relaxed">
                    Master standard IS specifications for <span className="font-bold">{selectedTopic.title}</span> first before practicing numerical questions to maximize your score in SSC JE.
                  </p>
                </div>
              </div>

              {/* Practice CTA Card */}
              <div className="bg-[var(--surface-color)] bg-[var(--card-gradient)] rounded-2xl border border-[var(--border-color)] p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[var(--primary-light)] text-[var(--primary-color)] flex items-center justify-center shrink-0">
                    <PlayCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[var(--text-main)]">
                      Ready to Practice {selectedTopic.title}?
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium">
                      Test your knowledge with targeted SSC JE questions.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => selectedTopic.backendId ? navigate(`/learn/topic/${selectedTopic.backendId}`) : navigate("/learn/practice")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--primary-color)] hover:opacity-90 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all shrink-0"
                >
                  Start Practice <ArrowRight size={15} />
                </button>
              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-[var(--text-muted)] bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl shadow-xs">
              Select a topic from the left menu to view its details.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
