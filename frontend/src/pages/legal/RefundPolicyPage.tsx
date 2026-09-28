import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, AlertCircle, CheckCircle2, Clock, Mail } from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <div className="mb-8">
          <Link
            to="/pricing"
            className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-dark mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Pricing Plans
          </Link>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Refund & Cancellation Policy
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Version 1.0 • Effective Date: October 1, 2025 • Governed by the Laws of India & Consumer Protection (E-Commerce) Rules
          </p>
        </div>

        <div className="space-y-8 text-gray-700 leading-relaxed text-sm sm:text-base border-t border-gray-100 pt-6">
          {/* Section 1 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
              Digital Learning Content & General Policy
            </h2>
            <p className="mb-3">
              LEARNMATE AI provides immediate, digital subscription access to proprietary SSC JE Civil Engineering question banks, past-year question (PYQ) analytics, full-length CBT mock tests, and AI Copilot tutoring services.
            </p>
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-900 text-sm">
                Due to the instantaneous digital fulfillment and consumable nature of test series and AI tokens, <strong>all purchases are generally non-refundable and non-transferable</strong> once digital access is provisioned, except under the explicit statutory circumstances outlined below.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
              Eligible Exceptions for Refund
            </h2>
            <p className="mb-3">
              We stand firmly behind the quality of our learning platform. You are eligible for a 100% full refund under the following valid conditions:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 my-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 text-primary font-bold mb-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Duplicate Transaction Charge
                </div>
                <p className="text-xs text-gray-600">
                  If you were charged more than once for the same plan due to a network glitch or gateway timeout, the duplicate charge will be refunded immediately upon verification.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 text-primary font-bold mb-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Access Provisioning Failure
                </div>
                <p className="text-xs text-gray-600">
                  If payment was deducted from your account but the subscription entitlement was not unlocked within 24 hours and our support team is unable to resolve it.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 text-primary font-bold mb-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Material Technical Defect
                </div>
                <p className="text-xs text-gray-600">
                  Persistent, unresolvable platform failure on our servers preventing test submission or question practice for more than 72 continuous hours.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 text-primary font-bold mb-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Cancellation Before Activation
                </div>
                <p className="text-xs text-gray-600">
                  If you submit a formal cancellation request prior to accessing any premium mock test, PYQ solution, or AI query within 24 hours of purchase.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
              Refund Request Process & Timeline
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-gray-900 text-sm">Step 1: Submit Request</strong>
                  <p className="text-xs text-gray-600">
                    Send an email to <a href="mailto:support@learnmate.in" className="text-primary font-semibold underline">support@learnmate.in</a> from your registered LearnMate email address, mentioning your <code>Order ID</code> and reason for refund.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-gray-900 text-sm">Step 2: Verification & Review</strong>
                  <p className="text-xs text-gray-600">
                    Our billing team will verify the payment logs and entitlement status within <strong>2 to 3 business days</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-green-50 text-green-600 rounded-lg mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-gray-900 text-sm">Step 3: Disbursal via Original Payment Method</strong>
                  <p className="text-xs text-gray-600">
                    Once approved, the refund will be credited directly to the original source (UPI / Debit Card / Net Banking) within <strong>5 to 7 bank working days</strong> per RBI banking norms.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-2">Need Help with Billing?</h2>
            <p className="text-xs text-gray-600 mb-4">
              Our student support desk is available Monday through Saturday (9:00 AM – 7:00 PM IST) to assist with payment confirmations, invoices, and technical queries.
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-gray-700">
              <span>📧 Email: <a href="mailto:support@learnmate.in" className="text-primary">support@learnmate.in</a></span>
              <span>📍 Address: LearnMate AI EdTech Private Limited, Bangalore, India</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
