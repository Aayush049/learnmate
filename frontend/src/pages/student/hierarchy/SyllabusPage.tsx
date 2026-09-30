import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckSquare, Square } from 'lucide-react';
import { Topbar } from '../../../components/layout/Topbar';
import { Card } from '../../../components/ui/Card';
import { hierarchyAPI } from '../../../api/hierarchy';
import type { SubjectWithChapters, ChapterWithTopics, TopicSimple } from '../../../types';

const TopicCheckbox = ({ topicId }: { topicId: number }) => {
  const [checked, setChecked] = useState(false);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className="p-1 rounded-lg hover:bg-[var(--bg-color)] transition-colors"
      aria-label={`${checked ? 'Uncheck' : 'Check'} ${topicId}`}
    >
      {checked ? (
        <CheckSquare size={20} className="text-[var(--primary-color)]" />
      ) : (
        <Square size={20} className="text-[var(--text-muted)]/40" />
      )}
    </button>
  );
};

export const SyllabusPage: React.FC = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<SubjectWithChapters | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubject = async () => {
      if (!subjectId) return;
      try {
        setLoading(true);
        const data = await hierarchyAPI.getSubjectById(Number(subjectId));
        setSubject(data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSubject();
  }, [subjectId]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-muted)] font-medium">Loading syllabus...</div>
      </div>
    );
  }

  return (
    <>
      <Topbar title={`${subject?.name || 'Subject'} Syllabus`} />
      <div className="flex-1 overflow-auto p-6 max-w-6xl mx-auto">
        <button className="mb-6 flex items-center text-[var(--text-muted)] hover:text-[var(--primary-color)] transition-colors font-medium text-sm gap-1" onClick={() => navigate(`/branches/${subject?.branch_id}/subjects`)}>
          <span>&larr;</span> Back to Subjects
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">Chapters & Topics</h2>
          <p className="text-[var(--text-muted)] mt-2 text-lg">Select a topic to start your practice session.</p>
        </div>

        {subject?.chapters && subject.chapters.length > 0 ? (
          <div className="space-y-6">
            {subject.chapters.map((chapter: ChapterWithTopics) => (
              <Card key={chapter.id} className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] bg-[var(--card-gradient)] shadow-sm hover:border-[var(--primary-color)]/30 transition-all">
                <h3 className="text-xl font-bold mb-2 text-[var(--text-main)]">{chapter.name}</h3>
                {chapter.description && <p className="text-[var(--text-muted)] mb-6 text-sm">{chapter.description}</p>}

                <div className="space-y-2">
                  {chapter.topics && chapter.topics.length > 0 ? (
                    chapter.topics.map((topic: TopicSimple, index: number) => (
                      <div key={topic.id} className="flex items-center justify-between p-3.5 rounded-xl hover:bg-[var(--bg-color)]/40 border border-[var(--border-color)]/60 hover:border-[var(--primary-color)]/40 transition-all group">
                        <div className="flex items-center gap-4 cursor-pointer flex-grow" onClick={() => navigate(`/practice?topic_id=${topic.id}`)}>
                          <span className="text-xs font-mono font-bold text-[var(--text-muted)]/60 w-12">
                            {subject?.display_order ? `${subject.display_order}.${topic.display_order || index + 1}` : String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-color)] transition-colors">{topic.name}</span>
                        </div>
                        <TopicCheckbox topicId={topic.id} />
                      </div>
                    ))
                  ) : (
                    <p className="text-[var(--text-muted)] text-sm italic">No topics found in this chapter.</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)]">
            No chapters mapped for this subject yet.
          </div>
        )}
      </div>
    </>
  );
};
