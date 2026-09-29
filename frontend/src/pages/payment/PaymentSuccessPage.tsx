import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BookOpen,
  Award,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export const PaymentSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const state = location.state as {
    planName?: string;
    planCode?: string;
    orderId?: string;
    paymentId?: string;
    amount?: number;
    isLifetime?: boolean;
  } | null;

  useEffect(() => {
    // Automatically redirect to the student dashboard after countdown expires
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 text-center">
        {/* Animated Celebration Icon */}
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Access Activated
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Welcome to LearnMate Pro!
        </h1>
        <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto">
          Your payment has been verified and your account is now upgraded with unrestricted access to all SSC JE Civil prep resources.
        </p>

        {/* Auto Redirect Banner */}
        <div className="mt-5 p-3.5 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-semibold text-purple-700">
          <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
          <span>
            Redirecting to your dashboard in <strong className="text-purple-900 text-sm">{countdown}s</strong>...
          </span>
        </div>

        {/* Receipt Box */}
        <div className="mt-6 bg-gray-50/80 rounded-2xl p-5 border border-gray-200/80 text-left space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Plan Activated:</span>
            <span className="font-bold text-gray-900">{state?.planName || 'SSC JE Civil Full Access'}</span>
          </div>
          {state?.amount !== undefined && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Amount Paid:</span>
              <span className="font-bold text-emerald-700">₹{state.amount.toLocaleString('en-IN')} (Inclusive of Taxes)</span>
            </div>
          )}
          {state?.paymentId && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Transaction ID:</span>
              <code className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700">
                {state.paymentId}
              </code>
            </div>
          )}
          {state?.orderId && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Order ID:</span>
              <code className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700">
                {state.orderId}
              </code>
            </div>
          )}
          <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200">
            <span className="text-gray-500 font-medium">Entitlement Status:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              Active & Unlocked (Permanent Lifetime)
            </span>
          </div>
        </div>

        {/* Quick Action Guides */}
        <div className="mt-6 text-left space-y-2.5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Start Learning Now:</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/test/mock"
              className="p-3 bg-purple-50/50 hover:bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-2.5 transition-colors group"
            >
              <Award className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="text-xs font-bold text-gray-900 block">CBT Mocks</span>
                <span className="text-[10px] text-gray-500">Take full test</span>
              </div>
            </Link>

            <Link
              to="/learn/practice"
              className="p-3 bg-blue-50/50 hover:bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-2.5 transition-colors group"
            >
              <BookOpen className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="text-xs font-bold text-gray-900 block">PYQ Practice</span>
                <span className="text-[10px] text-gray-500">Subject wise</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Immediate Action CTA */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="w-full py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-lg shadow-purple-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
          >
            Launch Student Dashboard Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

