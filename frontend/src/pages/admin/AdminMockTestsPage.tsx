import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icons } from '../../assets/icons';
import {
  adminAPI,
  AdminMockTest,
  AdminMockTestDetail,
  AdminMockTestAttemptItem,
  AdminQuestion,
  HierarchyBranch,
} from '../../api/admin';

const PAGE_SIZE = 25;

const TEST_TYPES: Array<{ value: string; label: string }> = [
  { value: 'full_syllabus', label: 'Full Syllabus' },
  { value: 'subject_wise', label: 'Subject Wise' },
  { value: 'topic_wise', label: 'Topic Wise' },
  { value: 'custom', label: 'Custom' },
];

const typeLabel = (value: string) => TEST_TYPES.find((t) => t.value === value)?.label ?? value;

const TYPE_BADGE: Record<string, string> = {
  full_syllabus: 'bg-blue-100 text-blue-700',
  subject_wise: 'bg-emerald-100 text-emerald-700',
  topic_wise: 'bg-purple-100 text-purple-700',
  custom: 'bg-slate-100 text-slate-700',
};

const DIFFICULTY_BADGE: Record<string, string> = {
  hard: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  easy: 'bg-green-100 text-green-700',
};

interface TestFormState {
  name: string;
  description: string;
  test_type: string;
  duration_minutes: string;
  total_marks: string;
  negative_marking: string;
  is_baseline: boolean;
}

const emptyForm = (): TestFormState => ({
  name: '',
  description: '',
  test_type: 'full_syllabus',
  duration_minutes: '60',
  total_marks: '0',
  negative_marking: '0.25',
  is_baseline: false,
});

export const AdminMockTestsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [tests, setTests] = useState<AdminMockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Create / Edit modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTest, setEditTest] = useState<AdminMockTest | null>(null);
  const [form, setForm] = useState<TestFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Question Builder Modal State
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderTest, setBuilderTest] = useState<AdminMockTest | null>(null);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Array<{
    id: number;
    question_text: string;
    marks: number;
    difficulty: string;
    subject_name?: string | null;
    chapter_name?: string | null;
    topic_name?: string | null;
    is_pyq?: boolean;
    year?: number | null;
  }>>([]);
  const [autoCalcMarks, setAutoCalcMarks] = useState(true);

  // Question Bank Browser within Question Builder
  const [bankQuestions, setBankQuestions] = useState<AdminQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankDifficulty, setBankDifficulty] = useState('');
  const [bankSubjectId, setBankSubjectId] = useState('');
  const [bankPyq, setBankPyq] = useState('');
  const [bankPage, setBankPage] = useState(1);
  const [bankTotalPages, setBankTotalPages] = useState(1);
  const [branches, setBranches] = useState<HierarchyBranch[]>([]);

  // Attempts History Modal State
  const [attemptsOpen, setAttemptsOpen] = useState(false);
  const [attemptsTest, setAttemptsTest] = useState<AdminMockTest | null>(null);
  const [attempts, setAttempts] = useState<AdminMockTestAttemptItem[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsPage, setAttemptsPage] = useState(1);
  const [attemptsTotalPages, setAttemptsTotalPages] = useState(1);
  const [attemptsTotalItems, setAttemptsTotalItems] = useState(0);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const envelope = await adminAPI.getMockTests({
        page,
        page_size: PAGE_SIZE,
        search: searchTerm,
        test_type: typeFilter || undefined,
      });
      setTests(envelope.items);
      setTotalItems(envelope.total);
      setTotalPages(envelope.total_pages);
    } catch {
      setError('Failed to fetch mock tests');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, typeFilter]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Read URL action query param
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      openCreate();
      // Remove the action param from URL so refresh doesn't reopen unexpectedly
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams]);

  // Load hierarchy tree once for question builder subject filter
  useEffect(() => {
    adminAPI.getHierarchyTree()
      .then((data) => setBranches(data.branches || []))
      .catch(() => {});
  }, []);

  const allSubjects = React.useMemo(() => {
    const subjectsList: Array<{ id: number; name: string }> = [];
    branches.forEach((b) => {
      b.subjects?.forEach((s) => {
        subjectsList.push({ id: s.id, name: s.name });
      });
    });
    return subjectsList;
  }, [branches]);

  const handleDelete = async (test: AdminMockTest) => {
    if (
      !window.confirm(
        `Delete the mock test "${test.name}"? This removes the test, its question links and its attempt history.`
      )
    ) {
      return;
    }

    try {
      await adminAPI.deleteMockTest(test.id);
      if (tests.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchTests();
      }
    } catch {
      alert('Failed to delete mock test');
    }
  };

  const openCreate = () => {
    setEditTest(null);
    setForm(emptyForm());
    setFormError(null);
    setCreateOpen(true);
  };

  const openEdit = (test: AdminMockTest) => {
    setEditTest(test);
    setForm({
      name: test.name,
      description: test.description || '',
      test_type: test.test_type,
      duration_minutes: String(test.duration_minutes),
      total_marks: String(test.total_marks),
      negative_marking: String(test.negative_marking),
      is_baseline: Boolean(test.is_baseline),
    });
    setFormError(null);
    setCreateOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const duration = Number(form.duration_minutes);
    if (!form.name.trim()) {
      setFormError('Test name is required.');
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setFormError('Duration must be greater than 0 minutes.');
      return;
    }

    setSaving(true);
    try {
      if (editTest) {
        await adminAPI.updateMockTest(editTest.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          test_type: form.test_type,
          duration_minutes: duration,
          total_marks: Number(form.total_marks) || 0,
          negative_marking: Number(form.negative_marking) || 0,
          is_baseline: form.is_baseline ? 1 : 0,
        });
      } else {
        await adminAPI.createMockTest({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          test_type: form.test_type,
          duration_minutes: duration,
          total_marks: Number(form.total_marks) || 0,
          negative_marking: Number(form.negative_marking) || 0,
        });
      }
      setCreateOpen(false);
      setEditTest(null);
      await fetchTests();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Failed to save mock test');
    } finally {
      setSaving(false);
    }
  };

  // ── Question Builder Logic ──────────────────────────────────────────────────
  const openQuestionBuilder = async (test: AdminMockTest) => {
    setBuilderTest(test);
    setBuilderOpen(true);
    setBuilderLoading(true);
    setBuilderError(null);
    setSelectedQuestions([]);
    setBankPage(1);

    try {
      const detail: AdminMockTestDetail = await adminAPI.getMockTestDetail(test.id);
      const existingQs = (detail.questions || []).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        marks: q.marks,
        difficulty: q.difficulty,
        subject_name: q.subject_name,
        chapter_name: q.chapter_name,
        topic_name: q.topic_name,
        is_pyq: q.is_pyq,
        year: q.year,
      }));
      setSelectedQuestions(existingQs);
    } catch (err: any) {
      setBuilderError('Failed to load test question details.');
    } finally {
      setBuilderLoading(false);
    }

    // Fetch first page of question bank
    fetchBankQuestions(1, '', '', '', '');
  };

  const fetchBankQuestions = async (
    pageNumber: number,
    search: string,
    diff: string,
    subj: string,
    pyq: string
  ) => {
    setBankLoading(true);
    try {
      const params: any = {
        page: pageNumber,
        page_size: 15,
      };
      if (search.trim()) params.search = search.trim();
      if (diff) params.difficulty = diff;
      if (subj) params.subject_id = Number(subj);
      if (pyq === 'true') params.is_pyq = true;
      if (pyq === 'false') params.is_pyq = false;

      const res = await adminAPI.getQuestions(params);
      setBankQuestions(res.items);
      setBankTotalPages(res.total_pages);
    } catch {
      // bank load error handled silently
    } finally {
      setBankLoading(false);
    }
  };

  const addQuestionToTest = (q: AdminQuestion) => {
    if (selectedQuestions.some((item) => item.id === q.id)) return;
    setSelectedQuestions((prev) => [
      ...prev,
      {
        id: q.id,
        question_text: q.question_text,
        marks: q.marks,
        difficulty: q.difficulty,
        subject_name: null,
        chapter_name: null,
        topic_name: q.topic_name || null,
        is_pyq: q.is_pyq,
        year: q.year,
      },
    ]);
  };

  const removeQuestionFromTest = (index: number) => {
    setSelectedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= selectedQuestions.length) return;
    setSelectedQuestions((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const saveQuestionSet = async () => {
    if (!builderTest) return;
    setBuilderSaving(true);
    setBuilderError(null);
    try {
      const question_ids = selectedQuestions.map((q) => q.id);
      await adminAPI.setMockTestQuestions(builderTest.id, {
        question_ids,
        auto_calculate_marks: autoCalcMarks,
      });
      setBuilderOpen(false);
      setBuilderTest(null);
      await fetchTests();
    } catch (err: any) {
      setBuilderError(err?.response?.data?.detail || 'Failed to save question set');
    } finally {
      setBuilderSaving(false);
    }
  };

  // ── Attempts History Logic ──────────────────────────────────────────────────
  const openAttempts = async (test: AdminMockTest, pageNum = 1) => {
    setAttemptsTest(test);
    setAttemptsOpen(true);
    setAttemptsLoading(true);
    setAttemptsPage(pageNum);

    try {
      const envelope = await adminAPI.getMockTestAttempts(test.id, {
        page: pageNum,
        page_size: 10,
      });
      setAttempts(envelope.items);
      setAttemptsTotalPages(envelope.total_pages);
      setAttemptsTotalItems(envelope.total);
    } catch {
      // silently handle or set empty
      setAttempts([]);
    } finally {
      setAttemptsLoading(false);
    }
  };

  const totalSelectedMarks = selectedQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);

  const canPrev = page > 1;
  const canNext = page < totalPages && totalPages > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mock Tests Management</h1>
          <p className="text-sm text-slate-500">Configure tests, curate question sets, and inspect student performance</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={fetchTests} variant="outline" className="flex items-center gap-2">
            <Icons.RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Icons.Plus className="w-4 h-4" /> New Mock Test
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-end justify-between">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <div className="flex items-center gap-2">
                <input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1);
                      const t = searchDraft.trim();
                      setSearchTerm(t ? t : undefined);
                    }
                  }}
                  placeholder="Search by test name..."
                  className="w-64 max-w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    setPage(1);
                    const t = searchDraft.trim();
                    setSearchTerm(t ? t : undefined);
                  }}
                >
                  <Icons.Search className="w-4 h-4 mr-1" /> Search
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setPage(1);
                  setTypeFilter(e.target.value);
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">All types</option>
                {TEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPage(1);
              setSearchDraft('');
              setSearchTerm(undefined);
              setTypeFilter('');
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      ) : (
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading mock tests...</div>
          ) : tests.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No mock tests found. Create your first test to assemble question sets.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                    <th className="p-4 font-medium">Test Name</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Duration</th>
                    <th className="p-4 font-medium">Questions</th>
                    <th className="p-4 font-medium">Attempts</th>
                    <th className="p-4 font-medium">Avg Score</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tests.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          {test.name}
                          {Boolean(test.is_baseline) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-100 text-indigo-700 tracking-wider">
                              Baseline
                            </span>
                          )}
                        </div>
                        {test.description && (
                          <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{test.description}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            TYPE_BADGE[test.test_type] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {typeLabel(test.test_type)}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        <div className="font-medium">{test.duration_minutes} min</div>
                        <div className="text-xs text-slate-500">{test.total_marks} marks total</div>
                      </td>
                      <td className="p-4 text-slate-600">
                        {test.question_count === 0 ? (
                          <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                            0 questions
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-800">{test.question_count}</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">
                        <button
                          onClick={() => openAttempts(test)}
                          className="hover:text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                          title="View student attempts"
                        >
                          {test.attempt_count}
                          <Icons.Eye className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {test.avg_score === null || test.avg_score === undefined ? '--' : test.avg_score}
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => openQuestionBuilder(test)}
                          title="Attach and reorder questions"
                        >
                          <Icons.Layers className="w-3.5 h-3.5 mr-1" /> Questions
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(test)}
                          title="Edit test settings"
                        >
                          <Icons.Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(test)}
                          title="Delete test"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 flex items-center justify-between border-t border-slate-100">
            <div className="text-sm text-slate-600">
              Page <span className="font-semibold">{page}</span> of{' '}
              <span className="font-semibold">{totalPages || 0}</span> &middot;{' '}
              <span className="font-semibold">{totalItems}</span> tests
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <Button size="sm" variant="outline" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── CREATE / EDIT MODAL ────────────────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editTest ? 'Edit Mock Test' : 'New Mock Test'}
              </h2>
              <button
                onClick={() => {
                  setCreateOpen(false);
                  setEditTest(null);
                  setFormError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitForm}>
              <div className="px-6 py-4 space-y-4">
                {formError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{formError}</div>}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Test Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. SSC JE Civil Engineering Full Mock Test 01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="Brief details or instructions for test takers..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select
                      value={form.test_type}
                      onChange={(e) => setForm({ ...form, test_type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"
                    >
                      {TEST_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes) *</label>
                    <input
                      type="number"
                      min={1}
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Marks</label>
                    <input
                      type="number"
                      min={0}
                      value={form.total_marks}
                      onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Negative Marking</label>
                    <input
                      type="number"
                      min={0}
                      step="0.05"
                      value={form.negative_marking}
                      onChange={(e) => setForm({ ...form, negative_marking: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.is_baseline}
                      onChange={(e) => setForm({ ...form, is_baseline: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>Set as Baseline Diagnostic Assessment</span>
                  </label>
                  <p className="text-xs text-slate-500 ml-6">
                    Baseline tests are recommended to students when they first join to calibrate their skill profile.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    setEditTest(null);
                    setFormError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editTest ? 'Save Changes' : 'Create Test'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUESTION BUILDER MODAL ────────────────────────────────────────── */}
      {builderOpen && builderTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Icons.Layers className="w-5 h-5 text-indigo-600" />
                  Question Builder: {builderTest.name}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Selected: <strong className="text-slate-800">{selectedQuestions.length}</strong> questions</span>
                  <span>&middot;</span>
                  <span>Total Marks: <strong className="text-indigo-600">{totalSelectedMarks}</strong></span>
                  <span>&middot;</span>
                  <span>Duration: <strong className="text-slate-800">{builderTest.duration_minutes} min</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCalcMarks}
                    onChange={(e) => setAutoCalcMarks(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Auto-calculate marks on save</span>
                </label>
                <button
                  onClick={() => {
                    setBuilderOpen(false);
                    setBuilderTest(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <Icons.X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {builderError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {builderError}
              </div>
            )}

            {/* Split Builder Panes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6 overflow-hidden flex-1 min-h-0">
              {/* Left Column: Assigned Test Questions */}
              <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                    <Icons.List className="w-4 h-4 text-slate-600" />
                    Test Questions Sequence ({selectedQuestions.length})
                  </span>
                  {selectedQuestions.length > 0 && (
                    <button
                      onClick={() => setSelectedQuestions([])}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[55vh]">
                  {builderLoading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Loading test questions...</div>
                  ) : selectedQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                      <Icons.FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium text-slate-600">No questions added yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Search and pick questions from the Question Bank on the right to build this test.
                      </p>
                    </div>
                  ) : (
                    selectedQuestions.map((q, idx) => (
                      <div
                        key={`${q.id}-${idx}`}
                        className="bg-white border border-slate-200 rounded-md p-3 shadow-sm hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-medium text-slate-800 line-clamp-2">
                                {q.question_text}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-semibold ${
                                    DIFFICULTY_BADGE[q.difficulty] || 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {q.difficulty}
                                </span>
                                <span className="text-slate-500 font-medium">{q.marks} mark(s)</span>
                                {q.topic_name && (
                                  <span className="text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                    {q.topic_name}
                                  </span>
                                )}
                                {q.is_pyq && (
                                  <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                                    PYQ {q.year ? `(${q.year})` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveQuestion(idx, idx - 1)}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                              title="Move Up"
                            >
                              <Icons.ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === selectedQuestions.length - 1}
                              onClick={() => moveQuestion(idx, idx + 1)}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400"
                              title="Move Down"
                            >
                              <Icons.ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQuestionFromTest(idx)}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Remove from test"
                            >
                              <Icons.Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Question Bank Browser */}
              <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
                  <div className="font-semibold text-sm text-slate-800 flex items-center justify-between">
                    <span>Question Bank Browser</span>
                    <span className="text-xs font-normal text-slate-500">
                      Click <strong className="text-indigo-600">+ Add</strong> to attach
                    </span>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <input
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setBankPage(1);
                          fetchBankQuestions(1, bankSearch, bankDifficulty, bankSubjectId, bankPyq);
                        }
                      }}
                      placeholder="Search text..."
                      className="px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                    />

                    <select
                      value={bankSubjectId}
                      onChange={(e) => {
                        setBankSubjectId(e.target.value);
                        setBankPage(1);
                        fetchBankQuestions(1, bankSearch, bankDifficulty, e.target.value, bankPyq);
                      }}
                      className="px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
                    >
                      <option value="">All Subjects</option>
                      {allSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={bankDifficulty}
                      onChange={(e) => {
                        setBankDifficulty(e.target.value);
                        setBankPage(1);
                        fetchBankQuestions(1, bankSearch, e.target.value, bankSubjectId, bankPyq);
                      }}
                      className="px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
                    >
                      <option value="">All Diff</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>

                    <div className="flex gap-1">
                      <select
                        value={bankPyq}
                        onChange={(e) => {
                          setBankPyq(e.target.value);
                          setBankPage(1);
                          fetchBankQuestions(1, bankSearch, bankDifficulty, bankSubjectId, e.target.value);
                        }}
                        className="w-1/2 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
                      >
                        <option value="">All Types</option>
                        <option value="true">PYQs Only</option>
                        <option value="false">Non-PYQs</option>
                      </select>

                      <Button
                        size="sm"
                        onClick={() => {
                          setBankPage(1);
                          fetchBankQuestions(1, bankSearch, bankDifficulty, bankSubjectId, bankPyq);
                        }}
                        className="w-1/2 text-xs py-1"
                      >
                        Search
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh]">
                  {bankLoading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Searching question bank...</div>
                  ) : bankQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      No questions matched your search criteria.
                    </div>
                  ) : (
                    bankQuestions.map((q) => {
                      const isAdded = selectedQuestions.some((item) => item.id === q.id);
                      return (
                        <div
                          key={q.id}
                          className={`p-3 rounded-md border text-xs transition-all ${
                            isAdded
                              ? 'bg-indigo-50/40 border-indigo-200'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-slate-800 line-clamp-2">{q.question_text}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-semibold ${
                                    DIFFICULTY_BADGE[q.difficulty] || 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {q.difficulty}
                                </span>
                                <span className="text-slate-500 font-medium">{q.marks} mark</span>
                                {q.topic_name && (
                                  <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                    {q.topic_name}
                                  </span>
                                )}
                                {q.is_pyq && (
                                  <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                                    PYQ {q.year ? `(${q.year})` : ''}
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              disabled={isAdded}
                              variant={isAdded ? 'outline' : 'primary'}
                              onClick={() => addQuestionToTest(q)}
                              className={`shrink-0 text-xs px-2.5 py-1 ${
                                isAdded ? 'text-emerald-600 border-emerald-300 bg-emerald-50' : ''
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Icons.Check className="w-3.5 h-3.5 mr-1" /> Added
                                </>
                              ) : (
                                <>
                                  <Icons.Plus className="w-3.5 h-3.5 mr-1" /> Add
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Question Bank Pagination */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>Page {bankPage} of {bankTotalPages || 1}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bankPage <= 1}
                      onClick={() => {
                        const next = bankPage - 1;
                        setBankPage(next);
                        fetchBankQuestions(next, bankSearch, bankDifficulty, bankSubjectId, bankPyq);
                      }}
                      className="px-2 py-0.5 text-xs"
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bankPage >= bankTotalPages}
                      onClick={() => {
                        const next = bankPage + 1;
                        setBankPage(next);
                        fetchBankQuestions(next, bankSearch, bankDifficulty, bankSubjectId, bankPyq);
                      }}
                      className="px-2 py-0.5 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <div className="text-xs text-slate-500">
                Test question sequence is committed atomically to the database.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBuilderOpen(false);
                    setBuilderTest(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={saveQuestionSet} disabled={builderSaving}>
                  {builderSaving ? 'Saving Questions...' : `Save Question Set (${selectedQuestions.length})`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ATTEMPTS HISTORY DRAWER / MODAL ──────────────────────────────── */}
      {attemptsOpen && attemptsTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Attempt History: {attemptsTest.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total Submissions: {attemptsTotalItems} &middot; Average Score:{' '}
                  {attemptsTest.avg_score ?? '--'}
                </p>
              </div>
              <button
                onClick={() => {
                  setAttemptsOpen(false);
                  setAttemptsTest(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {attemptsLoading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Loading test submissions...</div>
              ) : attempts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                  <Icons.Play className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-600">No attempts recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Student submissions for this test will appear here in real-time.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-medium">
                        <th className="p-3">Student</th>
                        <th className="p-3">Score</th>
                        <th className="p-3">Correct / Total</th>
                        <th className="p-3">Accuracy</th>
                        <th className="p-3">Date Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {attempts.map((att) => {
                        const acc =
                          att.total_questions > 0
                            ? ((att.correct_answers / att.total_questions) * 100).toFixed(1)
                            : '0.0';
                        return (
                          <tr key={att.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{att.user_name || 'Unknown'}</div>
                              <div className="text-slate-400 text-[11px]">{att.user_email}</div>
                            </td>
                            <td className="p-3 font-bold text-slate-800">{att.score}</td>
                            <td className="p-3 text-slate-600">
                              <span className="text-emerald-600 font-semibold">{att.correct_answers}</span> /{' '}
                              {att.total_questions}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700">
                                {acc}%
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">
                              {att.completed_at
                                ? new Date(att.completed_at).toLocaleString()
                                : 'In progress'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {attemptsTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-xs text-slate-600">
                  <span>Page {attemptsPage} of {attemptsTotalPages}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={attemptsPage <= 1}
                      onClick={() => openAttempts(attemptsTest, attemptsPage - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={attemptsPage >= attemptsTotalPages}
                      onClick={() => openAttempts(attemptsTest, attemptsPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <Button
                variant="outline"
                onClick={() => {
                  setAttemptsOpen(false);
                  setAttemptsTest(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
