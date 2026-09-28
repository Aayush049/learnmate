import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentsAPI, Plan, Entitlement } from '../../api/payments';
import { initiateCheckout } from '../../utils/razorpay';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const user = auth?.user;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlanCode, setProcessingPlanCode] = useState<string | null>(null);
  const [consentTerms, setConsentTerms] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [plansData, entitlementData] = await Promise.allSettled([
          paymentsAPI.getPlans(),
          user ? paymentsAPI.getMyEntitlement() : Promise.resolve(null),
        ]);

        if (plansData.status === 'fulfilled') {
          setPlans(plansData.value);
        }
        if (entitlementData.status === 'fulfilled' && entitlementData.value) {
          setEntitlement(entitlementData.value);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleSubscribe = async (plan: Plan) => {
    setErrorMessage(null);

    // If free tier, redirect to dashboard or login
    if (plan.price_inr === 0 || plan.code === 'free') {
      navigate(user ? '/dashboard' : '/register');
      return;
    }

    // Require login
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }

    // Require consent
    if (!consentTerms) {
      setErrorMessage('Please agree to the Terms of Service and Refund Policy to continue.');
      return;
    }

    try {
      setProcessingPlanCode(plan.code);

      // 1. Create order on backend
      const orderData = await paymentsAPI.createOrder(plan.code, true);

      // 2. Open Hosted Razorpay Gateway Checkout
      await initiateCheckout({
        orderId: orderData.order_id,
        keyId: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'LEARNMATE AI',
        description: `SSC JE Civil Prep — ${plan.name}`,
        customerName: orderData.customer_name,
        customerEmail: orderData.customer_email,
        customerPhone: orderData.customer_phone,
        isMock: orderData.is_mock,
        onSuccess: async (response) => {
          try {
            // 3. Server-side verification & entitlement activation
            const verifyRes = await paymentsAPI.verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            if (verifyRes.success) {
              navigate('/payment/success', {
                state: {
                  planName: plan.name,
                  planCode: plan.code,
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  amount: plan.price_inr,
                  isLifetime: plan.billing_interval === 'lifetime',
                },
              });
            }
          } catch (verifyErr: any) {
            console.error('Verification error:', verifyErr);
            navigate('/payment/failed', {
              state: {
                errorMessage: verifyErr.response?.data?.detail || 'Payment verification failed on server.',
                orderId: response.razorpay_order_id,
              },
            });
          }
        },
        onDismiss: () => {
          setProcessingPlanCode(null);
        },
        onError: (err) => {
          console.error('Gateway error:', err);
          setProcessingPlanCode(null);
          setErrorMessage(err?.description || 'Payment was cancelled or failed. Please try again.');
        },
      });
    } catch (err: any) {
      console.error('Order creation error:', err);
      setErrorMessage(
        err.response?.data?.detail || 'Unable to initiate payment checkout. Please check connection.'
      );
    } finally {
      setProcessingPlanCode(null);
    }
  };

  const isCurrentPlan = (planCode: string) => {
    if (!entitlement) return false;
    if (entitlement.is_admin) return planCode === 'lifetime';
    if (!entitlement.has_active_entitlement) return planCode === 'free';
    return entitlement.plan_code === planCode;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-purple-50/20 to-gray-50 text-gray-900 font-sans pb-20">
      {/* Top Banner Navigation */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
              ✦
            </div>
            <span className="font-extrabold text-xl text-gray-900 tracking-tight">LearnMate</span>
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <Link
                to="/dashboard"
                className="text-sm font-semibold text-gray-700 hover:text-primary transition-colors flex items-center gap-1.5"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          SSC JE Civil 2025/2026 Pass
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight max-w-3xl mx-auto leading-tight">
          Invest in Your <span className="text-primary">Junior Engineer Rank</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
          Get unlimited access to thousands of topic-wise Civil Engineering PYQs, full-length CBT mock tests, IS Code revision sheets, and instant AI doubt explanations.
        </p>

        {/* Current Entitlement Banner if active */}
        {entitlement && entitlement.has_active_entitlement && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-semibold shadow-xs">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            Active Plan: <strong>{entitlement.plan_name}</strong>
            {entitlement.is_lifetime ? (
              <span className="bg-green-200 text-green-900 text-xs px-2 py-0.5 rounded-full font-bold ml-1">
                LIFETIME UNLOCKED
              </span>
            ) : entitlement.days_remaining !== undefined ? (
              <span className="text-xs text-green-700 ml-1">
                ({entitlement.days_remaining} days remaining)
              </span>
            ) : null}
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 max-w-md mx-auto p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-gray-500 font-medium">Loading live pricing plans...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((plan) => {
              const current = isCurrentPlan(plan.code);
              const isPopular = plan.is_popular || plan.badge === 'BEST VALUE';
              const isProcessing = processingPlanCode === plan.code;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl p-6 transition-all duration-200 ${
                    isPopular
                      ? 'bg-white border-2 border-primary shadow-xl shadow-purple-500/10 scale-[1.02] z-10'
                      : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-[11px] font-black uppercase tracking-wider rounded-full shadow-sm">
                      {plan.badge}
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 min-h-[32px] line-clamp-2">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                        ₹{plan.price_inr.toLocaleString('en-IN')}
                      </span>
                      {plan.original_price_inr && plan.original_price_inr > plan.price_inr && (
                        <span className="text-sm text-gray-400 line-through font-semibold">
                          ₹{plan.original_price_inr.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {plan.billing_interval === 'free'
                        ? 'Forever free starter access'
                        : plan.billing_interval === 'monthly'
                        ? 'Billed monthly • One-time charge'
                        : plan.billing_interval === 'annual'
                        ? '1-Year Full Exam Access'
                        : 'Single One-Time Payment'}
                    </span>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isProcessing || current}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mb-6 ${
                      current
                        ? 'bg-gray-100 text-gray-500 cursor-default border border-gray-200'
                        : isPopular
                        ? 'bg-primary hover:bg-primary-dark text-white shadow-md shadow-primary/20 hover:scale-[1.01]'
                        : 'bg-gray-900 hover:bg-black text-white'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Initiating...
                      </>
                    ) : current ? (
                      'Current Active Plan'
                    ) : plan.price_inr === 0 ? (
                      'Get Started Free'
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        Unlock {plan.name}
                      </>
                    )}
                  </button>

                  {/* Feature List */}
                  <div className="border-t border-gray-100 pt-5 flex-1">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                      What is included:
                    </p>
                    <ul className="space-y-2.5 text-xs text-gray-700">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Consent & Compliance Checkbox */}
        <div className="max-w-2xl mx-auto mt-10 p-4 bg-white border border-gray-200 rounded-xl text-center shadow-xs">
          <label className="flex items-start justify-center gap-3 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={consentTerms}
              onChange={(e) => setConsentTerms(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-left">
              I agree to the{' '}
              <Link to="/legal/terms" className="text-primary font-semibold underline">
                Terms of Service
              </Link>
              , acknowledge the{' '}
              <Link to="/legal/refund-policy" className="text-primary font-semibold underline">
                Statutory Refund & Cancellation Policy
              </Link>{' '}
              (non-refundable digital access with exceptions for duplicate/failed transactions), and consent to DPDP data processing.
            </span>
          </label>
        </div>

        {/* Security & Payment Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-gray-500 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            256-bit SSL Encrypted
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            PCI DSS Hosted Gateway
          </div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-600" />
            Statutory Exception Support
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Instant Digital Provisioning
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mt-20 pt-12 border-t border-gray-200">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="text-sm text-gray-500 mt-1">Everything you need to know about access & billing</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 text-left">
            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                What payment methods are supported?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                We accept all major India payment methods including UPI (Google Pay, PhonePe, Paytm), Debit & Credit Cards (Visa, MasterCard, RuPay), and Net Banking via Razorpay.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                What is your refund policy?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Digital subscriptions are non-refundable once unlocked. However, 100% immediate refunds are provided for duplicate charges, technical access failures, or billing discrepancies per our{' '}
                <Link to="/legal/refund-policy" className="text-primary underline font-semibold">
                  Refund Policy
                </Link>
                .
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                Will my plan auto-renew automatically?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                No. LearnMate does not charge recurring automatic debits without explicit consent. When your access period concludes, you can choose whether to renew manually.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200">
              <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                Can I access on mobile and laptop?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Yes! Your single-user login works seamlessly across desktop browsers, laptops, tablets, and smartphones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
