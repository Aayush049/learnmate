import { useState, useEffect } from "react";
import {
  Notebook,
  FileText,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  Check,
} from "lucide-react";
import PageIntro from "../components/common/PageIntro";
import { notesAPI } from "../../api/notes";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({ title: "", content: "" });

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const data = await notesAPI.getNotes();
      setNotes(data);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;

    try {
      if (editingId) {
        const data = await notesAPI.updateNote(editingId, formData);
        setNotes(notes.map((n) => (n.id === editingId ? data : n)));
      } else {
        const data = await notesAPI.createNote(formData);
        setNotes([data, ...notes]);
      }
      resetForm();
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await notesAPI.deleteNote(id);
      setNotes(notes.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ title: "", content: "" });
  };

  const startEdit = (note) => {
    setFormData({ title: note.title, content: note.content || "" });
    setEditingId(note.id);
    setIsCreating(true);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 gap-4">
        <PageIntro
          title="My Notes"
          subtitle="Keep your concepts and formulas handy"
          className="mb-0"
        />
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="primary-button flex items-center justify-center gap-2 md:w-auto"
          >
            <Plus size={18} />
            New Note
          </button>
        )}
      </div>

      {isCreating && (
        <div className="card mb-8 border-blue-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">
              {editingId ? "Edit Note" : "Create New Note"}
            </h3>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Note Title"
            className="w-full px-4 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />
          <textarea
            placeholder="Write your notes here... (Markdown supported)"
            className="w-full px-4 py-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none h-48 resize-y"
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={resetForm}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.title.trim()}
              className="primary-button flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={18} />
              Save Note
            </button>
          </div>
        </div>
      )}

      {!isCreating && (
        <>
          <div className="relative mb-6">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 border rounded-full focus:ring-2 focus:ring-blue-500 outline-none max-w-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="mx-auto text-slate-300 mb-3" size={48} />
              <h3 className="text-lg font-medium">No notes found</h3>
              <p className="text-slate-500 mt-1">
                {searchTerm
                  ? "Try a different search term"
                  : "Click 'New Note' to start writing."}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="card hover:shadow-md transition-shadow flex flex-col h-64"
                >
                  <div className="flex justify-between items-start mb-2 group">
                    <h3
                      className="font-semibold text-lg line-clamp-1 flex-1 pr-2"
                      title={note.title}
                    >
                      {note.title}
                    </h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(note)}
                        className="p-1 text-slate-400 hover:text-blue-500"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mb-3">
                    {new Date(
                      note.updated_at || note.created_at,
                    ).toLocaleDateString()}
                  </div>
                  <div className="text-slate-600 text-sm flex-1 overflow-hidden relative">
                    {note.content ? (
                      <div className="whitespace-pre-wrap">{note.content}</div>
                    ) : (
                      <span className="italic text-slate-400">Empty note</span>
                    )}
                    <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
