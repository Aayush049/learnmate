import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icons } from '../../assets/icons';
import {
  adminAPI,
  AdminQuestion,
  ImportResult,
  ImportValidationResult,
  QuestionQueryParams,
} from '../../api/admin';

const PAGE_SIZE = 25;
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

const DIFFICULTY_BADGE: Record<string, string> = {
  hard: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  easy: 'bg-green-100 text-green-700',
};

interface EditorOption {
  option_label: string;
  option_text: string;
  is_correct: boolean;
}

interface EditorState {
  id?: number;
  topic_id: string;
  question_text: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  is_pyq: boolean;
  year: string;
  shift: string;
  options: EditorOption[];
}

const emptyEditor = (): EditorState => ({
  topic_id: '',
  question_text: '',
  explanation: '',
  difficulty: 'medium',
  marks: 1,
  is_pyq: false,
  year: '',
  shift: '',
  options: [
    { option_label: 'A', option_text: '', is_correct: true },
    { option_label: 'B', option_text: '', is_correct: false },
    { option_label: 'C', option_text: '', is_correct: false },
    { option_label: 'D', option_text: '', is_correct: false },
  ],
});

const toEditorState = (detail: any): EditorState => {
  // The detail endpoint returns options WITHOUT is_correct, plus a top-level correct_option label.
  const existing: any[] = detail.options || [];
  const correctLabel: string | null = detail.correct_option ?? null;

  // Build rows in A–F order, then trim trailing empty rows (always keeping at least two).
  const options: EditorOption[] = OPTION_LABELS.map((label) => {
    const found = existing.find((o) => o.option_label === label);
    return {
      option_label: label,
      option_text: found?.option_text ?? '',
      is_correct: correctLabel === label,
    };
  });

  const usedLabels = new Set(existing.map((o) => o.option_label));
  const highestUsed = OPTION_LABELS.filter((l) => usedLabels.has(l)).pop();
  const keepCount = Math.max(2, highestUsed ? OPTION_LABELS.indexOf(highestUsed) + 1 : 2);

  const kept = options.slice(0, keepCount);

  return {
    id: detail.id,
    topic_id: String(detail.topic_id ?? ''),
    question_text: detail.question_text ?? '',
    explanation: detail.explanation ?? '',
    difficulty: (detail.difficulty ?? 'medium') as EditorState['difficulty'],
    marks: detail.marks ?? 1,
    is_pyq: Boolean(detail.is_pyq),
    year: detail.year ? String(detail.year) : '',
    shift: detail.shift ?? '',
    options: kept,
  };
};

export const AdminQuestionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter state
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);
  const [subjectId, setSubjectId] = useState<string>('');
  const [chapterId, setChapterId] = useState<string>('');
  const [topicId, setTopicId] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [pyqFilter, setPyqFilter] = useState<string>('');

  // Import modal state
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<'paste' | 'review' | 'done'>('paste');
  const [importText, setImportText] = useState('');
  const [importTopicId, setImportTopicId] = useState('');
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  // Editor modal state
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);

  // Read initial scope from the URL (hierarchy "View questions" links) & actions.
  useEffect(() => {
    const s = searchParams.get('subject_id');
    const c = searchParams.get('chapter_id');
    const t = searchParams.get('topic_id');
    const action = searchParams.get('action');

    if (s) setSubjectId(s);
    if (c) setChapterId(c);
    if (t) setTopicId(t);

    if (action === 'new') {
      openCreateEditor();
    } else if (action === 'import') {
      setImportOpen(true);
      setImportStep('paste');
      setImportText('');
      setImportError(null);
    }
  }, [searchParams]);

  // Keep URL in sync with the active scope so the view is shareable.
  useEffect(() => {
    const next = new URLSearchParams();
    if (subjectId) next.set('subject_id', subjectId);
    if (chapterId) next.set('chapter_id', chapterId);
    if (topicId) next.set('topic_id', topicId);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, chapterId, topicId]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: QuestionQueryParams = {
        page,
        page_size: PAGE_SIZE,
        search: searchTerm,
      };
      if (subjectId) params.subject_id = Number(subjectId);
      if (chapterId) params.chapter_id = Number(chapterId);
      if (topicId) params.topic_id = Number(topicId);
      if (difficulty) params.difficulty = difficulty as QuestionQueryParams['difficulty'];
      if (pyqFilter === 'true') params.is_pyq = true;
      if (pyqFilter === 'false') params.is_pyq = false;

      const envelope = await adminAPI.getQuestions(params);
      setQuestions(envelope.items);
      setTotalItems(envelope.total);
      setTotalPages(envelope.total_pages);
    } catch {
      setError('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, subjectId, chapterId, topicId, difficulty, pyqFilter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const resetFilters = () => {
    setPage(1);
    setSearchDraft('');
    setSearchTerm(undefined);
    setSubjectId('');
    setChapterId('');
    setTopicId('');
    setDifficulty('');
    setPyqFilter('');
  };

  const handleDelete = async (q: AdminQuestion) => {
    if (!window.confirm('Delete this question? This permanently removes it and its options.')) return;
    try {
      await adminAPI.deleteQuestion(q.id);
      await fetchQuestions();
    } catch {
      alert('Failed to delete question');
    }
  };

  const openCreateEditor = () => {
    const seed = topicId ? Number(topicId) : '';
    setEditor({ ...emptyEditor(), topic_id: seed ? String(seed) : '' });
    setEditorError(null);
  };

  const openEditEditor = async (questionId: number) => {
    setEditorLoading(true);
    setEditorError(null);
    try {
      const detail = await adminAPI.getQuestionDetail(questionId);
      setEditor(toEditorState(detail));
    } catch {
      setEditorError('Failed to load question for editing');
    } finally {
      setEditorLoading(false);
    }
  };

  const closeEditor = () => {
    setEditor(null);
    setEditorError(null);
  };

  const updateEditorOption = (index: number, patch: Partial<EditorOption>) => {
    setEditor((prev) => {
      if (!prev) return prev;
      const options = prev.options.map((o, i) => (i === index ? { ...o, ...patch } : o));
      // Only one option can be the correct answer.
      if (patch.is_correct) {
        options.forEach((o, i) => {
          if (i !== index) o.is_correct = false;
        });
      }
      return { ...prev, options };
    });
  };

  const addOptionRow = () => {
    setEditor((prev) => {
      if (!prev) return prev;
      if (prev.options.length >= OPTION_LABELS.length) return prev;
      const nextLabel = OPTION_LABELS[prev.options.length];
      return {
        ...prev,
        options: [...prev.options, { option_label: nextLabel, option_text: '', is_correct: false }],
      };
    });
  };

  const removeOptionRow = (index: number) => {
    setEditor((prev) => {
      if (!prev || prev.options.length <= 2) return prev;
      return { ...prev, options: prev.options.filter((_, i) => i !== index) };
    });
  };

  const saveEditor = async () => {
    if (!editor) return;

    const topicIdNum = Number(editor.topic_id);
    if (!editor.topic_id || !Number.isFinite(topicIdNum) || topicIdNum <= 0) {
      setEditorError('A valid Topic ID is required.');
      return;
    }
    if (!editor.question_text.trim()) {
      setEditorError('Question text is required.');
      return;
    }
    const filled = editor.options.filter((o) => o.option_text.trim());
    if (filled.length < 2) {
      setEditorError('At least two options with text are required.');
      return;
    }
    if (!filled.some((o) => o.is_correct)) {
      setEditorError('Mark one option as the correct answer.');
      return;
    }

    setEditorSaving(true);
    setEditorError(null);
    try {
      const payload = {
        topic_id: topicIdNum,
        question_text: editor.question_text.trim(),
        explanation: editor.explanation.trim() || null,
        difficulty: editor.difficulty,
        marks: editor.marks,
        is_pyq: editor.is_pyq,
        year: editor.year ? Number(editor.year) : null,
        shift: editor.shift.trim() || null,
        options: filled.map((o) => ({
          option_label: o.option_label,
          option_text: o.option_text.trim(),
          is_correct: o.is_correct,
        })),
      };

      if (editor.id) {
        await adminAPI.updateQuestion(editor.id, payload);
      } else {
        await adminAPI.createQuestion(payload);
      }

      closeEditor();
      await fetchQuestions();
    } catch (err: any) {
      setEditorError(err?.response?.data?.detail || 'Failed to save the question.');
    } finally {
      setEditorSaving(false);
    }
  };

  // ── JSON import ────────────────────────────────────────────────────────────

  const parseImportPayload = (): any[] | null => {
    const trimmed = importText.trim();
    if (!trimmed) {
      setImportError('Paste a JSON array of questions first.');
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
      setImportError('Expected a JSON array, or an object with a "questions" array.');
      return null;
    } catch {
      setImportError('That is not valid JSON. Check for trailing commas or unquoted keys.');
      return null;
    }
  };

  const runValidation = async () => {
    const items = parseImportPayload();
    if (!items) return;

    setImportBusy(true);
    setImportError(null);
    try {
      const result = await adminAPI.validateQuestionImport(
        items,
        importTopicId ? Number(importTopicId) : undefined
      );
      setValidation(result);
      setImportStep('review');
    } catch (err: any) {
      setImportError(err?.response?.data?.detail || 'Validation request failed.');
    } finally {
      setImportBusy(false);
    }
  };

  const commitImport = async () => {
    const items = parseImportPayload();
    if (!items) return;

    setImportBusy(true);
    setImportError(null);
    try {
      const result = await adminAPI.importQuestions(
        items,
        importTopicId ? Number(importTopicId) : undefined
      );
      setImportResult(result);
      setImportStep('done');
      await fetchQuestions();
    } catch (err: any) {
      setImportError(err?.response?.data?.detail || 'Import request failed.');
    } finally {
      setImportBusy(false);
    }
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportStep('paste');
    setImportText('');
    setImportTopicId('');
    setValidation(null);
    setImportResult(null);
    setImportError(null);
  };

  const invalidRows = useMemo(
    () => (validation?.results || []).filter((r) => !r.valid),
    [validation]
  );

  const canPrev = page > 1;
  const canNext = page < totalPages && totalPages > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-800">Question Bank</h1>

        <div className="flex items-center gap-2">
          <Button onClick={fetchQuestions} variant="outline" className="flex items-center gap-2">
            <Icons.RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={() => setImportOpen(true)} variant="outline" className="flex items-center gap-2">
            <Icons.Upload className="w-4 h-4" /> Import JSON
          </Button>
          <Button onClick={openCreateEditor} className="flex items-center gap-2">
            <Icons.PenTool className="w-4 h-4" /> Add Question
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end justify-between flex-wrap">
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
                  placeholder="Question text"
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
                  Search
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject ID</label>
              <input
                type="number"
                value={subjectId}
                onChange={(e) => {
                  setPage(1);
                  setSubjectId(e.target.value);
                  setChapterId('');
                  setTopicId('');
                }}
                placeholder="All"
                className="w-28 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Chapter ID</label>
              <input
                type="number"
                value={chapterId}
                onChange={(e) => {
                  setPage(1);
                  setChapterId(e.target.value);
                  setTopicId('');
                }}
                placeholder="All"
                className="w-28 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Topic ID</label>
              <input
                type="number"
                value={topicId}
                onChange={(e) => {
                  setPage(1);
                  setTopicId(e.target.value);
                }}
                placeholder="All"
                className="w-28 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => {
                  setPage(1);
                  setDifficulty(e.target.value);
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">PYQ</label>
              <select
                value={pyqFilter}
                onChange={(e) => {
                  setPage(1);
                  setPyqFilter(e.target.value);
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="true">PYQ only</option>
                <option value="false">Non-PYQ only</option>
              </select>
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      ) : (
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No questions match these filters. Try resetting them, or import a JSON batch.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {questions.map((q) => (
                <div key={q.id} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        ID: {q.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          DIFFICULTY_BADGE[q.difficulty] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      {q.is_pyq && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          PYQ {q.year ?? ''} {q.shift ?? ''}
                        </span>
                      )}
                      {q.topic_name && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                          {q.topic_name}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 font-medium line-clamp-2">{q.question_text}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {q.option_count} options &middot; {q.marks} mark{q.marks === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEditEditor(q.id)}
                      title="Edit question"
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Icons.Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(q)}
                      title="Delete question"
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Icons.X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 flex items-center justify-between border-t border-slate-100">
            <div className="text-sm text-slate-600">
              Page <span className="font-semibold">{page}</span> of{' '}
              <span className="font-semibold">{totalPages || 0}</span> &middot;{' '}
              <span className="font-semibold">{totalItems}</span> questions
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

      {/* ── Question editor modal ── */}
      {editorLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="bg-white p-6 rounded-lg text-slate-600">Loading question...</div>
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {editor.id ? `Edit Question #${editor.id}` : 'Add Question'}
              </h2>
              <button onClick={closeEditor} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {editorError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{editorError}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Topic ID *</label>
                  <input
                    type="number"
                    value={editor.topic_id}
                    onChange={(e) => setEditor({ ...editor, topic_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={editor.difficulty}
                    onChange={(e) =>
                      setEditor({ ...editor, difficulty: e.target.value as EditorState['difficulty'] })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={editor.marks}
                    onChange={(e) => setEditor({ ...editor, marks: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question Text *</label>
                <textarea
                  value={editor.question_text}
                  onChange={(e) => setEditor({ ...editor, question_text: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Options</label>
                <p className="text-xs text-slate-500 mb-2">
                  Fill the option text and use the radio to mark the correct answer.
                </p>
                <div className="space-y-2">
                  {editor.options.map((option, index) => (
                    <div key={option.option_label} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={option.is_correct}
                        onChange={() => updateEditorOption(index, { is_correct: true })}
                        title="Mark as correct"
                      />
                      <span className="w-6 text-sm font-semibold text-slate-500">{option.option_label}</span>
                      <input
                        value={option.option_text}
                        onChange={(e) => updateEditorOption(index, { option_text: e.target.value })}
                        placeholder={`Option ${option.option_label}`}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                      />
                      <button
                        onClick={() => removeOptionRow(index)}
                        disabled={editor.options.length <= 2}
                        className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-40 disabled:hover:text-slate-400"
                      >
                        <Icons.X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {editor.options.length < OPTION_LABELS.length && (
                  <Button size="sm" variant="ghost" onClick={addOptionRow} className="mt-2">
                    + Add option
                  </Button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
                <textarea
                  value={editor.explanation}
                  onChange={(e) => setEditor({ ...editor, explanation: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  placeholder="Shown to the student after answering."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editor.is_pyq}
                    onChange={(e) => setEditor({ ...editor, is_pyq: e.target.checked })}
                  />
                  Previous Year Question
                </label>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={editor.year}
                    onChange={(e) => setEditor({ ...editor, year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Shift</label>
                  <input
                    value={editor.shift}
                    onChange={(e) => setEditor({ ...editor, shift: e.target.value })}
                    placeholder="e.g. Paper 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <Button variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
              <Button onClick={saveEditor} disabled={editorSaving}>
                {editorSaving ? 'Saving...' : editor.id ? 'Save changes' : 'Create question'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── JSON import modal ── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Import Questions from JSON</h2>
              <button onClick={closeImport} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {importError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{importError}</div>}

              {importStep === 'paste' && (
                <>
                  <p className="text-sm text-slate-600">
                    Paste a JSON array. Each entry needs <code className="text-slate-800">question_text</code>,{' '}
                    <code className="text-slate-800">options</code> (an object keyed{' '}
                    <code className="text-slate-800">A</code>–<code className="text-slate-800">F</code>) and{' '}
                    <code className="text-slate-800">correct_answer</code>. Nothing is written until you confirm the
                    import.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Default Topic ID (optional, for entries without their own topic_id)
                    </label>
                    <input
                      type="number"
                      value={importTopicId}
                      onChange={(e) => setImportTopicId(e.target.value)}
                      placeholder="e.g. 12"
                      className="w-40 px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">JSON payload</label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      rows={14}
                      placeholder={`[\n  {\n    "question_text": "...",\n    "topic_id": 1,\n    "difficulty": "medium",\n    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },\n    "correct_answer": "A"\n  }\n]`}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
                    />
                  </div>
                </>
              )}

              {importStep === 'review' && validation && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-slate-800">{validation.total}</div>
                      <div className="text-xs uppercase text-slate-500 font-semibold">Rows parsed</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-emerald-600">{validation.valid_count}</div>
                      <div className="text-xs uppercase text-emerald-700 font-semibold">Valid</div>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{validation.invalid_count}</div>
                      <div className="text-xs uppercase text-red-700 font-semibold">Invalid</div>
                    </div>
                  </div>

                  {validation.invalid_count > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-2">
                        Review queue &mdash; {invalidRows.length} row(s) will be skipped
                      </h3>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                        {invalidRows.map((row) => (
                          <div key={row.index} className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                Row {row.index + 1}
                              </span>
                              <Icons.AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            </div>
                            {row.preview && (
                              <p className="text-sm text-slate-600 line-clamp-2 mb-1">{row.preview}</p>
                            )}
                            <ul className="list-disc list-inside text-xs text-red-600">
                              {row.errors.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Fix these rows in your source JSON and re-run validation, or import anyway to write only the
                        valid rows.
                      </p>
                    </div>
                  )}

                  {validation.valid_count > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-2">Valid rows</h3>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                        {validation.results
                          .filter((r) => r.valid)
                          .map((row) => (
                            <div key={row.index} className="p-2 flex items-start gap-2">
                              <Icons.CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              <span className="text-xs text-slate-500 shrink-0">Row {row.index + 1}</span>
                              <span className="text-sm text-slate-700">{row.preview}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {importStep === 'done' && importResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg">
                    <Icons.CheckCircle className="w-5 h-5" />
                    <span>
                      Imported {importResult.created} question{importResult.created === 1 ? '' : 's'}.
                    </span>
                  </div>

                  {importResult.skipped > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-2">
                        Skipped rows ({importResult.skipped})
                      </h3>
                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                        {importResult.errors.map((e) => (
                          <div key={e.index} className="p-2 text-sm">
                            <span className="text-xs text-slate-500 mr-2">Row {e.index + 1}</span>
                            <span className="text-red-600">{e.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              {importStep === 'paste' && (
                <>
                  <Button variant="outline" onClick={closeImport}>
                    Cancel
                  </Button>
                  <Button onClick={runValidation} disabled={importBusy}>
                    {importBusy ? 'Validating...' : 'Validate JSON'}
                  </Button>
                </>
              )}

              {importStep === 'review' && (
                <>
                  <Button variant="outline" onClick={() => setImportStep('paste')}>
                    Back
                  </Button>
                  <Button
                    onClick={commitImport}
                    disabled={importBusy || (validation?.valid_count ?? 0) === 0}
                  >
                    {importBusy
                      ? 'Importing...'
                      : `Import ${validation?.valid_count ?? 0} question${
                          validation?.valid_count === 1 ? '' : 's'
                        }`}
                  </Button>
                </>
              )}

              {importStep === 'done' && (
                <Button onClick={closeImport}>Close</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
