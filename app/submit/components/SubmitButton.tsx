'use client';

interface SubmitButtonProps {
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
}

/**
 * Submit button component with loading state
 *
 * Features:
 * - Displays "Submit Idea" text normally
 * - Shows loading spinner and "Submitting..." when submitting
 * - Disabled state during submission
 * - Full width for mobile touch targets
 * - Active state animation for tactile feedback
 *
 * @example
 * ```tsx
 * <SubmitButton isSubmitting={false} />
 * // Renders: "Submit Idea" button
 *
 * <SubmitButton isSubmitting={true} />
 * // Renders: disabled button with spinner and "Submitting..."
 * ```
 */
export default function SubmitButton({ isSubmitting }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={`
        w-full py-4 px-6 rounded-2xl font-bold text-white text-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-peritus-blue focus:ring-offset-2
        shadow-lg
        ${
          isSubmitting
            ? 'bg-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-peritus-blue to-peritus-blue-dark hover:from-peritus-blue-dark hover:to-peritus-blue shadow-peritus-blue/30 hover:shadow-xl hover:shadow-peritus-blue/40 active:scale-[0.98]'
        }
      `}
      aria-busy={isSubmitting}
    >
      {isSubmitting ? (
        <span className="flex items-center justify-center gap-2">
          {/* Loading Spinner */}
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Sendi inn...
        </span>
      ) : (
        'Senda inn hugmynd'
      )}
    </button>
  );
}
