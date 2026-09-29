/**
 * Razorpay SDK Dynamic Loader & Checkout Handler
 * Strictly compliant with RBI / PCI DSS hosted checkout standards.
 */

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const RAZORPAY_PAYMENT_PAGE_URL =
  (import.meta.env.VITE_RAZORPAY_PAGE_URL as string) || 'https://rzp.io/rzp/R2O8T8Ic';

export function openRazorpayPaymentPage(customUrl?: string): void {
  const url = customUrl || RAZORPAY_PAYMENT_PAGE_URL;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

let razorpayScriptLoadedPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (razorpayScriptLoadedPromise) {
    return razorpayScriptLoadedPromise;
  }

  razorpayScriptLoadedPromise = new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Razorpay SDK. Falling back to sandbox/mock mode.');
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return razorpayScriptLoadedPromise;
}

export interface CheckoutOptions {
  orderId: string;
  keyId?: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
  onError?: (error: any) => void;
}

export async function initiateCheckout(options: CheckoutOptions) {
  // If no live key is configured or key is a mock stub, open official hosted payment page directly
  if (!options.keyId || options.keyId.startsWith('rzp_test_mock')) {
    openRazorpayPaymentPage();
    return;
  }

  const isLoaded = await loadRazorpayScript();

  if (!isLoaded || typeof window === 'undefined' || !window.Razorpay) {
    // Fallback to hosted payment page
    openRazorpayPaymentPage();
    return;
  }

  try {
    const rzpOptions = {
      key: options.keyId,
      amount: Math.round(options.amount * 100), // Amount in paise
      currency: options.currency || 'INR',
      name: options.name || 'LEARNMATE AI',
      description: options.description || 'SSC JE Civil Engineering Subscription',
      image: '/favicon.ico',
      order_id: options.orderId,
      handler: function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        options.onSuccess({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      prefill: {
        name: options.customerName || '',
        email: options.customerEmail || '',
        contact: options.customerPhone || '',
      },
      notes: {
        platform: 'LearnMate Web',
      },
      theme: {
        color: '#6C46E8', // LearnMate Brand Purple
      },
      modal: {
        ondismiss: function () {
          if (options.onDismiss) {
            options.onDismiss();
          }
        },
        escape: true,
        backdropclose: false,
      },
    };

    const rzpInstance = new window.Razorpay(rzpOptions);
    rzpInstance.on('payment.failed', function (response: any) {
      if (options.onError) {
        options.onError(response.error);
      }
    });
    rzpInstance.open();
  } catch (err) {
    if (options.onError) {
      options.onError(err);
    }
  }
}
