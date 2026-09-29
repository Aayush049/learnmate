import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  Timer,
  BarChart2,
  Bot,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Award,
  ChevronDown,
  ArrowRight,
  Zap,
  FileText,
  Star,
  Compass,
  Layers,
  Clock,
  Check,
} from 'lucide-react';
import { paymentsAPI, Plan } from '../../api/payments';
import { useAuth } from '../../contexts/AuthContext';
import engineerImg from '../../assets/engineerimg.png';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [activePreviewTab, setActivePreviewTab] = useState<'mocks' | 'pyq' | 'ai'>('mocks');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    async function fetchPricing() {
      try {
        setLoadingPlans(true);
        const data = await paymentsAPI.getPlans();
        setPlans(data);
      } catch (err) {
        console.error('Error fetching plans for landing page:', err);
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPricing();
  }, []);

  const activePlan = plans.find((p) => p.code === 'lifetime') || plans[0];

  const handleCtaClick = () => {
    if (user) {
      navigate('/pricing');
    } else {
      navigate('/register');
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: 'Is this a one-time payment or a recurring subscription?',
      a: 'This is a 100% one-time payment. Once you purchase the SSC JE Civil Full Access pass, you receive permanent lifetime access with zero monthly or annual renewals.',
    },
    {
      q: 'Does this cover both SSC JE Paper 1 and Paper 2 syllabus?',
      a: 'Yes! The preparation suite includes complete topic-wise questions, full-length CBT mock tests for Paper 1 (Technical Civil + Reasoning + General Awareness), and technical deep dives aligned with the latest SSC JE pattern.',
    },
    {
      q: 'Are solutions provided for all PYQs and Mock Tests?',
      a: 'Every single question includes step-by-step mathematical solutions, code clauses from IS 456:2000 and IS 800:2007, conceptual diagrams, and instant AI doubt solving explanations.',
    },
    {
      q: 'How does the AI Candidate Personality & Weakness Profiler work?',
      a: 'Our Gemini-powered AI engine evaluates your speed, accuracy per subject, guessing tendencies, and chapter retention to construct a personalized weakness heatmap and generate customized daily study schedules.',
    },
    {
      q: 'What is the refund and cancellation policy?',
      a: 'We offer a transparent Statutory Refund Policy in compliance with Indian consumer protection standards for technical delivery failures or accidental duplicate charges within 7 days of purchase.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* 1. Header & Navigation */}
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
              ✦
            </div>
            <div>
              <span className="font-black text-2xl bg-gradient-to-r from-gray-900 via-purple-950 to-indigo-900 bg-clip-text text-transparent tracking-tight">
                LearnMate <span className="text-purple-600 font-extrabold text-sm uppercase px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200/60 ml-1">AI</span>
              </span>
              <span className="block text-[10px] text-gray-500 font-semibold tracking-wider uppercase -mt-0.5">
                SSC JE Civil Engineering
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-gray-600">
            <a href="#features" className="hover:text-purple-600 transition-colors">Features</a>
            <a href="#preview" className="hover:text-purple-600 transition-colors">Platform Preview</a>
            <a href="#journey" className="hover:text-purple-600 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-purple-600 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-purple-600 transition-colors">FAQs</a>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <Link
                to="/dashboard"
                className="py-2.5 px-5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-sm transition-all flex items-center gap-1.5"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="py-2.5 px-4 text-sm font-bold text-gray-700 hover:text-purple-600 transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-purple-50/40 via-white to-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Value Tag */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/80 border border-purple-200/80 text-purple-800 text-xs font-bold tracking-wide uppercase shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Specialized SSC JE Civil Preparation 2025/2026
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-[1.12]">
                Master Civil Engineering. <br />
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent">
                  Crack SSC JE with AI.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 font-medium max-w-2xl leading-relaxed">
                The all-in-one preparation engine built specifically for Civil Engineering aspirants. Master authentic PYQs, practice authentic CBT mocks, navigate IS codes, and fix weak topics with personalized AI personality profiling.
              </p>

              {/* Badges / Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>3,500+ Civil PYQs</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Full CBT Test Engine</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white p-2.5 rounded-xl border border-gray-200/80 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>IS 456 & 800 Clauses</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <button
                  onClick={handleCtaClick}
                  className="py-4 px-8 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-base shadow-xl shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  Get Full Lifetime Access — ₹2,999
                </button>
                <a
                  href="#preview"
                  className="py-4 px-6 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-base transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <Compass className="w-4 h-4 text-purple-600" />
                  Explore Platform
                </a>
              </div>

              <div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  One-Time Payment
                </span>
                <span>•</span>
                <span>Zero Recurring Fees</span>
                <span>•</span>
                <span>Instant Access</span>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="absolute -inset-4 bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 rounded-3xl blur-2xl -z-10" />
                <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-2xl space-y-4">
                  <img
                    src={engineerImg}
                    alt="Civil Engineering Aspirant"
                    className="w-full h-auto object-contain rounded-2xl max-h-[360px] mx-auto"
                  />
                  {/* Floating Metric Card */}
                  <div className="bg-gradient-to-br from-gray-900 to-purple-950 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-purple-300 font-bold uppercase">
                        <Award className="w-3.5 h-3.5 text-yellow-400" />
                        Target Score 150+ / 200
                      </div>
                      <p className="text-sm font-extrabold text-white">SSC JE Civil 2025/2026</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-400">99.4%</span>
                      <span className="block text-[10px] text-gray-400 font-medium">Percentile Simulator</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Feature Breakdown Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-purple-600 tracking-widest uppercase mb-3">
              Comprehensive Prep Ecosystem
            </h2>
            <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Everything You Need to Rank in the Top 1%
            </p>
            <p className="mt-3 text-base text-gray-600">
              Stop switching between scattered PDFs, Telegram groups, and random test series. LearnMate provides an end-to-end structured preparation pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-gray-50 to-white border border-gray-200/70 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Authentic PYQ Archive</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Complete database of SSC JE Civil papers from 2017 to 2024. Filter questions by subject, chapter, topic, year, shift, and difficulty with zero duplicate entries.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs font-bold text-purple-600">
                Detailed Solutions Included <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-gray-50 to-white border border-gray-200/70 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Timer className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">CBT Mock Test Simulator</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Exact replica of the TCS iON examination interface. Practice with strict timers, negative marking (-0.25), question palette, and instant real-time all-India percentile ranking.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs font-bold text-indigo-600">
                Exam Interface Replica <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-gray-50 to-white border border-gray-200/70 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">IS 456 & 800 Code Navigator</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Over 40% of SSC JE Civil questions directly test Indian Standard codes. Access clause-wise summaries, design formulas, and tables for RCC and Steel Structures.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs font-bold text-emerald-600">
                Direct Code References <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-gray-50 to-white border border-gray-200/70 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI Candidate Profiling</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Gemini-powered diagnostic engine that analyzes your test speed, accuracy variance, blind spots, and guessing behavior to identify weak topics before exam day.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs font-bold text-purple-600">
                Weakness Heatmaps <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-gray-50 to-white border border-gray-200/70 hover:border-pink-300 hover:shadow-xl hover:shadow-pink-500/5 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 mb-6 group-hover:scale-110 group-hover:bg-pink-600 group-hover:text-white transition-all">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">24/7 AI Tutor Doubt Solving</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Stuck on a tricky Mohr's Circle derivation or Hydrology runoff hydrograph calculation? Get instant, conversational step-by-step guidance tailored for SSC JE aspirants.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs font-bold text-pink-600">
                Instant Explanations <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-gray-50 to-white border border-gray-200/70 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Structured Subject Textbook</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Complete Civil Engineering hierarchy: Building Materials, Surveying, Soil Mechanics, Hydraulics, Environmental, Highway Engineering, SOM, and RCC Theory.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs font-bold text-blue-600">
                12 Core Civil Subjects <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Product Preview */}
      <section id="preview" className="py-20 bg-gray-50 border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-purple-600 tracking-widest uppercase mb-3">
              Experience the Interface
            </h2>
            <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Designed for Speed, Focus & Exam Mastery
            </p>
          </div>

          {/* Preview Navigation Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1.5 rounded-2xl bg-white border border-gray-200 shadow-sm gap-1">
              <button
                onClick={() => setActivePreviewTab('mocks')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  activePreviewTab === 'mocks'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                CBT Mock Test Engine
              </button>
              <button
                onClick={() => setActivePreviewTab('pyq')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  activePreviewTab === 'pyq'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Subject-Wise PYQs
              </button>
              <button
                onClick={() => setActivePreviewTab('ai')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  activePreviewTab === 'ai'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                AI Weakness Profiling
              </button>
            </div>
          </div>

          {/* Interactive Screen Preview Box */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-6 sm:p-8 max-w-5xl mx-auto">
            {activePreviewTab === 'mocks' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div>
                    <span className="text-xs font-bold text-purple-600 uppercase">SSC JE Civil Full Mock #04</span>
                    <h4 className="text-lg font-bold text-gray-900">Question 42 of 200 • Soil Mechanics</h4>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-xl font-mono text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    01:42:15 Remaining
                  </div>
                </div>
                <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200/80">
                  <p className="text-sm font-semibold text-gray-900">
                    A cohesive soil has an unconfined compressive strength of 120 kPa. The shear strength of the soil along the failure plane in kPa is:
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-gray-200 bg-white font-medium hover:border-purple-300 cursor-pointer">
                    A) 120 kPa
                  </div>
                  <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-bold flex items-center justify-between">
                    <span>B) 60 kPa (Correct)</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="p-3.5 rounded-xl border border-gray-200 bg-white font-medium hover:border-purple-300 cursor-pointer">
                    C) 240 kPa
                  </div>
                  <div className="p-3.5 rounded-xl border border-gray-200 bg-white font-medium hover:border-purple-300 cursor-pointer">
                    D) 30 kPa
                  </div>
                </div>
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100 text-xs text-purple-900">
                  <span className="font-bold block mb-1">📘 Solution & IS Concept:</span>
                  For pure cohesive soil (φ = 0), unconfined compressive strength <code className="font-bold">qu = 2c</code>. Therefore cohesion/shear strength <code className="font-bold">c = qu / 2 = 120 / 2 = 60 kPa</code>.
                </div>
              </div>
            )}

            {activePreviewTab === 'pyq' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <span className="font-bold text-gray-500">Filters:</span>
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold">Building Materials</span>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg font-medium">Year: 2024 Shift 1</span>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-medium">Medium Difficulty</span>
                </div>
                <div className="divide-y divide-gray-100 text-left">
                  <div className="py-3">
                    <span className="text-[11px] font-bold text-purple-600 block">SSC JE 2024 • Shift 1</span>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">Which type of cement is recommended for massive concrete works like dams to control heat of hydration?</p>
                    <span className="text-[11px] text-emerald-700 font-bold mt-1 inline-block">✓ Low Heat Portland Cement (IS 12600)</span>
                  </div>
                  <div className="py-3">
                    <span className="text-[11px] font-bold text-purple-600 block">SSC JE 2023 • Shift 2</span>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">The initial setting time of Ordinary Portland Cement (OPC) as per IS 269 should not be less than:</p>
                    <span className="text-[11px] text-emerald-700 font-bold mt-1 inline-block">✓ 30 Minutes</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'ai' && (
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-purple-300">
                    AI
                  </div>
                  <div>
                    <h5 className="text-sm font-bold">Candidate Profiler: "Analytical Thinker with Speed Bottleneck"</h5>
                    <p className="text-xs text-purple-200">High accuracy in RCC & SOM (84%), but average time spent per question is 78s (Target: 45s).</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-red-50/80 rounded-xl border border-red-100">
                    <span className="font-bold text-red-800 block mb-1">⚠️ Critical Focus Areas:</span>
                    <ul className="list-disc list-inside text-red-700 space-y-0.5">
                      <li>Fluid Mechanics: Boundary Layer Theory (38% accuracy)</li>
                      <li>Surveying: Compass Traverse Local Attraction (42% accuracy)</li>
                    </ul>
                  </div>
                  <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-800 block mb-1">🎯 AI Recommended Daily Plan:</span>
                    <p className="text-emerald-700">Solve 25 Fluid Dynamics PYQs + 1 Timed Sectional Test in Highway Engineering today.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. How It Works (Step-by-Step Student Journey) */}
      <section id="journey" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-purple-600 tracking-widest uppercase mb-3">
              The Path to Selection
            </h2>
            <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              4 Steps to Cracking SSC JE Civil
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="relative p-6 rounded-2xl bg-gray-50 border border-gray-100 text-left">
              <span className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-base mb-4 shadow-md shadow-purple-500/20">
                1
              </span>
              <h4 className="text-base font-bold text-gray-900 mb-1">Enroll & Unlock</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Activate your lifetime pass with a single one-time payment. Instant access to the entire question bank.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-gray-50 border border-gray-100 text-left">
              <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-base mb-4 shadow-md shadow-indigo-500/20">
                2
              </span>
              <h4 className="text-base font-bold text-gray-900 mb-1">Topic-Wise PYQ Mastery</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Solve authentic past year questions topic by topic, mastering IS 456 and IS 800 codal specifications.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-gray-50 border border-gray-100 text-left">
              <span className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-base mb-4 shadow-md shadow-purple-500/20">
                3
              </span>
              <h4 className="text-base font-bold text-gray-900 mb-1">CBT Simulation & AI Fix</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Simulate full-length 200-question mock tests under strict exam conditions and eliminate identified blind spots.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-gray-50 border border-gray-100 text-left">
              <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-base mb-4 shadow-md shadow-emerald-500/20">
                4
              </span>
              <h4 className="text-base font-bold text-gray-900 mb-1">Clear Cutoff & Rank</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Walk into the examination hall with high confidence, speed mastery, and the target score to secure your Junior Engineer post.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Dynamic Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-b from-purple-50/30 via-white to-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Transparent Pricing • Zero Hidden Costs
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
              One-Time Investment. <br />
              <span className="text-purple-600">Lifetime Junior Engineer Access.</span>
            </h2>
            <p className="mt-4 text-base text-gray-600">
              No recurring monthly charges. No annual renewals. Get the complete SSC JE Civil preparation suite with permanent lifetime access.
            </p>
          </div>

          {/* Pricing Card Container */}
          <div className="max-w-xl mx-auto">
            <div className="relative rounded-3xl bg-white border-2 border-purple-600 p-8 sm:p-10 shadow-2xl shadow-purple-500/10">
              {/* Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md">
                ⭐ ONE-TIME LIFETIME PASS (50% OFF)
              </div>

              <div className="text-center pb-6 border-b border-gray-100">
                <h3 className="text-2xl font-black text-gray-900">
                  {activePlan?.name || 'SSC JE Civil Full Access'}
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  {activePlan?.description || 'Complete lifetime access to questions, mocks, IS codes, and AI profiling.'}
                </p>

                {/* Price Display */}
                <div className="mt-6 flex items-baseline justify-center gap-3">
                  {loadingPlans ? (
                    <span className="text-5xl font-black text-gray-900 tracking-tight animate-pulse">
                      ₹2,999
                    </span>
                  ) : (
                    <>
                      <span className="text-5xl font-black text-gray-900 tracking-tight">
                        ₹{activePlan ? activePlan.price_inr.toLocaleString('en-IN') : '2,999'}
                      </span>
                      <span className="text-xl text-gray-400 line-through font-bold">
                        ₹{activePlan?.original_price_inr ? activePlan.original_price_inr.toLocaleString('en-IN') : '5,999'}
                      </span>
                    </>
                  )}
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mt-2 inline-block">
                  Single One-Time Payment • Lifetime Entitlement
                </span>
              </div>

              {/* Feature Checklist */}
              <div className="py-6 space-y-3.5 text-left">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Everything Included:</p>
                {(activePlan?.features || [
                  'Complete SSC JE Civil PYQ Archive (with Detailed Explanations)',
                  'Full-Length Computer-Based (CBT) Mock Tests & Real-Time Ranks',
                  'Subject-Wise & Topic-Wise Dynamic MCQ Practice Engine',
                  'IS 456 & IS 800 Engineering Code Navigator & Formula Sheets',
                  'AI Test-Taking Personality & Topic Weakness Analytics',
                  'Personalized Daily Study Plan Generator & AI Copilot',
                  'Lifetime Access — Single One-Time Payment, Zero Recurring Fees',
                ]).map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs text-gray-700">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="font-semibold">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-base shadow-xl shadow-purple-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  Claim Lifetime Access Now
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Secure 256-bit Encrypted Checkout with Razorpay</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Student Testimonials / Aspirant Reviews */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-purple-600 tracking-widest uppercase mb-3">
              Proven Track Record
            </h2>
            <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Trusted by Civil Engineering Aspirants
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 text-left space-y-4">
              <div className="flex text-amber-400 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-gray-700 leading-relaxed italic">
                "The IS 456 & 800 codal explanations with each question saved me hundreds of hours of handbook flipping. The CBT mock interface felt identical to the real exam."
              </p>
              <div className="pt-2 border-t border-gray-200/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                  RS
                </div>
                <div>
                  <h5 className="text-xs font-bold text-gray-900">Rahul Sharma</h5>
                  <p className="text-[10px] text-emerald-600 font-bold">SSC JE 2024 Qualified (AIR 142)</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 text-left space-y-4">
              <div className="flex text-amber-400 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-gray-700 leading-relaxed italic">
                "The AI Weakness Profiler pinpointed that I was losing 18 marks in Soil Mechanics due to negative marking on unconfined compression questions. Fixed it in 2 weeks!"
              </p>
              <div className="pt-2 border-t border-gray-200/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  PK
                </div>
                <div>
                  <h5 className="text-xs font-bold text-gray-900">Pooja Kumari</h5>
                  <p className="text-[10px] text-emerald-600 font-bold">Score: 154.5 / 200</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 text-left space-y-4">
              <div className="flex text-amber-400 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-gray-700 leading-relaxed italic">
                "Best investment for SSC JE Civil. Having all authentic PYQs with zero error solutions and instant AI doubt explanations is worth 10x the price."
              </p>
              <div className="pt-2 border-t border-gray-200/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                  AV
                </div>
                <div>
                  <h5 className="text-xs font-bold text-gray-900">Amit Verma</h5>
                  <p className="text-[10px] text-emerald-600 font-bold">SSC JE 2025 Aspirant</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ Section (Accordion) */}
      <section id="faq" className="py-20 bg-gray-50 border-t border-gray-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold text-purple-600 tracking-widest uppercase mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Have Questions? We've Got Answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-white border border-gray-200/80 shadow-xs overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-gray-900 hover:text-purple-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-purple-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Final Buy CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Ready to Secure Your SSC JE Civil Rank?
          </h2>
          <p className="text-sm sm:text-base text-purple-200 max-w-xl mx-auto">
            Join hundreds of serious engineering aspirants preparing with authentic PYQs, full CBT mocks, and AI weakness diagnostics.
          </p>
          <div className="pt-2">
            <button
              onClick={handleCtaClick}
              className="py-4 px-10 rounded-2xl bg-white text-purple-900 hover:bg-gray-100 font-extrabold text-base shadow-2xl hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <Zap className="w-5 h-5 fill-purple-600 text-purple-600" />
              Enroll in SSC JE Civil Pass (₹2,999)
            </button>
          </div>
        </div>
      </section>

      {/* 10. Statutory Legal & DPDP Compliant Footer */}
      <footer className="bg-gray-900 text-gray-400 text-xs py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
            <div className="space-y-3">
              <span className="font-extrabold text-white text-lg tracking-tight">
                LearnMate <span className="text-purple-400">AI</span>
              </span>
              <p className="text-[11px] leading-relaxed text-gray-400">
                Specialized learning and diagnostic assessment platform for the SSC JE (Staff Selection Commission Junior Engineer) Civil Engineering Examination.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Preparation Modules</h5>
              <ul className="space-y-2 text-[11px]">
                <li><Link to="/learn/pyqs" className="hover:text-white transition-colors">Civil PYQ Archive</Link></li>
                <li><Link to="/test/mock" className="hover:text-white transition-colors">Full CBT Mock Tests</Link></li>
                <li><Link to="/learn/textbook" className="hover:text-white transition-colors">IS Code Navigator</Link></li>
                <li><Link to="/track/performance" className="hover:text-white transition-colors">AI Weakness Diagnostics</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Statutory Legal</h5>
              <ul className="space-y-2 text-[11px]">
                <li><Link to="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy (DPDP Act 2025)</Link></li>
                <li><Link to="/legal/refund-policy" className="hover:text-white transition-colors">Refund & Cancellation Policy</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Commercial Plans</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Security & Compliance</h5>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                PCI DSS Compliant gateway architecture. Zero cardholder data is stored on our servers. Encrypted with 256-bit SSL.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-bold">
                <ShieldCheck className="w-4 h-4" />
                Razorpay Verified Merchant
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
            <p>© {new Date().getFullYear()} LearnMate AI Inc. All rights reserved.</p>
            <p>Built for SSC JE Civil Engineering Aspirants across India.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
