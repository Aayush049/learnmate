import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Terms of Service
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Last Updated: October 2025 • Standard Digital Learning License Agreement
          </p>
        </div>

        <div className="space-y-6 text-gray-700 leading-relaxed text-sm sm:text-base border-t border-gray-100 pt-6">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Agreement to Terms</h2>
            <p>
              By accessing or creating an account on LEARNMATE AI, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Single-User Educational License</h2>
            <p>
              Your subscription grants you a single-user, non-exclusive, non-transferable license to access SSC JE Civil Engineering learning content, mock test series, and AI tutoring services for individual exam preparation. Account sharing, automated scraping, or unauthorized distribution of test materials is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Non-Affiliation Disclaimer</h2>
            <p>
              LEARNMATE AI is an independent AI-powered educational preparation platform. It is not affiliated with, authorized by, or endorsed by the Staff Selection Commission (SSC) or any government department. All references to SSC JE are for educational preparation and descriptive categorization only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Payment & Subscriptions</h2>
            <p>
              Subscription fees are clearly displayed in Indian Rupees (INR) inclusive of applicable taxes. Pricing and plan features are dynamic and subject to updates. Payment processing is handled via RBI-authorized payment gateways complying with PCI DSS standards.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Contact Information</h2>
            <p>
              For legal and terms inquiries, reach out to <a href="mailto:legal@learnmate.in" className="text-primary font-semibold">legal@learnmate.in</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
