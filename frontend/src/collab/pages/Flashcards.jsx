import { useState, useEffect } from "react";
import {
  Plus,
  X,
  Loader2,
  Save,
  Trash2,
  Edit3,
  ArrowRight,
  Layers,
} from "lucide-react";
import PageIntro from "../components/common/PageIntro";
import { flashcardsAPI } from "../../api/flashcards";

export default function Flashcards() {
  const [activeTab, setActiveTab] = useState("review"); // 'review' | 'manage'

  const [flashcards, setFlashcards] = useState([]);
  const [dueCards, setDueCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review State
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  // Manage State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState({
    id: null,
    front: "",
    back: "",
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const [all, due] = await Promise.all([
        flashcardsAPI.getFlashcards(),
        flashcardsAPI.getDueFlashcards(),
      ]);
      setFlashcards(all);
      setDueCards(due);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (success) => {
    if (!dueCards.length || currentReviewIndex >= dueCards.length) return;

    const card = dueCards[currentReviewIndex];
    setShowBack(false);

    // Optimistically move to next card
    setCurrentReviewIndex((prev) => prev + 1);

    try {
      await flashcardsAPI.reviewFlashcard(card.id, success);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCard = async () => {
    if (!editingCard.front.trim() || !editingCard.back.trim()) return;
    try {
      if (editingCard.id) {
        await flashcardsAPI.updateFlashcard(editingCard.id, {
          front: editingCard.front,
          back: editingCard.back,
        });
      } else {
        await flashcardsAPI.createFlashcard({
          front: editingCard.front,
          back: editingCard.back,
        });
      }
      setIsModalOpen(false);
      setEditingCard({ id: null, front: "", back: "" });
      fetchCards(); // Refresh lists
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this flashcard permanently?")) return;
    try {
      await flashcardsAPI.deleteFlashcard(id);
      fetchCards();
    } catch (err) {
      console.error(err);
    }
  };

  const openNewCardModal = () => {
    setEditingCard({ id: null, front: "", back: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (card) => {
    setEditingCard({ id: card.id, front: card.front, back: card.back });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="page flex h-[50vh] items-center justify-center text-gray-500">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="page">
      <PageIntro
        title="Spaced Repetition Flashcards"
        subtitle="Master formulas, concepts and facts efficiently."
      />

      <div className="flex gap-4 mb-8 border-b pb-4">
        <button
          className={`font-medium px-4 py-2 rounded-lg flex gap-2 items-center ${activeTab === "review" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          onClick={() => setActiveTab("review")}
        >
          <Layers size={18} /> Review Due (
          {dueCards.length - currentReviewIndex > 0
            ? dueCards.length - currentReviewIndex
            : 0}
          )
        </button>
        <button
          className={`font-medium px-4 py-2 rounded-lg ${activeTab === "manage" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          onClick={() => setActiveTab("manage")}
        >
          Manage Cards ({flashcards.length})
        </button>
        <button
          className="ml-auto flex gap-2 items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
          onClick={openNewCardModal}
        >
          <Plus size={18} /> New Card
        </button>
      </div>

      {activeTab === "review" && (
        <div className="max-w-2xl mx-auto mt-12">
          {dueCards.length > 0 && currentReviewIndex < dueCards.length ? (
            <div className="card text-center p-12 min-h-[400px] flex flex-col justify-center items-center shadow-lg relative bg-white border border-gray-200 rounded-2xl">
              <span className="absolute top-4 left-4 text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full tracking-wider uppercase">
                Card {currentReviewIndex + 1} of {dueCards.length}
              </span>

              {!showBack ? (
                <>
                  <div className="text-sm font-semibold text-indigo-500 mb-6 tracking-widest uppercase">
                    Question / Prompt
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 leading-tight mb-8">
                    {dueCards[currentReviewIndex].front}
                  </h2>
                  <button
                    className="mt-8 bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl shadow hover:bg-blue-700 flex items-center gap-2"
                    onClick={() => setShowBack(true)}
                  >
                    Show Answer <ArrowRight size={18} />
                  </button>
                </>
              ) : (
                <div className="w-full">
                  <div className="text-sm font-semibold text-green-600 mb-4 tracking-widest uppercase">
                    Answer
                  </div>
                  <div className="text-xl text-gray-700 font-medium mb-12 whitespace-pre-wrap bg-green-50 p-6 rounded-xl border border-green-100">
                    {dueCards[currentReviewIndex].back}
                  </div>
                  <div className="flex gap-4 justify-center">
                    <button
                      className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-3 px-8 rounded-xl flex-1 max-w-[200px]"
                      onClick={() => handleReview(false)}
                    >
                      ✕ Again (Fail)
                    </button>
                    <button
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-3 px-8 rounded-xl flex-1 max-w-[200px]"
                      onClick={() => handleReview(true)}
                    >
                      ✓ Good (Pass)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-16 card bg-green-50 border-green-100">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-green-800 mb-2">
                You're all caught up!
              </h3>
              <p className="text-green-700">
                No more cards due for review right now.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "manage" && (
        <div>
          {flashcards.length === 0 ? (
            <div className="text-center p-12 text-gray-500 border-2 border-dashed rounded-xl">
              No flashcards created yet. Click "New Card" to begin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {flashcards.map((card) => (
                <div
                  key={card.id}
                  className="card p-5 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="font-semibold text-gray-800 line-clamp-2">
                      {card.front}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(card)}
                        className="text-gray-400 hover:text-blue-600 p-1"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg line-clamp-3">
                    {card.back}
                  </div>
                  <div className="mt-4 flex gap-4 text-xs font-medium text-gray-500 uppercase tracking-widest">
                    <span>Box: {card.box}</span>
                    <span>
                      Due: {new Date(card.next_review_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {editingCard.id ? "Edit Flashcard" : "Create Flashcard"}
              </h3>
              <button
                className="text-gray-400 hover:text-gray-800 transition"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Front (Question / Prompt)
                </label>
                <textarea
                  className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y min-h-[100px]"
                  placeholder="e.g. What is Darcy's Law?"
                  value={editingCard.front}
                  onChange={(e) =>
                    setEditingCard({ ...editingCard, front: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Back (Answer)
                </label>
                <textarea
                  className="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y min-h-[150px]"
                  placeholder="e.g. V = k * i (Velocity is proportional to hydraulic gradient)"
                  value={editingCard.back}
                  onChange={(e) =>
                    setEditingCard({ ...editingCard, back: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
              <button
                className="px-5 py-2.5 font-medium rounded-lg text-gray-600 hover:bg-gray-200"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="flex items-center gap-2 px-5 py-2.5 font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!editingCard.front.trim() || !editingCard.back.trim()}
                onClick={handleSaveCard}
              >
                <Save size={18} />{" "}
                {editingCard.id ? "Save Changes" : "Create Card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
