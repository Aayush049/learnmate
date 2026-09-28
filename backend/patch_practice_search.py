import re

file_path = "C:/Users/ELYSIUM/Documents/VSCODE/learnmate/frontend/src/collab/components/learn/PracticeQuestions.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add Search to imports from lucide-react
text = text.replace(
    'import {\n  AlertCircle,\n  CheckCircle2,\n  XCircle,\n  BookOpen,\n  Target,\n  TrendingUp,\n  Hash,\n} from "lucide-react";',
    'import {\n  AlertCircle,\n  CheckCircle2,\n  XCircle,\n  BookOpen,\n  Target,\n  TrendingUp,\n  Hash,\n  Search\n} from "lucide-react";'
)

# 2. Add searchQuery state inside the component
state_code = """
  // ── Engine ─────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
"""
text = text.replace(
    '  // ── Engine ─────────────────────────────────────────────────────────────────\n  const [activeIndex, setActiveIndex] = useState(0);',
    state_code
)

# 3. Filter the questions rendered in the palette
palette_start = r"\{(isPyq \? questionIndex : questions)\.map\(\(q, idx\) => \{"
replacement = """
              {(() => {
                const sourceList = isPyq ? questionIndex : questions;
                const filteredList = sourceList.map((q, idx) => ({ ...q, originalIndex: idx })).filter((q) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  
                  // if pyq index has subject/topic
                  if (q.subject && q.subject.toLowerCase().includes(query)) return true;
                  if (q.topic && q.topic.toLowerCase().includes(query)) return true;
                  
                  // if full questions list has those fields
                  if (q.subject_name && q.subject_name.toLowerCase().includes(query)) return true;
                  if (q.topic_name && q.topic_name.toLowerCase().includes(query)) return true;
                  
                  // if searching for exact question number
                  const numStr = (isPyq && q.number) ? q.number.toString() : (q.originalIndex + 1).toString();
                  if (numStr === query) return true;
                  
                  // if full question has question_text
                  if (q.question_text && q.question_text.toLowerCase().includes(query)) return true;
                  
                  return false;
                });
                
                if (filteredList.length === 0) {
                  return <div className="col-span-5 text-gray-400 text-xs text-center py-4">No matches</div>;
                }
                
                return filteredList.map((q) => {
                  const idx = q.originalIndex;
                  const status = getQuestionStatus(q);
                  const isActive = idx === activeIndex;

                  let cls = "palette-number";
                  if (isActive) cls += " current";
                  else if (status === "correct") cls += " correct";
                  else if (status === "wrong") cls += " wrong";

                  const displayNumber = isPyq && q?.number ? q.number : idx + 1;

                  return (
                    <button
                      key={q.id}
                      ref={isActive ? activeListItemRef : null}
                      className={cls}
                      onClick={() => setActiveIndex(idx)}
                      title={q.topic ? `${q.subject || ''} > ${q.topic}` : `Question ${displayNumber}`}
                      style={{ fontSize: "11px", fontWeight: 600 }}
                    >
                      {displayNumber}
                    </button>
                  );
                });
              })()}
"""
text = re.sub(r'\{\(isPyq \? questionIndex : questions\)\.map\(\(q, idx\) => \{[\s\S]*?\}\)\}', replacement.strip(), text)

# 4. Add the search bar to the UI above palette grid
search_ui = """
          <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Questions</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search subject, topic, or #..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
"""
text = text.replace(
    '<div className="px-4 pt-4 pb-2 border-b border-gray-100">\n            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Questions</p>\n          </div>',
    search_ui.strip()
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

