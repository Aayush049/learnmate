import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { BookOpen, Timer, BarChart2, Bot } from 'lucide-react';
import engineerImg from '../../assets/engineerimg.png';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="text-2xl font-bold text-purple-600">LearnMate AI</div>
        <div className="hidden md:flex space-x-8 text-gray-600 font-medium">
          <a href="#" className="hover:text-purple-600 transition">Home</a>
          <a href="#" className="hover:text-purple-600 transition">Features</a>
          <a href="#" className="hover:text-purple-600 transition">About</a>
          <a href="#" className="hover:text-purple-600 transition">Contact</a>
        </div>
        <div className="space-x-4">
          <Button variant="ghost" onClick={() => navigate('/login')} className="text-gray-600">Log in</Button>
          <Button variant="primary" onClick={() => navigate('/register')} className="bg-purple-600 hover:bg-purple-700">Sign up</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-8 py-16 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-6">
          <span className="text-sm font-semibold tracking-wider text-purple-600 uppercase">SSC JE CIVIL • SMART PREPARATION</span>
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">Master SSC JE Civil Engineering.</h1>
          <p className="text-xl text-gray-700 font-medium">Prepare smarter. Practice better. Crack it.</p>
          <p className="text-gray-600 max-w-lg">Everything you need for SSC JE Civil preparation — PYQs, mock tests, performance tracking and personalized learning.</p>
          <div className="flex gap-4">
            <Button variant="primary" size="lg" onClick={() => navigate('/register')} className="bg-purple-600 hover:bg-purple-700">Start Preparing →</Button>
            <Button variant="outline" size="lg" className="border-gray-200 text-gray-700 hover:bg-gray-50">Explore Features</Button>
          </div>
        </div>
        <div className="flex-1 w-full">
          <img src={engineerImg} alt="Engineering Illustration" className="w-full max-w-lg mx-auto object-contain" />
        </div>
      </main>

      {/* Features Section */}
      <section className="container mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-16">Everything You Need to Prepare</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureBlock icon={BookOpen} title="Question Bank" desc="1000+ SSC JE Civil PYQs covering the complete syllabus." />
          <FeatureBlock icon={Timer} title="Mock Tests" desc="Practice with realistic exam simulations and timed tests." />
          <FeatureBlock icon={BarChart2} title="Performance Analytics" desc="Track accuracy, weak subjects and preparation progress." />
          <FeatureBlock icon={Bot} title="AI Tutor" desc="Get personalized guidance based on your preparation." />
        </div>
      </section>
    </div>
  );
};

const FeatureBlock = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <div className="p-6 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition bg-white">
    <Icon className="text-purple-600 mb-4" size={32} />
    <h3 className="font-semibold text-lg mb-2">{title}</h3>
    <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
  </div>
);
