import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { adminAPI, HierarchyBranch } from '../../api/admin';
import apiClient from '../../api/client';
import { Exam } from '../../types';
import { Icons } from '../../assets/icons';

const countLabel = (n: number) => (n === 1 ? '1 question' : `${n} questions`);

export const AdminHierarchyPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [branches, setBranches] = useState<HierarchyBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newExamName, setNewExamName] = useState('');
  const [newExamDesc, setNewExamDesc] = useState('');

  // Drill-down selection: branch -> subject -> chapter
  const [openBranch, setOpenBranch] = useState<number | null>(null);
  const [openSubject, setOpenSubject] = useState<number | null>(null);
  const [openChapter, setOpenChapter] = useState<number | null>(null);

  const loadTree = async () => {
    setLoading(true);
    setError('');
    try {
      const [examData, tree] = await Promise.all([
        apiClient.get<Exam[]>('/exams/').then((r) => r.data),
        adminAPI.getHierarchyTree(),
      ]);
      setExams(examData);
      setBranches(tree.branches);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load content hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim()) return;
    try {
      await apiClient.post('/exams/', { name: newExamName, description: newExamDesc, is_active: true });
      setNewExamName('');
      setNewExamDesc('');
      await loadTree();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Error creating exam');
    }
  };

  const handleDeleteExam = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this exam? This removes the exam record from the platform.')) return;
    try {
      await apiClient.delete(`/exams/${id}`);
      await loadTree();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Error deleting exam');
    }
  };

  const toggleBranch = (id: number) => {
    if (openBranch === id) {
      setOpenBranch(null);
      setOpenSubject(null);
      setOpenChapter(null);
    } else {
      setOpenBranch(id);
      setOpenSubject(null);
      setOpenChapter(null);
    }
  };

  const toggleSubject = (id: number) => {
    if (openSubject === id) {
      setOpenSubject(null);
      setOpenChapter(null);
    } else {
      setOpenSubject(id);
      setOpenChapter(null);
    }
  };

  const toggleChapter = (id: number) => {
    setOpenChapter((c) => (c === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Content Hierarchy</h1>
        <Button onClick={loadTree} variant="outline" className="flex items-center gap-2">
          <Icons.RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exams + drill-down tree */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Exams</h2>
            {loading ? (
              <p className="text-slate-500">Loading exams...</p>
            ) : exams.length === 0 ? (
              <p className="text-slate-500">No exams found. Create one to get started.</p>
            ) : (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex justify-between items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <div>
                      <h3 className="font-medium text-slate-800">{exam.name}</h3>
                      <p className="text-sm text-slate-500">{exam.description || 'No description'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteExam(exam.id)}
                        title="Delete exam"
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Icons.X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-slate-800">Syllabus Drill-Down</h2>
              <span className="text-xs text-slate-500">Branch &rarr; Subject &rarr; Chapter &rarr; Topic</span>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Counts are live question-bank totals for each level. Use "View questions" to open a filtered Question Bank.
            </p>

            {loading ? (
              <p className="text-slate-500">Loading hierarchy...</p>
            ) : branches.length === 0 ? (
              <p className="text-slate-500">No syllabus branches found yet.</p>
            ) : (
              <div className="space-y-2">
                {branches.map((branch) => {
                  const branchOpen = openBranch === branch.id;
                  return (
                    <div key={branch.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleBranch(branch.id)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Icons.BookOpen className="w-4 h-4 text-emerald-600" />
                          <div>
                            <span className="font-medium text-slate-800">{branch.name}</span>
                            <span className="ml-2 text-xs text-slate-500">
                              {branch.subjects.length} subjects &middot; {countLabel(branch.question_count)}
                            </span>
                          </div>
                        </div>
                        <Icons.X
                          className={`w-4 h-4 text-slate-400 transition-transform ${branchOpen ? 'rotate-45' : ''}`}
                        />
                      </button>

                      {branchOpen && (
                        <div className="p-3 space-y-2 bg-white">
                          {branch.subjects.length === 0 ? (
                            <p className="text-sm text-slate-400 pl-7">No subjects in this branch.</p>
                          ) : (
                            branch.subjects.map((subject) => {
                              const subjectOpen = openSubject === subject.id;
                              return (
                                <div key={subject.id} className="border border-slate-100 rounded-lg overflow-hidden">
                                  <div className="flex items-center justify-between p-2 hover:bg-slate-50 transition-colors">
                                    <button
                                      onClick={() => toggleSubject(subject.id)}
                                      className="flex items-center gap-3 text-left flex-1 pl-2"
                                    >
                                      <Icons.ChevronDown
                                        className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                          subjectOpen ? 'rotate-180' : ''
                                        }`}
                                      />
                                      <span className="text-sm font-medium text-slate-700">{subject.name}</span>
                                      <span className="text-xs text-slate-500">
                                        {subject.chapters.length} chapters &middot; {countLabel(subject.question_count)}
                                      </span>
                                    </button>
                                    <Link
                                      to={`/admin/questions?subject_id=${subject.id}`}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mr-2 whitespace-nowrap"
                                    >
                                      View questions
                                    </Link>
                                  </div>

                                  {subjectOpen && (
                                    <div className="px-3 pb-3 space-y-2">
                                      {subject.chapters.length === 0 ? (
                                        <p className="text-sm text-slate-400 pl-7">No chapters in this subject.</p>
                                      ) : (
                                        subject.chapters.map((chapter) => {
                                          const chapterOpen = openChapter === chapter.id;
                                          return (
                                            <div
                                              key={chapter.id}
                                              className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50"
                                            >
                                              <div className="flex items-center justify-between p-2 hover:bg-slate-100 transition-colors">
                                                <button
                                                  onClick={() => toggleChapter(chapter.id)}
                                                  className="flex items-center gap-3 text-left flex-1 pl-2"
                                                >
                                                  <Icons.ChevronDown
                                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                                      chapterOpen ? 'rotate-180' : ''
                                                    }`}
                                                  />
                                                  <span className="text-sm text-slate-700">{chapter.name}</span>
                                                  <span className="text-xs text-slate-500">
                                                    {chapter.topics.length} topics &middot; {countLabel(chapter.question_count)}
                                                  </span>
                                                </button>
                                                <Link
                                                  to={`/admin/questions?chapter_id=${chapter.id}`}
                                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mr-2 whitespace-nowrap"
                                                >
                                                  View questions
                                                </Link>
                                              </div>

                                              {chapterOpen && (
                                                <div className="px-3 pb-3 space-y-1">
                                                  {chapter.topics.length === 0 ? (
                                                    <p className="text-sm text-slate-400 pl-7">No topics in this chapter.</p>
                                                  ) : (
                                                    chapter.topics.map((topic) => (
                                                      <div
                                                        key={topic.id}
                                                        className="flex items-center justify-between p-2 bg-white rounded border border-slate-100"
                                                      >
                                                        <div className="flex items-center gap-3 pl-2">
                                                          <Icons.Bookmark className="w-3.5 h-3.5 text-slate-400" />
                                                          <span className="text-sm text-slate-700">{topic.name}</span>
                                                          <span
                                                            className={`text-xs ${
                                                              topic.question_count > 0 ? 'text-slate-500' : 'text-amber-600'
                                                            }`}
                                                          >
                                                            {countLabel(topic.question_count)}
                                                          </span>
                                                        </div>
                                                        <Link
                                                          to={`/admin/questions?topic_id=${topic.id}`}
                                                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mr-1 whitespace-nowrap"
                                                        >
                                                          View questions
                                                        </Link>
                                                      </div>
                                                    ))
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Add Exam Form */}
        <Card className="p-6 h-fit">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Add New Exam</h2>
          <form onSubmit={handleCreateExam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exam Name</label>
              <input
                type="text"
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="e.g. SSC JE Civil"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={newExamDesc}
                onChange={(e) => setNewExamDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Exam description..."
                rows={3}
              />
            </div>
            <Button type="submit" disabled={!newExamName.trim()} className="w-full">
              Create Exam
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
