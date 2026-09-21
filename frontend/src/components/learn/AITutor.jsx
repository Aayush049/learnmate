import { Bot, Sparkles, MessageSquare, BookOpen, Clock } from "lucide-react";

export default function AITutor() {
  return (
    <div className="page flex items-center justify-center min-h-[80vh]">
      <div className="max-w-2xl w-full text-center px-6 py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
        
        <div className="relative inline-flex mb-8">
          <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-60"></div>
          <div className="relative bg-gradient-to-tr from-blue-600 to-indigo-600 w-24 h-24 rounded-2xl flex items-center justify-center transform rotate-3 shadow-lg">
            <Bot size={40} className="text-white transform -rotate-3" />
          </div>
          <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Sparkles size={12} /> SOON
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Your Personal <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI Civil Engineering</span> Tutor
        </h1>
        
        <p className="text-gray-600 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          We're hard at work training our advanced AI models specifically on SSC JE and ESE civil engineering concepts to help you study smarter.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-left">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <MessageSquare size={20} className="text-blue-500 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">Instant Doubt Solving</h3>
            <p className="text-xs text-gray-500">Stuck on a tricky soil mechanics numerical? Get step-by-step guidance instantly.</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <BookOpen size={20} className="text-indigo-500 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">Concept Simplifier</h3>
            <p className="text-xs text-gray-500">Complex IS Code provisions explained with simple, real-world examples.</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <Clock size={20} className="text-purple-500 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">24/7 Availability</h3>
            <p className="text-xs text-gray-500">Your dedicated study partner, ready whenever you sit down to prepare.</p>
          </div>
        </div>

        <div className="inline-block bg-blue-50 border border-blue-100 px-6 py-3 rounded-full">
          <span className="text-blue-700 font-medium text-sm">
            🚀 Coming in Version 2.0! Stay tuned.
          </span>
        </div>
      </div>
    </div>
  );
}
