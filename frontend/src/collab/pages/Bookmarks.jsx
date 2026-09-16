import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Clock, CheckCircle, Search, Trash2 } from "lucide-react";
import PageIntro from "../components/common/PageIntro";
import { bookmarksAPI } from "../../api/bookmarks";

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const data = await bookmarksAPI.getAllBookmarks();
      setBookmarks(data);
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (questionId) => {
    try {
      await bookmarksAPI.deleteBookmark(questionId);
      setBookmarks(bookmarks.filter((b) => b.question_id !== questionId));
    } catch (err) {
      console.error("Failed to remove bookmark:", err);
    }
  };

  const filteredBookmarks = bookmarks.filter((b) =>
    b.question?.question_text?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="page">
      <PageIntro
        title="My Bookmarks"
        subtitle="Review your saved questions and important topics"
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search bookmarked questions..."
            className="w-full pl-10 pr-4 py-2 border rounded-full focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="card text-center py-12">
          <Bookmark className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="text-lg font-medium">No bookmarks found</h3>
          <p className="text-slate-500 mt-1">
            {searchTerm
              ? "Try a different search term"
              : "Questions you bookmark during practice will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="card hover:border-blue-500 transition-colors flex gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-500">
                  <span className="bg-slate-100 px-2 py-1 rounded">
                    {bookmark.question?.topic?.name || "Topic"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(bookmark.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-medium text-slate-900 mb-2">
                  {bookmark.question?.question_text || "Question text not available."}
                </h3>
              </div>
              <div className="flex flex-col justify-start gap-2">
                <button
                  onClick={() => removeBookmark(bookmark.question_id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove bookmark"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
