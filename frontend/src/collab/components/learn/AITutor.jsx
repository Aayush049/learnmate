import { useState, useRef, useEffect } from "react";
import { Bot, User, Loader2 } from "lucide-react";
import PageIntro from "../common/PageIntro";
import { aiTutorAPI } from "../../../api/aiTutor";

export default function AITutor() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: "ai",
      text:
        "Hi! I'm your LearnMate Civil AI Tutor. Ask me any doubts regarding SSC JE Civil Engineering concepts!"
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", text: input };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const data = await aiTutorAPI.solveDoubt(userMessage.text);
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: data.answer
        }
      ]);
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || "Sorry, I am having trouble connecting to the AI service right now.";
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: errorMessage
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <PageIntro
        title="Civil AI Tutor"
        subtitle="Ask doubts from SSC JE Civil, reasoning or general awareness."
      />

      <section className="card chat-card flex flex-col" style={{ height: '600px', maxHeight: '70vh' }}>
        <div className="chat-messages flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {messages.map((message, index) => (
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} key={index}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <div className="flex items-center gap-2 mb-1 opacity-80 text-xs">
                  {message.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  {message.role === 'user' ? 'You' : 'AI Tutor'}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
               <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-800 rounded-bl-none flex items-center gap-2">
                 <Loader2 size={16} className="animate-spin text-gray-500" />
                 <span className="text-sm text-gray-500">Thinking...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input p-4 border-t flex gap-2">
          <input
            className="flex-1 px-4 py-2 border rounded-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && send()}
            placeholder="Ask a Civil Engineering doubt..."
            disabled={loading}
          />
          <button
            className="primary-button !rounded-full !px-4 !py-2 flex items-center justify-center disabled:opacity-50"
            onClick={send}
            disabled={!input.trim() || loading}
          >
            <Bot size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
