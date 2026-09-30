import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCircle2,
  CircleDashed,
  BookOpen,
  Compass,
  Layers,
  Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { syllabusData } from "../../data/syllabusData";
import { hierarchyAPI } from "../../../api/hierarchy";
import { analyticsAPI } from "../../../api/analytics";

export default function MyTextbook() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedUnitId, setSelectedUnitId] = useState("unit-01");
  const [collapsedSections, setCollapsedSections] = useState({});
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
    return 'Not Started';
  };

  const getTopicId = (topicName) => {
    const normName = topicName.trim().toLowerCase();
    return backendTopics[normName] || null;
  };

  // Process syllabus data with progress metrics
  const processedUnits = useMemo(() => {
    return syllabusData.map(unit => {
      let totalTopics = 0;
      let completedTopics = 0;

      unit.sections.forEach(sec => {
        sec.topics.forEach(t => {
          totalTopics++;
          const state = getTopicState(t.title);
          if (state === 'Completed') {
            completedTopics += 1;
          } else if (state === 'In Progress') {
            completedTopics += 0.5;
          }
        });
      });

      const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      return {
        ...unit,
        totalTopics,
        completedTopics,
        progressPercent
      };
    });
  }, [backendTopics, topicProgress]);

  // Overall progress calculations
  const overallStats = useMemo(() => {
    let totalTopics = 0;
    let completedCount = 0;

    processedUnits.forEach(unit => {
      totalTopics += unit.totalTopics;
      completedCount += unit.completedTopics;
    });

    const percentage = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
    return {
      totalTopics,
      completedCount: Math.floor(completedCount),
      percentage
    };
  }, [processedUnits]);

  // Filter units and their topics based on search & category filter
  const filteredUnits = useMemo(() => {
    return processedUnits.map(unit => {
      let matchesSearch = unit.title.toLowerCase().includes(searchQuery.toLowerCase());

      const filteredSections = unit.sections
        .map(section => {
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

      return {
        ...unit,
        sections: filteredSections
      };
    }).filter(Boolean);
  }, [processedUnits, searchQuery, filter]);

  // Auto select valid unit when filtering/searching
  useEffect(() => {
    if (filteredUnits.length > 0 && !filteredUnits.some(u => u.id === selectedUnitId)) {
      setSelectedUnitId(filteredUnits[0].id);
    }
  }, [filteredUnits, selectedUnitId]);

  const selectedUnit = useMemo(() => {
    return filteredUnits.find(u => u.id === selectedUnitId) || filteredUnits[0] || null;
  }, [filteredUnits, selectedUnitId]);

  const toggleSectionCollapse = (secKey) => {
    setCollapsedSections(prev => ({
      ...prev,
      [secKey]: !prev[secKey]
    }));
  };

  return (
    <div className="page max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary-color)] bg-[var(--primary-light)] px-2.5 py-0.5 rounded-md border border-[var(--primary-color)]/20">
              SSC JE CIVIL
            </span>
            <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1">
              <Compass size={13} className="text-[var(--primary-color)]" /> Blueprint View
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Civil Engineering Syllabus
          </h1>
          <p className="text-[var(--text-muted)] text-sm md:text-base mt-0.5">
            Your preparation blueprint for SSC JE Civil
          </p>
        </div>

        {/* Quick Stats Pill Header */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-[var(--surface-color)] border border-[var(--border-color)] px-3.5 py-2 rounded-xl text-center shadow-xs">
            <span className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Units</span>
            <span className="text-lg font-extrabold text-[var(--primary-color)]">{processedUnits.length}</span>
          </div>
          <div className="bg-[var(--surface-color)] border border-[var(--border-color)] px-3.5 py-2 rounded-xl text-center shadow-xs">
            <span className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Topics</span>
            <span className="text-lg font-extrabold text-[var(--text-main)]">{overallStats.totalTopics}</span>
          </div>
        </div>
      </div>

      {/* 2. OVERALL PROGRESS SECTION WITH CIVIL BLUEPRINT VISUAL */}
      <div className="relative overflow-hidden bg-[var(--surface-color)] bg-[var(--card-gradient)] rounded-2xl border border-[var(--border-color)] p-5 md:p-6 shadow-sm">
        {/* Civil Engineering Blueprint SVG Visual Art Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none flex items-center justify-end pr-4">
          <svg width="340" height="180" viewBox="0 0 340 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--primary-color)] stroke-current">
            <path d="M20 160H320M50 160V40L140 20L230 40V160M50 80H230M50 120H230M140 20V160M180 40V160M90 40V160" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M250 160L280 80L310 160M265 120H295" strokeWidth="2" />
            <circle cx="140" cy="20" r="4" fill="currentColor" />
            <circle cx="50" cy="40" r="3" fill="currentColor" />
            <circle cx="230" cy="40" r="3" fill="currentColor" />
            <line x1="0" y1="20" x2="340" y2="20" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="0" y1="60" x2="340" y2="60" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="0" y1="100" x2="340" y2="100" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="0" y1="140" x2="340" y2="140" strokeWidth="0.5" strokeDasharray="2 2" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          {/* Circular Progress Ring */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="38"
                stroke="currentColor"
                strokeWidth="7"
                fill="transparent"
                className="text-[var(--sidebar-bg)]"
              />
              <circle
                cx="48"
                cy="48"
                r="38"
                stroke="currentColor"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 38}
                strokeDashoffset={2 * Math.PI * 38 * (1 - overallStats.percentage / 100)}
                strokeLinecap="round"
                className="text-[var(--primary-color)] transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-[var(--text-main)] leading-none">
                {overallStats.percentage}%
              </span>
              <span className="text-[10px] font-extrabold uppercase text-[var(--text-muted)] tracking-wider mt-0.5">
                Complete
              </span>
            </div>
          </div>

          {/* Progress Details */}
          <div className="flex-1 w-full text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-2">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-main)]">Overall Syllabus Progress</h2>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  {overallStats.completedCount} of {overallStats.totalTopics} topics completed across all Civil Engineering units
                </p>
              </div>
              <span className="text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-light)] px-3 py-1 rounded-full self-center md:self-auto">
                {overallStats.completedCount} / {overallStats.totalTopics} Topics
              </span>
            </div>

            {/* Horizontal Bar */}
            <div className="w-full bg-[var(--sidebar-bg)] rounded-full h-3 overflow-hidden p-0.5 border border-[var(--border-color)]/40 mt-3">
              <div
                className="bg-[var(--primary-color)] h-full rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${overallStats.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[var(--surface-color)] bg-[var(--card-gradient)] p-2.5 rounded-xl border border-[var(--border-color)] shadow-xs">
        <div className="relative flex-1 w-full flex items-center">
          <Search className="absolute left-3.5 text-[var(--text-muted)]" size={17} />
          <input
            type="text"
            placeholder="Search topics or units..."
            className="w-full pl-10 pr-4 py-1.5 bg-transparent border-none focus:outline-none text-sm font-medium text-[var(--text-main)] placeholder-[var(--text-muted)]/60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 p-1 bg-[var(--bg-color)] rounded-lg shrink-0 w-full sm:w-auto">
          {["All", "Core", "Advanced"].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 sm:flex-none px-3.5 py-1 rounded-md text-xs font-semibold transition-all ${
                filter === tab
                  ? 'bg-[var(--surface-color)] shadow-xs text-[var(--primary-color)] border border-[var(--border-color)]/60'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 4. MAIN SYLLABUS AREA (TWO-PANEL LAYOUT) */}
      {filteredUnits.length === 0 ? (
        <div className="p-12 text-center text-[var(--text-muted)] bg-[var(--surface-color)] bg-[var(--card-gradient)] border border-[var(--border-color)] rounded-2xl shadow-xs">
          No units or topics match your search query or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT PANEL: SYLLABUS OVERVIEW (SUBJECT SELECTION LIST) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Layers size={14} className="text-[var(--primary-color)]" /> Syllabus Overview
              </span>
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                {filteredUnits.length} {filteredUnits.length === 1 ? 'Subject' : 'Subjects'}
              </span>
            </div>

            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1.5 custom-scrollbar">
              {filteredUnits.map((unit) => {
                const isSelected = selectedUnit?.id === unit.id;
                const formattedUnitNum = String(unit.unitNumber).padStart(2, '0');

                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedUnitId(unit.id)}
                    className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[var(--surface-color)] border-[var(--primary-color)] shadow-sm ring-1 ring-[var(--primary-color)]/30'
                        : 'bg-[var(--surface-color)]/70 hover:bg-[var(--surface-color)] border-[var(--border-color)] hover:border-[var(--primary-color)]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Unit Number Badge */}
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[var(--primary-color)] text-white'
                          : 'bg-[var(--bg-color)] text-[var(--text-muted)] border border-[var(--border-color)]'
                      }`}>
                        {formattedUnitNum}
                      </span>

                      {/* Subject info */}
                      <div className="min-w-0 flex-1">
                        <h3 className={`text-sm font-bold truncate transition-colors ${
                          isSelected ? 'text-[var(--primary-color)]' : 'text-[var(--text-main)]'
                        }`}>
                          {unit.title}
                        </h3>

                        <div className="flex items-center gap-3 mt-1 text-[11px] font-medium text-[var(--text-muted)]">
                          <span>{unit.totalTopics} topics</span>
                          <span>•</span>
                          <span>{unit.progressPercent}% completed</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[var(--sidebar-bg)] rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div
                            className="bg-[var(--primary-color)] h-full rounded-full transition-all duration-300"
                            style={{ width: `${unit.progressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Chevron Indicator */}
                    <div className={`shrink-0 transition-transform ${isSelected ? 'text-[var(--primary-color)] translate-x-0.5' : 'text-[var(--text-muted)]/50'}`}>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: SELECTED SUBJECT DETAILS & ACCORDION */}
          {selectedUnit && (
            <div className="lg:col-span-7 space-y-4">
              {/* Selected Subject Header Card */}
              <div className="bg-[var(--surface-color)] bg-[var(--card-gradient)] rounded-2xl border border-[var(--border-color)] p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary-color)] bg-[var(--primary-light)] px-2.5 py-0.5 rounded-md">
                        UNIT {String(selectedUnit.unitNumber).padStart(2, '0')}
                      </span>
                      {selectedUnit.pageRange && (
                        <span className="text-xs text-[var(--text-muted)] font-medium">
                          Pages {selectedUnit.pageRange}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">
                      {selectedUnit.title}
                    </h2>
                  </div>

                  {/* Large Percentage Badge */}
                  <div className="shrink-0 text-right">
                    <span className="text-2xl font-black text-[var(--primary-color)]">
                      {selectedUnit.progressPercent}%
                    </span>
                    <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Completed
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-[var(--text-muted)]">
                    <span>Subject Progress</span>
                    <span>{Math.floor(selectedUnit.completedTopics)} of {selectedUnit.totalTopics} topics</span>
                  </div>
                  <div className="w-full bg-[var(--sidebar-bg)] rounded-full h-2 overflow-hidden border border-[var(--border-color)]/40">
                    <div
                      className="bg-[var(--primary-color)] h-full rounded-full transition-all duration-300"
                      style={{ width: `${selectedUnit.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Topics Section Header */}
              <div className="flex items-center justify-between px-1 pt-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                  <BookOpen size={14} className="text-[var(--primary-color)]" /> Topics In This Subject
                </span>
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  {selectedUnit.sections.reduce((acc, s) => acc + s.topics.length, 0)} Topics Available
                </span>
              </div>

              {/* Collapsible Topics Accordion */}
              {selectedUnit.topicsAvailable === false ? (
                <div className="p-8 text-center text-[var(--text-muted)] text-sm italic bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl">
                  Topics for this subject will be added soon.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedUnit.sections.map((section, secIdx) => {
                    const secKey = `${selectedUnit.id}-sec-${secIdx}`;
                    const isCollapsed = collapsedSections[secKey];

                    // Count completed in section
                    let secCompleted = 0;
                    section.topics.forEach(t => {
                      const st = getTopicState(t.title);
                      if (st === 'Completed') secCompleted += 1;
                      else if (st === 'In Progress') secCompleted += 0.5;
                    });
                    const secProgress = section.topics.length > 0
                      ? Math.round((secCompleted / section.topics.length) * 100)
                      : 0;

                    return (
                      <div
                        key={secIdx}
                        className="bg-[var(--surface-color)] bg-[var(--card-gradient)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-2xs"
                      >
                        {/* Accordion Section Header */}
                        <div
                          onClick={() => toggleSectionCollapse(secKey)}
                          className="p-3.5 bg-[var(--surface-color)] hover:bg-[var(--bg-color)]/50 cursor-pointer flex items-center justify-between transition-colors border-b border-[var(--border-color)]/60"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                              section.type === 'core'
                                ? 'bg-[var(--primary-light)] text-[var(--primary-color)]'
                                : 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                            }`}>
                              {section.type || 'Section'}
                            </span>
                            <h4 className="text-sm font-bold text-[var(--text-main)] truncate">
                              {section.title}
                            </h4>
                            <span className="text-xs text-[var(--text-muted)] font-medium">
                              ({section.topics.length} {section.topics.length === 1 ? 'topic' : 'topics'})
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-semibold text-[var(--primary-color)] bg-[var(--primary-light)]/50 px-2 py-0.5 rounded-md">
                              {secProgress}%
                            </span>
                            {isCollapsed ? <ChevronDown size={16} className="text-[var(--text-muted)]" /> : <ChevronUp size={16} className="text-[var(--text-muted)]" />}
                          </div>
                        </div>

                        {/* Accordion Topics List */}
                        {!isCollapsed && (
                          <div className="p-3 space-y-2 bg-[var(--bg-color)]/30 max-h-[260px] overflow-y-auto pr-1.5 custom-scrollbar">
                            {section.topics.map((topic, topicIdx) => {
                              const tId = getTopicId(topic.title);
                              const state = getTopicState(topic.title);

                              return (
                                <div
                                  key={topic.number || topicIdx}
                                  onClick={() => tId ? navigate(`/learn/topic/${tId}`) : null}
                                  className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                                    tId
                                      ? 'bg-[var(--surface-color)] border-[var(--border-color)] hover:border-[var(--primary-color)]/60 hover:shadow-xs cursor-pointer group'
                                      : 'bg-[var(--surface-color)]/60 border-[var(--border-color)]/50 opacity-70'
                                  }`}
                                >
                                  {/* Topic Left Details */}
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <span className="px-1.5 h-6 rounded-md flex items-center justify-center bg-[var(--bg-color)] text-[var(--text-muted)] text-xs font-extrabold shrink-0 border border-[var(--border-color)]/60 min-w-[28px]">
                                      {selectedUnit?.unitNumber ? `${selectedUnit.unitNumber}.${topic.number}` : topic.number}
                                    </span>

                                    <span className={`text-xs md:text-sm font-semibold truncate ${
                                      tId
                                        ? 'text-[var(--text-main)] group-hover:text-[var(--primary-color)] transition-colors'
                                        : 'text-[var(--text-muted)]'
                                    }`}>
                                      {topic.title}
                                    </span>
                                  </div>

                                  {/* Topic Right Status & Nav */}
                                  <div className="flex items-center gap-2.5 shrink-0">
                                    {state === "Completed" && (
                                      <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 size={13} /> Completed
                                      </span>
                                    )}
                                    {state === "In Progress" && (
                                      <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                        <CircleDashed size={13} /> In Progress
                                      </span>
                                    )}
                                    {state === "Not Started" && (
                                      <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-medium bg-[var(--bg-color)] border border-[var(--border-color)] px-2 py-0.5 rounded-full">
                                        <CircleDashed size={13} /> Not Started
                                      </span>
                                    )}

                                    {tId && (
                                      <div className="text-[var(--primary-color)] opacity-40 group-hover:opacity-100 transform group-hover:translate-x-0.5 transition-all">
                                        <ChevronRight size={16} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
