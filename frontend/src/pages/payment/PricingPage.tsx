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
import { initiateCheckout, openRazorpayPaymentPage, RAZORPAY_PAYMENT_PAGE_URL } from '../../utils/razorpay';

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
  const [showHostedModal, setShowHostedModal] = useState(false);

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
      const orderData = await paymentsAPI.createOrder(plan.code, consentTerms);

      // If key is mock/unconfigured, we open the official Razorpay payment page and show the guidance modal
      if (!orderData.key_id || orderData.key_id.startsWith('rzp_test_mock')) {
        openRazorpayPaymentPage();
        setShowHostedModal(true);
        setProcessingPlanCode(null);
        return;
      }

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
    if (entitlement.is_admin) return true;
    if (!entitlement.has_active_entitlement) return false;
    return entitlement.plan_code === planCode;
  };

  const singlePlan = plans.length === 1 ? plans[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-purple-50/20 to-gray-50 text-gray-900 font-sans pb-20">
      {/* Top Banner Navigation */}
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              ✦
            </div>
            <span className="font-extrabold text-xl text-gray-900 tracking-tight">LearnMate <span className="text-purple-600">AI</span></span>
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <Link
                to="/dashboard"
                className="text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors flex items-center gap-1.5"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/login?redirect=/pricing"
                className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          SSC JE Civil 2025/2026 Commercial Access
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight max-w-3xl mx-auto leading-tight">
          Invest in Your <span className="text-purple-600">Junior Engineer Selection</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
          One-time payment for permanent lifetime access. All 3,500+ Civil PYQs, full-length CBT mock tests, IS code navigator, and personalized AI weakness analytics.
        </p>

        {/* Current Entitlement Banner if active */}
        {entitlement && entitlement.has_active_entitlement && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-semibold shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Active Plan: <strong>{entitlement.plan_name}</strong>
            {entitlement.is_lifetime ? (
              <span className="bg-emerald-200 text-emerald-900 text-xs px-2.5 py-0.5 rounded-full font-bold ml-1">
                LIFETIME PASS UNLOCKED
              </span>
            ) : entitlement.days_remaining !== undefined ? (
              <span className="text-xs text-emerald-700 ml-1">
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

      {/* Pricing Cards Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500 font-medium">Loading live pricing plans...</p>
          </div>
        ) : singlePlan ? (
          /* Single Plan Focused View (V1 Model) */
          <div className="max-w-xl mx-auto">
            <div className="relative rounded-3xl bg-white border-2 border-purple-600 p-8 sm:p-10 shadow-2xl shadow-purple-500/10">
              {/* Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md">
                ⭐ {singlePlan.badge || 'ONE-TIME LIFETIME PASS (50% OFF)'}
              </div>

              <div className="text-center pb-6 border-b border-gray-100">
                <h3 className="text-2xl font-black text-gray-900">{singlePlan.name}</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  {singlePlan.description}
                </p>

                {/* Price Display */}
                <div className="mt-6 flex items-baseline justify-center gap-3">
                  <span className="text-5xl font-black text-gray-900 tracking-tight">
                    ₹{singlePlan.price_inr.toLocaleString('en-IN')}
                  </span>
                  {singlePlan.original_price_inr && singlePlan.original_price_inr > singlePlan.price_inr && (
                    <span className="text-xl text-gray-400 line-through font-bold">
                      ₹{singlePlan.original_price_inr.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mt-2 inline-block">
                  Single One-Time Payment • Permanent Lifetime Access
                </span>
              </div>

              {/* Feature List */}
              <div className="py-6 space-y-3.5 text-left">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Everything Included:</p>
                {singlePlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs text-gray-700">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="font-semibold">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => handleSubscribe(singlePlan)}
                  disabled={processingPlanCode === singlePlan.code || isCurrentPlan(singlePlan.code)}
                  className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base transition-all flex items-center justify-center gap-2 ${
                    isCurrentPlan(singlePlan.code)
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xl shadow-purple-500/25 hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {processingPlanCode === singlePlan.code ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Opening Secure Gateway...
                    </>
                  ) : isCurrentPlan(singlePlan.code) ? (
                    <>
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      Full Access Activated
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      Unlock Lifetime Access — ₹{singlePlan.price_inr.toLocaleString('en-IN')}
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Secure 256-bit Encrypted Checkout via Razorpay</span>
              </div>
            </div>
          </div>
        ) : (
          /* Multi-Plan Responsive Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {plans.map((plan) => {
              const current = isCurrentPlan(plan.code);
              const isPopular = plan.is_popular;
              const isProcessing = processingPlanCode === plan.code;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-3xl p-6 transition-all duration-200 bg-white ${
                    isPopular
                      ? 'border-2 border-purple-600 shadow-xl shadow-purple-500/10 scale-[1.02] z-10'
                      : 'border border-gray-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-purple-600 text-white text-[11px] font-black uppercase tracking-wider rounded-full shadow-sm">
                      {plan.badge}
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 min-h-[32px] line-clamp-2">
                      {plan.description}
                    </p>
                  </div>

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
                      {plan.billing_interval === 'lifetime'
                        ? 'Single One-Time Payment'
                        : 'Fixed Access Period'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isProcessing || current}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mb-6 ${
                      current
                        ? 'bg-emerald-50 text-emerald-700 cursor-default border border-emerald-200'
                        : isPopular
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 hover:scale-[1.01]'
                        : 'bg-gray-900 hover:bg-black text-white'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Initiating...
                      </>
                    ) : current ? (
                      'Access Activated'
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        Unlock {plan.name}
                      </>
                    )}
                  </button>

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
        <div className="max-w-xl mx-auto mt-8 p-4 bg-white border border-gray-200 rounded-2xl text-center shadow-xs">
          <label className="flex items-start justify-center gap-3 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={consentTerms}
              onChange={(e) => setConsentTerms(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
            />
            <span className="text-left leading-relaxed">
              I agree to the{' '}
              <Link to="/legal/terms" className="text-purple-600 font-semibold underline">
                Terms of Service
              </Link>
              , acknowledge the{' '}
              <Link to="/legal/refund-policy" className="text-purple-600 font-semibold underline">
                Statutory Refund & Cancellation Policy
              </Link>{' '}
              (non-refundable digital access with statutory exceptions for duplicate charges or technical delivery failures), and consent to DPDP Act 2025 compliant processing.
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
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            PCI DSS Hosted Gateway
          </div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-600" />
            Statutory Exception Support
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Instant Digital Access
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mt-16 pt-12 border-t border-gray-200">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="text-sm text-gray-500 mt-1">Everything you need to know about access & billing</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 text-left">
            <div className="bg-white p-5 rounded-2xl border border-gray-200">
              <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                What payment methods are supported?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                We accept all major India payment methods including UPI (Google Pay, PhonePe, Paytm, BHIM), Debit & Credit Cards (Visa, MasterCard, RuPay), and Net Banking via Razorpay.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200">
              <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                What is your refund policy?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Digital subscriptions are non-refundable once unlocked. However, 100% immediate refunds are provided for duplicate charges, technical access failures, or billing discrepancies per our{' '}
                <Link to="/legal/refund-policy" className="text-purple-600 underline font-semibold">
                  Refund Policy
                </Link>
                .
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200">
              <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                Are there any monthly or renewal fees?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                None. The ₹2,999 payment is a single, one-time fee granting permanent lifetime access. There are zero auto-debits or recurring subscription fees.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200">
              <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                Can I access on mobile and laptop?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Yes! Your single-user login works seamlessly across desktop browsers, laptops, tablets, and smartphones.
              </p>
            </div>
          </div>
        </div>

        {/* Official Razorpay Hosted Gateway Modal */}
        {showHostedModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-purple-100 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Razorpay Checkout Opened</h3>
              <p className="text-xs text-purple-600 font-semibold mb-3">Official Hosted Gateway: {RAZORPAY_PAYMENT_PAGE_URL}</p>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                A secure Razorpay payment window has been opened for your <span className="font-bold text-gray-900">SSC JE Civil Full Access</span> pass (₹2,999).
                Please complete payment on the Razorpay page.
              </p>

              <div className="space-y-3">
                <button
                  onClick={async () => {
                    try {
                      const updated = await paymentsAPI.getMyEntitlement();
                      if (updated.has_active_entitlement || updated.is_admin) {
                        navigate('/payment/success', {
                          state: {
                            planName: 'SSC JE Civil Full Access',
                            planCode: 'ssc_je_civil_lifetime',
                            amount: 2999,
                            isLifetime: true,
                          },
                        });
                      } else {
                        navigate('/dashboard');
                      }
                    } catch {
                      navigate('/dashboard');
                    }
                  }}
                  className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-purple-500/20"
                >
                  I've Completed Payment (Go to Dashboard)
                </button>

                <button
                  onClick={() => openRazorpayPaymentPage()}
                  className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Reopen Razorpay Payment Page
                </button>

                <button
                  onClick={() => setShowHostedModal(false)}
                  className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
