with open('../frontend/src/collab/components/learn/PracticeQuestions.jsx', 'r') as f:
    content = f.read()

breadcrumb = """            <div className="flex items-center gap-3">
              {currentQuestion.subject_name && (
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {currentQuestion.subject_name}
                </span>
              )}"""

new_breadcrumb = """            <div className="flex flex-wrap items-center gap-2">
              {currentQuestion.subject_name && (
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {currentQuestion.subject_name}
                </span>
              )}
              {currentQuestion.topic_name && (
                <>
                  <span className="text-gray-400 text-xs">/</span>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded shadow-sm">
                    {currentQuestion.topic_name}
                  </span>
                </>
              )}"""

content = content.replace(breadcrumb, new_breadcrumb)

with open('../frontend/src/collab/components/learn/PracticeQuestions.jsx', 'w') as f:
    f.write(content)
