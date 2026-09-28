import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
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
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Privacy & Data Protection Policy
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Compliant with Digital Personal Data Protection (DPDP) Act & RBI Data Localization Norms
          </p>
        </div>

        <div className="space-y-6 text-gray-700 leading-relaxed text-sm sm:text-base border-t border-gray-100 pt-6">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Data Minimization & Collection</h2>
            <p>
              LEARNMATE collects only the essential data necessary to deliver personalized engineering learning experiences: your name, email address, password hash, and learning analytics (mock test attempts, scores, topic mastery).
            </p>
          </section>

          <section>
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-blue-900 text-sm block mb-1">PCI DSS & Financial Security</strong>
                <p className="text-xs text-blue-800">
                  LEARNMATE never stores, processes, or logs your credit/debit card numbers, CVVs, UPI PINs, or net banking credentials. All payments are securely tokenized and processed through RBI-authorized payment gateways.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
              <li>To provide real-time mock test scoring, percentile calculation, and rank prediction.</li>
              <li>To generate personalized AI weakness profiles and customized study schedules.</li>
              <li>To provide order receipts, subscription confirmations, and technical support.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Data Retention & Deletion</h2>
            <p>
              You retain the right to request deletion of your account and associated learning data at any time by contacting <a href="mailto:privacy@learnmate.in" className="text-primary font-semibold">privacy@learnmate.in</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
