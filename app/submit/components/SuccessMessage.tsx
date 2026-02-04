'use client';

import { useState, useEffect } from 'react';

interface SuccessMessageProps {
  /** The receipt token for the submitted idea */
  token: string;
}

/**
 * Success message component displayed after successful submission
 *
 * Features:
 * - Success icon and congratulatory message
 * - Displays the receipt URL
 * - Copy button with visual feedback
 * - Auto-redirect countdown
 * - Manual navigation link
 *
 * @example
 * ```tsx
 * <SuccessMessage token="V1StGXR8Z5jdHi9B2vBJ4" />
 * ```
 */
export default function SuccessMessage({ token }: SuccessMessageProps) {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Build the receipt URL
  const receiptUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/i/${token}`
      : `/i/${token}`;

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Copy to clipboard handler
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(receiptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = receiptUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
      {/* Success Icon */}
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Hugmynd send inn!
      </h2>
      <p className="text-slate-600 mb-6">
        Prufuútgáfan þín er í vinnsluröð. Notaðu þennan hlekk til að fylgjast með framvindu:
      </p>

      {/* Receipt URL */}
      <div className="bg-slate-50 rounded-xl p-4 mb-6">
        <p className="text-sm font-mono text-slate-700 break-all mb-3">
          {receiptUrl}
        </p>
        <button
          type="button"
          onClick={copyToClipboard}
          className={`
            px-6 py-2 rounded-lg font-medium transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-peritus-blue focus:ring-offset-2
            ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-peritus-blue text-white hover:bg-peritus-blue-dark'
            }
          `}
          aria-live="polite"
        >
          {copied ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Afritað!
            </span>
          ) : (
            'Afrita hlekk'
          )}
        </button>
      </div>

      {/* Redirect Notice */}
      <p className="text-sm text-slate-500 mb-6">
        Færist á kvittunarsíðu eftir {countdown} {countdown === 1 ? 'sekúndu' : 'sekúndur'}...
      </p>

      {/* Manual Navigation */}
      <a
        href={`/i/${token}`}
        className="inline-block px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-lg"
      >
        Skoða kvittun núna
      </a>
    </div>
  );
}
