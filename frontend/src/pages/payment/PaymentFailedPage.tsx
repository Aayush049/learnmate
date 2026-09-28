import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  RotateCcw,
  Mail,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';

export const PaymentFailedPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    errorMessage?: string;
    orderId?: string;
  } | null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 text-center">
        {/* Warning Icon */}
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          Transaction Unsuccessful
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Payment Incomplete
        </h1>
        <p className="text-gray-600 text-sm mt-2">
          {state?.errorMessage || 'The payment gateway could not process your transaction. No money was deducted.'}
        </p>

        {/* Diagnostics Box */}
        <div className="mt-6 bg-gray-50/80 rounded-2xl p-4 border border-gray-200/80 text-left space-y-2">
          {state?.orderId && (
            <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200">
              <span className="text-gray-500 font-medium">Order Reference:</span>
              <code className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700">
                {state.orderId}
              </code>
            </div>
          )}
          <p className="text-xs text-gray-500 font-medium">Common causes for gateway failure:</p>
          <ul className="text-[11px] text-gray-600 space-y-1 list-disc list-inside">
            <li>Bank OTP entry timeout or cancellation</li>
            <li>Insufficient limit or international card block</li>
            <li>UPI app server connectivity delays</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md shadow-primary/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Payment
          </button>

          <Link
            to="/dashboard"
            className="w-full py-3 px-6 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>

        {/* Support Note */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500">
          <Mail className="w-3.5 h-3.5 text-gray-400" />
          <span>If money was deducted, email <a href="mailto:support@learnmate.in" className="text-primary font-semibold underline">support@learnmate.in</a> with Order ID.</span>
        </div>
      </div>
    </div>
  );
};
