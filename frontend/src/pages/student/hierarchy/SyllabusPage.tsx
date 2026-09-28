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
      className="p-1 rounded hover:bg-gray-100 transition-colors"
      aria-label={`${checked ? 'Uncheck' : 'Check'} ${topicId}`}
    >
      {checked ? (
        <CheckSquare size={20} className="text-primary" />
      ) : (
        <Square size={20} className="text-gray-300" />
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

  if (loading) return <div>Loading syllabus...</div>;

  return (
    <>
      <Topbar title={`${subject?.name || 'Subject'} Syllabus`} />
      <div className="flex-1 overflow-auto p-6">
        <button className="mb-6 flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium text-sm" onClick={() => navigate(`/branches/${subject?.branch_id}/subjects`)}>
          <span className="mr-1">&larr;</span> Back to Subjects
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Chapters & Topics</h2>
          <p className="text-gray-600 mt-2">Select a topic to start your practice session.</p>
        </div>

        {subject?.chapters && subject.chapters.length > 0 ? (
          <div className="space-y-6">
            {subject.chapters.map((chapter: ChapterWithTopics) => (
              <Card key={chapter.id} className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">{chapter.name}</h3>
                {chapter.description && <p className="text-gray-600 mb-6">{chapter.description}</p>}

                <div className="space-y-2">
                  {chapter.topics && chapter.topics.length > 0 ? (
                    chapter.topics.map((topic: TopicSimple, index: number) => (
                      <div key={topic.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
                        <div className="flex items-center gap-4 cursor-pointer flex-grow" onClick={() => navigate(`/practice?topic_id=${topic.id}`)}>
                          <span className="text-sm font-mono text-gray-400 w-8">{String(index + 1).padStart(2, '0')}</span>
                          <span className="font-medium text-gray-900">{topic.name}</span>
                        </div>
                        <TopicCheckbox topicId={topic.id} />
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm italic">No topics found in this chapter.</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No chapters mapped for this subject yet.</p>
        )}
      </div>
    </>
  );
};
